# UI Human Interface Guidelines (HIG)

## Adopted patterns

This project uses **PatternFly 5** CSS as the component styling foundation,
bridged to the existing houston-common-css design tokens via `pf-bridge.css`.

### Import order (main.ts)

```
1. @patternfly/patternfly/patternfly.css        -- PF base
2. @patternfly/patternfly/patternfly-addons.css  -- PF addons
3. ./assets/pf-bridge.css                        -- token bridge
4. ./assets/zfs.css                              -- app overrides
5. houston-common-css                            -- Tailwind utilities
6. houston-common-ui                             -- shared UI styles
```

PatternFly CSS custom properties are overridden in `pf-bridge.css` so that
PF markup inherits the project's colour palette in both light and dark mode
(dark mode is toggled via the `.dark` class on `<html>`).

---

## Component catalogue

### PfModal

Replaces HeadlessUI `Dialog` / `OldModal.vue`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Show / hide the modal |
| `title` | `string` | required | Modal heading text |
| `variant` | `'small' \| 'medium' \| 'large'` | `'medium'` | Width preset |
| `showClose` | `boolean` | `true` | Render the X close button |

| Event | Payload | When |
|-------|---------|------|
| `close` | none | ESC, backdrop click, or close button |

**Slots**

- `default` -- modal body content
- `footer`  -- action buttons

**Accessibility**

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Focus is trapped inside the modal (Tab / Shift+Tab cycle)
- ESC closes the modal
- Focus returns to the opener element on close

```vue
<PfModal :isOpen="show" title="Confirm delete" variant="small" @close="show = false">
  <p>Are you sure?</p>
  <template #footer>
    <button class="btn btn-secondary" @click="show = false">Cancel</button>
    <button class="btn btn-danger" @click="doDelete">Delete</button>
  </template>
</PfModal>
```

---

### PfDropdownMenu

Replaces HeadlessUI `Menu`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `DropdownMenuItem[]` | required | Menu entries |
| `kebab` | `boolean` | `false` | Use three-dot icon trigger |

Each `DropdownMenuItem`:

```ts
interface DropdownMenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  tooltip?: string;
}
```

**Slots**

- `trigger` -- custom toggle label (ignored when `kebab` is true)

**Keyboard**

- Enter / Space / ArrowDown open the menu
- Arrow keys navigate items (skipping disabled)
- Escape closes
- Click-outside closes

```vue
<PfDropdownMenu :items="actions" kebab />
```

---

### PfSwitch

Replaces HeadlessUI `Switch`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | required | Checked state (v-model) |
| `label` | `string` | `''` | Visible label text |
| `id` | `string` | auto | Input element id |

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | `boolean` | Toggle |

**Accessibility**

- `role="switch"`, `aria-checked`
- Space to toggle

```vue
<PfSwitch v-model="forceDestroy" label="Force" />
```

---

## Forbidden patterns

The following patterns **must not** be used in new code:

| Pattern | Reason | Use instead |
|---------|--------|-------------|
| `@headlessui/vue` components | Being replaced by PF wrappers | `PfModal`, `PfDropdownMenu`, `PfSwitch` |
| `<table>` / grid-based tables | Not accessible, hard to make responsive | PF table markup (future issue) |
| Tailwind `dark:` variant classes | Dark mode is handled by `pf-bridge.css` token overrides and the houston-common-css `.dark` class | houston-common-css semantic classes (`bg-default`, `text-default`, etc.) or PF variables |
| Inline `z-index` escalation | Breaks stacking context | PF backdrop / modal layering |
| Direct colour hex in templates | Not theme-aware | Design token classes or PF variables |

---

## Testing checklist

Before merging any PR that touches UI components, verify:

- [ ] **Light mode** -- colours, text contrast, borders render correctly
- [ ] **Dark mode** -- toggle `.dark` class; same checks
- [ ] **Keyboard navigation** -- Tab order is logical, Enter/Space activate controls, Escape closes overlays
- [ ] **Screen reader** -- ARIA roles and labels are present (`role="dialog"`, `role="switch"`, `role="menu"`, `aria-checked`, `aria-expanded`, `aria-labelledby`, `aria-modal`)
- [ ] **Focus management** -- modals trap focus; focus returns to opener on close
- [ ] **Responsive** -- modal and dropdown render correctly at 320px, 768px, 1280px widths
- [ ] **Build** -- `yarn build` in `zfs/` completes without errors or warnings
- [ ] **No regressions** -- existing pages that still use OldModal continue to function
