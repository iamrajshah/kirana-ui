# Billing review — 26 November 2026

This batch is local and unmerged. Do not infer production delivery from this
report. Detailed receipts and screenshots are in the parent workspace's
`output/billing-live-review-20261126/BILLING-REVIEW.md`. Credentials, browser
storage and tokens are private artifacts and must never enter Git.

## Real journey checklist

Use an isolated QA tenant. Record initial stock, invoices and customer balance.
Test actual Ionic controls and real API responses, not only mocked component
results. Reconcile a known successful financial write before retrying a failed
test; a selector timeout is not proof that payment failed.

- Search name/SKU with arrows/Enter, Space browse and Escape. Run continuous HID
  scans, focused barcode Enter/Tab, duplicate quantity and quantity/rate Enter.
- Keep three draft workspaces, switch and reload; confirm the New bill action
  disappears at the limit and drafts retain edits.
- Cash checkout, khata, partial collection and remaining balance via Payments.
  Compare invoice totals, allocations, stock and customer ledger independently.
- Rapid double-click: one invoice and payment request, one stock deduction.
  Freeze quantity/discount/scanner input while checkout quote is pending.
- Split tenders: reject mismatched total, accept matching cash/UPI allocation.
- Cancel finalized unpaid invoice and reconcile stock restoration. Hold, claim,
  resume and pay the same invoice; hold alone must not reduce inventory.
- Bill with at least 31 products. Verify stock for every variant, all PDF pages
  and every SKU; check bounded row scrolling at 1440/820/390 pixels.
- Unknown barcode: cancel/reopen clears inputs, background scan is blocked,
  create with cost/MRP/stock once, repeat scan uses existing variant. Confirm
  modal title, close and footer are reachable in both themes at all widths.
- Independently render/extract the downloaded PDF. Check real rupee glyph,
  MRP savings, discount, GST split, total, paid/remaining and multipage content.
  Browser print is a separate control path from PDF download.
- After the server savings correction, new MRP120/rate100/GST5 bills must show
  total105/saving15. Simple receipt qty2/MRP120/rate90/discount10 shows total170/
  saving70. Older finalized snapshots retain their original calculation.

## Actual phone scope

Development-signed iOS build18 was installed on the connected iPhone17Pro.
Native test receipts cover login/Keychain relaunch, cash, khata and payment,
PDF/share, print open/cancel and camera permission/open/cancel. Real Google
sign-in restored Jayesh Trading afterward; no real-shop financial writes.

Tablet and narrow-web layout checks are browser viewport coverage. They do not
prove physical iPad or Android behavior. No printer or scan item was supplied;
physical paper output and actual barcode decoding remain manual checks.

## Defects caught and corrected locally

1. Missing barcode focus target / focused scanner Enter dispatch.
2. PDF Latin font subset lacked the rupee glyph; select the existing font subset
   that actually contains it. Keep a real fontkit glyph test.
3. Duplicate checkout HTTP requests despite backend idempotency; use synchronous
   admission as well as disabled UI state.
4. Unknown-barcode modal clipped outside Ionic viewport; bound and scroll content.
5. MRP saving excluded GST/discounts; server versioned snapshot correction is a
   separate unmerged branch. Do not calculate a different frontend value.

Why component tests missed these: mocked Ionic DOM, mocked financial responses
and PDF structure assertions cannot prove native focus, modal hit-testing,
actual font glyphs or request counts under rapid clicks. Preserve the real UI,
PDF and backend reconciliation checks above alongside unit regressions.
