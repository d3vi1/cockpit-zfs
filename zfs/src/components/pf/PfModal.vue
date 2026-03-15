<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="pf-v5-c-backdrop"
      @click.self="handleBackdropClick"
    >
      <div class="pf-v5-l-bullseye">
        <div
          ref="modalRef"
          class="pf-v5-c-modal-box"
          :class="variantClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <!-- Header -->
          <div class="pf-v5-c-modal-box__header">
            <h1 :id="labelId" class="pf-v5-c-modal-box__title">
              {{ title }}
            </h1>
            <div v-if="showClose" class="pf-v5-c-modal-box__close">
              <button
                ref="closeButtonRef"
                class="pf-v5-c-button pf-m-plain"
                type="button"
                aria-label="Close"
                @click="close"
              >
                <span class="pf-v5-c-button__icon">
                  <svg
                    viewBox="0 0 352 512"
                    fill="currentColor"
                    aria-hidden="true"
                    style="width: 1em; height: 1em;"
                  >
                    <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="pf-v5-c-modal-box__body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="pf-v5-c-modal-box__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, computed, useSlots } from 'vue';

let _modalUid = 0;

interface PfModalProps {
  isOpen: boolean;
  title: string;
  variant?: 'small' | 'medium' | 'large';
  showClose?: boolean;
}

const props = withDefaults(defineProps<PfModalProps>(), {
  variant: 'medium',
  showClose: true,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const slots = useSlots();

const modalRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let openerElement: HTMLElement | null = null;

const labelId = `pf-modal-title-${++_modalUid}`;

const variantClass = computed(() => {
  switch (props.variant) {
    case 'small':
      return 'pf-m-sm';
    case 'large':
      return 'pf-m-lg';
    default:
      return 'pf-m-md';
  }
});

function close() {
  emit('close');
}

function handleBackdropClick() {
  close();
}

/**
 * Focus trap: cycle Tab / Shift+Tab within the modal.
 * ESC closes the modal.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation();
    close();
    return;
  }

  if (event.key === 'Tab') {
    trapFocus(event);
  }
}

function trapFocus(event: KeyboardEvent) {
  if (!modalRef.value) return;

  const focusable = modalRef.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

/* ---- Lifecycle: manage focus & body scroll ---- */

function onFocusIn(event: FocusEvent) {
  if (!modalRef.value) return;
  if (!modalRef.value.contains(event.target as Node)) {
    // Focus escaped the modal; pull it back
    if (closeButtonRef.value) {
      closeButtonRef.value.focus();
    } else {
      modalRef.value.focus();
    }
  }
}

watch(
  () => props.isOpen,
  async (opened) => {
    if (opened) {
      openerElement = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      document.addEventListener('focusin', onFocusIn);
      await nextTick();
      // Focus the close button or the modal itself
      if (closeButtonRef.value) {
        closeButtonRef.value.focus();
      } else {
        modalRef.value?.focus();
      }
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('focusin', onFocusIn);
      // Return focus to the element that opened the modal
      openerElement?.focus();
      openerElement = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  document.removeEventListener('focusin', onFocusIn);
});
</script>
