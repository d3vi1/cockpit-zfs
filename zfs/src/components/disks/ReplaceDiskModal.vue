<template>
    <PfModal :isOpen="showFlag" title="Replace Disk" variant="large" @close="closeModal()">
            <div>
                <!-- Disk ID (Select) -->
                <div>
                    <label :for="getIdKey('disk-identifier')"
                        class="block text-sm font-medium leading-6 text-default">Disk Identifier</label>
                    <select :id="getIdKey('disk-identifier')" v-model="diskIdentifier" name="disk-identifier"
                        class="text-default bg-default mt-1 block w-full input-textlike sm:text-sm sm:leading-6">
                        <option value="sd_path">Block Device</option>
                        <option value="phy_path">Hardware Path</option>
                        <option value="vdev_path">Device Alias</option>
                    </select>
                </div>

                <!-- Disk selection, shows disks that are not in use -->
                <label :for="getIdKey('available-disk-list')"
                    class="my-1 block text-sm font-medium leading-6 text-default">Select Disks</label>
                <ul v-if="availableDisks.length > 0" :id="getIdKey('available-disk-list')" role="list"
                    class="flex flex-row flex-wrap gap-2">
                    <li v-for="(disk, diskIdx) in availableDisks" :key="diskIdx" class="my-2">
                        <button class="flex min-w-fit w-full h-full border border-default rounded-lg"
                            :title="disk.hasPartitions! ? 'Disk already has partitions. Proceed with caution.' : getDiskIDName(allDisks, diskIdentifier, disk.name!)"
                            :class="diskCardClass(disk.name)">
                            <label :for="getIdKey(`disk-${diskIdx}`)"
                                class="flex flex-col w-full py-4 mx-2 text-sm gap-0.5 justify-start">
                                <span class="flex flex-row flex-grow w-full justify-between">
                                    <input :id="getIdKey(`disk-${diskIdx}`)" type="checkbox" :value="disk.name"
                                        :name="`disk-${disk.name}`" :checked="selectedDisk === disk.name"
                                        @change="selectSingleDisk(disk.name)"
                                        class="justify-start w-4 h-4 text-success bg-well border-default rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2" />
                                    <div v-if="disk.hasPartitions!"
                                        title="Disk already has partitions. Proceed with caution."
                                        class="flex items-center justify-center h-6 w-6 bg-default rounded-full ml-2">
                                        <ExclamationCircleIcon class="h-6 text-orange-700" />
                                    </div>
                                    <div v-if="disk.errors && disk.errors!.length > 0"
                                        title="This disk belongs to an exported pool. Force Add to override."
                                        class="flex items-center justify-center h-6 w-6 bg-default rounded-full ml-2">
                                        <ExclamationTriangleIcon class="h-6 text-danger" />
                                    </div>
                                </span>
                                <h3 class="truncate text-sm font-medium text-default">
                                    {{ truncateName((getDiskIDName(allDisks, diskIdentifier, disk.name!)), 8) }}</h3>
                                <p class="mt-1 truncate text-sm text-default">{{ disk.type }}</p>
                                <p class="mt-1 truncate text-sm text-default">Capacity: {{ disk.capacity }}</p>
                            </label>
                        </button>
                    </li>
                </ul>
                <div v-if="availableDisks.length == 0">
                    No Disks Available
                </div>

            </div>

        <template #footer>
            <div class="w-full grid grid-rows-2">
                <div class="w-full row-start-1 justify-center items-center">
                    <div class="justify-self-start mt-2">
                        <p class="text-danger" v-if="diskSizeFeedback">{{ diskSizeFeedback }}</p>
                        <p class="text-danger" v-if="diskBelongsFeedback">{{ diskBelongsFeedback }}</p>
                    </div>
                </div>

                <div class="button-group-row w-full justify-between row-start-2">
                    <div class="button-group-row mt-2 items-center">
                        <button @click="closeModal" :id="getIdKey('close-replace-disk-btn')"
                            name="close-replace-disk-btn" class="pf-v5-c-button pf-m-danger">Close</button>

                        <PfSwitch v-model="diskVDevPoolData.forceReplace"
                            :id="getIdKey('force-add-vdev')"
                            label="Forcefully Replace Disk" />
                    </div>
                    <div class="button-group-row mt-2">
                        <button v-if="!adding" id="replace-disk-btn"
                            class="pf-v5-c-button pf-m-primary"
                            @click="replaceDiskBtn">Replace Disk</button>
                        <button disabled v-if="adding" id="finish" type="button"
                            class="pf-v5-c-button pf-m-primary pf-m-in-progress">
                            Replacing...
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </PfModal>
</template>
<script setup lang="ts">
import { ref, inject, Ref, computed, onMounted } from 'vue';
import PfModal from '../pf/PfModal.vue';
import PfSwitch from '../pf/PfSwitch.vue';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { convertSizeToBytes, getDiskIDName, truncateName } from '../../composables/helpers';
import { replaceDisk } from '../../composables/disks';
import { loadImportablePools } from '../../composables/loadImportables';
import { ZPool, VDev, VDevDisk, ZFSFileSystemInfo, DiskIdentifier } from '@45drives/houston-common-lib';
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { PoolScanObjectGroup, PoolDiskStats, Activity } from '../../types';
import { useRefreshAllData } from '../../composables/useRefreshAllData';


interface ReplaceDiskModalProps {
    idKey: string;
    pool: ZPool;
    vDev: VDev;
    disk: VDevDisk;
    showFlag: boolean;
}

const props = defineProps<ReplaceDiskModalProps>();
const truncateText = inject<Ref<string>>('style-truncate-text')!;

const showFlag = ref(props.showFlag);

const emit = defineEmits(['close']);

const closeModal = () => {
    emit('close');
}

const showReplaceDiskModal = inject<Ref<boolean>>('show-replace-modal')!;
const selectedDisk = ref(''); // Holds the name of the selected disk

function selectSingleDisk(diskName) {
    // If the same disk is clicked again, deselect it; otherwise, select the new disk
    selectedDisk.value = selectedDisk.value === diskName ? '' : diskName;
}

const pools = inject<Ref<ZPool[]>>('pools')!;
const allDisks = inject<Ref<VDevDisk[]>>('disks')!;
const datasets = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;

const diskIdentifier = ref<DiskIdentifier>('vdev_path');
const diskSizeFeedback = ref('')

const phyPathPrefix = '/dev/disk/by-path/';
const sdPathPrefix = '/dev/';
const newDisk = ref();
const oldDisk = ref();
const diskNewName = ref('');
const diskNewPath = ref('');
const diskExistPath = ref('');
const diskExistName = ref('');
const diskBelongsFeedback = ref('');
const adding = ref(false);

const disksLoaded = inject<Ref<boolean>>('disks-loaded')!;
const poolsLoaded = inject<Ref<boolean>>('pools-loaded')!;
const fileSystemsLoaded = inject<Ref<boolean>>('datasets-loaded')!;
const scanObjectGroup = inject<Ref<PoolScanObjectGroup>>('scan-object-group')!;
const poolDiskStats = inject<Ref<PoolDiskStats>>('pool-disk-stats')!;

const scanActivities = inject<Ref<Map<string, Activity>>>('scan-activities')!;
const trimActivities = inject<Ref<Map<string, Activity>>>('trim-activities')!;

const availableDisks = computed<VDevDisk[]>(() => {
    return allDisks.value.filter(disk => disk.guid === "");
});

const diskVDevPoolData = ref({
    existingDiskName: '',
    newDiskName: '',
    vDevName: props.vDev.name,
    poolName: props.pool.name,
    forceReplace: false,
});

//change color of disk when selected
const diskCardClass = (diskName) => {
    return selectedDisk.value === diskName ? 'bg-green-300 dark:bg-green-700' : '';
};

function setDiskNamePath() {
    oldDisk.value = props.disk;
    // console.log('setting oldDisk.value:', oldDisk.value);
    // console.log('getting selectedDisk.value:', selectedDisk.value);
    newDisk.value = allDisks.value.find(disk => disk.name === selectedDisk.value);
    // console.log('setting newDisk.value:', newDisk.value);
    
    switch (diskIdentifier.value) {
        case 'vdev_path':
            diskNewPath.value = newDisk.value!.vdev_path;
            diskNewName.value = selectedDisk.value;
            diskExistPath.value = oldDisk.value!.path;
            diskExistName.value = oldDisk.value!.name;
            // console.log('diskNewPath:', diskNewPath.value, 'diskNewName:', diskNewName.value);
            // console.log('diskExistPath:', diskExistPath.value, 'diskExistName:', diskExistName.value);
            break;
        case 'phy_path':
            diskNewPath.value = newDisk.value!.phy_path;
             diskNewName.value = diskNewPath.value.replace(phyPathPrefix, '');
            diskExistPath.value = oldDisk.value!.path;
             diskExistName.value = diskExistPath.value.replace(phyPathPrefix, '');
            // console.log('diskNewPath:', diskNewPath.value, 'diskNewName:', diskNewName.value);
            // console.log('diskExistPath:', diskExistPath.value, 'diskExistName:', diskExistName.value);
            break;
        case 'sd_path':
            diskNewPath.value = newDisk.value!.sd_path;
             diskNewName.value = diskNewPath.value.replace(sdPathPrefix, '');
            diskExistPath.value = oldDisk.value!.path;
             diskExistName.value = diskExistPath.value.replace(sdPathPrefix, '');
            // console.log('diskNewPath:', diskNewPath.value, 'diskNewName:', diskNewName.value);
            // console.log('diskExistPath:', diskExistPath.value, 'diskExistName:', diskExistName.value);
            break;
        default:
            console.log('error with set diskName/paths');
            break;
    }
}


async function replaceDiskBtn() {
    if (diskSizeMatch()) {
        if (!diskBelongsToImportablePool() || diskVDevPoolData.value.forceReplace) {
            setDiskNamePath();
            diskVDevPoolData.value.newDiskName = diskNewName.value;
            diskVDevPoolData.value.existingDiskName = diskExistName.value;
            // console.log('all data of disk being replaceed:', diskVDevPoolData.value);
                
            adding.value = true;
            try {
                const output: any =  await replaceDisk(diskVDevPoolData.value.poolName, diskVDevPoolData.value.existingDiskName, diskVDevPoolData.value.newDiskName, diskVDevPoolData.value.forceReplace);

                if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
                    adding.value = false;
                    pushNotification(new Notification('Replace Disk Failed', `There was an error replacing this disk: ${errorMessage}`, 'error', 5000));
                } else {
           
                    showReplaceDiskModal.value = false;
                    adding.value = false;
                    await refreshAllData();
                    pushNotification(new Notification('Disk Replaced', `Replaced disk successfully.`, 'success', 5000));
                }
            } catch (error) {
                console.error(error);
            }

        }
    }
}

const diskSizeMatch = () => {
    let result = true;
    diskSizeFeedback.value = '';
    // console.log("Checking disk:", selectedDisk.value);
    
    if (selectedDisk.value == '') {
        diskSizeFeedback.value = 'At least one disk is required.'
        return false;
    }

    const newDiskData = allDisks.value.find(fullDisk => fullDisk.name === selectedDisk.value);

    if (newDiskData) {
        // console.log('newDiskCapacity before conversion:', newDiskData!.capacity);
        const newCapacity = convertSizeToBytes(newDiskData!.capacity!);
        // console.log('newCapacity:', newCapacity);

        const oldDisks = props.vDev.disks;
        // console.log('oldDisks:', oldDisks);

        for (const oldDisk of oldDisks) {

            // console.log('currentCapacity before conversion:', oldDisk!.capacity, false);
            const currentCapacity = convertSizeToBytes(oldDisk.capacity!);
            // console.log('currentCapacity:', currentCapacity);

            if (newCapacity < currentCapacity) {
                diskSizeFeedback.value = "Cannot replace. Please select a disk that has capacity greater than or equal to current disks."
                result = false;
                break;
            }
        }
    }

    return result;
};

const importablePools = inject<Ref<ZPool[]>>('importable-pools')!;
const diskBelongsToImportablePool = () => {
	let result = false;
	diskBelongsFeedback.value = '';

	if (diskVDevPoolData.value.forceReplace) {
		return false;
	}
    const selectedNewDisk = allDisks.value.find(fullDisk => fullDisk.name == selectedDisk.value);
        // console.log('selectedDisk:', selectedDisk);
        importablePools.value.forEach(pool => {
            // console.log('importablePool:', pool);
            pool.vdevs.forEach(importableVDev => {
                // console.log('importableVDev:', importableVDev);
                importableVDev.disks.forEach(disk => {
                    // console.log('importableDisk:', disk);
                    if (selectedNewDisk!.name == disk.name) {
                        result = true;
                        diskBelongsFeedback.value = `This disk was used in exported pool '${pool.name}'.\n Use Force Add to override and use disk in new Vdev.`;
                        // console.log(`Disk belongs to importable pool: ${pool.name}`);
                    }
                });
            });
        });

	// console.log('diskBelongsFeedback:', diskBelongsFeedback.value);
	return result;
}

const { refreshAllData } = useRefreshAllData({
    poolData: pools,
    diskData: allDisks,
    filesystemData: datasets,
    disksLoaded,
    poolsLoaded,
    fileSystemsLoaded,
    scanObjectGroup,
    poolDiskStats,
    scanActivities,
    trimActivities
});

onMounted(() => {
	loadImportablePools(importablePools.value, allDisks, pools);
});

const getIdKey = (name: string) => `${props.idKey}-${name}`;
</script>