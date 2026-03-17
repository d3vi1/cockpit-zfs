/**
 * PoolsPage — the main Pools tab content.
 *
 * Default export, lazy-loaded by ZfsPage.
 * Contains the toolbar (Create Pool, Import Pool, Refresh),
 * the PoolsTable, empty state, loading spinner, and modals.
 *
 * Ported from PoolsList.vue.
 */

import React, { useCallback, useState } from 'react';
import {
	PageSection,
	Toolbar,
	ToolbarContent,
	ToolbarGroup,
	ToolbarItem,
	Button,
	Spinner,
	EmptyState,
	Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon, CubesIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { PoolsTable } from './PoolsTable';
import { ImportPoolModal } from './ImportPoolModal';
import { AddVDevModal } from './AddVDevModal';

import type { ZPool } from '@45drives/houston-common-lib';

const PoolsPage: React.FC = () => {
	const { pools, poolsLoaded, canDestructive, refreshAll, isRefreshing } = useZfsData();

	const [showImportModal, setShowImportModal] = useState(false);
	const [showAddVDevModal, setShowAddVDevModal] = useState(false);
	const [addVDevPool, setAddVDevPool] = useState<ZPool | null>(null);

	// Pool Detail modal - will be wired to a separate component in a later phase
	const [, setDetailPool] = useState<ZPool | null>(null);

	const handleShowPoolDetail = useCallback((pool: ZPool) => {
		setDetailPool(pool);
		// Pool Detail modal will be implemented as a separate component
		// and can be integrated here when ready
	}, []);

	const handleShowAddVDev = useCallback((pool: ZPool) => {
		setAddVDevPool(pool);
		setShowAddVDevModal(true);
	}, []);

	const handleRefresh = useCallback(async () => {
		await refreshAll();
	}, [refreshAll]);

	return (
		<>
			<PageSection>
				<Toolbar>
					<ToolbarContent>
						<ToolbarGroup>
							<ToolbarItem>
								<Tooltip
									content="Requires administrative privileges"
									trigger={!canDestructive ? 'mouseenter' : 'manual'}
								>
									<Button
										variant="primary"
										isDisabled={!canDestructive}
										onClick={() => {
											/* Create Pool wizard will be linked in a later phase */
										}}
									>
										Create Storage Pool
									</Button>
								</Tooltip>
							</ToolbarItem>
							<ToolbarItem>
								<Tooltip
									content="Requires administrative privileges"
									trigger={!canDestructive ? 'mouseenter' : 'manual'}
								>
									<Button
										variant="secondary"
										isDisabled={!canDestructive}
										onClick={() => setShowImportModal(true)}
									>
										Import Storage Pool
									</Button>
								</Tooltip>
							</ToolbarItem>
						</ToolbarGroup>
						<ToolbarItem align={{ default: 'alignEnd' }}>
							<Button
								variant="plain"
								aria-label="Refresh pools"
								onClick={handleRefresh}
								isDisabled={isRefreshing}
							>
								<SyncAltIcon />
							</Button>
						</ToolbarItem>
					</ToolbarContent>
				</Toolbar>
			</PageSection>

			<PageSection isFilled>
				{!poolsLoaded ? (
					<Spinner aria-label="Loading pools" />
				) : pools.length === 0 ? (
					<EmptyState titleText="No Pools Found" headingLevel="h2" icon={CubesIcon} />
				) : (
					<PoolsTable
						pools={pools}
						onShowPoolDetail={handleShowPoolDetail}
						onShowAddVDev={handleShowAddVDev}
					/>
				)}
			</PageSection>

			{/* Import Pool Modal */}
			<ImportPoolModal
				isOpen={showImportModal}
				onClose={() => setShowImportModal(false)}
			/>

			{/* Add VDev Modal */}
			{addVDevPool && (
				<AddVDevModal
					isOpen={showAddVDevModal}
					onClose={() => {
						setShowAddVDevModal(false);
						setAddVDevPool(null);
					}}
					pool={addVDevPool}
				/>
			)}
		</>
	);
};

export default PoolsPage;
