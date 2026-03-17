/**
 * DashPoolHeader — card header sub-component for the dashboard pool card.
 *
 * Shows pool name, optional upgrade badge, status label with icon,
 * and the capacity progress bar in a compact two-row layout.
 */

import React from 'react';
import {
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import type { ZPool } from '@45drives/houston-common-lib';
import { formatStatus } from '../../utils/statusColors';
import { getCapacityColor } from '../../utils/statusColors';

interface DashPoolHeaderProps {
  pool: ZPool;
}

/** Map the zfs-capacity-bg-* class to a PF Progress variant. */
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

/** Map status string to a PF Label color. */
function statusLabelColor(status: string): 'green' | 'orange' | 'red' | 'grey' {
  const cls = formatStatus(status);
  if (cls === 'zfs-status-online') return 'green';
  if (cls === 'zfs-status-degraded') return 'orange';
  if (cls === 'zfs-status-faulted') return 'red';
  return 'grey';
}

export function DashPoolHeader({ pool }: DashPoolHeaderProps) {
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

export default DashPoolHeader;
