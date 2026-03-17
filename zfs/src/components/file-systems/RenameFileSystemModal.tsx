/**
 * RenameFileSystemModal -- rename a ZFS dataset with optional parent selection.
 *
 * Ported from RenameFileSystem.vue.
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
	FormSelect,
	FormSelectOption,
	TextInput,
	Switch,
	Button,
	Alert,
} from '@patternfly/react-core';

import type { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { renameFileSystem } from '../../hooks/useDatasetOperations';

export interface RenameFileSystemModalProps {
	isOpen: boolean;
	onClose: () => void;
	filesystem: ZFSFileSystemInfo;
	datasets: ZFSFileSystemInfo[];
	onRenamed: () => Promise<void>;
}

/** Recursively collect child dataset IDs so we can exclude them as parent targets. */
function getChildDatasetIds(dataset: ZFSFileSystemInfo, allDatasets: ZFSFileSystemInfo[]): string[] {
	let childIds: string[] = [];
	const children = allDatasets.filter(child => child.parentFS === dataset.id);
	for (const child of children) {
		childIds.push(child.id);
		childIds = childIds.concat(getChildDatasetIds(child, allDatasets));
	}
	return childIds;
}

export function RenameFileSystemModal({
	isOpen,
	onClose,
	filesystem,
	datasets,
	onRenamed,
}: RenameFileSystemModalProps) {
	const [parentFS, setParentFS] = useState(filesystem.parentFS || '');
	const [newName, setNewName] = useState('');
	const [forceUnmount, setForceUnmount] = useState(false);
	const [createNonExistParent, setCreateNonExistParent] = useState(false);
	const [nameFeedback, setNameFeedback] = useState('');
	const [parentFeedback, setParentFeedback] = useState('');
	const [renaming, setRenaming] = useState(false);

	// Datasets in the same pool minus the current one and its children
	const datasetsInSamePool = useMemo(() => {
		const childIds = getChildDatasetIds(filesystem, datasets);
		return datasets.filter(
			ds =>
				ds.pool === filesystem.pool &&
				ds.id !== filesystem.id &&
				!childIds.includes(ds.id),
		);
	}, [filesystem, datasets]);

	const nameCheck = useCallback(
		(fsName: string, fsParent: string): boolean => {
			setNameFeedback('');
			setParentFeedback('');

			if (fsName === '') {
				setNameFeedback('Name cannot be empty.');
				return false;
			}
			if (!/^[a-zA-Z0-9]/.test(fsName)) {
				setNameFeedback('Name must begin with alphanumeric characters.');
				return false;
			}
			if (/^[ ]/.test(fsName)) {
				setNameFeedback('Name cannot begin with whitespace.');
				return false;
			}
			if (/[ ]$/.test(fsName)) {
				setNameFeedback('Name cannot end with whitespace.');
				return false;
			}
			if (!/^[a-zA-Z0-9_.:-]*$/.test(fsName)) {
				setNameFeedback('Name contains invalid characters.');
				return false;
			}

			// Check for existing name in same parent
			const exists = datasets.some(ds => {
				const existingParentPath = ds.parentFS;
				const existingName = ds.name.split('/').pop();
				return existingParentPath === fsParent && existingName === fsName;
			});

			if (exists) {
				setNameFeedback(`Name already exists in this location: ${fsParent}.`);
				return false;
			}

			return true;
		},
		[datasets],
	);

	const handleRename = useCallback(async () => {
		if (!nameCheck(newName, parentFS)) return;

		setRenaming(true);
		try {
			const newPath = parentFS + '/' + newName;
			const output: any = await renameFileSystem(
				filesystem.name,
				newPath,
				forceUnmount,
				createNonExistParent,
			);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				setNameFeedback(`Rename failed: ${errorMessage}`);
			} else {
				await onRenamed();
			}
		} catch (error) {
			console.error(error);
			setNameFeedback('An unexpected error occurred.');
		} finally {
			setRenaming(false);
		}
	}, [newName, parentFS, filesystem.name, forceUnmount, createNonExistParent, nameCheck, onRenamed]);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="rename-fs-modal-title"
		>
			<ModalHeader title="Rename File System" />

			<ModalBody>
				<Form>
					{/* Parent File System */}
					<FormGroup label="Parent File System" isRequired fieldId="rename-parent-fs">
						<FormSelect
							id="rename-parent-fs"
							value={parentFS}
							onChange={(_event, val) => setParentFS(val)}
						>
							{datasetsInSamePool.map(ds => (
								<FormSelectOption
									key={ds.id}
									value={ds.name}
									label={ds.name}
								/>
							))}
						</FormSelect>
					</FormGroup>

					{/* New Name */}
					<FormGroup label="New Name" isRequired fieldId="rename-new-name">
						<TextInput
							id="rename-new-name"
							value={newName}
							onChange={(_event, val) => setNewName(val)}
							placeholder="New Name"
						/>
					</FormGroup>

					{/* Force Unmount toggle */}
					<FormGroup
						label="Forcefully Unmount File System"
						fieldId="rename-force-unmount"
					>
						<Switch
							id="rename-force-unmount"
							isChecked={forceUnmount}
							onChange={(_event, checked) => setForceUnmount(checked)}
							aria-label="Force unmount"
						/>
					</FormGroup>

					{/* Create non-existent parents */}
					<FormGroup
						label="Create Non-Existent Parent File Systems"
						fieldId="rename-create-parents"
					>
						<Switch
							id="rename-create-parents"
							isChecked={createNonExistParent}
							onChange={(_event, checked) => setCreateNonExistParent(checked)}
							aria-label="Create non-existent parent file systems"
						/>
					</FormGroup>
				</Form>

				{nameFeedback && (
					<Alert variant="danger" isInline isPlain title={nameFeedback} />
				)}
				{parentFeedback && (
					<Alert variant="danger" isInline isPlain title={parentFeedback} />
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant="primary"
					onClick={handleRename}
					isDisabled={renaming}
					isLoading={renaming}
					spinnerAriaValueText={renaming ? 'Renaming' : undefined}
				>
					{renaming ? 'Renaming...' : 'Rename'}
				</Button>
				<Button variant="link" onClick={onClose} isDisabled={renaming}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
}

export default RenameFileSystemModal;
