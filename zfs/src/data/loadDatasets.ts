/**
 * Dataset loading — framework-agnostic (no React, no Vue).
 * Ported from composables/loadData.ts.
 *
 * Returns data instead of mutating external refs.
 */

import type { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { convertBytesToSize, getSizeUnitFromString, getQuotaRefreservUnit } from '../utils/formatters';
import { onOffToBool, getParentPath } from '../utils/helpers';
import { unpackArray } from '../utils/json';
import { getDatasets } from '../hooks/useDatasetOperations';

/**
 * Load all datasets and return them as an array.
 */
export async function loadDatasets(): Promise<ZFSFileSystemInfo[]> {
	try {
		const rawJSON = await getDatasets();
		const { data: parsedJSON, error } = unpackArray<any>(rawJSON, []);
		if (error) console.warn('getDatasets error:', error);

		const datasets: ZFSFileSystemInfo[] = [];

		for (let i = 0; i < parsedJSON.length; i++) {
			const dataset: ZFSFileSystemInfo = {
				name: parsedJSON[i].name,
				id: parsedJSON[i].id,
				mountpoint: parsedJSON[i].properties.mountpoint.value,
				pool: parsedJSON[i].pool,
				encrypted: parsedJSON[i].encrypted,
				key_loaded: parsedJSON[i].key_loaded,
				type: parsedJSON[i].type,
				inherit: false,
				properties: {
					guid: parsedJSON[i].properties.guid.parsed,
					encryption: parsedJSON[i].properties.encryption.parsed,
					accessTime: parsedJSON[i].properties.atime.value,
					caseSensitivity: parsedJSON[i].properties.casesensitivity.value,
					compression: parsedJSON[i].properties.compression.value,
					deduplication: parsedJSON[i].properties.dedup.value,
					dNodeSize: parsedJSON[i].properties.dnodesize.value,
					extendedAttributes: parsedJSON[i].properties.xattr.value,
					recordSize: parsedJSON[i].properties.recordsize.value,
					quota: {
						value: parsedJSON[i].properties.quota.value,
						raw: parsedJSON[i].properties.quota.parsed,
						unit: getSizeUnitFromString(getQuotaRefreservUnit(parsedJSON[i].properties.quota.parsed)) as "kib" | "mib" | "gib" | "tib",
					},
					readOnly: parsedJSON[i].properties.readonly.value,
					isReadOnly: onOffToBool(parsedJSON[i].properties.readonly.value),
					available: parsedJSON[i].properties.available.parsed,
					creation: parsedJSON[i].properties.creation.value,
					snapshotCount: parsedJSON[i].properties.snapshot_count.value,
					mounted: parsedJSON[i].properties.mounted.value,
					usedbyRefreservation: convertBytesToSize(parsedJSON[i].properties.usedbyrefreservation.parsed),
					usedByDataset: convertBytesToSize(parsedJSON[i].properties.usedbydataset.parsed),
					canMount: parsedJSON[i].properties.canmount.value,
					aclInheritance: parsedJSON[i].properties.aclinherit.value,
					aclType: parsedJSON[i].properties.acltype.value,
					checksum: parsedJSON[i].properties.checksum.value,
					refreservation: {
						raw: parsedJSON[i].properties.refreservation.parsed,
						value: parsedJSON[i].properties.refreservation.value,
						unit: getSizeUnitFromString(getQuotaRefreservUnit(parsedJSON[i].properties.refreservation.parsed)) as "kib" | "mib" | "gib" | "tib",
					},
					used: parsedJSON[i].properties.used.parsed,
					usedBySnapshots: convertBytesToSize(parsedJSON[i].properties.usedbysnapshots.parsed),
				},
				children: parsedJSON[i].children,
				parentFS: getParentPath(parsedJSON[i].name),
			};

			datasets.push(dataset);
		}

		console.log("loaded Datasets:", datasets);
		return datasets;
	} catch (error) {
		console.error("An error occurred getting datasets:", error);
		return [];
	}
}
