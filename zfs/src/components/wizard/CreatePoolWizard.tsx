/**
 * CreatePoolWizard -- Main wizard for creating a new ZFS pool.
 *
 * Uses PF <Wizard> with three steps:
 *   1. Pool Configuration (name, VDevs, pool settings)
 *   2. File System (optional dataset creation with encryption)
 *   3. Review (summary + create button)
 *
 * Manages all wizard state and orchestrates pool creation via ZFSManager,
 * followed by optional file-system creation.
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	Wizard,
	WizardStep,
	Button,
	Alert,
	Spinner,
	Flex,
	FlexItem,
} from '@patternfly/react-core';
import { ZFSManager } from '@45drives/houston-common-lib';
import type { VDev, ZPoolBase, ZpoolCreateOptions } from '@45drives/houston-common-lib';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { setRefreservation } from '../../hooks/usePoolOperations';
import { createEncryptedDataset } from '../../hooks/useDatasetOperations';
import { convertSizeToBytes } from '../../utils/formatters';
import {
	isBoolOnOff,
	isBoolCompression,
	getFullDiskInfo,
	getDiskIDName,
	upperCaseWord,
} from '../../utils/helpers';

import { PoolConfigStep, type PoolConfig } from './PoolConfigStep';
import { FileSystemStep, type FileSystemConfig } from './FileSystemStep';
import { ReviewStep, type CreationStatus } from './ReviewStep';

// ── Default states ──────────────────────────────

function defaultPoolConfig(): PoolConfig {
	return {
		name: '',
		vdevs: [
			{
				type: 'raidz2',
				diskIdentifier: 'vdev_path',
				selectedDisks: [],
				isMirror: false,
			},
		],
		sectorsize: '12',
		recordsize: String(convertSizeToBytes('128kib')),
		compression: isBoolCompression(true),
		dedup: isBoolOnOff(false),
		autoexpand: isBoolOnOff(true),
		autoreplace: isBoolOnOff(false),
		autotrim: isBoolOnOff(false),
		refreservationPercent: 10,
		forceCreate: false,
	};
}

function defaultFsConfig(): FileSystemConfig {
	return {
		createFileSystem: true,
		name: '',
		encrypted: false,
		encryption: {
			enabled: false,
			passphrase: '',
			passphraseConfirm: '',
			cipher: 'aes-256-gcm',
		},
		inherit: true,
		compression: 'inherited',
		deduplication: 'inherited',
		recordSize: 'inherited',
		accessTime: 'inherited',
		caseSensitivity: 'inherited',
		dNodeSize: 'inherited',
		extendedAttributes: 'inherited',
		quotaRaw: 0,
		quotaUnit: 'kib',
		isReadOnly: false,
	};
}

// ── Validation ──────────────────────────────────

function validatePoolName(name: string, existingPoolNames: string[]): string[] {
	const errors: string[] = [];

	if (name === '') {
		errors.push('Name cannot be empty.');
	} else if (/^[0-9]/.test(name)) {
		errors.push('Name cannot begin with numbers.');
	} else if (/^\./.test(name)) {
		errors.push('Name cannot begin with a period (.).');
	} else if (/^_/.test(name)) {
		errors.push('Name cannot begin with an underscore (_).');
	} else if (/^-/.test(name)) {
		errors.push('Name cannot begin with a hyphen (-).');
	} else if (/^:/.test(name)) {
		errors.push('Name cannot begin with a colon (:).');
	} else if (/^ /.test(name)) {
		errors.push('Name cannot begin with whitespace.');
	} else if (/ $/.test(name)) {
		errors.push('Name cannot end with whitespace.');
	} else if (
		/^c[0-9]|^log|^mirror|^raidz|^raidz1|^raidz2|^raidz3|^spare/.test(name)
	) {
		errors.push('Name cannot begin with a reserved name.');
	} else if (!/^[a-zA-Z0-9_.:-]*$/.test(name)) {
		errors.push('Name contains invalid characters.');
	} else if (existingPoolNames.includes(name)) {
		errors.push('A pool with that name already exists.');
	}

	return errors;
}

function validateVDevs(
	poolConfig: PoolConfig,
	importablePoolNames: string[],
): string[] {
	const errors: string[] = [];

	if (poolConfig.vdevs.length < 1) {
		errors.push('At least one Virtual Device is required.');
		return errors;
	}

	for (const vdev of poolConfig.vdevs) {
		const diskCount = vdev.selectedDisks.length;
		const t = vdev.type;

		if (t === 'mirror' && diskCount < 2) {
			errors.push('Two or more disks are required for Mirror.');
		} else if (t === 'raidz1' && diskCount < 3) {
			errors.push('Three or more disks are required for RaidZ1.');
		} else if (t === 'raidz2' && diskCount < 4) {
			errors.push('Four or more disks are required for RaidZ2.');
		} else if (t === 'raidz3' && diskCount < 5) {
			errors.push('Five or more disks are required for RaidZ3.');
		} else if (diskCount < 1) {
			errors.push(
				`At least one disk is required for ${upperCaseWord(t)}.`,
			);
		}

		// Mirror toggle validation
		if (
			vdev.isMirror &&
			['special', 'dedup', 'log'].includes(t) &&
			diskCount < 2
		) {
			errors.push(
				`Two or more disks are required for Mirror (${upperCaseWord(t)}).`,
			);
		}

		// Replication level check for special/dedup without mirror
		if (
			(t === 'dedup' || t === 'special') &&
			poolConfig.vdevs[0]?.type !== 'disk' &&
			!poolConfig.forceCreate &&
			!vdev.isMirror
		) {
			errors.push(
				'Mismatched replication level. Forcefully create to override.',
			);
		}
	}

	return errors;
}

function validateFileSystem(
	fsConfig: FileSystemConfig,
	datasetNames: string[],
	poolName: string,
): string[] {
	if (!fsConfig.createFileSystem) return [];

	const errors: string[] = [];
	const name = fsConfig.name;

	if (name === '') {
		errors.push('File system name cannot be empty.');
	} else if (!/^[a-zA-Z0-9]/.test(name)) {
		errors.push('File system name must begin with alphanumeric characters.');
	} else if (/^ /.test(name)) {
		errors.push('File system name cannot begin with whitespace.');
	} else if (/ $/.test(name)) {
		errors.push('File system name cannot end with whitespace.');
	} else if (!/^[a-zA-Z0-9_.:-]*$/.test(name)) {
		errors.push('File system name contains invalid characters.');
	} else if (datasetNames.includes(`${poolName}/${name}`)) {
		errors.push(`Name already exists in this location: ${poolName}.`);
	}

	// Encryption checks
	if (fsConfig.encryption.enabled) {
		if (fsConfig.encryption.passphrase === '') {
			errors.push('Passphrase cannot be empty.');
		} else if (fsConfig.encryption.passphrase.length < 8) {
			errors.push('Passphrase requires a minimum of 8 characters.');
		} else if (
			fsConfig.encryption.passphrase !== fsConfig.encryption.passphraseConfirm
		) {
			errors.push('Passphrase does not match.');
		}
	}

	return errors;
}

// ── Props ───────────────────────────────────────

interface CreatePoolWizardProps {
	isOpen: boolean;
	onClose: () => void;
	onCreated: () => void;
}

// ── Component ───────────────────────────────────

export const CreatePoolWizard: React.FC<CreatePoolWizardProps> = ({
	isOpen,
	onClose,
	onCreated,
}) => {
	const {
		disks: allDisks,
		pools,
		datasets,
		importablePools,
		refreshAll,
	} = useZfsData();

	const [poolConfig, setPoolConfig] = useState<PoolConfig>(defaultPoolConfig);
	const [fsConfig, setFsConfig] = useState<FileSystemConfig>(defaultFsConfig);
	const [creationStatus, setCreationStatus] = useState<CreationStatus>('idle');
	const [errorMessage, setErrorMessage] = useState<string>('');

	// Derived data
	const existingPoolNames = useMemo(() => pools.map((p) => p.name), [pools]);
	const datasetNames = useMemo(
		() => datasets.map((d) => d.name ?? d.id ?? ''),
		[datasets],
	);

	// ── Validation ──────────────────────────────
	const poolNameErrors = useMemo(
		() => validatePoolName(poolConfig.name, existingPoolNames),
		[poolConfig.name, existingPoolNames],
	);

	const vdevErrors = useMemo(
		() =>
			validateVDevs(
				poolConfig,
				importablePools.map((p) => p.name),
			),
		[poolConfig, importablePools],
	);

	const fsErrors = useMemo(
		() => validateFileSystem(fsConfig, datasetNames, poolConfig.name),
		[fsConfig, datasetNames, poolConfig.name],
	);

	const poolConfigValid = poolNameErrors.length === 0 && vdevErrors.length === 0;
	const fsValid = fsErrors.length === 0;
	const canFinish = poolConfigValid && fsValid && creationStatus === 'idle';

	// ── Resolve inherited FS properties ─────────
	const resolveInherited = useCallback((): Record<string, string> => {
		const resolved: Record<string, string> = {};

		resolved.compression =
			fsConfig.compression === 'inherited'
				? poolConfig.compression
				: fsConfig.compression;
		resolved.deduplication =
			fsConfig.deduplication === 'inherited'
				? poolConfig.dedup
				: fsConfig.deduplication;
		resolved.recordSize =
			fsConfig.recordSize === 'inherited'
				? String(poolConfig.recordsize)
				: fsConfig.recordSize;
		resolved.accessTime =
			fsConfig.accessTime === 'inherited' ? 'on' : fsConfig.accessTime;
		resolved.caseSensitivity =
			fsConfig.caseSensitivity === 'inherited'
				? 'sensitive'
				: fsConfig.caseSensitivity;
		resolved.dNodeSize =
			fsConfig.dNodeSize === 'inherited' ? 'legacy' : fsConfig.dNodeSize;
		resolved.extendedAttributes =
			fsConfig.extendedAttributes === 'inherited'
				? 'sa'
				: fsConfig.extendedAttributes;

		return resolved;
	}, [fsConfig, poolConfig]);

	// ── Build the pool data for ZFSManager ──────
	const buildPoolData = useCallback((): {
		poolBase: ZPoolBase;
		poolOptions: ZpoolCreateOptions;
	} => {
		const vdevs: VDev[] = poolConfig.vdevs.map((vdevCfg) => {
			const disks = vdevCfg.selectedDisks.map((diskName) => {
				const fullDisk = getFullDiskInfo(allDisks, diskName);
				return fullDisk ?? { name: diskName };
			});

			return {
				type: vdevCfg.type,
				disks,
				isMirror: vdevCfg.isMirror,
			} as VDev;
		});

		const poolBase: ZPoolBase = {
			name: poolConfig.name,
			vdevs,
		};

		const poolOptions: ZpoolCreateOptions = {
			autoexpand: poolConfig.autoexpand,
			autoreplace: poolConfig.autoreplace,
			autotrim: poolConfig.autotrim,
			compression: poolConfig.compression,
			recordsize: Number(poolConfig.recordsize),
			sectorsize: Number(poolConfig.sectorsize),
			dedup: poolConfig.dedup,
			forceCreate: poolConfig.forceCreate,
			refreservationPercent: poolConfig.refreservationPercent,
		};

		return { poolBase, poolOptions };
	}, [poolConfig, allDisks]);

	// ── Create pool + optional FS ───────────────
	const handleFinish = useCallback(async () => {
		setCreationStatus('creating-pool');
		setErrorMessage('');

		const zfsManager = new ZFSManager();
		const { poolBase, poolOptions } = buildPoolData();

		try {
			await zfsManager.createPool(poolBase, poolOptions);

			// Refresh so we can find the new pool
			await refreshAll();

			// Set refreservation
			const newPool = pools.find((p) => p.name === poolConfig.name);
			if (newPool) {
				setRefreservation(newPool, poolConfig.refreservationPercent);
			}

			setCreationStatus('pool-created');

			// ── Optional file system creation ──
			if (fsConfig.createFileSystem) {
				setCreationStatus('creating-filesystem');
				const resolved = resolveInherited();

				const quotaBytes = convertSizeToBytes(
					`${fsConfig.quotaRaw}${fsConfig.quotaUnit}`,
				);
				const quotaStr =
					fsConfig.quotaRaw === 0 ? 'none' : String(quotaBytes);

				if (fsConfig.encryption.enabled) {
					// Encrypted dataset via python helper
					await createEncryptedDataset(
						{
							name: fsConfig.name,
							parent: poolConfig.name,
							encrypted: true,
							encryption: fsConfig.encryption.cipher,
							atime: resolved.accessTime,
							casesensitivity: resolved.caseSensitivity,
							compression: resolved.compression,
							dedup: resolved.deduplication,
							dnodesize: resolved.dNodeSize,
							xattr: resolved.extendedAttributes,
							recordsize: resolved.recordSize,
							quota: quotaStr,
							readonly: isBoolOnOff(fsConfig.isReadOnly),
						},
						fsConfig.encryption.passphrase,
					);
				} else {
					// Non-encrypted dataset via ZFSManager
					await zfsManager.addDataset(poolConfig.name, fsConfig.name, {
						atime: resolved.accessTime,
						casesensitivity: resolved.caseSensitivity,
						compression: resolved.compression,
						dedup: resolved.deduplication,
						dnodesize: resolved.dNodeSize,
						xattr: resolved.extendedAttributes,
						recordsize: resolved.recordSize,
						quota: quotaStr,
						readonly: isBoolOnOff(fsConfig.isReadOnly),
					});
				}

				setCreationStatus('filesystem-created');
			}

			await refreshAll();

			// Brief delay so user sees success indicators
			setTimeout(() => {
				setCreationStatus('idle');
				onCreated();
				handleClose();
			}, 1500);
		} catch (e: any) {
			const msg =
				e?.stderr
					? String(e.stderr).trim()
					: e?.getStderr
						? String(e.getStderr()).trim()
						: e?.message ?? String(e);

			setErrorMessage(msg);
			setCreationStatus('idle');
		}
	}, [
		buildPoolData,
		refreshAll,
		pools,
		poolConfig,
		fsConfig,
		resolveInherited,
		onCreated,
	]);

	// ── Close / reset ───────────────────────────
	const handleClose = useCallback(() => {
		setPoolConfig(defaultPoolConfig());
		setFsConfig(defaultFsConfig());
		setCreationStatus('idle');
		setErrorMessage('');
		onClose();
	}, [onClose]);

	// ── Render ──────────────────────────────────
	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			variant="large"
			aria-label="Create Pool Wizard"
		>
			<ModalHeader title="Create Pool" />
			<ModalBody>
				<Wizard height={500}>
					<WizardStep
						name="Pool Configuration"
						id="pool-config-step"
						status={poolConfigValid ? 'default' : 'error'}
					>
						<PoolConfigStep
							config={poolConfig}
							onChange={setPoolConfig}
							allDisks={allDisks}
							errors={[...poolNameErrors, ...vdevErrors]}
						/>
					</WizardStep>

					<WizardStep
						name="File System"
						id="file-system-step"
						status={fsValid ? 'default' : 'error'}
					>
						<FileSystemStep
							config={fsConfig}
							onChange={setFsConfig}
							poolCompression={poolConfig.compression}
							poolDedup={poolConfig.dedup}
							poolRecordsize={poolConfig.recordsize}
							poolName={poolConfig.name}
							errors={fsErrors}
						/>
					</WizardStep>

					<WizardStep name="Review" id="review-step" isDisabled={!canFinish}>
						<ReviewStep
							poolConfig={poolConfig}
							fsConfig={fsConfig}
							allDisks={allDisks}
							creationStatus={creationStatus}
							errorMessage={errorMessage}
						/>
					</WizardStep>
				</Wizard>
			</ModalBody>
			<ModalFooter>
				<Flex
					justifyContent={{ default: 'justifyContentSpaceBetween' }}
					fullWidth={{ default: 'fullWidth' }}
				>
					<FlexItem>
						<Button variant="danger" onClick={handleClose}>
							Cancel
						</Button>
					</FlexItem>
					<FlexItem>
						{creationStatus === 'idle' ? (
							<Button
								variant="primary"
								onClick={handleFinish}
								isDisabled={!canFinish}
							>
								Create Pool
							</Button>
						) : (
							<Button variant="primary" isDisabled isLoading>
								Creating...
							</Button>
						)}
					</FlexItem>
				</Flex>

				{/* Validation errors in footer */}
				{[...poolNameErrors, ...vdevErrors, ...fsErrors].length > 0 &&
					creationStatus === 'idle' && (
						<Flex direction={{ default: 'column' }}>
							{[...poolNameErrors, ...vdevErrors, ...fsErrors].map(
								(err, i) => (
									<FlexItem key={i}>
										<Alert variant="danger" isInline isPlain title={err} />
									</FlexItem>
								),
							)}
						</Flex>
					)}
			</ModalFooter>
		</Modal>
	);
};

export default CreatePoolWizard;
