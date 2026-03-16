<template>
	<nav class="pf-v5-c-wizard__nav" aria-label="Pool Creation Progress">
		<ol class="pf-v5-c-wizard__nav-list">
			<li v-for="(step, stepIdx) in props.navigationItems" :key="step.id" class="pf-v5-c-wizard__nav-item">
				<button
					type="button"
					class="pf-v5-c-wizard__nav-link"
					:class="{ 'pf-m-current': step.status === 'current', 'pf-m-disabled': false }"
					:aria-current="step.status === 'current' ? 'step' : undefined"
					@click="navigationCallback(step)"
				>
					<span class="pf-v5-c-wizard__nav-link-text">
						<span v-if="step.status === 'completed'" class="pf-v5-c-wizard__nav-link-status">
							<CheckCircleIcon class="h-5 w-5 text-success" aria-hidden="true" />
						</span>
						<span v-else class="pf-v5-c-wizard__nav-link-status">
							{{ step.id }}
						</span>
						{{ step.name }}
					</span>
				</button>
			</li>
		</ol>
	</nav>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/24/outline';
import { StepsNavigationItem, StepNavigationCallback } from '../../types';

interface WizardTabsProps {
	show: boolean;
	navigationItems: StepsNavigationItem[];
	currentNavigationItem?: StepsNavigationItem;
	navigationCallback: StepNavigationCallback;
}

const props = defineProps<WizardTabsProps>();

</script>
