/**
 * PoolConfigStep -- First wizard step: pool name, VDev layout, pool settings.
 *
 * Combines pool naming, VDev configuration (via VDevConfigurator), and pool-
 * level ZFS properties (sector size, record size, compression, advanced
 * options) into a single scrollable form.
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React, { useState } from 'react';
import {
	Form,
	FormGroup,
	TextInput,
	FormSelect,
	FormSelectOption,
	Switch,
	ExpandableSection,
	FormHelperText,
	HelperText,
	HelperTextItem,
	NumberInput,
	Flex,
	FlexItem,
} from '@patternfly/react-core';
import type { VDevDisk } from '@45drives/houston-common-lib';
import { VDevConfigurator, type VDevConfig } from './VDevConfigurator';
import { convertSizeToBytes } from '../../utils/formatters';

// ── Select option definitions ───────────────────
const SECTOR_SIZE_OPTIONS = [
	{ value: 'auto', label: 'Auto Detect' },
	{ value: '9', label: '512 B' },
	{ value: '12', label: '4 KiB' },
	{ value: '13', label: '8 KiB' },
	{ value: '14', label: '16 KiB' },
	{ value: '15', label: '32 KiB' },
	{ value: '16', label: '64 KiB' },
];

const RECORD_SIZE_OPTIONS = [
	{ value: String(convertSizeToBytes('512b')), label: '512 B' },
	{ value: String(convertSizeToBytes('4kib')), label: '4 KiB' },
	{ value: String(convertSizeToBytes('8kib')), label: '8 KiB' },
	{ value: String(convertSizeToBytes('16kib')), label: '16 KiB' },
	{ value: String(convertSizeToBytes('32kib')), label: '32 KiB' },
	{ value: String(convertSizeToBytes('64kib')), label: '64 KiB' },
	{ value: String(convertSizeToBytes('128kib')), label: '128 KiB' },
	{ value: String(convertSizeToBytes('256kib')), label: '256 KiB' },
	{ value: String(convertSizeToBytes('512kib')), label: '512 KiB' },
	{ value: String(convertSizeToBytes('1mib')), label: '1 MiB' },
];

// ── Pool config data model ──────────────────────
export interface PoolConfig {
	name: string;
	vdevs: VDevConfig[];
	sectorsize: string;
	recordsize: string;
	compression: string;
	dedup: string;
	autoexpand: string;
	autoreplace: string;
	autotrim: string;
	refreservationPercent: number;
	forceCreate: boolean;
}

interface PoolConfigStepProps {
	config: PoolConfig;
	onChange: (config: PoolConfig) => void;
	allDisks: VDevDisk[];
	/** Validation errors to display at the top. */
	errors?: string[];
}

export const PoolConfigStep: React.FC<PoolConfigStepProps> = ({
	config,
	onChange,
	allDisks,
	errors,
}) => {
	const [advancedOpen, setAdvancedOpen] = useState(false);

	const update = (partial: Partial<PoolConfig>) => {
		onChange({ ...config, ...partial });
	};

	return (
		<Form isHorizontal>
			{/* ── Pool Name ────────────────────────── */}
			<FormGroup fieldId="pool-name" label="Pool Name" isRequired>
				<TextInput
					id="pool-name"
					value={config.name}
					onChange={(_e, val) => update({ name: val })}
					placeholder="Pool Name"
					isRequired
				/>
				{errors &&
					errors.length > 0 &&
					errors.map((err, i) => (
						<FormHelperText key={i}>
							<HelperText>
								<HelperTextItem variant="error">{err}</HelperTextItem>
							</HelperText>
						</FormHelperText>
					))}
			</FormGroup>

			{/* ── Virtual Devices ─────────────────── */}
			<FormGroup fieldId="vdev-config" label="Virtual Devices">
				<VDevConfigurator
					vdevs={config.vdevs}
					allDisks={allDisks}
					onChange={(vdevs) => update({ vdevs })}
				/>
			</FormGroup>

			{/* ── Force Create toggle ────────────── */}
			{config.vdevs.length > 0 && (
				<FormGroup fieldId="force-create" label="Forcefully Create">
					<Switch
						id="force-create"
						isChecked={config.forceCreate}
						onChange={(_e, checked) => update({ forceCreate: checked })}
						label="Enabled"
					/>
				</FormGroup>
			)}

			{/* ── Sector Size ────────────────────── */}
			<FormGroup fieldId="sector-size" label="Sector Size">
				<FormSelect
					id="sector-size"
					value={config.sectorsize}
					onChange={(_e, val) => update({ sectorsize: val })}
				>
					{SECTOR_SIZE_OPTIONS.map((opt) => (
						<FormSelectOption key={opt.value} value={opt.value} label={opt.label} />
					))}
				</FormSelect>
			</FormGroup>

			{/* ── Record Size ────────────────────── */}
			<FormGroup fieldId="record-size" label="Record Size">
				<FormSelect
					id="record-size"
					value={config.recordsize}
					onChange={(_e, val) => update({ recordsize: val })}
				>
					{RECORD_SIZE_OPTIONS.map((opt) => (
						<FormSelectOption key={opt.value} value={opt.value} label={opt.label} />
					))}
				</FormSelect>
			</FormGroup>

			{/* ── LZ4 Compression toggle ─────────── */}
			<FormGroup fieldId="lz4-compression" label="LZ4 Compression">
				<Switch
					id="lz4-compression"
					isChecked={config.compression === 'lz4'}
					onChange={(_e, checked) =>
						update({ compression: checked ? 'lz4' : 'off' })
					}
					label="Enabled"
				/>
			</FormGroup>

			{/* ── Advanced Settings ───────────────── */}
			<ExpandableSection
				toggleText={advancedOpen ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
				isExpanded={advancedOpen}
				onToggle={(_e, expanded) => setAdvancedOpen(expanded)}
			>
				{/* Deduplication */}
				<FormGroup fieldId="deduplication" label="Deduplication">
					<Switch
						id="deduplication"
						isChecked={config.dedup === 'on'}
						onChange={(_e, checked) =>
							update({ dedup: checked ? 'on' : 'off' })
						}
						label="Enabled"
					/>
				</FormGroup>

				{/* Refreservation */}
				<FormGroup fieldId="refreservation" label="Refreservation (%)">
					<Flex
						alignItems={{ default: 'alignItemsCenter' }}
						spaceItems={{ default: 'spaceItemsSm' }}
					>
						<FlexItem grow={{ default: 'grow' }}>
							<input
								id="refreservation-range"
								type="range"
								min={0}
								max={20}
								step={1}
								value={config.refreservationPercent}
								onChange={(e) =>
									update({ refreservationPercent: Number(e.target.value) })
								}
								style={{ width: '100%' }}
							/>
						</FlexItem>
						<FlexItem>
							<NumberInput
								id="refreservation-number"
								value={config.refreservationPercent}
								min={0}
								max={20}
								onMinus={() =>
									update({
										refreservationPercent: Math.max(
											0,
											config.refreservationPercent - 1,
										),
									})
								}
								onPlus={() =>
									update({
										refreservationPercent: Math.min(
											20,
											config.refreservationPercent + 1,
										),
									})
								}
								onChange={(e: React.FormEvent<HTMLInputElement>) =>
									update({
										refreservationPercent: Math.min(
											20,
											Math.max(
												0,
												Number((e.target as HTMLInputElement).value) || 0,
											),
										),
									})
								}
								widthChars={3}
								unit="%"
							/>
						</FlexItem>
					</Flex>
				</FormGroup>

				{/* Auto-Expand */}
				<FormGroup fieldId="auto-expand" label="Auto-Expand Pool (When Larger Devices are Added)">
					<Switch
						id="auto-expand"
						isChecked={config.autoexpand === 'on'}
						onChange={(_e, checked) =>
							update({ autoexpand: checked ? 'on' : 'off' })
						}
						label="Enabled"
					/>
				</FormGroup>

				{/* Auto-Replace */}
				<FormGroup fieldId="auto-replace" label="Auto-Replace Devices">
					<Switch
						id="auto-replace"
						isChecked={config.autoreplace === 'on'}
						onChange={(_e, checked) =>
							update({ autoreplace: checked ? 'on' : 'off' })
						}
						label="Enabled"
					/>
				</FormGroup>

				{/* Auto-TRIM */}
				<FormGroup fieldId="auto-trim" label="Automatic TRIM">
					<Switch
						id="auto-trim"
						isChecked={config.autotrim === 'on'}
						onChange={(_e, checked) =>
							update({ autotrim: checked ? 'on' : 'off' })
						}
						label="Enabled"
					/>
				</FormGroup>
			</ExpandableSection>
		</Form>
	);
};

export default PoolConfigStep;
