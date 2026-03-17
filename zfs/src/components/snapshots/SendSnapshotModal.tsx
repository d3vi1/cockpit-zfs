/**
 * SendSnapshotModal -- complex modal for sending (replicating) a ZFS snapshot
 * to a local or remote target.
 *
 * Supports full send, incremental send (auto-detected), force overwrite,
 * compressed vs raw mode, SSH remote targets with mBuffer configuration,
 * and real-time progress tracking.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
	Alert,
	AlertVariant,
	Button,
	ButtonVariant,
	Checkbox,
	Flex,
	FlexItem,
	Form,
	FormGroup,
	Grid,
	GridItem,
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalVariant,
	Content,
} from '@patternfly/react-core';

import type { SendingDataset, SendProgress, Snapshot, SnapSnippet } from '../../types/index';
import { useZfsData } from '../../contexts/ZfsDataContext';
import {
	sendSnapshot,
	doesDatasetExist,
	doesDatasetHaveSnaps,
	formatRecentSnaps,
} from '../../hooks/useSnapshotOperations';
import { convertSizeToBytes, getRawTimestampFromString, convertRawTimestampToString, convertTimestampToLocal } from '../../utils/formatters';
import { legacy } from '@45drives/houston-common-lib';
import { RemoteTargetForm } from './RemoteTargetForm';
import { SendProgressView, type SendStatus } from './SendProgressView';

const { BetterCockpitFile } = legacy;

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export interface SendSnapshotModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	snapshot: Snapshot;
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export const SendSnapshotModal: React.FC<SendSnapshotModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	snapshot,
}) => {
	const { pools, datasets, snapshots } = useZfsData();

	// ── Form state ──
	const [destinationName, setDestinationName] = useState('');
	const [destinationHost, setDestinationHost] = useState('');
	const [destinationHostUser, setDestinationHostUser] = useState('');
	const [destinationPort, setDestinationPort] = useState('22');
	const [mBufferSize, setMBufferSize] = useState(1);
	const [mBufferUnit, setMBufferUnit] = useState('G');

	// ── Send options ──
	const [sendCompressed, setSendCompressed] = useState(false);
	const [sendRaw, setSendRaw] = useState(false);
	const [forceOverwrite, setForceOverwrite] = useState(false);

	// ── Validation state ──
	const [invalidConfig, setInvalidConfig] = useState(false);
	const [invalidConfigMsg, setInvalidConfigMsg] = useState('');
	const [invalidDest, setInvalidDest] = useState(false);
	const [invalidDestMsg, setInvalidDestMsg] = useState('');
	const [invalidFlags, setInvalidFlags] = useState(false);
	const [invalidFlagMsg, setInvalidFlagMsg] = useState('');
	const [mostRecentDestSnapMsg, setMostRecentDestSnapMsg] = useState('');
	const useForceOverwriteMsg = "Use 'Force Overwrite' to force a COMPLETE OVERWRITE of Destination File System - including any Encryption.";

	// ── Send state ──
	const [sending, setSending] = useState(false);
	const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
	const [sendPercentage, setSendPercentage] = useState(0);
	const [errorMessage, setErrorMessage] = useState('');

	// ── Refs for progress tracking ──
	const totalSendSizeRef = useRef(0);
	const trackingRef = useRef(false);

	const sendName = snapshot.name;
	const isLocal = destinationHost === '';

	// ── Build SendingDataset from form state ──
	const buildSendingData = useCallback((): SendingDataset => {
		return {
			sendName,
			sendIncName: '',
			recvName: destinationName,
			recvHost: destinationHost,
			recvPort: destinationPort !== '22' ? destinationPort : '22',
			sendOpts: {
				compressed: sendCompressed,
				raw: sendRaw,
				incremental: false,
				forceOverwrite,
			},
			recvHostUser: destinationHostUser,
			mBufferConfig: {
				size: mBufferSize,
				unit: mBufferUnit,
			},
		};
	}, [sendName, destinationName, destinationHost, destinationPort, sendCompressed, sendRaw, forceOverwrite, destinationHostUser, mBufferSize, mBufferUnit]);

	// ── Checkbox mutual exclusion ──
	const handleCompressedChange = useCallback((_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
		setSendCompressed(checked);
		if (checked) setSendRaw(false);
	}, []);

	const handleRawChange = useCallback((_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
		setSendRaw(checked);
		if (checked) setSendCompressed(false);
	}, []);

	// ── Dataset existence checks ──
	const doesLocalDatasetExist = useCallback(() => {
		return datasets.some(d => d.name === destinationName);
	}, [datasets, destinationName]);

	const isLocalDatasetEncrypted = useCallback(() => {
		const ds = datasets.find(d => d.name === destinationName);
		return ds?.encrypted ?? false;
	}, [datasets, destinationName]);

	const doesLocalPoolExist = useCallback(() => {
		const poolName = destinationName.split('/', 1)[0];
		return pools.some(p => p.name === poolName);
	}, [pools, destinationName]);

	// ── Find last common snapshot for incremental send ──
	const findLastCommonSnap = useCallback(async (sendingData: SendingDataset): Promise<Snapshot | null | false> => {
		try {
			const sortedSnapshots = [...snapshots].sort(
				(a, b) => b.creationTimestamp.localeCompare(a.creationTimestamp)
			);
			const sourceDataset = sendName.split('@')[0];
			const sourceDatasetSnaps = sortedSnapshots.filter(s => s.dataset === sourceDataset);
			const sourceSnap = sourceDatasetSnaps.find(s => s.name === sendName);

			if (!sourceSnap) return null;

			if (isLocal) {
				const destDatasetSnaps = sortedSnapshots.filter(s => s.dataset === destinationName);
				if (destDatasetSnaps.length === 0) return false;

				const mostRecentDest = destDatasetSnaps[0];
				if (mostRecentDest.creationTimestamp) {
					if (Number(mostRecentDest.creationTimestamp) < Number(sourceSnap.creationTimestamp)) {
						const match = sourceDatasetSnaps.find(s => s.guid === mostRecentDest.guid);
						return match ?? null;
					} else if (mostRecentDest.guid === sourceSnap.guid) {
						return null;
					}
				}
				return null;
			} else {
				const snapSnips = await formatRecentSnaps(sendingData);
				if (snapSnips.length === 0) return false;

				const mostRecentRemote = snapSnips[0];
				if (mostRecentRemote.guid === sourceSnap.guid) return null;

				const remoteTs = getRawTimestampFromString(mostRecentRemote.creation);
				const sourceTs = getRawTimestampFromString(
					convertTimestampToLocal(convertRawTimestampToString(Number(sourceSnap.creationTimestamp)))
				);

				if (remoteTs != null && sourceTs != null && remoteTs < sourceTs) {
					const match = sourceDatasetSnaps.find(s => s.guid === mostRecentRemote.guid);
					return match ?? null;
				}
				return null;
			}
		} catch (error) {
			console.error('Error checking snapshot:', error);
			return null;
		}
	}, [snapshots, sendName, isLocal, destinationName]);

	// ── Core send logic ──
	// Returns { ok, configConflict } so the caller can decide synchronously
	// (React state setters are async, so we can't rely on `invalidConfig` within the same tick).
	const setSendData = useCallback(async (sendingData: SendingDataset): Promise<{ ok: boolean; configConflict: boolean }> => {
		// Reset validation
		setInvalidConfig(false);
		setInvalidDest(false);
		setInvalidFlags(false);
		setInvalidConfigMsg('');
		setInvalidDestMsg('');
		setInvalidFlagMsg('');
		setMostRecentDestSnapMsg('');

		let configConflict = false;

		if (sendCompressed && sendRaw) {
			setInvalidFlags(true);
			setInvalidFlagMsg('Cannot have Compressed and Raw selected at the same time.');
			return { ok: false, configConflict: false };
		}

		// Check if source is encrypted -> force raw
		const sourceDatasetName = sendName.split('@')[0];
		const sourceDataset = datasets.find(d => d.name === sourceDatasetName);
		if (sourceDataset?.encrypted) {
			sendingData.sendOpts.raw = true;
			sendingData.sendOpts.compressed = false;
		}

		sendingData.sendOpts.forceOverwrite = forceOverwrite;

		if (isLocal) {
			if (doesLocalDatasetExist()) {
				if (!isLocalDatasetEncrypted()) {
					const lastCommon = await findLastCommonSnap(sendingData);
					if (lastCommon !== null && lastCommon !== false) {
						sendingData.sendOpts.incremental = true;
						sendingData.sendIncName = lastCommon.name;
					} else if (lastCommon === false) {
						sendingData.sendOpts.incremental = false;
						configConflict = true;
						setInvalidConfig(true);
						setInvalidConfigMsg('Destination already exists (but has no snapshots).');
					} else {
						sendingData.sendOpts.incremental = false;
						sendingData.sendIncName = '';
						configConflict = true;
						setInvalidConfig(true);
						setInvalidConfigMsg('Destination already exists and has been modified since most recent snapshot.');
					}
				} else {
					sendingData.sendOpts.incremental = false;
					sendingData.sendIncName = '';
					configConflict = true;
					setInvalidConfig(true);
					setInvalidConfigMsg('Destination is encrypted.');
				}
			} else {
				if (doesLocalPoolExist()) {
					sendingData.sendOpts.incremental = false;
					sendingData.sendIncName = '';
				} else {
					setInvalidDest(true);
					setInvalidDestMsg('Destination pool does not exist.');
					return { ok: false, configConflict: false };
				}
			}
		} else {
			const remoteExists = await doesDatasetExist(sendingData);
			if (remoteExists === true) {
				const hasSnaps = await doesDatasetHaveSnaps(sendingData);
				if (hasSnaps === true) {
					const lastCommon = await findLastCommonSnap(sendingData);
					if (lastCommon !== null && lastCommon !== false) {
						sendingData.sendOpts.incremental = true;
						sendingData.sendIncName = lastCommon.name;
					} else if (lastCommon === false) {
						sendingData.sendOpts.incremental = false;
						configConflict = true;
						setInvalidConfig(true);
						setInvalidConfigMsg('Remote destination already exists (but has no snapshots).');
					} else {
						sendingData.sendOpts.incremental = false;
						sendingData.sendIncName = '';
						configConflict = true;
						setInvalidConfig(true);
						setInvalidConfigMsg('Remote destination already exists and has been modified since most recent snapshot.');
					}
				} else {
					sendingData.sendOpts.incremental = false;
					sendingData.sendIncName = '';
					configConflict = true;
					setInvalidConfig(true);
					setInvalidConfigMsg('Remote destination already exists.');
				}
			} else {
				sendingData.sendOpts.incremental = false;
				sendingData.sendIncName = '';
			}
			sendingData.mBufferConfig = { size: mBufferSize, unit: mBufferUnit };
		}

		return { ok: true, configConflict };
	}, [sendCompressed, sendRaw, forceOverwrite, sendName, datasets, isLocal, doesLocalDatasetExist, isLocalDatasetEncrypted, doesLocalPoolExist, findLastCommonSnap, mBufferSize, mBufferUnit]);

	// ── Progress tracking ──
	const readSendProgress = useCallback(async (fileReader: any) => {
		try {
			let initialRun = true;
			let nullRun = true;

			fileReader.watch((content: any) => {
				if (initialRun && nullRun) {
					initialRun = false;
				} else if (!initialRun && nullRun) {
					nullRun = false;
				} else {
					trackingRef.current = true;
					if (content != null) {
						totalSendSizeRef.current = convertSizeToBytes(content.totalSize);
						const sentBytes = convertSizeToBytes(content.sent);
						const pct = totalSendSizeRef.current > 0
							? (sentBytes / totalSendSizeRef.current) * 100
							: 0;
						setSendPercentage(Math.min(pct, 100));
					}
				}
			}, {});
		} catch (error) {
			console.error('Error reading send progress:', error);
		}
	}, []);

	const sendAndReadProgress = useCallback(async (sendingData: SendingDataset) => {
		try {
			const fileReader = new BetterCockpitFile('/run/user/0/full_output.json', { syntax: JSON } as any);
			const [snapshotResult] = await Promise.all([
				sendSnapshot(sendingData),
				readSendProgress(fileReader),
			]);
			fileReader.close();
			return snapshotResult;
		} catch (error) {
			console.error('Error in sendAndReadProgress:', error);
			throw error;
		}
	}, [readSendProgress]);

	// ── Send button handler ──
	const handleSend = useCallback(async () => {
		setErrorMessage('');
		const sendingData = buildSendingData();

		const { ok, configConflict } = await setSendData(sendingData);
		if (!ok) return;

		// Check if we hit a conflict that requires force overwrite
		if (configConflict && !forceOverwrite) {
			return;
		}

		setSending(true);
		setSendStatus('sending');
		setSendPercentage(0);
		trackingRef.current = false;

		try {
			await sendAndReadProgress(sendingData);
			setSendStatus('completed');
			setSendPercentage(100);
			onSuccess();
			onClose();
		} catch (error: any) {
			console.error('Error sending snapshot:', error);
			setSendStatus('failed');
			setErrorMessage(
				`Failed to send snapshot ${snapshot.name} to ${sendingData.recvName}: ${error?.message || 'Unknown error'}`
			);
		} finally {
			setSending(false);
			trackingRef.current = false;
		}
	}, [buildSendingData, setSendData, forceOverwrite, sendAndReadProgress, snapshot.name, onSuccess, onClose]);

	// Determine if send button should be disabled
	const isSendDisabled = sending || (invalidConfig && !forceOverwrite) || invalidFlags || invalidDest;

	return (
		<Modal
			variant={ModalVariant.large}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="send-snapshot-modal-title"
		>
			<ModalHeader title="Send Dataset" />
			<ModalBody>
				<Grid hasGutter>
					{/* Snapshot name display */}
					<GridItem span={6}>
						<FormGroup label="Snapshot To Send" fieldId="send-snap-name">
							<Content component="p">{sendName}</Content>
						</FormGroup>
					</GridItem>

					{/* Remote target form */}
					<GridItem span={12}>
						<RemoteTargetForm
							destinationName={destinationName}
							onDestinationNameChange={setDestinationName}
							destinationHost={destinationHost}
							onDestinationHostChange={setDestinationHost}
							destinationHostUser={destinationHostUser}
							onDestinationHostUserChange={setDestinationHostUser}
							destinationPort={destinationPort}
							onDestinationPortChange={setDestinationPort}
							mBufferSize={mBufferSize}
							onMBufferSizeChange={setMBufferSize}
							mBufferUnit={mBufferUnit}
							onMBufferUnitChange={setMBufferUnit}
							invalidDest={invalidDest}
							invalidDestMsg={invalidDestMsg}
							invalidConfig={invalidConfig}
							invalidConfigMsg={invalidConfigMsg}
							mostRecentDestSnapMsg={mostRecentDestSnapMsg}
							useForceOverwriteMsg={invalidConfig ? useForceOverwriteMsg : undefined}
						/>
					</GridItem>

					{/* Send options */}
					<GridItem span={12}>
						<Flex spaceItems={{ default: 'spaceItemsLg' }}>
							<FlexItem>
								<Checkbox
									id="send-compressed"
									label="Send Compressed"
									isChecked={sendCompressed}
									onChange={handleCompressedChange}
								/>
							</FlexItem>
							<FlexItem>
								<Checkbox
									id="send-raw"
									label="Send Raw"
									isChecked={sendRaw}
									onChange={handleRawChange}
								/>
							</FlexItem>
							{invalidConfig && (
								<FlexItem>
									<Checkbox
										id="force-overwrite"
										label="Force Overwrite"
										isChecked={forceOverwrite}
										onChange={(_event, checked) => setForceOverwrite(checked)}
									/>
								</FlexItem>
							)}
						</Flex>
					</GridItem>

					{invalidFlags && (
						<GridItem span={12}>
							<Alert variant={AlertVariant.danger} isInline isPlain title={invalidFlagMsg} />
						</GridItem>
					)}

					{errorMessage && (
						<GridItem span={12}>
							<Alert variant={AlertVariant.danger} isInline title="Send Failed">
								{errorMessage}
							</Alert>
						</GridItem>
					)}
				</Grid>
			</ModalBody>

			<ModalFooter>
				<Flex
					alignItems={{ default: 'alignItemsCenter' }}
					spaceItems={{ default: 'spaceItemsMd' }}
					flexWrap={{ default: 'nowrap' }}
					grow={{ default: 'grow' }}
				>
					<FlexItem>
						<Button variant={ButtonVariant.danger} onClick={onClose}>
							Cancel
						</Button>
					</FlexItem>

					{sending && (
						<FlexItem grow={{ default: 'grow' }}>
							<SendProgressView
								status={sendStatus}
								percentage={sendPercentage}
								isOverwriting={forceOverwrite}
							/>
						</FlexItem>
					)}

					<FlexItem>
						<Button
							variant={ButtonVariant.primary}
							onClick={handleSend}
							isDisabled={isSendDisabled}
							isLoading={sending}
							spinnerAriaValueText={sending ? 'Sending' : undefined}
						>
							{sending
								? (forceOverwrite ? 'Overwriting...' : 'Sending...')
								: 'Send'}
						</Button>
					</FlexItem>
				</Flex>
			</ModalFooter>
		</Modal>
	);
};

export default SendSnapshotModal;
