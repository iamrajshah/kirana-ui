# Device feature access — QA receipt, 23 November 2026

Status: implemented on separate `feat/device-feature-templates` branches. Not merged, deployed or installed as a native release.

## Automated checks

- Backend: 171 suites, **1,149 passing tests**. Includes commercial state, tenant isolation, role/plan checks, purchases, invoices, payment replay and new device policy tests.
- POS: 134 files, **690 passing tests**. Includes device detection, direct-route restrictions, view-only financial request rejection before network dispatch, disabled payment/supplier controls, user status, navigation, billing, templates and localization. The request-policy module is loaded on demand to retain the existing production bundle budget.
- Platform Admin: 22 files, **92 passing tests**. Includes profile isolation, template preview, template-only save, discard, credentialed transport, CSRF rotation and denied reauthentication.
- TypeScript/build/lint checks run for all three changed applications. Backend lint uses its existing baseline with no new findings; no baseline was refreshed. POS production bundle retains its existing size limits and production API/Google readiness checks.

## Actual local API and MySQL

Disposable MySQL 9.5 on localhost only; production MySQL/Railway untouched. All **47 migrations** applied from empty schema, including the new additive table. MySQL 8-compatible basic CREATE TABLE/JSON syntax is used, but this receipt is not a separate MySQL 8 execution.

The guarded `scripts/verify-device-feature-policy.ts` verified default read, persistence through a new repository instance, two concurrent saves with exactly one winner, conflict rejection, exact audit history, rollback of the policy when audit persistence fails, and template-only saving that preserves live profiles. The deliberate audit-FK error in its log is the negative rollback case, not a failed verification.

Seven real HTTP negative cases passed against the actual local API: unauthenticated read (401), missing CSRF (401), missing reason (400), stale revision (409), unknown feature (422), support-only read (403), stale reauthentication (401). Repeated negative probes also triggered the existing sensitive-action limiter (429). No rate limit or security setting was weakened. The localhost HTTP client adapted only its temporary test cookie jar; production cookie configuration was unchanged.

## Browser checks

Actual Admin UI, actual API and a disposable database: login, all **32** feature rows, device-profile isolation, template preview without publication, confirmed save with real password reauthentication, preserved Web access, and light/dark rendering. No browser console errors in the completed run.

Actual POS password login in the disposable shop at phone (390px/iPhone agent), tablet (820px/iPad agent) and desktop (1440px/desktop agent): purchases are view-only on phone with no create action, creation is available on tablet/desktop, hidden import direct-route redirects on phone, and light/dark screenshots were inspected. These are browser form-factor checks, not tests on native iOS/Android hardware.

Evidence: workspace `output/device-feature-access-20261123/` contains JSON browser/security receipts and screenshots. Private credentials and session cookies are outside repositories and are not part of these docs.

## Findings fixed during development

1. A hidden Dashboard could redirect to itself. Recovery now goes to the always-available profile; a route regression covers it.
2. The quote controller originally evaluated margin visibility without device context. It now omits profit data when device policy hides that feature; controller tests cover mobile versus Web.
3. Device state initially reused the shop access version. The final implementation preserves existing commercial-version contracts and uses separate canonical, per-profile policy fingerprints. Template-only saves do not interrupt checkout, and mobile changes do not invalidate Web write intents.
4. Initial production build exceeded its established JS budget. Device request rules and the notice were split into lazy modules; the budget was not raised.
5. Test harness fixes: explicit select accessibility label, actual localized button names, timezone-correct UTC stale-session fixture, and explicit full-access mocks in older page-only tests. No failed or skipped scenario was counted as passed.

## Developer reproduction

Run each repo's standard test/lint/build commands. For a fresh, explicitly disposable local schema, run `FRESH_MIGRATION_DATABASE_URL=... npm run release:rehearse-fresh-migrations`, then `DEVICE_POLICY_TEST_DATABASE_URL=... npx tsx scripts/verify-device-feature-policy.ts`. The guard rejects remote databases and schemas without an explicit test/rehearsal marker; the verification script requires a fresh policy table. Use local test JWT configuration, never production secrets.

## Remaining release/manual checks

- Merge/release the three dependent applications and run the production migration in a coordinated release; this task did not trigger deployment.
- Build/install the updated native POS and verify iPhone/iPad/Android classification and controls on hardware. Existing iPhone build 14 does not contain these device-policy UI changes.
- Retain the previous phone-test/PR103 work separately; this feature does not claim that its pending phone scenarios passed or that PR103 was merged.
- Real printer/scanner equipment checks and desktop-site/user-agent spoofing remain outside hardware verification. Device form factor is an experience policy, not hardware attestation or a replacement for device/session limits.
