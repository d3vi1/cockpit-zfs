/**
 * LockUnlockModal -- lock or unlock an encrypted ZFS dataset.
 *
 * Ported from LockUnlockFileSystem.vue.
 * - Lock mode: simple confirmation.
 * - Unlock mode: passphrase entry, optional mount after unlock.
 */

import React, { useState, useCallback } from 'react';
import {
	Modal,
	ModalVariant,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Form,
	FormGroup,
	TextInput,
	Switch,
	Button,
	Alert,
	Content,
	InputGroup,
	InputGroupItem,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

import type { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import {
	lockFileSystem,
	unlockFileSystem,
	mountFileSystem,
	isPassphraseValid,
} from '../../hooks/useDatasetOperations';
import { upperCaseWord } from '../../utils/helpers';

export interface LockUnlockModalProps {
	isOpen: boolean;
	onClose: () => void;
	mode: 'lock' | 'unlock';
	filesystem: ZFSFileSystemInfo;
	onCompleted: () => Promise<void>;
}

export function LockUnlockModal({
	isOpen,
	onClose,
	mode,
	filesystem,
	onCompleted,
}: LockUnlockModalProps) {
	const [passphrase, setPassphrase] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [passFeedback, setPassFeedback] = useState('');
	const [mountFS, setMountFS] = useState(true);
	const [forceMountFS, setForceMountFS] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleConfirm = useCallback(async () => {
		setPassFeedback('');
		setLoading(true);

		try {
			if (mode === 'lock') {
				const lockOutput: any = await lockFileSystem(filesystem);

				if (lockOutput == null || lockOutput.error) {
					const errorMessage = lockOutput?.error || 'Unknown error';
					setPassFeedback(`Lock failed: ${errorMessage}`);
					setLoading(false);
					return;
				}
				await onCompleted();
			} else {
				// Unlock flow
				const valid = await isPassphraseValid(filesystem.name, passphrase);
				if (!valid) {
					setPassFeedback('Passphrase is invalid.');
					setLoading(false);
					return;
				}

				const unlockOutput: any = await unlockFileSystem(filesystem, passphrase);

				if (unlockOutput == null || unlockOutput.error) {
					const errorMessage = unlockOutput?.error || 'Unknown error';
					setPassFeedback(`Unlock failed: ${errorMessage}`);
					setLoading(false);
					return;
				}

				// Optionally mount after unlock
				if (mountFS) {
					const mountOutput: any = await mountFileSystem(filesystem, forceMountFS);
					if (mountOutput == null || mountOutput.error) {
						const errorMessage = mountOutput?.error || 'Unknown error';
						setPassFeedback(`Unlocked but mount failed: ${errorMessage}`);
						setLoading(false);
						// Still complete since unlock succeeded
						await onCompleted();
						return;
					}
				}

				await onCompleted();
			}
		} catch (error) {
			console.error(error);
			setPassFeedback('An unexpected error occurred.');
		} finally {
			setLoading(false);
		}
	}, [mode, filesystem, passphrase, mountFS, forceMountFS, onCompleted]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === 'Enter') {
				handleConfirm();
			}
		},
		[handleConfirm],
	);

	const title = `${upperCaseWord(mode)} File System`;

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="lock-unlock-modal-title"
		>
			<ModalHeader title={title} />

			<ModalBody>
				{mode === 'unlock' ? (
					<Form>
						{/* Filesystem name */}
						<FormGroup label="Name" fieldId="lu-fs-name">
							<Content component="p">{filesystem.name}</Content>
						</FormGroup>

						{/* Passphrase input with show/hide */}
						<FormGroup label="Passphrase" isRequired fieldId="lu-passphrase">
							<InputGroup>
								<InputGroupItem isFill>
									<TextInput
										id="lu-passphrase"
										type={showPassword ? 'text' : 'password'}
										value={passphrase}
										onChange={(_event, val) => setPassphrase(val)}
										onKeyDown={handleKeyDown}
										placeholder="Enter here"
									/>
								</InputGroupItem>
								<InputGroupItem>
									<Button
										variant="control"
										aria-label={showPassword ? 'Hide password' : 'Show password'}
										onClick={() => setShowPassword(prev => !prev)}
										icon={showPassword ? <EyeSlashIcon /> : <EyeIcon />}
									/>
								</InputGroupItem>
							</InputGroup>
						</FormGroup>

						{/* Mount after unlock */}
						<FormGroup label="Mount File System" fieldId="lu-mount">
							<Switch
								id="lu-mount"
								isChecked={mountFS}
								onChange={(_event, checked) => setMountFS(checked)}
								aria-label="Mount file system after unlock"
							/>
						</FormGroup>

						{/* Force mount */}
						<FormGroup label="Forcefully Mount File System" fieldId="lu-force-mount">
							<Switch
								id="lu-force-mount"
								isChecked={forceMountFS}
								onChange={(_event, checked) => setForceMountFS(checked)}
								aria-label="Forcefully mount file system"
							/>
						</FormGroup>
					</Form>
				) : (
					<Content component="p">
						Lock filesystem <strong>{filesystem.name}</strong>?
					</Content>
				)}

				{passFeedback && (
					<Alert variant="danger" isInline isPlain title={passFeedback} />
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant="danger"
					onClick={handleConfirm}
					isDisabled={loading}
					isLoading={loading}
					spinnerAriaValueText={loading ? `${upperCaseWord(mode)}ing` : undefined}
				>
					{loading ? `${upperCaseWord(mode)}ing...` : upperCaseWord(mode)}
				</Button>
				<Button variant="link" onClick={onClose} isDisabled={loading}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
}

export default LockUnlockModal;
