<template>
  <div ref="wrapperRef" class="pf-v5-c-dropdown" :class="{ 'pf-m-expanded': isExpanded }">
    <!-- Toggle button -->
    <button
      ref="toggleRef"
      class="pf-v5-c-menu-toggle"
      :class="{ 'pf-m-plain': kebab }"
      type="button"
      :aria-expanded="isExpanded"
      aria-haspopup="true"
      :aria-label="kebab ? 'Actions' : undefined"
      @click="toggle"
      @keydown="onToggleKeydown"
    >
      <template v-if="kebab">
        <span class="pf-v5-c-menu-toggle__icon">
          <!-- Kebab (three vertical dots) icon -->
          <svg
            viewBox="0 0 192 512"
            fill="currentColor"
            aria-hidden="true"
            style="width: 1em; height: 1em;"
          >
            <path d="M96 184c39.8 0 72 32.2 72 72s-32.2 72-72 72-72-32.2-72-72 32.2-72 72-72zM24 80c0 39.8 32.2 72 72 72s72-32.2 72-72S135.8 8 96 8 24 40.2 24 80zm0 352c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72z" />
          </svg>
        </span>
      </template>
      <template v-else>
        <span class="pf-v5-c-menu-toggle__text">
          <slot name="trigger">Actions</slot>
        </span>
        <span class="pf-v5-c-menu-toggle__controls">
          <span class="pf-v5-c-menu-toggle__toggle-icon">
            <svg
              viewBox="0 0 320 512"
              fill="currentColor"
              aria-hidden="true"
              style="width: 1em; height: 1em;"
            >
              <path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z" />
            </svg>
          </span>
        </span>
      </template>
    </button>

    <!-- Menu -->
    <div
      v-if="isExpanded"
      class="pf-v5-c-menu"
      role="menu"
    >
      <div class="pf-v5-c-menu__content">
        <ul class="pf-v5-c-menu__list" role="none">
          <li
            v-for="(item, index) in items"
            :key="index"
            class="pf-v5-c-menu__list-item"
            :class="{ 'pf-m-disabled': item.disabled }"
            role="none"
          >
            <button
              ref="menuItemRefs"
              class="pf-v5-c-menu__item"
              role="menuitem"
              :disabled="item.disabled"
              :title="item.tooltip"
              :tabindex="index === activeIndex ? 0 : -1"
              @click="onItemClick(item)"
              @keydown="onMenuKeydown($event, index)"
            >
              <span class="pf-v5-c-menu__item-main">
                <span class="pf-v5-c-menu__item-text">{{ item.label }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

export interface DropdownMenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  tooltip?: string;
}

interface PfDropdownMenuProps {
  items: DropdownMenuItem[];
  kebab?: boolean;
}

const props = withDefaults(defineProps<PfDropdownMenuProps>(), {
  kebab: false,
});

const isExpanded = ref(false);
const activeIndex = ref(0);
const wrapperRef = ref<HTMLElement | null>(null);
const toggleRef = ref<HTMLButtonElement | null>(null);
const menuItemRefs = ref<HTMLButtonElement[]>([]);

function toggle() {
  isExpanded.value = !isExpanded.value;
}

function firstEnabledIndex(): number {
  const idx = props.items.findIndex((item) => !item.disabled);
  return idx >= 0 ? idx : 0;
}

function openMenu() {
  isExpanded.value = true;
  activeIndex.value = firstEnabledIndex();
}

function closeMenu(returnFocus = true) {
  isExpanded.value = false;
  if (returnFocus) {
    toggleRef.value?.focus();
  }
}

function onItemClick(item: DropdownMenuItem) {
  if (item.disabled) return;
  item.action?.();
  closeMenu();
}

/* Focus the active menu item whenever the menu opens or activeIndex changes */
watch([() => isExpanded.value, activeIndex], async () => {
  if (!isExpanded.value) return;
  await nextTick();
  menuItemRefs.value[activeIndex.value]?.focus();
});

/* ---- Keyboard handling on toggle ---- */
function onToggleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (!isExpanded.value) {
        openMenu();
      }
      break;
    case 'Escape':
      event.preventDefault();
      closeMenu();
      break;
  }
}

/* ---- Keyboard handling inside menu ---- */
function onMenuKeydown(event: KeyboardEvent, index: number) {
  const enabledIndices = props.items
    .map((item, i) => ({ item, i }))
    .filter((entry) => !entry.item.disabled)
    .map((entry) => entry.i);

  if (enabledIndices.length === 0) return;

  const currentPos = enabledIndices.indexOf(index);

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault();
      if (currentPos === -1) {
        activeIndex.value = enabledIndices[0];
      } else {
        const nextPos = currentPos < enabledIndices.length - 1 ? currentPos + 1 : 0;
        activeIndex.value = enabledIndices[nextPos];
      }
      break;
    }
    case 'ArrowUp': {
      event.preventDefault();
      if (currentPos === -1) {
        activeIndex.value = enabledIndices[enabledIndices.length - 1];
      } else {
        const prevPos = currentPos > 0 ? currentPos - 1 : enabledIndices.length - 1;
        activeIndex.value = enabledIndices[prevPos];
      }
      break;
    }
    case 'Home': {
      event.preventDefault();
      activeIndex.value = enabledIndices[0];
      break;
    }
    case 'End': {
      event.preventDefault();
      activeIndex.value = enabledIndices[enabledIndices.length - 1];
      break;
    }
    case 'Escape': {
      event.preventDefault();
      closeMenu();
      break;
    }
    case 'Tab': {
      closeMenu(false);
      break;
    }
  }
}

/* ---- Click-outside ---- */
function onDocumentClick(event: MouseEvent) {
  if (!wrapperRef.value) return;
  if (!wrapperRef.value.contains(event.target as Node)) {
    isExpanded.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true);
});
</script>
