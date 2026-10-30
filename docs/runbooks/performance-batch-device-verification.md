# Performance batch device verification

Date: 30 October 2026  
UI revision: `f023aef`  
Scope: management-list pagination, debounced search, lazy customer lookup,
network-aware warm-up and production bundle budgets.

This record contains no credentials, tokens or customer data. Raw screenshots
and request traces remain local test evidence and are not committed.

## Responsive browser matrix

The production PR bundle was served locally and exercised against the Railway
API. Because Railway correctly rejects the temporary `127.0.0.1` origin, the
test-only browser disabled web security for this local PR run. Production CORS
configuration was not changed. These results prove the responsive UI and API
journeys, not local-origin CORS behaviour.

| Journey | Mobile 393 x 851 | Tablet 1280 x 800 |
| --- | --- | --- |
| Login and session establishment | PASS | PASS |
| Products search and pagination | PASS | PASS |
| Customers search and list | PASS | PASS |
| Inventory search and pagination | PASS | PASS |
| Billing catalogue and lazy customer lookup | PASS | PASS |
| Payments and lazy customer lookup | PASS | PASS |

Across both viewports:

- no horizontal overflow, console exception, failed API request or application
  failure state was observed;
- Products and Inventory each loaded 50 then 100 unique rows through exactly
  one successful `skip=50` request;
- product, customer and inventory debounced searches each issued one successful
  request;
- Billing and Payments lazy customer searches each issued one successful
  request; and
- Billing retained instant local catalogue filtering.

The focused component regression for the five changed journeys also passed
69/69 tests. The full PR quality gate passed 394 tests, lint, TypeScript,
production build and bundle budgets.

## Android verification

The same UI revision passed:

- production build, bundle guard and Capacitor sync;
- three Android compatibility checks;
- Gradle unit tests, lint and debug APK assembly (399 tasks); and
- API 36 connected instrumentation (1/1 test, 224 tasks).

A fresh debug APK installed and rendered the Kirana login screen while the app
process remained healthy. The headless Play Store emulator displayed a
System/System UI ANR from its Google-services environment, so this run is not
claimed as a clean interactive native journey.

## Remaining release gates

- Repeat the signed release build on a physical Android phone and tablet.
- Verify the signed AAB, release signing, production icon and splash assets.
- Exercise camera barcode scanning, native share, dropped-network recovery and
  app resume on physical hardware.
- Keep Google sign-in disabled until its separate web and Android identity gates
  pass.

