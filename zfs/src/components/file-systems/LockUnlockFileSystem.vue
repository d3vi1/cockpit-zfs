<template>
    <PfModal :isOpen="showFlag" @close="closeModal" :title="`${upperCaseWord(props.mode)} File System`">
        <div class="grid grid-flow-row mt-3 text-center">
            <div v-if="props.mode == 'unlock'" class="w-full grid grid-cols-3">
                <div class="col-span-3 flex flex-row">
                    <label :for="getIdKey('filesystem-name')" :class="truncateText" :title="props.filesystem.name" class="mt-1 block text-sm font-medium leading-6 text-default">Name: <span :class="truncateText" :title="props.filesystem.name" class="font-normal">{{ props.filesystem.name }}</span></label>
                </div>
                <div class="col-span-3 justify-between text-center items-center grid grid-cols-3">
                    <div class="col-span-2 flex flex-row gap-1 text-center items-center">
                        <label :for="getIdKey('passphrase')" class="mt-1 block text-sm font-medium leading-6 text-default">Passphrase</label>
                        <input v-if="showPassword == false" :id="getIdKey('passphrase-hidden')" type="password" @keydown.enter="confirmBtn()" v-model="passphrase" name="passphrase" class="mt-1 block w-fit input-textlike bg-default" placeholder="Enter here" />
                        <input v-if="showPassword == true" :id="getIdKey('passphrase-shown')" type="text" @keydown.enter="confirmBtn()" v-model="passphrase" name="passphrase" class="mt-1 block w-fit input-textlike bg-default" placeholder="Enter here" />
                    </div>
                    <div class="col-span-1 button-group-row justify-end">
                        <button v-if="showPassword == true" class="btn btn-secondary max-h-min" @click="showPassword = false">
                            <EyeSlashIcon class="h-5" />
                        </button>
                        <button v-if="showPassword == false" class="btn btn-secondary max-h-min" @click="showPassword = true">
                            <EyeIcon class="h-5" />
                        </button>
                    </div>
                </div>

                <div class="col-span-3 flex flex-row">
                    <p class="text-danger mt-1">{{ passFeedback }}</p>
                </div>
                <div class="grid grid-rows-2 col-span-3">
                    <div class="flex flex-row justify-between">
                        <label :for="getIdKey('mount-switch')" class="mt-3 mr-2 block text-sm font-medium text-default whitespace-nowrap">Mount File System</label>
                        <PfSwitch
                            :modelValue="mountFS"
                            @update:modelValue="mountFS = $event"
                            :id="getIdKey('mount-file-system')"
                        />
                    </div>
                    <div class="flex flex-row justify-between">
                        <label :for="getIdKey('force-mount-switch')" class="mt-3 mr-2 block text-sm font-medium text-default whitespace-nowrap">Forcefully Mount File System</label>
                        <PfSwitch
                            :modelValue="forceMountFS"
                            @update:modelValue="forceMountFS = $event"
                            :id="getIdKey('force-mount-file-system')"
                        />
                    </div>
                </div>
            </div>
            <div v-if="props.mode == 'lock'" class="w-full grid grid-cols-2">
                <div class="col-span-2">
                    <legend :class="truncateText" :title="props.filesystem.name">Lock filesystem {{ props.filesystem.name }}?</legend>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="w-full grid grid-rows-1">
                <div class="button-group-row mt-2 justify-between">
                    <button @click="closeModal" :id="getIdKey('confirm-no')" name="button-no" class="mt-1 btn btn-secondary object-left justify-start h-fit">Cancel</button>
                    <button v-if="!doingThing" @click="confirmBtn()" :id="getIdKey('confirm-yes')" name="button-yes" class="mt-1 btn btn-danger object-right justify-end h-fit">{{upperCaseWord(props.mode)}}</button>
                    <button disabled v-if="doingThing" :id="getIdKey('confirm-spinner')" type="button" class="btn btn-danger object-right justify-end h-fit">
                        <svg aria-hidden="true" role="status" class="inline w-4 h-4 mr-3 text-gray-200 animate-spin text-default" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="text-success" />
                        </svg>
                        {{ upperCaseWord(props.mode) }}ing...
                    </button>
                </div>
            </div>
        </template>
    </PfModal>
</template>
<script setup lang="ts">
import { Ref, inject, ref } from 'vue';
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';
import { upperCaseWord } from '../../composables/helpers';
import { lockFileSystem, mountFileSystem, unlockFileSystem, isPassphraseValid } from "../../composables/datasets";
import PfModal from '../pf/PfModal.vue';
import PfSwitch from '../pf/PfSwitch.vue';
import { pushNotification, Notification } from '@45drives/houston-common-ui';
import { ZFSFileSystemInfo } from '@45drives/houston-common-lib';

interface LockUnlockFileSystemProps {
    idKey: string;
    mode: string;
    filesystem: ZFSFileSystemInfo;
    showFlag: boolean;
}

const props = defineProps<LockUnlockFileSystemProps>();
const emit = defineEmits(['close']);

const truncateText = inject<Ref<string>>('style-truncate-text')!;

const showFlag = ref(props.showFlag);
const showPassword = ref(false);
const doingThing = inject<Ref<boolean>>('locking-or-unlocking')!;
const showLockUnlockModal = inject<Ref<boolean>>('show-lock-unlock-modal')!;
const confirmLockOrUnlock = inject<Ref<boolean>>('confirm-lock-or-unlock')!;

const closeModal = () => {
    emit('close');
}

const passphrase = ref('');
const passFeedback = ref('');
const passValid = ref(false);
const mountFS = ref(true);
const forceMountFS = ref(false);

async function confirmBtn() {
    if (props.mode == 'lock') {
        doingThing.value = true;
        try {
            const lockOutput: any = await lockFileSystem(props.filesystem);

            if (lockOutput == null || lockOutput.error) {
                const errorMessage = lockOutput?.error || 'Unknown error';
                doingThing.value = false;
                pushNotification(new Notification('Lock Dataset Failed', `Failed to lock ${props.filesystem.name}: ${errorMessage}`, 'error', 5000));
            } else {
                pushNotification(new Notification('Dataset Locked', `Successfully locked ${props.filesystem.name}.`, 'success', 5000));
                doingThing.value = false;
                confirmLockOrUnlock.value = true;
                showLockUnlockModal.value = false;
            }
        } catch (error) {
            console.error(error);
        }

    } else if (props.mode == 'unlock') {
        passValid.value = await isPassphraseValid(props.filesystem.name, passphrase.value);

        if (passValid.value) {
            doingThing.value = true;

            try {
                const unlockOutput: any =  await unlockFileSystem(props.filesystem, passphrase.value);

                if (unlockOutput == null || unlockOutput.error) {
                    const errorMessage = unlockOutput?.error || 'Unknown error';
                    doingThing.value = false;
                    pushNotification(new Notification('Unlock Dataset Failed', `Failed to unlock ${props.filesystem.name}: ${errorMessage}`, 'error', 5000));

                } else {
                    if (mountFS.value) {
                        try {
                            const mountOutput: any = await mountFileSystem(props.filesystem, forceMountFS.value);

                            if (mountOutput == null || mountOutput.error) {
                                const errorMessage = mountOutput?.error || 'Unknown error';
                                pushNotification(new Notification('Mount Dataset Failed', `${props.filesystem.name} was not mounted: ${errorMessage}`, 'error', 5000));
                            } else {
                                pushNotification(new Notification('File System Mounted', props.filesystem.name + " mounted.", 'success', 5000));
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    pushNotification(new Notification('Dataset Unlocked', `Successfully unlocked ${props.filesystem.name}.`, 'success', 5000));


                    doingThing.value = false;
                    confirmLockOrUnlock.value = true;
                    showLockUnlockModal.value = false;
                }
            } catch (error) {
                console.error(error);
            }

        } else {
            passFeedback.value = 'Passphrase is invalid.';
        }
    }
}

const getIdKey = (name: string) => `${name}`;
</script>
