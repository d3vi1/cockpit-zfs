/**
 * Pool & disk loading — framework-agnostic (no React, no Vue).
 * Ported from composables/loadData.ts.
 *
 * All functions RETURN data instead of mutating external refs.
 */

import type { VDev, VDevDisk, ZPool } from '@45drives/houston-common-lib';
import { matchDiskByVdevOrPath } from '../utils/helpers';
import {
	convertBytesToSize,
	isCapacityPatternInvalid,
	formatCapacityString,
	changeUnitToBinary,
} from '../utils/formatters';
import { onOffToBool } from '../utils/helpers';
import { unpackArray } from '../utils/json';
import { getDisks } from '../hooks/useDiskOperations';
import { getPools } from '../hooks/usePoolOperations';
import { parseVDevData, cleanDiskPath } from './parseVDev';

const errors: string[] = [];

// ────────────────────────────────────────────────
// Disk building from raw JSON
// ────────────────────────────────────────────────

function buildDisk(raw: any): VDevDisk {
	const rawCap = isCapacityPatternInvalid(raw.capacity)
		? formatCapacityString(raw.capacity)
		: raw.capacity;

	return {
		name: raw.name,
		capacity: changeUnitToBinary(rawCap),
		model: raw.model,
		type: raw.type === 'Disk' ? 'Disk' : raw.type,
		phy_path: raw.phy_path || 'N/A',
		sd_path: raw.sd_path || 'N/A',
		vdev_path: raw.type === 'NVMe' ? raw.sd_path : raw.vdev_path,
		serial: raw.serial || 'N/A',
		usable: raw.usable || false,
		path: raw.type === 'NVMe' ? raw.sd_path : raw.vdev_path,
		guid: '',
		status: raw.health || 'Unknown',
		powerOnHours: raw.power_on_time || 0,
		powerOnCount: raw.power_on_count || 0,
		temp: raw.temp || 'N/A',
		rotationRate: raw.rotation_rate || 0,
		stats: {},
		errors: errors,
		hasPartitions: raw.has_partitions || false,
	} as any;
}

// ────────────────────────────────────────────────
// Build a pool from parsed JSON
// ────────────────────────────────────────────────

function buildPool(raw: any, vDevs: VDev[]): any {
	if (raw.root_dataset != null) {
		const rawCap = isCapacityPatternInvalid(raw.properties.capacity.rawvalue)
			? formatCapacityString(raw.properties.capacity.rawvalue)
			: raw.properties.capacity.rawvalue;

		return {
			name: raw.name,
			status: raw.status_code === 'OK' ? raw.status : raw.properties.health.parsed,
			guid: raw.guid,
			properties: {
				rawsize: raw.properties.size.parsed,
				size: changeUnitToBinary(convertBytesToSize(raw.properties.size.parsed)),
				allocated: convertBytesToSize(raw.properties.allocated.parsed),
				capacity: raw.properties.capacity.rawvalue,
				free: changeUnitToBinary(convertBytesToSize(raw.properties.free.parsed)),
				readOnly: raw.properties.readonly.parsed,
				sector: raw.properties.ashift.rawvalue,
				record: raw.root_dataset.properties.recordsize.value,
				compression: raw.root_dataset.properties.compression.parsed,
				deduplication: onOffToBool(raw.root_dataset.properties.dedup.parsed),
				refreservationRawSize: raw.root_dataset.properties.refreservation.parsed,
				refreservationPercent: raw.root_dataset
					? Number(((raw.root_dataset.properties.refreservation.parsed / raw.properties.size.parsed) * 100).toFixed(2))
					: 0,
				autoExpand: raw.properties.autoexpand.parsed,
				autoReplace: raw.properties.autoreplace.parsed,
				autoTrim: onOffToBool(raw.properties.autotrim.parsed),
				delegation: raw.properties.delegation.parsed,
				listSnapshots: raw.properties.listsnapshots.parsed,
				health: raw.properties.health.parsed,
				altroot: raw.properties.altroot.value,
				available: raw?.root_dataset?.properties?.available?.parsed != null
					? changeUnitToBinary(convertBytesToSize(raw.root_dataset.properties.available.parsed))
					: 'N/A',
			},
			failMode: raw.properties.failmode.parsed,
			comment: raw.properties.comment.value !== '-' ? raw.properties.comment.value : '',
			scan: {
				name: raw.name,
				function: raw.scan.function,
				start_time: raw.scan.start_time,
				end_time: raw.scan.end_time,
				pause: raw.scan.pause,
				state: raw.scan.state,
				errors: raw.scan.errors,
				percentage: raw.scan.percentage,
				total_secs_left: raw.scan.total_secs_left,
				bytes_issued: raw.scan.bytes_issued,
				bytes_processed: raw.scan.bytes_processed,
				bytes_to_process: raw.scan.bytes_to_process,
			},
			errors: errors,
			statusCode: raw.status_code,
			statusDetail: raw.status_detail,
			errorCount: raw.error_count,
			vdevs: [...vDevs],
		};
	} else {
		const rawCap = isCapacityPatternInvalid(String(raw.properties.capacity.rawvalue))
			? formatCapacityString(String(raw.properties.capacity.rawvalue))
			: raw.properties.capacity.rawvalue;

		return {
			name: raw.name,
			status: raw.status_code === 'OK' ? raw.status : raw.properties.health.parsed,
			guid: raw.guid,
			properties: {
				rawsize: raw.properties.size.parsed,
				size: convertBytesToSize(raw.properties.size.parsed),
				allocated: convertBytesToSize(raw.properties.allocated.parsed),
				capacity: Number(raw.properties.capacity.rawvalue),
				free: convertBytesToSize(raw.properties.free.parsed),
				readOnly: raw.properties.readonly.parsed,
				sector: raw.properties.ashift.rawvalue,
				record: '',
				compression: false,
				deduplication: false,
				refreservationRawSize: 0,
				refreservationPercent: raw.root_dataset
					? Number(((raw.root_dataset.properties.refreservation.parsed / raw.properties.size.parsed) * 100).toFixed(2))
					: 0,
				autoExpand: raw.properties.autoexpand.parsed,
				autoReplace: raw.properties.autoreplace.parsed,
				autoTrim: onOffToBool(raw.properties.autotrim.parsed),
				delegation: raw.properties.delegation.parsed,
				listSnapshots: raw.properties.listsnapshots.parsed,
				health: raw.properties.health.parsed,
				altroot: raw.properties.altroot.value,
				available: raw?.root_dataset?.properties?.available?.parsed != null
					? convertBytesToSize(raw.root_dataset.properties.available.parsed)
					: 'N/A',
			},
			failMode: raw.properties.failmode.parsed,
			comment: raw.properties.comment.value !== '-' ? raw.properties.comment.value : '',
			scan: {
				name: raw.name,
				function: raw.scan.function,
				start_time: raw.scan.start_time,
				end_time: raw.scan.end_time,
				pause: raw.scan.pause,
				state: raw.scan.state,
				errors: raw.scan.errors,
				percentage: raw.scan.percentage,
				total_secs_left: raw.scan.total_secs_left,
				bytes_issued: raw.scan.bytes_issued,
				bytes_processed: raw.scan.bytes_processed,
				bytes_to_process: raw.scan.bytes_to_process,
			},
			errors: errors,
			statusCode: raw.status_code,
			statusDetail: raw.status_detail,
			errorCount: raw.error_count,
			vdevs: [...vDevs],
		};
	}
}

// ────────────────────────────────────────────────
// Extra disk data enrichment from pool vdev info
// ────────────────────────────────────────────────

export function loadDisksExtraData(disks: VDevDisk[], pools: ZPool[]): VDevDisk[] {
	const result = [...disks];
	try {
		pools.forEach((pool: any) => {
			pool.vdevs.forEach((vDev: any) => {
				vDev.disks.forEach((usedDisk: any) => {
					const cleanedUsedDiskPath = cleanDiskPath(usedDisk.path);
					const selectedDisk = matchDiskByVdevOrPath(result, cleanedUsedDiskPath);
					let statsObject: any;

					if (
						(selectedDisk && (selectedDisk as any).type === 'NVMe') ||
						(selectedDisk && (selectedDisk as any).type === 'Disk') ||
						!usedDisk.stats
					) {
						statsObject = vDev.stats;
					} else {
						statsObject = usedDisk.stats;
					}

					if (selectedDisk) {
						const index = result.findIndex(disk =>
							[cleanDiskPath((disk as any).sd_path), cleanDiskPath((disk as any).phy_path), cleanDiskPath((disk as any).vdev_path)].includes(cleanedUsedDiskPath)
						);

						if (index !== -1) {
							const orig = result[index];
							result[index] = {
								...orig,
								guid: usedDisk.guid ?? (orig as any).guid,
								path: usedDisk.path ?? (orig as any).path,
								stats: statsObject ?? (orig as any).stats,
							} as any;
						} else {
							console.error('Original disk not found in the disks array');
						}
					} else {
						console.log('Selected disk not found', usedDisk);
					}
				});
			});
		});
	} catch (error) {
		console.error("An error occurred getting extra disk data:", error);
	}
	return result;
}

// ────────────────────────────────────────────────
// Load just disks (standalone)
// ────────────────────────────────────────────────

export async function loadDisks(): Promise<VDevDisk[]> {
	try {
		const rawJSON = await getDisks();
		const { data: parsedJSON, error } = unpackArray<any>(rawJSON, []);
		if (error) console.warn('getDisks error:', error);

		return parsedJSON.map(buildDisk);
	} catch (error) {
		console.error("An error occurred getting disks:", error);
		return [];
	}
}

// ────────────────────────────────────────────────
// Load disks, then pools (main orchestrator)
// Returns { disks, pools } instead of mutating refs
// ────────────────────────────────────────────────

export async function loadDisksThenPools(): Promise<{ disks: VDevDisk[]; pools: ZPool[] }> {
	let disks: VDevDisk[] = [];
	let pools: ZPool[] = [];

	try {
		// Load disks
		const rawDiskJSON = await getDisks();
		const { data: parsedDiskJSON, error: disksErr } = unpackArray<any>(rawDiskJSON, []);
		if (disksErr) console.warn('getDisks error:', disksErr);
		console.log('Disks JSON:', parsedDiskJSON);

		disks = parsedDiskJSON.map(buildDisk);

		// Load pools
		try {
			const rawPoolJSON = await getPools();
			const { data: parsedPoolJSON, error: poolsErr } = unpackArray<any>(rawPoolJSON, []);
			if (poolsErr) console.warn('getPools error:', poolsErr);

			for (let i = 0; i < parsedPoolJSON.length; i++) {
				const vDevs: VDev[] = [];

				// Parse VDevs for each group type
				parsedPoolJSON[i].groups.data.forEach((vDev: any) => parseVDevData(vDev, parsedPoolJSON[i].name, disks, 'data', vDevs));
				parsedPoolJSON[i].groups.cache.forEach((vDev: any) => parseVDevData(vDev, parsedPoolJSON[i].name, disks, 'cache', vDevs));
				parsedPoolJSON[i].groups.dedup.forEach((vDev: any) => parseVDevData(vDev, parsedPoolJSON[i].name, disks, 'dedup', vDevs));
				parsedPoolJSON[i].groups.log.forEach((vDev: any) => parseVDevData(vDev, parsedPoolJSON[i].name, disks, 'log', vDevs));
				parsedPoolJSON[i].groups.spare.forEach((vDev: any) => parseVDevData(vDev, parsedPoolJSON[i].name, disks, 'spare', vDevs));
				parsedPoolJSON[i].groups.special.forEach((vDev: any) => parseVDevData(vDev, parsedPoolJSON[i].name, disks, 'special', vDevs));

				const poolData = buildPool(parsedPoolJSON[i], vDevs);
				pools.push(poolData);
				console.log("poolData after JSON load:", poolData);
			}

			// Compute pool disk types
			const poolDiskTypes = pools.map((pool: any) => {
				const vDevDiskTypes = pool.vdevs.map((vDev: any) => {
					const diskTypes = vDev.disks.map((disk: any) => disk.type);
					const allSameDiskType = diskTypes.every((type: string) => type === diskTypes[0]);
					return allSameDiskType ? diskTypes[0] : 'Hybrid';
				});
				const allSameDiskType = vDevDiskTypes.every((type: string) => type === vDevDiskTypes[0]);
				return allSameDiskType ? vDevDiskTypes[0] : 'Hybrid';
			});

			pools.forEach((pool: any, index: number) => {
				pool.diskType = poolDiskTypes[index];
			});

			console.log("loaded Pools:", pools);

			// Enrich disks with extra data from pools
			disks = loadDisksExtraData(disks, pools);

			console.log("loaded Disks:", disks);
		} catch (error) {
			console.error("An error occurred getting pools:", error);
		}
	} catch (error) {
		console.error("An error occurred getting disks/pools:", error);
	}

	return { disks, pools };
}
