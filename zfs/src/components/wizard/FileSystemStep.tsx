/**
 * FileSystemStep -- File system configuration step inside the Create Pool wizard.
 *
 * Lets the user optionally create a file system on the new pool. When enabled,
 * shows file system name, encryption (via EncryptionSection), inheritance
 * toggle, and detailed property overrides (compression, dedup, record size,
 * access time, case sensitivity, dnode size, extended attributes, quota,
 * read-only).
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React from 'react';
import {
	Form,
	FormGroup,
	TextInput,
	FormSelect,
	FormSelectOption,
	Switch,
	NumberInput,
	Flex,
	FlexItem,
	Alert,
	Checkbox,
	Content,
	ContentVariants,
} from '@patternfly/react-core';
import { EncryptionSection, type EncryptionConfig } from './EncryptionSection';
import { convertSizeToBytes } from '../../utils/formatters';
import { upperCaseWord, getValue } from '../../utils/helpers';

// ── Quota unit options ──────────────────────────
const QUOTA_UNIT_OPTIONS = [
	{ value: 'kib', label: 'KiB' },
	{ value: 'mib', label: 'MiB' },
	{ value: 'gib', label: 'GiB' },
	{ value: 'tib', label: 'TiB' },
];

// ── Compression options (pool-wizard context, shows inherited source) ──
function compressionOptions(poolCompression: string) {
	const inheritedLabel =
		poolCompression === 'lz4'
			? poolCompression.toUpperCase()
			: upperCaseWord(poolCompression);

	return [
		{ value: 'inherited', label: `Inherited (${inheritedLabel})` },
		{ value: 'on', label: 'On' },
		{ value: 'off', label: 'Off' },
		{ value: 'gzip', label: 'GZIP' },
		{ value: 'lz4', label: 'LZ4' },
		{ value: 'lzjb', label: 'LZJB' },
		{ value: 'zle', label: 'ZLE' },
	];
}

function dedupOptions(poolDedup: string) {
	return [
		{ value: 'inherited', label: `Inherited (${upperCaseWord(poolDedup)})` },
		{ value: 'on', label: 'On' },
		{ value: 'off', label: 'Off' },
		{ value: 'edonr,verify', label: 'Edon-R + Verify' },
		{ value: 'sha256', label: 'SHA-256' },
		{ value: 'sha256,verify', label: 'SHA-256 + Verify' },
		{ value: 'sha512', label: 'SHA-512' },
		{ value: 'sha512,verify', label: 'SHA-512 + Verify' },
		{ value: 'skein', label: 'Skein' },
		{ value: 'skein,verify', label: 'Skein + Verify' },
		{ value: 'verify', label: 'Verify' },
	];
}

function recordSizeOptions(poolRecordsize: string) {
	const inheritedLabel = getValue('record', poolRecordsize) ?? poolRecordsize;
	return [
		{ value: 'inherited', label: `Inherited (${inheritedLabel})` },
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
}

const ACCESS_TIME_OPTIONS = [
	{ value: 'inherited', label: 'Default (On)' },
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
];

const CASE_SENSITIVITY_OPTIONS = [
	{ value: 'inherited', label: 'Default (Sensitive)' },
	{ value: 'insensitive', label: 'Insensitive' },
	{ value: 'mixed', label: 'Mixed' },
	{ value: 'sensitive', label: 'Sensitive' },
];

const DNODE_SIZE_OPTIONS = [
	{ value: 'inherited', label: 'Default (Legacy)' },
	{ value: '1k', label: '1 KiB' },
	{ value: '2k', label: '2 KiB' },
	{ value: '4k', label: '4 KiB' },
	{ value: '8k', label: '8 KiB' },
	{ value: '16k', label: '16 KiB' },
	{ value: 'auto', label: 'Auto' },
	{ value: 'legacy', label: 'Legacy' },
];

const EXTENDED_ATTRS_OPTIONS = [
	{ value: 'inherited', label: 'Default (System Attribute)' },
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
	{ value: 'system attribute', label: 'System Attribute' },
];

// ── File system config data model ───────────────
export interface FileSystemConfig {
	createFileSystem: boolean;
	name: string;
	encrypted: boolean;
	encryption: EncryptionConfig;
	inherit: boolean;
	compression: string;
	deduplication: string;
	recordSize: string;
	accessTime: string;
	caseSensitivity: string;
	dNodeSize: string;
	extendedAttributes: string;
	quotaRaw: number;
	quotaUnit: string;
	isReadOnly: boolean;
}

interface FileSystemStepProps {
	config: FileSystemConfig;
	onChange: (config: FileSystemConfig) => void;
	/** Pool-level values for "inherited" labels. */
	poolCompression: string;
	poolDedup: string;
	poolRecordsize: string;
	poolName: string;
	/** Validation errors to display. */
	errors?: string[];
}

export const FileSystemStep: React.FC<FileSystemStepProps> = ({
	config,
	onChange,
	poolCompression,
	poolDedup,
	poolRecordsize,
	poolName,
	errors,
}) => {
	const update = (partial: Partial<FileSystemConfig>) => {
		onChange({ ...config, ...partial });
	};

	return (
		<Form isHorizontal>
			{/* Create a File System? */}
			<FormGroup fieldId="create-fs-toggle">
				<Checkbox
					id="create-fs-toggle"
					isChecked={config.createFileSystem}
					onChange={(_e, checked) => update({ createFileSystem: checked })}
					label="Create a File System"
					description="Uncheck to leave the pool without a file system."
				/>
			</FormGroup>

			{config.createFileSystem && (
				<>
					{/* Parent FS (read-only, always the pool name) */}
					<FormGroup fieldId="fs-parent" label="Parent File System">
						<TextInput
							id="fs-parent"
							value={poolName}
							isDisabled
							readOnlyVariant="plain"
						/>
					</FormGroup>

					{/* FS Name */}
					<FormGroup fieldId="fs-name" label="Name" isRequired>
						<TextInput
							id="fs-name"
							value={config.name}
							onChange={(_e, val) => update({ name: val })}
							placeholder="File System Name"
							isRequired
						/>
					</FormGroup>

					{/* Encryption */}
					<EncryptionSection
						config={config.encryption}
						onChange={(enc) => update({ encryption: enc })}
					/>

					{/* Inherit toggle */}
					<FormGroup fieldId="fs-inherit" label="Inherit Parent/Default Settings">
						<Switch
							id="fs-inherit"
							isChecked={config.inherit}
							onChange={(_e, checked) => update({ inherit: checked })}
							label="Enabled"
						/>
					</FormGroup>

					{/* Custom properties (only when not inheriting) */}
					{!config.inherit && (
						<>
							{/* Compression */}
							<FormGroup fieldId="fs-compression" label="Compression">
								<FormSelect
									id="fs-compression"
									value={config.compression}
									onChange={(_e, val) => update({ compression: val })}
								>
									{compressionOptions(poolCompression).map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Deduplication */}
							<FormGroup fieldId="fs-dedup" label="Deduplication">
								<FormSelect
									id="fs-dedup"
									value={config.deduplication}
									onChange={(_e, val) => update({ deduplication: val })}
								>
									{dedupOptions(poolDedup).map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Record Size */}
							<FormGroup fieldId="fs-record-size" label="Record Size">
								<FormSelect
									id="fs-record-size"
									value={config.recordSize}
									onChange={(_e, val) => update({ recordSize: val })}
								>
									{recordSizeOptions(poolRecordsize).map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Access Time */}
							<FormGroup fieldId="fs-access-time" label="Access Time">
								<FormSelect
									id="fs-access-time"
									value={config.accessTime}
									onChange={(_e, val) => update({ accessTime: val })}
								>
									{ACCESS_TIME_OPTIONS.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Case Sensitivity */}
							<FormGroup fieldId="fs-case-sensitivity" label="Case Sensitivity">
								<FormSelect
									id="fs-case-sensitivity"
									value={config.caseSensitivity}
									onChange={(_e, val) => update({ caseSensitivity: val })}
								>
									{CASE_SENSITIVITY_OPTIONS.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* DNode Size */}
							<FormGroup fieldId="fs-dnode-size" label="DNode Size">
								<FormSelect
									id="fs-dnode-size"
									value={config.dNodeSize}
									onChange={(_e, val) => update({ dNodeSize: val })}
								>
									{DNODE_SIZE_OPTIONS.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>

							{/* Extended Attributes */}
							<FormGroup fieldId="fs-xattr" label="Extended Attributes">
								<FormSelect
									id="fs-xattr"
									value={config.extendedAttributes}
									onChange={(_e, val) => update({ extendedAttributes: val })}
								>
									{EXTENDED_ATTRS_OPTIONS.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FormGroup>
						</>
					)}

					{/* Quota */}
					<FormGroup fieldId="fs-quota" label="Quota">
						<Flex
							alignItems={{ default: 'alignItemsCenter' }}
							spaceItems={{ default: 'spaceItemsSm' }}
						>
							<FlexItem grow={{ default: 'grow' }}>
								<input
									id="fs-quota-range"
									type="range"
									min={0}
									max={1000}
									step={1}
									value={config.quotaRaw}
									onChange={(e) =>
										update({ quotaRaw: Number(e.target.value) })
									}
									style={{ width: '100%' }}
								/>
							</FlexItem>
							<FlexItem>
								<NumberInput
									id="fs-quota-number"
									value={config.quotaRaw}
									min={0}
									max={1000}
									onMinus={() =>
										update({ quotaRaw: Math.max(0, config.quotaRaw - 1) })
									}
									onPlus={() =>
										update({
											quotaRaw: Math.min(1000, config.quotaRaw + 1),
										})
									}
									onChange={(e: React.FormEvent<HTMLInputElement>) =>
										update({
											quotaRaw: Math.min(
												1000,
												Math.max(
													0,
													Number((e.target as HTMLInputElement).value) || 0,
												),
											),
										})
									}
									widthChars={4}
								/>
							</FlexItem>
							<FlexItem>
								<FormSelect
									id="fs-quota-unit"
									value={config.quotaUnit}
									onChange={(_e, val) => update({ quotaUnit: val })}
								>
									{QUOTA_UNIT_OPTIONS.map((opt) => (
										<FormSelectOption
											key={opt.value}
											value={opt.value}
											label={opt.label}
										/>
									))}
								</FormSelect>
							</FlexItem>
						</Flex>
					</FormGroup>

					{/* Read Only */}
					<FormGroup fieldId="fs-read-only" label="Read Only">
						<Switch
							id="fs-read-only"
							isChecked={config.isReadOnly}
							onChange={(_e, checked) => update({ isReadOnly: checked })}
							label="Enabled"
						/>
					</FormGroup>
				</>
			)}

			{/* Validation errors */}
			{errors &&
				errors.length > 0 &&
				errors.map((err, i) => (
					<Alert key={i} variant="danger" isInline isPlain title={err} />
				))}
		</Form>
	);
};

export default FileSystemStep;
