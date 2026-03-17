/**
 * Importable pool loading — framework-agnostic (no React, no Vue).
 * Ported from composables/loadImportables.ts.
 *
 * Returns arrays instead of mutating refs.
 */

import type { VDev } from '@45drives/houston-common-lib';
import type { ImportablePoolData } from '../types/index';
import { safeParse } from '../utils/json';
import { getImportablePools, getImportableDestroyedPools } from '../hooks/usePoolOperations';

const errors: string[] = [];

// ────────────────────────────────────────────────
// Parse a single importable VDev
// ────────────────────────────────────────────────

export function parseImportVDevData(
	vDev: any,
	poolName: string,
	vDevType: string,
	vDevs: VDev[]
): void {
	try {
		const vDevData: VDev = {
			name: vDev.name,
			type: vDevType,
			status: vDev.status,
			guid: vDev.guid,
			stats: vDev.stats,
			disks: vDev.children,
			poolName: poolName,
			selectedDisks: [],
		};

		vDevs.push(vDevData);
	} catch (error) {
		console.error("An error occurred getting vdevs for Importable pools:", error);
	}
}

// ────────────────────────────────────────────────
// Parse all VDev groups for a pool
// ────────────────────────────────────────────────

function parseAllVDevGroups(raw: any, poolName: string): VDev[] {
	const vDevs: VDev[] = [];
	raw.groups.data.forEach((vDev: any) => parseImportVDevData(vDev, poolName, 'data', vDevs));
	raw.groups.cache.forEach((vDev: any) => parseImportVDevData(vDev, poolName, 'cache', vDevs));
	raw.groups.dedup.forEach((vDev: any) => parseImportVDevData(vDev, poolName, 'dedup', vDevs));
	raw.groups.log.forEach((vDev: any) => parseImportVDevData(vDev, poolName, 'log', vDevs));
	raw.groups.spare.forEach((vDev: any) => parseImportVDevData(vDev, poolName, 'spare', vDevs));
	raw.groups.special.forEach((vDev: any) => parseImportVDevData(vDev, poolName, 'special', vDevs));
	return vDevs;
}

// ────────────────────────────────────────────────
// Load importable pools
// ────────────────────────────────────────────────

export async function loadImportablePools(): Promise<ImportablePoolData[]> {
	try {
		const rawJSON = await getImportablePools();
		const parsedJSON = safeParse<any[]>(rawJSON, []);

		const importablePools: ImportablePoolData[] = [];

		for (let i = 0; i < parsedJSON.length; i++) {
			const vDevs = parseAllVDevGroups(parsedJSON[i], parsedJSON[i].name);

			const poolData: ImportablePoolData = {
				name: parsedJSON[i].name,
				status: parsedJSON[i].status,
				guid: parsedJSON[i].guid,
				properties: parsedJSON[i].properties,
				scan: parsedJSON[i].scan,
				vdevs: vDevs,
				isDestroyed: false,
				errors: errors,
			};

			importablePools.push(poolData);
		}

		return importablePools;
	} catch (error) {
		console.error("An error occurred getting Importable pools:", error);
		return [];
	}
}

// ────────────────────────────────────────────────
// Load importable destroyed pools
// ────────────────────────────────────────────────

export async function loadImportableDestroyedPools(): Promise<ImportablePoolData[]> {
	try {
		const rawJSON = await getImportableDestroyedPools();
		const parsedJSON = safeParse<any[]>(rawJSON, []);

		const importablePools: ImportablePoolData[] = [];

		for (let i = 0; i < parsedJSON.length; i++) {
			const vDevs = parseAllVDevGroups(parsedJSON[i], parsedJSON[i].name);

			const poolData: ImportablePoolData = {
				name: parsedJSON[i].name,
				status: parsedJSON[i].status,
				guid: parsedJSON[i].guid,
				properties: parsedJSON[i].properties,
				scan: parsedJSON[i].scan,
				vdevs: vDevs,
				isDestroyed: true,
				errors: errors,
			};

			importablePools.push(poolData);
		}

		console.log("loaded Importable Destroyed Pools:", importablePools);
		return importablePools;
	} catch (error) {
		console.error("An error occurred getting destroyed importable pools:", error);
		return [];
	}
}
