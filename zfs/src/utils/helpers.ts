/**
 * Pure helper utilities — no framework (React/Vue) dependencies.
 * Extracted from composables/helpers.ts during Vue->React migration.
 *
 * Functions that depend on Vue reactivity (ref, Ref, MaybeRef) or on
 * houston-common-lib's legacy spawn API have been intentionally omitted
 * here. They will be ported as React hooks in Phase 1.
 */

import type { VDevDisk, ZpoolCreateOptions } from '@45drives/houston-common-lib';

/** Convert a boolean to the ZFS 'on'/'off' string. */
export function isBoolOnOff(bool: boolean): string {
	return bool ? 'on' : 'off';
}

/** Convert a boolean to a compression value ('lz4' when true, 'off' when false). */
export function isBoolCompression(bool: boolean): string {
	return bool ? 'lz4' : 'off';
}

/** Convert 'on'/'off' string to boolean (undefined for other values). */
export function onOffToBool(state: string): boolean | undefined {
	if (state === 'on') return true;
	if (state === 'off') return false;
	return undefined;
}

/** Convert 'yes'/'no' string to boolean (undefined for other values). */
export function yesNoToBool(state: string): boolean | undefined {
	if (state === 'yes') return true;
	if (state === 'no') return false;
	return undefined;
}

/** Capitalise the first letter of a word. */
export const upperCaseWord = (word: string): string => {
	const lowerCaseWord = word.toLowerCase();
	const firstLetter = lowerCaseWord.charAt(0);
	const remainingLetters = lowerCaseWord.substring(1);
	return firstLetter.toUpperCase() + remainingLetters;
};

/** Determine the disk type composition of a pool ('SSD', 'HDD', 'Hybrid', or 'Unknown'). */
export const getPoolDiskType = (pool: { vdevs: { disks: { type?: string }[] }[] }): string => {
	let hasSSD = false;
	let hasHDD = false;

	pool.vdevs.forEach((vdev) => {
		vdev.disks.forEach((disk) => {
			if (disk.type === "SSD") {
				hasSSD = true;
			} else if (disk.type === "HDD") {
				hasHDD = true;
			}
		});
	});

	if (hasSSD && hasHDD) return "Hybrid";
	if (hasSSD) return "SSD";
	if (hasHDD) return "HDD";
	return "Unknown";
};

/** Get the parent dataset path (everything before the last '/'). */
export function getParentPath(datasetName: string): string {
	const segments = datasetName.split('/');
	segments.pop();
	return segments.join('/');
}

/**
 * Map a (type, value) pair to a human-readable label.
 * Supports: 'sector', 'record', 'dnode', 'compression', 'dedup'.
 */
export function getValue(type: string, value: string): string | undefined {
	if (type === 'sector') {
		switch (value) {
			case "auto": return 'Auto Detect';
			case "9": return '512 B';
			case "12": return '4 KiB';
			case "13": return '8 KiB';
			case "14": return '16 KiB';
			case "15": return '32 KiB';
			case "16": return '64 KiB';
			default: return 'None';
		}
	} else if (type === 'record') {
		switch (value) {
			case "512b": return '512 B';
			case "4kib": return '4 KiB';
			case "8kib": return '8 KiB';
			case "16kib": return '16 KiB';
			case "32kib": return '32 KiB';
			case "64kib": return '64 KiB';
			case "128kib": return '128 KiB';
			case "256kib": return '256 KiB';
			case "512kib": return '512 KiB';
			case "1mib": return '1 MiB';
			default: return 'None';
		}
	} else if (type === 'dnode') {
		switch (value) {
			case "1k": return '1 KiB';
			case "2k": return '2 KiB';
			case "4k": return '4 KiB';
			case "8k": return '8 KiB';
			case "16k": return '16 KiB';
			case "auto": return 'Auto';
			case "legacy": return 'Legacy';
			default: return 'None';
		}
	} else if (type === 'compression') {
		switch (value) {
			case "on": return 'On';
			case "off": return 'Off';
			case "gzip": return 'GZIP';
			case "lz4": return 'LZ4';
			case "lzjb": return 'LZJB';
			case "zle": return 'ZLE';
			default: return 'None';
		}
	} else if (type === 'dedup') {
		switch (value) {
			case "on": return 'On';
			case "off": return 'Off';
			case "edonr,verify": return 'Edon-R + Verify';
			case "sha256": return 'SHA-256';
			case "sha256,verify": return 'SHA-256 + Verify';
			case "sha512": return 'SHA-512';
			case "sha512,verify": return 'SHA-512 + Verify';
			case "skein": return 'Skein';
			case "skein,verify": return 'Skein + Verify';
			case "verify": return 'Verify';
			default: return 'None';
		}
	}
	return undefined;
}

/**
 * Format a value with inheritance awareness.
 * When value is 'inherited', shows the inherited source from poolConfigOptions.
 */
export function checkInheritance(type: string, value: string, poolConfigOptions: ZpoolCreateOptions): string | undefined {
	if (type === 'compression') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (${poolConfigOptions.compression!.toUpperCase()})`;
		}
		return getValue('compression', value);
	} else if (type === 'dedup') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (${upperCaseWord(poolConfigOptions.dedup!)})`;
		}
		return getValue('dedup', value);
	} else if (type === 'record') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (${getValue('record', poolConfigOptions.recordsize!.toString())})`;
		}
		return getValue('record', value);
	} else if (type === 'atime') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (On)`;
		}
		return upperCaseWord(value);
	} else if (type === 'case') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (Sensitive)`;
		}
		return upperCaseWord(value);
	} else if (type === 'dnode') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (Legacy)`;
		}
		return getValue('dnode', value);
	} else if (type === 'xattr') {
		if (value === 'inherited') {
			return `${upperCaseWord(value)} (System Attribute)`;
		}
		return upperCaseWord(value);
	}
	return undefined;
}

/** Truncate a name to `threshold` characters, appending '...' if needed. */
export function truncateName(name: string, threshold: number): string {
	return name.length > threshold ? name.slice(0, threshold) + '...' : name;
}

/**
 * Look up full disk info by matching a disk name against all known path fields.
 * Pure function — accepts a plain array (not a Vue ref).
 */
export function getFullDiskInfo(disks: VDevDisk[], diskName: string): VDevDisk | undefined {
	if (!diskName) {
		console.warn("getFullDiskInfo called with an empty diskName.");
		return undefined;
	}

	const pathPrefixes: Record<string, string> = {
		phy_path: '/dev/disk/by-path/',
		sd_path: '/dev/',
		id_path: '/dev/disk/by-id/',
		label_path: '/dev/disk/by-label/',
		part_label_path: '/dev/disk/by-partlabel/',
		part_uuid: '/dev/disk/by-partuuid/',
		uuid: '/dev/disk/by-uuid/',
	};

	const foundDisk = disks.find(disk => {
		if (disk.name?.trim() === diskName.trim() || disk.vdev_path?.trim() === diskName.trim()) {
			disk.path = disk.vdev_path?.trim() ?? disk.name?.trim() ?? '';
			return true;
		}

		for (const [key, prefix] of Object.entries(pathPrefixes)) {
			const diskPath = (disk as any)[key]?.trim();
			if (diskPath && diskPath.replace(prefix, '') === diskName.trim()) {
				disk.path = diskPath;
				return true;
			}
		}

		return false;
	});

	return foundDisk;
}

/**
 * Get the display name for a disk given a disk identifier type.
 * Pure version — accepts a plain array instead of Vue refs.
 */
export function getDiskIDName(disks: VDevDisk[], diskIdentifier: string, selectedDiskName: string): string {
	const pathPrefixes: Record<string, string> = {
		phy_path: '/dev/disk/by-path/',
		sd_path: '/dev/',
		id_path: '/dev/disk/by-id/',
		label_path: '/dev/disk/by-label/',
		part_label_path: '/dev/disk/by-partlabel/',
		part_uuid: '/dev/disk/by-partuuid/',
		uuid: '/dev/disk/by-uuid/',
	};

	const newDisk = disks.find(disk => disk.name?.trim() === selectedDiskName.trim());

	if (!newDisk) {
		console.warn('getDiskIDName: disk not found for', selectedDiskName);
		return '';
	}

	if (diskIdentifier === 'vdev_path') {
		return selectedDiskName;
	}

	const prefix = pathPrefixes[diskIdentifier];
	if (prefix) {
		const diskPath: string = (newDisk as any)[diskIdentifier] ?? '';
		return diskPath.replace(prefix, '');
	}

	console.warn('getDiskIDName: unknown diskIdentifier', diskIdentifier);
	return '';
}

/**
 * Canonical disk matcher. Works with plain disk arrays.
 * Matches a vdev path or any /dev/disk/by-* path against disk records.
 */
export function matchDiskByVdevOrPath(
	disks: VDevDisk[],
	vdevPathOrAnyPath: string
): VDevDisk | undefined {
	if (!vdevPathOrAnyPath) return undefined;

	if (!Array.isArray(disks)) {
		console.warn("matchDiskByVdevOrPath: expected array, got:", disks);
		return undefined;
	}

	const byVdev = vdevPathOrAnyPath.match(/\/dev\/disk\/by-vdev\/([0-9A-Za-z\-]+)(?:-part\d+)?$/);
	if (byVdev) {
		const bay = byVdev[1];
		const hit = disks.find(d => d?.name === bay);
		if (hit) return hit;
	}

	const clean = (p?: string): string => {
		if (!p) return "";
		p = p.replace(/(\/nvme\d+n\d+)p\d+$/, "$1");
		p = p.replace(/(\/mmcblk\d+)p\d+$/, "$1");
		p = p.replace(/(\/sd[a-z]+)\d+$/, "$1");
		p = p.replace(/-part\d+$/, "");
		return p;
	};

	const sameOrStartsWith = (a: string, b: string): boolean =>
		a === b || (!!a && !!b && (b.startsWith(a) || a.startsWith(b)));

	const want = vdevPathOrAnyPath;
	const wantBase = clean(want);

	const candidates = ["sd_path", "phy_path", "vdev_path", "id_path", "label_path", "part_label_path", "part_uuid", "uuid"];

	let d = disks.find(dd => candidates.some(k => {
		const v = (dd as any)?.[k] as string | undefined;
		return v === want || clean(v) === wantBase;
	}));
	if (d) return d;

	d = disks.find(dd => candidates.some(k => {
		const v = ((dd as any)?.[k] as string | undefined) ?? "";
		return sameOrStartsWith(v, want) || sameOrStartsWith(clean(v), wantBase);
	}));
	return d;
}

/** ExecOut type used by the exec() async helper. */
export type ExecOut = { stdout: string; stderr: string };
