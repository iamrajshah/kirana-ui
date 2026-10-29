# Kirana UI Product and Engineering Handbook

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

### Current release snapshot — 27 October 2026

The `dev` branch at `f319a61` is the current commercial/demo baseline. It combines the
Modern Bazaar responsive shell, reliable navigation, fast billing, barcode
labels, tenant backup/restore, provable sale closure, Google entry, isolated demo
shops, plan-aware feature gates, renewal recovery and restricted access. The
public demo is served by Netlify and talks to the Railway API/MySQL environment.
Netlify automatic builds are intentionally paused to conserve the shared Free
allowance; publish the UI manually only after a reviewed release batch is ready.

### SaaS account and subscription journey

- Google sign-in identifies a prospect or licensed shop user through the server;
  it does not make the browser authoritative for tenant or subscription access.
- Demo users receive an isolated, retry-safe trial shop instead of sharing one
  mutable public tenant.
- The server returns commercial access and feature decisions. The UI explains
  unavailable features but cannot grant access by hiding or showing controls.
- Expired or restricted tenants enter a recovery mode that keeps account and
  export actions reachable while business mutations remain blocked.
- Renewal submission and status live in the shop-facing POS. Approval, plan
  changes and platform operations live in the separate private `kirana-admin`
  application.
- Platform Admin authentication is never stored or handled by this POS.

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
- Packed and expiry values are currently label metadata, not inventory batches.
  True expiry tracking remains future stock-ledger work.

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
- Platform operations live in the separate `kirana-admin` repository. Legacy
  platform routes in this repository must not become a second admin console, and
  Platform Admin credentials never grant access to shop screens.
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

- **UI:** [kirana-ui.netlify.app](https://kirana-ui.netlify.app), built from
  `dev` with `npm run build` and `dist` as the publish directory.
- **API:** Railway, with the browser base URL ending in `/api/v1`.
- **Database:** Railway MySQL, migrated by the server release process.
- **Platform Admin:** separate private `kirana-admin` application; it uses the
  same Railway API through a same-origin proxy and is not bundled into this POS.
- **Release policy:** Netlify automatic builds remain stopped. Verify locally
  against the Railway API, combine UI changes into a release batch, then trigger
  one manual production deploy. Server changes deploy through Railway only after
  their PR is approved and merged.

Netlify credits are shared by every project in the account. When the account is
on operational-only credits, existing sites remain live but neither Git-based nor
manual production deploys can publish a release. Wait for the billing reset or
upgrade; do not repeatedly retry builds.

The fallback production API URL in source is a convenience for this demo, not a
recommended production configuration. A production release should inject
`VITE_API_BASE_URL`, use monitored paid infrastructure, and define rollback,
backup retention, secrets rotation, and availability targets.

## Deliberately later

Offline billing requires an explicit outbox, conflict, stock, and payment
reconciliation design and should not be represented as ready. Smart reorder
suggestions and WhatsApp paste-to-bill are valuable follow-on features. Automated
WhatsApp delivery or ingestion additionally needs provider, consent, privacy,
and cost decisions. Batch-aware stock and expiry
management is also pending; label dates alone do not change inventory truth.
