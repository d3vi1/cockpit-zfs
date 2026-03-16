<template>
	<div>
		<!-- VDev header row (compound expandable) -->
		<div class="flex w-full text-center bg-primary text-sm text-white items-center" style="cursor: pointer;" @click="isExpanded = !isExpanded">
			<div class="p-1 flex-none" style="width:3rem;">
				<button class="pf-v5-c-button pf-m-plain text-white" @click.stop="isExpanded = !isExpanded"
					:aria-expanded="isExpanded" aria-label="Toggle vdev details">
					<svg :style="{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
						viewBox="0 0 256 512" fill="currentColor" aria-hidden="true" style="width:1em;height:1em;">
						<path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z"/>
					</svg>
				</button>
			</div>
			<div class="p-1 flex-1 text-base text-left" :class="truncateText"
				:title="props.vDev.name">{{ props.vDev.name }}</div>
			<div class="p-1 flex-1 font-semibold text-base"
				:class="[formatStatus(props.vDev.status), truncateText]" :title="props.vDev.status">{{
				props.vDev.status }}</div>
			<div class="p-1 flex-1 text-base" :class="truncateText"
				:title="upperCaseWord(props.vDev.type) + ' Device'">{{ upperCaseWord(props.vDev.type) }} Device
			</div>
			<div class="p-1 flex-1 text-base" :class="truncateText"
				:title="props.vDev.stats!.read_errors + ' Read Errors'">{{ props.vDev.stats!.read_errors }} Read
				Errors</div>
			<div class="p-1 flex-1 text-base" :class="truncateText"
				:title="props.vDev.stats!.write_errors + ' Write Errors'">{{ props.vDev.stats!.write_errors }}
				Write Errors</div>
			<div class="p-1 flex-1 text-base" :class="truncateText"
				:title="props.vDev.stats!.checksum_errors + ' Checksum Errors'">{{
				props.vDev.stats!.checksum_errors }} Checksum Errors</div>
			<div class="p-1 flex-none text-right pr-4" style="width:3rem;" @click.stop>
				<PfDropdownMenu :items="vdevMenuItems" :kebab="true" />
			</div>
		</div>
		<!-- VDev expanded content -->
		<div v-if="isExpanded">
			<table class="min-w-full bg-secondary text-default">
				<thead>
					<tr :key="props.vDevIdx" class="pf-v5-c-table__tr font-semibold text-white">
						<th class="pf-v5-c-table__th py-2" :class="truncateText" title="Disk" style="width:22%;">Disk</th>
						<th class="pf-v5-c-table__th py-2" :class="truncateText" title="State">State</th>
						<th class="pf-v5-c-table__th py-2" :class="truncateText" title="Type">Type</th>
						<th class="pf-v5-c-table__th py-2" :class="truncateText" title="Temperature">Temperature</th>
						<th class="pf-v5-c-table__th py-2" :class="truncateText" title="Capacity">Capacity</th>
						<th class="pf-v5-c-table__th py-2" :class="truncateText" title="Message" style="width:22%;">Message</th>
						<th class="pf-v5-c-table__th py-2" style="width:3rem;">
							<span class="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<DiskElement v-for="(disk, diskIdx) in props.vDev.disks" :key="diskIdx"
						:pool="poolData[props.poolIdx]" :poolIdx="props.poolIdx" :vDev="props.vDev"
						:vDevIdx="props.vDevIdx" :disk="disk" :diskIdx="diskIdx" ref="diskElement" />
				</tbody>
			</table>
		</div>
	</div>
	<div v-if="showAttachDiskModal">
		<component :is="showAttachDiskComponent" :showFlag="showAttachDiskModal" @close="updateShowAttachDisk"
			:idKey="'show-attach-disk-modal'" :pool="selectedPool!" :vDev="selectedVDev!" />
	</div>

	<div v-if="showRemoveVDevConfirm">
		<component :is="showRemoveVDevComponent" :showFlag="showRemoveVDevConfirm" @close="updateShowRemoveVDev"
			:idKey="'confirm-remove-vdev'" :item="'vdev'" :operation="'remove'" :pool="selectedPool!"
			:vdev="selectedVDev!" :confirmOperation="confirmThisRemove" :hasChildren="false" />
	</div>

</template>
<script setup lang="ts">
import { ref, inject, Ref, watch, provide, onMounted, computed } from "vue";
import { clearErrors, removeVDevFromPool, setRefreservation } from "../../composables/pools";
import { formatStatus, upperCaseWord,  } from '../../composables/helpers';
import DiskElement from '../pools/DiskElement.vue';
import PfDropdownMenu from "../pf/PfDropdownMenu.vue";
import type { DropdownMenuItem } from "../pf/PfDropdownMenu.vue";
import { ZPool, VDev, VDevDisk, ZFSFileSystemInfo } from "@45drives/houston-common-lib";
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { Activity, PoolScanObjectGroup, PoolDiskStats, ConfirmationCallback } from "../../types";
import { useRefreshAllData } from "../../composables/useRefreshAllData";


interface VDevElementProps {
	pool: ZPool;
	poolIdx: number;
	vDev: VDev;
	vDevIdx: number;
}

const props = defineProps<VDevElementProps>();
const truncateText = inject<Ref<string>>('style-truncate-text')!;
const canDestructive = inject<Ref<boolean>>('can-destructive')!;

const selectedPool = ref<ZPool>();
const selectedVDev = ref<VDev>();

const operationRunning = ref(false);

// PF expandable state (replaces HeadlessUI Disclosure)
const isExpanded = ref(true);

// Computed menu items for PfDropdownMenu (replaces HeadlessUI Menu)
const vdevMenuItems = computed<DropdownMenuItem[]>(() => {
	const items: DropdownMenuItem[] = [];

	if (canDestructive.value) {
		if (props.pool.vdevs.length !== 1 && props.vDev !== props.pool.vdevs[0] && !props.vDev.type.includes('raid')) {
			items.push({ label: 'Remove Virtual Device', action: () => removeVDev(props.pool, props.pool.vdevs[props.vDevIdx]) });
		}
		items.push({ label: 'Attach Disk', action: () => showAttachDisk(props.pool, props.vDev) });
	} else {
		items.push({ label: 'Attach Disk', action: () => showAttachDisk(props.pool, props.vDev), disabled: true, tooltip: 'Requires administrative privileges' });
	}

	return items;
});


/////////////// Loading/Refreshing //////////////////
/////////////////////////////////////////////////////
const poolData = inject<Ref<ZPool[]>>("pools")!;
const diskData = inject<Ref<VDevDisk[]>>("disks")!;
const filesystemData = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const disksLoaded = inject<Ref<boolean>>('disks-loaded')!;
const poolsLoaded = inject<Ref<boolean>>('pools-loaded')!;
const fileSystemsLoaded = inject<Ref<boolean>>('datasets-loaded')!;
const scanActivities = inject<Ref<Map<string, Activity>>>('scan-activities')!;
const trimActivities = inject<Ref<Map<string, Activity>>>('trim-activities')!;
const scanObjectGroup = inject<Ref<PoolScanObjectGroup>>('scan-object-group')!;
const poolDiskStats = inject<Ref<PoolDiskStats>>('pool-disk-stats')!;

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


/////////////////// Clear Errors ////////////////////
/////////////////////////////////////////////////////
// const cleared = ref(false);

async function clearVDevErrors(poolName, vDevName) {
	// cleared.value = false;
	await clearErrors(poolName, vDevName);
	// cleared.value = true;
}


/////////////////// Remove VDev /////////////////////
/////////////////////////////////////////////////////
const showRemoveVDevConfirm = ref(false);
const confirmRemove = ref(false);

const showRemoveVDevComponent = ref();
const loadShowRemoveVDevComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	showRemoveVDevComponent.value = module.default;
}

async function removeVDev(pool: ZPool, vDev : VDev) {
	selectedPool.value = pool;
	selectedVDev.value = vDev;
	await loadShowRemoveVDevComponent();
	showRemoveVDevConfirm.value = true;

	// console.log('preparing to remove:', selectedVDev.value, 'from pool:', selectedPool.value);
}

const confirmThisRemove : ConfirmationCallback = () => {
	confirmRemove.value = true;
}

const updateShowRemoveVDev = (newVal) => {
	showRemoveVDevConfirm.value = newVal;
}

watch(confirmRemove, async (newValue, oldValue) => {
	if (confirmRemove.value == true) {
		operationRunning.value = true;
		console.log('now removing:', selectedVDev.value, 'from pool:', selectedPool.value);

		try {
			const output: any = await removeVDevFromPool(selectedVDev.value, selectedPool.value);
			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				pushNotification(new Notification('Remove Failed', `Failed to remove Virtual Device: ${errorMessage}`, 'error', 5000));


			} else {
				pushNotification(new Notification('Remove Completed', `Removed VDev ${selectedVDev.value!.name} from Pool ${selectedPool.value!.name}`, 'success', 5000));


				if (props.pool.properties.refreservationRawSize!) {
					const output: any = await setRefreservation(props.pool, props.pool.properties.refreservationPercent!);
					if (output == null || output.error) {
						const errorMessage = output?.error || 'Unknown error';
						pushNotification(new Notification('Refreservation Update Failed', `Error updating refreservation: ${errorMessage}`, 'error', 5000));

					} else {
						pushNotification(new Notification('Refreservation Updated', `Refreservation of pool was updated successfully.`, 'success', 5000));

						showRemoveVDevConfirm.value = false;
					}
				} else {
					showRemoveVDevConfirm.value = false;
				}
				
				confirmRemove.value = false;
				showRemoveVDevConfirm.value = false;
			}

			confirmRemove.value = false;
			await refreshAllData();

		} catch (error) {
			console.error(error);
		}

		await refreshAllData();
	
		operationRunning.value = false;
	}
});

/////////////////// Attach Disk /////////////////////
/////////////////////////////////////////////////////
const showAttachDiskModal = ref(false);

const showAttachDiskComponent = ref();
const loadShowAttachDiskComponent = async () => {
	const module = await import('../disks/AttachDiskModal.vue');
	showAttachDiskComponent.value = module.default;
}

const updateShowAttachDisk = (newVal) => {
	showAttachDiskModal.value = newVal;
}

async function showAttachDisk(pool: ZPool, vdev: VDev) {
	selectedPool.value = pool;
	selectedVDev.value = vdev;
	// console.log('selectedPool:', selectedPool, 'selectedVDev:', selectedVDev)
	await loadShowAttachDiskComponent();
	showAttachDiskModal.value = true;
}

//////////// Checking Disk Stats (Trim) /////////////
/////////////////////////////////////////////////////
const diskElement = ref();

async function getDiskStatus() {
	// console.log('diskElement', diskElement.value);

	// Needed to specify index to work properly (treating as an array due to multiple pools error)
	await diskElement.value[0].getDiskTrimStatus();
}

/////////////////////////////////////////////////////
defineExpose({
    getDiskStatus,
});

provide('show-attach-modal', showAttachDiskModal);
provide('modal-confirm-running', operationRunning);
</script>