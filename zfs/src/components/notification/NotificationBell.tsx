import React, { useCallback, useState } from 'react';
import { Badge, Button } from '@patternfly/react-core';
import { BellIcon } from '@patternfly/react-icons';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

export const NotificationBell: React.FC = () => {
  const { notificationsCount } = useNotificationContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <Button
        variant="plain"
        aria-label="Notifications"
        onClick={handleToggle}
        icon={
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <BellIcon />
            {notificationsCount > 0 && (
              <Badge
                isRead={false}
                style={{
                  position: 'absolute',
                  top: '-0.5rem',
                  right: '-0.5rem',
                }}
              >
                {notificationsCount}
              </Badge>
            )}
          </span>
        }
      />
      {drawerOpen && <NotificationDropdown onClose={handleClose} />}
    </div>
  );
};

export default NotificationBell;
