/**
 * SnapshotsTable -- on-demand snapshot table for pool detail and file system views.
 *
 * Loads snapshots lazily via loadSnapshotsInPool / loadSnapshotsInDataset and
 * manages its own local snapshot state (not from ZfsDataContext).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Alert,
	AlertActionCloseButton,
	AlertVariant,
	Bullseye,
	Button,
	ButtonVariant,
	Checkbox,
	Dropdown,
	DropdownItem,
	DropdownList,
	EmptyState,
	EmptyStateActions,
	EmptyStateBody,
	EmptyStateFooter,
	EmptyStateVariant,
	MenuToggle,
	MenuToggleElement,
	Spinner,
	Toolbar,
	ToolbarContent,
	ToolbarItem,
} from '@patternfly/react-core';
import {
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
	Td,
} from '@patternfly/react-table';
import { EllipsisVIcon } from '@patternfly/react-icons';

import type { Snapshot } from '../../types/index';
import { loadSnapshotsInPool, loadSnapshotsInDataset } from '../../data/loadSnapshots';
import { destroySnapshot, rollbackSnapshot } from '../../hooks/useSnapshotOperations';
import { useZfsData } from '../../contexts/ZfsDataContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { CreateSnapshotModal } from './CreateSnapshotModal';
import { CloneSnapshotModal } from './CloneSnapshotModal';
import { RenameSnapshotModal } from './RenameSnapshotModal';
import { SendSnapshotModal } from './SendSnapshotModal';

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export interface SnapshotsTableProps {
	/** Load snapshots for a pool (pool detail view). */
	poolName?: string;
	/** Load snapshots for a single dataset (file systems view). */
	datasetName?: string;
	/** Whether to show the "Create Snapshot" button. */
	showCreateButton?: boolean;
}

// ────────────────────────────────────────────────
// Action types
// ────────────────────────────────────────────────

type ModalAction =
	| { kind: 'clone'; snapshot: Snapshot }
	| { kind: 'rename'; snapshot: Snapshot }
	| { kind: 'rollback'; snapshot: Snapshot }
	| { kind: 'send'; snapshot: Snapshot }
	| { kind: 'destroy'; snapshot: Snapshot };

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export const SnapshotsTable: React.FC<SnapshotsTableProps> = ({
	poolName,
	datasetName,
	showCreateButton = false,
}) => {
	const { canDestructive, datasets, pools, refreshAll } = useZfsData();

	// ── Local snapshot state (on-demand loaded) ──
	const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	// ── Alert state ──
	const [alert, setAlert] = useState<{ title: string; message: string; variant: AlertVariant } | null>(null);

	// ── Bulk destroy state ──
	const [bulkDestroyMode, setBulkDestroyMode] = useState(false);
	const [selectedForDestroy, setSelectedForDestroy] = useState<string[]>([]);
	const [bulkDestroyProgress, setBulkDestroyProgress] = useState<{ processed: number; total: number } | null>(null);

	// ── Modal state ──
	const [activeModal, setActiveModal] = useState<ModalAction | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [isOperationRunning, setIsOperationRunning] = useState(false);

	// ── Destroy confirmation extras ──
	const [destroyChildrenSameName, setDestroyChildrenSameName] = useState(false);
	const [destroyAllChildren, setDestroyAllChildren] = useState(false);

	// ── Rollback confirmation extras ──
	const [rollbackDestroyNewer, setRollbackDestroyNewer] = useState(false);
	const [rollbackDestroyAllNewer, setRollbackDestroyAllNewer] = useState(false);

	// ── Per-row kebab open state ──
	const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

	// ── Data loading ──
	const loadSnapshots = useCallback(async () => {
		setIsLoading(true);
		setNotFound(false);
		try {
			if (poolName) {
				const result = await loadSnapshotsInPool(poolName);
				setSnapshots(result);
				setNotFound(result.length === 0);
			} else if (datasetName) {
				const result = await loadSnapshotsInDataset(datasetName);
				setSnapshots(result.snapshots);
				setNotFound(!result.found);
			}
		} catch (error) {
			console.error('Failed to load snapshots:', error);
			setNotFound(true);
		} finally {
			setIsLoading(false);
		}
	}, [poolName, datasetName]);

	useEffect(() => {
		loadSnapshots();
	}, [loadSnapshots]);

	// ── Helpers ──
	const isFilesystemMode = !!datasetName;

	const hasChildren = useMemo(() => {
		if (!activeModal || activeModal.kind !== 'destroy') return false;
		const clones = activeModal.snapshot.properties?.clones;
		return Array.isArray(clones) ? clones.length > 0 : typeof clones === 'string' && clones.length > 0;
	}, [activeModal]);

	// ── Bulk destroy helpers ──
	const isSelectAllChecked = selectedForDestroy.length === snapshots.length && snapshots.length > 0;

	const toggleSelectAll = useCallback(() => {
		if (isSelectAllChecked) {
			setSelectedForDestroy([]);
		} else {
			setSelectedForDestroy(snapshots.map(s => s.name));
		}
	}, [isSelectAllChecked, snapshots]);

	const toggleSnapshotSelection = useCallback((snapName: string) => {
		setSelectedForDestroy(prev =>
			prev.includes(snapName) ? prev.filter(n => n !== snapName) : [...prev, snapName]
		);
	}, []);

	// ── Action handlers ──
	const handleDestroy = useCallback(async () => {
		if (!activeModal || activeModal.kind !== 'destroy') return;
		setIsOperationRunning(true);
		try {
			const output: any = await destroySnapshot(
				activeModal.snapshot.name,
				destroyChildrenSameName,
				destroyAllChildren,
			);
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				setAlert({
					title: 'Destroy Snapshot Failed',
					message: `${activeModal.snapshot.name} was not destroyed: ${errorMessage}`,
					variant: AlertVariant.danger,
				});
			} else {
				setAlert({
					title: 'Snapshot Destroyed',
					message: `${activeModal.snapshot.name} destroyed.`,
					variant: AlertVariant.success,
				});
				await loadSnapshots();
			}
		} catch (error) {
			console.error(error);
		} finally {
			setIsOperationRunning(false);
			setActiveModal(null);
			setDestroyChildrenSameName(false);
			setDestroyAllChildren(false);
		}
	}, [activeModal, destroyChildrenSameName, destroyAllChildren, loadSnapshots]);

	const handleRollback = useCallback(async () => {
		if (!activeModal || activeModal.kind !== 'rollback') return;
		setIsOperationRunning(true);
		try {
			const output: any = await rollbackSnapshot(
				activeModal.snapshot,
				rollbackDestroyNewer,
				rollbackDestroyAllNewer,
			);
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				setAlert({
					title: 'Rollback Snapshot Failed',
					message: `${activeModal.snapshot.name} was not rolled back: ${errorMessage}`,
					variant: AlertVariant.danger,
				});
			} else {
				setAlert({
					title: 'Snapshot Rolled Back',
					message: `Rolled back to snapshot ${activeModal.snapshot.name}.`,
					variant: AlertVariant.success,
				});
				await loadSnapshots();
			}
		} catch (error) {
			console.error(error);
		} finally {
			setIsOperationRunning(false);
			setActiveModal(null);
			setRollbackDestroyNewer(false);
			setRollbackDestroyAllNewer(false);
		}
	}, [activeModal, rollbackDestroyNewer, rollbackDestroyAllNewer, loadSnapshots]);

	const handleBulkDestroy = useCallback(async () => {
		setIsOperationRunning(true);
		const destroyed: string[] = [];
		const failed: string[] = [];
		let lastError = '';

		setBulkDestroyProgress({ processed: 0, total: selectedForDestroy.length });

		for (let i = 0; i < selectedForDestroy.length; i++) {
			const snapName = selectedForDestroy[i];
			const output: any = await destroySnapshot(snapName, false, false);
			if (output == null || output.error) {
				lastError = output?.error || 'Unknown error';
				failed.push(snapName);
			} else {
				destroyed.push(snapName);
			}
			setBulkDestroyProgress({ processed: i + 1, total: selectedForDestroy.length });
		}

		if (failed.length > 0) {
			setAlert({
				title: 'Destroy Snapshots Failed',
				message: `The following snapshots were not destroyed: ${failed.join(', ')}: ${lastError}`,
				variant: AlertVariant.danger,
			});
		}
		if (destroyed.length > 0) {
			setAlert({
				title: 'Snapshots Destroyed',
				message: `The following snapshots were destroyed: ${destroyed.join(', ')}`,
				variant: AlertVariant.success,
			});
		}

		setBulkDestroyMode(false);
		setSelectedForDestroy([]);
		setBulkDestroyProgress(null);
		setIsOperationRunning(false);
		setActiveModal(null);
		await loadSnapshots();
	}, [selectedForDestroy, loadSnapshots]);

	const handleCreateComplete = useCallback(async () => {
		await loadSnapshots();
	}, [loadSnapshots]);

	const handleCloneComplete = useCallback(async () => {
		await loadSnapshots();
		await refreshAll();
	}, [loadSnapshots, refreshAll]);

	const handleRenameComplete = useCallback(async () => {
		await loadSnapshots();
	}, [loadSnapshots]);

	const handleSendComplete = useCallback(async () => {
		await loadSnapshots();
	}, [loadSnapshots]);

	// ── Build row actions ──
	const getActions = useCallback((snapshot: Snapshot, rowIdx: number) => {
		const isPoolMode = !!poolName;

		const items = isPoolMode
			? [
				{ label: 'Rename Snapshot', action: () => setActiveModal({ kind: 'rename', snapshot }) },
				{ label: 'Roll Back Snapshot', action: () => setActiveModal({ kind: 'rollback', snapshot }) },
				{ label: 'Destroy Snapshot', action: () => setActiveModal({ kind: 'destroy', snapshot }) },
			]
			: [
				{ label: 'Clone Snapshot', action: () => setActiveModal({ kind: 'clone', snapshot }), disabled: !canDestructive },
				{ label: 'Rename Snapshot', action: () => setActiveModal({ kind: 'rename', snapshot }), disabled: !canDestructive },
				{ label: 'Roll Back Snapshot', action: () => setActiveModal({ kind: 'rollback', snapshot }), disabled: !canDestructive },
				{ label: 'Send Snapshot', action: () => setActiveModal({ kind: 'send', snapshot }), disabled: !canDestructive },
				{ label: 'Destroy Snapshot', action: () => setActiveModal({ kind: 'destroy', snapshot }), disabled: !canDestructive },
			];

		return (
			<Dropdown
				isOpen={openDropdownIdx === rowIdx}
				onSelect={() => setOpenDropdownIdx(null)}
				onOpenChange={(isOpen) => setOpenDropdownIdx(isOpen ? rowIdx : null)}
				toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
					<MenuToggle
						ref={toggleRef}
						aria-label="Snapshot actions"
						variant="plain"
						onClick={() => setOpenDropdownIdx(openDropdownIdx === rowIdx ? null : rowIdx)}
						isExpanded={openDropdownIdx === rowIdx}
					>
						<EllipsisVIcon />
					</MenuToggle>
				)}
				popperProps={{ position: 'right' }}
			>
				<DropdownList>
					{items.map((item) => (
						<DropdownItem
							key={item.label}
							onClick={item.action}
							isDisabled={item.disabled}
							description={item.disabled ? 'Requires administrative privileges' : undefined}
						>
							{item.label}
						</DropdownItem>
					))}
				</DropdownList>
			</Dropdown>
		);
	}, [poolName, canDestructive, openDropdownIdx]);

	// ── Loading state ──
	if (isLoading) {
		return (
			<Bullseye>
				<Spinner aria-label="Loading snapshots" />
			</Bullseye>
		);
	}

	// ── Empty state ──
	if (notFound || snapshots.length === 0) {
		return (
			<EmptyState variant={EmptyStateVariant.sm}>
				<EmptyStateBody>No snapshots found.</EmptyStateBody>
				{showCreateButton && (
					<EmptyStateFooter>
						<EmptyStateActions>
							<Button variant={ButtonVariant.primary} onClick={() => setShowCreateModal(true)}>
								Create Snapshot
							</Button>
						</EmptyStateActions>
					</EmptyStateFooter>
				)}
				{showCreateModal && (
					<CreateSnapshotModal
						isOpen={showCreateModal}
						onClose={() => setShowCreateModal(false)}
						onSuccess={handleCreateComplete}
						item={poolName ? 'pool' : 'filesystem'}
						poolName={poolName}
						datasetName={datasetName}
					/>
				)}
			</EmptyState>
		);
	}

	// ── Render table ──
	return (
		<>
			{alert && (
				<Alert
					variant={alert.variant}
					title={alert.title}
					actionClose={<AlertActionCloseButton onClose={() => setAlert(null)} />}
				>
					{alert.message}
				</Alert>
			)}

			{isFilesystemMode && (
				<Toolbar>
					<ToolbarContent>
						{showCreateButton && (
							<ToolbarItem>
								<Button variant={ButtonVariant.primary} onClick={() => setShowCreateModal(true)}>
									Create Snapshot
								</Button>
							</ToolbarItem>
						)}
						{canDestructive && (
							<ToolbarItem>
								<Button
									variant={bulkDestroyMode ? ButtonVariant.secondary : ButtonVariant.warning}
									onClick={() => {
										setBulkDestroyMode(!bulkDestroyMode);
										setSelectedForDestroy([]);
									}}
								>
									{bulkDestroyMode ? 'Cancel Bulk Destroy' : 'Bulk Destroy'}
								</Button>
							</ToolbarItem>
						)}
						{bulkDestroyMode && canDestructive && (
							<ToolbarItem>
								<Button
									variant={ButtonVariant.danger}
									isDisabled={selectedForDestroy.length === 0 || isOperationRunning}
									isLoading={isOperationRunning}
									onClick={() => setActiveModal({ kind: 'destroy', snapshot: snapshots[0] })}
								>
									{isOperationRunning && bulkDestroyProgress
										? `Destroying ${bulkDestroyProgress.processed} / ${bulkDestroyProgress.total}...`
										: `Destroy Selected (${selectedForDestroy.length})`}
								</Button>
							</ToolbarItem>
						)}
					</ToolbarContent>
				</Toolbar>
			)}

			<Table aria-label="Snapshots table" variant="compact">
				<Thead>
					<Tr>
						{bulkDestroyMode && (
							<Th>
								<Checkbox
									id="select-all-snapshots"
									isChecked={isSelectAllChecked}
									onChange={toggleSelectAll}
									label="Select All"
								/>
							</Th>
						)}
						<Th>Snapshot</Th>
						<Th>Created On</Th>
						<Th>Used</Th>
						<Th>Referenced</Th>
						<Th>Clones</Th>
						{!bulkDestroyMode && <Th screenReaderText="Actions" />}
					</Tr>
				</Thead>
				<Tbody>
					{snapshots.map((snapshot, idx) => {
						const clones = snapshot.properties?.clones;
						const clonesDisplay = Array.isArray(clones)
							? (clones.length > 0 ? clones.join(', ') : '-')
							: (typeof clones === 'string' && clones.length > 0 ? clones : '-');

						return (
							<Tr key={snapshot.name}>
								{bulkDestroyMode && (
									<Td>
										<Checkbox
											id={`select-snap-${idx}`}
											isChecked={selectedForDestroy.includes(snapshot.name)}
											onChange={() => toggleSnapshotSelection(snapshot.name)}
										/>
									</Td>
								)}
								<Td dataLabel="Snapshot">{snapshot.name}</Td>
								<Td dataLabel="Created On">
									{snapshot.properties?.creation?.parsed ?? ''}
								</Td>
								<Td dataLabel="Used">
									{snapshot.properties?.used?.value ?? ''}
								</Td>
								<Td dataLabel="Referenced">
									{snapshot.properties?.referenced?.value ?? ''}
								</Td>
								<Td dataLabel="Clones">{clonesDisplay}</Td>
								{!bulkDestroyMode && (
									<Td isActionCell>{getActions(snapshot, idx)}</Td>
								)}
							</Tr>
						);
					})}
				</Tbody>
			</Table>

			{/* ── Modals ── */}

			{showCreateModal && (
				<CreateSnapshotModal
					isOpen={showCreateModal}
					onClose={() => setShowCreateModal(false)}
					onSuccess={handleCreateComplete}
					item={poolName ? 'pool' : 'filesystem'}
					poolName={poolName}
					datasetName={datasetName}
				/>
			)}

			{activeModal?.kind === 'destroy' && !bulkDestroyMode && (
				<ConfirmationModal
					isOpen
					onClose={() => {
						setActiveModal(null);
						setDestroyChildrenSameName(false);
						setDestroyAllChildren(false);
					}}
					onConfirm={handleDestroy}
					title="Destroy Snapshot"
					message={`Are you sure you want to destroy snapshot "${activeModal.snapshot.name}"?`}
					confirmText="Destroy"
					variant="danger"
					isLoading={isOperationRunning}
					loadingText="Destroying..."
				>
					{hasChildren && (
						<>
							<Checkbox
								id="destroy-children-same-name"
								label="Destroy child snapshots with same name"
								isChecked={destroyChildrenSameName}
								onChange={(_event, checked) => setDestroyChildrenSameName(checked)}
							/>
							<Checkbox
								id="destroy-all-children"
								label="Force Destroy ALL child datasets"
								isChecked={destroyAllChildren}
								onChange={(_event, checked) => setDestroyAllChildren(checked)}
							/>
						</>
					)}
				</ConfirmationModal>
			)}

			{activeModal?.kind === 'destroy' && bulkDestroyMode && (
				<ConfirmationModal
					isOpen
					onClose={() => setActiveModal(null)}
					onConfirm={handleBulkDestroy}
					title="Destroy Selected Snapshots"
					message={`Are you sure you want to destroy ${selectedForDestroy.length} snapshot(s)?`}
					confirmText="Destroy All"
					variant="danger"
					isLoading={isOperationRunning}
					loadingText={
						bulkDestroyProgress
							? `Destroying ${bulkDestroyProgress.processed} / ${bulkDestroyProgress.total}...`
							: 'Destroying...'
					}
				/>
			)}

			{activeModal?.kind === 'rollback' && (
				<ConfirmationModal
					isOpen
					onClose={() => {
						setActiveModal(null);
						setRollbackDestroyNewer(false);
						setRollbackDestroyAllNewer(false);
					}}
					onConfirm={handleRollback}
					title="Roll Back Snapshot"
					message={`Are you sure you want to roll back to snapshot "${activeModal.snapshot.name}"?`}
					confirmText="Roll Back"
					variant="warning"
					isLoading={isOperationRunning}
					loadingText="Rolling back..."
				>
					<Checkbox
						id="rollback-destroy-newer"
						label="Destroy all newer snapshots of file system"
						isChecked={rollbackDestroyNewer}
						onChange={(_event, checked) => setRollbackDestroyNewer(checked)}
					/>
					<Checkbox
						id="rollback-destroy-all-newer"
						label="Force Destroy ALL newer datasets"
						isChecked={rollbackDestroyAllNewer}
						onChange={(_event, checked) => setRollbackDestroyAllNewer(checked)}
					/>
				</ConfirmationModal>
			)}

			{activeModal?.kind === 'clone' && (
				<CloneSnapshotModal
					isOpen
					onClose={() => setActiveModal(null)}
					onSuccess={handleCloneComplete}
					snapshot={activeModal.snapshot}
				/>
			)}

			{activeModal?.kind === 'rename' && (
				<RenameSnapshotModal
					isOpen
					onClose={() => setActiveModal(null)}
					onSuccess={handleRenameComplete}
					snapshot={activeModal.snapshot}
				/>
			)}

			{activeModal?.kind === 'send' && (
				<SendSnapshotModal
					isOpen
					onClose={() => setActiveModal(null)}
					onSuccess={handleSendComplete}
					snapshot={activeModal.snapshot}
				/>
			)}
		</>
	);
};

export default SnapshotsTable;
