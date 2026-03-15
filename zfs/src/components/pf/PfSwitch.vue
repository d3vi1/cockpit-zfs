<template>
  <label class="pf-v5-c-switch" :for="switchId">
    <input
      :id="switchId"
      class="pf-v5-c-switch__input"
      type="checkbox"
      role="switch"
      :aria-checked="modelValue"
      :checked="modelValue"
      @change="onToggle"
      @keydown.space.prevent="onToggle"
    />
    <span class="pf-v5-c-switch__toggle">
      <span class="pf-v5-c-switch__toggle-icon">
        <svg
          v-if="modelValue"
          viewBox="0 0 512 512"
          fill="currentColor"
          aria-hidden="true"
          style="width: 0.625rem; height: 0.625rem;"
        >
          <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z" />
        </svg>
      </span>
    </span>
    <span v-if="label" class="pf-v5-c-switch__label">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PfSwitchProps {
  modelValue: boolean;
  label?: string;
  id?: string;
}

const props = withDefaults(defineProps<PfSwitchProps>(), {
  label: '',
  id: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const switchId = computed(() => props.id || `pf-switch-${Math.random().toString(36).slice(2, 9)}`);

function onToggle() {
  emit('update:modelValue', !props.modelValue);
}
</script>
