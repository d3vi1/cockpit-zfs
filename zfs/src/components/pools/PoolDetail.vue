<template>
	<PfModal :isOpen="showPoolDetails" :title="'Pool Details - ' + props.pool.name" variant="large"
		@close="closeModal">
		<div>
			<Navigation :navigationItems="navigation" :currentNavigationItem="currentNavigationItem"
				:navigationCallback="navigationCallback" :show="show" />
		</div>
		<div v-if="navTag == 'stats'">
			<div class="mt-6 grid grid-cols-3 grid-rows-2 text-default">
				<PoolCapacity :id="getIdKey('pool-visual-capacity')" :fillColor="capacityColor"
					:name="props.pool.name" :totalSize="props.pool.properties.size"
					:percentage="props.pool.properties.capacity" :radius="50" :coordX="60" :coordY="60"
					:strokeWidth="10" :percentFontSize="'text-2xl'" class="w-full col-span-3 grow" />
				<div
					class="mt-2 px-8 col-span-3 row-start-2 grid grid-cols-3 justify-items-center min-w-fit max-w-fit">
					<div class="m-2 col-span-1">
						<p :id="getIdKey('pool-health')" name="pool-health" class="text-lg">Health: <span
								:class="formatStatus(props.pool.status)" class="">{{ props.pool.status }}</span></p>
						<p :id="getIdKey('pool-errors')" name="pool-errors" class="text-sm">Errors: <span
								:class="formatStatus(props.pool.status)" class="">{{ props.pool.errorCount }}</span>
							<br />as of {{ getTimestampString() }}
						</p>
						<p :id="getIdKey('pool-refreservation')" name="pool-refreservation" class="text-sm">
							Refreservation: {{
							convertBytesToSize(props.pool.properties.refreservationRawSize!) }} ({{
							convertBytesToSize(props.pool.properties.refreservationRawSize!) }} ({{
							props.pool.properties.refreservationPercent }}%)</p>
					</div>
					<div class="m-2 col-span-1">
						<p :id="getIdKey('pool-altroot')" name="pool-altroot" class="text-base"
							:title="props.pool.properties.altroot == '' || props.pool.properties.altroot == '-' ? 'None' : props.pool.properties.altroot"
							:class="truncateText">Alt Root: {{ props.pool.properties.altroot == '' ||
							props.pool.properties.altroot == '-' ? 'None' : props.pool.properties.altroot }}</p>
						<p :id="getIdKey('pool-devices')" name="pool-devices" class="text-base">Devices: {{
							getNumDevices }}</p>
						<p :id="getIdKey('pool-disks')" name="pool-disks" class="text-base">Disks: {{ getNumDisks }}
						</p>
					</div>
					<div class="m-2 col-span-1">
						<p :id="getIdKey('pool-allocated')" name="pool-allocated" class="text-base">Used: {{
							props.pool.properties.allocated }}</p>
						<p :id="getIdKey('pool-free')" name="pool-free" class="text-base">RAW Space Available: {{
							props.pool.properties.free }}</p>
						<p :id="getIdKey('pool-free')" name="pool-free" class="text-base">Actual Space Available: {{
							props.pool.properties.available }}</p>
						<p :id="getIdKey('pool-size')" name="pool-size" class="text-base">Total: {{
							props.pool.properties.size }}</p>
					</div>
				</div>
			</div>
		</div>

		<div v-if="navTag == 'topology'" class="mt-2 grid" :class="`grid-cols-${props.pool.vdevs.length}`">
			<div v-for="vDev, vDevIdx in props.pool.vdevs" :key="vDevIdx"
				class="p-2 m-2 rounded-md border border-default bg-accent">
				<legend class="mb-1 text-base font-medium leading-6 text-default">{{ vDev.name }} ({{ vDev.type }})
				</legend>

				<div class="grid" :class="vDev.disks.length < 2 ? 'grid-cols-1' : 'grid-cols-2'">
					<div v-for="disk, diskIdx in vDev.disks" :key="diskIdx" class="m-1">
						<PoolDetailDiskCard :disk="vDev.disks[diskIdx]" />
					</div>
				</div>
			</div>
		</div>

		<div v-if="navTag == 'snapshots'" class="w-full text-center min-w-fit">
			<component :is="snapshotListComponent" :pool="props.pool" :item="'pool'" />
		</div>

		<div v-if="navTag == 'settings'">
			<div class="grid grid-cols-4 gap-2">
				<div class="mt-2 col-span-1 col-start-1 row-start-1">
					<p :id="getIdKey('settings-pool-name')" name="settings-pool-name"
						class="text-base text-default">Pool</p>
					<p class="mt-1 py-1.5" :class="truncateText" :title="poolConfig.name">{{ poolConfig.name }}</p>
				</div>
				<div class="mt-2 col-span-1 col-start-2 row-start-1">
					<p :id="getIdKey('settings-pool-readonly')" name="settings-pool-readonly"
						class="text-base text-default">Read Only</p>
					<p class="mt-1 py-1.5">{{ upperCaseWord(isBoolOnOff(poolConfig.properties.readOnly)) }}</p>
				</div>
				<div class="mt-2 col-span-1 col-start-3 row-start-1">
					<p :id="getIdKey('settings-pool-guid')" name="settings-pool-guid"
						class="text-base text-default">GUID</p>
					<p class="mt-1 py-1.5">{{ poolConfig.guid }}</p>
				</div>

				<div class="mt-2 col-span-1 col-start-4 row-start-1">
					<label :for="getIdKey('settings-pool-sector-size')"
						class="bg-default block text-base leading-6 text-default">Sector Size</label>
					<p :id="getIdKey('settings-pool-sector-size')" name="settings-pool-sector-size"
						class="mt-1 py-1.5">{{ calculateSectorSize(Number(poolConfig.properties.sector)) }}</p>
				</div>

				<div class="mt-2 col-span-1 col-start-1 row-start-2">
					<label :for="getIdKey('settings-pool-fail-mode')"
						class="bg-default block text-base leading-6 text-default">Fail Mode</label>
					<select :id="getIdKey('settings-pool-fail-mode')" v-model="poolConfig.failMode"
						:disabled="settingsLocked"
						:title="settingsLocked ? 'Requires administrative privileges' : ''" name="pool-fail-mode"
						class="mt-1 block w-full rounded-md border-0 py-1.5 text-default bg-default ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-slate-600 sm:text-sm sm:leading-6">
						<option value="wait">Wait</option>
						<option value="continue">Continue</option>
						<option value="panic">Panic</option>
					</select>
				</div>

				<div class="mt-2 col-span-3 col-start-2 row-start-2">
					<p :for="getIdKey('settings-pool-comment')" class="text-base text-default">Comment</p>
					<input :id="getIdKey('settings-pool-comment')" v-model="poolConfig.comment"
						name="setting-pool-comment" placeholder="Enter a comment here" type="text"
						class="input-textlike mt-1 block w-full rounded-md border-0 py-1.5 px-1.5 text-default shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-slate-300 sm:text-sm sm:leading-6" />
				</div>

				<!-- auto-expand -->
				<div class="col-span-1 col-start-1 row-start-3">
					<PfSwitch v-model="poolConfig.properties.autoExpand"
						:id="getIdKey('settings-pool-auto-expand')"
						:disabled="settingsLocked"
						label="Auto-Expand Pool" />
				</div>

				<!-- auto-replace -->
				<div class="col-span-1 col-start-2 row-start-3">
					<PfSwitch v-model="poolConfig.properties.autoReplace"
						:id="getIdKey('settings-pool-auto-replace')"
						:disabled="settingsLocked"
						label="Auto-Replace Drives" />
				</div>

				<!-- display snapshots in filesystem list -->
				<div class="col-span-2 col-start-3 row-start-3">
					<PfSwitch v-model="poolConfig.properties.listSnapshots"
						:id="getIdKey('settings-pool-display-snapshots')"
						:disabled="settingsLocked"
						label="List Snapshots With File Systems" />
				</div>

				<!-- delegation (Allow non-privileged user access based on the dataset permissions)-->
				<div class="col-span-2 col-start-1 row-start-4">
					<PfSwitch v-model="poolConfig.properties.delegation"
						:id="getIdKey('settings-pool-delegation')"
						:disabled="settingsLocked"
						label="Delegation" />
					<p class="text-xs text-muted mt-0.5">(Access based on dataset permissions)</p>
				</div>

				<!-- auto-trim -->
				<div v-if="props.pool.diskType == 'SSD' || props.pool.diskType == 'Hybrid'"
					class="col-span-1 col-start-3 row-start-4">
					<PfSwitch v-model="poolConfig.properties.autoTrim"
						:id="getIdKey('settings-pool-auto-trim')"
						:disabled="settingsLocked"
						label="Auto-TRIM Pool" />
				</div>

			</div>
		</div>
		<template #footer>
			<div class="button-group-row w-full justify-between">
				<div class="mt-2 justify-self-start">
					<button @click="showPoolDetails = false" :id="getIdKey('close-details-btn')"
						name="close-details-btn" class="pf-v5-c-button pf-m-danger mt-1">Close</button>
				</div>
				<div class="justify-self-center">
					<div class="button-group-row mt-2 justify-self-center">
						<p class="text-danger" v-if="commentFeedback">{{ commentFeedback }}</p>
					</div>
				</div>
				<div class="justify-self-end">
					<div v-if="navTag == 'topology'">
						<div class="mt-2">
							<button v-if="canDestructive" @click="addVDevButton()" :id="getIdKey('add-vdev-btn')"
								name="add-vdev-btn" class="pf-v5-c-button pf-m-primary mt-1">Add Virtual Device</button>
						</div>
					</div>
					<div v-if="navTag == 'snapshots'">
						<div class="mt-2">
							<button v-if="canDestructive" @click="createSnapshotBtn()"
								:id="getIdKey('create-snap-wizard-btn')" name="create-snap-wizard-btn"
								class="pf-v5-c-button pf-m-primary mt-1">Create Snapshot</button>
						</div>
					</div>
					<div v-if="navTag == 'settings'">
						<div class="button-group-row mt-2">
							<button v-if="!saving" @click="poolConfigureBtn(); props.confirmation;"
								:id="getIdKey('settings-save-btn')" name="settings-save-btn"
								class="pf-v5-c-button pf-m-primary mt-1">Save Changes</button>
							<button disabled v-if="saving" id="finish" type="button"
								class="pf-v5-c-button pf-m-primary pf-m-in-progress">
								Saving...
							</button>
						</div>
					</div>
				</div>
			</div>
		</template>
	</PfModal>

	<div v-if="showSnapshotModal">
		<component :is="createSnapshotComponent" @close="updateShowNewSnapshot" :poolName="props.pool.name"
			:item="'pool'" />
	</div>
	<div v-if="showAddVDevModal">
		<component :is="addVDevComponent" @close="updateShowAddVDev" :key="showAddVDevModal"
			:idKey="getIdKey(`show-vdev-modal`)" :pool="poolConfig" :marginTop="'mt-48'" />
	</div>

</template>


<script setup lang="ts">
import { reactive, ref, inject, Ref, computed, provide, watch } from 'vue';
import { configurePool } from '../../composables/pools';
import { getTimestampString, upperCaseWord, isBoolOnOff, loadScanActivities, loadTrimActivities, formatStatus, getCapacityColor, convertBytesToSize } from '../../composables/helpers';
import { loadDisksThenPools, loadScanObjectGroup, loadDiskStats } from '../../composables/loadData';
import PfModal from '../pf/PfModal.vue';
import PfSwitch from '../pf/PfSwitch.vue';
import PoolCapacity from '../common/PoolCapacity.vue';
import Navigation from '../common/Navigation.vue';
import PoolDetailDiskCard from '../disks/PoolDetailDiskCard.vue';

const canDestructive = inject<Ref<boolean>>('can-destructive')!;
const settingsLocked = computed(() => !canDestructive.value);

interface PoolDetailsProps {
	pool: ZPool;
	confirmation: ConfirmationCallback;
	showFlag: boolean;
}

const emit = defineEmits(['close']);

const closeModal = () => {
	emit('close');
}

const props = defineProps<PoolDetailsProps>();
const truncateText = inject<Ref<string>>('style-truncate-text')!;

const poolConfig = ref<ZPool>({
	name: props.pool.name,
	status: props.pool.status,
	guid: props.pool.guid,
	properties: {
		rawsize: props.pool.properties.rawsize,
		size: props.pool.properties.size,
		allocated: props.pool.properties.allocated,
		capacity: props.pool.properties.capacity,
		free: props.pool.properties.free,
		sector: props.pool.properties.sector,
		record: props.pool.properties.record,
		compression: props.pool.properties.compression,
		deduplication: props.pool.properties.deduplication,
		refreservationPercent: props.pool.properties.refreservationPercent,
		autoExpand: props.pool.properties.autoExpand,
		autoReplace: props.pool.properties.autoReplace,
		autoTrim: props.pool.properties.autoTrim,
		forceCreate: props.pool.properties.forceCreate,
		delegation: props.pool.properties.delegation,
		listSnapshots: props.pool.properties.listSnapshots,
		readOnly: props.pool.properties.readOnly,
		available:props.pool.properties.available
	},
	vdevs: props.pool.vdevs,
	failMode: props.pool.failMode,
	comment: props.pool.comment!,
	statusCode: props.pool.statusCode,
	statusDetail: props.pool.statusDetail,
	errorCount: props.pool.errorCount
});

const capacityColor = computed(() =>
	getCapacityColor('text', props.pool.properties.capacity, props.pool.properties.refreservationPercent!)
);


////////////////// Loading Data /////////////////////
/////////////////////////////////////////////////////
const pools = inject<Ref<ZPool[]>>('pools')!;
const disks = inject<Ref<VDevDisk[]>>('disks')!;
const disksLoaded = inject<Ref<boolean>>('disks-loaded')!;
const poolsLoaded = inject<Ref<boolean>>('pools-loaded')!;
const scanObjectGroup = inject<Ref<PoolScanObjectGroup>>('scan-object-group')!;
const poolDiskStats = inject<Ref<PoolDiskStats>>('pool-disk-stats')!;
const scanActivities = inject<Ref<Map<string, Activity>>>('scan-activities')!;
const trimActivities = inject<Ref<Map<string, Activity>>>('trim-activities')!;
const snapshots = inject<Ref<Snapshot[]>>('snapshots')!;
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { ZPool, VDevDisk } from '@45drives/houston-common-lib';
import { Activity, ConfirmationCallback, NavigationCallback, NavigationItem, PoolDiskStats, PoolEditConfig, PoolScanObjectGroup, Snapshot } from '../../types';

const snapshotListComponent = ref();
// const loadSnapshotListComponent = async () => {
// 	const module = await import('../snapshots/SnapshotsList.vue');
// 	snapshotListComponent.value = module.default;
// }

const showPoolDetails = inject<Ref<boolean>>("show-pool-deets")!;

const getNumDevices = props.pool.vdevs.length;

const getNumDisks = computed(() =>  {
	let disks = 0;
	props.pool.vdevs.forEach(vdev => {
		vdev.disks.forEach(disk => {
			disks++;
		});
	});
	return disks;
});

//displaying sector size in bytes/kb
function calculateSectorSize(exponent) {
	const bytes = Math.pow(2, exponent);
	const result = ref('');

	if (bytes > 1024) {
		const kiB = bytes / 1024;
		result.value = `${kiB} KiB`;
	} else {
		result.value = `${bytes} B`;
	}
	  return result.value;
}

///////// Values for Confirmation Modals ////////////
/////////////////////////////////////////////////////
const operationRunning = ref(false);
const firstOptionToggle = ref(false);
const secondOptionToggle = ref(false);
const thirdOptionToggle = ref(false);
const fourthOptionToggle = ref(false);

///////////////////// Add VDev //////////////////////
/////////////////////////////////////////////////////
const showAddVDevModal = ref(false);

const addVDevComponent = ref();
const loadAddVDevComponent = async () => {
	const module = await import('./AddVDevModal.vue');
	addVDevComponent.value = module.default;
}

async function addVDevButton() {
	await loadAddVDevComponent();
	showAddVDevModal.value = true;
	// console.log('add vdev modal triggred');
}

const updateShowAddVDev = (newVal) => {
	showAddVDevModal.value = newVal;
}

///////////////// Create Snapshots //////////////////
/////////////////////////////////////////////////////
const showSnapshotModal = ref(false);
const creating = ref(false);
const confirmCreate = ref(false);

const createSnapshotComponent = ref();
const loadCreateSnapshotComponent = async () => {
	const module = await import('../snapshots/CreateSnapshotModal.vue');
	createSnapshotComponent.value = module.default;
}

async function createSnapshotBtn() {
	await loadCreateSnapshotComponent();
	showSnapshotModal.value = true;
	// console.log('create snapshot modal triggered');
}

const updateShowNewSnapshot = (newVal) => {
	showSnapshotModal.value = newVal;
}

/////////////////// Pool Changes ////////////////////
/////////////////////////////////////////////////////
const saving = ref(false);
const commentFeedback = ref('');

const newChangesToPool = ref<PoolEditConfig>({
	name: poolConfig.value.name,
	guid: poolConfig.value.guid,
	readonly: isBoolOnOff(poolConfig.value.properties.readOnly),
});

const updatedProperties: Partial<PoolEditConfig> = ({
	name: poolConfig.value.name,
	guid: poolConfig.value.guid,
	readonly: isBoolOnOff(poolConfig.value.properties.readOnly),
});


async function checkForChanges() {
	const changes: Partial<PoolEditConfig> = {};

	// Always allow comment (non-destructive)
	if (poolConfig.value.comment !== props.pool.comment) {
		changes.comment = poolConfig.value.comment;
	}

	// Only include the rest if we are allowed to make destructive/admin changes
	if (!settingsLocked.value) {
		if (poolConfig.value.failMode !== props.pool.failMode) changes.failmode = poolConfig.value.failMode;
		if (poolConfig.value.properties.autoExpand !== props.pool.properties.autoExpand) changes.autoexpand = isBoolOnOff(poolConfig.value.properties.autoExpand);
		if (poolConfig.value.properties.autoReplace !== props.pool.properties.autoReplace) changes.autoreplace = isBoolOnOff(poolConfig.value.properties.autoReplace);
		if (poolConfig.value.properties.autoTrim !== props.pool.properties.autoTrim) changes.autotrim = isBoolOnOff(poolConfig.value.properties.autoTrim);
		if (poolConfig.value.properties.delegation !== props.pool.properties.delegation) changes.delegation = isBoolOnOff(poolConfig.value.properties.delegation!);
		if (poolConfig.value.properties.listSnapshots !== props.pool.properties.listSnapshots) changes.listsnapshots = isBoolOnOff(poolConfig.value.properties.listSnapshots!);
	}

	newChangesToPool.value = { ...newChangesToPool.value, ...changes };
	return Object.keys(changes).length > 0;
}

const commentLengthCheck = (poolData) => {
	let result = true;
	commentFeedback.value = '';	

	if (poolData.comment.length > 32) {
		result = false;
		commentFeedback.value = 'Comment cannot exceed 32 characters.';
	}

	return result;
}

const confirmSavePool = inject<Ref<boolean>>('confirm-save-pool')!;
	
async function poolConfigureBtn() {
	if (commentLengthCheck(poolConfig.value)) {
		if (!(await checkForChanges())) {
			pushNotification(new Notification('No Changes', 'No modifications detected in the pool configuration.', 'info', 5000));
			showPoolDetails.value = false;
			return;
		}

		saving.value = true;
		try {
			const result = await configurePool(newChangesToPool.value);

			if (result.success === false) { 
				pushNotification(new Notification('Save Pool Config Failed', `There was an error saving this pool: ${result.error || 'Unknown error occurred'}.`, 'error', 5000));
				confirmSavePool.value = false;
			} else if (result.success === true) {
				// pushNotification(new Notification('Pool Config Saved', "Successfully saved this pool's configuration.", 'success', 5000));
				confirmSavePool.value = true;
				showPoolDetails.value = false;
			}
		} catch (error: any) {
			pushNotification(new Notification('Operation Failed', `An unexpected error occurred: ${error.message}`, 'error', 5000));
		} finally {
			saving.value = false;
		}

	}
}

/////////////////// Navigation //////////////////////
/////////////////////////////////////////////////////
const navTag = ref('stats');
const show = ref(true);

const currentNavigationItem = computed<NavigationItem | undefined>(() => navigation.find(item => item.current));

const navigationCallback: NavigationCallback = (item: NavigationItem) => {
	navTag.value = item.tag;
};

watch(navTag, (newVal, oldVal) => {
	if (navTag.value == 'snapshots') {
		// loadSnapshotListComponent();
		import('../snapshots/SnapshotsList.vue').then(module => {
			snapshotListComponent.value = module.default;
		});
	}
}, {immediate: true});


const navigation = reactive<NavigationItem[]>([
	{ name: 'Stats', tag: 'stats', current: computed(() => navTag.value == 'stats') as unknown as boolean, show: true, },
	{ name: 'Topology', tag: 'topology', current: computed(() => navTag.value == 'topology') as unknown as boolean, show: true, },
	{ name: 'Snapshots', tag: 'snapshots', current: computed(() => navTag.value == 'snapshots') as unknown as boolean, show: true, },
	{ name: 'Settings', tag: 'settings', current: computed(() => navTag.value == 'settings') as unknown as boolean, show: true, },
].filter(item => item.show));

const getIdKey = (name: string) => `${name}`;

provide('create-snap-modal', showSnapshotModal);
provide('current-pool-config', poolConfig);
provide('show-vdev-modal', showAddVDevModal);
provide("saving", saving);
provide('create-snap-modal', showSnapshotModal);
provide("snapshots", snapshots);
provide('confirm-create-snap', confirmCreate);
provide('creating', creating);
provide('modal-confirm-running', operationRunning);
provide('modal-option-one-toggle', firstOptionToggle);
provide('modal-option-two-toggle', secondOptionToggle);
provide('modal-option-three-toggle', thirdOptionToggle);
provide('modal-option-four-toggle', fourthOptionToggle);
</script>
