/**
 * RenameSnapshotModal -- modal for renaming a ZFS snapshot.
 *
 * Shows the parent filesystem, allows entering a new name or using the
 * creation date as the name, and optionally renaming child snapshots.
 */

import React, { useCallback, useState } from 'react';
import {
	Alert,
	AlertVariant,
	Button,
	ButtonVariant,
	Form,
	FormGroup,
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
import { renameSnapshot } from '../../hooks/useSnapshotOperations';
import { convertRawTimestampToString } from '../../utils/formatters';

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export interface RenameSnapshotModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	snapshot: Snapshot;
}

// ────────────────────────────────────────────────
// Name validation
// ────────────────────────────────────────────────

function validateSnapshotName(
	name: string,
	parentFS: string,
	datasets: { name: string; parentFS?: string }[],
): string {
	if (name === '') return 'Name cannot be empty.';
	if (!/^[a-zA-Z0-9]/.test(name)) return 'Name must begin with alphanumeric characters.';
	if (/^[ ]/.test(name)) return 'Name cannot begin with whitespace.';
	if (/[ ]$/.test(name)) return 'Name cannot end with whitespace.';
	if (!/^[a-zA-Z0-9_.:-]*$/.test(name)) return 'Name contains invalid characters.';

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

export const RenameSnapshotModal: React.FC<RenameSnapshotModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	snapshot,
}) => {
	const { datasets } = useZfsData();

	// ── Form state ──
	const [newName, setNewName] = useState('');
	const [useCreationDate, setUseCreationDate] = useState(false);
	const [renameChildren, setRenameChildren] = useState(false);
	const [renaming, setRenaming] = useState(false);

	// ── Feedback ──
	const [nameFeedback, setNameFeedback] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const creationDateStr = snapshot.properties?.creation?.rawTimestamp
		? convertRawTimestampToString(snapshot.properties.creation.rawTimestamp)
		: '';

	const handleRename = useCallback(async () => {
		setNameFeedback('');
		setErrorMessage('');

		let finalName = newName;
		if (useCreationDate) {
			finalName = creationDateStr;
		}

		// Validate (skip detailed char checks for creation date)
		if (!useCreationDate) {
			const nameError = validateSnapshotName(finalName, snapshot.dataset ?? '', datasets as any);
			if (nameError) {
				setNameFeedback(nameError);
				return;
			}
		} else {
			// Even for creation date, check for existence
			const exists = (datasets as any[]).some(d => {
				const existingName = d.name.split('/').pop();
				return d.parentFS === (snapshot.dataset ?? '') && existingName === finalName;
			});
			if (exists) {
				setNameFeedback(`Name already exists in this location: ${snapshot.dataset}.`);
				return;
			}
		}

		setRenaming(true);
		try {
			const output: any = await renameSnapshot(
				snapshot.name,
				finalName,
				renameChildren,
			);

			if (output == null || output.error) {
				const errMsg = output?.error || 'Unknown error';
				setErrorMessage(`${snapshot.name} was not renamed: ${errMsg}`);
			} else {
				onSuccess();
				onClose();
			}
		} catch (error) {
			console.error(error);
			setErrorMessage('An unexpected error occurred.');
		} finally {
			setRenaming(false);
		}
	}, [newName, useCreationDate, renameChildren, creationDateStr, snapshot, datasets, onSuccess, onClose]);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="rename-snapshot-modal-title"
		>
			<ModalHeader title="Rename Snapshot" />
			<ModalBody>
				<Form>
					<FormGroup label="Parent File System" fieldId="rename-snap-parent">
						<TextInput
							id="rename-snap-parent"
							value={snapshot.dataset ?? ''}
							isDisabled
							readOnlyVariant="plain"
						/>
					</FormGroup>

					<FormGroup fieldId="rename-snap-creation-date">
						<Switch
							id="rename-snap-creation-date"
							label="Creation Date"
							isChecked={useCreationDate}
							onChange={(_event, checked) => setUseCreationDate(checked)}
						/>
					</FormGroup>

					<FormGroup label="New Name" fieldId="rename-snap-new-name">
						<TextInput
							id="rename-snap-new-name"
							value={useCreationDate ? '' : newName}
							onChange={(_event, value) => setNewName(value)}
							placeholder={useCreationDate ? creationDateStr : 'New Name'}
							isDisabled={useCreationDate}
						/>
					</FormGroup>

					<FormGroup fieldId="rename-snap-children">
						<Switch
							id="rename-snap-children"
							label="Rename child snapshots with same name"
							isChecked={renameChildren}
							onChange={(_event, checked) => setRenameChildren(checked)}
						/>
					</FormGroup>
				</Form>

				{nameFeedback && (
					<Alert variant={AlertVariant.danger} isInline isPlain title={nameFeedback} />
				)}
				{errorMessage && (
					<Alert variant={AlertVariant.danger} isInline title="Rename Snapshot Failed">
						{errorMessage}
					</Alert>
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant={ButtonVariant.primary}
					onClick={handleRename}
					isDisabled={renaming}
					isLoading={renaming}
					spinnerAriaValueText={renaming ? 'Renaming' : undefined}
				>
					{renaming ? 'Renaming...' : 'Rename'}
				</Button>
				<Button variant={ButtonVariant.link} onClick={onClose} isDisabled={renaming}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default RenameSnapshotModal;
