<template>
	<div class="pf-v5-c-page">
		<header class="pf-v5-c-masthead px-3 sm:px-5 flex items-center bg-plugin-header font-redhat font-normal shadow-lg z-10">
			<div class="flex flex-row flex-wrap items-baseline basis-32 grow shrink-0 gap-x-4 content-between">
				<div class="flex flex-row items-center my-5">
					<Logo45Drives class="h-6" />
				</div>
			</div>
			<h1 class="text-red-800 dark:text-white text-base sm:text-2xl grow-0 text-center px-2">
				ZFS
			</h1>
			<div class="flex basis-32 justify-end items-center grow shrink-0 gap-buttons">
				<div class="grow"></div>
				<NotificationBell />
			</div>
		</header>
		<main class="pf-v5-c-page__main" tabindex="-1">
			<section class="pf-v5-c-page__main-section pf-m-no-padding">
				<Navigation :navigationItems="navigation" :currentNavigationItem="currentNavigationItem" :navigationCallback="navigationCallback" :show="show"/>
			</section>
			<section class="pf-v5-c-page__main-section">
				<ZFS :tag="navTag"/>
			</section>
		</main>
	</div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import "@45drives/houston-common-ui/style.css";
import '@45drives/houston-common-css/src/index.css';
import { Logo45Drives } from "@45drives/houston-common-ui";
import Navigation from "./components/common/Navigation.vue";
import ZFS from './views/ZFS.vue';
import { NavigationItem, NavigationCallback } from './types';
import { notificationStore } from './store/notification';
import NotificationBell from './components/notification/Notification.vue';

const show = ref(true);
const navTag = ref('dashboard');


const currentNavigationItem = computed<NavigationItem | undefined>(() => navigation.find(item => item.current));
onMounted(async () => {
  await Promise.all([
    notificationStore.countMissedNotifications(),

    notificationStore.fetchMissedNotifications(50, 0)
  ]);
});
//navigation for tabs
const navigationCallback: NavigationCallback = (item: NavigationItem) => {
	navTag.value = item.tag;
};


//tabs for navigation
const navigation = reactive<NavigationItem[]>([
	{ name: 'Dashboard', tag: 'dashboard', current: computed(() => navTag.value == 'dashboard') as unknown as boolean, show: true, },
	{ name: 'Pools', tag: 'pools', current: computed(() => navTag.value == 'pools') as unknown as boolean, show: true, },
	{ name: 'File Systems', tag: 'filesystems', current: computed(() => navTag.value == 'filesystems') as unknown as boolean, show: true, },
].filter(item => item.show));

// function setUpMessageHandler(handler: (message:string) => void) {
//     const client = cockpit.dbus("org._45drives.Houston");
//     const houston = client.proxy("org._45drives.Houston", "/org/_45drives/Houston");
//     houston.addEventListener("Message", (event_, message: string) => handler(message));
// }

// setUpMessageHandler((message) => {
//     console.log("message from dbus",message)
// })

</script>

	