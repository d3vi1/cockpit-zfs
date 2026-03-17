/**
 * PoolRow — a single expandable pool row in the pools table.
 *
 * Shows pool name, status, capacity progress bar, used, available, total,
 * message/scan status, and an action kebab dropdown.
 *
 * Expands to reveal PoolExpandedDetail.
 *
 * Ported from PoolListElement.vue.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Dropdown,
	DropdownList,
	DropdownItem,
	MenuToggle,
	MenuToggleElement,
	Progress,
	ProgressVariant,
	Icon,
} from '@patternfly/react-core';
import {
	Tr,
	Td,
	ExpandableRowContent,
} from '@patternfly/react-table';
import { EllipsisVIcon, ExclamationCircleIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { formatStatus } from '../../utils/statusColors';
import {
	destroyPool,
	clearErrors,
	trimPool,
	scrubPool,
	resilverPool,
	exportPool,
	upgradePool,
	isPoolUpgradable,
	configurePool,
} from '../../hooks/usePoolOperations';
import { labelClear } from '../../hooks/useDiskOperations';
import { PoolExpandedDetail } from './PoolExpandedDetail';
import { ConfirmationModal } from '../common/ConfirmationModal';

import type { ZPool } from '@45drives/houston-common-lib';
import type { Activity } from '../../types/index';

export interface PoolRowProps {
	pool: ZPool;
	poolIdx: number;
	columnCount: number;
	onShowPoolDetail: (pool: ZPool) => void;
	onShowAddVDev: (pool: ZPool) => void;
}

type ConfirmOp =
	| 'destroy'
	| 'scrub'
	| 'pauseScrub'
	| 'stopScrub'
	| 'resilver'
	| 'trim'
	| 'pauseTrim'
	| 'stopTrim'
	| 'export'
	| 'upgrade'
	| null;

export const PoolRow: React.FC<PoolRowProps> = ({
	pool,
	poolIdx,
	columnCount,
	onShowPoolDetail,
	onShowAddVDev,
}) => {
	const {
		canDestructive,
		scanObjectGroup,
		scanActivities,
		trimActivities,
		refreshAll,
	} = useZfsData();

	const [isExpanded, setIsExpanded] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirmOp, setConfirmOp] = useState<ConfirmOp>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [upgradeablePool, setUpgradeablePool] = useState(false);

	// Options toggles (forceUnmount, clearLabels, secureTrim)
	const [optionOne, setOptionOne] = useState(false);
	const [optionTwo, setOptionTwo] = useState(false);

	// Check upgradeability on mount
	useEffect(() => {
		isPoolUpgradable(pool.name).then(setUpgradeablePool);
	}, [pool.name]);

	// Scan/trim activities
	const scanActivity: Activity | undefined = useMemo(
		() => scanActivities.get(pool.name),
		[scanActivities, pool.name]
	);
	const trimActivity: Activity | undefined = useMemo(
		() => trimActivities.get(pool.name),
		[trimActivities, pool.name]
	);
	const scanOperation = useMemo(
		() => scanObjectGroup[pool.name]?.function,
		[scanObjectGroup, pool.name]
	);

	// Is this pool trimmable?
	const isTrimmable = useMemo(() => {
		if (pool.diskType === 'HDD') return false;
		return pool.vdevs.some(
			(v) => v.type === 'data' || v.type === 'log' || v.type === 'special' || v.type === 'dedup'
		);
	}, [pool]);

	const capacityNum = Number(pool.properties.capacity);

	// ---- Operation handlers ----

	const runOp = useCallback(
		async (op: ConfirmOp) => {
			setIsLoading(true);
			try {
				switch (op) {
					case 'destroy': {
						const output: any = await destroyPool(pool, optionOne);
						if (output != null && !output?.error) {
							if (optionTwo) {
								for (const vdev of pool.vdevs) {
									for (const disk of vdev.disks) {
										await labelClear(disk);
									}
								}
							}
						}
						break;
					}
					case 'scrub':
						await scrubPool(pool);
						break;
					case 'pauseScrub':
						await scrubPool(pool, 'pause');
						break;
					case 'stopScrub':
						await scrubPool(pool, 'stop');
						break;
					case 'resilver':
						await resilverPool(pool);
						break;
					case 'trim':
						await trimPool(pool, optionOne);
						break;
					case 'pauseTrim':
						await trimPool(pool, false, 'pause');
						break;
					case 'stopTrim':
						await trimPool(pool, false, 'stop');
						break;
					case 'export':
						await exportPool(pool, optionOne);
						break;
					case 'upgrade':
						await upgradePool(pool);
						break;
				}
				await refreshAll();
			} catch (err) {
				console.error(`Pool operation "${op}" failed:`, err);
			}
			setIsLoading(false);
			setConfirmOp(null);
		},
		[pool, optionOne, optionTwo, refreshAll]
	);

	const openConfirm = useCallback(
		(op: ConfirmOp) => {
			setOptionOne(false);
			setOptionTwo(false);
			setConfirmOp(op);
			setMenuOpen(false);
		},
		[]
	);

	const handleClearErrors = useCallback(async () => {
		setMenuOpen(false);
		await clearErrors(pool.name);
		await refreshAll();
	}, [pool.name, refreshAll]);

	const handleResumeScrub = useCallback(async () => {
		setMenuOpen(false);
		await scrubPool(pool);
		await refreshAll();
	}, [pool, refreshAll]);

	const handleResumeTrim = useCallback(async () => {
		setMenuOpen(false);
		await trimPool(pool);
		await refreshAll();
	}, [pool, refreshAll]);

	// ---- Dropdown items ----

	const dropdownItems = useMemo(() => {
		const items: React.ReactNode[] = [];

		items.push(
			<DropdownItem
				key="details"
				onClick={() => {
					setMenuOpen(false);
					onShowPoolDetail(pool);
				}}
			>
				Pool Details
			</DropdownItem>
		);

		if (!canDestructive) return items;

		items.push(
			<DropdownItem key="clearErrors" onClick={handleClearErrors}>
				Clear Pool Errors
			</DropdownItem>
		);

		if (upgradeablePool) {
			items.push(
				<DropdownItem key="upgrade" onClick={() => openConfirm('upgrade')}>
					Upgrade Pool
				</DropdownItem>
			);
		}

		if (!scanActivity?.isActive) {
			items.push(
				<DropdownItem key="resilver" onClick={() => openConfirm('resilver')}>
					Resilver Pool
				</DropdownItem>
			);
		}

		// Scrub actions
		if (!scanActivity?.isActive) {
			items.push(
				<DropdownItem key="scrub" onClick={() => openConfirm('scrub')}>
					Scrub Pool
				</DropdownItem>
			);
		}
		if (scanActivity?.isActive && scanActivity?.isPaused && scanOperation === 'SCRUB') {
			items.push(
				<DropdownItem key="resumeScrub" onClick={handleResumeScrub}>
					Resume Scrub
				</DropdownItem>
			);
		}
		if (scanActivity?.isActive && !scanActivity?.isPaused && scanOperation === 'SCRUB') {
			items.push(
				<DropdownItem key="pauseScrub" onClick={() => openConfirm('pauseScrub')}>
					Pause Scrub
				</DropdownItem>
			);
		}
		if (scanActivity?.isActive && scanOperation === 'SCRUB') {
			items.push(
				<DropdownItem key="stopScrub" onClick={() => openConfirm('stopScrub')}>
					Cancel Scrub
				</DropdownItem>
			);
		}

		// TRIM actions
		if (!trimActivity?.isActive && !trimActivity?.isPaused && pool.diskType !== 'HDD' && isTrimmable) {
			items.push(
				<DropdownItem key="trim" onClick={() => openConfirm('trim')}>
					TRIM Pool
				</DropdownItem>
			);
		}
		if (trimActivity?.isPaused && pool.diskType !== 'HDD' && isTrimmable) {
			items.push(
				<DropdownItem key="resumeTrim" onClick={handleResumeTrim}>
					Resume TRIM (Pool)
				</DropdownItem>
			);
		}
		if (trimActivity?.isActive && pool.diskType !== 'HDD' && isTrimmable) {
			items.push(
				<DropdownItem key="pauseTrim" onClick={() => openConfirm('pauseTrim')}>
					Pause TRIM (Pool)
				</DropdownItem>
			);
		}
		if ((trimActivity?.isActive || trimActivity?.isPaused) && pool.diskType !== 'HDD' && isTrimmable) {
			items.push(
				<DropdownItem key="stopTrim" onClick={() => openConfirm('stopTrim')}>
					Cancel TRIM (Pool)
				</DropdownItem>
			);
		}

		items.push(
			<DropdownItem
				key="addVDev"
				onClick={() => {
					setMenuOpen(false);
					onShowAddVDev(pool);
				}}
			>
				Add Virtual Device
			</DropdownItem>
		);
		items.push(
			<DropdownItem key="export" onClick={() => openConfirm('export')}>
				Export Pool
			</DropdownItem>
		);
		items.push(
			<DropdownItem key="destroy" onClick={() => openConfirm('destroy')}>
				Destroy Pool
			</DropdownItem>
		);

		return items;
	}, [
		canDestructive,
		upgradeablePool,
		scanActivity,
		scanOperation,
		trimActivity,
		pool,
		isTrimmable,
		handleClearErrors,
		handleResumeScrub,
		handleResumeTrim,
		openConfirm,
		onShowPoolDetail,
		onShowAddVDev,
	]);

	const menuToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
		<MenuToggle
			ref={toggleRef}
			variant="plain"
			onClick={() => setMenuOpen((prev) => !prev)}
			isExpanded={menuOpen}
			aria-label="Pool actions"
		>
			<EllipsisVIcon />
		</MenuToggle>
	);

	// ---- Confirm modal content ----

	const confirmConfig = useMemo(() => {
		const configs: Record<string, { title: string; message: string; confirmText: string; variant: 'danger' | 'warning' | 'primary'; loadingText: string }> = {
			destroy: {
				title: `Destroy ${pool.name}`,
				message: `Are you sure you want to destroy pool "${pool.name}"? This action cannot be undone.`,
				confirmText: 'Destroy',
				variant: 'danger',
				loadingText: 'Destroying...',
			},
			scrub: {
				title: `Scrub ${pool.name}`,
				message: `Are you sure you want to start a scrub on pool "${pool.name}"?`,
				confirmText: 'Scrub',
				variant: 'primary',
				loadingText: 'Starting...',
			},
			pauseScrub: {
				title: `Pause Scrub on ${pool.name}`,
				message: `Are you sure you want to pause the scrub on pool "${pool.name}"?`,
				confirmText: 'Pause',
				variant: 'warning',
				loadingText: 'Pausing...',
			},
			stopScrub: {
				title: `Stop Scrub on ${pool.name}`,
				message: `Are you sure you want to stop the scrub on pool "${pool.name}"?`,
				confirmText: 'Stop',
				variant: 'danger',
				loadingText: 'Stopping...',
			},
			resilver: {
				title: `Resilver ${pool.name}`,
				message: `Are you sure you want to resilver pool "${pool.name}"?`,
				confirmText: 'Resilver',
				variant: 'primary',
				loadingText: 'Starting...',
			},
			trim: {
				title: `TRIM ${pool.name}`,
				message: `Are you sure you want to TRIM pool "${pool.name}"?`,
				confirmText: 'TRIM',
				variant: 'primary',
				loadingText: 'Starting...',
			},
			pauseTrim: {
				title: `Pause TRIM on ${pool.name}`,
				message: `Are you sure you want to pause TRIM on pool "${pool.name}"?`,
				confirmText: 'Pause',
				variant: 'warning',
				loadingText: 'Pausing...',
			},
			stopTrim: {
				title: `Stop TRIM on ${pool.name}`,
				message: `Are you sure you want to stop TRIM on pool "${pool.name}"?`,
				confirmText: 'Stop',
				variant: 'danger',
				loadingText: 'Stopping...',
			},
			export: {
				title: `Export ${pool.name}`,
				message: `Are you sure you want to export pool "${pool.name}"?`,
				confirmText: 'Export',
				variant: 'warning',
				loadingText: 'Exporting...',
			},
			upgrade: {
				title: `Upgrade ${pool.name}`,
				message: `Are you sure you want to upgrade pool "${pool.name}"? This action cannot be undone.`,
				confirmText: 'Upgrade',
				variant: 'warning',
				loadingText: 'Upgrading...',
			},
		};
		return confirmOp ? configs[confirmOp] : null;
	}, [confirmOp, pool.name]);

	return (
		<>
			{/* Main pool row */}
			<Tr
				isClickable
				onRowClick={() => setIsExpanded((prev) => !prev)}
			>
				<Td
					expand={{
						rowIndex: poolIdx,
						isExpanded,
						onToggle: () => setIsExpanded((prev) => !prev),
					}}
				/>
				<Td dataLabel="Name">
					{pool.name}
					{upgradeablePool && (
						<Icon status="warning" style={{ marginLeft: '0.5rem' }}>
							<ExclamationCircleIcon title="Pool was made with a legacy version of ZFS. Upgrade available." />
						</Icon>
					)}
				</Td>
				<Td dataLabel="Status" modifier="nowrap">
					<span className={formatStatus(pool.status)}>
						<strong>{pool.status}</strong>
					</span>
				</Td>
				<Td dataLabel="Used (%)">
					<Progress
						value={capacityNum}
						title={`${pool.properties.capacity}%`}
						variant={capacityNum > 80 ? ProgressVariant.danger : undefined}
						measureLocation="outside"
						aria-label={`${pool.name} capacity`}
					/>
				</Td>
				<Td dataLabel="Used">{pool.properties.allocated}</Td>
				<Td dataLabel="Available">{String(pool.properties.available)}</Td>
				<Td dataLabel="Total">{pool.properties.size}</Td>
				<Td dataLabel="Message" onClick={(e) => e.stopPropagation()}>
					{/* Scan status summary */}
					{scanActivity?.isActive && scanOperation && (
						<span>
							{scanOperation === 'SCRUB' ? 'Scrub' : 'Resilver'}{' '}
							{scanActivity.isPaused ? 'paused' : 'running'}
						</span>
					)}
				</Td>
				<Td isActionCell onClick={(e) => e.stopPropagation()}>
					<Dropdown
						isOpen={menuOpen}
						onOpenChange={setMenuOpen}
						toggle={menuToggle}
						popperProps={{ position: 'right' }}
					>
						<DropdownList>{dropdownItems}</DropdownList>
					</Dropdown>
				</Td>
			</Tr>

			{/* Expanded detail row */}
			{isExpanded && (
				<Tr isExpanded={isExpanded}>
					<Td colSpan={columnCount}>
						<ExpandableRowContent>
							<PoolExpandedDetail pool={pool} poolIdx={poolIdx} />
						</ExpandableRowContent>
					</Td>
				</Tr>
			)}

			{/* Confirmation Modal */}
			{confirmOp && confirmConfig && (
				<ConfirmationModal
					isOpen={!!confirmOp}
					onClose={() => setConfirmOp(null)}
					onConfirm={() => runOp(confirmOp)}
					title={confirmConfig.title}
					message={confirmConfig.message}
					confirmText={confirmConfig.confirmText}
					variant={confirmConfig.variant}
					isLoading={isLoading}
					loadingText={confirmConfig.loadingText}
				/>
			)}
		</>
	);
};

export default PoolRow;
