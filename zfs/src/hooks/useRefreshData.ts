/**
 * Refresh-all-data hook — React hook that orchestrates reloading all ZFS data.
 * Ported from composables/useRefreshAllData.ts.
 */

import { useState, useCallback, useRef } from 'react';
import type { ZPool, VDevDisk, ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import type { PoolScanObjectGroup, PoolDiskStats, Activity } from '../types/index';

import { loadDisksThenPools } from '../data/loadPools';
import { loadDatasets } from '../data/loadDatasets';
import { loadScanObjectGroup, loadDiskStats } from '../data/loadScanData';

// ────────────────────────────────────────────────
// Activity helpers (ported from composables/helpers.ts)
// ────────────────────────────────────────────────

function buildDefaultActivity(): Activity {
	return {
		isActive: false,
		isPaused: false,
		isCanceled: false,
		isFinished: false,
	};
}

function buildScanActivities(pools: ZPool[]): Map<string, Activity> {
	const map = new Map<string, Activity>();
	pools.forEach((pool: any) => {
		map.set(pool.name, buildDefaultActivity());
	});
	return map;
}

function buildTrimActivities(pools: ZPool[]): Map<string, Activity> {
	const map = new Map<string, Activity>();
	pools.forEach((pool: any) => {
		map.set(pool.name, buildDefaultActivity());
		pool.vdevs?.forEach((vDev: any) => {
			vDev.disks?.forEach((disk: any) => {
				map.set(disk.name, buildDefaultActivity());
			});
		});
	});
	return map;
}

// ────────────────────────────────────────────────
// Hook options
// ────────────────────────────────────────────────

export interface RefreshDataOptions {
	keepOldOnEmpty?: boolean;
	rebuildActivitiesOnSwap?: boolean;
}

// ────────────────────────────────────────────────
// Hook result
// ────────────────────────────────────────────────

export interface RefreshDataResult {
	pools: ZPool[];
	disks: VDevDisk[];
	datasets: ZFSFileSystemInfo[];
	scanObjectGroup: PoolScanObjectGroup;
	poolDiskStats: PoolDiskStats;
	scanActivities: Map<string, Activity>;
	trimActivities: Map<string, Activity>;
	disksLoaded: boolean;
	poolsLoaded: boolean;
	fileSystemsLoaded: boolean;
	isRefreshing: boolean;
	refreshAll: () => Promise<void>;
}

// ────────────────────────────────────────────────
// The hook
// ────────────────────────────────────────────────

export function useRefreshData(opts: RefreshDataOptions = {}): RefreshDataResult {
	const keepOldOnEmpty = opts.keepOldOnEmpty ?? true;
	const rebuildActivitiesOnSwap = opts.rebuildActivitiesOnSwap ?? true;

	const [pools, setPools] = useState<ZPool[]>([]);
	const [disks, setDisks] = useState<VDevDisk[]>([]);
	const [datasets, setDatasets] = useState<ZFSFileSystemInfo[]>([]);
	const [scanObjectGroup, setScanObjectGroup] = useState<PoolScanObjectGroup>({});
	const [poolDiskStats, setPoolDiskStats] = useState<PoolDiskStats>({});
	const [scanActivities, setScanActivities] = useState<Map<string, Activity>>(new Map());
	const [trimActivities, setTrimActivities] = useState<Map<string, Activity>>(new Map());

	const [disksLoaded, setDisksLoaded] = useState(false);
	const [poolsLoaded, setPoolsLoaded] = useState(false);
	const [fileSystemsLoaded, setFileSystemsLoaded] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const inFlightRef = useRef<Promise<void> | null>(null);

	// Refs for accessing latest state inside the async callback
	const scanObjectGroupRef = useRef(scanObjectGroup);
	scanObjectGroupRef.current = scanObjectGroup;
	const poolDiskStatsRef = useRef(poolDiskStats);
	poolDiskStatsRef.current = poolDiskStats;
	const poolsRef = useRef(pools);
	poolsRef.current = pools;

	const refreshAll = useCallback(async () => {
		if (inFlightRef.current) {
			await inFlightRef.current;
			return;
		}

		const promise = (async () => {
			setIsRefreshing(true);
			try {
				setDisksLoaded(false);
				setPoolsLoaded(false);
				setFileSystemsLoaded(false);

				try {
					const { disks: nextDisks, pools: nextPools } = await loadDisksThenPools();
					const nextDatasets = await loadDatasets();

					const gotPools = nextPools.length > 0;
					const shouldSwap = keepOldOnEmpty ? gotPools : true;

					if (shouldSwap) {
						setDisks(nextDisks);
						setPools(nextPools);
						setDatasets(nextDatasets);

						if (rebuildActivitiesOnSwap) {
							setScanActivities(buildScanActivities(nextPools));
							setTrimActivities(buildTrimActivities(nextPools));
						}

						// Update refs immediately for scan/disk stats below
						poolsRef.current = nextPools;
					}

					const nextScanGroup = await loadScanObjectGroup(scanObjectGroupRef.current);
					setScanObjectGroup(nextScanGroup);

					const nextDiskStats = await loadDiskStats(poolDiskStatsRef.current);
					setPoolDiskStats(nextDiskStats);
				} finally {
					setDisksLoaded(true);
					setPoolsLoaded(true);
					setFileSystemsLoaded(true);
				}
			} finally {
				setIsRefreshing(false);
			}
		})();

		inFlightRef.current = promise;
		promise.finally(() => {
			inFlightRef.current = null;
		});

		await promise;
	}, [keepOldOnEmpty, rebuildActivitiesOnSwap]);

	return {
		pools,
		disks,
		datasets,
		scanObjectGroup,
		poolDiskStats,
		scanActivities,
		trimActivities,
		disksLoaded,
		poolsLoaded,
		fileSystemsLoaded,
		isRefreshing,
		refreshAll,
	};
}
