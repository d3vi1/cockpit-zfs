<template>
    <PfModal :isOpen="showChangePassphrase" @close="showChangePassphrase = false" title="Change Passphrase">
        <div>
            <div>
                <div class="flex flex-row justify-between items-center">
                    <label :for="getIdKey('passphrase')"
                        class="mt-1 block text-sm font-medium leading-6 text-default">New Passphrase</label>
                    <span title="Passphrase requires at least 8 characters.">
                        <InformationCircleIcon class="ml-2 mt-1 h-6 text-muted" />
                    </span>
                </div>

                <input :id="getIdKey('passphrase')" type="password" v-model="passphrase" name="passphrase"
                    class="mt-1 block w-full input-textlike bg-default" placeholder="Passphrase" />
            </div>

            <div>
                <div class="flex flex-row justify-between items-center">
                    <label :for="getIdKey('passphrase-confirm')"
                        class="mt-1 block text-sm font-medium leading-6 text-default">Confirm New Passphrase</label>
                    <span title="Passphrase requires at least 8 characters.">
                        <InformationCircleIcon class="ml-2 mt-1 h-6 text-muted" />
                    </span>
                </div>

                <input :id="getIdKey('passphrase-confirm')" type="password" @keydown.enter="changeBtn()"
                    v-model="passphraseConfirm" name="passphrase-confirm"
                    class="mt-1 block w-full input-textlike bg-default" placeholder="Confirm Passphrase" />
            </div>

            <!-- Important Passphrase Reminder -->
            <div class="my-2 p-2 text-danger text-sm">
                <p><strong>Important:</strong> Please note your passphrase carefully. If it is lost, it
                    cannot
                    be retrieved or reset.</p>
            </div>
        </div>

        <template #footer>
            <div class="w-full grid grid-rows-2">
                <div class="w-full row-start-1">
                    <div class="button-group-row mt-2 justify-self-center">
                        <p class="text-danger" v-if="passFeedback">{{ passFeedback }}</p>
                    </div>
                </div>
                <div class="button-group-row w-full row-start-2 justify-between mt-2">
                    <button id="cancel" class="mt-1 btn btn-danger object-left justify-start h-fit"
                        @click="showChangePassphrase = false">Cancel</button>
                    <button v-if="!changing" @click="changeBtn()" :id="getIdKey('change-passphrase-btn')"
                        name="change-passphrase-btn"
                        class="mt-1 btn btn-primary object-right justify-end h-fit">Change</button>
                    <button disabled v-if="changing" :id="getIdKey('change-pass-spinner')" type="button"
                        class="btn btn-danger object-right justify-end">
                        <svg aria-hidden="true" role="status"
                            class="inline w-4 h-4 mr-3 text-gray-200 animate-spin text-default" viewBox="0 0 100 101"
                            fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                fill="currentColor" />
                            <path
                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                fill="text-success" />
                        </svg>
                        Changing...
                    </button>
                </div>
            </div>
        </template>
    </PfModal>
</template>
<script setup lang="ts">
import { ref, Ref, inject } from 'vue';
import PfModal from '../pf/PfModal.vue';
import { changePassphrase } from '../../composables/datasets';
import { InformationCircleIcon } from '@heroicons/vue/24/solid';
import { ZFSFileSystemInfo } from '@45drives/houston-common-lib';
import { pushNotification, Notification } from '@45drives/houston-common-ui';

interface ChangePassphraseProps {
    idKey: string;
    filesystem: ZFSFileSystemInfo;
}

const props = defineProps<ChangePassphraseProps>();
const showChangePassphrase = inject<Ref<boolean>>('show-change-passphrase')!;
const datasets = inject<Ref<ZFSFileSystemInfo[]>>('datasets')!;
const fileSystemsLoaded = inject<Ref<boolean>>('datasets-loaded')!;
const fileSystem = ref(props.filesystem);
const changing = inject<Ref<boolean>>('changing')!;
const confirmChange = inject<Ref<boolean>>('confirm-change')!;
const passphrase = ref('');
const passphraseConfirm = ref('');
const passFeedback = ref('');

async function changeBtn() {
    if (encryptPasswordCheck(fileSystem.value)) {
        changing.value = true;

        try {
            const output: any = await changePassphrase(fileSystem.value.name, passphrase.value);

            if (output == null || output.error) {
				const errorMessage = output?.error || 'Unknown error';
                changing.value = false;
                pushNotification(new Notification('Passphrase Change Failed', `There was an error changing this passphrase: ${errorMessage}`, 'error', 5000));

            } else {
                confirmChange.value = true;
                pushNotification(new Notification('Encryption Passphrase Changed', `Changed passphrase for ${fileSystem.value!.name}.`, 'success', 5000));

                changing.value = false;
                showChangePassphrase.value = false;
            }
        } catch (error) {
            console.error(error);
        }

    }
}

const encryptPasswordCheck = (fileSystem : ZFSFileSystemInfo) => {
	let result = true;
	passFeedback.value = '';

	if (fileSystem.encrypted) {
		if (passphraseConfirm.value != passphrase.value) {
			result = false;
			passFeedback.value = 'Passphrase does not match.';
		} else if (passphrase.value == '') {
			result = false;
			passFeedback.value = 'Passphrase cannot be empty.';
		} else if (passphrase.value.length < 8) {
			result = false;
			passFeedback.value = 'Passphrase requires a minimum of 8 characters.';
		}
	}

	return result;
}

const getIdKey = (name: string) => `${name}`;
</script>
