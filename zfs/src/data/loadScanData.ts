/**
 * Scan/disk-stats loading — framework-agnostic (no React, no Vue).
 * Ported from composables/loadData.ts + composables/scan.ts.
 *
 * Returns data instead of mutating external refs.
 */

import type { PoolDiskStats, PoolScanObjectGroup } from '../types/index';
import { safeParse } from '../utils/json';
import { getScanGroup, getDiskStats } from '../hooks/usePoolOperations';

// ────────────────────────────────────────────────
// Plain-object check
// ────────────────────────────────────────────────

function isPlainObject(v: any): v is Record<string, any> {
	return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ────────────────────────────────────────────────
// Normalizers
// ────────────────────────────────────────────────

export function normalizeDiskStats(input: any, prev: PoolDiskStats): PoolDiskStats {
	const out: PoolDiskStats = { ...(isPlainObject(prev) ? prev : ({} as any)) };
	if (!isPlainObject(input)) return out;

	for (const [poolName, disks] of Object.entries(input)) {
		out[poolName] = Array.isArray(disks) ? (disks as any) : [];
	}
	return out;
}

export function normalizeScanGroup(input: any, prev: PoolScanObjectGroup): PoolScanObjectGroup {
	const out: PoolScanObjectGroup = { ...(isPlainObject(prev) ? prev : ({} as any)) };
	if (!isPlainObject(input)) return out;

	for (const [poolName, scan] of Object.entries(input)) {
		out[poolName] = isPlainObject(scan) ? (scan as any) : ({ state: null } as any);
	}
	return out;
}

// ────────────────────────────────────────────────
// Load disk stats
// ────────────────────────────────────────────────

/**
 * Load disk stats from the scan scripts.
 * @param prev - previous PoolDiskStats to merge with (sticky — won't downgrade to empty)
 */
export async function loadDiskStats(prev: PoolDiskStats = {}): Promise<PoolDiskStats> {
	try {
		const raw = await getDiskStats();
		const parsed = safeParse(raw, null);

		const next = normalizeDiskStats(parsed, prev);

		// Sticky: don't downgrade to empty if we already had data
		if (Object.keys(next).length === 0 && Object.keys(prev ?? {}).length > 0) return prev;

		return next;
	} catch (error) {
		console.error("An error occurred getting disk stats:", error);
		return prev;
	}
}

// ────────────────────────────────────────────────
// Load scan object group
// ────────────────────────────────────────────────

/**
 * Load scan/scrub/resilver object group from the scan scripts.
 * @param prev - previous PoolScanObjectGroup to merge with (sticky)
 */
export async function loadScanObjectGroup(prev: PoolScanObjectGroup = {}): Promise<PoolScanObjectGroup> {
	try {
		const raw = await getScanGroup();
		const parsed = safeParse(raw, null);

		const next = normalizeScanGroup(parsed, prev);

		if (Object.keys(next).length === 0 && Object.keys(prev ?? {}).length > 0) return prev;

		return next;
	} catch (error) {
		console.error("An error occurred getting scan object group:", error);
		return prev;
	}
}
