/**
 * ZFS Data Context — the core React context replacing ZFS.vue's 15+ provide() calls.
 *
 * Loads all ZFS data on mount, sets up the DBus message handler for notifications,
 * and provides all state through a single context.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ZPool, VDevDisk, ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import type {
	ImportablePoolData,
	Snapshot,
	Activity,
	PoolScanObjectGroup,
	PoolDiskStats,
} from '../types/index';

import { useRefreshData } from '../hooks/useRefreshData';
import { usePermissions } from '../hooks/usePermissions';
import { useNotificationContext } from './NotificationContext';
import { loadImportablePools, loadImportableDestroyedPools } from '../data/loadImportables';

const cockpit: any = (globalThis as any).cockpit;

// ────────────────────────────────────────────────
// Context type
// ────────────────────────────────────────────────

export interface ZfsDataContextType {
	pools: ZPool[];
	disks: VDevDisk[];
	datasets: ZFSFileSystemInfo[];
	snapshots: Snapshot[];
	importablePools: ImportablePoolData[];
	importableDestroyedPools: ImportablePoolData[];
	scanObjectGroup: PoolScanObjectGroup;
	poolDiskStats: PoolDiskStats;
	scanActivities: Map<string, Activity>;
	trimActivities: Map<string, Activity>;
	disksLoaded: boolean;
	poolsLoaded: boolean;
	fileSystemsLoaded: boolean;
	canDestructive: boolean;
	isRefreshing: boolean;
	refreshAll: () => Promise<void>;
}

const defaultContext: ZfsDataContextType = {
	pools: [],
	disks: [],
	datasets: [],
	snapshots: [],
	importablePools: [],
	importableDestroyedPools: [],
	scanObjectGroup: {},
	poolDiskStats: {},
	scanActivities: new Map(),
	trimActivities: new Map(),
	disksLoaded: false,
	poolsLoaded: false,
	fileSystemsLoaded: false,
	canDestructive: false,
	isRefreshing: false,
	refreshAll: async () => {},
};

export const ZfsDataContext = createContext<ZfsDataContextType>(defaultContext);

// ────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────

export function ZfsDataProvider({ children }: { children: React.ReactNode }) {
	const refreshData = useRefreshData();
	const { canDestructive } = usePermissions();
	const notificationCtx = useNotificationContext();

	const [snapshots] = useState<Snapshot[]>([]);
	const [importablePools, setImportablePools] = useState<ImportablePoolData[]>([]);
	const [importableDestroyedPools, setImportableDestroyedPools] = useState<ImportablePoolData[]>([]);

	const initialLoadDone = useRef(false);

	// ── Initial data load ──
	useEffect(() => {
		if (initialLoadDone.current) return;
		initialLoadDone.current = true;

		(async () => {
			await refreshData.refreshAll();
			setupMessageHandler(notificationCtx.addNotification);
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Load importable pools when pools are loaded ──
	useEffect(() => {
		if (!refreshData.poolsLoaded) return;

		(async () => {
			try {
				const [importable, destroyed] = await Promise.all([
					loadImportablePools(),
					loadImportableDestroyedPools(),
				]);
				setImportablePools(importable);
				setImportableDestroyedPools(destroyed);
			} catch (error) {
				console.error("Error loading importable pools:", error);
			}
		})();
	}, [refreshData.poolsLoaded]);

	// ── Context value ──
	const value: ZfsDataContextType = {
		pools: refreshData.pools,
		disks: refreshData.disks,
		datasets: refreshData.datasets,
		snapshots,
		importablePools,
		importableDestroyedPools,
		scanObjectGroup: refreshData.scanObjectGroup,
		poolDiskStats: refreshData.poolDiskStats,
		scanActivities: refreshData.scanActivities,
		trimActivities: refreshData.trimActivities,
		disksLoaded: refreshData.disksLoaded,
		poolsLoaded: refreshData.poolsLoaded,
		fileSystemsLoaded: refreshData.fileSystemsLoaded,
		canDestructive,
		isRefreshing: refreshData.isRefreshing,
		refreshAll: refreshData.refreshAll,
	};

	return (
		<ZfsDataContext.Provider value={value}>
			{children}
		</ZfsDataContext.Provider>
	);
}

// ────────────────────────────────────────────────
// Consumer hook
// ────────────────────────────────────────────────

export function useZfsData(): ZfsDataContextType {
	return useContext(ZfsDataContext);
}

// ────────────────────────────────────────────────
// DBus message handler setup
// ────────────────────────────────────────────────

async function setupMessageHandler(addNotification: (message: string) => void) {
	try {
		console.log("Setting up ZFS Notification DBus message handler...");

		const client = cockpit.dbus("org._45drives.Houston");
		const houston = await client.proxy("org._45drives.Houston", "/org/_45drives/Houston");

		console.log("Connected to ZFS Notification DBus. Subscribing to Message signal...");

		houston.addEventListener("Message", (_: any, message: string) => {
			addNotification(message);
		});

		console.log("ZFS Notification DBus message handler successfully set up.");
	} catch (error) {
		console.error("Error setting up ZFS Notification DBus message handler:", error);
	}
}
