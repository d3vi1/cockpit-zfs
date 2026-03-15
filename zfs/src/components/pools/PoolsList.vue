<template>
	<div
		class="inline-block min-w-full min-h-full py-4 align-middle sm:px-4 lg:px-6 overflow-visible bg-accent rounded-md border border-default">
		<!-- PF Toolbar -->
		<div class="pf-v5-c-toolbar">
			<div class="pf-v5-c-toolbar__content">
				<div class="pf-v5-c-toolbar__group">
					<button id="createPool" class="pf-v5-c-button pf-m-primary"
						:disabled="!canDestructive"
						:title="!canDestructive ? 'Requires administrative privileges' : ''"
						@click="newPoolWizardBtn">Create Storage Pool</button>
					<button id="importPool" class="pf-v5-c-button pf-m-secondary"
						:disabled="!canDestructive"
						:title="!canDestructive ? 'Requires administrative privileges' : ''"
						@click="importNewPoolBtn">Import Storage Pool</button>
				</div>
				<div class="pf-v5-c-toolbar__item pf-m-pagination">
					<button id="refreshPools" class="pf-v5-c-button pf-m-plain" aria-label="Refresh pools"
						@click="refreshAllData">
						<ArrowPathIcon class="w-5 h-5" />
					</button>
				</div>
			</div>
		</div>

		<div class="mt-4 rounded-md max-w-full">
			<div class="inline-block min-w-full min-h-full shadow align-middle rounded-md border border-default">
				<div class="whitespace-nowrap text-ellipsis ring-1 ring-black ring-opacity-5 rounded-md">

					<table class="pf-v5-c-table pf-m-grid-md min-w-full divide-y divide-default rounded-md">
						<thead class="rounded-md">
							<tr class="pf-v5-c-table__tr bg-well rounded-t-md">
								<th class="pf-v5-c-table__th" style="width: 3rem;">
									<span class="sr-only">Toggle</span>
								</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-left"
									:class="truncateText" title="Name">Name</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-center"
									:class="truncateText" title="Status">Status</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-center"
									:class="truncateText" title="Used (%)">Used (%)</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-center"
									:class="truncateText" title="Used">Used</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-center"
									:class="truncateText" title="Available">Available</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-center"
									:class="truncateText" title="Total">Total</th>
								<th class="pf-v5-c-table__th py-2 font-semibold text-default text-center"
									:class="truncateText" title="Message">Message</th>
								<th class="pf-v5-c-table__th" style="width: 3rem;">
									<span class="sr-only">Actions</span>
								</th>
							</tr>
						</thead>

						<tbody class="pf-v5-c-table__tbody">
							<template v-if="poolData.length > 0 && poolsLoaded == true">
								<template v-for="(pool, poolIdx) in poolData" :key="poolIdx">
									<PoolListElement :poolIdx="poolIdx" :pool="pool" />
								</template>
							</template>
						</tbody>
					</table>

					<div v-if="poolsLoaded == false" class="p-2 flex justify-center bg-default ">
						<LoadingSpinner :width="'w-10'" :height="'h-10'" :baseColor="'text-gray-200'"
							:fillColor="'fill-slate-500'" class="font-semibold text-lg my-0.5" />
					</div>
					<!-- PF EmptyState -->
					<div v-if="poolData.length < 1 && poolsLoaded == true" class="pf-v5-c-empty-state">
						<div class="pf-v5-c-empty-state__content">
							<h2 class="pf-v5-c-empty-state__header">
								<div class="pf-v5-c-empty-state__title-text">No Pools Found</div>
							</h2>
						</div>
					</div>

				</div>
			</div>
		</div>
	</div>

	<div v-if="showNewPoolWizard">
		<component :is="createPoolComponent" @close="showNewPoolWizard = false" />
	</div>

	<div v-if="showImportModal">
		<component :is="importPoolComponent" :idKey="'import-pool'" />
	</div>
</template>

<script setup lang="ts">
import { ref, inject, Ref, provide } from "vue";
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import PoolListElement from './PoolListElement.vue';
import LoadingSpinner from '../common/LoadingSpinner.vue';
import { VDevDisk } from "@45drives/houston-common-lib/dist/lib/managers/zfs/types";
import { ZFSFileSystemInfo, ZPool } from "@45drives/houston-common-lib/lib/managers/zfs/types";
import { PoolScanObjectGroup, PoolDiskStats, Activity } from "../../types";
import { useRefreshAllData } from "../../composables/useRefreshAllData";

/////////////// Loading/Refreshing //////////////////
/////////////////////////////////////////////////////
const poolData = inject<Ref<ZPool[]>>("pools")!;
const diskData = inject<Ref<VDevDisk[]>>("disks")!;
const filesystemData = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const disksLoaded = inject<Ref<boolean>>('disks-loaded')!;
const poolsLoaded = inject<Ref<boolean>>('pools-loaded')!;
const fileSystemsLoaded = inject<Ref<boolean>>('datasets-loaded')!;
const scanObjectGroup = inject<Ref<PoolScanObjectGroup>>('scan-object-group')!;
const poolDiskStats = inject<Ref<PoolDiskStats>>('pool-disk-stats')!;
const scanActivities = inject<Ref<Map<string, Activity>>>('scan-activities')!;
const trimActivities = inject<Ref<Map<string, Activity>>>('trim-activities')!;
const truncateText = inject<Ref<string>>('style-truncate-text')!;
const canDestructive = inject<Ref<boolean>>('can-destructive')!;

const { refreshAllData } = useRefreshAllData({
	poolData,
	diskData,
	filesystemData,
	disksLoaded,
	poolsLoaded,
	fileSystemsLoaded,
	scanObjectGroup,
	poolDiskStats,
	scanActivities,
	trimActivities
});


/////////////// Create/Import Pool //////////////////
/////////////////////////////////////////////////////
const showNewPoolWizard = ref(false);

const createPoolComponent = ref();
const loadCreatePoolComponent = async () => {
	const module = await import('../pool-creation-wizard/CreatePool.vue');
	createPoolComponent.value = module.default;
}

async function newPoolWizardBtn() {
	await loadCreatePoolComponent();
	showNewPoolWizard.value = true;
}

const showImportModal = ref(false);

const importPoolComponent = ref();
const loadImportPoolComponent = async () => {
	const module = await import('./ImportPool.vue');
	importPoolComponent.value = module.default;
}

async function importNewPoolBtn() {
	await loadImportPoolComponent();
	showImportModal.value = true;
}

provide('show-wizard', showNewPoolWizard);
provide("show-import-modal", showImportModal);
</script>