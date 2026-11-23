# Mobile OTP signup and unified Leads — 2026-11-23

## Flow
POS Login offers Google sign-in and mobile signup. Mobile signup collects name, Indian mobile number, password and optional contact email, plus current Privacy/Terms consent. MSG91 Widget verifies the phone using a server-held request ID. Email is not verified and is never used to link a Google identity automatically. After verification, the existing private-demo provisioning panel creates the shop; the owner then signs in with phone/password. Both entry methods retain the existing seven-day trial lifecycle, activation timing, isolation and expiry rules.

Interrupted setup can resume with phone/password. Resume does not create another identity or restart the trial. A phone already registered cannot start another mobile trial. This is not proof that one person cannot use different phone numbers or a separate Google identity.

Platform Admin navigation is now **Leads**, listing Google and MOBILE_SIGNUP sources, including phone and optional contact email. Existing search and lead actions remain available.

## Backend and release
New endpoints: POST /api/v1/auth/signup/mobile/request, /verify, /resume. The additive migration 20261123120000_mobile_signup creates mobile_signups for challenge state, consent versions, password hashes and identity association. Deploy the migration and server before publishing the POS. No email service is required. Existing MSG91 Widget credentials are reused; legacy phone-only OTP mode is deliberately unsupported for staff signup. Provider SMS charges still apply.

Storefront OTP routes, customer sessions and challenge storage are unchanged. Staff signup has separate challenge storage and identities. Codes cannot be exchanged between the two flows. Attempts are reserved atomically (five per challenge), resends have a 60-second cooldown, and verification consumption plus identity/lead creation is transactional. Request and verification endpoints are rate limited. Provisioning tokens are not tenant business sessions. No OTP or plaintext password is persisted.

The phone identity is retained after demo-data purge to prevent repeat mobile trials. Any future account-erasure change must review this association and its retention policy explicitly. No production migration, SMS dispatch or deployment was performed during this implementation.

## Verification and manual release checks
Automated coverage: invalid/expired/consumed/unknown challenge; failed provider verification; attempt exhaustion; consent mismatch; resend cooldown; duplicate phone; replay prevention; password-protected setup resume; Google/customer OTP regressions; verified mobile credentials copied into the demo owner; Google owner credential behavior preserved; signup UI consent/request/verify/error flow; mixed Google/mobile lead display.

Local checks: server build and baseline lint; POS production build including bundle budget; Admin build; login and Admin regression suites. Migration applied successfully to a disposable socket-only MySQL 9.5 instance, not the production database. This does not establish compatibility with every deployed MySQL version or exercise real MSG91 delivery.

After deployment, test:
1. New mobile signup, actual SMS, wrong code then correct code; exactly one lead and one isolated shop.
2. Interrupt/reload setup, resume, and confirm the trial expiry does not reset.
3. Sign out, sign in with phone/password; check owner permissions on web and native devices.
4. Existing and new Google sign-in; confirm seven-day demo and existing shop access.
5. Customer storefront OTP checkout and order placement, including resend/expiry.
6. Admin Leads search by phone/email, source and existing actions.
7. English/Hindi/Marathi/Gujarati and light/dark mode at phone/tablet/desktop widths.
8. Confirm the live trial expiry and expiry enforcement using the existing controlled test clock/fixtures; do not shorten real shop trials.

Live SMS, physical iPhone/Android and browser visual checks remain release verification tasks; unit tests are not substitutes for them.
