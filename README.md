# Kirana UI

Ionic React point-of-sale app for neighborhood shops. It is the web and mobile
client for the sibling `kirana-server` API.

Maintainer: [Rajesh Shah (@iamrajshah)](https://github.com/iamrajshah)

## What is implemented

- Responsive owner, manager, and cashier navigation.
- Fast walk-in billing: product search is available immediately and a customer is
  optional for full Cash, UPI, Card, or Bank payment.
- Optional customer attachment for credit history, partial payment, and reminders.
- Touch-friendly cart editing with a sticky mobile payment bar and a persistent
  desktop/tablet bill summary.
- Barcode billing through camera, manual entry, or a counter scanner. Owners and
  managers can turn an unknown barcode into a reusable product without losing
  the current bill; cashiers receive a manager-required handoff.
- Cross-counter held bills with claim, resume, release, manager takeover,
  renewable leases, and conflict-safe recovery.
- An owner/manager Decision Inbox for customer dues, low stock, and held bills
  that need attention.
- Customers, invoices, payments, products, categories, inventory, suppliers,
  purchases, reports, imports, users, profile, and barcode flows.
- Owner/manager-generated EAN-13 labels for loose or store-packed product
  variants. Configurable, previewed labels print in paginated batches and scan
  through the ordinary billing flow.
- Owner-only, tenant-scoped JSON backup preview and transactional restore.
- Durable Simple Receipt or GST Tax Invoice snapshots with a sale completion
  sheet, historical receipt workspace, print, PDF, and device-share recovery.
- English, Hindi, Marathi, and Gujarati translation resources.
- Ionic/Capacitor foundations for web and Android/iOS packaging.

Offline billing queue, optional cashier shift cash, smart reorder, and WhatsApp
list-to-cart are planned product work. They are not production-ready features yet.

The demo UI is deployed manually to
[kirana-ui.netlify.app](https://kirana-ui.netlify.app). Automatic Netlify builds
are paused to conserve the demo allowance; merge does not mean the UI has been
published. See the handbook for the release checklist and current baseline.

Read [`HANDBOOK.md`](HANDBOOK.md) for the product reasoning, implemented
workflows, safety invariants, and working rules for humans and AI agents.

## Cashier flow

```text
Open Billing
  -> Walk-in is selected automatically
  -> search or scan product
  -> adjust quantity/price
  -> Cash or UPI for one-tap full payment
  -> Card / other for payment details
```

Attach a customer only when the shopper wants credit, a payment reminder, or a
customer-linked history. Walk-in bills must be paid in full.

## Store barcode labels

Open a product, choose the relevant selling variant, and select **Generate or
print barcode label**. Kirana generates one stable internal barcode for that
variant. The label may show the current price, but the barcode itself stores
only product identity; later price changes therefore do not require relabeling.

Create separate variants when loose stock is pre-packed into different selling
units such as 250 g, 500 g, and 1 kg. Scanning a printed label uses the same
product lookup as a manufacturer barcode.

## Clickable owner walkthrough

Open [`docs/demo/shopkeeper-workflow-sketch.html`](docs/demo/shopkeeper-workflow-sketch.html)
in a browser for a no-database demonstration of the owner-first navigation,
fast walk-in billing, stock, customer, and management flow. The final screen
separates implemented behavior from later phases that still need server or
provider contracts.

## Important paths

```text
src/App.tsx                         routes and authentication boundary
src/layouts/MainLayout.tsx          responsive app navigation
src/features/billing/               cashier workspace and calculations
src/core/api/                       RTK Query API contracts
src/core/i18n/locales/              en, hi, mr, and gu translations
src/core/types/                     shared UI domain types
src/components/                     reusable Ionic controls
```

Read the sibling `kirana-context/README.md` and `kirana-context/GLOSSARY.md`
before changing invoice, inventory, tenant, ledger, or barcode behaviour.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set the local API explicitly so the app does not fall back to a deployed server:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Never commit `.env`, tokens, or credentials.

## Verification

The normal UI verification path does not require MySQL. API calls are mocked in
component/unit tests, and pure billing rules have focused tests.

```bash
npm test
npm run lint
npm run build
```

For a user-visible billing change, also inspect `/billing` at mobile, tablet, and
desktop widths. A complete live checkout needs `kirana-server` and MySQL running.

## Mobile packaging

```bash
npm run build
npx cap sync
npx cap open android
# or: npx cap open ios
```

Web and Capacitor share the same responsive UI. Native release signing and store
submission remain separate deployment steps.

## Working agreement for humans and AI agents

- Branch from `dev`; keep one coherent product change per branch and PR.
- Inspect `git status --short` before editing and preserve unrelated work.
- If it is dirty, use the isolated worktree created by `kirana-start`; do not
  stash or mix the current work with a new issue.
- Put visible text in all four locale files instead of hardcoding it in a screen.
- Maintain at least 48px touch targets for cashier actions.
- Keep walk-in payment and customer-credit behavior aligned with the server API.
- Open PRs into `dev`; never merge without explicit user approval.
- Update “implemented” versus “planned” claims when product capability changes.

## License

Proprietary — all rights reserved.
