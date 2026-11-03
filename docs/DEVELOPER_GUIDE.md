# Kirana POS Developer Guide

The POS is the OWNER/MANAGER/CASHIER Ionic client. Platform operations belong in
`kirana-admin`; customer shopping belongs in `kirana-ui-customer`; all business
rules and tenant authorization remain in `kirana-server`.

## Before changing a flow

Read [`../HANDBOOK.md`](../HANDBOOK.md), the sibling `kirana-context` maps, and
the API contract. Confirm the deployed API and UI release revisions. A correct
UI against an older server is still a failed release.

## State and request path

Routes render under the role-aware application shell. RTK Query calls
`VITE_API_BASE_URL`, attaches the access token, and refreshes through
`POST /auth/refresh-token`. Authentication state is persisted under
`access_token`, `refresh_token`, `user`, and `session_context`; device admission
uses `kirana_installation_id`.

After a successful mutation, invalidate/refetch every authoritative consumer:
dashboard, relevant list/detail, report, ledger, stock, and subscription/session
context where applicable. Do not retain a local calculation when the server is
the accounting authority.

## Defect triage by symptom

| Symptom                         | Inspect first                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Route returns to login          | token pair, device descriptor, session restore, API base URL                          |
| First navigation flickers       | lazy boundary and shell/session hydration                                             |
| Page stays stale after write    | RTK Query tags and post-mutation navigation timing                                    |
| Button works only after refresh | disabled/busy state not reset in `finally`, stale overlay, or history replacement     |
| Wrong role sees action          | route guard plus server entitlement; menu visibility is secondary                     |
| Payment/khata mismatch          | selected customer, invoice allocation response, ledger refetch                        |
| Quantity fails at payment       | catalogue stock metadata and local increment guard                                    |
| Purchase stock wrong            | pack conversion preview and server base-unit response                                 |
| Expiry count wrong              | tenant-scoped received batches, expiry window and remaining batch quantity            |
| Import created stock early      | extraction/review must remain draft-only; inspect the explicit confirm mutation       |
| Bill photo is slow              | confirm OCR is lazy, bounded and using self-hosted `/ocr` assets, not the API process |
| GST report mismatch             | selected firm, local-date boundaries and frozen invoice/purchase tax facts            |
| Bill print/PDF blank            | frozen document endpoint, popup lifecycle, print CSS, asset readiness                 |
| Storefront share link wrong     | session tenant `storefrontSlug`, HTTPS origin, feature access                         |
| Storefront leaks quantity       | `storefront_show_stock_quantity`, OWNER role, public catalog response                 |
| Google sign-in missing          | public product readiness and build-time client ID, not a hard-coded button            |

Never show raw API/Prisma errors. Convert known failures into translated,
actionable messages and retain the user's entered data.

## UI invariants

- Customer is optional for a fully paid walk-in bill but required for credit or
  partial payment.
- Stock is blocked at quantity entry and remains revalidated by the server.
- Bill profit is private, read-only, and visible only when the effective
  `LIVE_MARGIN_PREVIEW` role policy allows it.
- Purchase box/pack entry always previews base sale units and the server remains
  authoritative.
- Expiry facts belong to purchase batches. Barcode-label dates are never used to
  infer remaining stock or expiry risk.
- Purchase-bill extraction is non-mutating. Only the acknowledged confirm call
  may create a purchase or increase inventory, and retries must remain idempotent.
- Purchase-import recovery uses a tenant/user-scoped `sessionStorage` record plus
  the `draftId` query parameter. Hydrate through `getPurchaseImportDraft`, retain
  safe reviewed edits, reset all acknowledgements, and retry the same confirm
  endpoint after an uncertain response. Never clear recovery on a network error
  or key it globally across tenants.
- Browser image OCR is lazy and local. Keep `tesseract.js`, worker/core and
  language data out of the initial POS chunk; do not replace it with paid OCR or
  Railway CPU work without an explicit architecture decision.
- `prepare-ocr-assets` owns `public/ocr` and must deterministically leave only
  the three LSTM `*.wasm.js` variants, worker and English model. Scanned PDFs are
  manual-review v1; JPG/PNG/WebP is the supported local OCR path.
- GST CSV output uses a browser download on web/tablet and the Filesystem cache +
  native Share adapter on Android. Do not reintroduce anchor-only mobile output.
- GST & CA output is preparation evidence only. Never label it as a filed return,
  e-invoice, IRN, e-way bill, or legal/tax certification.
- Supplier tax identity uses `gstin`, `state` and `state_code`; GSTIN must start
  with the state code. Both direct and imported purchases send explicit tax
  treatment, line GST/HSN and supplier-derived place of supply. Keep the
  UI/server per-line paise rounding identical.
- GST Table 12 quantities use the optional variant `uqc_quantity_factor`; preserve
  it as a number or null in normal create/PATCH payloads and as
  `uqcQuantityFactor` in the legacy nested barcode-create payload. Accept only
  values greater than zero, no more than 1,000,000 and with at most three decimal
  places. Never infer it from the variant's free-text size.
- Storefront offers/order management and share link require effective
  `CUSTOMER_STOREFRONT` access.
- Exact storefront stock is an owner-only preference and defaults to hidden;
  server redaction is authoritative even if UI controls are bypassed.
- Email is immutable in Profile; name and phone may change.
- Every user-facing string exists in English, Hindi, Marathi, and Gujarati.
- Web, 390px mobile, and 768px tablet must remain usable in light and dark mode.

## Verification

```bash
npm test
npm run lint
npm run build
npm run verify:google-build-config
npm run release:google:check
npm run verify:production-bundle
```

Run the journeys in [`QA_REGRESSION_SUITE.md`](QA_REGRESSION_SUITE.md) against
the exact API revision. Use [`QA_Guide.md`](QA_Guide.md) for the longer manual
test catalogue.
For Android, also run Capacitor sync/build and real-device checks for back button,
camera/barcode, share, secure token restoration, and poor-network recovery.

For purchase-bill scanning, also verify that `npm run prepare:ocr-assets` places
the worker, WASM/JS core variants and `eng.traineddata.gz` under `public/ocr`, and
that the production bundle loads the OCR JavaScript only after an image is chosen.

## Release

Cloudflare Pages hosts `kirana-pos.pages.dev`. A release is complete only when
`/release.json` identifies the tested commit and protected deep links load
directly. Do not publish automatically for every documentation commit; batch a
tested product release.

## Online order/payment contract

`StorefrontOrder` carries `invoice_id`, `invoice_status`, and `paid_amount` from
the API. Never infer payment from the order status. Route unpaid ready orders to
`/invoices/:id` with `returnTo=/storefront-orders`; after successful collection,
return and let the refreshed API projection decide whether Complete is allowed.
The server still enforces this invariant if the UI is bypassed.

## Demo provisioning error contract

`DemoProvisioningPanel` must tolerate JSON and non-JSON error bodies. Never call
`response.json()` without a safe fallback or surface parser text such as
`Unexpected token` to the user. A 429 maps to `auth.demoRateLimited`; other
transport/protocol failures map to `auth.demoRequestFailed`. Keep translations
complete in English, Hindi, Marathi, and Gujarati. The resume loop is sequential
and paced so it cannot burst every fixture stage at once.
