/**
 * VDev parsing logic — extracted from composables/loadData.ts.
 * Framework-agnostic: works with plain arrays, no Vue refs.
 */

import type { VDev, VDevDisk } from '@45drives/houston-common-lib';
import { matchDiskByVdevOrPath } from '../utils/helpers';
import { isCapacityPatternInvalid, formatCapacityString, changeUnitToBinary } from '../utils/formatters';

const errors: string[] = [];

// ────────────────────────────────────────────────
// Path regex and prefix constants
// ────────────────────────────────────────────────

const phyPathRegex = /\/dev\/disk\/by-path\/[0-9a-zA-Z:.\-]+(?:-part[0-9]+)?$/;
const sdPathRegex = /\/dev\/sd[a-z0-9]+[0-9]*$/;
const nvmePathRegex = /\/dev\/nvme[0-9]+n[0-9]+(?:p[0-9]+)?$/;
const vDevPathRegex = /\/dev\/disk\/by-vdev\/[0-9a-zA-Z\-]+(?:-part[0-9]+)?$/;
const idPathRegex = /\/dev\/disk\/by-id\/[0-9a-zA-Z:\-]+(?:-part[0-9]+)?$/;
const labelPathRegex = /\/dev\/disk\/by-label\/[0-9a-zA-Z\-]+(?:-part[0-9]+)?$/;
const partLabelPathRegex = /\/dev\/disk\/by-partlabel\/[0-9a-zA-Z\-]+(?:-part[0-9]+)?$/;
const partUUIDRegex = /\/dev\/disk\/by-partuuid\/[0-9a-zA-Z\-]+$/;
const uuidRegex = /\/dev\/disk\/by-uuid\/[0-9a-zA-Z\-]+$/;

const phyPathPrefix = '/dev/disk/by-path/';
const sdPathPrefix = '/dev/';
const idPathPrefix = '/dev/disk/by-id/';
const labelPathPrefix = '/dev/disk/by-label/';
const partLabelPathPrefix = '/dev/disk/by-partlabel/';
const partUUIDPrefix = '/dev/disk/by-partuuid/';
const uuidPrefix = '/dev/disk/by-uuid/';

// ────────────────────────────────────────────────
// Helper: clean disk path (remove partition numbers)
// ────────────────────────────────────────────────

export function cleanDiskPath(path: string | undefined | null): string {
	if (!path) return '';

	// /dev/sda1 → /dev/sda
	if (/\/dev\/sd[a-z][0-9]+$/.test(path)) {
		return path.replace(/[0-9]+$/, '');
	}

	// /dev/nvme0n1p2 → /dev/nvme0n1
	if (/\/dev\/nvme\d+n\d+p\d+$/.test(path)) {
		return path.replace(/p\d+$/, '');
	}

	// /dev/disk/by-vdev/1-1-part1 → /dev/disk/by-vdev/1-1
	if (/-part\d+$/.test(path)) {
		return path.replace(/-part\d+$/, '');
	}

	return path;
}

// ────────────────────────────────────────────────
// Create a missing-disk placeholder
// ────────────────────────────────────────────────

export function createMissingDisk(
	path: string,
	vDevName: string,
	vDevType: string,
	poolName: string
): any {
	return {
		name: 'Missing Disk',
		path: path,
		guid: 'N/A',
		type: 'N/A',
		health: 'MISSING',
		stats: {},
		capacity: 'Unknown',
		model: 'N/A',
		phy_path: path,
		sd_path: '',
		vdev_path: '',
		serial: 'N/A',
		powerOnHours: 0,
		powerOnCount: '0',
		temp: '0',
		rotationRate: 0,
		vDevName: vDevName,
		poolName: poolName,
		vDevType: vDevType,
		errors: [`Disk missing from pool: ${poolName}, vDev: ${vDevName}`],
	};
}

// ────────────────────────────────────────────────
// Determine the disk-type composition of a VDev
// ────────────────────────────────────────────────

export function determineDiskType(vDev: any, disks: VDevDisk[]): string {
	const childDisks = vDev.children.map((child: any) => child.name);

	const diskTypes = childDisks.map((diskName: string) => {
		const disk = disks.find(d => d.name === diskName);
		return disk ? disk.type : 'MISSING';
	});

	const uniqueDiskTypes = new Set(diskTypes);

	if (uniqueDiskTypes.has('MISSING')) {
		return 'MISSING';
	} else if (uniqueDiskTypes.size === 1) {
		return Array.from(uniqueDiskTypes)[0] as string;
	} else if (uniqueDiskTypes.has('Disk')) {
		return 'Disk';
	} else if (uniqueDiskTypes.has('SSD') || uniqueDiskTypes.has('HDD') || uniqueDiskTypes.has('NVMe')) {
		return 'Hybrid';
	} else {
		return 'Unknown';
	}
}

// ────────────────────────────────────────────────
// Handle a single disk child within a VDev
// ────────────────────────────────────────────────

function handleDiskChild(
	child: any,
	vDevData: VDev,
	disks: VDevDisk[],
	vDevName: string,
	poolName: string,
	vDevType: string
): (VDevDisk & { replacingTargetLabel?: string }) | null {
	if (!child || child.path === null) {
		return null;
	}

	const cleanedChildPath = cleanDiskPath(child.path);

	// exact match on base device paths only
	let fullDiskData: any = disks.find(disk => {
		const sdBase = cleanDiskPath((disk as any).sd_path);
		const phyBase = cleanDiskPath((disk as any).phy_path);
		const vdevBase = cleanDiskPath((disk as any).vdev_path);
		const pathBase = cleanDiskPath((disk as any).path);

		return (
			sdBase === cleanedChildPath ||
			phyBase === cleanedChildPath ||
			vdevBase === cleanedChildPath ||
			pathBase === cleanedChildPath
		);
	});

	// If no matching disk was found, create a missing disk ONLY if the original disk is truly missing
	if (!fullDiskData && (child.path === null || child.path === "")) {
		console.warn(`Disk not found for path: ${child.path}. Creating placeholder.`);
		fullDiskData = createMissingDisk(child.path, vDevName, vDevType, poolName);
		if (!vDevData.disks.some((disk: any) => disk.path === fullDiskData!.path)) {
			vDevData.disks.push(fullDiskData);
		}
	}

	// If fullDiskData is still null (but child has a valid path), try to recover it
	if (!fullDiskData) {
		// 1) If the child path is a by-vdev partition, match its base by-vdev
		const vdevBase = cleanedChildPath.replace(/-part\d+$/, '');
		fullDiskData = disks.find(d =>
			cleanDiskPath((d as any).vdev_path) === vdevBase ||
			cleanDiskPath((d as any).sd_path) === vdevBase ||
			cleanDiskPath((d as any).phy_path) === vdevBase
		);

		if (fullDiskData) {
			console.warn(`Recovered disk via safety net using ${vdevBase}`);
		} else {
			// 2) Still nothing → create a real placeholder
			console.warn(`Disk marked as REMOVED but not found in disks array: ${child.path}`);
			fullDiskData = {
				name: child.name || "Unknown",
				path: child.path,
				guid: child.guid || "N/A",
				type: "N/A",
				health: "REMOVED",
				stats: child.stats || {},
				capacity: "Unknown",
				model: "N/A",
				phy_path: child.path || "N/A",
				sd_path: "N/A",
				vdev_path: "",
				serial: "N/A",
				powerOnHours: 0,
				powerOnCount: "0",
				temp: "0",
				rotationRate: 0,
				vDevName: vDevName,
				poolName: poolName,
				vDevType: vDevType,
				errors: [`Disk was removed from pool: ${poolName}, vDev: ${vDevName}`],
			};
		}
	}

	// Construct the disk object
	const childDisk: VDevDisk & { replacingTargetLabel?: string } = {
		name: child.name || fullDiskData.name,
		path: child.path,
		guid: child.guid,
		type: fullDiskData.type,
		health: fullDiskData.health,
		stats: child.stats || {},
		capacity: changeUnitToBinary(fullDiskData.capacity),
		model: fullDiskData.model,
		phy_path: fullDiskData.phy_path,
		sd_path: fullDiskData.sd_path,
		vdev_path: fullDiskData.vdev_path,
		serial: fullDiskData.serial,
		powerOnHours: fullDiskData.powerOnHours,
		powerOnCount: fullDiskData.powerOnCount,
		temp: fullDiskData.temp,
		rotationRate: fullDiskData.rotationRate,
		vDevName: vDevName,
		poolName: poolName,
		vDevType: vDevType,
		errors: [],
	};

	if (!fullDiskData) {
		console.warn('No match for', child.path);
	} else {
		const exp = cleanDiskPath(child.path);
		const got = cleanDiskPath(fullDiskData.vdev_path) || cleanDiskPath(fullDiskData.sd_path);
		if (exp !== got) {
			console.warn('Mismatch:', { child: exp, matched: got, matchedName: fullDiskData.name });
		}
	}

	return childDisk;
}

// ────────────────────────────────────────────────
// Parse a single VDev from pool JSON into a VDev object
// Accumulates into the provided `vDevs` array (instead of Vue ref)
// ────────────────────────────────────────────────

export function parseVDevData(
	vDev: any,
	poolName: string,
	disks: VDevDisk[],
	vDevType: string,
	vDevs: VDev[]
): void {
	const vDevData: VDev = {
		name: vDev.name,
		type: vDevType,
		status: vDev.status,
		stats: vDev.stats,
		guid: vDev.guid,
		selectedDisks: [],
		disks: [],
		poolName: poolName,
		path: vDev.path,
		diskType: determineDiskType(vDev, disks),
		errors: [],
	};

	if (vDevData.type === 'disk') {
		vDevData.path = 'N/A'; // Default path for VM Disk
	}

	// Check if VDev has child disks and if not, stores the disk info as the VDev itself
	if (vDev.children.length < 1) {
		let diskVDev = matchDiskByVdevOrPath(disks, vDevData.path!);

		if (!diskVDev) {
			console.error(`Disk not found for path: ${vDevData.path}.`);
			diskVDev = createMissingDisk(vDev.path, vDev.name, vDevType, poolName) as any;
		}

		let diskName = '';
		let diskPath = '';

		if (vDevData.path!.match(phyPathRegex)) {
			diskPath = (diskVDev as any).phy_path;
			diskName = (diskVDev as any).phy_path.replace(phyPathPrefix, '');
		} else if (vDevData.path!.match(nvmePathRegex)) {
			diskPath = (diskVDev as any).sd_path || (diskVDev as any).phy_path || (diskVDev as any).vdev_path;
			diskName = (diskVDev as any).sd_path ? (diskVDev as any).sd_path.replace(sdPathPrefix, '') : (diskVDev as any).name;
		} else if (vDevData.path!.match(sdPathRegex)) {
			diskPath = (diskVDev as any).sd_path;
			diskName = (diskVDev as any).sd_path.replace(sdPathPrefix, '');
		} else if (vDevData.path!.match(vDevPathRegex)) {
			diskPath = (diskVDev as any).vdev_path;
			diskName = (diskVDev as any).name;
		} else if (vDevData.path!.match(idPathRegex)) {
			diskPath = (diskVDev as any).id_path;
			diskName = (diskVDev as any).id_path.replace(idPathPrefix, '');
		} else if (vDevData.path!.match(labelPathRegex)) {
			diskPath = (diskVDev as any).label_path;
			diskName = (diskVDev as any).label_path.replace(labelPathPrefix, '');
		} else if (vDevData.path!.match(partLabelPathRegex)) {
			diskPath = (diskVDev as any).part_label_path;
			diskName = (diskVDev as any).part_label_path.replace(partLabelPathPrefix, '');
		} else if (vDevData.path!.match(partUUIDRegex)) {
			diskPath = (diskVDev as any).part_uuid;
			diskName = (diskVDev as any).name;
		} else if (vDevData.path!.match(uuidRegex)) {
			diskPath = (diskVDev as any).uuid;
			diskName = (diskVDev as any).name;
		}

		const notAChildDisk: VDevDisk = {
			name: diskName,
			path: diskPath,
			guid: vDev.guid,
			type: (diskVDev as any)!.type,
			health: (diskVDev as any)!.status,
			stats: (diskVDev as any)!.stats,
			capacity: changeUnitToBinary(
				isCapacityPatternInvalid((diskVDev as any)!.capacity)
					? formatCapacityString((diskVDev as any)!.capacity)
					: (diskVDev as any)!.capacity
			),
			model: (diskVDev as any)!.model,
			phy_path: (diskVDev as any)!.phy_path,
			sd_path: (diskVDev as any)!.sd_path,
			vdev_path: (diskVDev as any)!.vdev_path !== "N/A" ? (diskVDev as any)!.vdev_path : (diskVDev as any)!.sd_path,
			serial: (diskVDev as any)!.serial,
			powerOnHours: (diskVDev as any)!.powerOnHours,
			powerOnCount: (diskVDev as any)!.powerOnCount,
			temp: (diskVDev as any)!.temp,
			rotationRate: (diskVDev as any)!.rotationRate,
			vDevName: vDev.name,
			poolName: poolName,
			vDevType: vDevType,
			errors: errors,
		};

		if (!vDevData.disks.some((disk: any) => disk.guid === notAChildDisk.guid)) {
			vDevData.disks.push(notAChildDisk);
		}
	} else {
		if (vDev.name.startsWith("replacing-")) {
			const result = handleDiskChild(vDev.children[1], vDevData, disks, vDev.name, poolName, vDevType);
			if (result) {
				const fullOldDisk = disks.find(d => d.name === vDev.children[0].name);
				const shortSdPath = (fullOldDisk as any)?.sd_path?.replace(sdPathPrefix, "") ?? "";
				result.replacingTargetLabel = `${vDev.children[0].name} (${shortSdPath})`;

				if (!vDevData.disks.some((d: any) => d.guid === result.guid || d.path === result.path || d.name === result.name)) {
					vDevData.disks.push(result);
				}
			}
		} else {
			vDev.children.forEach((child: any) => {
				if (child.type === "disk") {
					const result = handleDiskChild(child, vDevData, disks, vDev.name, poolName, vDevType);
					if (result && !vDevData.disks.some((d: any) => d.guid === result.guid || d.path === result.path || d.name === result.name)) {
						vDevData.disks.push(result);
					}
				} else if (child.type === "replacing" && child.children?.length >= 2) {
					const [oldDisk, newDisk] = child.children;
					const result = handleDiskChild(newDisk, vDevData, disks, child.name, poolName, child.type);
					if (result) {
						const fullOldDisk = disks.find(d => d.name === oldDisk.name);
						const shortSdPath = (fullOldDisk as any)?.sd_path?.replace(sdPathPrefix, "") ?? "";
						result.replacingTargetLabel = `${oldDisk.name} (${cleanDiskPath(shortSdPath)})`;

						if (!vDevData.disks.some((d: any) => d.guid === result.guid || d.path === result.path || d.name === result.name)) {
							vDevData.disks.push(result);
						}
					}
				}
			});
		}
	}

	vDevs.push(vDevData);
}
