/**
 * CreateSnapshotModal -- modal for creating a new ZFS snapshot.
 *
 * Supports selecting a filesystem, entering a custom or auto-generated name,
 * and optionally snapping child file systems.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
	Alert,
	AlertVariant,
	Button,
	ButtonVariant,
	Form,
	FormGroup,
	FormSelect,
	FormSelectOption,
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalVariant,
	Switch,
	TextInput,
} from '@patternfly/react-core';

import type { NewSnapshot, Snapshot } from '../../types/index';
import { useZfsData } from '../../contexts/ZfsDataContext';
import { createSnapshot } from '../../hooks/useSnapshotOperations';
import { getSnapshotTimestamp } from '../../utils/formatters';

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export interface CreateSnapshotModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	item: 'pool' | 'filesystem';
	poolName?: string;
	datasetName?: string;
}

// ────────────────────────────────────────────────
// Name validation
// ────────────────────────────────────────────────

function validateName(name: string, existingSnapshots: Snapshot[]): string {
	if (name === '') return 'Name cannot be empty.';
	if (!/^[a-zA-Z0-9]/.test(name)) return 'Name must begin with alphanumeric characters.';
	if (/^[ ]/.test(name)) return 'Name cannot begin with whitespace.';
	if (/[ ]$/.test(name)) return 'Name cannot end with whitespace.';
	if (!/^[a-zA-Z0-9_.:-]*$/.test(name)) return 'Name contains invalid characters.';
	if (existingSnapshots.some(s => s.name === name)) return 'A snapshot with that name already exists.';
	return '';
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export const CreateSnapshotModal: React.FC<CreateSnapshotModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	item,
	poolName,
	datasetName,
}) => {
	const { datasets, snapshots } = useZfsData();

	// Filter datasets for the pool mode
	const availableDatasets = useMemo(() => {
		if (item === 'pool' && poolName) {
			return datasets.filter(d => d.pool === poolName);
		}
		return datasets;
	}, [item, poolName, datasets]);

	// Default selected filesystem
	const defaultFS = useMemo(() => {
		if (item === 'filesystem' && datasetName) {
			return datasetName;
		}
		return availableDatasets.length > 0 ? availableDatasets[0].name : '';
	}, [item, datasetName, availableDatasets]);

	// ── Form state ──
	const [filesystem, setFilesystem] = useState(defaultFS);
	const [snapshotName, setSnapshotName] = useState('');
	const [isCustomName, setIsCustomName] = useState(false);
	const [snapChildren, setSnapChildren] = useState(false);
	const [creating, setCreating] = useState(false);

	// ── Feedback ──
	const [nameFeedback, setNameFeedback] = useState('');
	const [filesystemFeedback, setFilesystemFeedback] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const handleCreate = useCallback(async () => {
		setNameFeedback('');
		setFilesystemFeedback('');
		setErrorMessage('');

		// Determine name
		let finalName = snapshotName;
		if (!isCustomName) {
			finalName = getSnapshotTimestamp();
		} else {
			const nameError = validateName(snapshotName, snapshots);
			if (nameError) {
				setNameFeedback(nameError);
				return;
			}
		}

		if (!filesystem) {
			setFilesystemFeedback('Please select a File System.');
			return;
		}

		const newSnap: NewSnapshot = {
			name: finalName,
			filesystem,
			isCustomName,
			snapChildren,
		};

		setCreating(true);
		try {
			const output: any = await createSnapshot(newSnap);

			if (output == null || output.error) {
				const errMsg = output?.error || 'Unknown error';
				setErrorMessage(`There was an error creating this snapshot: ${errMsg}`);
			} else {
				onSuccess();
				onClose();
			}
		} catch (error) {
			console.error(error);
			setErrorMessage('An unexpected error occurred.');
		} finally {
			setCreating(false);
		}
	}, [snapshotName, isCustomName, filesystem, snapChildren, snapshots, onSuccess, onClose]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Enter' && !creating) {
				handleCreate();
			}
		},
		[creating, handleCreate],
	);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="create-snapshot-modal-title"
		>
			<ModalHeader title="Create Snapshot" />
			<ModalBody>
				<Form onKeyDown={handleKeyDown as any}>
					<FormGroup label="File System" fieldId="create-snap-filesystem">
						<FormSelect
							id="create-snap-filesystem"
							value={filesystem}
							onChange={(_event, value) => setFilesystem(value)}
						>
							{availableDatasets.map(d => (
								<FormSelectOption key={d.name} value={d.name} label={d.name} />
							))}
						</FormSelect>
					</FormGroup>

					<FormGroup fieldId="create-snap-custom-name">
						<Switch
							id="create-snap-custom-name"
							label="Custom Name"
							isChecked={isCustomName}
							onChange={(_event, checked) => setIsCustomName(checked)}
						/>
					</FormGroup>

					<FormGroup label="Snapshot Name" fieldId="create-snap-name">
						<TextInput
							id="create-snap-name"
							value={isCustomName ? snapshotName : ''}
							onChange={(_event, value) => setSnapshotName(value)}
							placeholder={isCustomName ? 'Enter Name Here' : 'YYYY.MM.DD-HH.MM.SS'}
							isDisabled={!isCustomName}
						/>
					</FormGroup>

					<FormGroup fieldId="create-snap-children">
						<Switch
							id="create-snap-children"
							label="Create snapshots of child file systems"
							isChecked={snapChildren}
							onChange={(_event, checked) => setSnapChildren(checked)}
						/>
					</FormGroup>
				</Form>

				{nameFeedback && (
					<Alert variant={AlertVariant.danger} isInline isPlain title={nameFeedback} />
				)}
				{filesystemFeedback && (
					<Alert variant={AlertVariant.danger} isInline isPlain title={filesystemFeedback} />
				)}
				{errorMessage && (
					<Alert variant={AlertVariant.danger} isInline title="Create Snapshot Failed">
						{errorMessage}
					</Alert>
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant={ButtonVariant.primary}
					onClick={handleCreate}
					isDisabled={creating}
					isLoading={creating}
					spinnerAriaValueText={creating ? 'Creating' : undefined}
				>
					{creating ? 'Creating...' : 'Create'}
				</Button>
				<Button variant={ButtonVariant.link} onClick={onClose} isDisabled={creating}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default CreateSnapshotModal;
