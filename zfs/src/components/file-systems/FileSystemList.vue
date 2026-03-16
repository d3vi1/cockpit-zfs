<template>
	<div
		class="inline-block min-w-full min-h-full py-4 align-middle sm:px-4 lg:px-6 overflow-visible sm:rounded-lg bg-accent rounded-md border border-default">
		<div
			class="flex bg-well justify-between rounded-md p-2 shadow text-default rounded-b-md ring-1 ring-black ring-opacity-5">
			<div class="button-group-row justify-start">
				<button id="createFS" class="btn btn-primary object-left justify-start"
					@click="newFileSystemWizard()">Create File System</button>
			</div>
			<div class="button-group-row justify-end">
				<button id="refreshFS" class="btn btn-secondary object-right justify-self-end" @click="refreshData()">
					<ArrowPathIcon class="w-5 h-5 m-1" />
				</button>
			</div>
		</div>

		<div class="mt-4 overflow-visible rounded-md max-w-full">
			<div class="inline-block min-w-full min-h-full shadow align-middle rounded-md border border-default">
				<div class="overflow-visible ring-1 ring-black ring-opacity-5 rounded-md">

					<table class="pf-v5-c-table pf-m-compact min-w-full" role="grid">
						<thead>
							<tr role="row">
								<th class="pf-v5-c-table__th" role="columnheader" scope="col" style="width: 2rem;">
									<span class="sr-only">Expand</span>
								</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Dataset</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Available</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Used</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Used By Snapshots</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Refres.</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Compression</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Dedup.</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Encrypted</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Mounted</th>
								<th class="pf-v5-c-table__th" role="columnheader" scope="col">Read Only</th>
								<th class="pf-v5-c-table__th pf-v5-c-table__action" role="columnheader" scope="col">
									<span class="sr-only">Actions</span>
								</th>
							</tr>
						</thead>

						<tbody v-if="allDatasets.length > 0 && allDatasetsLoaded == true" role="rowgroup">
							<template v-for="(dataset, datasetIdx) in allDatasets" :key="dataset.name">

								<!-- FILESYSTEM rows -->
								<template v-if="dataset.type == 'FILESYSTEM'">
									<tr class="pf-v5-c-table__tr pf-v5-c-table__expandable-row-control bg-default border border-default cursor-pointer"
										role="row"
										@click="toggleExpanded(dataset.name)">
										<td class="pf-v5-c-table__td pf-v5-c-table__toggle" role="cell">
											<button class="pf-v5-c-button pf-m-plain" type="button"
												:aria-expanded="isExpanded.has(dataset.name)"
												aria-label="Toggle row details"
												@click.stop="toggleExpanded(dataset.name)">
												<ChevronUpIcon
													class="h-5 w-5 text-default transition-all duration-200 transform"
													:class="{ 'rotate-90': !isExpanded.has(dataset.name), 'rotate-180': isExpanded.has(dataset.name) }" />
											</button>
										</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText"
											:style="{ paddingLeft: `${getNestingLevel(dataset) * 0.25}rem` }"
											:title="dataset.name">{{ dataset.name }}</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText"
											:title="convertBytesToSize(dataset.properties.available) ? convertBytesToSize(dataset.properties.available) : 'N/A'">
											{{ convertBytesToSize(dataset.properties.available) ?
											convertBytesToSize(dataset.properties.available) : 'N/A' }}
										</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText" :title="dataset.properties.usedByDataset">
											{{ dataset.properties.usedByDataset }}</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText"
											:title="dataset.properties.usedBySnapshots">{{
											dataset.properties.usedBySnapshots }}</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText"
											:title="dataset.properties.usedbyRefreservation ? dataset.properties.usedbyRefreservation : 'N/A'">
											{{ dataset.properties.usedbyRefreservation ?
											dataset.properties.usedbyRefreservation : 'N/A' }}</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText"
											:title="getCompressionDisplay(dataset)">
											{{ getCompressionDisplay(dataset) }}
										</td>
										<td class="pf-v5-c-table__td" role="cell"
											:class="truncateText"
											:title="getValue('dedup', dataset.properties.deduplication) ? getValue('dedup', dataset.properties.deduplication) : 'N/A'">
											{{ getValue('dedup', dataset.properties.deduplication) ?
											getValue('dedup', dataset.properties.deduplication) : 'N/A' }}
										</td>

										<td class="pf-v5-c-table__td text-center" role="cell">
											<LockOpenIcon v-if="dataset.encrypted && dataset.key_loaded"
												class="w-5 inline-block" title="Encrypted &amp; Unlocked" aria-hidden="true" />
											<LockClosedIcon v-else-if="dataset.encrypted && !dataset.key_loaded"
												class="w-5 inline-block" title="Encrypted &amp; Locked" aria-hidden="true" />
											<NoSymbolIcon v-else
												class="w-5 inline-block" title="Not Encrypted" aria-hidden="true" />
										</td>

										<td class="pf-v5-c-table__td text-center" role="cell">
											<CheckIcon v-if="yesNoToBool(dataset.properties.mounted)"
												class="w-5 inline-block" title="Mounted" aria-hidden="true" />
											<NoSymbolIcon v-else
												class="w-5 inline-block" title="Not Mounted" aria-hidden="true" />
										</td>

										<td class="pf-v5-c-table__td text-center" role="cell">
											<CheckIcon v-if="dataset.properties.isReadOnly!"
												class="w-5 inline-block" title="Read Only ON" aria-hidden="true" />
											<NoSymbolIcon v-else
												class="w-5 inline-block" title="Read Only OFF" aria-hidden="true" />
										</td>

										<td class="pf-v5-c-table__td pf-v5-c-table__action" role="cell" @click.stop>
											<PfDropdownMenu
												:items="getFileSystemActions(allDatasets[datasetIdx], datasetIdx)"
												:kebab="true"
											/>
										</td>
									</tr>

									<!-- Expandable row for snapshots -->
									<tr v-if="isExpanded.has(dataset.name)"
										class="pf-v5-c-table__expandable-row pf-m-expanded" role="row">
										<td :colspan="12" class="pf-v5-c-table__td p-0" role="cell">
											<SnapshotsList :filesystem="allDatasets[datasetIdx]"
												:item="'filesystem'"
												:bulkSnapDestroyMode="bulkSnapDestroyMode.get(allDatasets[datasetIdx].name)" />
										</td>
									</tr>
								</template>

								<!-- SNAPSHOT rows -->
								<tr v-if="dataset.type == 'SNAPSHOT'"
									class="pf-v5-c-table__tr bg-primary border border-default" role="row">
									<td class="pf-v5-c-table__td" role="cell">
										<CameraIcon class="h-6 w-6 text-muted" />
									</td>
									<td class="pf-v5-c-table__td text-white" role="cell"
										:class="truncateText"
										:style="{ paddingLeft: `${getNestingLevel(dataset) * 0.25}rem` }"
										:title="dataset.name">{{ dataset.name }}</td>
									<td class="pf-v5-c-table__td text-white" role="cell">N/A</td>
									<td class="pf-v5-c-table__td text-white" role="cell"
										:class="truncateText"
										:title="convertBytesToSize(dataset.properties.used.parsed)">{{
										convertBytesToSize(dataset.properties.used.parsed) }}</td>
									<td class="pf-v5-c-table__td text-white" role="cell">N/A</td>
									<td class="pf-v5-c-table__td text-white" role="cell">N/A</td>
									<td class="pf-v5-c-table__td text-white" role="cell">N/A</td>
									<td class="pf-v5-c-table__td text-white" role="cell">N/A</td>
									<td class="pf-v5-c-table__td text-white text-center" role="cell">
										<LockOpenIcon v-if="dataset.properties.encryption.value !== 'off' && dataset.properties.keystatus.value == 'available'"
											class="w-5 inline-block" title="Encrypted &amp; Unlocked" aria-hidden="true" />
										<LockClosedIcon v-else-if="dataset.properties.encryption.value !== 'off' && dataset.properties.keystatus.value == 'unavailable'"
											class="w-5 inline-block" title="Encrypted &amp; Locked" aria-hidden="true" />
										<NoSymbolIcon v-else
											class="w-5 inline-block" title="Not Encrypted" aria-hidden="true" />
									</td>
									<td class="pf-v5-c-table__td text-white text-center" role="cell">N/A</td>
									<td class="pf-v5-c-table__td text-white text-center" role="cell">N/A</td>
									<td class="pf-v5-c-table__td" role="cell"></td>
								</tr>
							</template>
						</tbody>
					</table>

					<div v-if="allDatasetsLoaded == false" class="p-2 flex justify-center bg-default">
						<LoadingSpinner :width="'w-10'" :height="'h-10'" :baseColor="'text-gray-200'"
							:fillColor="'fill-slate-500'" class="font-semibold text-lg my-0.5" />
					</div>
					<div v-if="fileSystems.length < 1 && allDatasetsLoaded == true"
						class="p-2 flex bg-default justify-center">
						<span class="font-semibold text-lg my-2">No File Systems Found</span>
					</div>

				</div>
			</div>

			<!-- hidden div for dynamic style rendering -->
			<div id="debug" class="hidden">
				<div id="dummy" class="hidden">
					<div class="ml-0"></div>
					<div class="ml-4"></div>
					<div class="ml-8"></div>
					<div class="ml-12"></div>
					<div class="ml-16"></div>
					<div class="ml-20"></div>
					<div class="ml-24"></div>
					<div class="ml-28"></div>
					<div class="ml-32"></div>
					<div class="ml-36"></div>
				</div>
			</div>

		</div>
	</div>

	<div v-if="showNewFSWizard">
		<component :is="newFileSystemComponent" :isStandalone="true" idKey="fs-wizard"
			@close="showNewFSWizard = false" />
	</div>

	<div v-if="showFSConfig">
		<component :is="configFileSystemComponent" ref="fileSystemConfiguration" :filesystem="selectedDataset!"
			idKey="fs-config" @close="showFSConfig = false" />
	</div>

	<div v-if="showDeleteFileSystemConfirm">
		<component :is="deleteFileSystemComponent" :showFlag="showDeleteFileSystemConfirm"
			@close="updateShowDestroyFileSystem" :idKey="'confirm-destroy-filesystem'" :item="'filesystem'"
			:operation="'destroy'" :filesystem="selectedDataset!" :confirmOperation="confirmThisDestroy"
			:firstOption="'force unmount'" :hasChildren="hasChildren" />
	</div>

	<div v-if="showUnmountFileSystemConfirm">
		<component :is="unmountFileSystemComponent" v-if="selectedDataset!.encrypted"
			:showFlag="showUnmountFileSystemConfirm" @close="updateShowUnmountFileSystem"
			:idKey="'confirm-unmount-filesystem'" :item="'filesystem'" :operation="'unmount'"
			:filesystem="selectedDataset!" :confirmOperation="confirmThisUnmount" :firstOption="'force unmount'"
			:secondOption="'lock file system'" :hasChildren="hasChildren" />
		<component :is="unmountFileSystemComponent" v-else :showFlag="showUnmountFileSystemConfirm"
			@close="updateShowUnmountFileSystem" :idKey="'confirm-unmount-filesystem'" :item="'filesystem'"
			:operation="'unmount'" :filesystem="selectedDataset!" :confirmOperation="confirmThisUnmount"
			:firstOption="'force unmount'" :hasChildren="hasChildren" />
	</div>

	<div v-if="showMountFileSystemConfirm">
		<component :is="mountFileSystemComponent" :showFlag="showMountFileSystemConfirm"
			@close="updateShowMountFileSystem" :idKey="'confirm-mount-filesystem'" :item="'filesystem'"
			:operation="'mount'" :filesystem="selectedDataset!" :confirmOperation="confirmThisMount"
			:firstOption="'force mount'" :hasChildren="hasChildren" />
	</div>

	<div v-if="showLockUnlockModal">
		<component :is="lockUnlockFileSystemComponent" :showFlag="showLockUnlockModal"
			@close="showLockUnlockModal = false" :idKey="'confirm-lock-or-unlock'" :mode="modeSelected!"
			:filesystem="selectedDataset!" />
	</div>

	<div v-if="showRenameModal">
		<component :is="renameFileSystemComponent" :idKey="'show-rename-modal'" :filesystem="selectedDataset!"
			@close="showRenameModal = false" />
	</div>

	<div v-if="showSnapshotModal">
		<component :is="createSnapshotComponent" :idKey="'show-create-snap-modal'" @close="showSnapshotModal = false"
			:item="'filesystem'" />
	</div>

	<div v-if="showChangePassphrase">
		<component :is="changePassphraseComponent" :idKey="'show-change-passphrase-modal'"
			@close="showChangePassphrase = false" :filesystem="selectedDataset!" />
	</div>

</template>

<script setup lang="ts">
import { ref, inject, Ref, provide, watch, onMounted, computed, reactive } from "vue";
import { ArrowPathIcon, ChevronUpIcon, LockClosedIcon, LockOpenIcon, NoSymbolIcon, CheckIcon, } from '@heroicons/vue/24/outline';
import { CameraIcon } from '@heroicons/vue/24/solid'
import { loadDatasets, loadSnapshots } from "../../composables/loadData";
import { getValue, convertBytesToSize, upperCaseWord, yesNoToBool } from '../../composables/helpers';
import { destroyDataset, unmountFileSystem, mountFileSystem, lockFileSystem } from "../../composables/datasets";
import LoadingSpinner from "../common/LoadingSpinner.vue";
import SnapshotsList from "../snapshots/SnapshotsList.vue";
import PfDropdownMenu from "../pf/PfDropdownMenu.vue";
import type { DropdownMenuItem } from "../pf/PfDropdownMenu.vue";
import { ZPool, ZFSFileSystemInfo } from "@45drives/houston-common-lib";
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { ConfirmationCallback, Snapshot } from "../../types";
import { getSnapshotsOfDataset } from "../../composables/snapshots";

const truncateText = inject<Ref<string>>('style-truncate-text')!;
const canDestructive = inject<Ref<boolean>>('can-destructive')!;

///////////////// Expandable Rows //////////////////
/////////////////////////////////////////////////////
const isExpanded = reactive(new Set<string>());

function toggleExpanded(name: string) {
	if (isExpanded.has(name)) {
		isExpanded.delete(name);
	} else {
		isExpanded.add(name);
	}
}

function getCompressionDisplay(dataset: any): string {
	if (dataset.properties.compression === 'off' || dataset.properties.compression === 'on') {
		return upperCaseWord(dataset.properties.compression) || 'N/A';
	}
	return dataset.properties.compression?.toUpperCase() || 'N/A';
}

///////////////// Dropdown Actions /////////////////
/////////////////////////////////////////////////////
function getFileSystemActions(dataset: any, datasetIdx: number): DropdownMenuItem[] {
	const items: DropdownMenuItem[] = [];

	items.push({
		label: 'Configure File System',
		action: () => loadFileSystemConfig(allDatasets.value[datasetIdx]),
		disabled: !canDestructive.value,
		tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
	});

	if (!findPoolDataset(allDatasets.value[datasetIdx])) {
		items.push({
			label: 'Rename File System',
			action: () => renameThisDataset(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (allDatasets.value[datasetIdx].properties.mounted == 'yes') {
		items.push({
			label: 'Unmount File System',
			action: () => unmountThisFileSystem(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (allDatasets.value[datasetIdx].properties.mounted == 'no' && !allDatasets.value[datasetIdx].encrypted) {
		items.push({
			label: 'Mount File System',
			action: () => mountThisFileSystem(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (allDatasets.value[datasetIdx].properties.mounted == 'no' && allDatasets.value[datasetIdx].encrypted && allDatasets.value[datasetIdx].key_loaded) {
		items.push({
			label: 'Mount File System',
			action: () => mountThisFileSystem(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (allDatasets.value[datasetIdx].properties.mounted == 'no' && allDatasets.value[datasetIdx].encrypted && !allDatasets.value[datasetIdx].key_loaded) {
		items.push({
			label: 'Unlock File System',
			action: () => handleFileSystemEncryption(allDatasets.value[datasetIdx], 'unlock'),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (allDatasets.value[datasetIdx].properties.mounted == 'no' && allDatasets.value[datasetIdx].encrypted && allDatasets.value[datasetIdx].key_loaded) {
		items.push({
			label: 'Lock File System',
			action: () => handleFileSystemEncryption(allDatasets.value[datasetIdx], 'lock'),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (allDatasets.value[datasetIdx].encrypted && allDatasets.value[datasetIdx].key_loaded) {
		items.push({
			label: 'Change Passphrase',
			action: () => changeThisPassphrase(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	items.push({
		label: 'Create Snapshot',
		action: () => createSnapshotBtn(allDatasets.value[datasetIdx]),
		disabled: !canDestructive.value,
		tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
	});

	if (!findPoolDataset(allDatasets.value[datasetIdx])) {
		items.push({
			label: 'Destroy File System',
			action: () => deleteFileSystem(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (!bulkSnapDestroyMode.get(dataset.name)) {
		items.push({
			label: 'Bulk Destroy Snapshot Mode',
			action: () => enterBulkSnapDestroyMode(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	if (bulkSnapDestroyMode.get(dataset.name)) {
		items.push({
			label: 'Leave Bulk Destroy Mode',
			action: () => exitBulkSnapDestroyMode(allDatasets.value[datasetIdx]),
			disabled: !canDestructive.value,
			tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined,
		});
	}

	return items;
}

///////// Values for Confirmation Modals ////////////
/////////////////////////////////////////////////////
const operationRunning = ref(false);
const firstOptionToggle = ref(false);
const secondOptionToggle = ref(false);
const thirdOptionToggle = ref(false);
const fourthOptionToggle = ref(false);

/////////////// Loading/Refreshing //////////////////
/////////////////////////////////////////////////////
// const fileSystemsLoaded = inject<Ref<boolean>>('datasets-loaded')!;
const fileSystemConfiguration = ref();
const showNewFSWizard = ref(false);
const showFSConfig = ref(false);

const pools = inject<Ref<ZPool[]>>('pools')!;
const fileSystems = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const selectedDataset = ref<ZFSFileSystemInfo>();
const snapshots = inject<Ref<Snapshot[]>>('snapshots')!;
const allDatasets = ref<any>([]);
const allDatasetsLoaded = ref(false);

async function refreshData() {
	allDatasetsLoaded.value = false;

	fileSystems.value = [];
	snapshots.value = [];
	allDatasets.value = [];

	await loadDatasets(fileSystems);
	for (const pool of pools.value) {
		if (pool.properties.listSnapshots) {
			await loadSnapshots(snapshots);
			break;
		}

	}


	await populateDatasetList();
	allDatasetsLoaded.value = true;
}

watch(showFSConfig, async (newVal, oldVal) => {
	if (showFSConfig.value == false) {
		await refreshData();
	}
});

///////////////////////////////////////////////////////////
async function populateDatasetList() {
	try {
		// console.log('fileSystems:', fileSystems.value);
		// console.log('snapshots:', snapshots.value);
		const combinedData = ref<any>([]);

		for (const pool of pools.value) {
			// console.log('Pool Name:', pool.name);
			const poolFileSystems = fileSystems.value.filter(filesystem => filesystem.pool === pool.name);
			// console.log('Filtered File Systems:', poolFileSystems);
			const poolSnapshots = snapshots.value.filter(snapshot => snapshot.pool === pool.name);
			// console.log('Filtered Snapshots:', poolSnapshots);
			if (pool.properties.listSnapshots) {
				combinedData.value.push(...poolFileSystems, ...poolSnapshots);
				console.log(`Added datasets & snaps from ${pool.name}`);
			} else {
				combinedData.value.push(...poolFileSystems);
				console.log(`Added only datasets from ${pool.name}`);
			}
		}

		// Sort the combined array alphabetically by name
		// combinedData.value.sort((a, b) => a.name.localeCompare(b.name));
		combinedData.value.sort(hierarchicalSort);

		combinedData.value.forEach(data => {
			allDatasets.value.push(data);
		});

		// console.log('Final allDatasets:', allDatasets.value);

	} catch (error) {
		console.error('Error in populateDatasetList:', error);
	}
}

function hierarchicalSort(a, b) {
	// Sort pools first (tank vs tank-backup)
	const [aPool, ...aRest] = a.name.split('/');
	const [bPool, ...bRest] = b.name.split('/');

	// Step 1: Sort by pool name (alphabetical)
	const poolCompare = aPool.localeCompare(bPool);
	if (poolCompare !== 0) return poolCompare;

	// Step 2: Sort by nested path components
	const aParts = aRest;
	const bParts = bRest;
	for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
		const cmp = aParts[i].localeCompare(bParts[i]);
		if (cmp !== 0) return cmp;
	}

	// Step 3: Shorter (shallower) path wins
	return aParts.length - bParts.length;
}

function getNestingLevel(dataset) {
	if (dataset.type === 'SNAPSHOT') {
		const match = dataset.name.match(/^(.+?)@/);
		if (match) return match[1].split('/').length * 4;
		return 0;
	} else {
		return dataset.name.split('/').length * 4;
	}
}

function findDatasetByName(name) {
	return allDatasets.value.find(dataset => dataset.name === name);
}

const debugNestingLevel = computed(() => {
	return allDatasets.value.map(dataset => ({
		name: dataset.name,
		nestingLevel: getNestingLevel(dataset),
		type: dataset.type
	}));
});

onMounted(async () => {
	await refreshData();
});

function findPoolDataset(fileSystem) {
	try {
		return pools.value.find(pool => pool.name == fileSystem.name);
	} catch (error) {
		console.log('error finding pool:', error);
	}
}
async function hasSnapshotsForDataset(fsName: string): Promise<boolean> {
	try {
		const map = await getSnapshotsOfDataset(fsName); // returns { [datasetName]: Snapshot[] }
		const list = map?.[fsName];
		return Array.isArray(list) && list.length > 0;
	} catch (e) {
		console.error('hasSnapshotsForDataset error:', e);
		return false;
	}
}

async function hasSnapshotsFor(fs: ZFSFileSystemInfo): Promise<boolean> {
	// Fast in-memory check first
	const inMemory = snapshots.value.some((s: any) =>
		(s?.dataset && s.dataset === fs.name) ||
		(typeof s?.name === 'string' && s.name.startsWith(fs.name + '@'))
	);

	if (inMemory) return true;

	// Authoritative fallback
	return hasSnapshotsForDataset(fs.name);
}


function findSnapDataset(fileSystem) {
	try {
		console.log('Searching for snapshot dataset:', fileSystem.name);
		const foundSnapshot = snapshots.value.some(snapshot => {
			console.log('Checking snapshot:', snapshot.dataset);
			return snapshot.dataset === fileSystem.name;
		});

		// console.log('Snapshot dataset found:', foundSnapshot);

		return foundSnapshot;
	} catch (error) {
		console.error('Error finding snapshot:', error);
		return false;
	}
}

///////////////// New File System ///////////////////
/////////////////////////////////////////////////////
const confirmCreateFS = ref(false);
const newFileSystemComponent = ref();
const loadNewFileSystemComponent = async () => {
	const module = await import('../pool-creation-wizard/FileSystem.vue');
	newFileSystemComponent.value = module.default;
}

async function newFileSystemWizard() {
	await loadNewFileSystemComponent();
	showNewFSWizard.value = true;
}

////////////// Configure File System ////////////////
/////////////////////////////////////////////////////
const configFileSystemComponent = ref();
const loadConfigFileSystemComponent = async () => {
	const module = await import('./FileSystemConfigModal.vue');
	configFileSystemComponent.value = module.default;
}

async function loadFileSystemConfig(fileSystem) {
	selectedDataset.value = fileSystem;
	// console.log('loading:', selectedDataset);
	await loadConfigFileSystemComponent();
	showFSConfig.value = true
}

///////////////// Create Snapshots //////////////////
/////////////////////////////////////////////////////
const showSnapshotModal = ref(false);
const creating = ref(false);
const confirmCreateSnap = ref(false);

const createSnapshotComponent = ref();
const loadCreateSnapshotComponent = async () => {
	const module = await import('../snapshots/CreateSnapshotModal.vue');
	createSnapshotComponent.value = module.default;
}

async function createSnapshotBtn(filesystem) {
	selectedDataset.value = filesystem;
	await loadCreateSnapshotComponent();
	showSnapshotModal.value = true;
	// console.log('create snapshot modal triggered');
}

watch(confirmCreateSnap, async (newVal, oldVal) => {
	if (confirmCreateSnap.value == true) {
		operationRunning.value = true;
		await refreshData();
		confirmCreateSnap.value = false;
		operationRunning.value = false;
	}
});

////////////// Destroy File System //////////////////
/////////////////////////////////////////////////////
const hasChildren = ref(false);

const destroyChildren = ref(false);
const destroyAllDependents = ref(false);
const showDeleteFileSystemConfirm = ref(false);
const confirmDelete = ref(false);
const confirmDestroySnap = ref(false);

const deleteFileSystemComponent = ref();
const loadDeleteFileSystemComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	deleteFileSystemComponent.value = module.default;
}

async function deleteFileSystem(fileSystem: ZFSFileSystemInfo) {
	operationRunning.value = false;
	selectedDataset.value = fileSystem;

	const isPool = !!findPoolDataset(fileSystem);
	const hasChildDatasets =
		Array.isArray(fileSystem.children) && fileSystem.children.length > 0;

	const hasSnaps = await hasSnapshotsFor(fileSystem);

	hasChildren.value = (!isPool && hasChildDatasets) || hasSnaps;

	console.log({
		fs: fileSystem.name,
		hasChildDatasets,
		hasSnaps,
		hasChildren: hasChildren.value,
	});

	await loadDeleteFileSystemComponent();
	showDeleteFileSystemConfirm.value = true;
}

const confirmThisDestroy: ConfirmationCallback = () => {
	confirmDelete.value = true;
}

const updateShowDestroyFileSystem = (newVal) => {
	showDeleteFileSystemConfirm.value = newVal;
}

watch(confirmDelete, async (newValue, oldValue) => {
	if (confirmDelete.value == true) {
		operationRunning.value = true;
		console.log('now deleting:', newValue);

		try {
			const output: any = await destroyDataset(selectedDataset.value!, firstOptionToggle.value, thirdOptionToggle.value, fourthOptionToggle.value);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				operationRunning.value = false;
				pushNotification(new Notification('Destroy Dataset Failed', `${selectedDataset.value!.name} was not destroyed: ${errorMessage}`, 'error', 5000));
				confirmDelete.value = false;
			} else {
				operationRunning.value = false;

				console.log('deleted:', selectedDataset.value!);
				firstOptionToggle.value = false;
				thirdOptionToggle.value = false;
				fourthOptionToggle.value = false;
				confirmDelete.value = false;

				await refreshData();
				pushNotification(new Notification('File System Destroyed', selectedDataset.value!.name + " destroyed.", 'success', 5000));
				await refreshData();
				showDeleteFileSystemConfirm.value = false;
			}

		} catch (error) {
			console.error(error);
		}
	}
});

/////////////// Unmount File System /////////////////
/////////////////////////////////////////////////////
const showUnmountFileSystemConfirm = ref(false);
const forceUnmount = ref(false);
const unmounting = ref(false);
const confirmUnmount = ref(false);

const unmountFileSystemComponent = ref();
const loadUnmountFileSystemComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	unmountFileSystemComponent.value = module.default;
}

async function unmountThisFileSystem(fileSystem) {
	selectedDataset.value = fileSystem;
	console.log('selected to be unmounted:', selectedDataset.value);
	await loadUnmountFileSystemComponent();
	showUnmountFileSystemConfirm.value = true;
}

const confirmThisUnmount: ConfirmationCallback = () => {
	confirmUnmount.value = true;
}

const updateShowUnmountFileSystem = (newVal) => {
	showUnmountFileSystemConfirm.value = newVal;
}

watch(confirmUnmount, async (newValue, oldValue) => {
	// console.log('confirmUnmount changed:', newValue);

	if (confirmUnmount.value == true) {
		unmounting.value = true;
		operationRunning.value = true;

		try {
			const output: any = await unmountFileSystem(selectedDataset.value!, forceUnmount.value);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				operationRunning.value = false;
				unmounting.value = false;
				confirmUnmount.value = false;
				pushNotification(new Notification('Unmount Dataset Failed', `${selectedDataset.value!.name} was not unmounted: ${errorMessage}`, 'error', 5000));

			} else {
				console.log('unmounted:', selectedDataset.value!);
				if (selectedDataset.value?.encrypted && secondOptionToggle.value) {
					try {
						const lockOutput: any = await lockFileSystem(selectedDataset.value!);

						if (lockOutput == null || lockOutput.error) {
							const lockErrorMsg = lockOutput?.error || 'Unknown error';
							pushNotification(new Notification('Lock Dataset Failed', `Failed to lock ${selectedDataset.value!.name}: ${lockErrorMsg}`, 'error', 5000));

						} else {
							pushNotification(new Notification('Dataset Locked', `Successfully locked ${selectedDataset.value!.name}.`, 'success', 5000));

						}

					} catch (error) {
						console.error(error);
					}
				}
				confirmUnmount.value = false;
				forceUnmount.value = false;
				await refreshData();

				unmounting.value = false;
				operationRunning.value = false;
				pushNotification(new Notification('File System Unmounted', selectedDataset.value!.name + " unmounted.", 'success', 5000));

				showUnmountFileSystemConfirm.value = false;
			}

		} catch (error) {
			console.error(error);
		}
	}
});

//////////////// Mount File System //////////////////
/////////////////////////////////////////////////////
const showMountFileSystemConfirm = ref(false);
const forceMount = ref(true);
const mounting = ref(false);
const confirmMount = ref(false);

const mountFileSystemComponent = ref();
const loadMountFileSystemComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	mountFileSystemComponent.value = module.default;
}

async function mountThisFileSystem(fileSystem) {
	selectedDataset.value = fileSystem;
	console.log('selected to be mounted:', selectedDataset.value);
	await loadMountFileSystemComponent();
	showMountFileSystemConfirm.value = true;
}

const confirmThisMount: ConfirmationCallback = () => {
	confirmMount.value = true;
}

const updateShowMountFileSystem = (newVal) => {
	showMountFileSystemConfirm.value = newVal;
}

watch(confirmMount, async (newValue, oldValue) => {
	// console.log('confirmMount changed:', newValue);

	if (confirmMount.value == true) {
		mounting.value = true;
		operationRunning.value = true;

		try {
			const output: any = await mountFileSystem(selectedDataset.value!, forceMount.value);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				operationRunning.value = false;
				mounting.value = false;
				pushNotification(new Notification('Mount Dataset Failed', `${selectedDataset.value!.name} was not mounted: ${errorMessage}`, 'error', 5000));

				confirmMount.value = false;
			} else {
				console.log('mounted:', selectedDataset.value!);
				confirmMount.value = false;
				forceMount.value = false;
				await refreshData();

				mounting.value = false;
				operationRunning.value = false;
				pushNotification(new Notification('File System Mounted', selectedDataset.value!.name + " mounted.", 'success', 5000));

				showMountFileSystemConfirm.value = false;
			}
		} catch (error) {
			console.error(error);
		}

	}
});

//////////////// Rename File System /////////////////
/////////////////////////////////////////////////////
const showRenameModal = ref(false);
const renaming = ref(false);
const confirmRename = ref(false);

const renameFileSystemComponent = ref();
const loadRenameFileSystemComponent = async () => {
	const module = await import('./RenameFileSystem.vue');
	renameFileSystemComponent.value = module.default;
}

async function renameThisDataset(fileSystem) {
	selectedDataset.value = fileSystem;
	console.log('selected to be renamed:', selectedDataset.value);
	await loadRenameFileSystemComponent();
	showRenameModal.value = true;
}

watch(confirmRename, async (newVal, oldVal) => {
	if (confirmRename.value == true) {
		operationRunning.value = true;
		await refreshData();
		confirmRename.value = false;
		operationRunning.value = false;
	}
});


/////////////// Change Passphrase ///////////////////
/////////////////////////////////////////////////////
const showChangePassphrase = ref(false);
const changing = ref(false);
const confirmChange = ref(false);

const changePassphraseComponent = ref();
const loadChangePassphraseComponent = async () => {
	const module = await import('./ChangePassphrase.vue');
	changePassphraseComponent.value = module.default;
}

async function changeThisPassphrase(fileSystem) {
	selectedDataset.value = fileSystem;
	console.log('selected to change passphrase:', selectedDataset.value);
	await loadChangePassphraseComponent();
	showChangePassphrase.value = true;
}

watch(confirmChange, async (newVal, oldVal) => {
	if (confirmChange.value == true) {
		operationRunning.value = true;
		await refreshData();
		confirmRename.value = false;
		operationRunning.value = false;
	}
});

/////////// Locking/Unlocking File System ///////////
/////////////////////////////////////////////////////
const showLockUnlockModal = ref(false);
const confirmLockOrUnlock = ref(false);
const lockingOrUnlocking = ref(false);
const modeSelected = ref('');

const lockUnlockFileSystemComponent = ref();
const loadlockUnlockFileSystemComponent = async () => {
	const module = await import('./LockUnlockFileSystem.vue');
	lockUnlockFileSystemComponent.value = module.default;
}

async function handleFileSystemEncryption(fileSystem: ZFSFileSystemInfo, mode: 'lock' | 'unlock') {
	selectedDataset.value = fileSystem;
	modeSelected.value = mode;
	console.log(`selected to be ${mode}ed: ${selectedDataset.value.name}`);
	await loadlockUnlockFileSystemComponent();
	showLockUnlockModal.value = true;
}

watch(confirmLockOrUnlock, async (newVal, oldVal) => {
	if (confirmLockOrUnlock.value == true) {
		operationRunning.value = true;
		await refreshData();
		confirmLockOrUnlock.value = false;
		operationRunning.value = false;
	}
});

watch(confirmDestroySnap, async (newVal, oldVal) => {
	if (confirmDestroySnap.value == true) {
		await refreshData();
	}
});

watch(confirmCreateFS, async (newVal, oldVal) => {
	if (confirmCreateFS.value == true) {
		await refreshData();
	}
});

const confirmSendSnap = ref(false);
watch(confirmSendSnap, async (newVal, oldVal) => {
	if (confirmSendSnap.value == true) {
		await refreshData();
	}
});

const confirmCloneSnap = ref(false);
watch(confirmCloneSnap, async (newVal, oldVal) => {
	if (confirmCloneSnap.value == true) {
		await refreshData();
	}
});

///////////// Destroy Snaps in Bulk /////////////////
/////////////////////////////////////////////////////
const bulkSnapDestroyMode = reactive(new Map<string, boolean>());

function enterBulkSnapDestroyMode(dataset) {
	bulkSnapDestroyMode.set(dataset.name, true);
	// console.log('Bulk Snap Destroy Mode Enabled for:', dataset.name);
}

function exitBulkSnapDestroyMode(dataset) {
	bulkSnapDestroyMode.set(dataset.name, false);
}


provide('bulk-destroy-snaps', bulkSnapDestroyMode);
provide('confirm-clone-snap', confirmCloneSnap);
provide('confirm-send-snap', confirmSendSnap);
provide('all-datasets', allDatasets);
provide('datasets-loaded', allDatasetsLoaded);
provide('show-fs-wizard', showNewFSWizard);
provide('show-fs-config', showFSConfig);
provide('confirm-create-filesystem', confirmCreateFS);
provide('show-delete-filesystem-confirm', showDeleteFileSystemConfirm);
provide('confirm-delete-filesystem', confirmDelete);
provide('destroy-children', destroyChildren);
provide('destroy-dependents', destroyAllDependents);
provide('confirm-destroy-snap', confirmDestroySnap);
provide('has-children', hasChildren);
provide('selected-dataset', selectedDataset);

provide('show-mount-filesystem-confirm', showMountFileSystemConfirm);
provide('confirm-mount-filesystem', confirmMount);
provide('mounting', mounting);
provide('force-mount', forceMount);

provide('show-unmount-filesystem-confirm', showUnmountFileSystemConfirm);
provide('confirm-unmount-filesystem', confirmUnmount);
provide('unmounting', unmounting);
provide('force-unmount', forceUnmount);

provide('show-rename-modal', showRenameModal);
provide('renaming', renaming);
provide('confirm-rename', confirmRename);

provide('create-snap-modal', showSnapshotModal);
provide('creating', creating);
provide('confirm-create-snap', confirmCreateSnap);

provide('show-change-passphrase', showChangePassphrase);
provide('changing', changing);
provide('confirm-change', confirmChange);

provide('show-lock-unlock-modal', showLockUnlockModal);
provide('locking-or-unlocking', lockingOrUnlocking);
provide('confirm-lock-or-unlock', confirmLockOrUnlock);
provide('mode-selected', modeSelected);

provide('modal-confirm-running', operationRunning);
provide('modal-option-one-toggle', firstOptionToggle);
provide('modal-option-two-toggle', secondOptionToggle);
provide('modal-option-three-toggle', thirdOptionToggle);
provide('modal-option-four-toggle', fourthOptionToggle);
</script>
