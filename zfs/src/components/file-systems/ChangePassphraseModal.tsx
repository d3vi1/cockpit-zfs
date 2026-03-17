/**
 * ChangePassphraseModal -- change the encryption passphrase on a ZFS dataset.
 *
 * Ported from ChangePassphrase.vue.
 * Uses PF Modal, Form, FormGroup, TextInput (password), Alert.
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
	Button,
	Alert,
	HelperText,
	HelperTextItem,
	Content,
} from '@patternfly/react-core';

import type { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { changePassphrase } from '../../hooks/useDatasetOperations';

export interface ChangePassphraseModalProps {
	isOpen: boolean;
	onClose: () => void;
	filesystem: ZFSFileSystemInfo;
	onChanged: () => Promise<void>;
}

export function ChangePassphraseModal({
	isOpen,
	onClose,
	filesystem,
	onChanged,
}: ChangePassphraseModalProps) {
	const [passphrase, setPassphrase] = useState('');
	const [passphraseConfirm, setPassphraseConfirm] = useState('');
	const [feedback, setFeedback] = useState('');
	const [changing, setChanging] = useState(false);

	const validate = useCallback((): boolean => {
		setFeedback('');

		if (passphrase === '') {
			setFeedback('Passphrase cannot be empty.');
			return false;
		}
		if (passphrase.length < 8) {
			setFeedback('Passphrase requires a minimum of 8 characters.');
			return false;
		}
		if (passphraseConfirm !== passphrase) {
			setFeedback('Passphrase does not match.');
			return false;
		}
		return true;
	}, [passphrase, passphraseConfirm]);

	const handleChange = useCallback(async () => {
		if (!validate()) return;

		setChanging(true);
		try {
			const output: any = await changePassphrase(filesystem.name, passphrase);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				setFeedback(`Passphrase change failed: ${errorMessage}`);
			} else {
				await onChanged();
			}
		} catch (error) {
			console.error(error);
			setFeedback('An unexpected error occurred.');
		} finally {
			setChanging(false);
		}
	}, [validate, filesystem.name, passphrase, onChanged]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === 'Enter') {
				handleChange();
			}
		},
		[handleChange],
	);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="change-passphrase-modal-title"
		>
			<ModalHeader title="Change Passphrase" />

			<ModalBody>
				<Form>
					<FormGroup
						label="New Passphrase"
						isRequired
						fieldId="cp-passphrase"
					>
						<TextInput
							id="cp-passphrase"
							type="password"
							value={passphrase}
							onChange={(_event, val) => setPassphrase(val)}
							placeholder="Passphrase"
						/>
						<HelperText>
							<HelperTextItem variant="indeterminate">
								Passphrase requires at least 8 characters.
							</HelperTextItem>
						</HelperText>
					</FormGroup>

					<FormGroup
						label="Confirm New Passphrase"
						isRequired
						fieldId="cp-passphrase-confirm"
					>
						<TextInput
							id="cp-passphrase-confirm"
							type="password"
							value={passphraseConfirm}
							onChange={(_event, val) => setPassphraseConfirm(val)}
							onKeyDown={handleKeyDown}
							placeholder="Confirm Passphrase"
						/>
					</FormGroup>
				</Form>

				<Alert
					variant="warning"
					isInline
					isPlain
					title="Important: Please note your passphrase carefully. If it is lost, it cannot be retrieved or reset."
				/>

				{feedback && (
					<Alert variant="danger" isInline isPlain title={feedback} />
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant="primary"
					onClick={handleChange}
					isDisabled={changing}
					isLoading={changing}
					spinnerAriaValueText={changing ? 'Changing' : undefined}
				>
					{changing ? 'Changing...' : 'Change'}
				</Button>
				<Button variant="link" onClick={onClose} isDisabled={changing}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
}

export default ChangePassphraseModal;
