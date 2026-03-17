/**
 * AddVDevModal — modal for adding a virtual device to an existing pool.
 *
 * Allows selecting VDev type, disk identifier, and available disks.
 * Validates disk selection against VDev type requirements.
 *
 * Ported from AddVDevModal.vue.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Modal,
	ModalVariant,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Button,
	Form,
	FormGroup,
	FormSelect,
	FormSelectOption,
	Switch,
	Alert,
	Flex,
	FlexItem,
	Content,
	Checkbox,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { upperCaseWord, getDiskIDName, getFullDiskInfo, truncateName } from '../../utils/helpers';
import { convertSizeToBytes } from '../../utils/formatters';
import { setRefreservation } from '../../hooks/usePoolOperations';
import { loadImportablePools } from '../../data/loadImportables';

import type { ZPool, VDev, VDevDisk, ZFSManager } from '@45drives/houston-common-lib';
import type { ImportablePoolData } from '../../types/index';

export interface AddVDevModalProps {
	isOpen: boolean;
	onClose: () => void;
	pool: ZPool;
}

type VDevType = 'disk' | 'mirror' | 'raidz1' | 'raidz2' | 'raidz3' | 'cache' | 'log' | 'special' | 'spare' | 'dedup';

export const AddVDevModal: React.FC<AddVDevModalProps> = ({ isOpen, onClose, pool }) => {
	const { disks: allDisks, pools, refreshAll } = useZfsData();

	const [adding, setAdding] = useState(false);
	const [selectedDisks, setSelectedDisks] = useState<string[]>([]);
	const [diskIdentifier, setDiskIdentifier] = useState<string>('vdev_path');
	const [forceAdd, setForceAdd] = useState(false);
	const [isMirror, setIsMirror] = useState(false);

	// Feedback messages
	const [diskFeedback, setDiskFeedback] = useState('');
	const [diskSizeFeedback, setDiskSizeFeedback] = useState('');
	const [replicationFeedback, setReplicationFeedback] = useState('');
	const [diskBelongsFeedback, setDiskBelongsFeedback] = useState('');

	const [localImportablePools, setLocalImportablePools] = useState<ImportablePoolData[]>([]);

	// Determine first VDev type
	const firstVDevType = useMemo((): VDevType => {
		if (!pool.vdevs || pool.vdevs.length === 0) return 'disk';
		const firstVDev = pool.vdevs[0];
		const isDisk = firstVDev.disks.length === 1;
		if (isDisk) return 'disk';
		const name = firstVDev.name ?? '';
		const stripped = name.substring(0, name.indexOf('-'));
		if (['mirror', 'raidz1', 'raidz2', 'raidz3'].includes(stripped)) {
			return stripped as VDevType;
		}
		return 'disk';
	}, [pool.vdevs]);

	const [vdevType, setVdevType] = useState<VDevType>(firstVDevType);

	// Reset modal state when opened
	useEffect(() => {
		if (isOpen) {
			setVdevType(firstVDevType);
			setSelectedDisks([]);
			setForceAdd(false);
			setIsMirror(false);
			setDiskFeedback('');
			setDiskSizeFeedback('');
			setReplicationFeedback('');
			setDiskBelongsFeedback('');
			setAdding(false);

			// Load importable pools for membership check
			loadImportablePools().then(setLocalImportablePools).catch(console.error);
		}
	}, [isOpen, firstVDevType]);

	// Available disks (not in any pool)
	const availableDisks = useMemo(() => {
		return allDisks.filter((disk) => disk.guid === '');
	}, [allDisks]);

	// Toggle disk selection
	const toggleDisk = useCallback((diskName: string) => {
		setSelectedDisks((prev) =>
			prev.includes(diskName)
				? prev.filter((d) => d !== diskName)
				: [...prev, diskName]
		);
	}, []);

	// VDev type options for first VDev match
	const dataTypeOptions = useMemo((): VDevType[] => {
		if (!pool.vdevs || pool.vdevs.length === 0) return [];
		if (pool.vdevs[0].type !== 'data') return [];
		return [firstVDevType];
	}, [pool.vdevs, firstVDevType]);

	// ---- Validation ----

	const diskCheck = useCallback((): boolean => {
		setDiskFeedback('');
		const count = selectedDisks.length;
		const minDisks: Record<string, [number, string]> = {
			mirror: [2, 'Two or more Disks are required for Mirror.'],
			raidz1: [3, 'Three or more Disks are required for RaidZ1.'],
			raidz2: [4, 'Four or more Disks are required for RaidZ2.'],
			raidz3: [5, 'Five or more Disks are required for RaidZ3.'],
			disk: [1, 'At least one Disk is required.'],
			log: [1, 'At least one Disk is required for Log.'],
			cache: [1, 'At least one Disk is required for Cache.'],
			special: [1, 'At least one Disk is required for Special.'],
			spare: [1, 'At least one Disk is required for Spare.'],
			dedup: [1, 'At least one Disk is required for Dedup.'],
		};
		const rule = minDisks[vdevType];
		if (rule && count < rule[0]) {
			setDiskFeedback(rule[1]);
			return false;
		}
		return true;
	}, [selectedDisks, vdevType]);

	const diskSizeMatch = useCallback((): boolean => {
		setDiskSizeFeedback('');
		if (forceAdd || vdevType === 'disk') return true;

		let previousCapacity = 0;
		for (const selDisk of selectedDisks) {
			const disk = allDisks.find((d) => d.name === selDisk);
			if (disk?.capacity) {
				const currentCapacity = convertSizeToBytes(disk.capacity);
				if (previousCapacity !== 0 && currentCapacity !== previousCapacity) {
					setDiskSizeFeedback(
						'Mirror contains devices of different sizes. Forcefully create to override.'
					);
					return false;
				}
				previousCapacity = currentCapacity;
			}
		}
		return true;
	}, [selectedDisks, allDisks, forceAdd, vdevType]);

	const replicationLevelCheck = useCallback((): boolean => {
		setReplicationFeedback('');
		if (
			(vdevType === 'dedup' || vdevType === 'special') &&
			!forceAdd &&
			!isMirror
		) {
			setReplicationFeedback('Mismatched replication level. Forcefully create to override.');
			return false;
		}
		if (
			isMirror &&
			(vdevType === 'special' || vdevType === 'dedup' || vdevType === 'log') &&
			selectedDisks.length < 2
		) {
			setReplicationFeedback(
				`Two or more Disks are required for Mirror (${upperCaseWord(vdevType)}).`
			);
			return false;
		}
		return true;
	}, [vdevType, forceAdd, isMirror, selectedDisks]);

	const diskBelongsToImportablePool = useCallback((): boolean => {
		setDiskBelongsFeedback('');
		if (forceAdd) return false;

		for (const diskName of selectedDisks) {
			const selectedDisk = allDisks.find((d) => d.name === diskName);
			for (const iPool of localImportablePools) {
				for (const iVdev of iPool.vdevs) {
					for (const iDisk of iVdev.disks) {
						if (selectedDisk?.name === (iDisk as any).name) {
							setDiskBelongsFeedback(
								`This disk was used in exported pool '${iPool.name}'.\nUse Force Add to override and use disk in new VDev.`
							);
							return true;
						}
					}
				}
			}
		}
		return false;
	}, [selectedDisks, allDisks, localImportablePools, forceAdd]);

	// ---- Add VDev handler ----

	const handleAddVDev = useCallback(async () => {
		if (!replicationLevelCheck() || !diskSizeMatch() || !diskCheck()) return;
		if (diskBelongsToImportablePool() && !forceAdd) return;

		const newVDev: any = {
			type: vdevType,
			disks: [],
			isMirror,
			forceAdd: { force: forceAdd },
		};

		for (const diskName of selectedDisks) {
			const idName = getDiskIDName(allDisks, diskIdentifier, diskName);
			const diskFull = getFullDiskInfo(allDisks, idName);
			if (diskFull) newVDev.disks.push(diskFull);
		}

		// Deduplicate
		const seen = new Set<string>();
		newVDev.disks = newVDev.disks.filter((d: any) => {
			const key = d.vdev_path || d.phy_path || d.sd_path || d.name;
			if (!key || seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		setAdding(true);
		try {
			// Use ZFSManager from houston-common-lib
			const { ZFSManager } = await import('@45drives/houston-common-lib');
			const zfsManager = new ZFSManager();
			const output: any = await zfsManager.addVDevsToPool(pool, [newVDev], newVDev.forceAdd);

			if (output == null || output?.error) {
				console.error('Add VDev failed:', output?.error);
				setDiskFeedback(output?.error ?? 'Add VDev failed');
			} else {
				// Update refreservation if set
				if (pool.properties.refreservationRawSize) {
					try {
						await setRefreservation(pool, pool.properties.refreservationPercent!);
					} catch (err) {
						console.error('Refreservation update failed:', err);
					}
				}
				onClose();
			}
			await refreshAll();
		} catch (err: any) {
			console.error('Add VDev failed:', err);
			setDiskFeedback(err?.message ?? 'Add VDev failed');
		}
		setAdding(false);
	}, [
		pool,
		vdevType,
		isMirror,
		forceAdd,
		selectedDisks,
		allDisks,
		diskIdentifier,
		diskCheck,
		diskSizeMatch,
		replicationLevelCheck,
		diskBelongsToImportablePool,
		refreshAll,
		onClose,
	]);

	const handleClose = useCallback(() => {
		setSelectedDisks([]);
		setDiskFeedback('');
		setDiskSizeFeedback('');
		setReplicationFeedback('');
		setDiskBelongsFeedback('');
		onClose();
	}, [onClose]);

	// Shows mirror toggle for log/special/dedup
	const showMirrorToggle = vdevType === 'log' || vdevType === 'special' || vdevType === 'dedup';

	return (
		<Modal
			variant={ModalVariant.large}
			isOpen={isOpen}
			onClose={handleClose}
			aria-labelledby="add-vdev-modal-title"
		>
			<ModalHeader title="Add Virtual Device" />

			<ModalBody>
				<Form>
					{/* VDev Type */}
					<FormGroup label="Type" fieldId="add-vdev-type">
						<FormSelect
							id="add-vdev-type"
							value={vdevType}
							onChange={(_e, val) => setVdevType(val as VDevType)}
						>
							{/* Data type matches first VDev */}
							{dataTypeOptions.map((type) => (
								<FormSelectOption key={type} value={type} label={upperCaseWord(type)} />
							))}
							<FormSelectOption value="cache" label="Cache" />
							<FormSelectOption value="log" label="Log" />
							<FormSelectOption value="special" label="Special" />
							<FormSelectOption value="spare" label="Spare" />
							<FormSelectOption value="dedup" label="Dedup" />
						</FormSelect>
					</FormGroup>

					{/* Mirror toggle for log/special/dedup */}
					{showMirrorToggle && (
						<FormGroup
							label={`${upperCaseWord(vdevType)} (Mirror)`}
							fieldId="add-vdev-mirror"
						>
							<Switch
								id="add-vdev-mirror"
								isChecked={isMirror}
								onChange={(_e, val) => setIsMirror(val)}
							/>
						</FormGroup>
					)}

					{/* Disk Identifier */}
					<FormGroup label="Disk Identifier" fieldId="add-vdev-disk-id">
						<FormSelect
							id="add-vdev-disk-id"
							value={diskIdentifier}
							onChange={(_e, val) => setDiskIdentifier(val)}
						>
							<FormSelectOption value="sd_path" label="Block Device" />
							<FormSelectOption value="phy_path" label="Hardware Path" />
							<FormSelectOption value="vdev_path" label="Device Alias" />
						</FormSelect>
					</FormGroup>

					{/* Disk Selection */}
					<FormGroup label="Select Disks" fieldId="add-vdev-disk-list">
						{availableDisks.length > 0 ? (
							<Flex flexWrap={{ default: 'wrap' }}>
								{availableDisks.map((disk, idx) => {
									const isSelected = selectedDisks.includes(disk.name!);
									const displayName = truncateName(
										getDiskIDName(allDisks, diskIdentifier, disk.name!),
										8
									);
									return (
										<FlexItem key={idx}>
											<div
												onClick={() => toggleDisk(disk.name!)}
												style={{
													border: `1px solid ${
														isSelected
															? 'var(--pf-t--global--color--status--success--default)'
															: 'var(--pf-t--global--border--color--default)'
													}`,
													borderRadius: 'var(--pf-t--global--border--radius--small)',
													padding: '0.75rem 0.5rem',
													cursor: 'pointer',
													backgroundColor: isSelected
														? 'var(--pf-t--global--color--status--success--default)'
														: undefined,
													color: isSelected ? '#fff' : undefined,
													minWidth: '8rem',
													textAlign: 'center',
												}}
											>
												<Flex
													justifyContent={{ default: 'justifyContentSpaceBetween' }}
													alignItems={{ default: 'alignItemsCenter' }}
												>
													<FlexItem>
														<Checkbox
															id={`add-vdev-disk-${idx}`}
															isChecked={isSelected}
															onChange={() => toggleDisk(disk.name!)}
															aria-label={`Select ${disk.name}`}
														/>
													</FlexItem>
													{(disk as any).hasPartitions && (
														<FlexItem>
															<ExclamationCircleIcon
																color="var(--pf-t--global--icon--color--status--warning--default)"
																title="Disk has partitions. Proceed with caution."
															/>
														</FlexItem>
													)}
													{disk.errors && (disk.errors as any).length > 0 && (
														<FlexItem>
															<ExclamationTriangleIcon
																color="var(--pf-t--global--icon--color--status--danger--default)"
																title="Disk belongs to an exported pool."
															/>
														</FlexItem>
													)}
												</Flex>
												<Content component="h3">{displayName}</Content>
												<Content component="small">{disk.type}</Content>
												<Content component="small">
													Capacity: {disk.capacity}
												</Content>
											</div>
										</FlexItem>
									);
								})}
							</Flex>
						) : (
							<Content component="p">No Disks Available</Content>
						)}
					</FormGroup>
				</Form>
			</ModalBody>

			<ModalFooter>
				<Flex
					direction={{ default: 'column' }}
					style={{ width: '100%' }}
				>
					{/* Feedback alerts */}
					{diskFeedback && <Alert variant="danger" isInline isPlain title={diskFeedback} />}
					{diskSizeFeedback && <Alert variant="danger" isInline isPlain title={diskSizeFeedback} />}
					{replicationFeedback && (
						<Alert variant="danger" isInline isPlain title={replicationFeedback} />
					)}
					{diskBelongsFeedback && (
						<Alert variant="danger" isInline isPlain title={diskBelongsFeedback} />
					)}

					<Flex
						justifyContent={{ default: 'justifyContentSpaceBetween' }}
						alignItems={{ default: 'alignItemsCenter' }}
						style={{ width: '100%' }}
					>
						<FlexItem>
							<Button variant="danger" onClick={handleClose}>
								Close
							</Button>
						</FlexItem>
						<FlexItem>
							<Switch
								id="add-vdev-force"
								label="Forcefully Add"
								isChecked={forceAdd}
								onChange={(_e, val) => setForceAdd(val)}
							/>
						</FlexItem>
						<FlexItem>
							<Button
								variant="primary"
								onClick={handleAddVDev}
								isDisabled={adding}
								isLoading={adding}
								spinnerAriaValueText={adding ? 'Adding' : undefined}
							>
								{adding ? 'Adding...' : 'Add VDev'}
							</Button>
						</FlexItem>
					</Flex>
				</Flex>
			</ModalFooter>
		</Modal>
	);
};

export default AddVDevModal;
