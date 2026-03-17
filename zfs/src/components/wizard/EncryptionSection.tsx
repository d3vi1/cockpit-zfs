/**
 * EncryptionSection -- Encryption configuration for file system creation.
 *
 * Allows the user to enable/disable encryption, set a passphrase with
 * confirmation, and pick an encryption algorithm (cipher).
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React, { useState } from 'react';
import {
	FormGroup,
	TextInput,
	FormSelect,
	FormSelectOption,
	Switch,
	Alert,
	Button,
	InputGroup,
	InputGroupItem,
} from '@patternfly/react-core';
import EyeIcon from '@patternfly/react-icons/dist/esm/icons/eye-icon';
import EyeSlashIcon from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon';

// ── Cipher options ──────────────────────────────
const CIPHER_OPTIONS = [
	{ value: 'aes-128-ccm', label: 'AES-128-CCM' },
	{ value: 'aes-192-ccm', label: 'AES-192-CCM' },
	{ value: 'aes-256-ccm', label: 'AES-256-CCM' },
	{ value: 'aes-128-gcm', label: 'AES-128-GCM' },
	{ value: 'aes-192-gcm', label: 'AES-192-GCM' },
	{ value: 'aes-256-gcm', label: 'AES-256-GCM' },
];

export interface EncryptionConfig {
	enabled: boolean;
	passphrase: string;
	passphraseConfirm: string;
	cipher: string;
}

interface EncryptionSectionProps {
	config: EncryptionConfig;
	onChange: (config: EncryptionConfig) => void;
	/** Externally driven validation errors (optional). */
	errors?: string[];
}

export const EncryptionSection: React.FC<EncryptionSectionProps> = ({
	config,
	onChange,
	errors,
}) => {
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

	const update = (partial: Partial<EncryptionConfig>) => {
		onChange({ ...config, ...partial });
	};

	return (
		<>
			<FormGroup fieldId="encryption-toggle" label="Encryption">
				<Switch
					id="encryption-toggle"
					isChecked={config.enabled}
					onChange={(_e, checked) => update({ enabled: checked })}
					label="Enabled"
				/>
			</FormGroup>

			{config.enabled && (
				<>
					{/* Passphrase */}
					<FormGroup
						fieldId="encryption-passphrase"
						label="Passphrase"
					>
						<InputGroup>
							<InputGroupItem isFill>
								<TextInput
									id="encryption-passphrase"
									type={showPassword ? 'text' : 'password'}
									value={config.passphrase}
									onChange={(_e, val) => update({ passphrase: val })}
									placeholder="Passphrase"
								/>
							</InputGroupItem>
							<InputGroupItem>
								<Button
									variant="control"
									onClick={() => setShowPassword(!showPassword)}
									aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
								>
									{showPassword ? <EyeSlashIcon /> : <EyeIcon />}
								</Button>
							</InputGroupItem>
						</InputGroup>
					</FormGroup>

					{/* Confirm Passphrase */}
					<FormGroup fieldId="encryption-passphrase-confirm" label="Confirm Passphrase">
						<InputGroup>
							<InputGroupItem isFill>
								<TextInput
									id="encryption-passphrase-confirm"
									type={showPasswordConfirm ? 'text' : 'password'}
									value={config.passphraseConfirm}
									onChange={(_e, val) => update({ passphraseConfirm: val })}
									placeholder="Confirm Passphrase"
								/>
							</InputGroupItem>
							<InputGroupItem>
								<Button
									variant="control"
									onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
									aria-label={
										showPasswordConfirm
											? 'Hide confirm passphrase'
											: 'Show confirm passphrase'
									}
								>
									{showPasswordConfirm ? <EyeSlashIcon /> : <EyeIcon />}
								</Button>
							</InputGroupItem>
						</InputGroup>
					</FormGroup>

					{/* Warning */}
					<Alert variant="warning" isInline isPlain title="Important">
						Please note your passphrase carefully. If it is lost, it cannot be
						retrieved or reset.
					</Alert>

					{/* Cipher */}
					<FormGroup fieldId="encryption-cipher" label="Cipher">
						<FormSelect
							id="encryption-cipher"
							value={config.cipher}
							onChange={(_e, val) => update({ cipher: val })}
						>
							{CIPHER_OPTIONS.map((opt) => (
								<FormSelectOption key={opt.value} value={opt.value} label={opt.label} />
							))}
						</FormSelect>
					</FormGroup>
				</>
			)}

			{errors &&
				errors.length > 0 &&
				errors.map((err, idx) => (
					<Alert key={idx} variant="danger" isInline isPlain title={err} />
				))}
		</>
	);
};

export default EncryptionSection;
