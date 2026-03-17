/**
 * RemoteTargetForm -- sub-form for SSH remote target configuration.
 *
 * Contains fields for host, port, user, dataset path, mBuffer config,
 * and an SSH test button. Used within the SendSnapshotModal.
 */

import React, { useCallback, useState } from 'react';
import {
	Alert,
	AlertVariant,
	Button,
	ButtonVariant,
	Form,
	FormGroup,
	FormSelect,
	FormSelectOption,
	Grid,
	GridItem,
	TextInput,
} from '@patternfly/react-core';

import { testSSH } from '../../hooks/usePoolOperations';

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export interface RemoteTargetFormProps {
	/** Receiving dataset path. */
	destinationName: string;
	onDestinationNameChange: (value: string) => void;
	/** Receiving host (empty means local send). */
	destinationHost: string;
	onDestinationHostChange: (value: string) => void;
	/** Receiving SSH user. */
	destinationHostUser: string;
	onDestinationHostUserChange: (value: string) => void;
	/** Receiving port (default 22). */
	destinationPort: string;
	onDestinationPortChange: (value: string) => void;
	/** mBuffer size (used when remote). */
	mBufferSize: number;
	onMBufferSizeChange: (value: number) => void;
	/** mBuffer unit (b, k, M, G). */
	mBufferUnit: string;
	onMBufferUnitChange: (value: string) => void;
	/** Validation message for the destination. */
	invalidDestMsg?: string;
	/** Configuration conflict message. */
	invalidConfigMsg?: string;
	/** Most recent destination snapshot message. */
	mostRecentDestSnapMsg?: string;
	/** Force overwrite prompt message. */
	useForceOverwriteMsg?: string;
	/** Whether config is in an invalid state. */
	invalidConfig?: boolean;
	/** Whether destination is invalid. */
	invalidDest?: boolean;
	/** Callback when destination name loses focus (triggers dataset existence check). */
	onDestinationBlur?: () => void;
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export const RemoteTargetForm: React.FC<RemoteTargetFormProps> = ({
	destinationName,
	onDestinationNameChange,
	destinationHost,
	onDestinationHostChange,
	destinationHostUser,
	onDestinationHostUserChange,
	destinationPort,
	onDestinationPortChange,
	mBufferSize,
	onMBufferSizeChange,
	mBufferUnit,
	onMBufferUnitChange,
	invalidDestMsg,
	invalidConfigMsg,
	mostRecentDestSnapMsg,
	useForceOverwriteMsg,
	invalidConfig,
	invalidDest,
	onDestinationBlur,
}) => {
	// ── SSH test state ──
	const [sshTarget, setSshTarget] = useState('');
	const [showTestSSH, setShowTestSSH] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<boolean | null>(null);
	const [testResultMsg, setTestResultMsg] = useState('');

	const handleTestSSH = useCallback(async () => {
		if (!sshTarget) return;
		setTesting(true);
		setTestResultMsg('');
		setTestResult(null);

		const result = await testSSH(sshTarget);
		setTestResult(result);
		if (result) {
			setTestResultMsg('Connection Successful!');
		} else {
			setTestResultMsg(`Connection Failed: Could not resolve hostname ${sshTarget}: Name or service not known.`);
		}
		setTesting(false);
	}, [sshTarget]);

	const isRemote = destinationHost !== '';

	return (
		<Form>
			<FormGroup label="Receiving Dataset" fieldId="send-recv-dataset">
				<TextInput
					id="send-recv-dataset"
					value={destinationName}
					onChange={(_event, value) => onDestinationNameChange(value)}
					onBlur={onDestinationBlur}
					placeholder="Destination Name Here"
				/>
			</FormGroup>

			{invalidDest && invalidDestMsg && (
				<Alert variant={AlertVariant.danger} isInline isPlain title={invalidDestMsg} />
			)}
			{invalidConfig && invalidConfigMsg && (
				<Alert variant={AlertVariant.warning} isInline isPlain title={invalidConfigMsg} />
			)}
			{invalidConfig && mostRecentDestSnapMsg && (
				<Alert variant={AlertVariant.info} isInline isPlain title={mostRecentDestSnapMsg} />
			)}
			{invalidConfig && useForceOverwriteMsg && (
				<Alert variant={AlertVariant.danger} isInline isPlain title={useForceOverwriteMsg} />
			)}

			<FormGroup label="Receiving Host" fieldId="send-recv-host">
				<TextInput
					id="send-recv-host"
					value={destinationHost}
					onChange={(_event, value) => onDestinationHostChange(value)}
					placeholder="(Leave empty if sending locally.)"
				/>
			</FormGroup>

			<FormGroup label="Receiving User" fieldId="send-recv-user">
				<TextInput
					id="send-recv-user"
					value={destinationHostUser}
					onChange={(_event, value) => onDestinationHostUserChange(value)}
					placeholder="Destination Host User"
				/>
			</FormGroup>

			<FormGroup label="Receiving Port" fieldId="send-recv-port">
				<TextInput
					id="send-recv-port"
					value={destinationPort}
					onChange={(_event, value) => onDestinationPortChange(value)}
				/>
			</FormGroup>

			<FormGroup fieldId="send-test-ssh">
				<Button
					variant={ButtonVariant.secondary}
					onClick={() => setShowTestSSH(!showTestSSH)}
				>
					Test Passwordless SSH
				</Button>
			</FormGroup>

			{showTestSSH && (
				<>
					<FormGroup label="SSH Target" fieldId="send-ssh-target">
						<TextInput
							id="send-ssh-target"
							value={sshTarget}
							onChange={(_event, value) => setSshTarget(value)}
							placeholder="user@hostname or just hostname"
						/>
					</FormGroup>
					<FormGroup fieldId="send-ssh-test-btn">
						<Button
							variant={ButtonVariant.danger}
							onClick={handleTestSSH}
							isDisabled={testing || !sshTarget}
							isLoading={testing}
						>
							{testing ? 'Testing...' : 'Test'}
						</Button>
					</FormGroup>
					{testResult !== null && (
						<Alert
							variant={testResult ? AlertVariant.success : AlertVariant.danger}
							isInline
							isPlain
							title={testResultMsg}
						/>
					)}
				</>
			)}

			{isRemote && (
				<Grid hasGutter>
					<GridItem span={6}>
						<FormGroup label="mBuffer Size" fieldId="send-mbuffer-size">
							<TextInput
								id="send-mbuffer-size"
								type="number"
								value={mBufferSize}
								onChange={(_event, value) => onMBufferSizeChange(Number(value))}
							/>
						</FormGroup>
					</GridItem>
					<GridItem span={6}>
						<FormGroup label="mBuffer Unit" fieldId="send-mbuffer-unit">
							<FormSelect
								id="send-mbuffer-unit"
								value={mBufferUnit}
								onChange={(_event, value) => onMBufferUnitChange(value)}
							>
								<FormSelectOption value="b" label="b" />
								<FormSelectOption value="k" label="k" />
								<FormSelectOption value="M" label="M" />
								<FormSelectOption value="G" label="G" />
							</FormSelect>
						</FormGroup>
					</GridItem>
				</Grid>
			)}
		</Form>
	);
};

export default RemoteTargetForm;
