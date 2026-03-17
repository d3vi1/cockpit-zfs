/**
 * DashPoolCapacity — capacity/space breakdown for the dashboard pool card body.
 *
 * Uses a PF DescriptionList to display used, free, available, reserved, and total space.
 */

import React from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import type { ZPool } from '@45drives/houston-common-lib';

interface DashPoolCapacityProps {
  pool: ZPool;
}

export function DashPoolCapacity({ pool }: DashPoolCapacityProps) {
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
        <DescriptionListDescription>{typeof available === 'number' ? available : available}</DescriptionListDescription>
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

export default DashPoolCapacity;
