# Counter improvements: release evidence, 20 November 2026

## Scope and order

This candidate adds continuous USB/Bluetooth keyboard (HID) scanning, compact
large-bill rows, six invoice templates with live sample/PDF previews, and barcode
label presets with optional net quantity, batch and HTTPS product/shop QR links.
No new service or recurring infrastructure cost is introduced.

Review and merge UI PRs 93, 94, 95, then the barcode-label PR. Server PR 118
extends the persisted receipt-template enum. Apply its additive migration before
releasing UI choices that save LOGO_LEFT, BRAND_CENTRE or DETAILED. No production
migration, merge or deployment was performed during this implementation.

## Automated evidence

- Combined UI source at 8f23943: 119 files / 590 tests passed; lint, TypeScript
  and production build passed, including the configured API readiness probe.
- Server source at 382805a: 160 suites / 1,026 tests passed; build and the
  existing lint-baseline gate passed without adding findings.
- Real Chrome counter fixture: 33/33 checks, including 120 bill rows at
  360/390/820/1440px, four languages, both themes, and 100 keyboard barcode bursts.
- Real Chrome receipt fixture: 18/18 combinations, six templates × 58/80mm/A4,
  with logo loading and 30 sample lines. The final 58mm PDF was rasterized and
  visually inspected after changing it to product-first rows.
- Label fixture: 25/25 checks, exercising the actual Ionic modal,
  standard/extended/QR/all-fields packed+QR sizes across three widths and both
  themes, plus a 50-copy PDF with five pages and 50 QR/EAN labels. The focused
  label suite also passed 22 tests after the final CSS spacing correction.

Browser evidence is stored outside the repo under
`output/kirana-counter-20261120/`, with report JSON, screenshots and generated
PDFs. Reproduce it using the three `scripts/verify-*-browser.mjs` runners and
the synthetic `tests/browser/` entry points. Configure PLAYWRIGHT_RUNTIME_ROOT,
CHROME_PATH, QA_URL and QA_OUTPUT as needed. These fixtures are local UI/print
checks, not a live tenant/database end-to-end test.

## Defects corrected during verification

- Background barcode reads no longer block the counter with a page loader.
- Unknown-code dismissal preserves queued later scans; large immediately
  resolving queues periodically yield to prevent render starvation.
- Added missing translated quantity/rate/preview labels found by the full suite.
- Corrected standard-label padding that could clip the label by two pixels.
- Reduced QR-label padding and the QR square to 22mm so all five metadata
  lines fit on the same 65mm stock without clipping; the quiet zone is preserved.
- Changed the narrow thermal PDF to avoid cramped quantity/rate/amount headings.

Test harness problems (stale Vite modules after branch switches, Ionic selector
differences and a quantity assertion matching a rate field) were corrected
separately from product defects. Restart Vite for a fresh candidate.

## Acceptance still required

Use the real Honeywell USB scanner in keyboard mode with an Enter or Tab suffix.
Verify repeated codes, stock limits, unknown-code recovery, manual rate edits,
open payment dialogs and scans on other routes. Repeat on the intended Bluetooth
HID device. Browser key events do not certify physical scanner compatibility.

Print one label on the actual stock at 100% scale and scan its EAN and optional
QR before a large batch. Verify printer margins, darkness and thermal receipt
legibility. A rendered PDF cannot prove physical print/scanning quality.

Database application and a live settings-save/historical-invoice check remain
release-stage checks. Do not roll back a database containing new template values
to an enum-unaware Prisma runtime. Existing invoice snapshots must remain intact.
