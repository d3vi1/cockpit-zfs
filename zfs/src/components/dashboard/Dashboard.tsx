/**
 * Dashboard — main dashboard page showing pool summary and card grid.
 *
 * Default export (lazy-loaded by ZfsPage).
 */

import React, { useMemo } from 'react';
import {
  Badge,
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SyncAltIcon, CubesIcon } from '@patternfly/react-icons';
import { useZfsData } from '../../contexts/ZfsDataContext';
import { convertBytesToSize } from '../../utils/formatters';
import { DashPoolCard } from './DashPoolCard';
import { DashboardSkeleton } from './DashboardSkeleton';

function Dashboard() {
  const {
    pools,
    poolsLoaded,
    isRefreshing,
    refreshAll,
    scanObjectGroup,
    scanActivities,
    trimActivities,
  } = useZfsData();

  // Compute total effective space across all pools
  const totalEffectivePoolSpace = useMemo(() => {
    let totalCapacity = 0;
    pools.forEach((pool) => {
      totalCapacity += pool.properties.rawsize;
    });
    return convertBytesToSize(totalCapacity);
  }, [pools]);

  // ── Loading state ──
  if (!poolsLoaded) {
    return (
      <>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                justifyContent={{ default: 'justifyContentCenter' }}
                style={{ width: '100%' }}
              >
                <FlexItem>
                  <Spinner size="md" aria-label="Loading pools" />
                </FlexItem>
              </Flex>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <DashboardSkeleton />
      </>
    );
  }

  // ── Empty state ──
  if (pools.length === 0) {
    return (
      <>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem variant="label">
              <Title headingLevel="h3">No Pools Found</Title>
            </ToolbarItem>
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <Button
                variant={ButtonVariant.plain}
                aria-label="Refresh pools"
                onClick={refreshAll}
                isLoading={isRefreshing}
              >
                <SyncAltIcon />
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <EmptyState titleText="No Pools Found" headingLevel="h4" icon={CubesIcon}>
          <EmptyStateBody>
            No ZFS pools were detected on this system. Create or import a pool to get started.
          </EmptyStateBody>
        </EmptyState>
      </>
    );
  }

  // ── Loaded with pools ──
  return (
    <>
      {/* Summary bar */}
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem variant="label">
            <Title headingLevel="h3">Pools</Title>
          </ToolbarItem>
          <ToolbarItem>
            <Badge isRead>{pools.length} Pool{pools.length !== 1 ? 's' : ''}</Badge>
          </ToolbarItem>
          <ToolbarItem>
            Total Effective Space: {totalEffectivePoolSpace}
          </ToolbarItem>
          <ToolbarItem align={{ default: 'alignEnd' }}>
            <Button
              variant={ButtonVariant.plain}
              aria-label="Refresh pools"
              onClick={refreshAll}
              isLoading={isRefreshing}
            >
              <SyncAltIcon />
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {/* Pool card grid */}
      <Gallery hasGutter minWidths={{ default: '18rem' }}>
        {pools.map((pool) => (
          <DashPoolCard
            key={pool.guid ?? pool.name}
            pool={pool}
            scanObjectGroup={scanObjectGroup}
            scanActivities={scanActivities}
            trimActivities={trimActivities}
          />
        ))}
      </Gallery>
    </>
  );
}

export default Dashboard;
