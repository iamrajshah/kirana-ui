# Kirana POS QA Regression Suite

Use a disposable or explicitly approved demo tenant. Never store passwords,
tokens, OTPs, customer data, or provider keys in this file or a test report.

## Purchase input visibility — 4 November 2026

At 390 and 820 pixels in both themes, add a product without submitting the
purchase. Scroll the price input into view, focus it, and check every quantity,
cost, GST/HSN and expiry label remains within its Ionic item. Repeat with Box/pack
and English, Hindi, Marathi and Gujarati. Quantity buttons require 44-pixel touch
targets. The mobile quantity/price row must wrap; tablet keeps the compact row.
Inspect `.input-wrapper` inside the `ion-item` shadow root: horizontal offset
and content overflow must be zero after scrolling and focusing. Resetting only
the document scroll does not detect this regression. Run the built-page check
with `node scripts/verify-purchase-responsive.mjs --url=<built-preview>
--api=<api-base> --state=<private-owner-storage-state> --playwright-root=<qa-tools>`;
use `--mode=PACK` for pack controls. The check blocks all non-GET business calls,
records redacted bounds and screenshots, and never submits a purchase.

## Held-bill editor continuity — 4 November 2026

Keep the same browser tab and Billing page mounted: add an item, Hold it using
the in-app counter dialog, then choose Use at this counter. Confirm its items
and quantities return. Release that draft, reopen Held bills, and choose Use at
this counter for the **same invoice** again. Its cart must return without a
refresh, with the new claim version used on the next save. Holding and claiming
must not finalize the invoice or reduce stock. Close the browser before restoring
an approved demo backup so lease-renewal timers cannot race with restoration.

Also edit a quantity, visit Customers, and return to the same open draft:
unsaved edits must survive. An ordinary background refetch must not overwrite
them. When changing to another draft or awaiting the new claim version, stale
cached invoice data must not initialize the editor or allow checkout. Component
tests cover these retained-page transitions; a passing API claim alone does not
prove the cart was hydrated.

## Dialog themes — 4 November 2026

In both themes at 390, 820 and 1440 pixels, open Collect Payment, its payment-mode
alert, the customer picker, counter-name/held-bill dialog, WhatsApp review,
user/firm forms and the language selector. Verify raised backgrounds, readable
labels, selected options, amount summaries, focus and cancel actions. Native
date/select controls must follow the selected app theme. Printing must retain
the receipt's white page. The dark Ionic tonal scale is required by alert radio
labels, messages and dividers; mocking Ionic components in unit tests does not
exercise these CSS surfaces. Theme changes never alter a tender, customer or
submission action. Use fixture data or cancel forms without saving during the
visual run.

## Release evidence — 4 November 2026 candidate

- 99 test files / 454 tests passed after the trial, entitlement, dashboard and
  margin-preview changes.
- TypeScript, ESLint with zero warnings and the production Vite build passed.
- New coverage verifies owner seasonal/history states, manager cashier
  performance, cashier financial privacy, dynamic plan entitlements, direct
  route gating, countdown boundaries and stable partial margin preview.
- Production deployment and real-device APK smoke testing are release steps,
  not implied by these local results.

## Release evidence — 3 November 2026

Tested POS baseline: `b88e7bf` against server `9aeef37`.

- 95 test files / 435 tests passed.
- Lint, production build, Google readiness, and production-bundle verification
  passed.
- Deployed route/browser audit passed at 1440x900, 768x1024, and 390x844 with no
  crash boundary, console exception, failed request, or page overflow.
- Production API journey passed login/session, subscription access, dashboard,
  customers, payments, products, inventory, invoices, suppliers, purchases,
  firms, orders, offers, reports, settings, and shifts.

## Role matrix

Use this matrix for POS screens, then verify the API operation separately.
Effective access combines the shop lifecycle, server-resolved entitlement,
global feature/role policy, feature dependencies and the operation's permission.
The base UI tab boundary still applies; enabling a feature for a shop does not
grant a staff role a management screen or a write permission it does not have.

| Area                                           | OWNER               | MANAGER              | CASHIER                                                |
| ---------------------------------------------- | ------------------- | -------------------- | ------------------------------------------------------ |
| Billing, customers, invoice/payment collection | Yes                 | Yes                  | Yes                                                    |
| Dashboard                                      | Shop-wide analysis  | Cashier performance  | Own-counter summary only                               |
| Products/inventory management screens          | Plan/policy         | Plan/policy          | No                                                     |
| Suppliers/purchases                            | Yes                 | Manager when allowed | No                                                     |
| Reports                                        | Plan/policy         | Plan/policy          | No by default                                          |
| Staff, plan, firms, backup/restore             | Owner only          | No                   | No                                                     |
| Storefront offers/orders/share link            | Plan/policy         | Plan/policy          | Share link may be enabled; management is not automatic |
| Private bill margin                            | Policy, default yes | Policy, default no   | Policy, default no                                     |

Test server denial, not only hidden navigation.

The source references are `src/core/permissions/rolePermissions.ts` for POS tab
access, `src/core/commercial/commercialAccess.ts` for feature/role/dependency
checks, and the server route permission middleware for individual operations.
CASHIER has `PRODUCT_VIEW`: product catalogue/search and permitted inventory
read APIs support billing and must not be marked a role bypass merely because
the Products/Inventory management tabs are absent. Product creation, cost edits,
stock adjustments and expiry write-off still require their write permissions
and feature policy. Test these writes are denied separately from allowed reads.

### Shop-specific overrides

In Platform Admin > Shops > selected shop > Feature Access, test Inherit,
Enabled, Disabled, Restore default, and an optional future expiry. The plan and
its subscription/add-on entitlements form the base; an active shop override is
applied afterwards. Global feature/role boundaries, the shop lifecycle,
dependencies, tenant scope and operation permissions remain required. Enabled
can add a feature outside the base plan for that shop, but cannot authorize an
otherwise forbidden role or reactivate an expired/suspended shop. `CORE_POS`
remains protected so sign-in and recovery stay available.

1. Disable an included feature in shop A and verify shop B is unchanged. Refresh
   commercial access, then check both the menu/direct route and the classified
   API. Restore default and verify the inherited decision returns.
2. Enable an excluded feature only for shop A. Verify it is usable only by an
   authorized role, with all dependencies present and an operational shop state.
   Repeat with a missing dependency and an expired shop; both must remain denied.
3. Verify the change reason, expiry and audit entry. A stale access version must
   return a conflict, reload the current decision and require review before retry.
4. After the configured expiry, verify the plan/default decision resumes. A
   permanent override survives a plan change until restored; unrelated shop
   records and contracted plan versions remain unchanged.
5. Keep POS open while changing access. It polls `/subscription/access` every
   60 seconds and refetches on window focus/reconnect. After the new summary
   arrives, menus, direct routes and sensitive cached margin content must follow
   it without logout, cache clearing or a UI deployment. API enforcement applies
   on the next request even before the browser's background refresh.

For a legacy compatibility shop, disable Reports in Platform Admin and refresh
the POS session: the menu must disappear and a direct `/reports` visit must be
blocked. Enable it again and confirm recovery. The returned entitlement array is
authoritative for every plan, including an empty array; `LEGACY_COMPAT` does not
grant removed features. Disable private margin while a GST bill already has a
quote: its cached profit must disappear immediately while normal billing totals
remain visible. Repeat after session refresh without reloading the application.

Simulate a temporary failure of `/subscription/access`, `/auth/session-context`
and membership selection. Each request must retain its error and existing error
feedback while leaving the last confirmed shop/session/access untouched. Check
the browser console for unhandled promise rejections as well as the page itself;
handling the caller's `unwrap()` alone does not handle an async RTK Query
`onQueryStarted` failure. Restore the service and confirm a later successful
refresh still updates access.

## Authentication and lifecycle

1. Password login works for each active role and invalid credentials show one
   translated error.
2. Temporary password redirects to change-password, then returns to the app.
3. Device limit shows safe device names and replacement revokes only the chosen
   device.
4. Refresh restores the same route; logout clears tokens and protected cache.
5. Linked/invited Google identity opens the correct membership. Unknown-Google
   and automatic demo behaviour must match `/public/product` readiness flags.
6. Suspended/expired subscription redirects to the in-app renewal/restricted
   screen without exposing business routes.
7. Create two fresh Google demos at the same time. Confirm different tenant IDs,
   exactly one firm in each, and that a product/bill change in one is invisible
   in the other.
8. Verify the trial banner shows days/hours, changes to red at five hours, and
   expired operational data appears in Platform Admin cleanup only after the
   configured retention point.

## Billing, khata, and documents

1. Search/scan a product and enforce stock at the plus button.
2. Complete a full walk-in Cash/UPI/Card/Bank bill without a customer.
3. Select a customer and show previous outstanding before finalization.
4. Complete partial and credit sales; verify invoice, allocation, khata, customer
   balance, dashboard, and reports without a manual refresh.
5. Verify authorized bill-level profit preview and confirm it never appears on
   the customer document.
   Change quantities repeatedly and confirm the compact value does not flash.
   When only some items have purchase cost, verify it shows the covered/total
   count and warns that the final profit may vary.
6. Hold, resume, release, and manager-takeover a bill across counters.
7. Finalization returns to the next-bill workflow while Invoice History retains
   print, PDF, and share.
8. Receipt/PDF shows shop branding, items, totals, payment position, MRP savings,
   and readable layout; print preview must not be blank.
   Inspect the actual generated PDF page width: a selected 58 mm/80 mm print
   must be about 164.41/226.77 points. Ordinary Download PDF remains A4 at
   595.28 points. Checking only the print iframe's paper attribute or replacing
   the default PDF adapter in a unit test does not verify the rendered width.

## Products, stock, and purchases

1. Add/edit a product including image, MRP, selling price, last purchase cost,
   source/note, stock, category, and variant.
2. Generate/print internal EAN-13 labels and scan them through ordinary billing.
3. Create a supplier purchase in sale units and in box/pack units. Confirm the
   preview (`packs x units = base units`), persisted snapshots, stock increase,
   latest cost, supplier balance, dashboard, and purchase reports.
   Use cost-free search data: an authorized owner must get the previous purchase
   cost through the separate protected endpoint. Delay that response, select the
   same variant again, and verify one row/request with the intended quantity.
   After it loads, switch to Box and verify per-pack conversion; reselecting a
   manually edited row must preserve its price. Roles lacking either permission
   or margin policy must not request private costs and retain the editable fallback.
   Repeat with tax-inclusive and tax-exclusive prices. Verify line GST/HSN,
   supplier GSTIN/state/place-of-supply and subtotal/tax/grand total. A supplier
   without a state code must show an incomplete-jurisdiction warning.
4. Pay a supplier partly and fully; all summaries must refresh.
5. Confirm CASHIER receives 403 for supplier/purchase endpoints even with a
   manually entered URL.

### Expiry-aware receiving

1. With `EXPIRY_TRACKING` enabled for OWNER, receive one future batch and verify
   its batch number, manufacture date, expiry date and base-unit quantity on
   Dashboard, Inventory expiry alerts and Product Detail.
2. Receive a batch inside the selected warning window and verify it is labelled
   Near expiry. A batch expiring today is Expired and excluded from saleable
   billing stock; `+` must stop before aggregate expired units can be sold.
3. Enter a manufacture date after expiry and an expiry date of today or earlier;
   both must be blocked before the request. Near-expiry stock may proceed only
   with its warning visible.
4. Disable the feature or remove the role policy. The buttons must disappear,
   `/inventory/expiry-alerts` must redirect, and the API must deny direct access.
5. Repeat the alert list and purchase editor at 390px, 768px and desktop widths;
   batch facts and the primary action must remain readable without horizontal
   page overflow.
6. OWNER/MANAGER can write off part of an expired batch only with a valid whole
   quantity, meaningful reason and explicit confirmation. Retry the same request
   without removing stock twice; CASHIER/non-entitled users remain blocked.

### Purchase-bill import

1. Choose a clear JPG/PNG/WebP bill. Verify OCR is downloaded only after file
   selection, progress is visible, Cancel works, and the extracted draft retains
   all entered/reviewed values. Repeat on an Android camera capture.
2. Make OCR unavailable and use an unreadable image. The page must fall back to
   editable manual review without exposing a raw worker/network error.
3. Upload a text PDF and verify supplier, invoice, line, tax/HSN and total fields.
   Treat a scanned-PDF manual-review warning as supported v1 behaviour.
   A zero-line draft must remain recoverable: add missed items, remove spurious
   OCR lines, map them, and verify each row edit resets prior acknowledgements.
4. Map every line, edit quantity/price/tax/batch/expiry, choose tax-inclusive or
   tax-exclusive pricing and compare extracted versus calculated totals. A
   material mismatch requires acknowledgment. A 2-box × 20 conversion must add
   40 sale units. Verify no inventory, purchase, supplier balance or report
   changes before final acknowledgement.
5. Tick the review acknowledgement and Confirm once. Verify exactly one purchase,
   correct stock/batches, supplier balance, dashboard and reports. Retry/reload
   must not duplicate the purchase.
6. Before confirmation, edit a mapped line, refresh the browser and reopen the
   copied `?draftId=` URL. The same tenant/user session must restore the edit but
   reset review and mismatch acknowledgements. Simulate a lost confirmation
   response, refresh, then confirm the recovered `CONFIRMED` draft again. Verify
   the original purchase opens and no second purchase or stock mutation occurs.
   Another tenant or user must never receive that browser-session recovery data.
7. Disable `PURCHASE_BILL_IMPORT` or its role policy. The Purchases action and
   direct `/purchases/import-bill` route/API must be denied.

### GST & CA reports

1. For a known period, reconcile outward tax to finalized sales and inward tax
   to purchases. Verify CGST/SGST versus IGST components and estimated net
   liability; do not accept negative or stale totals after a payment/write.
2. Switch between legal firms. Confirm a firm is always explicit and no other
   tenant's or unselected firm's rows appear. For a one-firm DEMO tenant, the
   selected default firm must load without an explicit `firmId` or `MULTI_FIRM`;
   selecting an alternate/inactive historical firm must send its ID and enforce
   multi-firm access. The downloaded filename must still name the displayed firm.
3. Open Sales register, Purchase register and HSN summary. Verify outward HSN
   rows are split B2B/B2C and grouped by HSN + UQC + rate with separate
   CGST/SGST/IGST, while inward purchase/input-tax analysis appears in its own
   section and never changes outward Table 12 quantities. Download each CSV and
   verify authentication, headers, date range, row totals and UTF-8 content.
   On Android the native share sheet must receive a meaningful `.csv` file; on
   web/tablet it must download without navigating away from the report.
4. Confirm the disclaimer states these are CA-preparation estimates, not filing,
   e-invoice/IRN or e-way-bill submission.
5. Create, edit and barcode-create variants with UQC factors such as `5` KGS,
   `0.5` KGS and `500` GMS. Verify values round-trip and Table 12 uses the base
   quantity. Zero, negative, more than three decimals and values above 1,000,000
   must be blocked. Leaving it blank remains allowed but produces a visible
   review-needed warning; the app must not guess from `size` text.
6. Disable `GST_CA_REPORTS` or its role policy. The Reports action, direct
   `/reports/gst-ca` route and GST API calls must all be denied.

## Storefront and commercial controls

1. Owner/authorized staff can copy the canonical `/shop/<slug>` URL.
2. As OWNER, open Profile > Storefront settings. OFF is the safe default and the
   customer shop shows only Available/Out of stock. Enable, save and reload the
   shop to see exact counts. As MANAGER and CASHIER, the card must be absent and
   a direct server PATCH must remain forbidden.
3. Owner/authorized manager can create, schedule, publish, pause, and edit an
   offer with valid media; the public storefront shows only currently published
   offers for that tenant.
4. Incoming orders refresh, status transitions obey the server state machine,
   acceptance creates one draft invoice, and the customer status page updates.
5. Change plan, feature global state, and role policy in Admin; refresh session
   context and verify the POS changes without a UI deployment.
6. Enforce staff/firm/device limits and add-ons server-side.
7. Change public plan price, limits and entitlement list in Admin. Reopen Plan &
   account and verify the returned catalogue version and features—not hard-coded
   UI copy—are displayed. Existing paid access must remain pinned until an
   explicit subscription change.
8. Open every hidden page by its direct URL and call its API directly. Both must
   deny access when the granular entitlement or role policy is absent.

## Role-aware dashboard

1. OWNER: verify month/current comparison, payment mix, order funnel and shop-wide
   totals match source bills/payments.
2. With less than one comparable year of history, verify the seasonal card says
   history is building. With seeded comparable history, verify each suggested
   item links to the correct product and exposes its confidence label.
3. MANAGER: verify cashier bill count, sales and average bill are scoped to the
   selected period and tenant.
4. CASHIER: verify only their own counter figures appear; payables, receivables,
   other cashiers and owner analysis must be absent from markup and API response.

## Remaining operational areas

- Customer sorting/search, ledger bill links, and payment customer picker.
- Dashboard/report accuracy immediately after bill, collection, purchase, or
  supplier payment.
- Shift open, drawer movement, close, expected/counted cash, and history.
- CSV/Excel import validation, exports, backup preview, and disposable restore.
- Profile email immutability; name/phone update persists immediately.
- English/Hindi/Marathi/Gujarati, light/dark mode, loading/empty/error/retry, and
  browser back navigation on every route.

## Android release pass

After web is green, test OWNER/MANAGER/CASHIER on phone and tablet emulator plus
one real Android device: install/upgrade, secure session restore, hardware back,
camera/scanner permissions, print/share handoff, keyboard/rotation, offline error
recovery, and foreground/background resume. Offline billing synchronization is
not implemented and must not be claimed.

## Stop-release defects

Tenant leakage, role/feature bypass, duplicate financial write, incorrect stock
or ledger, stale accounting after a successful write, blank/incorrect document,
unrecoverable navigation, raw server error, broken deep link, or a regression at
any supported viewport stops the release.

## Online order cash-payment journey

Create an order in the customer storefront. In POS: Accept, Start preparing,
Mark ready, then confirm the only primary action is Open bill & collect payment.
Record full cash payment and verify navigation returns to Online Orders. Complete
must appear only after the refreshed invoice state is PAID. Confirm dashboard,
invoice, customer ledger, order list, and customer status agree without manually
refreshing the browser.

## Fresh Google demo provisioning

With a new approved Google identity, accept the legal terms and start the
private seven-day demo. Watch every displayed stage through VERIFIED and confirm
the app enters the new shop without a manual refresh. Retry one recoverable
failure and verify the same demo resumes without duplicate data. Simulate a
plain-text 429 and a malformed server response: both must show a localized,
actionable message, and neither may expose `Unexpected token` or raw response
text. Repeat at desktop, tablet, and mobile widths.
