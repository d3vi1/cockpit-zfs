/**
 * FileSystemRow -- a single row in the file systems table.
 *
 * Renders dataset info columns and a PF Dropdown kebab menu with contextual
 * actions: Configure, Rename, Destroy, Mount/Unmount, Lock/Unlock,
 * Change Passphrase.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Tr, Td } from '@patternfly/react-table';
import {
	Dropdown,
	DropdownList,
	DropdownItem,
	MenuToggle,
	MenuToggleElement,
	Tooltip,
	Icon,
} from '@patternfly/react-core';
import {
	EllipsisVIcon,
	LockIcon,
	LockOpenIcon,
	BanIcon,
	CheckIcon,
} from '@patternfly/react-icons';

import type { ZPool, ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { convertBytesToSize } from '../../utils/formatters';
import { getValue, upperCaseWord, yesNoToBool } from '../../utils/helpers';

export interface FileSystemRowProps {
	dataset: ZFSFileSystemInfo;
	pools: ZPool[];
	canDestructive: boolean;
	isPoolDataset: boolean;
	onConfigure: (ds: ZFSFileSystemInfo) => void;
	onRename: (ds: ZFSFileSystemInfo) => void;
	onChangePassphrase: (ds: ZFSFileSystemInfo) => void;
	onLock: (ds: ZFSFileSystemInfo) => void;
	onUnlock: (ds: ZFSFileSystemInfo) => void;
	onDestroy: (ds: ZFSFileSystemInfo) => void;
	onUnmount: (ds: ZFSFileSystemInfo) => void;
	onMount: (ds: ZFSFileSystemInfo) => void;
}

/** Indentation level derived from path depth. */
function getNestingPad(name: string): string {
	const depth = name.split('/').length;
	return `${depth * 0.25}rem`;
}

/** Human-readable compression display. */
function getCompressionDisplay(dataset: ZFSFileSystemInfo): string {
	const comp = (dataset.properties as any).compression;
	if (comp === 'off' || comp === 'on') {
		return upperCaseWord(comp) || 'N/A';
	}
	return comp?.toUpperCase() || 'N/A';
}

/** Encrypted status icon. */
function EncryptionIcon({ dataset }: { dataset: ZFSFileSystemInfo }) {
	if (dataset.encrypted && dataset.key_loaded) {
		return (
			<Tooltip content="Encrypted &amp; Unlocked">
				<Icon status="success"><LockOpenIcon /></Icon>
			</Tooltip>
		);
	}
	if (dataset.encrypted && !dataset.key_loaded) {
		return (
			<Tooltip content="Encrypted &amp; Locked">
				<Icon status="warning"><LockIcon /></Icon>
			</Tooltip>
		);
	}
	return (
		<Tooltip content="Not Encrypted">
			<Icon status="custom"><BanIcon /></Icon>
		</Tooltip>
	);
}

/** Boolean icon for mounted / read-only columns. */
function BoolIcon({ value, trueLabel, falseLabel }: { value: boolean | undefined; trueLabel: string; falseLabel: string }) {
	if (value) {
		return (
			<Tooltip content={trueLabel}>
				<Icon status="success"><CheckIcon /></Icon>
			</Tooltip>
		);
	}
	return (
		<Tooltip content={falseLabel}>
			<Icon status="custom"><BanIcon /></Icon>
		</Tooltip>
	);
}

export function FileSystemRow({
	dataset,
	pools,
	canDestructive,
	isPoolDataset,
	onConfigure,
	onRename,
	onChangePassphrase,
	onLock,
	onUnlock,
	onDestroy,
	onUnmount,
	onMount,
}: FileSystemRowProps) {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const props = dataset.properties as any;
	const isMounted = yesNoToBool(props.mounted);
	const isReadOnly = props.isReadOnly;

	const dropdownItems = useMemo(() => {
		const items: React.ReactNode[] = [];
		const disabledTip = 'Requires administrative privileges';

		// Configure
		items.push(
			<DropdownItem
				key="configure"
				isDisabled={!canDestructive}
				description={!canDestructive ? disabledTip : undefined}
				onClick={() => onConfigure(dataset)}
			>
				Configure File System
			</DropdownItem>,
		);

		// Rename (not for pool-root datasets)
		if (!isPoolDataset) {
			items.push(
				<DropdownItem
					key="rename"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onRename(dataset)}
				>
					Rename File System
				</DropdownItem>,
			);
		}

		// Mount / Unmount
		if (isMounted) {
			items.push(
				<DropdownItem
					key="unmount"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onUnmount(dataset)}
				>
					Unmount File System
				</DropdownItem>,
			);
		} else if (!dataset.encrypted || (dataset.encrypted && dataset.key_loaded)) {
			items.push(
				<DropdownItem
					key="mount"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onMount(dataset)}
				>
					Mount File System
				</DropdownItem>,
			);
		}

		// Unlock (encrypted, not mounted, key not loaded)
		if (!isMounted && dataset.encrypted && !dataset.key_loaded) {
			items.push(
				<DropdownItem
					key="unlock"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onUnlock(dataset)}
				>
					Unlock File System
				</DropdownItem>,
			);
		}

		// Lock (encrypted, not mounted, key loaded)
		if (!isMounted && dataset.encrypted && dataset.key_loaded) {
			items.push(
				<DropdownItem
					key="lock"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onLock(dataset)}
				>
					Lock File System
				</DropdownItem>,
			);
		}

		// Change passphrase (encrypted + key loaded)
		if (dataset.encrypted && dataset.key_loaded) {
			items.push(
				<DropdownItem
					key="change-passphrase"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onChangePassphrase(dataset)}
				>
					Change Passphrase
				</DropdownItem>,
			);
		}

		// Destroy (not for pool-root datasets)
		if (!isPoolDataset) {
			items.push(
				<DropdownItem
					key="destroy"
					isDisabled={!canDestructive}
					description={!canDestructive ? disabledTip : undefined}
					onClick={() => onDestroy(dataset)}
					isDanger
				>
					Destroy File System
				</DropdownItem>,
			);
		}

		return items;
	}, [
		dataset,
		canDestructive,
		isPoolDataset,
		isMounted,
		onConfigure,
		onRename,
		onChangePassphrase,
		onLock,
		onUnlock,
		onDestroy,
		onUnmount,
		onMount,
	]);

	const onToggle = useCallback(() => {
		setIsDropdownOpen(prev => !prev);
	}, []);

	const onSelect = useCallback(() => {
		setIsDropdownOpen(false);
	}, []);

	return (
		<Tr>
			<Td
				dataLabel="Dataset"
				style={{ paddingLeft: getNestingPad(dataset.name) }}
			>
				{dataset.name}
			</Td>
			<Td dataLabel="Available">
				{convertBytesToSize(props.available) || 'N/A'}
			</Td>
			<Td dataLabel="Used">
				{props.usedByDataset || 'N/A'}
			</Td>
			<Td dataLabel="Used By Snapshots">
				{props.usedBySnapshots || 'N/A'}
			</Td>
			<Td dataLabel="Refres.">
				{props.usedbyRefreservation || 'N/A'}
			</Td>
			<Td dataLabel="Compression">
				{getCompressionDisplay(dataset)}
			</Td>
			<Td dataLabel="Dedup.">
				{getValue('dedup', props.deduplication) || 'N/A'}
			</Td>
			<Td dataLabel="Encrypted">
				<EncryptionIcon dataset={dataset} />
			</Td>
			<Td dataLabel="Mounted">
				<BoolIcon value={isMounted} trueLabel="Mounted" falseLabel="Not Mounted" />
			</Td>
			<Td dataLabel="Read Only">
				<BoolIcon value={isReadOnly} trueLabel="Read Only ON" falseLabel="Read Only OFF" />
			</Td>
			<Td isActionCell>
				<Dropdown
					isOpen={isDropdownOpen}
					onSelect={onSelect}
					onOpenChange={setIsDropdownOpen}
					toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
						<MenuToggle
							ref={toggleRef}
							aria-label="File system actions"
							variant="plain"
							onClick={onToggle}
							isExpanded={isDropdownOpen}
						>
							<EllipsisVIcon />
						</MenuToggle>
					)}
					popperProps={{ position: 'end' }}
				>
					<DropdownList>{dropdownItems}</DropdownList>
				</Dropdown>
			</Td>
		</Tr>
	);
}

export default FileSystemRow;
