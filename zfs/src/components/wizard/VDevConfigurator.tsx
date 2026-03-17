/**
 * VDevConfigurator -- Add/remove VDevs and select their types and disks.
 *
 * Handles the first VDev (data VDev) with stripe/mirror/raidz options,
 * and additional VDevs with cache/log/special/spare/dedup options plus
 * an optional mirror toggle.
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React from 'react';
import {
	Card,
	CardHeader,
	CardBody,
	CardTitle,
	Button,
	FormGroup,
	FormSelect,
	FormSelectOption,
	Switch,
	Flex,
	FlexItem,
	Content,
	ContentVariants,
} from '@patternfly/react-core';
import TrashIcon from '@patternfly/react-icons/dist/esm/icons/trash-icon';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import type { VDevDisk } from '@45drives/houston-common-lib';
import { DiskSelector } from './DiskSelector';
import { upperCaseWord } from '../../utils/helpers';

// ── VDev type options ───────────────────────────
const PRIMARY_VDEV_TYPES = [
	{ value: 'disk', label: 'Disk' },
	{ value: 'mirror', label: 'Mirror' },
	{ value: 'raidz1', label: 'RaidZ1' },
	{ value: 'raidz2', label: 'RaidZ2' },
	{ value: 'raidz3', label: 'RaidZ3' },
];

const SECONDARY_SPECIAL_TYPES = [
	{ value: 'cache', label: 'Cache' },
	{ value: 'log', label: 'Log' },
	{ value: 'special', label: 'Special' },
	{ value: 'spare', label: 'Spare' },
	{ value: 'dedup', label: 'Dedup' },
];

const DISK_ID_OPTIONS = [
	{ value: 'sd_path', label: 'Block Device' },
	{ value: 'phy_path', label: 'Hardware Path' },
	{ value: 'vdev_path', label: 'Device Alias' },
];

// ── VDev data model ─────────────────────────────
export interface VDevConfig {
	type: string;
	diskIdentifier: string;
	selectedDisks: string[];
	isMirror: boolean;
}

interface VDevConfiguratorProps {
	/** Array of all VDev configs. */
	vdevs: VDevConfig[];
	/** All known disks. */
	allDisks: VDevDisk[];
	/** Callback when vdevs change. */
	onChange: (vdevs: VDevConfig[]) => void;
}

/**
 * For a given vdevIdx, compute which disks are still available
 * (guid is empty = not assigned to any pool, and not claimed by another VDev).
 */
function getAvailableDisks(
	vdevs: VDevConfig[],
	vdevIdx: number,
	allDisks: VDevDisk[],
): VDevDisk[] {
	const claimedByOthers = vdevs
		.filter((_, idx) => idx !== vdevIdx)
		.flatMap((v) => v.selectedDisks);

	return allDisks.filter(
		(disk) =>
			(disk as any).guid === '' && !claimedByOthers.includes(disk.name!),
	);
}

export const VDevConfigurator: React.FC<VDevConfiguratorProps> = ({
	vdevs,
	allDisks,
	onChange,
}) => {
	// ── Mutations ────────────────────────────────
	const updateVDev = (idx: number, partial: Partial<VDevConfig>) => {
		const next = vdevs.map((v, i) => (i === idx ? { ...v, ...partial } : v));
		onChange(next);
	};

	const removeVDev = (idx: number) => {
		onChange(vdevs.filter((_, i) => i !== idx));
	};

	const addVDev = () => {
		const primaryType = vdevs.length > 0 ? vdevs[0].type : 'raidz2';
		onChange([
			...vdevs,
			{
				type: primaryType,
				diskIdentifier: 'vdev_path',
				selectedDisks: [],
				isMirror: false,
			},
		]);
	};

	const addInitialVDev = () => {
		onChange([
			{
				type: 'raidz2',
				diskIdentifier: 'vdev_path',
				selectedDisks: [],
				isMirror: false,
			},
		]);
	};

	// ── Render ───────────────────────────────────
	if (vdevs.length === 0) {
		return (
			<Button
				variant="primary"
				icon={<PlusCircleIcon />}
				onClick={addInitialVDev}
			>
				Add VDev
			</Button>
		);
	}

	const primaryType = vdevs[0]?.type ?? 'raidz2';
	const mirrorableTypes = ['log', 'special', 'dedup'];

	return (
		<>
			{vdevs.map((vdev, idx) => {
				const isPrimary = idx === 0;
				const availDisks = getAvailableDisks(vdevs, idx, allDisks);

				// Build the type option list depending on position
				const typeOptions = isPrimary
					? PRIMARY_VDEV_TYPES
					: [
							{ value: primaryType, label: upperCaseWord(primaryType) },
							...SECONDARY_SPECIAL_TYPES,
					  ];

				return (
					<Card key={idx} isCompact>
						<CardHeader
							actions={{
								actions: (
									<Button
										variant="plain"
										aria-label="Remove VDev"
										onClick={() => removeVDev(idx)}
									>
										<TrashIcon />
									</Button>
								),
								hasNoOffset: true,
							}}
						>
							<CardTitle>
								VDev {idx + 1}
								{!isPrimary && vdev.type !== primaryType
									? ` (${upperCaseWord(vdev.type)})`
									: ''}
							</CardTitle>
						</CardHeader>
						<CardBody>
							{/* VDev Type */}
							<FormGroup fieldId={`vdev-${idx}-type`} label="Type">
								<FormSelect
									id={`vdev-${idx}-type`}
									value={vdev.type}
									onChange={(_e, val) => updateVDev(idx, { type: val })}
								>
									{typeOptions.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Disk Identifier */}
							<FormGroup
								fieldId={`vdev-${idx}-disk-id`}
								label="Disk Identifier"
							>
								<FormSelect
									id={`vdev-${idx}-disk-id`}
									value={vdev.diskIdentifier}
									onChange={(_e, val) =>
										updateVDev(idx, { diskIdentifier: val })
									}
								>
									{DISK_ID_OPTIONS.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Mirror toggle for special secondary types */}
							{!isPrimary && mirrorableTypes.includes(vdev.type) && (
								<FormGroup
									fieldId={`vdev-${idx}-mirror`}
									label={`Mirror (${upperCaseWord(vdev.type)})`}
								>
									<Switch
										id={`vdev-${idx}-mirror`}
										isChecked={vdev.isMirror}
										onChange={(_e, checked) =>
											updateVDev(idx, { isMirror: checked })
										}
										label="Enabled"
									/>
								</FormGroup>
							)}

							{/* Disk selection */}
							<FormGroup fieldId={`vdev-${idx}-disks`} label="Select Disks">
								<DiskSelector
									allDisks={allDisks}
									availableDisks={availDisks}
									selectedDisks={vdev.selectedDisks}
									onSelectionChange={(sel) =>
										updateVDev(idx, { selectedDisks: sel })
									}
									diskIdentifier={vdev.diskIdentifier}
								/>
							</FormGroup>

							<Content component={ContentVariants.small}>
								{vdev.selectedDisks.length} disk
								{vdev.selectedDisks.length !== 1 ? 's' : ''} selected
							</Content>
						</CardBody>
					</Card>
				);
			})}

			<Flex>
				<FlexItem>
					<Button
						variant="primary"
						icon={<PlusCircleIcon />}
						onClick={addVDev}
					>
						Add VDev
					</Button>
				</FlexItem>
			</Flex>
		</>
	);
};

export default VDevConfigurator;
