/**
 * FileSystemConfigModal -- modal for editing all filesystem properties.
 *
 * Ported from FileSystemConfigModal.vue.
 * Uses PF Modal, Form, FormGroup, FormSelect, TextInput, Switch.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
	Modal,
	ModalVariant,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Form,
	FormGroup,
	FormSection,
	TextInput,
	FormSelect,
	FormSelectOption,
	Switch,
	Button,
	Spinner,
	Alert,
	Split,
	SplitItem,
	Grid,
	GridItem,
	Content,
	Slider,
} from '@patternfly/react-core';

import type { ZPool, ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import type { FileSystemEditConfig } from '../../types/index';
import {
	convertBytesToSize,
	convertSizeToBytes,
	getSizeNumberFromString,
	getSizeUnitFromString,
	getQuotaRefreservUnit,
} from '../../utils/formatters';
import { upperCaseWord, onOffToBool, isBoolOnOff } from '../../utils/helpers';
import { configureDataset } from '../../hooks/useDatasetOperations';

export interface FileSystemConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
	filesystem: ZFSFileSystemInfo;
	pools: ZPool[];
	onSaved: () => Promise<void>;
}

const compressionOptions = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
	{ value: 'gzip', label: 'GZIP' },
	{ value: 'lz4', label: 'LZ4' },
	{ value: 'lzjb', label: 'LZJB' },
	{ value: 'zle', label: 'ZLE' },
];

const dedupOptions = [
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

const checksumOptions = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
	{ value: 'edonr', label: 'Edon-R' },
	{ value: 'fletcher2', label: 'Fletcher2' },
	{ value: 'fletcher4', label: 'Fletcher4' },
	{ value: 'noparity', label: 'No Parity' },
	{ value: 'sha256', label: 'SHA-256' },
	{ value: 'sha512', label: 'SHA-512' },
	{ value: 'skein', label: 'Skein' },
];

const recordSizeOptions = [
	{ value: '512', label: '512 B' },
	{ value: '4K', label: '4 KiB' },
	{ value: '8K', label: '8 KiB' },
	{ value: '16K', label: '16 KiB' },
	{ value: '32K', label: '32 KiB' },
	{ value: '64K', label: '64 KiB' },
	{ value: '128K', label: '128 KiB' },
	{ value: '256K', label: '256 KiB' },
	{ value: '512K', label: '512 KiB' },
	{ value: '1M', label: '1 MiB' },
];

const dnodeSizeOptions = [
	{ value: '1k', label: '1 KiB' },
	{ value: '2k', label: '2 KiB' },
	{ value: '4k', label: '4 KiB' },
	{ value: '8k', label: '8 KiB' },
	{ value: '16k', label: '16 KiB' },
	{ value: 'auto', label: 'Auto' },
	{ value: 'legacy', label: 'Legacy' },
];

const canMountOptions = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
	{ value: 'noauto', label: 'No Auto' },
];

const accessTimeOptions = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
];

const aclInheritOptions = [
	{ value: 'discard', label: 'Discard' },
	{ value: 'noallow', label: 'No Allow' },
	{ value: 'restricted', label: 'Restricted' },
	{ value: 'passthrough', label: 'Passthrough' },
	{ value: 'passthrough-x', label: 'Passthrough-X' },
];

const aclTypeOptions = [
	{ value: 'off', label: 'Off/No ACL' },
	{ value: 'posix', label: 'POSIX ACL' },
];

const xattrOptions = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
	{ value: 'sa', label: 'System Attribute' },
];

const sizeUnitOptions = [
	{ value: 'kib', label: 'KiB' },
	{ value: 'mib', label: 'MiB' },
	{ value: 'gib', label: 'GiB' },
	{ value: 'tib', label: 'TiB' },
];

export function FileSystemConfigModal({
	isOpen,
	onClose,
	filesystem,
	pools,
	onSaved,
}: FileSystemConfigModalProps) {
	const fsProps = filesystem.properties as any;

	// ── Editable state ──
	const [isReadOnly, setIsReadOnly] = useState<boolean>(
		onOffToBool(fsProps.readOnly) ?? false,
	);
	const [mountpoint, setMountpoint] = useState(filesystem.mountpoint || '');
	const [canMount, setCanMount] = useState(fsProps.canMount || 'on');
	const [compression, setCompression] = useState(fsProps.compression || 'off');
	const [deduplication, setDeduplication] = useState(fsProps.deduplication || 'off');
	const [accessTime, setAccessTime] = useState(fsProps.accessTime || 'on');
	const [recordSize, setRecordSize] = useState(fsProps.recordSize || '128K');
	const [checksum, setChecksum] = useState(fsProps.checksum || 'on');
	const [dNodeSize, setDNodeSize] = useState(fsProps.dNodeSize || 'legacy');
	const [extendedAttributes, setExtendedAttributes] = useState(fsProps.extendedAttributes || 'on');
	const [aclInheritance, setAclInheritance] = useState(fsProps.aclInheritance || 'restricted');
	const [aclType, setAclType] = useState(fsProps.aclType || 'off');

	// Quota
	const initQuotaRaw = useMemo(
		() => getSizeNumberFromString(convertBytesToSize(fsProps.quota?.raw ?? 0)),
		[fsProps.quota],
	);
	const initQuotaUnit = useMemo(
		() => {
			try {
				return getSizeUnitFromString(getQuotaRefreservUnit(fsProps.quota?.raw ?? 0));
			} catch {
				return 'gib';
			}
		},
		[fsProps.quota],
	);
	const [quotaRaw, setQuotaRaw] = useState<number>(initQuotaRaw || 0);
	const [quotaUnit, setQuotaUnit] = useState(initQuotaUnit || 'gib');

	// Refreservation
	const initRefresRaw = useMemo(
		() => getSizeNumberFromString(convertBytesToSize(fsProps.refreservation?.raw ?? 0)),
		[fsProps.refreservation],
	);
	const initRefresUnit = useMemo(
		() => {
			try {
				return getSizeUnitFromString(getQuotaRefreservUnit(fsProps.refreservation?.raw ?? 0));
			} catch {
				return 'gib';
			}
		},
		[fsProps.refreservation],
	);
	const [refreservationRaw, setRefreservationRaw] = useState<number>(initRefresRaw || 0);
	const [refreservationUnit, setRefreservationUnit] = useState(initRefresUnit || 'gib');

	const [saving, setSaving] = useState(false);
	const [quotaFeedback, setQuotaFeedback] = useState('');
	const [refreservationFeedback, setRefreservationFeedback] = useState('');

	// ── Size validation ──
	const checkSizes = useCallback((): boolean => {
		let result = true;
		setQuotaFeedback('');
		setRefreservationFeedback('');

		const parentPool = pools.find(p => p.name === filesystem.pool);
		if (!parentPool) {
			console.error('Pool not found:', filesystem.pool);
			return false;
		}

		if (quotaRaw > 0) {
			try {
				if (convertSizeToBytes(`${quotaRaw}${quotaUnit}`) > convertSizeToBytes(parentPool.properties.free)) {
					result = false;
					setQuotaFeedback('Quota cannot be greater than available space in pool.');
				}
			} catch {
				// ignore parse errors
			}
		}

		if (refreservationRaw > 0) {
			try {
				if (convertSizeToBytes(`${refreservationRaw}${refreservationUnit}`) > convertSizeToBytes(parentPool.properties.free)) {
					result = false;
					setRefreservationFeedback('Refreservation cannot be greater than available space in pool.');
				}
			} catch {
				// ignore parse errors
			}
		}

		return result;
	}, [quotaRaw, quotaUnit, refreservationRaw, refreservationUnit, pools, filesystem.pool]);

	// ── Build changes ──
	const buildChanges = useCallback((): FileSystemEditConfig => {
		const changes: FileSystemEditConfig = {
			name: filesystem.name,
			guid: fsProps.guid,
			casesensitivity: fsProps.caseSensitivity,
		};

		if (isReadOnly !== (onOffToBool(fsProps.readOnly) ?? false)) {
			changes.readonly = isBoolOnOff(isReadOnly);
		}
		if (mountpoint !== filesystem.mountpoint) {
			changes.mountpoint = mountpoint;
		}
		if (canMount !== fsProps.canMount) {
			changes.canmount = canMount;
		}
		if (recordSize !== fsProps.recordSize) {
			changes.record = recordSize;
		}
		if (aclInheritance !== fsProps.aclInheritance) {
			changes.aclinherit = aclInheritance;
		}
		if (aclType !== fsProps.aclType) {
			changes.acltype = aclType;
		}
		if (accessTime !== fsProps.accessTime) {
			changes.atime = accessTime;
		}
		if (deduplication !== fsProps.deduplication) {
			changes.dedup = deduplication;
		}
		if (compression !== fsProps.compression) {
			changes.compression = compression;
		}
		if (checksum !== fsProps.checksum) {
			changes.checksum = checksum;
		}
		if (dNodeSize !== fsProps.dNodeSize) {
			changes.dnodesize = dNodeSize;
		}
		if (extendedAttributes !== fsProps.extendedAttributes) {
			changes.xattr = extendedAttributes;
		}

		// Quota
		if (quotaRaw > 0) {
			const newQuotaBytes = convertSizeToBytes(`${quotaRaw}${quotaUnit}`);
			if (newQuotaBytes !== fsProps.quota?.raw) {
				changes.quota = newQuotaBytes;
			}
		}

		// Refreservation
		if (refreservationRaw > 0) {
			const newRefresBytes = convertSizeToBytes(`${refreservationRaw}${refreservationUnit}`);
			if (newRefresBytes !== fsProps.refreservation?.raw) {
				changes.refreservation = newRefresBytes;
			}
		}

		return changes;
	}, [
		filesystem, fsProps, isReadOnly, mountpoint, canMount, compression,
		deduplication, accessTime, recordSize, checksum, dNodeSize,
		extendedAttributes, aclInheritance, aclType, quotaRaw, quotaUnit,
		refreservationRaw, refreservationUnit,
	]);

	// ── Save ──
	const handleSave = useCallback(async () => {
		if (!checkSizes()) return;

		setSaving(true);
		try {
			const changes = buildChanges();
			const output: any = await configureDataset(changes);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				console.error('Configure failed:', errorMessage);
			} else {
				await onSaved();
			}
		} catch (error) {
			console.error(error);
		} finally {
			setSaving(false);
		}
	}, [checkSizes, buildChanges, onSaved]);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="fs-config-modal-title"
		>
			<ModalHeader title="Configure File System" />

			<ModalBody>
				<Form isHorizontal>
					{/* Read-only info header */}
					<Grid hasGutter>
						<GridItem span={6}>
							<FormGroup label="File System Name" fieldId="fs-config-name">
								<Content component="p">{filesystem.name}</Content>
							</FormGroup>
						</GridItem>
						<GridItem span={6}>
							<FormGroup label="GUID" fieldId="fs-config-guid">
								<Content component="p">{fsProps.guid}</Content>
							</FormGroup>
						</GridItem>
						<GridItem span={6}>
							<FormGroup label="Case Sensitivity" fieldId="fs-config-case">
								<Content component="p">{upperCaseWord(fsProps.caseSensitivity || 'sensitive')}</Content>
							</FormGroup>
						</GridItem>
						<GridItem span={6}>
							<FormGroup label="Read Only" fieldId="fs-config-readonly">
								<Switch
									id="fs-config-readonly"
									isChecked={isReadOnly}
									onChange={(_event, checked) => setIsReadOnly(checked)}
									aria-label="Read Only"
								/>
							</FormGroup>
						</GridItem>
					</Grid>

					{/* Mountpoint */}
					<FormGroup label="Mountpoint" fieldId="fs-config-mountpoint">
						<TextInput
							id="fs-config-mountpoint"
							value={mountpoint}
							onChange={(_event, val) => setMountpoint(val)}
							placeholder="Mountpoint"
						/>
					</FormGroup>

					{/* Can Mount */}
					<FormGroup label="Can Mount" fieldId="fs-config-canmount">
						<FormSelect
							id="fs-config-canmount"
							value={canMount}
							onChange={(_event, val) => setCanMount(val)}
						>
							{canMountOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Quota */}
					<FormSection title="Quota">
						<Split hasGutter>
							<SplitItem isFilled>
								<TextInput
									id="fs-config-quota-num"
									type="number"
									value={quotaRaw}
									onChange={(_event, val) => setQuotaRaw(Number(val))}
									min={0}
									max={1000}
								/>
							</SplitItem>
							<SplitItem>
								<FormSelect
									id="fs-config-quota-unit"
									value={quotaUnit}
									onChange={(_event, val) => setQuotaUnit(val)}
								>
									{sizeUnitOptions.map(o => (
										<FormSelectOption key={o.value} value={o.value} label={o.label} />
									))}
								</FormSelect>
							</SplitItem>
						</Split>
						{quotaRaw > 0 && (
							<Content component="small">
								Used Space: {convertBytesToSize(fsProps.used)}
							</Content>
						)}
						{!quotaRaw && (
							<Content component="small">There is no quota currently set.</Content>
						)}
					</FormSection>

					{/* Record Size */}
					<FormGroup label="Record Size" fieldId="fs-config-recordsize">
						<FormSelect
							id="fs-config-recordsize"
							value={recordSize}
							onChange={(_event, val) => setRecordSize(val)}
						>
							{recordSizeOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Refreservation */}
					<FormSection title="Refreservation">
						<Split hasGutter>
							<SplitItem isFilled>
								<TextInput
									id="fs-config-refreservation-num"
									type="number"
									value={refreservationRaw}
									onChange={(_event, val) => setRefreservationRaw(Number(val))}
									min={0}
									max={1000}
								/>
							</SplitItem>
							<SplitItem>
								<FormSelect
									id="fs-config-refreservation-unit"
									value={refreservationUnit}
									onChange={(_event, val) => setRefreservationUnit(val)}
								>
									{sizeUnitOptions.map(o => (
										<FormSelectOption key={o.value} value={o.value} label={o.label} />
									))}
								</FormSelect>
							</SplitItem>
						</Split>
						{refreservationRaw > 0 && (
							<Content component="small">
								Available Space: {convertBytesToSize(fsProps.available)}
							</Content>
						)}
						{!refreservationRaw && (
							<Content component="small">There is no refreservation currently set.</Content>
						)}
					</FormSection>

					{/* ACL Inheritance */}
					<FormGroup label="ACL Inheritance" fieldId="fs-config-aclinherit">
						<FormSelect
							id="fs-config-aclinherit"
							value={aclInheritance}
							onChange={(_event, val) => setAclInheritance(val)}
						>
							{aclInheritOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* ACL Type */}
					<FormGroup label="ACL Type" fieldId="fs-config-acltype">
						<FormSelect
							id="fs-config-acltype"
							value={aclType}
							onChange={(_event, val) => setAclType(val)}
						>
							{aclTypeOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Access Time */}
					<FormGroup label="Access Time" fieldId="fs-config-atime">
						<FormSelect
							id="fs-config-atime"
							value={accessTime}
							onChange={(_event, val) => setAccessTime(val)}
						>
							{accessTimeOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Deduplication */}
					<FormGroup label="Deduplication" fieldId="fs-config-dedup">
						<FormSelect
							id="fs-config-dedup"
							value={deduplication}
							onChange={(_event, val) => setDeduplication(val)}
						>
							{dedupOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Compression */}
					<FormGroup label="Compression" fieldId="fs-config-compression">
						<FormSelect
							id="fs-config-compression"
							value={compression}
							onChange={(_event, val) => setCompression(val)}
						>
							{compressionOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Checksum */}
					<FormGroup label="Checksum" fieldId="fs-config-checksum">
						<FormSelect
							id="fs-config-checksum"
							value={checksum}
							onChange={(_event, val) => setChecksum(val)}
						>
							{checksumOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* DNode Size */}
					<FormGroup label="DNode Size" fieldId="fs-config-dnodesize">
						<FormSelect
							id="fs-config-dnodesize"
							value={dNodeSize}
							onChange={(_event, val) => setDNodeSize(val)}
						>
							{dnodeSizeOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Extended Attributes */}
					<FormGroup label="Extended Attributes" fieldId="fs-config-xattr">
						<FormSelect
							id="fs-config-xattr"
							value={extendedAttributes}
							onChange={(_event, val) => setExtendedAttributes(val)}
						>
							{xattrOptions.map(o => (
								<FormSelectOption key={o.value} value={o.value} label={o.label} />
							))}
						</FormSelect>
					</FormGroup>

					{/* Encryption (read-only) */}
					{filesystem.encrypted && (
						<FormGroup label="Encryption" fieldId="fs-config-encryption">
							<Content component="p">
								{(fsProps.encryption || '').toUpperCase()}
							</Content>
						</FormGroup>
					)}
				</Form>

				{/* Validation alerts */}
				{quotaFeedback && (
					<Alert variant="danger" isInline isPlain title={quotaFeedback} />
				)}
				{refreservationFeedback && (
					<Alert variant="danger" isInline isPlain title={refreservationFeedback} />
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant="primary"
					onClick={handleSave}
					isDisabled={saving}
					isLoading={saving}
					spinnerAriaValueText={saving ? 'Saving' : undefined}
				>
					{saving ? 'Saving...' : 'Configure'}
				</Button>
				<Button variant="link" onClick={onClose} isDisabled={saving}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
}

export default FileSystemConfigModal;
