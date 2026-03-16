<template>
    <PfModal :isOpen="showRenameModal" @close="showRenameModal = false" title="Rename File System">
        <div>
            <div class="">
                <!-- Parent File System -->
                <div class="mt-2">
                    <label :for="getIdKey('parent-filesystem')" class="block text-sm font-medium leading-6 text-default">Parent File System</label>
                    <select v-model="parentFS" :id="getIdKey('parent-filesystem')" class="text-default bg-default mt-1 block w-full input-textlike sm:text-sm sm:leading-6" :class="truncateText">
                        <option v-for="dataset, datasetIdx in datasetsInSamePool" :class="truncateText" :title="dataset.name" :key="datasetIdx">{{ dataset.name }}</option>
                    </select>
                </div>

                <!-- New Name -->
                <div class="mt-2">
                    <label :for="getIdKey('new-name')" class="mt-1 block text-sm font-medium leading-6 text-default">New Name</label>
                    <input :id="getIdKey('new-name')" type="text" v-model="newName" class="input-textlike bg-default mt-1 block w-full py-1.5 px-1.5 text-default placeholder:text-muted sm:text-sm sm:leading-6" placeholder="New Name" />
                </div>

                <!-- Force Unmount -->
                <div class="mt-2">
                    <div class="flex flex-row justify-between">
                        <label :for="getIdKey('force-unmount-filesystem')" class="mt-2 mr-2 block text-sm font-medium leading-6 text-default">Forcefully Unmount File System</label>
                        <PfSwitch
                            :modelValue="forceUnmount"
                            @update:modelValue="forceUnmount = $event"
                            :id="getIdKey('force-unmount-filesystem')"
                        />
                    </div>
                </div>
                <!-- Create non-existent parent file systems -->
                <div class="mt-2">
                    <div class="flex flex-row justify-between">
                        <label :for="getIdKey('create-parent-filesystems')" class="mt-2 mr-2 block text-sm font-medium leading-6 text-default">Create Non-Existent Parent File Systems</label>
                        <PfSwitch
                            :modelValue="createNonExistParent"
                            @update:modelValue="createNonExistParent = $event"
                            :id="getIdKey('create-parent-filesystems')"
                        />
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="w-full grid grid-rows-2">
                <div class="w-full row-start-1">
                    <p class="text-danger" v-if="nameFeedback">{{ nameFeedback }}</p>
                    <p class="text-danger" v-if="parentFeedback">{{ parentFeedback }}</p>
                </div>
                <div class="button-group-row justify-between">
                    <button @click="showRenameModal = false" :id="getIdKey('confirm-rename-no')" name="rename-button-no" class="btn btn-secondary object-left justify-start h-fit">Cancel</button>

                    <div class="button-group-row">
                        <button v-if="!renaming" id="rename-filesystem-btn" class="btn btn-primary object-right justify-end h-fit w-full" @click="renameBtn()">Rename</button>
                        <button disabled v-if="renaming" id="finish" type="button" class="btn btn-primary object-right justify-end">
                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 mr-3 text-gray-200 animate-spin text-default" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="text-success" />
                            </svg>
                            Renaming...
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </PfModal>
</template>
<script setup lang="ts">
import { ref, Ref, inject, computed } from 'vue';
import { renameFileSystem } from '../../composables/datasets';
import PfModal from '../pf/PfModal.vue';
import PfSwitch from '../pf/PfSwitch.vue';
import { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { pushNotification, Notification } from '@45drives/houston-common-ui';

interface RenameFileSystemProps {
    idKey: string;
    filesystem: ZFSFileSystemInfo;
}


const props = defineProps<RenameFileSystemProps>();
const showRenameModal = inject<Ref<boolean>>('show-rename-modal')!;
const datasets = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const truncateText = inject<Ref<string>>('style-truncate-text')!;
const renaming = inject<Ref<boolean>>('renaming')!;
const confirmRename = inject<Ref<boolean>>('confirm-rename')!;
const nameFeedback = ref('');
const parentFeedback = ref('');
const parentFS = ref(props.filesystem.parentFS!);
const newName = ref('');
const forceUnmount = ref(false);
const createNonExistParent = ref(false);

function getChildDatasetIds(dataset, allDatasets): string[] {
    let childIds: string[] = [];

    const children = allDatasets.filter(child => child.parentFS === dataset.id);

    for (const child of children) {
        childIds.push(child.id);
        childIds = childIds.concat(getChildDatasetIds(child, allDatasets));
    }

    return childIds;
}

const datasetsInSamePool = computed<ZFSFileSystemInfo[]>(() => {
    const currentDataset = props.filesystem;

    const childDatasetIds = getChildDatasetIds(currentDataset, datasets.value);

    return datasets.value.filter(dataset => {
        return (
            dataset.pool === currentDataset.pool && dataset.id !== currentDataset.id && !childDatasetIds.includes(dataset.id)
        );
   });
});

async function renameBtn() {
    if (nameCheck(newName.value, parentFS.value)) {
        renaming.value = true;

        try {
			const output: any = await renameFileSystem(props.filesystem.name, (parentFS.value + '/' + newName.value), forceUnmount.value, createNonExistParent.value);

			if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
				renaming.value = false;
                pushNotification(new Notification('Rename Dataset Failed', `${props.filesystem.name} was not renamed: ${errorMessage}`, 'error', 5000));
			} else {
                confirmRename.value = true;
                pushNotification(new Notification('File System Renamed', `${props.filesystem.name} renamed to ${newName.value}.`, 'success', 5000));

                renaming.value = false;
                showRenameModal.value = false;
			}
		} catch (error) {
			console.error(error);
		}
    }
}

const nameCheck = (fileSystemName, fileSystemParent) => {
    let result = true;
    nameFeedback.value = '';

	if (fileSystemName == '') {
		result = false;
		nameFeedback.value = 'Name cannot be empty.';
	} else if (!fileSystemName.match(/^[a-zA-Z0-9]/) ) {
		result = false;
		nameFeedback.value = 'Name must begin with alphanumeric characters.';
	} else if (fileSystemName.match(/^[ ]/)) {
		result = false;
		nameFeedback.value = 'Name cannot begin with whitespace.';
	} else if (fileSystemName.match(/[ ]$/)) {
		result = false;
		nameFeedback.value = 'Name cannot end with whitespace.';
	} else if (!fileSystemName.match(/^[a-zA-Z0-9_.:-]*$/)) {
		result = false;
		nameFeedback.value = 'Name contains invalid characters.';
	} else if (fileSystemNameExists(fileSystemName, fileSystemParent, datasets.value)) {
		result = false;
		nameFeedback.value = `Name already exists in this location: ${fileSystemParent}.`;
	}

    return result;
}

function fileSystemNameExists(filesystemName, fileSystemParent, datasets : ZFSFileSystemInfo[]) {
	const newParentPath = fileSystemParent;
	for (const dataset of datasets) {
		const existingParentPath = dataset.parentFS;
		const existingDatasetName = dataset.name.split('/').pop();

		if (existingParentPath === newParentPath && existingDatasetName === filesystemName) {
			return true;
		}
	}

	return false;
}

const getIdKey = (name: string) => `${name}`;
</script>
