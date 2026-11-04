# Kirana UI Product and Engineering Handbook

## Online customer orders

The Business-plan `Online orders` screen is the POS action queue for public storefront requests. `PLACED` means no sale exists yet. Accepting creates one draft invoice, after which the shop can move the request through Preparing, Ready and Completed, or cancel it. Product create/edit owns the public catalogue image URL and preview; barcode enrichment remains a suggestion and the shop is responsible for the final image.

The same screen has an `Offers` tab for OWNER and MANAGER users. They can
create an offer, associate it with a product, publish or pause it, and remove it.
Offer management is part of the Business-plan `CUSTOMER_STOREFRONT` feature;
the server remains authoritative for role and plan access.

Maintainer: [Rajesh Shah (@iamrajshah)](https://github.com/iamrajshah)

This handbook explains what the Kirana POS interface is designed to do, why the
main product decisions were made, and the rules humans and AI agents must keep
when changing it. The sibling `kirana-server` repository owns the API and data
contracts.

## Product intent

Kirana is built for neighbourhood shops where the owner is often the cashier,
stock keeper, and decision maker. The default experience must therefore help one
person sell quickly and notice the next important shop action. Manager-only
configuration should remain secondary and must not slow down ordinary billing.

The interface is designed for both mobile and desktop. Controls must work with a
finger at a busy counter, labels should use shopkeeper language, and the same
workflow should remain understandable in English, Hindi, Marathi, and Gujarati.

## What we have developed

### Release candidate — 4 November 2026

This candidate makes trial, plan and feature behaviour runtime-controlled rather
than tied to a UI deployment:

- a private Google demo receives its own tenant, owner, one legal firm and
  tenant-scoped fixture data;
- the Demo plan includes the online storefront/order workflow, while multi-firm
  access remains excluded;
- the plan page renders the current public catalogue version, prices, limits and
  entitlement list returned by the server;
- navigation, direct routes and server APIs use granular feature codes, and the
  POS refreshes role/feature policy while it is open;
- a visible seven-day countdown turns critical during the final five hours;
- the private profit hint is compact, remains stable while quantities change and
  labels partial estimates when one or more purchase costs are missing;
- OWNER sees monthly trend, payment mix, online-order flow and honest seasonal
  stock guidance; MANAGER sees cashier workload/sales; CASHIER sees only their
  own counter summary;
- the demo catalogue uses deterministic product-specific artwork rather than a
  shared category placeholder.

All trial tenants may share one physical MySQL service, but every operational
row is scoped by `tenant_id` and authenticated membership. Parallel demos do
not share firms, products, bills, customers, carts or orders. Expired demo
operational data becomes cleanup-eligible 24 hours after expiry; identity,
lead, consent and audit evidence remain for support and compliance. Cleanup is
an explicit, reauthenticated Platform Admin action because it is destructive.

### Current release snapshot — 30 October 2026

Runtime revision `7dc81aa` is the deployed 30 October demo baseline. Cloudflare
deployment `3fa90cc0-bee5-4556-83f8-8086f6c39419` combines the Modern Bazaar
responsive shell, reliable navigation, fast billing, barcode labels, tenant
backup/restore, provable sale closure, Android 14+ share compatibility,
secure-session restart recovery, and invited-owner Google sign-in. Web/package/
Android version metadata is aligned at `1.0.1`. The public demo is served by
Cloudflare Pages and talks to the Railway API/MySQL environment. The stable
site's release manifest must match the intended runtime revision before a
release is declared live; a later docs-only merge does not require another app
deployment.

Google entry supports two safe paths: an active owner whose Google email is
already linked (or invited by Platform Admin) opens that membership; a genuinely
new Google identity may create one private seven-day demo. The first verified
invitation claim links the Google subject to the existing owner without removing
password login or creating another tenant, user, or membership. Public password
and Google failures do not trigger protected-token refresh or global logout
behaviour.

### Platform-managed shop onboarding

- `/platform/login` is a separate operator entry point, not a fourth shop role.
- Platform Admin can create a shop and its first OWNER, monitor setup milestones,
  inspect labelled shop/staff details, reset an owner's temporary password, and
  suspend or reactivate access without entering invoices, khata, or stock.
- Platform and POS tokens use different storage keys and are not interchangeable.
- A new owner receives a temporary password and is sent to Change Password before
  other protected screens become available.
- A reset displays the temporary credential once to Platform Admin. The original
  password is never visible or recoverable, and the owner must replace the reset
  password after signing in. Share it outside ordinary logs and source control.
- The profile permits name and phone changes but displays login email as read-only.
- The owner profile contains Storefront settings. Exact customer-facing stock is
  OFF by default; OWNER may enable it, while MANAGER and CASHIER cannot see or
  mutate the control. The server remains authoritative for permission and tenant
  scope.
- Setup progress is derived from password change, products, staff, and first sale;
  it is not a manually maintained checklist.

### Fast billing

- A walk-in cash or UPI sale does not require customer creation.
- Product search and barcode scanning lead into the same cart.
- When a barcode is unknown, an owner or manager can save a minimal product with
  its selling price and opening stock, then add it to the current bill. Cashiers
  are told to involve a manager, and their existing cart remains untouched.
- A customer is attached only when credit, history, a named invoice, or a payment
  reminder is required.
- The mobile payment actions remain reachable near the bottom of the screen;
  desktop keeps a visible bill summary.
- Payment recovery avoids silently losing a bill when the payment step fails.

### Held-bill relay

- A cashier can hold a draft bill with a human-readable counter/device name.
- The held-bill panel shows the amount, item count, age, counter, holder, and
  whether the bill is available, in use, or expired.
- A bill can be claimed and resumed at another counter.
- A short renewable server lease prevents two counters from editing the same bill
  as if both owned it.
- Owners and managers may take over a bill held by another user.
- Version conflicts preserve the local cart and ask the operator to reload rather
  than overwriting somebody else's work.

### Owner Decision Inbox

Owners and managers see three small action groups before the normal dashboard
totals:

1. customer money to collect;
2. products at or below their reorder level;
3. held bills that are unclaimed or need attention.

Each group shows at most three records and links to the screen where the action
can be completed. If one group fails, the other groups and the dashboard totals
remain usable. Cashiers continue to see their normal operational dashboard.

### Role-aware business pulse

- OWNER receives business-wide month comparison, payment mix and online-order
  flow. Seasonal reorder suggestions appear only when comparable history exists;
  otherwise the UI says that history is still building.
- MANAGER receives cashier bill count, sales, average basket and the current
  held/online queue.
- CASHIER receives only their own bill count, sales and held bills. Supplier
  payables, customer receivables and staff performance are not rendered.
- These panels are API summaries, not browser-side accounting. Database indexes
  support the bounded dashboard queries.

### Runtime feature and plan controls

- A plan version describes the feature ceiling, price and capacity shown to a
  buyer. Existing paid subscriptions stay pinned to their contracted immutable
  version until an explicit plan change.
- Platform Admin feature-role policy independently decides which OWNER, MANAGER
  or CASHIER roles may use each enabled feature. An empty role list disables it
  for shop users.
- The effective rule is the intersection of subscription entitlement and role
  policy. The UI hides navigation and protects direct routes; the server repeats
  the decision for every classified API route.
- Public plan catalogue responses are refreshed without a release. Open POS
  sessions also refresh feature-role access in the background.

### Store barcode labels

- Owners and managers can generate one stable EAN-13 barcode for an existing
  product variant; repeated generation returns the same code.
- The same code works through the ordinary billing scanner. Price is display
  content, not encoded identity, so a price change does not require a new code.
- Labels can be printed in large batches across multiple pages. Print layout is
  paginated rather than silently capping a requested quantity.
- Shop name, product and variant, price, packed date, expiry date, batch/lot,
  MRP, and free text are configurable. The on-screen preview uses the same
  choices as printing so the operator can catch clipping before wasting labels.
- A label's optional dates remain print metadata. Purchase receipt dates are a
  separate inventory truth: a received batch records its lot, manufacture date,
  expiry date and remaining quantity so warnings never depend on a printed label.

### Expiry-aware inventory

- OWNER and MANAGER can record optional batch, manufacture and expiry facts for
  each purchase line when `EXPIRY_TRACKING` is enabled for their role and plan.
- An already-expired purchase line is rejected before submission. A manufacture
  date after its expiry date is invalid, while near-expiry stock is allowed with
  a clear warning so the operator can make an informed receiving decision.
- Dashboard, Inventory and Product Detail consume the server's tenant-scoped
  batch projection. Expired and near-expiry are kept distinct; affected units
  and cost value are shown when authoritative cost is available.
- `/inventory/expiry-alerts` is a protected direct route. Hiding the button is
  not authorization: feature, role and inventory permission must all pass.
- Expiry Tracking is usable only while the plan also exposes Inventory and
  Products; Platform Admin cannot create a visible-but-broken add-on by removing
  either dependency.
- The expiry date is the first non-saleable day. Stock expiring today is treated
  as expired, excluded from saleable billing quantity, and cannot be received as
  new stock. OWNER/MANAGER may remove expired or damaged batch stock only after
  entering quantity, a mandatory reason and explicit confirmation; the request
  is idempotent and refreshes both inventory and alerts.

### Purchase bill import

- `PURCHASE_BILL_IMPORT` adds camera, image and PDF entry from Purchases. The
  uploaded bill becomes a draft review; extraction never changes stock or
  supplier accounting.
- Its effective dependency set is Purchases, Suppliers, Products and Billing.
  Missing any dependency hides the action and denies its direct route/API.
- Clear JPG/PNG/WebP photos are read locally in a lazily loaded OCR worker. The
  worker, OCR core and English model are self-hosted with the UI release, so a
  phone scan does not consume Railway CPU or send the image to another provider.
  OCR is bounded, reports progress, can be cancelled and falls back to manual
  review when text confidence is insufficient or the browser cannot run it.
- Only the three Tesseract LSTM browser core variants are packaged (about 12 MB
  before transfer), plus the worker and compressed English model (about 3 MB).
  They are fetched only after an image is selected and never enter the initial
  POS JavaScript chunk.
- Text PDFs are extracted by the API. A scanned PDF can require manual review in
  the first release; taking a photo remains the supported phone-scan path.
- Supplier, firm, invoice facts, item mapping, quantity, price, tax, HSN and
  batch dates remain editable. Reviewers can add missed lines and remove spurious
  OCR lines, including recovering a zero-line draft. The user must tick the
  final-review acknowledgement and explicitly Confirm before the server creates
  the purchase and mutates stock.
- Review compares supplier-extracted subtotal/tax/total with the exact
  server-compatible per-line calculation. The user chooses whether prices include
  tax, acknowledges material total differences, inherits the supplier's default
  purchase firm, and may convert packs to sale units. Batch fields still require
  the separate `EXPIRY_TRACKING` entitlement.
- Manual supplier maintenance captures GSTIN, state and the matching two-digit
  state code. Direct purchases also make tax-inclusive/exclusive treatment,
  line GST/HSN and supplier-derived place of supply visible before confirmation.
  Missing supplier jurisdiction stays visibly incomplete; the UI never invents
  CGST/SGST/IGST classification.
- An unfinished review is kept only in the current browser tab's session storage,
  scoped by tenant and signed-in user, while its draft ID is retained in the URL.
  Refreshing or navigating back restores reviewed edits from that session and
  verifies the draft with the API. Review and mismatch acknowledgements are
  deliberately reset. If a confirmation response is lost, the restored draft can
  be confirmed again through the server's idempotent endpoint without creating a
  second purchase. Recovery is cleared automatically only after confirmed success
  (or when the user explicitly discards it).

### GST preparation for the CA

- `GST_CA_REPORTS` adds a protected GST & CA workspace with OWNER as the default
  role policy; Platform Admin may widen its runtime role policy without a deploy.
  It prepares one selected legal firm at a time and shows outward tax,
  inward tax credit, estimated net liability, sales register and purchase register.
  Its HSN workspace prepares outward Table 12 rows split into B2B/B2C and grouped
  by HSN, UQC and GST rate, with CGST/SGST/IGST shown separately. Inward HSN/input
  tax analysis is displayed in a separate section and never mixed into outward
  quantities.
- It also requires Essential Reports and Billing. Runtime plan customization
  therefore cannot expose a GST workspace without the records it depends on.
- A selected default firm is sent implicitly, allowing a one-firm demo/shop to
  prepare GST records without buying `MULTI_FIRM`. Choosing an alternate or
  inactive historical firm sends its explicit ID and remains subject to the
  multi-firm access policy. The displayed firm identity still names every CSV.
- Sales, purchase and outward HSN/Table 12 registers download as authenticated CSV files for
  review with the shop's accountant. Browser/tablet builds download the CSV;
  Android writes it to an app-cache file, opens the native share sheet, then
  removes the temporary file. These are preparation aids, not GST filing, legal
  certification, e-invoice generation or an e-way-bill integration.
- Product variants optionally store `uqc_quantity_factor`, the GST base quantity
  represented by one sale unit (for example a 5 kg KGS pack is `5`, while a
  500 g KGS pack is `0.5`). Create, edit and barcode-product flows capture the
  value explicitly and never derive it from free-text size. Missing factors remain
  visible CA-review warnings instead of guessed Table 12 quantities.

### Tenant backup and restore

- An OWNER can download a versioned JSON backup of the current tenant's business
  records and preview a backup before restoring it.
- Restore requires the current shop name plus an explicit replacement
  acknowledgement. The server validates ownership, format, checksum, references,
  and record limits before one transactional replacement.
- Staff accounts, passwords, roles, permissions, audit history, and import files
  are deliberately excluded. The file contains customer and supplier data and
  must be stored securely.

### Provable sale closure

- A successfully finalized sale opens a completion sheet without clearing the
  evidence the cashier needs for customer handoff.
- The same frozen sale document is available later from invoice history.
- Simple Receipt and GST Tax Invoice are tenant-configurable; the server rollout
  capability still controls whether GST documents may be activated.
- Print, PDF, and device share are recoverable output actions. A failed print or
  cancelled share does not create, repeat, or reverse the sale.
- Historical facts remain frozen while the payment summary can show later credit
  collections and the current remaining balance.

## Why it works this way

- **Owner and cashier are often the same person.** Selling remains the strongest
  action; the dashboard adds decisions without creating an administrative maze.
- **Walk-in is the common case.** Customer creation is optional, not a billing
  gate.
- **Held bills are shared work.** Ownership, versioning, and leases are enforced
  by the server rather than trusted to browser state.
- **Exceptions are more useful than raw charts.** The dashboard tells the owner
  what can be acted on now while retaining the existing totals.
- **Partial failure is normal.** A low-stock query failure must not hide customer
  dues or block billing.

## Navigation and role rules

- OWNER and MANAGER may see the Decision Inbox and management destinations.
- CASHIER gets billing-focused navigation and cannot receive access merely because
  a menu item was accidentally rendered.
- Route protection is authoritative; hiding a button is only presentation.
- Platform routes stay outside the tenant application shell, and Platform Admin
  credentials never grant access to shop screens.
- Mobile keeps the small set of primary destinations. Less frequent setup belongs
  under More/Settings.
- Dashboard deep links must take the operator to the relevant customer, product,
  or held bill instead of a generic list whenever an identifier is available.

## Translation and interaction rules

- Never add user-visible text directly in a component. Add the same key to `en`,
  `hi`, `mr`, and `gu` locale files.
- Keep locale key structures identical; run the localization coverage test.
- Prefer terms a shopkeeper uses: bill, khata, stock, cash, UPI, hold, and collect.
- Primary touch targets must be at least 48px where practical.
- Every modal and drawer needs a clear close action, keyboard focus handling, and
  useful loading, empty, error, and retry states.
- Responsive behavior must be checked at mobile, tablet, and desktop widths.
- Receipt template, colour, and HTTPS logo settings apply to new finalized bills;
  historical bills render their frozen branding snapshot.
- Cash shifts remain optional. Cashiers can open, adjust, and close only their
  own drawer; owners and managers can see recent staff shifts.
- WhatsApp receipt/reminder sharing is a user-initiated `wa.me` handoff. It does
  not send automatically and must not claim that a PDF attachment was delivered.

## Billing safety rules

- Never offer anonymous credit. Walk-in invoices must be paid in full.
- Never discard the cart because a network request failed.
- Do not finalize, update, cancel, or release a claimed held bill without the
  expected server version.
- Renew an actively edited held bill only while the page is visible.
- A takeover is an exceptional owner/manager action and must remain explicit.
- Keep idempotency keys on invoice and payment creation paths.
- Unknown-barcode creation must remain tenant-scoped and permission-protected;
  never let a cashier bypass the server's product-creation permission.
- Whole-bill margin preview is read-only decision support. Render it only when
  the server resolves `LIVE_MARGIN_PREVIEW` for the signed-in role, and never
  print or share it on a customer document.
- Authorized owners manage the current per-unit purchase cost from Product
  Details. Use opening cost for existing stock and manual correction only with
  a reason; ordinary purchases refresh the cost automatically.
- Product lists and cashier-readable product responses must never expose cost
  snapshots. Load them from the separately authorized product-cost endpoint,
  and keep historical purchase invoices and completed bills unchanged.
- Feature-role access comes from the active plan version. UI visibility must
  follow server access; it must never become an independent authorization rule.

## Purchase and customer-list rules

- Purchase entry may describe packs/boxes and units per pack, but submitted and
  displayed inventory effects must use the server-computed base-unit quantity.
- Make the conversion visible before save (for example, `2 boxes × 20 = 40
pouches`) so a shopkeeper can catch an entry mistake.
- Customer sorting is server-backed and stable across pages. Do not sort only
  the currently loaded rows and present that as the complete result.

## List and preload performance rules

- Product, customer, and inventory management screens read 50 rows at a time,
  keep already-loaded rows available for immediate filtering, then use a 300 ms
  server search to find matches outside the loaded window.
- Offset-paginated API results require a deterministic unique ordering. A later
  page failure must keep loaded rows visible and offer Retry; it must not pretend
  the first page is the complete list.
- Infinite-scroll loading indicators complete only after the requested page
  succeeds or fails. Do not replace request settlement with a fixed timer; slow
  mobile networks must continue to show honest progress.
- Fast Billing deliberately keeps the compact active product catalogue in local
  memory for instant name, SKU, and barcode lookup. Do not replace it with one
  request per keystroke.
- Customer selectors search lazily after two characters. Do not warm or download
  the complete customer table at login.
- Background catalogue and route warm-up is skipped for Save Data, 2G, and
  slow-2G connections. Catalogue warm-up is also disabled when the user cannot
  access Billing.
- `npm run build` enforces gzip budgets for entry JavaScript, entry CSS, the
  complete initial payload, and the largest lazy JavaScript chunk. A budget
  failure requires investigation rather than raising the ceiling by default.

## Developer and AI-agent workflow

1. Read this handbook plus `kirana-context/README.md` and `GLOSSARY.md` before
   changing billing, tenant, ledger, inventory, or barcode behaviour.
2. Start from `dev` and use one coherent feature branch.
3. Inspect `git status --short`. If the checkout is dirty, leave it untouched and
   use the isolated worktree printed by `kirana-start`; never mix two issues.
4. Add or strengthen focused tests before behaviour changes where practical.
5. Keep API types aligned with `kirana-server`.
6. Run focused tests during development, then the full relevant tests, lint, and
   production build.
7. Use Compound Engineering for simplification, review, and PR delivery.
8. Open the PR into `dev`; merge only after explicit approval.
9. Update this handbook and README whenever an implemented/planned claim changes.

## Local verification

```bash
npm test
npm run lint
npm run build
```

Normal UI tests mock the API and do not require MySQL. A live end-to-end run needs
the server, a migrated MySQL database, and `VITE_API_BASE_URL` pointing to the
server's `/api/v1` base URL.

## Demo deployment

- **UI:** [kirana-pos.pages.dev](https://kirana-pos.pages.dev) on Cloudflare
  Pages, built from `dev` with `npm run build` and `dist` as the publish
  directory.
- **API:** Railway, with the browser base URL ending in `/api/v1`.
- **Database:** Railway MySQL, migrated by the server release process.
- **Release policy:** verify locally against the Railway API, combine UI changes
  into a reviewed release batch, publish the intended `dev` revision, and verify
  the stable site's release manifest. Server changes deploy through Railway only
  after their PR is approved and merged.

The fallback production API URL in source is a convenience for this demo, not a
recommended production configuration. A production release should inject
`VITE_API_BASE_URL`, use monitored paid infrastructure, and define rollback,
backup retention, secrets rotation, and availability targets.

## Deliberately later

Offline billing requires an explicit outbox, conflict, stock, and payment
reconciliation design and should not be represented as ready. Smart reorder
suggestions and WhatsApp paste-to-bill are valuable follow-on features. Automated
WhatsApp delivery or ingestion additionally needs provider, consent, privacy,
and cost decisions. GST filing, e-invoice/IRN and e-way-bill submission remain
outside the current CA-preparation reports.

## Current release qualification

On 3 November 2026, the deployed POS baseline passed 95 files / 435 tests, lint,
production build, Google readiness, production-bundle verification, the
authenticated production API journey, and desktop/tablet/mobile browser routes.
The public storefront link, offer/order management, product cost and private
margin preview, purchase unit conversion, role-configurable feature access,
device limit, refreshed dashboard/report consumers, and document workflows are
part of the maintained regression surface.

Use [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) for defect diagnosis and
[`docs/QA_REGRESSION_SUITE.md`](docs/QA_REGRESSION_SUITE.md) for the executable
release checklist and [`docs/QA_Guide.md`](docs/QA_Guide.md) for the long-form
manual guide.

## Online-order payment handoff — 3 November 2026

A ready online order is not complete until its linked invoice is fully paid.
The Online Orders screen opens that bill directly, Invoice Detail finalizes a
draft and records payment, then returns to Online Orders. Only a server-confirmed
`PAID` invoice exposes Complete. The list polls while visible and refetches on
focus/reconnect so payment state is not held behind a browser refresh.

## Private-demo provisioning resilience — 3 November 2026

Fresh Google onboarding advances through several resumable fixture stages. The
client deliberately spaces resume calls, displays a localized retry message for
429 responses, and treats non-JSON failure bodies as an API failure rather than
showing the browser's JSON parser text. Retry must preserve the provisioning
token and resume the same tenant; it must never start a duplicate shop.
