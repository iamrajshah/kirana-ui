# POS device feature access

Decision: 23 November 2026. Applies to staff POS, not the public customer storefront or private Platform Admin.

Web is the complete counter. Mobile is a companion with quick billing, payments, customer khata, online orders, invoice sharing, offers, product edits and alerts. Tablet starts with more operational tools; Admin can choose full access when suitable. No device setting overrides a plan, shop restriction, staff role, subscription or financial replay protection.

Each existing feature has Hidden, View only or Full access for Mobile, Tablet and Web. Named, editable templates hold reusable snapshots. Preview a template before applying it; saving a template alone must not change live access. Applying live policy requires FINANCE scope, recent platform reauthentication, CSRF protection, a reason, revision checking and an audit record. All feature codes and dependencies are listed. Concurrent edits must fail rather than overwrite another administrator.

Initial defaults: Web full. Mobile hides bulk import/export, backup/restore, barcode design, GST exports and purchase import; view-only purchasing, supplier accounts, stock adjustments, shifts, staff, firms and licences. Tablet permits operational purchases, supplier payments, stock, shifts and reports but leaves bulk/import/backup/configuration tools restricted. Existing plan/role/shop gates still apply. Mobile billing has no arbitrary item cap.

Server policy is authoritative for API reads and writes. POS navigation and direct routes hide unavailable features; view-only pages show a notice and block mutations. Public storefront browsing/checkout remains unchanged. Access refreshes on focus and periodically; server rejects stale/restricted writes immediately. Admin changes require no release for already implemented features. New capabilities or new screens still require development and deployment.

Device profile uses verified native session platform plus device agent signals; web uses mobile/tablet agent signals, not window width. Desktop-site mode and custom API clients can disguise form factor: this is UX/channel policy, not hardware attestation or a replacement for role/device/session limits. Unknown native form factor defaults to Mobile.

QA: test matrix round-trip, invalid/unknown features, dependencies, read-only writes, direct-route access, session refresh, stale revisions, unauthenticated/wrong-scope/CSRF/re-auth denial, untouched storefront access, mobile/tablet/web detection, template save versus apply, and plan/shop/role precedence. Test native builds separately from web publishing.

## Implemented control and rollout

Platform Admin → Feature Access → Mobile, Tablet and Web lists the current 32 feature codes. Select a device profile to edit Hidden / View only / Full access. Preview a reusable template, apply it to the draft, and confirm live changes with password and audit reason. Save templates only persists reusable snapshots while retaining live profiles. Replacing, renaming and deleting templates also require saving. Live device policy applies across shops; individual shop switches and role rules remain independent, additional restrictions. Core POS is the device master switch; account recovery remains accessible.

The additive `20261123000000_pos_device_policy` migration creates `pos_device_policies`: one POS configuration with optimistic revision and JSON profiles/templates. No tenant financial tables or existing data are changed. Before a configuration is saved, the API uses the documented defaults. Changes and their before/after snapshots are audited atomically.

GET/PUT `/api/v1/platform/device-feature-access` requires a Platform Admin FINANCE scope. PUT also requires first-party session CSRF, recent reauthentication and an audit reason, and is rate limited. The request carries `{expectedRevision, configuration}`. Invalid/unknown feature settings or hidden prerequisites are rejected. A concurrent edit returns conflict instead of overwriting another administrator.

`/subscription/access` and session context include `deviceAccess` (profiles, revision, policy fingerprint and per-device fingerprints). The existing shop access version remains unchanged in format. POS sends `x-pos-device-profile` and `x-device-access-version`; a profile hint can restrict server classification but cannot widen it. Server uses the verified session platform and user agent. A mobile-only change does not invalidate Web write intents. Template-only changes leave policy fingerprints unchanged.

POS polls access every 60 seconds and refreshes on focus/reconnect. Navigation, direct routes, view-only notices and mutation controls follow policy. The API independently denies disallowed operations immediately, even before the next poll. Stale financial intents require refresh; they are never blindly replayed. Refreshed device policy invalidates affected cached reads. Margin quote responses also obey device visibility.

Roll out the migration before the API uses the new table. Publish a compatible POS web/native bundle and Admin UI as a coordinated release. Existing native installations need the initial updated app bundle; subsequent settings for existing features require no app or web deployment. A source rollback leaves the additive table intact. To restore broad device availability through configuration, apply Full Counter to the desired profiles and confirm.

## Developer diagnosis

Check the signed-in shop/role and plan/subscription first, then `/subscription/access` device profile, its effective mode, dependencies and fingerprints. Compare with the Admin device policy and shop override. A device denial is not a password failure: refresh access and explain which supported device can perform the action. Check User-Agent and verified native session platform for classification; viewport size is not authorization. Never loosen tenant filters or replay payments to fix a presentation issue.

When adding a feature code, extend the feature catalogue, validation, defaults/templates, device-route classification and tests, and provide migration/normalization for already saved configurations. Adding a genuinely new capability still requires a software release.

## Verification and release status

See `docs/device-feature-access-qa.md` for exact test scope and outstanding manual checks. These branches are not a production deployment receipt. Production databases, existing plans, tenant data and installed phone builds were not modified by this implementation.

Global device configuration is not tenant financial data and must not be imported through a shop backup/restore. POS summaries expose profile modes and fingerprints, not saved Admin templates or audit reasons.
