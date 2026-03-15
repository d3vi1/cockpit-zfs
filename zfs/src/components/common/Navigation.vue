<template>
	<div v-if="show" class="pf-v5-c-tabs">
		<ul class="pf-v5-c-tabs__list" role="tablist">
			<li
				v-for="(item, idx) in props.navigationItems"
				:key="item.name"
				class="pf-v5-c-tabs__item"
				:class="{ 'pf-m-current': item.current }"
			>
				<button
					ref="tabRefs"
					class="pf-v5-c-tabs__link"
					role="tab"
					:id="'pf-tab-' + item.tag"
					:aria-controls="'pf-tab-panel-' + item.tag"
					:aria-selected="item.current"
					:tabindex="item.current ? 0 : -1"
					@click="navigationCallback(item)"
					@keydown="onKeydown($event, idx)"
				>
					<span class="pf-v5-c-tabs__item-text">{{ item.name }}</span>
				</button>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NavigationItem, NavigationCallback } from '../../types';

interface NavigationProps {
	show: boolean;
	navigationItems: NavigationItem[];
	currentNavigationItem?: NavigationItem;
	navigationCallback: NavigationCallback;
}

const props = defineProps<NavigationProps>();

const tabRefs = ref<HTMLButtonElement[]>([]);

function focusTab(index: number) {
	tabRefs.value[index]?.focus();
}

function onKeydown(event: KeyboardEvent, currentIndex: number) {
	const count = props.navigationItems.length;
	if (count === 0) return;
	let targetIndex: number | null = null;

	switch (event.key) {
		case 'ArrowRight':
			targetIndex = (currentIndex + 1) % count;
			break;
		case 'ArrowLeft':
			targetIndex = (currentIndex - 1 + count) % count;
			break;
		case 'Home':
			targetIndex = 0;
			break;
		case 'End':
			targetIndex = count - 1;
			break;
		default:
			return;
	}

	event.preventDefault();
	focusTab(targetIndex);
	props.navigationCallback(props.navigationItems[targetIndex]);
}
</script>
