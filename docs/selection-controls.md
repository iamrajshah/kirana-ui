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

## Local usability corrections — 26 November 2026

- The document-level Enter fallback covers native editors and portalled Ionic modals. Dedicated autocomplete handlers take precedence. Required/invalid fields block advancement; Enter never confirms a financial transaction. Textareas retain multiline entry.
- On modal presentation, focus the first editor. Keep Ionic modal components mounted while toggling `isOpen`; let native dismissal finish before removing selected-record state or opening the next surface. Unmounting a visible overlay can leave the underlying route inaccessible.
- Opening a new create form clears cancelled, unsubmitted values and errors. Edit forms load their record. Financial requests with an attempted or uncertain outcome retain their reconciliation/idempotency state; do not blindly discard it as a create draft.
- Empty/Space purchase searches use the catalogue endpoint. Typed searches use the search endpoint; the latter intentionally does not browse with an empty query. Both support arrows, Enter selection and Escape.
- At three billing workspaces, replace New bill with a 3/3 status. Never imply a fourth draft can be created.
- Owner business configuration is under Settings (documents, firms, food licences, online shop). Personal language/theme/account/security remain under Profile. Settings retains owner, feature and device permission checks.

Run `scripts/check-modal-keyboard.browser.mjs` alongside the Enter fixture. Page-level keyboard checks must also use real Ionic components: mocked modal/select components cannot establish focus, overlay dismissal or visible styling correctness. Browser API fixtures establish UI behavior, not live ledger/stock correctness.

`check-pos-usability.browser.cjs` runs the feature-ordered UI acceptance sweep at 1440, 820 and 390px with synthetic tenant/API data. Set `KIRANA_PLAYWRIGHT_MODULE` to an installed Playwright module, `KIRANA_CHROME_PATH` if needed, `KIRANA_QA_BASE_URL` (default `http://127.0.0.1:3012`) and optionally `KIRANA_QA_OUTPUT`. It checks browser exceptions and rejects unintended non-quote writes. Run Vite locally first. It deliberately does not certify live payment, purchase or stock writes.
