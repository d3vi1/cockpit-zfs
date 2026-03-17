/**
 * DiskRow — a single disk table row within a VDev section.
 *
 * Shows disk name, state, type, temperature, capacity, and message.
 * Provides action dropdown for: Replace, Detach, Online/Offline, TRIM.
 *
 * Ported from DiskElement.vue.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
	Dropdown,
	DropdownList,
	DropdownItem,
	MenuToggle,
	MenuToggleElement,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { EllipsisVIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { formatStatus } from '../../utils/statusColors';
import {
	detachDisk,
	offlineDisk,
	onlineDisk,
	replaceDisk,
	trimDisk,
	labelClear,
} from '../../hooks/useDiskOperations';
import { clearErrors, scrubPool } from '../../hooks/usePoolOperations';
import { ConfirmationModal } from '../common/ConfirmationModal';

import type { ZPool, VDev, VDevDisk } from '@45drives/houston-common-lib';
import type { Activity } from '../../types/index';

export interface DiskRowProps {
	pool: ZPool;
	vDev: VDev;
	disk: VDevDisk;
	diskIdx: number;
}

type ConfirmTarget =
	| 'detach'
	| 'offline'
	| 'online'
	| 'replace'
	| 'trim'
	| 'pauseTrim'
	| 'stopTrim'
	| null;

export const DiskRow: React.FC<DiskRowProps> = ({ pool, vDev, disk, diskIdx }) => {
	const { canDestructive, poolDiskStats, trimActivities, refreshAll } = useZfsData();

	const [menuOpen, setMenuOpen] = useState(false);
	const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Options toggles for confirmation modals
	const [optionOne, setOptionOne] = useState(false);
	const [optionTwo, setOptionTwo] = useState(false);

	// Disk state from poolDiskStats
	const diskState = useMemo(() => {
		const diskArray = poolDiskStats[pool.name];
		if (!diskArray) return 'MISSING';
		const found = diskArray.find((d: any) => d.name === disk.name);
		return found ? found.status : 'MISSING';
	}, [poolDiskStats, pool.name, disk.name]);

	// SD name display
	const diskSdName = useMemo(() => {
		if (disk.sd_path && !disk.sd_path.includes(disk.name!)) {
			return `(${disk.sd_path.replace(/^\/dev\//, '')})`;
		}
		return '';
	}, [disk.sd_path, disk.name]);

	// Trim activity for this disk
	const trimActivity: Activity | undefined = useMemo(() => {
		return trimActivities.get(disk.name!);
	}, [trimActivities, disk.name]);

	// Is this disk trimmable?
	const isTrimmable = useMemo(() => {
		if (pool.diskType === 'HDD') return false;
		const vDevType = (disk as any).vDevType;
		return vDevType === 'data' || vDevType === 'log' || vDevType === 'special' || vDevType === 'dedup';
	}, [pool.diskType, disk]);

	// Action handlers
	const handleDetach = useCallback(async () => {
		setIsLoading(true);
		try {
			const output: any = await detachDisk(pool.name, disk.name!);
			if (output == null || output?.error) {
				console.error('Detach failed:', output?.error);
			} else {
				if (optionTwo) {
					await labelClear(disk);
				}
			}
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsLoading(false);
		setConfirmTarget(null);
	}, [pool.name, disk, optionTwo, refreshAll]);

	const handleOffline = useCallback(async () => {
		setIsLoading(true);
		try {
			const output: any = await offlineDisk(pool.name, disk.name!, optionOne, optionTwo);
			if (output == null || output?.error) {
				console.error('Offline failed:', output?.error);
			}
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsLoading(false);
		setConfirmTarget(null);
	}, [pool.name, disk.name, optionOne, optionTwo, refreshAll]);

	const handleOnline = useCallback(async () => {
		setIsLoading(true);
		try {
			const output: any = await onlineDisk(pool.name, disk.name!, optionOne);
			if (output == null || output?.error) {
				console.error('Online failed:', output?.error);
			} else {
				if (optionTwo) {
					await scrubPool(pool);
				}
			}
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsLoading(false);
		setConfirmTarget(null);
	}, [pool, disk.name, optionOne, optionTwo, refreshAll]);

	const handleTrim = useCallback(async () => {
		setIsLoading(true);
		try {
			const output: any = await trimDisk(pool.name, disk.name!, optionOne);
			if (output == null || output?.error) {
				console.error('Trim failed:', output?.error);
			}
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsLoading(false);
		setConfirmTarget(null);
	}, [pool.name, disk.name, optionOne, refreshAll]);

	const handlePauseTrim = useCallback(async () => {
		setIsLoading(true);
		try {
			await trimDisk(pool.name, disk.name!, false, 'pause');
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsLoading(false);
		setConfirmTarget(null);
	}, [pool.name, disk.name, refreshAll]);

	const handleStopTrim = useCallback(async () => {
		setIsLoading(true);
		try {
			await trimDisk(pool.name, disk.name!, false, 'stop');
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsLoading(false);
		setConfirmTarget(null);
	}, [pool.name, disk.name, refreshAll]);

	const handleConfirm = useCallback(() => {
		switch (confirmTarget) {
			case 'detach':
				return handleDetach();
			case 'offline':
				return handleOffline();
			case 'online':
				return handleOnline();
			case 'trim':
				return handleTrim();
			case 'pauseTrim':
				return handlePauseTrim();
			case 'stopTrim':
				return handleStopTrim();
			default:
				setConfirmTarget(null);
		}
	}, [confirmTarget, handleDetach, handleOffline, handleOnline, handleTrim, handlePauseTrim, handleStopTrim]);

	const confirmTitle = useMemo(() => {
		switch (confirmTarget) {
			case 'detach':
				return `Detach ${disk.name}`;
			case 'offline':
				return `Offline ${disk.name}`;
			case 'online':
				return `Online ${disk.name}`;
			case 'trim':
				return `TRIM ${disk.name}`;
			case 'pauseTrim':
				return `Pause TRIM on ${disk.name}`;
			case 'stopTrim':
				return `Stop TRIM on ${disk.name}`;
			default:
				return '';
		}
	}, [confirmTarget, disk.name]);

	const confirmMessage = useMemo(() => {
		switch (confirmTarget) {
			case 'detach':
				return `Are you sure you want to detach disk "${disk.name}" from pool "${pool.name}"?`;
			case 'offline':
				return `Are you sure you want to offline disk "${disk.name}" in pool "${pool.name}"?`;
			case 'online':
				return `Are you sure you want to online disk "${disk.name}" in pool "${pool.name}"?`;
			case 'trim':
				return `Are you sure you want to TRIM disk "${disk.name}" in pool "${pool.name}"?`;
			case 'pauseTrim':
				return `Are you sure you want to pause TRIM on disk "${disk.name}"?`;
			case 'stopTrim':
				return `Are you sure you want to stop TRIM on disk "${disk.name}"?`;
			default:
				return '';
		}
	}, [confirmTarget, disk.name, pool.name]);

	const openConfirm = useCallback((target: ConfirmTarget) => {
		setOptionOne(false);
		setOptionTwo(false);
		setConfirmTarget(target);
		setMenuOpen(false);
	}, []);

	// Build dropdown items
	const dropdownItems = useMemo(() => {
		const items: React.ReactNode[] = [];

		if (!canDestructive) return items;

		if (vDev.disks.length > 1 && diskState !== 'REMOVED') {
			items.push(
				<DropdownItem key="detach" onClick={() => openConfirm('detach')}>
					Detach Disk
				</DropdownItem>
			);
		}
		if (diskState === 'ONLINE') {
			items.push(
				<DropdownItem key="offline" onClick={() => openConfirm('offline')}>
					Offline Disk
				</DropdownItem>
			);
		}
		if (diskState === 'OFFLINE') {
			items.push(
				<DropdownItem key="online" onClick={() => openConfirm('online')}>
					Online Disk
				</DropdownItem>
			);
		}
		if (diskState !== 'REMOVED') {
			items.push(
				<DropdownItem key="replace" onClick={() => { setMenuOpen(false); /* Replace modal handled externally */ }}>
					Replace Disk
				</DropdownItem>
			);
		}

		// TRIM actions
		if (!trimActivity?.isActive && !trimActivity?.isPaused && pool.diskType !== 'HDD' && isTrimmable && diskState !== 'REMOVED') {
			items.push(
				<DropdownItem key="trim" onClick={() => openConfirm('trim')}>
					TRIM Disk
				</DropdownItem>
			);
		}
		if (trimActivity?.isPaused && pool.diskType !== 'HDD' && isTrimmable && diskState !== 'REMOVED') {
			items.push(
				<DropdownItem key="resumeTrim" onClick={async () => {
					setMenuOpen(false);
					await trimDisk(pool.name, disk.name!);
					await refreshAll();
				}}>
					Resume TRIM (Disk)
				</DropdownItem>
			);
		}
		if (trimActivity?.isActive && pool.diskType !== 'HDD' && isTrimmable && diskState !== 'REMOVED') {
			items.push(
				<DropdownItem key="pauseTrim" onClick={() => openConfirm('pauseTrim')}>
					Pause TRIM (Disk)
				</DropdownItem>
			);
		}
		if ((trimActivity?.isActive || trimActivity?.isPaused) && pool.diskType !== 'HDD' && isTrimmable && diskState !== 'REMOVED') {
			items.push(
				<DropdownItem key="stopTrim" onClick={() => openConfirm('stopTrim')}>
					Cancel TRIM (Disk)
				</DropdownItem>
			);
		}

		return items;
	}, [canDestructive, vDev.disks.length, diskState, trimActivity, pool, disk, isTrimmable, openConfirm, refreshAll]);

	const menuToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
		<MenuToggle
			ref={toggleRef}
			variant="plain"
			onClick={() => setMenuOpen((prev) => !prev)}
			isExpanded={menuOpen}
			aria-label="Disk actions"
		>
			<EllipsisVIcon />
		</MenuToggle>
	);

	return (
		<>
			<Tr>
				<Td dataLabel="Disk">
					{disk.name} {diskSdName}{' '}
					{disk.replacingTarget && (
						<span>
							<span className="zfs-status-replacing">replacing</span> {(disk as any).replacingTargetLabel}
						</span>
					)}
				</Td>
				<Td dataLabel="State" modifier="nowrap">
					<span className={formatStatus(diskState)}><strong>{diskState}</strong></span>
				</Td>
				<Td dataLabel="Type">{disk.type}</Td>
				<Td dataLabel="Temperature">{disk.temp}</Td>
				<Td dataLabel="Capacity">{disk.capacity}</Td>
				<Td dataLabel="Message">{/* Status/message placeholder */}</Td>
				<Td isActionCell>
					{dropdownItems.length > 0 && (
						<Dropdown
							isOpen={menuOpen}
							onOpenChange={setMenuOpen}
							toggle={menuToggle}
							popperProps={{ position: 'right' }}
						>
							<DropdownList>{dropdownItems}</DropdownList>
						</Dropdown>
					)}
				</Td>
			</Tr>

			{/* Child disks for REPLACING/MISSING state */}
			{(diskState === 'REPLACING' || diskState === 'MISSING') &&
				(disk as any).children?.map((child: any) => (
					<Tr key={child.name}>
						<Td dataLabel="Disk" colSpan={3}>{disk.name}</Td>
						<Td colSpan={2} />
						<Td colSpan={2} />
					</Tr>
				))}

			{/* Confirmation Modal */}
			{confirmTarget && (
				<ConfirmationModal
					isOpen={!!confirmTarget}
					onClose={() => setConfirmTarget(null)}
					onConfirm={handleConfirm}
					title={confirmTitle}
					message={confirmMessage}
					confirmText="Confirm"
					variant={confirmTarget === 'detach' ? 'danger' : 'warning'}
					isLoading={isLoading}
					loadingText="Processing..."
				/>
			)}
		</>
	);
};

export default DiskRow;
