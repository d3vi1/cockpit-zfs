<template>
	<div class="TableDiv">
		<!-- POOLS -->
		<div v-if="props.item == 'pool'"
			class="inline-block min-w-full align-middle border border-default border-collapse">
			<table v-if="snapshots.length > 0 && !snapshotsInPoolLoading"
				class="pf-v5-c-table pf-m-compact" role="grid">
				<thead>
					<tr role="row">
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Snapshot</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Created On</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Used</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Referenced</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Clones</th>
						<th class="pf-v5-c-table__th pf-v5-c-table__action" role="columnheader" scope="col">
							<span class="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody role="rowgroup">
					<tr v-for="(snapshot, snapshotIdx) in snapshots" :key="snapshotIdx"
						class="pf-v5-c-table__tr" role="row">
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Snapshot'" :class="truncateText" :title="snapshot.name">
							{{ snapshot.name }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Created On'" :class="truncateText" :title="snapshot.properties.creation.parsed">
							{{ snapshot.properties.creation.parsed }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Used'" :class="truncateText" :title="snapshot.properties.used.value">
							{{ snapshot.properties.used.value }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Referenced'" :class="truncateText" :title="snapshot.properties.referenced.value">
							{{ snapshot.properties.referenced.value }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Clones'" :class="truncateText" :title="snapshot.properties.clones">
							{{ snapshot.properties.clones.length > 0 ? snapshot.properties.clones : '-' }}
						</td>
						<td class="pf-v5-c-table__td pf-v5-c-table__action" role="cell">
							<PfDropdownMenu
								:items="getPoolSnapshotActions(snapshot)"
								:kebab="true"
							/>
						</td>
					</tr>
				</tbody>
			</table>
			<div v-if="snapshots.length < 1 && !snapshotsInPoolLoading"
				class="pf-v5-c-empty-state pf-m-sm">
				<div class="pf-v5-c-empty-state__content">
					<h2 class="pf-v5-c-empty-state__header pf-v5-c-title pf-m-lg">No snapshots found.</h2>
				</div>
			</div>
			<div v-if="snapshotsInPoolLoading"
				class="flex bg-well justify-center w-full p-4">
				<LoadingSpinner :width="'w-10'" :height="'h-10'" :baseColor="'text-gray-200'"
					:fillColor="'fill-slate-500'" />
			</div>
		</div>

		<!-- FILESYSTEMS -->
		<div v-if="props.item == 'filesystem'" class="inline-block min-w-full align-middle border-collapse">
			<div v-if="!snapshotsInDatasetLoaded && !snapshotNotFound"
				class="flex bg-well justify-center w-full p-4">
				<LoadingSpinner :width="'w-10'" :height="'h-10'" :baseColor="'text-gray-200'"
					:fillColor="'fill-slate-500'" />
			</div>
			<table v-if="snapshotsInFilesystem.length > 0 && snapshotsInDatasetLoaded"
				class="pf-v5-c-table pf-m-compact" role="grid">
				<thead>
					<tr role="row">
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Snapshot</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Created On</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Used</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Referenced</th>
						<th class="pf-v5-c-table__th" role="columnheader" scope="col">Clones</th>
						<th v-if="bulkSnapDestroyMode.get(props.filesystem!.name)" class="pf-v5-c-table__th" role="columnheader" scope="col">Select</th>
						<th v-if="bulkSnapDestroyMode.get(props.filesystem!.name)" class="pf-v5-c-table__th" role="columnheader" scope="col">
							<div class="flex flex-col">
								<label class="flex flex-row items-center w-full h-full rounded-lg"
									:class="checkboxSelectedAllClass">
									<input type="checkbox" v-model="isSelectAllChecked" @change="toggleSelectAll"
										class="w-4 h-4 mr-2 text-success border-default rounded focus:ring-green-500 dark:focus:ring-green-600 focus:ring-2" />
									Select All
								</label>
								<button v-if="bulkSnapDestroyMode.get(props.filesystem!.name) && canDestructive"
									:disabled="selectedForDestroy.length == 0 || operationRunning"
									@click="destroySelectedSnapshots()" name="destroy-multiple-snaps-btn"
									class="btn btn-danger h-min w-full text-xs">
									<span v-if="!operationRunning">Destroy Selected</span>
									<span v-else>
										Destroying {{ bulkDestroyProcessed }} / {{ bulkDestroyTotal }} snapshots...
									</span>
								</button>
							</div>
						</th>
						<th v-if="!bulkSnapDestroyMode.get(props.filesystem!.name)" class="pf-v5-c-table__th pf-v5-c-table__action" role="columnheader" scope="col">
							<span class="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody role="rowgroup">
					<tr v-for="(snapshot, snapshotIdx) in snapshotsInFilesystem" :key="snapshotIdx"
						class="pf-v5-c-table__tr" role="row">
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Snapshot'" :class="truncateText" :title="snapshot.name">
							{{ snapshot.name }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Created On'" :class="truncateText" :title="snapshot.properties.creation.parsed">
							{{ snapshot.properties.creation.parsed }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Used'" :class="truncateText" :title="snapshot.properties.used.value">
							{{ snapshot.properties.used.value }}
						</td>
						<td class="pf-v5-c-table__td" role="cell"
							:data-label="'Referenced'" :class="truncateText" :title="snapshot.properties.referenced.value">
							{{ snapshot.properties.referenced.value }}
						</td>
						<td v-if="!bulkSnapDestroyMode.get(props.filesystem!.name)"
							class="pf-v5-c-table__td" role="cell"
							:data-label="'Clones'" :class="truncateText" :title="snapshot.properties.clones">
							{{ snapshot.properties.clones.length > 0 ? snapshot.properties.clones : '-' }}
						</td>
						<td v-if="bulkSnapDestroyMode.get(props.filesystem!.name)"
							class="pf-v5-c-table__td" role="cell"
							:data-label="'Clones'" :class="truncateText" :title="snapshot.properties.clones">
							{{ snapshot.properties.clones.length > 0 ? snapshot.properties.clones : '-' }}
						</td>
						<td v-if="bulkSnapDestroyMode.get(props.filesystem!.name)"
							class="pf-v5-c-table__td" role="cell">
							<label
								class="flex justify-center items-center w-full h-full py-2 rounded-lg border border-default bg-well"
								:class="checkboxSelectedClass(snapshot.name)">
								<input v-model="selectedForDestroy" type="checkbox" :value="snapshot.name"
									class="w-4 h-4 text-success border-default rounded focus:ring-green-500 dark:focus:ring-green-600 focus:ring-2" />
							</label>
						</td>
						<td v-if="!bulkSnapDestroyMode.get(props.filesystem!.name)"
							class="pf-v5-c-table__td pf-v5-c-table__action" role="cell">
							<PfDropdownMenu
								:items="getFilesystemSnapshotActions(snapshot)"
								:kebab="true"
							/>
						</td>
					</tr>
				</tbody>
			</table>
			<button v-if="bulkSnapDestroyMode.get(props.filesystem!.name) && canDestructive"
				:disabled="selectedForDestroy.length == 0 || operationRunning" @click="destroySelectedSnapshots()"
				name="destroy-multiple-snaps-btn" class="mt-1 btn btn-danger h-fit w-full">
				<span v-if="!operationRunning">Destroy Selected Snapshots</span>
				<span v-else>
					Destroying {{ bulkDestroyProcessed }} / {{ bulkDestroyTotal }} snapshots...
				</span>
			</button>
			<div v-if="snapshotsInFilesystem.length === 0 && snapshotNotFound"
				class="pf-v5-c-empty-state pf-m-sm">
				<div class="pf-v5-c-empty-state__content">
					<h2 class="pf-v5-c-empty-state__header pf-v5-c-title pf-m-lg">No snapshots found.</h2>
				</div>
			</div>
		</div>

		<div v-if="showDestroySnapshotModal">
			<component :is="destroySnapshotComponent" :showFlag="showDestroySnapshotModal"
				@close="updateShowDestroySnapshot" :idKey="'confirm-destroy-snapshot'" :item="'snapshot'"
				:operation="'destroy'" :snapshot="selectedSnapshot!" :confirmOperation="confirmThisDestroy"
				:firstOption="'Destroy child snapshots with same name'"
				:secondOption="'Force Destroy ALL child datasets'" :hasChildren="hasChildren" />
		</div>

		<div v-if="showCloneSnapshotModal">
			<component :is="cloneSnapshotComponent" @close="updateShowCloneSnapshot" :idKey="'clone-snapshot-modal'"
				:snapshot="selectedSnapshot!" />
		</div>

		<div v-if="showRenameSnapshotModal">
			<component :is="renameSnapshotComponent" @close="updateShowRenameSnapshot" :idKey="'rename-snapshot-modal'"
				:snapshot="selectedSnapshot!" />
		</div>

		<div v-if="showRollbackSnapshotModal">
			<component :is="rollbackSnapshotComponent" :showFlag="showRollbackSnapshotModal"
				@close="updateShowRollbackSnapshot" :idKey="'confirm-rollback-snapshot'" :item="'snapshot'"
				:operation="'rollback'" :snapshot="selectedSnapshot!" :confirmOperation="confirmThisRollback"
				:firstOption="'Destroy all newer snapshots of file system'"
				:secondOption="'Force Destroy ALL newer datasets'" :hasChildren="hasChildren" />
		</div>

		<div v-if="showSendSnapshot">
			<component :is="sendSnapshotComponent" @close="updateShowSendSnapshot" idKey="'show-send-snapshot-modal'"
				:snapshot="selectedSnapshot!" :name="selectedSnapshot!.name" />
		</div>

		<div v-if="showDestroyBulkSnapshotModal">
			<component :is="destroyBulkSnapshotComponent" :showFlag="showDestroyBulkSnapshotModal"
				@close="updateShowDestroyBulkSnapshot" :idKey="'confirm-destroy-bulk-snapshots'" :item="'snapshots'"
				:operation="'destroy'" :snapshots="selectedForDestroy!" :confirmOperation="confirmThisBulkDestroy"
				:hasChildren="false" />
		</div>
	</div>

</template>
<script setup lang="ts">
import { ref, inject, Ref, provide, watch, onMounted } from 'vue';
import { loadSnapshotsInPool, loadSnapshotsInDataset } from '../../composables/loadData';
import { destroySnapshot, rollbackSnapshot } from '../../composables/snapshots';
import LoadingSpinner from '../common/LoadingSpinner.vue';
import PfDropdownMenu from '../pf/PfDropdownMenu.vue';
import type { DropdownMenuItem } from '../pf/PfDropdownMenu.vue';
import { ZPool,ZFSFileSystemInfo} from "@45drives/houston-common-lib"
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { Snapshot, ConfirmationCallback } from '../../types';

interface SnapshotsListProps {
	pool?: ZPool;
	filesystem?: ZFSFileSystemInfo;
	singleSnap?: Snapshot;
	item: 'pool' | 'filesystem' | 'singleSnap';
	bulkSnapDestroyMode?: boolean;
}

const props = defineProps<SnapshotsListProps>();
const truncateText = inject<Ref<string>>('style-truncate-text')!;
const canDestructive = inject<Ref<boolean>>('can-destructive')!;

function getPoolSnapshotActions(snapshot: Snapshot): DropdownMenuItem[] {
	return [
		{ label: 'Rename Snapshot', action: () => renameThisSnapshot(snapshot) },
		{ label: 'Roll Back Snapshot', action: () => rollbackThisSnapshot(snapshot) },
		{ label: 'Destroy Snapshot', action: () => destroyThisSnapshot(snapshot) },
	];
}

function getFilesystemSnapshotActions(snapshot: Snapshot): DropdownMenuItem[] {
	return [
		{ label: 'Clone Snapshot', action: () => cloneThisSnapshot(snapshot), disabled: !canDestructive.value, tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined },
		{ label: 'Rename Snapshot', action: () => renameThisSnapshot(snapshot), disabled: !canDestructive.value, tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined },
		{ label: 'Roll Back Snapshot', action: () => rollbackThisSnapshot(snapshot), disabled: !canDestructive.value, tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined },
		{ label: 'Send Snapshot', action: () => sendThisDataset(snapshot), disabled: !canDestructive.value, tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined },
		{ label: 'Destroy Snapshot', action: () => destroyThisSnapshot(snapshot), disabled: !canDestructive.value, tooltip: !canDestructive.value ? 'Requires administrative privileges' : undefined },
	];
}

////////////////// Loading Data /////////////////////
/////////////////////////////////////////////////////
const snapshotsInPoolLoading = ref(false);
const snapshotsInDatasetLoaded = ref(false);
const snapshots = inject<Ref<Snapshot[]>>('snapshots')!;
const snapshotsInFilesystem = ref<Snapshot[]>([]);
const selectedSnapshot = ref<Snapshot>();
const snapshotNotFound = ref(false);
const bulkDestroyCurrent = ref<string | null>(null);
const bulkDestroyProcessed = ref(0);
const bulkDestroyTotal = ref(0);


onMounted(async () => {
	await refreshSnaps();
});

 async function refreshSnaps() {
    try {
        if (props.item === 'pool') {
			snapshotsInPoolLoading.value = true;
			snapshots.value = [];
            await loadSnapshotsInPool(snapshots, props.pool!.name);
        } else if (props.item === 'filesystem') {
			snapshotsInFilesystem.value = [];
            await loadSnapshotsInDataset(snapshotsInFilesystem, props.filesystem!.name,snapshotNotFound,snapshotsInDatasetLoaded);

        } else if (props.item == 'singleSnap') {
		selectedSnapshot.value = snapshots.value.find(snapshot => snapshot.name == props.singleSnap!.name);
	}
    } catch (error) {
        console.error("Failed to load snapshots:", error);
    } finally {
		await new Promise(resolve => setTimeout(resolve, 1000));
		console.log(snapshotNotFound.value)
        snapshotsInPoolLoading.value = false;
    }
}

///////// Values for Confirmation Modals ////////////
/////////////////////////////////////////////////////
const operationRunning = ref(false);
const firstOptionToggle = ref(false);
const secondOptionToggle = ref(false);
const thirdOptionToggle = ref(false);
const fourthOptionToggle = ref(false);

///////////////// Destroy Snapshot //////////////////
/////////////////////////////////////////////////////
const showDestroySnapshotModal = ref(false);
const hasChildren = ref(false);
const confirmDestroy = ref(false);

const destroySnapshotComponent = ref();
const loadDestroySnapshotComponent = async () => {

	const module = await import('../common/UniversalConfirmation.vue');
	destroySnapshotComponent.value = module.default;
}

async function destroyThisSnapshot(snapshot) {
	// console.log("snapshot: ", snapshot)
	operationRunning.value = false;
	selectedSnapshot.value = snapshot;

	if (selectedSnapshot.value!.properties.clones.length > 0) {
		hasChildren.value = true;
	}

	await loadDestroySnapshotComponent();
	showDestroySnapshotModal.value = true;
	// console.log('selected for destroy:', selectedSnapshot.value);
}

const confirmThisDestroy : ConfirmationCallback = () => {
	confirmDestroy.value = true;
}

const updateShowDestroySnapshot = (newVal) => {
	showDestroySnapshotModal.value = newVal;
}

watch (confirmDestroy, async (newVal, oldVal) => {
	if (confirmDestroy.value == true) {
		operationRunning.value = true;

		console.log('now destroying:', newVal);

		try {
			const output: any = await destroySnapshot(selectedSnapshot.value?.name, firstOptionToggle.value, secondOptionToggle.value);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				operationRunning.value = false;

				confirmDestroy.value = false;
				pushNotification(new Notification('Destroy Snapshot Failed', `${selectedSnapshot.value!.name} was not destroyed: ${errorMessage}`, 'error', 5000));

			} else {
				pushNotification(new Notification('Snapshot Destroyed', `${selectedSnapshot.value!.name} destroyed.`, 'success', 5000));

				await refreshSnaps();

				confirmDestroy.value = false;
				operationRunning.value = false;
				hasChildren.value = false;
				console.log('destroyed:', selectedSnapshot.value);
				firstOptionToggle.value = false;
				secondOptionToggle.value = false;
				showDestroySnapshotModal.value = false;
			}

		} catch (error) {
			console.error(error);
		}
	}
});


///////////// Destroy Snaps in Bulk /////////////////
/////////////////////////////////////////////////////
const bulkSnapDestroyMode = inject<Map<string, boolean>>('bulk-destroy-snaps')!;
const selectedForDestroy = ref<string[]>([]);
const showDestroyBulkSnapshotModal = ref(false);
const confirmBulkDestroy = ref(false);
const destroyBulkSnapshotComponent = ref();
const loadDestroyBulkSnapshotsComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	destroyBulkSnapshotComponent.value = module.default;
}

async function destroySelectedSnapshots() {
	operationRunning.value = false;
	await loadDestroyBulkSnapshotsComponent();
	showDestroyBulkSnapshotModal.value = true;
	// console.log('Selected snapshots to destroy:', selectedForDestroy.value);
}

const confirmThisBulkDestroy : ConfirmationCallback = () => {
	confirmBulkDestroy.value = true;
}

const updateShowDestroyBulkSnapshot = (newVal) => {
	showDestroyBulkSnapshotModal.value = newVal;
}

watch(confirmBulkDestroy, async (newVal, oldVal) => {
	const destroyedSnaps: string[] = [];
	const failedToDestroySnaps: string[] = [];

	if (confirmBulkDestroy.value == true) {
		operationRunning.value = true;

		bulkDestroyTotal.value = selectedForDestroy.value.length;
		bulkDestroyProcessed.value = 0;
		bulkDestroyCurrent.value = null;

		try {
			let errorMessage;

			for (const snapshot of selectedForDestroy.value) {
				bulkDestroyCurrent.value = snapshot;        // <- currently working on this one

				const output: any = await destroySnapshot(snapshot, false, false);

				if (output == null || output.error) {
					errorMessage = output?.error || 'Unknown error';
					failedToDestroySnaps.push(snapshot);
				} else {
					destroyedSnaps.push(snapshot);
				}

				bulkDestroyProcessed.value += 1;            // <- increment progress
			}

			await exitBulkDestroyMode();

			confirmBulkDestroy.value = false;
			operationRunning.value = false;

			bulkDestroyCurrent.value = null;
			bulkDestroyProcessed.value = 0;
			bulkDestroyTotal.value = 0;

			if (failedToDestroySnaps.length !== 0) {
				pushNotification(
					new Notification(
						'Destroy Snapshots Failed',
						`The folllowing snapshots were not destroyed: \n${failedToDestroySnaps.join(', ')}: ${errorMessage}`,
						'error',
						5000
					)
				);
			}

			if (destroyedSnaps.length !== 0) {
				pushNotification(
					new Notification(
						'Snapshot Destroyed',
						`The folllowing snapshots were destroyed: \n${destroyedSnaps.join(', ')}`,
						'success',
						5000
					)
				);
			}

			showDestroyBulkSnapshotModal.value = false;
			await refreshSnaps();
		} catch (error) {
			console.log(error);
			operationRunning.value = false;
			confirmBulkDestroy.value = false;
		}
	}
});

async function exitBulkDestroyMode() {
	bulkSnapDestroyMode.set(props.filesystem!.name, false);
}

const checkboxSelectedClass = (snapshotName) => {
  const isSelected = selectedForDestroy.value.includes(snapshotName);
  return isSelected ? 'bg-green-300 dark:bg-green-700' : '';
};

const isSelectAllChecked = ref(false);

function toggleSelectAll() {
	if (isSelectAllChecked.value) {
		// Select all snapshots
		selectedForDestroy.value = snapshotsInFilesystem.value.map(snapshot => snapshot.name);
	} else {
		// Deselect all snapshots
		selectedForDestroy.value = [];
	}
}

watch(selectedForDestroy, (newValue) => {
	// Update select all checkbox if all snapshots are selected or not
	isSelectAllChecked.value = newValue.length === snapshotsInFilesystem.value.length;
});

const checkboxSelectedAllClass = () => {
	return isSelectAllChecked ? 'bg-green-300 dark:bg-green-700' : '';
};


////////////////// Clone Snapshot ///////////////////
/////////////////////////////////////////////////////
const showCloneSnapshotModal = ref(false);
const cloning = ref(false);
const confirmCloneSnap = inject<Ref<boolean>>('confirm-clone-snap')!;

const cloneSnapshotComponent = ref();
const loadCloneSnapshotComponent = async () => {
	const module = await import('./CloneSnapshot.vue');
	cloneSnapshotComponent.value = module.default;
}

async function cloneThisSnapshot(snapshot) {
	selectedSnapshot.value = snapshot;
	// console.log('clone snapshot modal triggered');
	await loadCloneSnapshotComponent();
	showCloneSnapshotModal.value = true;
}

const updateShowCloneSnapshot = (newVal) => {
	showCloneSnapshotModal.value = newVal;
}

watch(confirmCloneSnap, async (newVal, oldVal) => {
	if (confirmCloneSnap.value == true) {
		operationRunning.value = true;
		await refreshSnaps();
		confirmCloneSnap.value = false;
		operationRunning.value = false;
	}
});

/////////////// Rollback Snapshot ///////////////////
/////////////////////////////////////////////////////
const showRollbackSnapshotModal = ref(false);
const confirmRollback = ref(false);

const rollbackSnapshotComponent = ref();
const loadRollbackSnapshotComponent = async () => {
	const module = await import('../common/UniversalConfirmation.vue');
	rollbackSnapshotComponent.value = module.default;
}

async function rollbackThisSnapshot(snapshot) {
	selectedSnapshot.value = snapshot;
	console.log('selected to be rolled back:', selectedSnapshot.value);
	await loadRollbackSnapshotComponent();
	showRollbackSnapshotModal.value = true;
}

const confirmThisRollback : ConfirmationCallback = () => {
	confirmRollback.value = true;
}

const updateShowRollbackSnapshot = (newVal) => {
	showRollbackSnapshotModal.value = newVal;
}

watch(confirmRollback, async (newVal, oldVal) => {
	if (confirmRollback.value == true) {
		operationRunning.value = true;

		try {
			const output: any = await rollbackSnapshot(selectedSnapshot.value, firstOptionToggle.value, secondOptionToggle.value);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				operationRunning.value = false;
				confirmRollback.value = false;
				pushNotification(new Notification('Rollback Snapshot Failed', `${selectedSnapshot.value!.name} was not rolled back: ${errorMessage}`, 'error', 5000));
			} else {
				console.log('rolled back:', selectedSnapshot.value);
				await refreshSnaps();
				confirmRollback.value = false;
				operationRunning.value = false;
				pushNotification(new Notification('Snapshot Rolled Back', `Rolled back to snapshot ${selectedSnapshot.value!.name} .`, 'success', 5000));

				showRollbackSnapshotModal.value = false;
			}

		} catch (error) {
			console.error(error);
		}
	}
});

///////////////// Rename Snapshot ///////////////////
/////////////////////////////////////////////////////
const showRenameSnapshotModal = ref(false);
const renaming = ref(false);
const confirmRename = ref(false);

const renameSnapshotComponent = ref();
const loadRenameSnapshotComponent = async () => {
	const module = await import('./RenameSnapshot.vue');
	renameSnapshotComponent.value = module.default;
}

async function renameThisSnapshot(snapshot) {
	selectedSnapshot.value = snapshot;
	// console.log('rename snapshot modal triggered');
	await loadRenameSnapshotComponent();
	showRenameSnapshotModal.value = true;
}

const updateShowRenameSnapshot = (newVal) => {
	showRenameSnapshotModal.value = newVal;
}

watch(confirmRename, async (newVal, oldVal) => {
	if (confirmRename.value == true) {
		operationRunning.value = true;
		await refreshSnaps();
		confirmRename.value = false;
		operationRunning.value = false;
	}
});

/////////////////// Send Snapshot ///////////////////
/////////////////////////////////////////////////////
const showSendSnapshot = ref(false);
const sendingSnap = ref(false);
const confirmSendSnap = inject<Ref<boolean>>('confirm-send-snap')!;

const sendSnapshotComponent = ref();
const loadSendSnapshotComponent = async () => {
	const module = await import('./SendSnapshot.vue');
	sendSnapshotComponent.value = module.default;
}

async function sendThisDataset(snapshot) {
	selectedSnapshot.value = snapshot;
	confirmSendSnap.value = false;
	console.log('selected to send:', selectedSnapshot.value);
	await loadSendSnapshotComponent();
	showSendSnapshot.value = true;
}

const updateShowSendSnapshot = (newVal) => {
	showSendSnapshot.value = newVal;
}

watch(confirmSendSnap, async (newVal, oldVal) => {
	if (confirmSendSnap.value == true) {
		await refreshSnaps();
	} else {
	}
});


provide('cloning', cloning);
provide('show-clone-modal', showCloneSnapshotModal);
provide('renaming', renaming);
provide('confirm-rename', confirmRename);
provide('show-rename-snap-modal', showRenameSnapshotModal);
provide('show-send-dataset', showSendSnapshot);
provide('sending', sendingSnap);
provide('modal-confirm-running', operationRunning);
provide('modal-option-one-toggle', firstOptionToggle);
provide('modal-option-two-toggle', secondOptionToggle);
provide('modal-option-three-toggle', thirdOptionToggle);
provide('modal-option-four-toggle', fourthOptionToggle);
provide('bulk-destroy-current', bulkDestroyCurrent);
provide('bulk-destroy-processed', bulkDestroyProcessed);
provide('bulk-destroy-total', bulkDestroyTotal);
</script>
