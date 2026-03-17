/**
 * TestSshModal -- test a passwordless SSH connection to a remote host.
 *
 * Ported from TestSSHModal.vue.
 * Uses PF Modal, Form, FormGroup, TextInput, Alert.
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
} from '@patternfly/react-core';

import { testSSH } from '../../hooks/usePoolOperations';

export interface TestSshModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function TestSshModal({ isOpen, onClose }: TestSshModalProps) {
	const [sshTarget, setSshTarget] = useState('');
	const [testing, setTesting] = useState(false);
	const [resultMsg, setResultMsg] = useState('');
	const [resultSuccess, setResultSuccess] = useState(false);

	const handleTest = useCallback(async () => {
		if (!sshTarget.trim()) return;

		setTesting(true);
		setResultMsg('');

		try {
			const success = await testSSH(sshTarget);
			setResultSuccess(success);

			if (success) {
				setResultMsg('Connection Successful!');
			} else {
				setResultMsg(
					`Connection Failed: Could not resolve hostname ${sshTarget}: Name or service not known.`,
				);
			}
		} catch (error) {
			console.error(error);
			setResultSuccess(false);
			setResultMsg('An unexpected error occurred during the SSH test.');
		} finally {
			setTesting(false);
		}
	}, [sshTarget]);

	return (
		<Modal
			variant={ModalVariant.medium}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="test-ssh-modal-title"
		>
			<ModalHeader title="Test Passwordless SSH Connection" />

			<ModalBody>
				<Form>
					<FormGroup label="SSH Target" isRequired fieldId="ssh-target">
						<TextInput
							id="ssh-target"
							value={sshTarget}
							onChange={(_event, val) => setSshTarget(val)}
							placeholder="user@hostname or just hostname"
						/>
					</FormGroup>
				</Form>

				{resultMsg && (
					<Alert
						variant={resultSuccess ? 'success' : 'danger'}
						isInline
						isPlain
						title={resultMsg}
					/>
				)}
			</ModalBody>

			<ModalFooter>
				<Button
					variant="danger"
					onClick={handleTest}
					isDisabled={testing || !sshTarget.trim()}
					isLoading={testing}
					spinnerAriaValueText={testing ? 'Testing' : undefined}
				>
					{testing ? 'Testing...' : 'Test'}
				</Button>
				<Button variant="link" onClick={onClose} isDisabled={testing}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
}

export default TestSshModal;
