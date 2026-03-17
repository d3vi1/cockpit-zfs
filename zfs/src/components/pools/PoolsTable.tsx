/**
 * PoolsTable — expandable table showing all pools.
 *
 * Uses PF React Table with expandable rows. Each pool row can be
 * toggled to reveal VDev/disk details via PoolExpandedDetail.
 *
 * Ported from the <table> in PoolsList.vue.
 */

import React from 'react';
import {
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
} from '@patternfly/react-table';

import { PoolRow } from './PoolRow';

import type { ZPool } from '@45drives/houston-common-lib';

const COLUMN_COUNT = 9; // toggle + 7 data columns + actions

export interface PoolsTableProps {
	pools: ZPool[];
	onShowPoolDetail: (pool: ZPool) => void;
	onShowAddVDev: (pool: ZPool) => void;
}

export const PoolsTable: React.FC<PoolsTableProps> = ({
	pools,
	onShowPoolDetail,
	onShowAddVDev,
}) => {
	return (
		<Table variant="compact" aria-label="Storage pools">
			<Thead>
				<Tr>
					<Th screenReaderText="Toggle" />
					<Th>Name</Th>
					<Th modifier="nowrap">Status</Th>
					<Th modifier="nowrap">Used (%)</Th>
					<Th modifier="nowrap">Used</Th>
					<Th modifier="nowrap">Available</Th>
					<Th modifier="nowrap">Total</Th>
					<Th modifier="nowrap">Message</Th>
					<Th screenReaderText="Actions" />
				</Tr>
			</Thead>
			<Tbody>
				{pools.map((pool, idx) => (
					<PoolRow
						key={pool.name}
						pool={pool}
						poolIdx={idx}
						columnCount={COLUMN_COUNT}
						onShowPoolDetail={onShowPoolDetail}
						onShowAddVDev={onShowAddVDev}
					/>
				))}
			</Tbody>
		</Table>
	);
};

export default PoolsTable;
