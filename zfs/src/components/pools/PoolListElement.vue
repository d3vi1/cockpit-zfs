<template>
	<!-- PF expandable table row: main pool row -->
	<tr class="pf-v5-c-table__tr bg-default" @click="isExpanded = !isExpanded" style="cursor: pointer;">
		<td class="pf-v5-c-table__toggle">
			<button class="pf-v5-c-button pf-m-plain" @click.stop="isExpanded = !isExpanded"
				:aria-expanded="isExpanded" :title="poolData[props.poolIdx].name" aria-label="Toggle pool details">
				<svg class="pf-v5-c-table__toggle-icon" :style="{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
					viewBox="0 0 256 512" fill="currentColor" aria-hidden="true" style="width:1em;height:1em;">
					<path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z"/>
				</svg>
			</button>
		</td>
		<td class="pf-v5-c-table__td py-1 text-left" :class="truncateText" :title="poolData[props.poolIdx].name">
			<span class="flex flex-row items-center">
				{{ poolData[props.poolIdx].name }}
				<span v-if="upgradeablePool"
					title="Pool was made with a legacy version of ZFS. Upgrade available."
					class="flex flex-row items-center ml-1">
					<ExclamationCircleIcon class="w-5 text-orange-700" />
				</span>
			</span>
		</td>
		<td class="pf-v5-c-table__td py-1 font-semibold text-center"
			:class="[formatStatus(poolData[props.poolIdx].status), truncateText]"
			:title="poolData[props.poolIdx].status">{{ poolData[props.poolIdx].status }}</td>
		<td class="pf-v5-c-table__td py-1 text-center">
			<!-- PF Progress bar -->
			<div class="pf-v5-c-progress" :class="{'pf-m-danger': Number(props.pool.properties.capacity) > 80}"
				:title="props.pool.properties.capacity + '%'">
				<div class="pf-v5-c-progress__description">{{ props.pool.properties.capacity }}%</div>
				<div class="pf-v5-c-progress__bar" role="progressbar"
					:aria-valuenow="Number(props.pool.properties.capacity)" aria-valuemin="0" aria-valuemax="100">
					<div class="pf-v5-c-progress__indicator" :style="{ width: props.pool.properties.capacity + '%' }"></div>
				</div>
			</div>
		</td>
		<td class="pf-v5-c-table__td py-1 text-center" :class="truncateText"
			:title="poolData[props.poolIdx].properties.allocated">{{
			poolData[props.poolIdx].properties.allocated }}</td>
		<td class="pf-v5-c-table__td py-1 text-center" :class="truncateText"
			:title="poolData[props.poolIdx].properties.available.toString()">{{ poolData[props.poolIdx].properties.available }}
		</td>
		<td class="pf-v5-c-table__td py-1 text-center" :class="truncateText"
			:title="poolData[props.poolIdx].properties.size">{{ poolData[props.poolIdx].properties.size }}
		</td>
		<td class="pf-v5-c-table__td py-1 text-center" @click.stop>
			<Status :pool="poolData[props.poolIdx]" :isDisk="false" :isTrim="false" :isPoolList="true"
				:isPoolDetail="false" :idKey="'scan-status-box'" ref="scanStatusBox" />
		</td>
		<td class="pf-v5-c-table__td py-1 text-right" @click.stop>
			<PfDropdownMenu :items="poolMenuItems" :kebab="true" />
		</td>
	</tr>
	<!-- PF expandable content row -->
	<tr class="pf-v5-c-table__expandable-row" :class="{'pf-m-expanded': isExpanded}" v-if="isExpanded">
		<td :colspan="9">
			<div v-for="(vDev, vDevIdx) in poolData[props.poolIdx].vdevs" :key="vDevIdx">
				<VDevElement :pool="poolData[props.poolIdx]" :poolIdx="props.poolIdx" :vDev="vDev"
					:vDevIdx="vDevIdx" ref="vDevElement" />
			</div>
		</td>
	</tr>

	<div v-if="showPoolDetails">
		<component :is="showPoolDetailsComponent" :showFlag="showPoolDetails" @close="updateShowPoolDetails"
			:confirm="confirmSavePoolDetails" :pool="selectedPool!" />
	</div>

	<div v-if="showDeletePoolConfirm">
		<component :is="confirmDeletePoolComponent" :showFlag="showDeletePoolConfirm" @close="updateShowDestroyPool"
			:idKey="'confirm-destroy-pool'" :item="'pool'" :operation="'destroy'" :pool="selectedPool!"
			:confirmOperation="confirmThisDestroy" :firstOption="'force unmount'" :secondOption="'clear disk labels'"
			:hasChildren="false" />
	</div>

	<div v-if="showResilverModal">
		<component :is="confirmResilverPoolComponent" :showFlag="showResilverModal" @close="updateShowResilverPool"
			:idKey="'confirm-resilver-pool'" :item="'pool'" :operation="'resilver'" :pool="selectedPool!"
			:confirmOperation="confirmThisResilver" :hasChildren="false" />
	</div>

	<div v-if="showScrubModal">
		<component :is="scrubConfirmComponent" :showFlag="showScrubModal" @close="updateShowScrubPool"
			:idKey="'confirm-scrub-pool'" :item="'pool'" :operation="'scrub'" :pool="selectedPool!"
			:confirmOperation="confirmThisScrub" :hasChildren="false" />
	</div>

	<div v-if="showPauseScrubConfirm">
		<component :is="scrubPauseConfirmComponent" :showFlag="showPauseScrubConfirm" @close="updateShowPauseScrub"
			:idKey="'confirm-pause-scrub'" :item="'pool'" :operation="'pause'" :operation2="'scrub'"
			:pool="selectedPool!" :confirmOperation="confirmPauseThisScrub" :hasChildren="false" />
	</div>

	<div v-if="showStopScrubConfirm">
		<component :is="scrubStopConfirmComponent" :showFlag="showStopScrubConfirm" @close="updateShowStopScrub"
			:idKey="'confirm-stop-scrub'" :item="'pool'" :operation="'stop'" :operation2="'scrub'" :pool="selectedPool!"
			:confirmOperation="confirmStopThisScrub" :hasChildren="false" />
	</div>

	<div v-if="showTrimModal">
		<component :is="trimConfirmComponent" :showFlag="showTrimModal" @close="updateShowTrimPool"
			:idKey="'confirm-trim-pool'" :item="'pool'" :operation="'trim'" :pool="selectedPool!"
			:confirmOperation="confirmThisTrim" :firstOption="'secure TRIM'" :hasChildren="false" />
	</div>

	<div v-if="showPauseTrimConfirm">
		<component :is="trimPauseConfirmComponent" :showFlag="showPauseTrimConfirm" @close="updateShowPauseTrim"
			:idKey="'confirm-pause-trim'" :item="'pool'" :operation="'pause'" :operation2="'trim'" :pool="selectedPool!"
			:confirmOperation="confirmPauseThisTrim" :hasChildren="false" />
	</div>

	<div v-if="showStopTrimConfirm">
		<component :is="trimStopConfirmComponent" :showFlag="showStopTrimConfirm" @close="updateShowStopTrim"
			:idKey="'confirm-stop-trim'" :item="'pool'" :operation="'stop'" :operation2="'trim'" :pool="selectedPool!"
			:confirmOperation="confirmStopThisTrim" :hasChildren="false" />
	</div>

	<div v-if="showExportModal">
		<component :is="exportConfirmComponent" :showFlag="showExportModal" @close="updateShowExportPool"
			:idKey="'confirm-export-pool'" :item="'pool'" :operation="'export'" :pool="selectedPool!"
			:confirmOperation="confirmThisExport" :firstOption="'force unmount'" :hasChildren="false" />
	</div>

	<div v-if="showAddVDevModal">
		<component :is="showAddVDevComponent" @close="showAddVDevModal = false" :idKey="'show-vdev-modal'"
			:pool="selectedPool!" :marginTop="'mt-28'" />
	</div>

	<div v-if="showUpgradeModal">
		<component :is="upgradeConfirmComponent" :showFlag="showUpgradeModal" @close="updateShowUpgradePool"
			:idKey="'confirm-upgrade-pool'" :item="'pool'" :operation="'upgrade'" :pool="selectedPool!"
			:confirmOperation="confirmThisUpgrade" :hasChildren="false" />
	</div>

</template>
<script setup lang="ts">
import { ref, inject, Ref, provide, watch, computed, onMounted} from "vue";
import { ExclamationCircleIcon } from '@heroicons/vue/24/outline';
import { destroyPool, trimPool, scrubPool, resilverPool, clearErrors, exportPool, upgradePool } from "../../composables/pools";
import { labelClear } from "../../composables/disks";
import { formatStatus, isPoolUpgradable, getCapacityColor  } from '../../composables/helpers';
import VDevElement from "./VDevElement.vue";
import Status from "../common/Status.vue";
import PfDropdownMenu from "../pf/PfDropdownMenu.vue";
import type { DropdownMenuItem } from "../pf/PfDropdownMenu.vue";
import { ZPool, VDevDisk, ZFSFileSystemInfo } from "@45drives/houston-common-lib";
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { PoolScanObjectGroup, PoolDiskStats, ConfirmationCallback, Activity } from "../../types";
import { useRefreshAllData } from "../../composables/useRefreshAllData";

interface PoolListElementProps {
    poolIdx: number;
	pool: ZPool;
}

const props = defineProps<PoolListElementProps>();
const truncateText = inject<Ref<string>>('style-truncate-text')!;
const canDestructive = inject<Ref<boolean>>('can-destructive')!;

// PF expandable row state (replaces HeadlessUI Disclosure)
const isExpanded = ref(false);

// Computed menu items for PfDropdownMenu (replaces HeadlessUI Menu)
const poolMenuItems = computed<DropdownMenuItem[]>(() => {
	const items: DropdownMenuItem[] = [
		{ label: 'Pool Details', action: () => showPoolModal(poolData.value[props.poolIdx]) },
	];

	if (canDestructive.value) {
		items.push({ label: 'Clear Pool Errors', action: () => clearPoolErrors(poolData.value[props.poolIdx].name) });

		if (upgradeablePool.value) {
			items.push({ label: 'Upgrade Pool', action: () => upgradeThisPool(props.pool) });
		}

		if (!scanActivity.value?.isActive) {
			items.push({ label: 'Resilver Pool', action: () => resilverThisPool(props.pool) });
		}

		// Scrub actions
		if (!scanActivity.value?.isActive) {
			items.push({ label: 'Scrub Pool', action: () => scrubThisPool(props.pool) });
		}
		if (scanActivity.value?.isActive && scanActivity.value?.isPaused && scanOperation.value == 'SCRUB') {
			items.push({ label: 'Resume Scrub', action: () => resumeScrub(props.pool) });
		}
		if (scanActivity.value?.isActive && !scanActivity.value?.isPaused && scanOperation.value == 'SCRUB') {
			items.push({ label: 'Pause Scrub', action: () => pauseScrub(props.pool) });
		}
		if (scanActivity.value?.isActive && scanOperation.value == 'SCRUB') {
			items.push({ label: 'Cancel Scrub', action: () => stopScrub(props.pool) });
		}

		// TRIM actions
		if (!trimActivity.value?.isActive && !trimActivity.value?.isPaused && poolData.value[props.poolIdx].diskType != 'HDD' && getIsTrimmable()) {
			items.push({ label: 'TRIM Pool', action: () => trimThisPool(poolData.value[props.poolIdx]) });
		}
		if (trimActivity.value?.isPaused && poolData.value[props.poolIdx].diskType != 'HDD' && getIsTrimmable()) {
			items.push({ label: 'Resume TRIM (Pool)', action: () => resumeTrim(poolData.value[props.poolIdx]) });
		}
		if (trimActivity.value?.isActive && poolData.value[props.poolIdx].diskType != 'HDD' && getIsTrimmable()) {
			items.push({ label: 'Pause TRIM (Pool)', action: () => pauseTrim(poolData.value[props.poolIdx]) });
		}
		if ((trimActivity.value?.isActive || trimActivity.value?.isPaused) && poolData.value[props.poolIdx].diskType != 'HDD' && getIsTrimmable()) {
			items.push({ label: 'Cancel TRIM (Pool)', action: () => stopTrim(poolData.value[props.poolIdx]) });
		}

		items.push({ label: 'Add Virtual Device', action: () => showAddVDev(poolData.value[props.poolIdx]) });
		items.push({ label: 'Export Pool', action: () => exportThisPool(poolData.value[props.poolIdx]) });
		items.push({ label: 'Destroy Pool', action: () => destroyPoolAndUpdate(poolData.value[props.poolIdx]) });
	}

	return items;
});

const selectedPool = ref<ZPool>();
const selectedDisk = ref<VDevDisk>();

const scanObjectGroup = inject<Ref<PoolScanObjectGroup>>('scan-object-group')!;
const poolDiskStats = inject<Ref<PoolDiskStats>>('pool-disk-stats')!;

const clearLabels = inject<Ref<boolean>>('clear-labels')!;

function getIsTrimmable() {
	selectedPool.value = props.pool;
	if (selectedPool.value.diskType! != 'HDD') {
		if (selectedPool.value.vdevs.some(vdev => vdev.type == 'data' || vdev.type == 'log' || vdev.type == 'special' || vdev.type == 'dedup')) {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

onMounted(() => {
	getIsTrimmable();
	canUpgradePool(props.pool.name);
});

const capacityColor = computed(() =>
	getCapacityColor("bg", props.pool.properties.capacity, props.pool.properties.refreservationPercent!)
);

///////// Values for Confirmation Modals ////////////
/////////////////////////////////////////////////////
const operationRunning = ref(false);
const firstOptionToggle = ref(false);
const secondOptionToggle = ref(false);
const thirdOptionToggle = ref(false);
const fourthOptionToggle = ref(false);

///////////////// Show Pool Details /////////////////
/////////////////////////////////////////////////////
const showPoolDetails = ref(false);
const confirmSavePool = ref(false);

const showPoolDetailsComponent = ref();
const loadShowPoolDetailsComponent = async () => {
	const module = await import('./PoolDetail.vue');
	showPoolDetailsComponent.value = module.default;
}

async function showPoolModal(pool) {
	selectedPool.value = pool;
	// console.log('loading:', selectedPool.value);
	await loadShowPoolDetailsComponent();
	showPoolDetails.value = true;
}

const confirmSavePoolDetails : ConfirmationCallback = () => {
	confirmSavePool.value = true;
}

const updateShowPoolDetails = (newVal) => {
	showPoolDetails.value = newVal;
}

watch(confirmSavePool, async (newVal, oldVal) => {
	if (confirmSavePool.value == true) {
		pushNotification(new Notification('Pool Config Saved', "Successfully saved this pool's configuration.", 'success', 5000));
		await refreshAllData();
	}
});


/////////////// Loading/Refreshing //////////////////
/////////////////////////////////////////////////////
const poolData = inject<Ref<ZPool[]>>("pools")!;
const diskData = inject<Ref<VDevDisk[]>>("disks")!;
const filesystemData = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const disksLoaded = inject<Ref<boolean>>('disks-loaded')!;
const poolsLoaded = inject<Ref<boolean>>('pools-loaded')!;
const fileSystemsLoaded = inject<Ref<boolean>>('datasets-loaded')!;

const scanOperation = computed(() => {
// console.log('scanOperation changed:', scanObjectGroup.value[props.pool.name].function);
	return scanObjectGroup.value[props.pool.name].function;
});


///////////////////// Scanning //////////////////////
/////////////////////////////////////////////////////
const scanStatusBox = ref();
const scanActivities = inject<Ref<Map<string, Activity>>>('scan-activities')!;

async function getScanStatus() {
	// console.log('scanStatusBox', scanStatusBox.value);

	await scanStatusBox.value.pollScanStatus();
}

//////////// Checking Disk Stats (Trim) /////////////
/////////////////////////////////////////////////////
const vDevElement = ref();
const trimActivities = inject<Ref<Map<string, Activity>>>('trim-activities')!;

async function getTrimStatus() {
	// console.log('vDevElement', vDevElement.value);
	// console.log('trimActivity:', trimActivity.value);
	// Check if vDevElement is defined and is an array
	if (vDevElement.value && Array.isArray(vDevElement.value) && vDevElement.value.length > 0) {
		await vDevElement.value[0].getDiskStatus();
	} else {
		console.error('vDevElement is not defined or does not contain an array with elements.');
	}
}

/////////////////////////////////////////////////////

const poolID = ref(props.pool.name);
const scanActivity = computed(() => {
	return scanActivities.value.get(poolID.value);
});
const trimActivity = computed(() => {
	return trimActivities.value.get(poolID.value);
});

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


////////////////// Destroy Pool /////////////////////
/////////////////////////////////////////////////////
const confirmDelete = ref(false);
const showDeletePoolConfirm = ref(false);
const hasChildren = ref(false);
const forceDestroy = ref(false);

const confirmDeletePoolComponent = ref();
const loadConfirmDeletePoolComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	confirmDeletePoolComponent.value = module.default;
}

async function destroyPoolAndUpdate(pool) {
	operationRunning.value = false;
	selectedPool.value = pool;
	clearLabels.value = false;
	await loadConfirmDeletePoolComponent();
	showDeletePoolConfirm.value = true;
	
	console.log('preparing to delete:', selectedPool.value);
}

const confirmThisDestroy : ConfirmationCallback = () => {
	confirmDelete.value = true;
}

const updateShowDestroyPool = (newVal) => {
	showDeletePoolConfirm.value = newVal;
}

watch(confirmDelete, async (newValue, oldValue) => {
	const poolName = selectedPool.value!.name;
	if (confirmDelete.value == true) {	
		operationRunning.value = true;
		console.log('now deleting:', selectedPool.value);

		try {
			const output: any = await destroyPool(selectedPool.value!, firstOptionToggle.value);

			if (output == null || output.error) {
				await refreshAllData();
				const stillExists = poolData.value.find(p => p.name === poolName);

				if (stillExists) {
					const errorMessage = output?.error || 'Unknown error';
					operationRunning.value = false;
					confirmDelete.value = false;

					if (errorMessage.includes("is busy")) {
						pushNotification(new Notification('Destroy Pool Failed', `Pool ${poolName} is busy. Close any active processes using it and try again.`, 'warning', 5000));
					} else {
						pushNotification(new Notification('Destroy Pool Failed', `${poolName} was not destroyed: ${errorMessage}`, 'error', 5000));
					}
				} else {
					// Treat as success
					confirmDelete.value = false;
					operationRunning.value = false;
					pushNotification(new Notification('Pool Destroyed', `${poolName} destroyed.`, 'success', 5000));
					showDeletePoolConfirm.value = false;
				}
			} else {
				if (secondOptionToggle.value == true) {
					selectedPool.value!.vdevs.forEach(vDev => {
						vDev.disks.forEach(async disk => {
							selectedDisk.value = disk;
							await labelClear(selectedDisk.value!);
						});
					});
				}

				await refreshAllData();
				confirmDelete.value = false;
				operationRunning.value = false;
				pushNotification(new Notification('Pool Destroyed', `${poolName} destroyed.`, 'success', 5000));

				showDeletePoolConfirm.value = false;
			}

		} catch (error) {
			console.error(error);
		}
	}
});

////////////////// Resilver Pool ////////////////////
/////////////////////////////////////////////////////
const confirmResilver = ref(false);
const showResilverModal = ref(false);
const resilvered = ref(false);

const confirmResilverPoolComponent = ref();
const loadConfirmResilverPoolComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	confirmResilverPoolComponent.value = module.default;
}

async function resilverThisPool(pool) {
	selectedPool.value = pool;
	await loadConfirmResilverPoolComponent();
	showResilverModal.value = true;

	console.log('preparing to resilver:', selectedPool.value);
}

const confirmThisResilver : ConfirmationCallback = () => {
	confirmResilver.value = true;
}

const updateShowResilverPool = (newVal) => {
	showResilverModal.value = newVal;
}

watch(confirmResilver, async (newValue, oldValue) => {
	if (confirmResilver.value == true) {
		resilvered.value = false;
		operationRunning.value = true;
		
		console.log('now resilvering:', selectedPool.value);
		try {
			const output: any = await resilverPool(selectedPool.value!);
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				confirmResilver.value = false;
				pushNotification(new Notification('Resilver Failed', `Resilver failed to start:${errorMessage}`, 'error', 5000));

				operationRunning.value = false;
			} else {
				getScanStatus();

				confirmResilver.value = false;
				resilvered.value = true;
				operationRunning.value = false;
				showResilverModal.value = false;
				pushNotification(new Notification('Resilver Started', 'Resilver on ' + selectedPool.value!.name + " started.", 'success', 5000));

			}
		} catch (error) { 
			console.error(error);
		}
	}
});


////////////////// Upgrade Pool /////////////////////
/////////////////////////////////////////////////////
const upgradeablePool = ref(false);
const showUpgradeModal = ref(false);
const confirmUpgrade = ref(false);
const upgrading = ref(false);

async function canUpgradePool(poolName) {
	return upgradeablePool.value = await isPoolUpgradable(props.pool.name);
}

const upgradeConfirmComponent = ref();
const loadUpgradeConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	upgradeConfirmComponent.value = module.default;
}

async function upgradeThisPool(pool) {
	selectedPool.value = pool;
	await loadUpgradeConfirmComponent();
	showUpgradeModal.value = true;
	console.log('preparing to upgrade:', selectedPool.value);
}

const confirmThisUpgrade: ConfirmationCallback = () => {
	confirmUpgrade.value = true;
}

const updateShowUpgradePool = (newVal) => {
	showUpgradeModal.value = newVal;
}

watch(confirmUpgrade, async (newVal, oldVal) => {
	if (confirmUpgrade.value == true) {
		operationRunning.value = true;
		console.log('now upgrading:', selectedPool.value);
		upgrading.value = true;
		try {
			const output: any = await upgradePool(selectedPool.value!);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Upgrade Failed', `Upgrade failed: ${errorMessage}`, 'error', 5000));

				operationRunning.value = false;
				confirmUpgrade.value = false;
			} else {
				getScanStatus();
				confirmUpgrade.value = false;
				operationRunning.value = false;
				pushNotification(new Notification('Upgrade Successful', 'Upgrade on ' + selectedPool.value!.name + " succeeded.", 'success', 5000));

				showUpgradeModal.value = false;
				canUpgradePool(selectedPool.value!.name);
			}
			upgrading.value = true;
		} catch (error) {
			console.error(error)
		}
	}
});

/////////////////// Scrub Pool //////////////////////
/////////////////////////////////////////////////////
const showScrubModal = ref(false);
const confirmScrub = ref(false);
const starting = ref(false);
const pausing = ref(false);
const stopping = ref(false);
const resuming = ref(false);

const scrubConfirmComponent = ref();
const loadScrubConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	scrubConfirmComponent.value = module.default;
}

const scrubPauseConfirmComponent = ref();
const loadScrubPauseConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	scrubPauseConfirmComponent.value = module.default;
}

const scrubStopConfirmComponent = ref();
const loadScrubStopConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	scrubStopConfirmComponent.value = module.default;
}

async function scrubThisPool(pool) {
	selectedPool.value = pool;
	await loadScrubConfirmComponent();
	showScrubModal.value = true;

	console.log('preparing to scrub:', selectedPool.value);
}

const confirmThisScrub : ConfirmationCallback = () => {
	confirmScrub.value = true;
}

const updateShowScrubPool = (newVal) => {
	showScrubModal.value = newVal;
}

watch(confirmScrub, async (newVal, oldVal) => {
	if (confirmScrub.value == true) {
		operationRunning.value = true;
		console.log('now scrubbing:', selectedPool.value);
		starting.value = true;
		try {
			const output: any = await scrubPool(selectedPool.value!);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Scrub Failed', `Scrub failed to start:${errorMessage}`, 'error', 5000));

				operationRunning.value = false;
				confirmScrub.value = false;
			} else {
				getScanStatus();
				confirmScrub.value = false;
				operationRunning.value = false;
				pushNotification(new Notification('Scrub Started', 'Scrub on ' + selectedPool.value!.name + " started.", 'success', 5000));

				showScrubModal.value = false;
			}
		} catch (error) {
			console.error(error)
		}
	}
});

async function pauseScrub(pool) {
	selectedPool.value = pool;
	await loadScrubPauseConfirmComponent();
	showPauseScrubConfirm.value = true;
	console.log('scrub to pause:', selectedPool.value);
}

async function resumeScrub(pool) {
	resuming.value = true;
	try {
		const output: any = await scrubPool(selectedPool.value!);

		if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Scrub Resume Failed', `Scrub failed to resume:${errorMessage}`, 'error', 5000));

			confirmScrub.value = false;
		} else {
			getScanStatus();
			confirmScrub.value = false;
			pushNotification(new Notification('Scrub Resumed', 'Scrub on ' + selectedPool.value!.name + " resumed.", 'success', 5000));

			showScrubModal.value = false;
		}
	} catch (error) {
		console.error(error)
	}
	resuming.value = false
}

async function stopScrub(pool) {
	selectedPool.value = pool;
	await loadScrubStopConfirmComponent();
	showStopScrubConfirm.value = true;
	console.log('scrub to pause:', selectedPool.value);
}

const showPauseScrubConfirm = ref(false);
const confirmPauseScrub = ref(false);

const confirmPauseThisScrub : ConfirmationCallback = () => {
	confirmPauseScrub.value = true;
}

const updateShowPauseScrub = (newVal) => {
	showPauseScrubConfirm.value = newVal;
}

watch(confirmPauseScrub, async (newVal, oldVal) => {
	if (confirmPauseScrub.value == true) {
		console.log('now pausing scrub:', selectedPool.value);
		pausing.value = true;
		try {
			const output: any = await scrubPool(selectedPool.value!, 'pause');

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Scrub Pause Failed', `Scrub failed to pause:${errorMessage}`, 'error', 5000));

				confirmPauseScrub.value = false;
			} else {
				getScanStatus();
				confirmPauseScrub.value = false;
				pushNotification(new Notification('Scrub Paused', 'Scrub on ' + selectedPool.value!.name + " paused.", 'success', 5000));

				showPauseScrubConfirm.value = false;
			}
		} catch (error) {
			console.error(error)
		}
		pausing.value = false
	
	}
});

const showStopScrubConfirm = ref(false);
const confirmStopScrub = ref(false);

const confirmStopThisScrub : ConfirmationCallback = () => {
	confirmStopScrub.value = true;
}

const updateShowStopScrub = (newVal) => {
	showStopScrubConfirm.value = newVal;
}

watch(confirmStopScrub, async (newVal, oldVal) => {
	if (confirmStopScrub.value == true) {
		console.log('now stopping scrub:', selectedPool.value);
		stopping.value = true;

		try {
			const output: any = await scrubPool(selectedPool.value!, 'stop');

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Scrub Stop Failed', `Scrub failed to stop:${errorMessage}`, 'error', 5000));

				confirmStopScrub.value = false;
			} else {
				getScanStatus();
				confirmStopScrub.value = false;
				pushNotification(new Notification('Scrub Stopped', 'Scrub on ' + selectedPool.value!.name + " stopped.", 'success', 5000));

				showStopScrubConfirm.value = false;
			}
		} catch (error) {
			console.error(error)
		}
	
		stopping.value = false;
	}
});

//////////////////// TRIM Pool //////////////////////
/////////////////////////////////////////////////////
const showTrimModal = ref(false);
const confirmTrim = ref(false);
const secureTRIM = ref(false);
const startingTrim = ref(false);
const pausingTrim = ref(false);
const stoppingTrim = ref(false);
const resumingTrim = ref(false);

const trimConfirmComponent = ref();
const loadTrimConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	trimConfirmComponent.value = module.default;
}

const trimPauseConfirmComponent = ref();
const loadTrimPauseConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	trimPauseConfirmComponent.value = module.default;
}

const trimStopConfirmComponent = ref();
const loadTrimStopConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	trimStopConfirmComponent.value = module.default;
}

async function trimThisPool(pool) {
	selectedPool.value = pool;
	await loadTrimConfirmComponent();
	showTrimModal.value = true;

	console.log("preparing to trim:", selectedPool.value);
}

const confirmThisTrim : ConfirmationCallback = () => {
	confirmTrim.value = true;
}

const updateShowTrimPool = (newVal) => {
	showTrimModal.value = newVal;
}

watch(confirmTrim, async (newValue, oldValue) => {
	if (confirmTrim.value == true) {
		startingTrim.value = true;
		console.log('now trimming:', selectedPool.value);
		try {
			const output: any = await trimPool(selectedPool.value!, (firstOptionToggle.value ? firstOptionToggle.value : false));
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Trim Failed', `Trim failed to start:${errorMessage}`, 'error', 5000));

				confirmTrim.value = false
			} else {
				getTrimStatus();
				confirmTrim.value = false
				pushNotification(new Notification('Trim Started', 'Trim on ' + selectedPool.value!.name + " started.", 'success', 5000));

				showTrimModal.value = false;
			}
		} catch (error) {
			console.error(error);
		}
		startingTrim.value = false;
	}
});

async function pauseTrim(pool) {
	selectedPool.value = pool;
	await loadTrimPauseConfirmComponent();
	showPauseTrimConfirm.value = true;
	console.log('trim to pause:', selectedPool.value);
}


async function resumeTrim(pool) {
	resumingTrim.value = true;
	try {
		const output: any = await trimPool(pool)

		if (output == null || output.error) {
			const errorMessage = output?.error || 'Unknown error';
			pushNotification(new Notification('Trim Resume Failed', `Trim failed to resume:${errorMessage}`, 'error', 5000));

			confirmTrim.value = false;
		} else {
			getTrimStatus();
			confirmTrim.value = false;
			pushNotification(new Notification('Trim Resumed', 'Trim on ' + selectedPool.value!.name + " resumed.", 'success', 5000));
		}
	} catch (error) {
		console.error(error)
	}
	resumingTrim.value = false
}

async function stopTrim(pool) {
	selectedPool.value = pool;
	await loadTrimStopConfirmComponent();
	showStopTrimConfirm.value = true;
	console.log('trim to stop:', selectedPool.value);
}


const showPauseTrimConfirm = ref(false);
const confirmPauseTrim = ref(false);

const confirmPauseThisTrim : ConfirmationCallback = () => {
	confirmPauseTrim.value = true;
}

const updateShowPauseTrim = (newVal) => {
	showPauseTrimConfirm.value = newVal;
}

watch(confirmPauseTrim, async (newVal, oldVal) => {
	if (confirmPauseTrim.value == true) {
		console.log('now pausing trim:', selectedPool.value);
		pausingTrim.value = true;
		try {
			const output: any = 	await trimPool(selectedPool.value!, false, 'pause');
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Trim Pause Failed', `Trim failed to pause:${errorMessage}`, 'error', 5000));

				confirmPauseTrim.value = false;
			} else {
				getTrimStatus();
				confirmPauseTrim.value = false;
				pushNotification(new Notification('Trim Paused', 'Trim on ' + selectedPool.value!.name + " paused.", 'success', 5000));

				showPauseTrimConfirm.value = false;
			}
			
		} catch (error) {
			console.error(error);
		}
		
		pausingTrim.value = false;
	}
});

const showStopTrimConfirm = ref(false);
const confirmStopTrim = ref(false);

const confirmStopThisTrim : ConfirmationCallback = () => {
	confirmStopTrim.value = true;
}

const updateShowStopTrim = (newVal) => {
	showStopTrimConfirm.value = newVal;
}

watch(confirmStopTrim, async (newVal, oldVal) => {
	if (confirmStopTrim.value == true) {
		console.log('now stopping trim:', selectedPool.value);
		stoppingTrim.value = true;
		try {
			const output: any = await trimPool(selectedPool.value!, false, 'stop');
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Trim Stop Failed', `Trim failed to stop:${errorMessage}`, 'error', 5000));
				confirmStopTrim.value = false;
			} else {
				getTrimStatus();
				confirmStopTrim.value = false;
				pushNotification(new Notification('Trim Stopped', 'Trim on ' + selectedPool.value!.name + " stopped.", 'success', 5000));

				showStopTrimConfirm.value = false;
			}
		} catch (error) {
			console.error(error);
		}

		stoppingTrim.value = false;
	}
});

/////////////////// Export Pool /////////////////////
/////////////////////////////////////////////////////
const showExportModal = ref(false);
const confirmExport = ref(false);
const forceUnmount = ref(false);
const exporting = ref(false);

const exportConfirmComponent = ref();
const loadExportConfirmComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	exportConfirmComponent.value = module.default;
}

async function exportThisPool(pool) {
	selectedPool.value = pool;
	await loadExportConfirmComponent();
	showExportModal.value = true;

	console.log('preparing to export:', selectedPool.value);
}

const confirmThisExport : ConfirmationCallback = () => {
	confirmExport.value = true;
}

const updateShowExportPool = (newVal) => {
	showExportModal.value = newVal;
}

watch(confirmExport, async (newVal, oldVal) => {
	if (confirmExport.value == true) {
		exporting.value = true;
		operationRunning.value = true;
		console.log('now exporting:', selectedPool.value);

		try {
			const output: any = await exportPool(selectedPool.value!, (firstOptionToggle.value ? firstOptionToggle.value : false));
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Export Failed', `Pool failed to export:${errorMessage}`, 'error', 5000));
				confirmExport.value = false;
			} else {
				pushNotification(new Notification('Export Completed', 'Export of pool ' + selectedPool.value!.name + " completed.", 'success', 5000));

				await refreshAllData();
				confirmExport.value = false;
				showExportModal.value = false;
			}
		} catch (error) {
			console.error(error);
		}

		exporting.value = false;
		operationRunning.value = false;
	}
});

/////////////////// Clear Errors ////////////////////
/////////////////////////////////////////////////////
async function clearPoolErrors(poolName) {
	await clearErrors(poolName);
	await refreshAllData();

}

///////////////////// Add VDev //////////////////////
/////////////////////////////////////////////////////
const showAddVDevModal = ref(false);
const showAddVDevComponent = ref();
const loadShowAddVDevComponent = async () => {
	const module = await import('../pools/AddVDevModal.vue');
	showAddVDevComponent.value = module.default;
}

async function showAddVDev(pool) {
	selectedPool.value = pool;
	// console.log(selectedPool);
	await loadShowAddVDevComponent();
	showAddVDevModal.value = true;
}

provide('show-pool-deets', showPoolDetails);
provide('confirm-save-pool', confirmSavePool);

provide('show-delete-pool-confirm', showDeletePoolConfirm);
provide('confirm-delete-pool', confirmDelete);
provide('has-children', hasChildren);
provide('force-destroy', forceDestroy);

provide("show-resilver-modal", showResilverModal);
provide("confirm-resilver", confirmResilver);

provide("show-trim-modal", showTrimModal);
provide("secure-trim", secureTRIM);
provide("confirm-trim", confirmTrim);

provide("show-export-modal", showExportModal);
provide("confirm-export", confirmExport);
provide("force-unmount", forceUnmount);

provide("show-vdev-modal", showAddVDevModal);

provide('modal-confirm-running', operationRunning);
provide('modal-option-one-toggle', firstOptionToggle);
provide('modal-option-two-toggle', secondOptionToggle);
provide('modal-option-three-toggle', thirdOptionToggle);
provide('modal-option-four-toggle', fourthOptionToggle);

provide('scan-status-box', scanStatusBox);
</script>