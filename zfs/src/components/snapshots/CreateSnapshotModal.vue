<template>
    <PfModal :isOpen="showSnapshotModal" title="Create Snapshot" variant="medium" @close="showSnapshotModal = false">
            <div @keydown.enter="onEnterKey">
                <div>
                    <label :for="getIdKey('file-system')" class="block text-sm font-medium leading-6 text-default">File System</label>
                    <select v-if="props.item == 'pool'" id="file-system" v-model="newSnapshot.filesystem" name="file-system" :class="truncateText" class="text-default bg-default mt-1 block w-full input-textlike sm:text-sm sm:leading-6">
                        <option v-for="dataset in datasetsInSamePool" :value="dataset.name" :class="truncateText" :title="dataset.name">{{ dataset.name }}</option>
                    </select>
                    <select v-if="props.item == 'filesystem'" id="file-system" v-model="newSnapshot.filesystem" name="file-system" :class="truncateText" class="text-default bg-default mt-1 block w-full input-textlike sm:text-sm sm:leading-6">
                        <option v-for="dataset in datasets" :value="dataset.name" :class="truncateText" :title="dataset.name">{{ dataset.name }}</option>
                    </select>
                </div>
                <div>
                    <PfSwitch v-model="newSnapshot.isCustomName" :id="getIdKey('custom-name')" label="Custom Name" />
                </div>
                <div>
                    <label :for="getIdKey('snapshot-name')" class="block text-sm font-medium leading-6 text-default">Snapshot Name</label>
                    <input v-if="!newSnapshot.isCustomName" type="text" v-model="newSnapshot.name" name="snapshot-name" :id="getIdKey('snapshot-name')" class="mt-1 block w-full input-textlike bg-default" placeholder="YYYY.MM.DD-HH.MM.SS" disabled />
                    <input v-if="newSnapshot.isCustomName" @keydown.enter="createSnapButton(newSnapshot)" type="text" v-model="newSnapshot.name" name="snapshot-name" :id="getIdKey('snapshot-name')" class="mt-1 block w-full input-textlike bg-default" placeholder="Enter Name Here" />
                </div>
                <div>
                    <PfSwitch v-model="newSnapshot.snapChildren" :id="getIdKey('snap-children')" label="Create snapshots of child file systems" />
                </div>
            </div>
        <template #footer>
            <div class="w-full grid grid-rows-2">
                <div class="w-full">
                    <p class="text-danger" v-if="nameFeedback">{{ nameFeedback }}</p>
                    <p class="text-danger" v-if="filesystemFeedback">{{ filesystemFeedback }}</p>
                </div>
                <div class="button-group-row mt-2 justify-between">
                    <button @click="showSnapshotModal = false" :id="getIdKey('confirm-no')" name="button-no" class="pf-v5-c-button pf-m-danger mt-1">Cancel</button>

                    <button v-if="!creating" @click="createSnapButton(newSnapshot)" :id="getIdKey('create-snapshot-btn')" name="create-snapshot-btn" class="pf-v5-c-button pf-m-primary mt-1">Create</button>
                    <button disabled v-if="creating" :id="getIdKey('create-snapshot-spinner')" type="button" class="pf-v5-c-button pf-m-primary pf-m-in-progress">
                        <svg aria-hidden="true" role="status" class="inline w-4 h-4 mr-3 text-gray-200 animate-spin text-default" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="text-success" />
                        </svg>
                        Creating...
                    </button>
                </div>
            </div>

        </template>
    </PfModal>
</template>

<script setup lang="ts">
import { ref, inject, Ref, computed } from 'vue';
import PfModal from '../pf/PfModal.vue';
import PfSwitch from '../pf/PfSwitch.vue';
import { getSnapshotTimestamp } from '../../composables/helpers';
import { createSnapshot } from '../../composables/snapshots';
import { loadSnapshotsInDataset, loadSnapshotsInPool, loadDatasets, loadSnapshots } from '../../composables/loadData';
import { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { Snapshot, NewSnapshot } from '../../types';


interface CreateSnapshotModalProps {
    item: 'pool' | 'filesystem';
    poolName?: string;
}
    
const props = defineProps<CreateSnapshotModalProps>();
const truncateText = inject<Ref<string>>('style-truncate-text')!;
const datasets = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const datasetsInSamePool = computed<ZFSFileSystemInfo[]>(() => {
    return datasets.value.filter(dataset => dataset.pool === props.poolName);
});

const defaultFileSystem = ref();
const selectedDataset= inject<Ref<ZFSFileSystemInfo>>('selected-dataset')!;
const snapshots = inject<Ref<Snapshot[]>>('snapshots')!;

const showSnapshotModal = inject<Ref<boolean>>('create-snap-modal')!;
const creating = inject<Ref<boolean>>('creating')!;

initialize();

function refreshSnapshots() {
    clearSnapshots();
    loadTheseSnapshots();
}

function clearSnapshots() {
    snapshots.value = [];
}

function loadTheseSnapshots() {
    if (props.item == 'pool') {
        loadSnapshotsInPool(snapshots, props.poolName);
    } else if (props.item == 'filesystem') {
        loadSnapshotsInDataset(snapshots, selectedDataset.value.name,null,null);
    }
}

function initialize() {
    // clearSnapshots();
    // loadTheseSnapshots();
    if (props.item == 'pool') {
        defaultFileSystem.value = datasetsInSamePool.value[0];
    } else if (props.item == 'filesystem') {
        defaultFileSystem.value = selectedDataset.value;
    }
}

const newSnapshot = ref<NewSnapshot>({
    name: '',
    filesystem: defaultFileSystem.value.name,
    isCustomName: false,
    snapChildren: false,
}); 

const nameFeedback = ref('');
const filesystemFeedback = ref('');

function onEnterKey() {
	if (!creating.value) {
		createSnapButton(newSnapshot.value);
	}
}
const confirmCreate = inject<Ref<boolean>>('confirm-create-snap')!;

const filesystemCheck = (newSnapshot : NewSnapshot) => {
	let result = true;
	filesystemFeedback.value = '';

	if (newSnapshot.filesystem == '') {
		result = false;
		filesystemFeedback.value = 'Please select a File System.';
	}

	return result;
}

const nameCheck = (newSnapshot : NewSnapshot) => {
	let result = true;
	nameFeedback.value = '';

	if (newSnapshot.name == '') {
		result = false;
		nameFeedback.value = 'Name cannot be empty.';
	} else if (!newSnapshot.name.match(/^[a-zA-Z0-9]/) ) {
		result = false;
		nameFeedback.value = 'Name must begin with alphanumeric characters.';
	} else if (newSnapshot.name.match(/^[ ]/)) {
		result = false;
		nameFeedback.value = 'Name cannot begin with whitespace.';
	} else if (newSnapshot.name.match(/[ ]$/)) {
		result = false;
		nameFeedback.value = 'Name cannot end with whitespace.';
	} else if (!newSnapshot.name.match(/^[a-zA-Z0-9_.:-]*$/)) {
		result = false;
		nameFeedback.value = 'Name contains invalid characters.';
	} else if (nameExists(newSnapshot, snapshots.value)) {
        result = false;
        nameFeedback.value = 'A snapshot with that name already exists.';
    } 

    return result;
}

function nameExists(newSnapshot : NewSnapshot, snapshots : Snapshot[]) {
    const newSnapName = newSnapshot.name;
    for (const snapshot of snapshots) {
        const existingSnapName = snapshot.name;

        if (existingSnapName === newSnapName) {
            return true;
        }
    }
    return false;
}

function createSnapButton(newSnapshot) {
    if (newSnapshot.isCustomName) {
        if (nameCheck(newSnapshot)) {
            if (filesystemCheck(newSnapshot)) {
                create(newSnapshot);
            }
        }
    } else if (!newSnapshot.isCustomName) {
        newSnapshot.name = getSnapshotTimestamp();
        if (filesystemCheck(newSnapshot)) {
            create(newSnapshot);
        }
    }
}

async function create(newSnapshot) {
    creating.value = true;
    try {
        const output: any = await createSnapshot(newSnapshot);
        
        if (output == null || output.error) {
            const errorMessage = output?.error || 'Unknown error';
            pushNotification(new Notification('Create Snapshot Failed', `There was an error creating this snapshot: ${errorMessage}`, 'error', 5000));
            confirmCreate.value = false;
        } else {
            confirmCreate.value = true;
            newSnapshot.isCustomName = false;
            newSnapshot.snapChildren = false;
            pushNotification(new Notification('Snapshot Created', `Created new snapshot.`, 'success', 5000));
            refreshSnapshots();
            showSnapshotModal.value = false;
        }
    } catch (error) {
        console.error(error);
    }
    creating.value = false;
}

const getIdKey = (name: string) => `${name}`;
</script>