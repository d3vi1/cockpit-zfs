/**
 * ImportPoolModal — modal for importing an exported or destroyed pool.
 *
 * Shows available importable pools in a selectable list, with options
 * for: show destroyed pools, rename, alt root, disk identifier,
 * force import, recovery mode, ignore missing log, mount filesystems,
 * read only.
 *
 * Ported from ImportPool.vue.
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
	TextInput,
	Switch,
	Alert,
	Spinner,
	Flex,
	FlexItem,
	Content,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { importPool } from '../../hooks/usePoolOperations';
import { loadImportablePools, loadImportableDestroyedPools } from '../../data/loadImportables';

import type { ImportablePoolData, ImportedPool } from '../../types/index';

export interface ImportPoolModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const defaultImportedPool: ImportedPool = {
	name: '',
	poolGUID: '',
	altRoot: '',
	renamePool: false,
	newPoolName: '',
	identifier: 'name',
	forceImport: false,
	recoveryMode: false,
	ignoreMissingLog: false,
	mountFileSystems: true,
	readOnly: false,
	isDestroyed: false,
	errors: [],
};

export const ImportPoolModal: React.FC<ImportPoolModalProps> = ({ isOpen, onClose }) => {
	const { refreshAll } = useZfsData();

	const [showDeletedPools, setShowDeletedPools] = useState(false);
	const [importedPool, setImportedPool] = useState<ImportedPool>({ ...defaultImportedPool });
	const [importing, setImporting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [nameFeedback, setNameFeedback] = useState('');

	const [importablePools, setImportablePools] = useState<ImportablePoolData[]>([]);
	const [importableDestroyedPools, setImportableDestroyedPools] = useState<ImportablePoolData[]>([]);

	// Load importable pools
	const loadImports = useCallback(async () => {
		setLoading(true);
		try {
			const pools = await loadImportablePools();
			setImportablePools(pools);
		} catch (err) {
			console.error('Failed to load importable pools:', err);
		}
		setLoading(false);
	}, []);

	const loadDestroyedImports = useCallback(async () => {
		setLoading(true);
		try {
			const pools = await loadImportableDestroyedPools();
			// Filter out pools that appear in the importable list
			const filtered = pools.filter(
				(dp) => !importablePools.some((ip) => dp.guid === ip.guid)
			);
			setImportableDestroyedPools(filtered);
		} catch (err) {
			console.error('Failed to load destroyed pools:', err);
		}
		setLoading(false);
	}, [importablePools]);

	useEffect(() => {
		if (isOpen) {
			loadImports();
			setImportedPool({ ...defaultImportedPool });
			setNameFeedback('');
		}
	}, [isOpen, loadImports]);

	useEffect(() => {
		if (showDeletedPools) {
			loadDestroyedImports();
		}
	}, [showDeletedPools, loadDestroyedImports]);

	// Displayed pool list
	const displayedPools = useMemo(() => {
		return showDeletedPools ? importableDestroyedPools : importablePools;
	}, [showDeletedPools, importablePools, importableDestroyedPools]);

	// Select a pool from the list
	const handleSelectPool = useCallback((pool: ImportablePoolData) => {
		setImportedPool((prev) => ({
			...prev,
			poolGUID: pool.guid,
			name: pool.name,
			errors: pool.errors ?? [],
		}));
	}, []);

	// Update a field
	const updateField = useCallback(<K extends keyof ImportedPool>(key: K, value: ImportedPool[K]) => {
		setImportedPool((prev) => ({ ...prev, [key]: value }));
	}, []);

	// Name validation
	const nameCheck = useCallback((): boolean => {
		setNameFeedback('');
		if (!importedPool.renamePool) return true;

		const name = importedPool.newPoolName ?? '';
		if (name === '') {
			setNameFeedback('Name cannot be empty.');
			return false;
		}
		if (/^[0-9]/.test(name)) {
			setNameFeedback('Name cannot begin with numbers.');
			return false;
		}
		if (/^[.]/.test(name)) {
			setNameFeedback('Name cannot begin with a period (.).');
			return false;
		}
		if (/^[_]/.test(name)) {
			setNameFeedback('Name cannot begin with an underscore (_).');
			return false;
		}
		if (/^[-]/.test(name)) {
			setNameFeedback('Name cannot begin with a hyphen (-).');
			return false;
		}
		if (/^[:]/.test(name)) {
			setNameFeedback('Name cannot begin with a colon (:).');
			return false;
		}
		if (/^[ ]/.test(name)) {
			setNameFeedback('Name cannot begin with whitespace.');
			return false;
		}
		if (/[ ]$/.test(name)) {
			setNameFeedback('Name cannot end with whitespace.');
			return false;
		}
		if (/^c[0-9]|^log|^mirror|^raidz|^raidz1|^raidz2|^raidz3|^spare/.test(name)) {
			setNameFeedback('Name cannot begin with a reserved name.');
			return false;
		}
		if (!/^[a-zA-Z0-9_.:-]*$/.test(name)) {
			setNameFeedback('Name contains invalid characters.');
			return false;
		}
		if (importablePools.some((p) => p.name === name)) {
			setNameFeedback('A pool with that name already exists.');
			return false;
		}
		return true;
	}, [importedPool, importablePools]);

	// Import handler
	const handleImport = useCallback(async () => {
		if (!nameCheck()) return;

		const isDestroyed = importableDestroyedPools.some(
			(p) => p.guid === importedPool.poolGUID
		);

		setImporting(true);
		try {
			const output: any = await importPool({
				...importedPool,
				isDestroyed,
			});

			if (output == null || output?.error) {
				console.error('Import failed:', output?.error);
				setNameFeedback(output?.error ?? 'Import failed');
			} else {
				onClose();
			}
			await refreshAll();
		} catch (err: any) {
			console.error('Import failed:', err);
			setNameFeedback(err?.message ?? 'Import failed');
		}
		setImporting(false);
	}, [importedPool, importableDestroyedPools, nameCheck, refreshAll, onClose]);

	return (
		<Modal
			variant={ModalVariant.large}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="import-pool-modal-title"
		>
			<ModalHeader title="Import Pool" />

			<ModalBody>
				<Form isHorizontal={false}>
					{/* Pool Selection */}
					<FormGroup label="Select Pool" fieldId="import-available-pool-list">
						<div
							style={{
								border: '1px solid var(--pf-t--global--border--color--default)',
								borderRadius: 'var(--pf-t--global--border--radius--small)',
								overflowY: 'auto',
								height: '14rem',
								padding: '0.25rem',
							}}
						>
							{loading ? (
								<Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ padding: '2rem' }}>
									<Spinner aria-label="Loading pools" />
								</Flex>
							) : displayedPools.length > 0 ? (
								displayedPools.map((pool, idx) => (
									<div
										key={pool.guid}
										onClick={() => handleSelectPool(pool)}
										style={{
											padding: '0.5rem',
											marginBottom: '0.25rem',
											border: '1px solid var(--pf-t--global--border--color--default)',
											borderRadius: 'var(--pf-t--global--border--radius--small)',
											cursor: 'pointer',
											backgroundColor:
												pool.guid === importedPool.poolGUID
													? 'var(--pf-t--global--color--status--success--default)'
													: undefined,
											color:
												pool.guid === importedPool.poolGUID
													? '#fff'
													: undefined,
										}}
									>
										<Flex alignItems={{ default: 'alignItemsCenter' }}>
											<FlexItem grow={{ default: 'grow' }}>
												<Content component="p">
													<strong>Name:</strong> {pool.name}
												</Content>
												<Content component="p">
													<strong>GUID:</strong> {pool.guid}
												</Content>
												<Content component="p">
													<strong>Status:</strong> {pool.status}
												</Content>
												<Content component="p">
													<strong>Destroyed:</strong> {pool.isDestroyed ? 'Yes' : 'No'}
												</Content>
											</FlexItem>
											{pool.errors && pool.errors.length > 0 && (
												<FlexItem>
													<ExclamationCircleIcon
														color="var(--pf-t--global--icon--color--status--danger--default)"
														title="Pool has errors. Must forcefully import."
													/>
												</FlexItem>
											)}
										</Flex>
									</div>
								))
							) : (
								<Flex justifyContent={{ default: 'justifyContentCenter' }} style={{ padding: '2rem' }}>
									<Content component="p">
										{showDeletedPools ? 'No Destroyed Pools Found' : 'No Importable Pools Found'}
									</Content>
								</Flex>
							)}
						</div>
					</FormGroup>

					{/* Show Destroyed Pools toggle */}
					<FormGroup fieldId="import-show-destroyed">
						<Switch
							id="import-show-destroyed"
							label="Show Destroyed Pools"
							isChecked={showDeletedPools}
							onChange={(_e, val) => setShowDeletedPools(val)}
						/>
					</FormGroup>

					{/* Disk Identifier */}
					<FormGroup label="Disk Identifier" fieldId="import-disk-identifier">
						<FormSelect
							id="import-disk-identifier"
							value={importedPool.identifier}
							onChange={(_e, val) => updateField('identifier', val as any)}
						>
							<FormSelectOption value="name" label="Device Alias" />
							<FormSelectOption value="path" label="Block Device" />
							<FormSelectOption value="guid" label="Hardware Path" />
						</FormSelect>
					</FormGroup>

					{/* Rename Pool */}
					<FormGroup fieldId="import-rename">
						<Switch
							id="import-rename"
							label="Rename Pool"
							isChecked={importedPool.renamePool}
							onChange={(_e, val) => updateField('renamePool', val)}
						/>
					</FormGroup>

					{importedPool.renamePool && (
						<FormGroup label="New Name" fieldId="import-new-name">
							<TextInput
								id="import-new-name"
								value={importedPool.newPoolName ?? ''}
								onChange={(_e, val) => updateField('newPoolName', val)}
								placeholder="New Pool Name"
							/>
						</FormGroup>
					)}

					{/* Alt Root */}
					<FormGroup label="Alt Root" fieldId="import-alt-root">
						<TextInput
							id="import-alt-root"
							value={importedPool.altRoot}
							onChange={(_e, val) => updateField('altRoot', val)}
							placeholder="Alt Root"
						/>
					</FormGroup>

					{/* Option switches row */}
					<Flex>
						<FlexItem>
							<Switch
								id="import-read-only"
								label="Read Only"
								isChecked={importedPool.readOnly}
								onChange={(_e, val) => updateField('readOnly', val)}
							/>
						</FlexItem>
						<FlexItem>
							<Switch
								id="import-recovery"
								label="Recovery Mode"
								isChecked={importedPool.recoveryMode}
								onChange={(_e, val) => updateField('recoveryMode', val)}
							/>
						</FlexItem>
						<FlexItem>
							<Switch
								id="import-ignore-log"
								label="Ignore Missing Log Devices"
								isChecked={importedPool.ignoreMissingLog}
								onChange={(_e, val) => updateField('ignoreMissingLog', val)}
							/>
						</FlexItem>
					</Flex>

					<Flex>
						<FlexItem>
							<Switch
								id="import-mount-fs"
								label="Mount File Systems"
								isChecked={importedPool.mountFileSystems}
								onChange={(_e, val) => updateField('mountFileSystems', val)}
							/>
						</FlexItem>
						<FlexItem>
							<Switch
								id="import-force"
								label="Forcefully Import"
								isChecked={importedPool.forceImport}
								onChange={(_e, val) => updateField('forceImport', val)}
							/>
						</FlexItem>
					</Flex>
				</Form>
			</ModalBody>

			<ModalFooter>
				{nameFeedback && (
					<Alert variant="danger" isInline isPlain title={nameFeedback} />
				)}
				<Button variant="danger" onClick={onClose}>
					Cancel
				</Button>
				<Button
					variant="primary"
					onClick={handleImport}
					isDisabled={importing || !importedPool.poolGUID}
					isLoading={importing}
					spinnerAriaValueText={importing ? 'Importing' : undefined}
				>
					{importing ? 'Importing...' : 'Import'}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ImportPoolModal;
