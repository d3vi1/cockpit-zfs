/**
 * FileSystemTable -- renders the file systems dataset table.
 *
 * Uses PF React Table components (Table, Thead, Tbody, Tr, Th, Td).
 * Columns: Name, Available, Used, Used By Snapshots, Refres., Compression,
 *          Dedup., Encrypted, Mounted, Read Only, Actions
 *
 * Sorts datasets hierarchically by pool > path depth so child datasets
 * appear nested beneath their parent.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
	Td,
} from '@patternfly/react-table';

import type { ZPool, ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import type { Snapshot } from '../../types/index';

import { FileSystemRow } from './FileSystemRow';
import { FileSystemConfigModal } from './FileSystemConfigModal';
import { ChangePassphraseModal } from './ChangePassphraseModal';
import { RenameFileSystemModal } from './RenameFileSystemModal';
import { LockUnlockModal } from './LockUnlockModal';
import { ConfirmationModal } from '../common/ConfirmationModal';

import {
	destroyDataset,
	unmountFileSystem,
	mountFileSystem,
	lockFileSystem,
} from '../../hooks/useDatasetOperations';

export interface FileSystemTableProps {
	datasets: ZFSFileSystemInfo[];
	pools: ZPool[];
	snapshots: Snapshot[];
	canDestructive: boolean;
	onRefresh: () => Promise<void>;
}

type ModalState =
	| { kind: 'none' }
	| { kind: 'configure'; dataset: ZFSFileSystemInfo }
	| { kind: 'rename'; dataset: ZFSFileSystemInfo }
	| { kind: 'changePassphrase'; dataset: ZFSFileSystemInfo }
	| { kind: 'lock'; dataset: ZFSFileSystemInfo }
	| { kind: 'unlock'; dataset: ZFSFileSystemInfo }
	| { kind: 'destroy'; dataset: ZFSFileSystemInfo; hasChildren: boolean }
	| { kind: 'unmount'; dataset: ZFSFileSystemInfo }
	| { kind: 'mount'; dataset: ZFSFileSystemInfo };

/** Hierarchical sort: pool name first, then path components. */
function hierarchicalSort(a: ZFSFileSystemInfo, b: ZFSFileSystemInfo): number {
	const [aPool, ...aRest] = a.name.split('/');
	const [bPool, ...bRest] = b.name.split('/');

	const poolCompare = aPool.localeCompare(bPool);
	if (poolCompare !== 0) return poolCompare;

	for (let i = 0; i < Math.min(aRest.length, bRest.length); i++) {
		const cmp = aRest[i].localeCompare(bRest[i]);
		if (cmp !== 0) return cmp;
	}

	return aRest.length - bRest.length;
}

export function FileSystemTable({
	datasets,
	pools,
	snapshots,
	canDestructive,
	onRefresh,
}: FileSystemTableProps) {
	const [modal, setModal] = useState<ModalState>({ kind: 'none' });
	const [operationLoading, setOperationLoading] = useState(false);
	const [forceUnmount, setForceUnmount] = useState(false);
	const [lockAfterUnmount, setLockAfterUnmount] = useState(false);
	const [forceMount, setForceMount] = useState(false);
	const [destroyForce, setDestroyForce] = useState(false);
	const [destroyChildren, setDestroyChildren] = useState(false);
	const [destroyDependents, setDestroyDependents] = useState(false);

	// Filter and sort filesystem datasets
	const sortedFileSystems = useMemo(() => {
		return datasets
			.filter(ds => ds.type === 'FILESYSTEM')
			.sort(hierarchicalSort);
	}, [datasets]);

	const isPoolDataset = useCallback(
		(dataset: ZFSFileSystemInfo) => pools.some(p => p.name === dataset.name),
		[pools],
	);

	const datasetHasChildren = useCallback(
		(dataset: ZFSFileSystemInfo): boolean => {
			const hasChildDatasets =
				Array.isArray(dataset.children) && dataset.children.length > 0;
			const hasSnaps = snapshots.some(
				s =>
					(s.dataset && s.dataset === dataset.name) ||
					(typeof s.name === 'string' && s.name.startsWith(dataset.name + '@')),
			);
			return hasChildDatasets || hasSnaps;
		},
		[snapshots],
	);

	const closeModal = useCallback(() => {
		setModal({ kind: 'none' });
		setOperationLoading(false);
		setForceUnmount(false);
		setLockAfterUnmount(false);
		setForceMount(false);
		setDestroyForce(false);
		setDestroyChildren(false);
		setDestroyDependents(false);
	}, []);

	// ── Action handlers ──

	const handleConfigure = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'configure', dataset: ds });
	}, []);

	const handleRename = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'rename', dataset: ds });
	}, []);

	const handleChangePassphrase = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'changePassphrase', dataset: ds });
	}, []);

	const handleLock = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'lock', dataset: ds });
	}, []);

	const handleUnlock = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'unlock', dataset: ds });
	}, []);

	const handleDestroy = useCallback(
		(ds: ZFSFileSystemInfo) => {
			const hasChildren = !isPoolDataset(ds) && datasetHasChildren(ds);
			setModal({ kind: 'destroy', dataset: ds, hasChildren });
		},
		[isPoolDataset, datasetHasChildren],
	);

	const handleUnmount = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'unmount', dataset: ds });
	}, []);

	const handleMount = useCallback((ds: ZFSFileSystemInfo) => {
		setModal({ kind: 'mount', dataset: ds });
	}, []);

	// ── Confirmation callbacks ──

	const confirmDestroy = useCallback(async () => {
		if (modal.kind !== 'destroy') return;
		setOperationLoading(true);
		try {
			const output: any = await destroyDataset(
				modal.dataset,
				destroyForce,
				destroyChildren,
				destroyDependents,
			);
			if (output == null || output.error) {
				console.error('Destroy failed:', output?.error);
			}
			await onRefresh();
		} catch (error) {
			console.error(error);
		} finally {
			closeModal();
		}
	}, [modal, destroyForce, destroyChildren, destroyDependents, onRefresh, closeModal]);

	const confirmUnmount = useCallback(async () => {
		if (modal.kind !== 'unmount') return;
		setOperationLoading(true);
		try {
			const output: any = await unmountFileSystem(modal.dataset, forceUnmount);
			if (output == null || output.error) {
				console.error('Unmount failed:', output?.error);
			} else if (modal.dataset.encrypted && lockAfterUnmount) {
				const lockOutput: any = await lockFileSystem(modal.dataset);
				if (lockOutput == null || lockOutput.error) {
					console.error('Lock after unmount failed:', lockOutput?.error);
				}
			}
			await onRefresh();
		} catch (error) {
			console.error(error);
		} finally {
			closeModal();
		}
	}, [modal, forceUnmount, lockAfterUnmount, onRefresh, closeModal]);

	const confirmMount = useCallback(async () => {
		if (modal.kind !== 'mount') return;
		setOperationLoading(true);
		try {
			const output: any = await mountFileSystem(modal.dataset, forceMount);
			if (output == null || output.error) {
				console.error('Mount failed:', output?.error);
			}
			await onRefresh();
		} catch (error) {
			console.error(error);
		} finally {
			closeModal();
		}
	}, [modal, forceMount, onRefresh, closeModal]);

	return (
		<>
			<Table aria-label="File systems table" variant="compact">
				<Thead>
					<Tr>
						<Th width={20}>Dataset</Th>
						<Th>Available</Th>
						<Th>Used</Th>
						<Th>Used By Snapshots</Th>
						<Th>Refres.</Th>
						<Th>Compression</Th>
						<Th>Dedup.</Th>
						<Th modifier="fitContent">Encrypted</Th>
						<Th modifier="fitContent">Mounted</Th>
						<Th modifier="fitContent">Read Only</Th>
						<Th screenReaderText="Actions" />
					</Tr>
				</Thead>
				<Tbody>
					{sortedFileSystems.map(dataset => (
						<FileSystemRow
							key={dataset.name}
							dataset={dataset}
							pools={pools}
							canDestructive={canDestructive}
							isPoolDataset={isPoolDataset(dataset)}
							onConfigure={handleConfigure}
							onRename={handleRename}
							onChangePassphrase={handleChangePassphrase}
							onLock={handleLock}
							onUnlock={handleUnlock}
							onDestroy={handleDestroy}
							onUnmount={handleUnmount}
							onMount={handleMount}
						/>
					))}
				</Tbody>
			</Table>

			{/* Configure modal */}
			{modal.kind === 'configure' && (
				<FileSystemConfigModal
					isOpen
					onClose={closeModal}
					filesystem={modal.dataset}
					pools={pools}
					onSaved={async () => {
						await onRefresh();
						closeModal();
					}}
				/>
			)}

			{/* Rename modal */}
			{modal.kind === 'rename' && (
				<RenameFileSystemModal
					isOpen
					onClose={closeModal}
					filesystem={modal.dataset}
					datasets={datasets.filter(ds => ds.type === 'FILESYSTEM')}
					onRenamed={async () => {
						await onRefresh();
						closeModal();
					}}
				/>
			)}

			{/* Change passphrase modal */}
			{modal.kind === 'changePassphrase' && (
				<ChangePassphraseModal
					isOpen
					onClose={closeModal}
					filesystem={modal.dataset}
					onChanged={async () => {
						await onRefresh();
						closeModal();
					}}
				/>
			)}

			{/* Lock / Unlock modal */}
			{(modal.kind === 'lock' || modal.kind === 'unlock') && (
				<LockUnlockModal
					isOpen
					onClose={closeModal}
					mode={modal.kind}
					filesystem={modal.dataset}
					onCompleted={async () => {
						await onRefresh();
						closeModal();
					}}
				/>
			)}

			{/* Destroy confirmation */}
			{modal.kind === 'destroy' && (
				<ConfirmationModal
					isOpen
					onClose={closeModal}
					onConfirm={confirmDestroy}
					title="Destroy File System"
					confirmText="Destroy"
					variant="danger"
					isLoading={operationLoading}
					loadingText="Destroying..."
					message={`Are you sure you want to destroy ${modal.dataset.name}?`}
				>
					{modal.hasChildren && (
						<p style={{ marginTop: '0.5rem' }}>
							This dataset has child datasets or snapshots. They will also be affected.
						</p>
					)}
				</ConfirmationModal>
			)}

			{/* Unmount confirmation */}
			{modal.kind === 'unmount' && (
				<ConfirmationModal
					isOpen
					onClose={closeModal}
					onConfirm={confirmUnmount}
					title="Unmount File System"
					confirmText="Unmount"
					variant="warning"
					isLoading={operationLoading}
					loadingText="Unmounting..."
					message={`Are you sure you want to unmount ${modal.dataset.name}?`}
				/>
			)}

			{/* Mount confirmation */}
			{modal.kind === 'mount' && (
				<ConfirmationModal
					isOpen
					onClose={closeModal}
					onConfirm={confirmMount}
					title="Mount File System"
					confirmText="Mount"
					variant="primary"
					isLoading={operationLoading}
					loadingText="Mounting..."
					message={`Mount file system ${modal.dataset.name}?`}
				/>
			)}
		</>
	);
}

export default FileSystemTable;
