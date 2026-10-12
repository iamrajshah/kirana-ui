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

### Fast billing

- A walk-in cash or UPI sale does not require customer creation.
- Product search and barcode scanning lead into the same cart.
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

## Billing safety rules

- Never offer anonymous credit. Walk-in invoices must be paid in full.
- Never discard the cart because a network request failed.
- Do not finalize, update, cancel, or release a claimed held bill without the
  expected server version.
- Renew an actively edited held bill only while the page is visible.
- A takeover is an exceptional owner/manager action and must remain explicit.
- Keep idempotency keys on invoice and payment creation paths.

## Developer and AI-agent workflow

1. Read this handbook plus `kirana-context/README.md` and `GLOSSARY.md` before
   changing billing, tenant, ledger, inventory, or barcode behaviour.
2. Start from `dev` and use one coherent feature branch.
3. Inspect `git status --short`; preserve unrelated work.
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

## Free demo deployment

Cloudflare Pages is the preferred free demo host for this Vite UI. Connect the
GitHub repository, build with `npm run build`, publish `dist`, and set
`VITE_API_BASE_URL` to the public API URL ending in `/api/v1`. Use the generated
`*.pages.dev` address until a custom domain is worth configuring.

Free-tier terms change, so verify the current
[Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
before relying on it for production. The sibling server handbook records the API
and database recommendation.

## Deliberately later

Offline billing requires an explicit reconciliation design and should not be
represented as ready. Smart reorder suggestions and WhatsApp list-to-cart are
valuable follow-on features. Shift opening/closing may remain optional because
many target shops have the same owner operating the counter.
