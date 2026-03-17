import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  NotificationDrawer,
  NotificationDrawerHeader,
  NotificationDrawerBody,
  NotificationDrawerList,
  NotificationDrawerListItem,
  NotificationDrawerListItemHeader,
  NotificationDrawerListItemBody,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CogIcon, TimesIcon } from '@patternfly/react-icons';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { EmailSetupModal } from './EmailSetupModal';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
  onClose: () => void;
}

/** Map a notification event type to a PF severity variant. */
function getSeverityVariant(
  notification: Notification,
): 'success' | 'danger' | 'warning' | 'info' | 'custom' {
  const { event, errors, state, health } = notification;

  switch (event) {
    case 'scrub_finish':
      return errors && errors !== '0' && errors !== 'null' ? 'warning' : 'success';
    case 'storage_threshold':
      return 'warning';
    case 'snapshot_created':
    case 'zfs_replication_success':
    case 'vdev_attach':
    case 'resilver_finish':
    case 'vdev_clear':
      return 'success';
    case 'snapshot_failed':
    case 'zfs_replication_failed':
      return 'danger';
    case 'pool_import':
      return health === 'ACTIVE' ? 'success' : 'danger';
    case 'statechange':
      return state === 'ONLINE' ? 'success' : 'danger';
    default:
      return 'info';
  }
}

/** Build a human-readable title for a notification event. */
function getTitle(notification: Notification): string {
  const { event, pool, snapShot } = notification;
  switch (event) {
    case 'scrub_finish':
      return `Scrub Finished - ${pool ?? ''}`;
    case 'storage_threshold':
      return `Storage Warning - ${pool ?? ''}`;
    case 'snapshot_created':
      return `Snapshot Created - ${snapShot ?? ''}`;
    case 'snapshot_failed':
      return `Snapshot Creation Failed - ${snapShot ?? 'Unknown Snapshot'}`;
    case 'zfs_replication_success':
      return `ZFS Replication Completed - ${snapShot ?? 'Snapshot Unknown'}`;
    case 'zfs_replication_failed':
      return `ZFS Replication Failed - ${snapShot ?? 'Snapshot Unknown'}`;
    case 'vdev_attach':
      return `VDev Added - ${pool ?? ''}`;
    case 'resilver_finish':
      return `Resilver Finished - ${pool ?? ''}`;
    case 'vdev_clear':
      return `VDEV Cleared - ${pool ?? ''}`;
    case 'pool_import':
      return `ZFS Pool Imported - ${pool ?? ''}`;
    case 'statechange':
      return `${(event ?? '').replace('_', ' ').toUpperCase()} - ${pool ?? ''}`;
    default:
      return event ?? 'Notification';
  }
}

/** Build the body description for a notification. */
function getDescription(notification: Notification): string {
  const {
    event, pool, timestamp, errors, snapShot, fileSystem,
    replicationDestination, vdev, state, health, guid, error,
  } = notification;

  switch (event) {
    case 'scrub_finish': {
      let msg = `Scrubbing of pool ${pool ?? ''} finished at ${timestamp ?? ''}`;
      if (errors && errors !== '0' && errors !== 'null') {
        msg += ` | Errors Detected: ${errors}`;
      }
      return msg;
    }
    case 'storage_threshold':
      return `Pool ${pool ?? ''} is more than 80% full (triggered at ${timestamp ?? ''})`;
    case 'snapshot_created':
      return `Snapshot ${snapShot ?? ''} created for filesystem ${fileSystem ?? ''} at ${timestamp ?? ''}`;
    case 'snapshot_failed':
      return `Failed to create snapshot on ${fileSystem ?? 'unknown filesystem'}. Error: ${error ?? 'Unknown error'}. Timestamp: ${timestamp ?? ''}`;
    case 'zfs_replication_success':
      return `Snapshot ${snapShot ?? ''} replicated from ${fileSystem ?? 'source unknown'}. Destination: ${replicationDestination ?? 'N/A'}. Timestamp: ${timestamp ?? ''}`;
    case 'zfs_replication_failed':
      return `Replication failed for snapshot ${snapShot ?? 'unknown'} from ${fileSystem ?? 'unknown filesystem'}. Error: ${errors ?? 'Unknown error'}. Timestamp: ${timestamp ?? ''}`;
    case 'vdev_attach':
      return `VDev ${vdev ?? ''} added to pool ${pool ?? ''}. Status: ${state ?? ''}. Timestamp: ${timestamp ?? ''}`;
    case 'resilver_finish':
      return `Resilvering completed for pool ${pool ?? ''}. Timestamp: ${timestamp ?? ''}`;
    case 'vdev_clear': {
      let msg = `VDev ${vdev ?? ''} cleared in pool ${pool ?? ''}. Status: ${state ?? ''}`;
      if (guid) msg += ` | GUID: ${guid}`;
      if (error && error !== 'None' && error !== 'null') msg += ` | Error: ${error}`;
      msg += `. Timestamp: ${timestamp ?? ''}`;
      return msg;
    }
    case 'pool_import':
      return `Pool ${pool ?? ''} imported. Status: ${health ?? ''}. Timestamp: ${timestamp ?? ''}`;
    case 'statechange':
      return `Pool: ${pool ?? 'N/A'} | VDEV: ${vdev ?? 'Unknown'} | Status: ${state ?? ''}. Timestamp: ${timestamp ?? ''}`;
    default:
      return notification.text ?? '';
  }
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const {
    notifications,
    markNotificationAsRead,
    removeNotification,
    clearAllNotifications,
    removeAllNotifications,
    fetchMissedNotifications,
  } = useNotificationContext();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const LIMIT = 50;

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emailModalOpen) return;
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, emailModalOpen]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMore();
        }
      },
      { threshold: 1.0 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, offset]);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const count = await fetchMissedNotifications(LIMIT, offset);
    if (count && count > 0) {
      setOffset((prev) => prev + LIMIT);
    }
    setLoading(false);
  }, [fetchMissedNotifications, loading, offset]);

  const handleDismiss = useCallback(
    async (id: number) => {
      await markNotificationAsRead(id);
      removeNotification(id);
    },
    [markNotificationAsRead, removeNotification],
  );

  const handleDismissAll = useCallback(async () => {
    await clearAllNotifications();
    removeAllNotifications();
  }, [clearAllNotifications, removeAllNotifications]);

  const handleOpenEmailSettings = useCallback(() => {
    setEmailModalOpen(true);
    setSettingsOpen(false);
  }, []);

  return (
    <>
      <div
        ref={drawerRef}
        style={{
          position: 'absolute',
          right: 0,
          zIndex: 300,
          width: '30rem',
          maxHeight: '40rem',
        }}
      >
        <NotificationDrawer>
          <NotificationDrawerHeader
            title="Notifications"
            onClose={onClose}
          >
            <Dropdown
              isOpen={settingsOpen}
              onSelect={() => setSettingsOpen(false)}
              onOpenChange={setSettingsOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="plain"
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  aria-label="Notification settings"
                >
                  <CogIcon />
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem key="email-settings" onClick={handleOpenEmailSettings}>
                  Email Notifications
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </NotificationDrawerHeader>
          <NotificationDrawerBody>
            <NotificationDrawerList>
              {notifications.map((notification) => (
                <NotificationDrawerListItem
                  key={notification.id}
                  variant={getSeverityVariant(notification)}
                >
                  <NotificationDrawerListItemHeader
                    title={getTitle(notification)}
                    variant={getSeverityVariant(notification)}
                  >
                    <Flex>
                      <FlexItem>
                        <Button
                          variant="plain"
                          aria-label="Dismiss notification"
                          onClick={() => handleDismiss(notification.id)}
                          icon={<TimesIcon />}
                        />
                      </FlexItem>
                    </Flex>
                  </NotificationDrawerListItemHeader>
                  <NotificationDrawerListItemBody
                    timestamp={notification.timestamp ?? ''}
                  >
                    {getDescription(notification)}
                  </NotificationDrawerListItemBody>
                </NotificationDrawerListItem>
              ))}
            </NotificationDrawerList>
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: '1.5rem' }} />
          </NotificationDrawerBody>
          <Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ padding: '1rem', borderTop: '1px solid var(--pf-t--global--border--color--default)' }}>
            <FlexItem>
              <Button variant="link" onClick={handleDismissAll}>
                Dismiss all Notifications
              </Button>
            </FlexItem>
          </Flex>
        </NotificationDrawer>
      </div>

      {emailModalOpen && (
        <EmailSetupModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
    </>
  );
};

export default NotificationDropdown;
