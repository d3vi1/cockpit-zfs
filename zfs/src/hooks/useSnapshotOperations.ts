/**
 * Snapshot operations — plain async functions (no React hooks).
 * Ported from composables/snapshots.ts.
 */

import { legacy } from '@45drives/houston-common-lib';
import { convertTimestampToLocal, convertTimestampFormat } from '../utils/formatters';
import type { NewSnapshot, SendingDataset, SnapSnippet } from '../types/index';

// @ts-ignore
import get_snapshots_script from "../scripts/get-snapshots.py?raw";
// @ts-ignore
import send_dataset_script from "../scripts/send-snapshot.py?raw";
// @ts-ignore
import check_dataset_script from "../scripts/check-dataset.py?raw";
// @ts-ignore
import get_recent_snaps_script from "../scripts/find-last-common-snap.py?raw";
// @ts-ignore
import check_remote_snaps_script from "../scripts/check-remote-snapshots.py?raw";

const { errorString, useSpawn } = legacy;

export async function getSnapshots(): Promise<any | null> {
	try {
		const argument = `all`;
		const state = useSpawn(['/usr/bin/env', 'python3', '-c', get_snapshots_script, argument], { superuser: 'try' });
		const snapshots = (await state.promise()).stdout;
		return JSON.parse(snapshots!);
	} catch (error) {
		console.error("Error fetching all snapshots:", error);
		return null;
	}
}

export async function getSnapshotsOfDataset(datasetName: string): Promise<any | null> {
	try {
		const argument = `dataset:${datasetName}`;
		const command = ['/usr/bin/env', 'python3', '-c', get_snapshots_script, argument];
		const state = useSpawn(command, { superuser: 'try' });
		const snapshots = (await state.promise()).stdout;
		return JSON.parse(snapshots!);
	} catch (error) {
		console.error(`Error fetching snapshots for dataset "${datasetName}":`, error);
		return null;
	}
}

export async function getSnapshotsOfPool(poolName: string): Promise<any | null> {
	try {
		const argument = `pool:${poolName}`;
		const command = ['/usr/bin/env', 'python3', '-c', get_snapshots_script, argument];
		const state = useSpawn(command, { superuser: 'try' });
		const snapshots = (await state.promise()).stdout;
		return JSON.parse(snapshots!);
	} catch (error) {
		console.error(`Error fetching snapshots for pool "${poolName}":`, error);
		return null;
	}
}

export async function createSnapshot(newSnap: NewSnapshot) {
	try {
		const cmdString = ['zfs', 'snapshot'];
		if (newSnap.snapChildren) cmdString.push('-r');
		cmdString.push(newSnap.filesystem + '@' + newSnap.name);

		const state = useSpawn(cmdString);
		const output = await state.promise();
		return output.stdout;
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function destroySnapshot(
	snapshotName: string,
	destroyChildrenSameName?: boolean,
	destroyAllChildren?: boolean
) {
	try {
		const cmdString = ['zfs', 'destroy'];
		if (destroyChildrenSameName) cmdString.push('-r');
		if (destroyAllChildren) cmdString.push('-R');
		cmdString.push(snapshotName);

		const state = useSpawn(cmdString);
		const output = await state.promise();
		return output.stdout;
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function rollbackSnapshot(
	snapshot: { name: string },
	destroyNewerSnaps?: boolean,
	destroyAllNewer?: boolean
) {
	try {
		const cmdString = ['zfs', 'rollback'];
		if (destroyNewerSnaps) cmdString.push('-r');
		if (destroyAllNewer) cmdString.push('-R');
		cmdString.push(snapshot.name);

		const state = useSpawn(cmdString);
		const output = await state.promise();
		return output.stdout;
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function renameSnapshot(
	snapshotName: string,
	newName: string,
	renameChildren?: boolean
) {
	try {
		const cmdString = ['zfs', 'rename'];
		if (renameChildren) cmdString.push('-r');
		cmdString.push(snapshotName);
		cmdString.push(newName);

		const state = useSpawn(cmdString);
		const output = await state.promise();
		return output.stdout;
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function cloneSnapshot(
	snapName: string,
	newParentFS: string,
	cloneName: string,
	createParent?: boolean
) {
	try {
		const cmdString = ['zfs', 'clone'];
		if (createParent) cmdString.push('-p');
		cmdString.push(`${snapName}`);
		cmdString.push(`${newParentFS}/${cloneName}`);

		const state = useSpawn(cmdString);
		const output = await state.promise();
		return output.stdout;
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function sendSnapshot(sendingData: SendingDataset) {
	try {
		const state = useSpawn([
			'/usr/bin/env', 'python3', '-c', send_dataset_script,
			sendingData.sendName,
			sendingData.recvName,
			sendingData.sendIncName!,
			sendingData.sendOpts.forceOverwrite!,
			sendingData.sendOpts.compressed,
			sendingData.sendOpts.raw,
			sendingData.recvHost,
			sendingData.recvPort,
			sendingData.recvHostUser,
			sendingData.mBufferConfig!.size,
			sendingData.mBufferConfig!.unit,
		] as any, { superuser: 'try' });

		const output = await state.promise();
		return output.stdout;
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function doesDatasetExist(sendingData: SendingDataset): Promise<boolean | { error: string }> {
	try {
		const state = useSpawn([
			'/usr/bin/env', 'python3', '-c', check_dataset_script,
			sendingData.recvName, sendingData.recvHost, sendingData.recvPort, sendingData.recvHostUser,
		] as any, { superuser: 'try' });

		const output = await state.promise();

		if (output.stdout!.includes('True')) {
			return true;
		} else {
			return false;
		}
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function doesDatasetHaveSnaps(sendingData: SendingDataset): Promise<boolean | { error: string }> {
	try {
		const state = useSpawn([
			'/usr/bin/env', 'python3', '-c', check_remote_snaps_script,
			sendingData.recvName, sendingData.recvHost, sendingData.recvPort, sendingData.recvHostUser,
		] as any, { superuser: 'try' });

		const output = await state.promise();

		if (output.stdout!.includes('True')) {
			return true;
		} else {
			return false;
		}
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function getRecentSnaps(sendingData: SendingDataset): Promise<string> {
	try {
		const state = useSpawn([
			'/usr/bin/env', 'python3', '-c', get_recent_snaps_script,
			sendingData.recvName, sendingData.recvHost, sendingData.recvPort, sendingData.recvHostUser,
		] as any, { superuser: 'try' });

		const output = await state.promise();
		return output.stdout ?? '';
	} catch (state) {
		const errorMessage = errorString(state);
		console.error(errorMessage);
		return JSON.stringify({ error: errorMessage });
	}
}

export async function formatRecentSnaps(sendingData: SendingDataset): Promise<SnapSnippet[]> {
	try {
		const rawJSON = await getRecentSnaps(sendingData);
		const snapSnips: SnapSnippet[] = [];

		if (rawJSON) {
			const parsedJSON = JSON.parse(rawJSON);
			parsedJSON.forEach((snap: any) => {
				if (snap) {
					const snapSnip: SnapSnippet = {
						name: snap.name,
						guid: snap.guid,
						creation: convertTimestampToLocal(convertTimestampFormat(snap.creation)),
					};
					snapSnips.push(snapSnip);
				} else {
					console.log('no recent snaps');
				}
			});
		} else {
			console.error("No data received from getRecentSnaps");
		}

		return snapSnips;
	} catch (error) {
		console.error("An error occurred getting snapSnips:", error);
		return [];
	}
}
