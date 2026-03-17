/**
 * PoolExpandedDetail — the expanded content for a pool row.
 *
 * Shows VDev rows with nested disk tables, plus scan/trim activity status.
 * Rendered inside `<ExpandableRowContent>` in PoolRow.
 *
 * Ported from the expandable row content in PoolListElement.vue
 * (the inline vdev iteration) and the detail modal Stats/Topology tabs
 * in PoolDetail.vue.
 */

import React from 'react';
import {
	DescriptionList,
	DescriptionListGroup,
	DescriptionListTerm,
	DescriptionListDescription,
	Progress,
	ProgressVariant,
	Flex,
	FlexItem,
	Content,
} from '@patternfly/react-core';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { formatStatus, getCapacityColor } from '../../utils/statusColors';
import { VDevRow } from './VDevRow';

import type { ZPool } from '@45drives/houston-common-lib';

export interface PoolExpandedDetailProps {
	pool: ZPool;
	poolIdx: number;
}

export const PoolExpandedDetail: React.FC<PoolExpandedDetailProps> = ({ pool, poolIdx }) => {
	const { scanObjectGroup, scanActivities, trimActivities } = useZfsData();

	const scanObj = scanObjectGroup[pool.name];
	const scanActivity = scanActivities.get(pool.name);
	const trimActivity = trimActivities.get(pool.name);

	const capacityNum = Number(pool.properties.capacity);

	return (
		<div>
			{/* Pool Summary */}
			<DescriptionList isHorizontal isCompact columnModifier={{ default: '3Col' }}>
				<DescriptionListGroup>
					<DescriptionListTerm>Status</DescriptionListTerm>
					<DescriptionListDescription>
						<span className={formatStatus(pool.status)}>
							<strong>{pool.status}</strong>
						</span>
					</DescriptionListDescription>
				</DescriptionListGroup>
				<DescriptionListGroup>
					<DescriptionListTerm>Used</DescriptionListTerm>
					<DescriptionListDescription>{pool.properties.allocated}</DescriptionListDescription>
				</DescriptionListGroup>
				<DescriptionListGroup>
					<DescriptionListTerm>Available</DescriptionListTerm>
					<DescriptionListDescription>{String(pool.properties.available)}</DescriptionListDescription>
				</DescriptionListGroup>
				<DescriptionListGroup>
					<DescriptionListTerm>Total</DescriptionListTerm>
					<DescriptionListDescription>{pool.properties.size}</DescriptionListDescription>
				</DescriptionListGroup>
				<DescriptionListGroup>
					<DescriptionListTerm>Errors</DescriptionListTerm>
					<DescriptionListDescription>
						<span className={formatStatus(pool.status)}>{pool.errorCount}</span>
					</DescriptionListDescription>
				</DescriptionListGroup>
				<DescriptionListGroup>
					<DescriptionListTerm>Capacity</DescriptionListTerm>
					<DescriptionListDescription>
						<Progress
							value={capacityNum}
							title={`${pool.properties.capacity}%`}
							variant={capacityNum > 80 ? ProgressVariant.danger : undefined}
							measureLocation="outside"
							aria-label="Pool capacity"
						/>
					</DescriptionListDescription>
				</DescriptionListGroup>
			</DescriptionList>

			{/* Scan Activity */}
			{scanActivity?.isActive && scanObj && (
				<Flex style={{ marginTop: '0.5rem' }}>
					<FlexItem>
						<Content component="small">
							{scanObj.function === 'SCRUB' ? 'Scrub' : 'Resilver'}{' '}
							{scanActivity.isPaused ? 'paused' : 'in progress'}
							{scanObj.percentage != null && ` - ${scanObj.percentage}%`}
						</Content>
					</FlexItem>
					{scanObj.percentage != null && (
						<FlexItem grow={{ default: 'grow' }}>
							<Progress
								value={Number(scanObj.percentage)}
								aria-label="Scan progress"
								measureLocation="none"
							/>
						</FlexItem>
					)}
				</Flex>
			)}

			{/* Trim Activity */}
			{(trimActivity?.isActive || trimActivity?.isPaused) && (
				<Flex style={{ marginTop: '0.25rem' }}>
					<FlexItem>
						<Content component="small">
							TRIM {trimActivity.isPaused ? 'paused' : 'in progress'}
						</Content>
					</FlexItem>
				</Flex>
			)}

			{/* VDev Rows */}
			<div style={{ marginTop: '0.75rem' }}>
				{pool.vdevs.map((vDev, vDevIdx) => (
					<VDevRow
						key={vDevIdx}
						pool={pool}
						poolIdx={poolIdx}
						vDev={vDev}
						vDevIdx={vDevIdx}
					/>
				))}
			</div>
		</div>
	);
};

export default PoolExpandedDetail;
