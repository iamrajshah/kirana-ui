# POS selection controls

Use `Select` for simple single-choice fields supplied as `{value, label}` options. Use `SelectionControl` when migrating existing native/Ionic controls or rendering child options. Both use `SearchableSelect` for the interaction.

- Single choice: searchable list; selection commits on click or Enter.
- Multiple choice: `multiple` with array values; checkbox options stay open for further choices.
- Arrows move the highlight; disabled options cannot be chosen. Escape cancels and does not dismiss a containing modal. Tab leaves the field without committing typed search text.
- `required` validates the selected value, not the search query. Searching never submits a form or payment.
- Include an accessible label. Inside an existing label, avoid adding a second visible label. Pass stable string option IDs and localized labels; preserve disabled flags.
- Lists render twenty matching options at a time. For large remote datasets, use the explicit `onSearch` contract, as CategoryPicker does. A local picker cannot search records that have not been loaded.
- Use the shared popup rather than Ionic alerts/action sheets or native select menus. Popups use theme variables, escape table/card clipping and close when Ionic hides their retained route.
- Keep boolean settings as switches or checkboxes. Navigation tabs and visual template previews are not dropdown fields.
- Billing product/customer autocomplete remains inline for quick entry. Preserve its keyboard and quick-create behavior.

Scanner capture checks for overlays at the start and terminator of each burst. An open selection popup suppresses capture, including if it opens mid-burst. Input editing, inactive routes, slow typing and modal protections remain in force. Never turn search text or barcode bursts into payment submissions.

Regression entry points: `SelectionControl.test.tsx`, `SearchableSelect.test.tsx`, `useCounterScanner.test.tsx`, `BillingPage.test.tsx`, purchase tax/pack tests, food-licence tests, report scope tests and customer sorting tests. Screen tests may mock the shared control to focus on business behavior; shared-control tests must exercise the real component.

Manual checks: desktop/tablet/mobile menus, dark mode, translated labels, actual scanner Enter/Tab suffixes and cash/khata/payment completion. Synthetic keyboard tests do not certify physical hardware.

GST-rate datalists in purchase forms remain numeric-input suggestions rather than fixed-choice selectors: users can type a rate directly, and existing tax validation still applies. They do not change a selection silently.

## Enter navigation regression

Ionic hosts may retain `disabled="false"` in the DOM. Focus traversal must use their `disabled` property, with native `:disabled` for fieldset inheritance; attribute presence alone skips enabled inputs.

Run `scripts/check-enter-navigation.browser.mjs` against local Vite on port 3012 with Playwright installed (or supply `KIRANA_PLAYWRIGHT_MODULE`). `KIRANA_CHROME_PATH` can select an installed Chrome executable. The non-production fixture under `scripts/browser-fixtures/` mounts real Ionic inputs and checks desktop/phone-width focus traversal, invalid fields, disabled-field skipping, Tab and no implicit payment submission. It is not included in the Vite production bundle.
