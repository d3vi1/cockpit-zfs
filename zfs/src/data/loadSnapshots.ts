/**
 * Snapshot loading — framework-agnostic (no React, no Vue).
 * Ported from composables/loadData.ts.
 *
 * Returns data instead of mutating external refs.
 */

import type { Snapshot } from '../types/index';
import { convertTimestampToLocal } from '../utils/formatters';
import { getSnapshots, getSnapshotsOfPool, getSnapshotsOfDataset } from '../hooks/useSnapshotOperations';

/**
 * Parse raw snapshot JSON into a sorted Snapshot array.
 */
function parseSnapshots(rawJSON: Record<string, any[]>): Snapshot[] {
	const allSnapshots: Snapshot[] = [];

	for (const dataset in rawJSON) {
		rawJSON[dataset].forEach((snapshot: any) => {
			const snap: Snapshot = {
				name: snapshot.name,
				id: snapshot.id,
				snapName: snapshot.snapshot_name,
				dataset: snapshot.dataset,
				pool: snapshot.pool,
				mountpoint: snapshot.mountpoint,
				type: snapshot.type,
				guid: snapshot.properties.guid.value,
				creationTimestamp: snapshot.properties.creation.rawvalue,
				properties: snapshot.properties,
				holds: snapshot.holds,
			};
			allSnapshots.push(snap);
		});
	}

	return allSnapshots.sort((a, b) => parseFloat(a.creationTimestamp) - parseFloat(b.creationTimestamp));
}

/**
 * Parse raw snapshot JSON with detailed properties (used for per-dataset loading).
 */
function parseSnapshotsDetailed(rawJSON: Record<string, any[]>): Snapshot[] {
	const allSnapshots: Snapshot[] = [];

	for (const dataset in rawJSON) {
		rawJSON[dataset].forEach((snapshot: any) => {
			const snap: Snapshot = {
				name: snapshot.name,
				id: snapshot.id,
				snapName: snapshot.snapshot_name,
				dataset: snapshot.dataset,
				pool: snapshot.pool,
				mountpoint: snapshot.mountpoint,
				type: snapshot.type,
				guid: snapshot.properties.guid.value,
				creationTimestamp: snapshot.properties.creation.rawvalue,
				properties: {
					clones: snapshot.properties.clones.parsed,
					creation: {
						rawTimestamp: snapshot.properties.creation.rawvalue,
						parsed: convertTimestampToLocal(snapshot.properties.creation.parsed),
						value: snapshot.properties.creation.value,
					},
					referenced: snapshot.properties.referenced,
					used: snapshot.properties.used,
				},
				holds: snapshot.holds,
			};
			allSnapshots.push(snap);
		});
	}

	return allSnapshots.sort((a, b) => parseFloat(a.creationTimestamp) - parseFloat(b.creationTimestamp));
}

/**
 * Load all snapshots across all datasets.
 */
export async function loadSnapshots(): Promise<Snapshot[]> {
	try {
		const rawJSON = await getSnapshots();
		if (!rawJSON) return [];
		return parseSnapshots(rawJSON);
	} catch (error) {
		console.error("An error occurred getting snapshots:", error);
		return [];
	}
}

/**
 * Load snapshots for a specific pool.
 */
export async function loadSnapshotsInPool(poolName: string): Promise<Snapshot[]> {
	try {
		const rawJSON = await getSnapshotsOfPool(poolName);
		if (!rawJSON) return [];
		const snapshots = parseSnapshots(rawJSON);
		console.log('loaded snapshots in:', poolName, '\n', snapshots);
		return snapshots;
	} catch (error) {
		console.error("An error occurred getting snapshots:", error);
		return [];
	}
}

/**
 * Load snapshots for a specific dataset.
 * Returns { snapshots, found } where `found` indicates whether any snapshots exist.
 */
export async function loadSnapshotsInDataset(
	datasetName: string
): Promise<{ snapshots: Snapshot[]; found: boolean }> {
	try {
		const rawJSON = await getSnapshotsOfDataset(datasetName);
		if (!rawJSON) return { snapshots: [], found: false };

		const snapshots = parseSnapshotsDetailed(rawJSON);
		console.log('loaded snapshots in:', datasetName, '\n', snapshots);

		return {
			snapshots,
			found: snapshots.length > 0,
		};
	} catch (error) {
		console.error("An error occurred getting snapshots:", error);
		return { snapshots: [], found: false };
	}
}
