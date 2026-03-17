/**
 * VDevRow — expandable VDev section within the pool expanded detail.
 *
 * Shows VDev name, status, type, error counts, and action dropdown.
 * Expands to show a nested disk table.
 *
 * Ported from VDevElement.vue.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
	Dropdown,
	DropdownList,
	DropdownItem,
	MenuToggle,
	MenuToggleElement,
	Flex,
	FlexItem,
	Button,
} from '@patternfly/react-core';
import {
	Table,
	Thead,
	Tbody,
	Tr,
	Th,
	Td,
} from '@patternfly/react-table';
import { EllipsisVIcon, AngleRightIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { formatStatus } from '../../utils/statusColors';
import { upperCaseWord } from '../../utils/helpers';
import { removeVDevFromPool } from '../../hooks/usePoolOperations';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DiskRow } from './DiskRow';

import type { ZPool, VDev } from '@45drives/houston-common-lib';

export interface VDevRowProps {
	pool: ZPool;
	poolIdx: number;
	vDev: VDev;
	vDevIdx: number;
}

export const VDevRow: React.FC<VDevRowProps> = ({ pool, poolIdx, vDev, vDevIdx }) => {
	const { canDestructive, refreshAll } = useZfsData();

	const [isExpanded, setIsExpanded] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);

	// Can this VDev be removed?
	const canRemove = useMemo(() => {
		return (
			canDestructive &&
			pool.vdevs.length !== 1 &&
			vDev !== pool.vdevs[0] &&
			!vDev.type.includes('raid')
		);
	}, [canDestructive, pool.vdevs, vDev]);

	const handleRemoveVDev = useCallback(async () => {
		setIsRemoving(true);
		try {
			const output: any = await removeVDevFromPool(vDev as any, pool);
			if (output == null || output?.error) {
				console.error('Remove VDev failed:', output?.error);
			}
			await refreshAll();
		} catch (err) {
			console.error(err);
		}
		setIsRemoving(false);
		setShowRemoveConfirm(false);
	}, [vDev, pool, refreshAll]);

	const dropdownItems = useMemo(() => {
		const items: React.ReactNode[] = [];

		if (canDestructive) {
			if (canRemove) {
				items.push(
					<DropdownItem
						key="remove"
						onClick={() => {
							setMenuOpen(false);
							setShowRemoveConfirm(true);
						}}
					>
						Remove Virtual Device
					</DropdownItem>
				);
			}
			items.push(
				<DropdownItem
					key="attach"
					onClick={() => {
						setMenuOpen(false);
						/* Attach disk modal handled by parent */
					}}
				>
					Attach Disk
				</DropdownItem>
			);
		} else {
			items.push(
				<DropdownItem key="attach" isDisabled description="Requires administrative privileges">
					Attach Disk
				</DropdownItem>
			);
		}

		return items;
	}, [canDestructive, canRemove]);

	const menuToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
		<MenuToggle
			ref={toggleRef}
			variant="plain"
			onClick={() => setMenuOpen((prev) => !prev)}
			isExpanded={menuOpen}
			aria-label="VDev actions"
		>
			<EllipsisVIcon />
		</MenuToggle>
	);

	return (
		<>
			{/* VDev Header Row */}
			<Flex
				alignItems={{ default: 'alignItemsCenter' }}
				onClick={() => setIsExpanded((prev) => !prev)}
				style={{ cursor: 'pointer', padding: '0.5rem', backgroundColor: 'var(--pf-t--global--background--color--secondary--default)' }}
			>
				<FlexItem style={{ width: '3rem', textAlign: 'center', flex: 'none' }}>
					<Button
						variant="plain"
						aria-expanded={isExpanded}
						aria-label="Toggle vdev details"
						onClick={(e) => {
							e.stopPropagation();
							setIsExpanded((prev) => !prev);
						}}
					>
						<AngleRightIcon
							style={{
								transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
								transition: 'transform 0.2s',
							}}
						/>
					</Button>
				</FlexItem>
				<FlexItem grow={{ default: 'grow' }}>{vDev.name}</FlexItem>
				<FlexItem grow={{ default: 'grow' }}>
					<span className={formatStatus(vDev.status ?? '')}><strong>{vDev.status ?? 'UNKNOWN'}</strong></span>
				</FlexItem>
				<FlexItem grow={{ default: 'grow' }}>
					{upperCaseWord(vDev.type)} Device
				</FlexItem>
				<FlexItem grow={{ default: 'grow' }}>
					{vDev.stats?.read_errors ?? 0} Read Errors
				</FlexItem>
				<FlexItem grow={{ default: 'grow' }}>
					{vDev.stats?.write_errors ?? 0} Write Errors
				</FlexItem>
				<FlexItem grow={{ default: 'grow' }}>
					{vDev.stats?.checksum_errors ?? 0} Checksum Errors
				</FlexItem>
				<FlexItem style={{ width: '3rem', textAlign: 'right', flex: 'none' }} onClick={(e) => e.stopPropagation()}>
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
				</FlexItem>
			</Flex>

			{/* VDev Expanded Content — Disk Table */}
			{isExpanded && (
				<Table variant="compact" aria-label={`Disks in ${vDev.name}`}>
					<Thead>
						<Tr>
							<Th width={20}>Disk</Th>
							<Th>State</Th>
							<Th>Type</Th>
							<Th>Temperature</Th>
							<Th>Capacity</Th>
							<Th width={20}>Message</Th>
							<Th screenReaderText="Actions" />
						</Tr>
					</Thead>
					<Tbody>
						{vDev.disks.map((disk: any, diskIdx: number) => (
							<DiskRow
								key={diskIdx}
								pool={pool}
								vDev={vDev}
								disk={disk}
								diskIdx={diskIdx}
							/>
						))}
					</Tbody>
				</Table>
			)}

			{/* Remove VDev Confirmation Modal */}
			<ConfirmationModal
				isOpen={showRemoveConfirm}
				onClose={() => setShowRemoveConfirm(false)}
				onConfirm={handleRemoveVDev}
				title={`Remove ${vDev.name}`}
				message={`Are you sure you want to remove virtual device "${vDev.name}" from pool "${pool.name}"?`}
				confirmText="Remove"
				variant="danger"
				isLoading={isRemoving}
				loadingText="Removing..."
			/>
		</>
	);
};

export default VDevRow;
