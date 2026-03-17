/**
 * DashboardSkeleton — loading placeholder that mimics the dashboard card grid.
 *
 * Uses PF <Skeleton> and <Gallery> to replicate the card layout while data loads.
 */

import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Gallery,
  Skeleton,
} from '@patternfly/react-core';

const SKELETON_COUNT = 3;

function SkeletonCard() {
  return (
    <Card isCompact>
      <CardHeader>
        <Skeleton width="60%" height="1.25rem" />
        <Skeleton width="35%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
        <Skeleton width="100%" height="1.5rem" style={{ marginTop: '0.5rem', borderRadius: '999px' }} />
      </CardHeader>
      <CardBody>
        <Skeleton width="70%" height="0.75rem" />
        <Skeleton width="70%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
        <Skeleton width="70%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
        <Skeleton width="40%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
        <Skeleton width="70%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
      </CardBody>
      <CardFooter>
        <Skeleton width="40%" height="0.75rem" />
        <Skeleton width="90%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
      </CardFooter>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <Gallery hasGutter minWidths={{ default: '18rem' }} role="status" aria-label="Loading dashboard">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </Gallery>
  );
}

export default DashboardSkeleton;
