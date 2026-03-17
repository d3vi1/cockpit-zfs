/**
 * DashPoolCard — individual pool summary card for the dashboard grid.
 *
 * Composes DashPoolHeader, DashPoolCapacity, DashPoolDetails, and DashPoolScan
 * sub-sections into a single PF Card. The card is double-clickable (placeholder
 * for opening pool details — wired up in a later phase).
 */

import React, { useMemo } from 'react';
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import type { ZPool, PoolScanObject } from '@45drives/houston-common-lib';
import type { PoolScanObjectGroup, PoolDiskStats, Activity } from '../../types';
import { formatStatus, getCapacityColor } from '../../utils/statusColors';
import { convertBytesToSize, convertSecondsToString, convertTimestampToLocal } from '../../utils/formatters';
import { getPoolDiskType, upperCaseWord } from '../../utils/helpers';

// ────────────────────────────────────────────────
// Sub-components (inlined to stay in a single file,
// but also individually exported from their own files)
// ────────────────────────────────────────────────

/* ──── DashPoolHeader (inline) ──── */

interface HeaderProps {
  pool: ZPool;
}

function capacityToVariant(pool: ZPool): ProgressVariant | undefined {
  const color = getCapacityColor(
    'bg',
    pool.properties.capacity,
    pool.properties.refreservationPercent,
  );
  if (color === 'zfs-capacity-bg-ok') return ProgressVariant.success;
  if (color === 'zfs-capacity-bg-warning') return ProgressVariant.warning;
  if (color === 'zfs-capacity-bg-danger') return ProgressVariant.danger;
  return undefined;
}

function statusLabelColor(status: string): 'green' | 'orange' | 'red' | 'grey' {
  const cls = formatStatus(status);
  if (cls === 'zfs-status-online') return 'green';
  if (cls === 'zfs-status-degraded') return 'orange';
  if (cls === 'zfs-status-faulted') return 'red';
  return 'grey';
}

function DashPoolHeaderSection({ pool }: HeaderProps) {
  const capacityPercent = Number(pool.properties.capacity);
  const isUpgradeable = pool.properties.upgradable === true;

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      {/* Row 1: pool name + upgrade badge */}
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <strong>{pool.name}</strong>
        </FlexItem>
        {isUpgradeable && (
          <FlexItem>
            <Label color="orange" icon={<ExclamationCircleIcon />} isCompact>
              Upgrade Available
            </Label>
          </FlexItem>
        )}
      </Flex>

      {/* Row 2: status label + capacity bar */}
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsMd' }}
        flexWrap={{ default: 'nowrap' }}
      >
        <FlexItem>
          <Label
            color={statusLabelColor(pool.status)}
            icon={pool.status === 'ONLINE' ? <CheckCircleIcon /> : undefined}
            isCompact
          >
            {pool.status}
          </Label>
        </FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          <Progress
            value={capacityPercent}
            title={`${capacityPercent}% Full`}
            label={`${capacityPercent}%`}
            variant={capacityToVariant(pool)}
            measureLocation={ProgressMeasureLocation.outside}
            aria-label={`${pool.name} capacity`}
          />
        </FlexItem>
      </Flex>
    </Flex>
  );
}

/* ──── DashPoolCapacity (inline) ──── */

function DashPoolCapacitySection({ pool }: { pool: ZPool }) {
  const { allocated, free, size, refreservationPercent, available } = pool.properties;

  return (
    <DescriptionList isHorizontal isCompact>
      <DescriptionListGroup>
        <DescriptionListTerm>Used</DescriptionListTerm>
        <DescriptionListDescription>{allocated}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>RAW Free</DescriptionListTerm>
        <DescriptionListDescription>{free}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Available</DescriptionListTerm>
        <DescriptionListDescription>{available}</DescriptionListDescription>
      </DescriptionListGroup>
      {refreservationPercent !== undefined && refreservationPercent > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Reserved</DescriptionListTerm>
          <DescriptionListDescription>{refreservationPercent}%</DescriptionListDescription>
        </DescriptionListGroup>
      )}
      <DescriptionListGroup>
        <DescriptionListTerm>Total</DescriptionListTerm>
        <DescriptionListDescription><strong>{size}</strong></DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}

/* ──── DashPoolDetails (VDevs + Errors) ──── */

function DashPoolDetailsSection({ pool }: { pool: ZPool }) {
  const diskType = getPoolDiskType(pool);

  return (
    <>
      {/* Disk type */}
      <Flex justifyContent={{ default: 'justifyContentCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Badge isRead>{diskType}</Badge>
        </FlexItem>
      </Flex>

      {/* VDev chips */}
      <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <strong>
            {pool.vdevs.length} Virtual Device{pool.vdevs.length !== 1 ? 's' : ''}:
          </strong>
        </FlexItem>
        <Flex justifyContent={{ default: 'justifyContentCenter' }} spaceItems={{ default: 'spaceItemsSm' }} flexWrap={{ default: 'wrap' }}>
          {pool.vdevs.map((vdev) => (
            <FlexItem key={vdev.name ?? vdev.type}>
              <Label isCompact>
                {vdev.name ?? vdev.type}
                {' '}
                <small>({vdev.type})</small>
              </Label>
            </FlexItem>
          ))}
        </Flex>
      </Flex>

      {/* Errors */}
      <Flex justifyContent={{ default: 'justifyContentCenter' }}>
        <FlexItem>
          Errors: <Badge isRead>{pool.errorCount}</Badge>
        </FlexItem>
      </Flex>
    </>
  );
}

/* ──── DashPoolScan (scrub/resilver status) ──── */

interface ScanProps {
  pool: ZPool;
  scanObjectGroup: PoolScanObjectGroup;
  scanActivities: Map<string, Activity>;
  trimActivities: Map<string, Activity>;
}

function scanFunctionLabel(fn: string): string {
  switch (fn) {
    case 'RESILVER':
      return 'Resilvering';
    case 'SCRUB':
      return 'Scrubbing';
    default:
      return '';
  }
}

function scanVariant(scan: PoolScanObject): ProgressVariant | undefined {
  if (scan.pause && scan.pause !== 'None') return ProgressVariant.warning;
  switch (scan.state) {
    case 'SCANNING':
      return undefined; // default blue
    case 'FINISHED':
      return ProgressVariant.success;
    case 'CANCELED':
      return ProgressVariant.danger;
    default:
      return undefined;
  }
}

function DashPoolScanSection({ pool, scanObjectGroup, scanActivities, trimActivities }: ScanProps) {
  const scan = scanObjectGroup[pool.name] as PoolScanObject | undefined;
  const scanActivity = scanActivities.get(pool.name);
  const trimActivity = trimActivities.get(pool.name);

  // Scrub / Resilver info
  const scanLabel = useMemo(() => {
    if (!scan || scan.state === null) return 'No scrub/resilver data';
    const fnLabel = scanFunctionLabel(scan.function);
    if (scan.pause && scan.pause !== 'None') {
      return `${fnLabel} Paused`;
    }
    switch (scan.state) {
      case 'SCANNING':
        return `${fnLabel}... (${parseFloat(scan.percentage.toFixed(1))}%)`;
      case 'FINISHED':
        return `${fnLabel} Complete`;
      case 'CANCELED':
        return `${fnLabel} Canceled`;
      default:
        return '';
    }
  }, [scan]);

  const showScanProgress = scan && scan.state !== null && scan.state !== 'NONE';

  const scanPercent = useMemo(() => {
    if (!scan) return 0;
    const pct = parseFloat(scan.percentage.toFixed(2));
    if (scan.state === 'FINISHED' && pct > 90) return 100;
    return pct;
  }, [scan]);

  // Trim summary — just show activity label if present
  const trimLabel = useMemo(() => {
    if (!trimActivity) return null;
    if (trimActivity.isActive) return 'TRIM Active';
    if (trimActivity.isPaused) return 'TRIM Paused';
    if (trimActivity.isFinished) return 'TRIM Complete';
    if (trimActivity.isCanceled) return 'TRIM Canceled';
    return null;
  }, [trimActivity]);

  const trimLabelColor = useMemo((): 'blue' | 'orange' | 'green' | 'red' | 'grey' => {
    if (!trimActivity) return 'grey';
    if (trimActivity.isActive) return 'blue';
    if (trimActivity.isPaused) return 'orange';
    if (trimActivity.isFinished) return 'green';
    if (trimActivity.isCanceled) return 'red';
    return 'grey';
  }, [trimActivity]);

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      {/* Scan progress */}
      {showScanProgress ? (
        <>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
              <FlexItem>
                <SyncAltIcon />
              </FlexItem>
              <FlexItem>
                <span className={
                  scan.state === 'FINISHED' ? 'zfs-status-online' :
                  scan.state === 'CANCELED' ? 'zfs-status-faulted' :
                  (scan.pause && scan.pause !== 'None') ? 'zfs-status-degraded' :
                  undefined
                }>
                  <strong>{scanLabel}</strong>
                </span>
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Progress
              value={scanPercent}
              label={`${convertBytesToSize(scan!.bytes_issued)} / ${convertBytesToSize(scan!.bytes_processed)}`}
              variant={scanVariant(scan!)}
              measureLocation={ProgressMeasureLocation.outside}
              aria-label={`${pool.name} scan progress`}
            />
          </FlexItem>
          {scan!.state === 'SCANNING' && (!scan!.pause || scan!.pause === 'None') && scan!.total_secs_left > 0 && (
            <FlexItem>
              <small>Completes in {convertSecondsToString(scan!.total_secs_left)}</small>
            </FlexItem>
          )}
        </>
      ) : (
        <FlexItem>
          <small>{scanLabel}</small>
        </FlexItem>
      )}

      {/* Trim label */}
      {trimLabel && (
        <FlexItem>
          <Label color={trimLabelColor} isCompact>
            {trimLabel}
          </Label>
        </FlexItem>
      )}
    </Flex>
  );
}

// ────────────────────────────────────────────────
// Main card component
// ────────────────────────────────────────────────

interface DashPoolCardProps {
  pool: ZPool;
  scanObjectGroup: PoolScanObjectGroup;
  scanActivities: Map<string, Activity>;
  trimActivities: Map<string, Activity>;
}

export function DashPoolCard({
  pool,
  scanObjectGroup,
  scanActivities,
  trimActivities,
}: DashPoolCardProps) {
  return (
    <Card isCompact isFullHeight>
      <CardHeader>
        <CardTitle>
          <DashPoolHeaderSection pool={pool} />
        </CardTitle>
      </CardHeader>

      <CardBody>
        <DashPoolCapacitySection pool={pool} />
      </CardBody>

      <Divider />

      <CardFooter>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <DashPoolDetailsSection pool={pool} />
          </FlexItem>

          <Divider />

          <FlexItem>
            <DashPoolScanSection
              pool={pool}
              scanObjectGroup={scanObjectGroup}
              scanActivities={scanActivities}
              trimActivities={trimActivities}
            />
          </FlexItem>
        </Flex>
      </CardFooter>
    </Card>
  );
}

export default DashPoolCard;
