/**
 * CloneSnapshotModal -- modal for cloning a ZFS snapshot.
 *
 * Allows selecting a parent filesystem, entering a clone name, and
 * optionally creating non-existent parent file systems.
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

import type { Snapshot } from '../../types/index';
import { useZfsData } from '../../contexts/ZfsDataContext';
import { cloneSnapshot } from '../../hooks/useSnapshotOperations';

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export interface CloneSnapshotModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	snapshot: Snapshot;
}

// ────────────────────────────────────────────────
// Name validation
// ────────────────────────────────────────────────

function validateCloneName(
	name: string,
	parentFS: string,
	datasets: { name: string; parentFS?: string }[],
): string {
	if (name === '') return 'Name cannot be empty.';
	if (!/^[a-zA-Z0-9]/.test(name)) return 'Name must begin with alphanumeric characters.';
	if (/^[ ]/.test(name)) return 'Name cannot begin with whitespace.';
	if (/[ ]$/.test(name)) return 'Name cannot end with whitespace.';
	if (!/^[a-zA-Z0-9_.:-]*$/.test(name)) return 'Name contains invalid characters.';

	// Check if name already exists under the selected parent
	const exists = datasets.some(d => {
		const existingName = d.name.split('/').pop();
		return (d as any).parentFS === parentFS && existingName === name;
	});
	if (exists) return `Name already exists in this location: ${parentFS}.`;

	return '';
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export const CloneSnapshotModal: React.FC<CloneSnapshotModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	snapshot,
}) => {
	const { datasets } = useZfsData();

	// Filter to datasets in the same pool, excluding children of the snapshot's dataset
	const availableParents = useMemo(() => {
		return datasets.filter(d => d.pool === snapshot.pool);
	}, [datasets, snapshot.pool]);

	// ── Form state ──
	const [parentFS, setParentFS] = useState(snapshot.dataset ?? '');
	const [cloneName, setCloneName] = useState('');
	const [createNonExistParent, setCreateNonExistParent] = useState(false);
	const [cloning, setCloning] = useState(false);

	// ── Feedback ──
	const [nameFeedback, setNameFeedback] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const handleClone = useCallback(async () => {
		setNameFeedback('');
		setErrorMessage('');

		const nameError = validateCloneName(cloneName, parentFS, datasets as any);
		if (nameError) {
			setNameFeedback(nameError);
			return;
		}

		setCloning(true);
		try {
			const output: any = await cloneSnapshot(
				snapshot.name,
				parentFS,
				cloneName,
				createNonExistParent,
			);

			if (output == null || output.error) {
				const errMsg = output?.error || 'Unknown error';
				setErrorMessage(`There was an error cloning this snapshot: ${errMsg}`);
			} else {
				onSuccess();
				onClose();
			}
		} catch (error) {
			console.error(error);
			setErrorMessage('An unexpected error occurred.');
		} finally {
			setCloning(false);
		}
	}, [cloneName, parentFS, createNonExistParent, snapshot.name, datasets, onSuccess, onClose]);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="clone-snapshot-modal-title"
		>
			<ModalHeader title="Clone Snapshot" />
			<ModalBody>
				<Form>
					<FormGroup label="Snapshot Name" fieldId="clone-snap-name">
						<TextInput
							id="clone-snap-name"
							value={snapshot.name}
							isDisabled
							readOnlyVariant="plain"
						/>
					</FormGroup>

					<FormGroup label="Parent File System" fieldId="clone-snap-parent">
						<FormSelect
							id="clone-snap-parent"
							value={parentFS}
							onChange={(_event, value) => setParentFS(value)}
						>
							{availableParents.map(d => (
								<FormSelectOption key={d.name} value={d.name} label={d.name} />
							))}
						</FormSelect>
					</FormGroup>

					<FormGroup label="Clone Name" fieldId="clone-snap-clone-name">
						<TextInput
							id="clone-snap-clone-name"
							value={cloneName}
							onChange={(_event, value) => setCloneName(value)}
							placeholder="Enter Name Here"
						/>
					</FormGroup>

					<FormGroup fieldId="clone-snap-create-parents">
						<Switch
							id="clone-snap-create-parents"
							label="Create Non-Existent Parent File Systems"
							isChecked={createNonExistParent}
							onChange={(_event, checked) => setCreateNonExistParent(checked)}
						/>
					</FormGroup>
				</Form>

				{nameFeedback && (
					<Alert variant={AlertVariant.danger} isInline isPlain title={nameFeedback} />
				)}
				{errorMessage && (
					<Alert variant={AlertVariant.danger} isInline title="Clone Snapshot Failed">
						{errorMessage}
					</Alert>
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant={ButtonVariant.primary}
					onClick={handleClone}
					isDisabled={cloning}
					isLoading={cloning}
					spinnerAriaValueText={cloning ? 'Cloning' : undefined}
				>
					{cloning ? 'Cloning...' : 'Clone'}
				</Button>
				<Button variant={ButtonVariant.link} onClick={onClose} isDisabled={cloning}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default CloneSnapshotModal;
