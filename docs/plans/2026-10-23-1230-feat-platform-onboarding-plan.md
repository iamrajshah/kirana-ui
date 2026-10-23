---
title: Platform-managed shop onboarding
type: feat
date: 2026-10-23
topic: platform-onboarding
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
deepened: 2026-10-23
---

# Platform-managed shop onboarding

## Goal Capsule

**Objective:** Let Rajesh create and track a new shop account without database access while keeping every shop's operational data isolated.

**Means:** Add a separate Platform Admin control plane, an atomic shop-and-owner setup flow, onboarding progress, tenant suspension controls, and immutable login email handling.

**Authority:** Platform Admin manages shop accounts. OWNER, MANAGER, and CASHIER remain tenant-scoped POS roles.

**Open blockers:** None for the first admin-created onboarding release.

---

## Product Contract

### Summary

Kirana will distinguish platform operations from work inside a shop. A Platform Admin can create a shop and its first OWNER, see whether setup has progressed, and suspend or reactivate access. Shop staff continue to see only their own tenant data.

### Key Decisions

- **Admin-created onboarding first.** (session-settled: user-approved — chosen over public self-signup: the first customers and demonstration remain controlled.)
- **Platform Admin is separate from tenant roles.** It is not an OWNER with broader permissions and does not receive a tenant identity.
- **Email is an account identifier, not an editable profile field.** Name and phone remain editable; email changes require a future verified account-recovery flow.
- **No cross-tenant transactional browsing.** The platform portal shows setup and operational metadata, not customer, invoice, Khata, stock, or payment records.
- **Temporary credentials are used for the first release.** The owner must change the initial password after first login; email invitations are deferred until a delivery provider exists.

### Actors

- **Platform Admin:** Creates and manages shop accounts.
- **Shop Owner:** Receives initial credentials and completes shop setup.
- **Shop Staff:** Existing MANAGER and CASHIER users created by the OWNER inside the tenant.

### Requirements

- R1. Ordinary profile updates allow name and phone only; email is visible but read-only.
- R2. The server rejects attempts to update email through the profile API.
- R3. Platform Admin authentication is separate from POS authentication and cannot be used on tenant routes.
- R4. Platform Admin can list shops with service status, owner identity, creation date, staff count, product count, invoice count, and onboarding progress.
- R5. Platform Admin can create a shop and its initial OWNER atomically with globally unique login email and phone.
- R6. A new OWNER receives a temporary password and must replace it after first login.
- R7. Platform Admin can suspend or reactivate a tenant; suspended tenants cannot log in.
- R8. Every shop creation and status change is recorded in a platform audit log.
- R9. Public owner registration is unavailable in the admin-created release.
- R10. Existing tenant isolation and OWNER/MANAGER/CASHIER permissions remain unchanged.

### Key Flows

- F1. Platform Admin signs in, creates a shop and owner, and copies the one-time initial credentials.
- F2. The owner signs in, changes the temporary password, and completes normal shop configuration.
- F3. The Platform Admin dashboard derives progress from setup signals such as products, staff and the first invoice.
- F4. Platform Admin suspends a shop; existing POS login and token refresh stop granting access until reactivation.

### Success Criteria

- A new shop can be provisioned from the UI without SQL, Prisma Studio, or a deployment command.
- No Platform Admin token can access a tenant business endpoint.
- No tenant user can access Platform Admin endpoints.
- Profile email cannot be changed through either UI or direct API use.
- Shop creation either creates the tenant, OWNER and role assignment together or creates nothing.

### Scope Boundaries

**Included:** one internal Platform Admin account model, login, tenant list, create-shop workflow, onboarding progress, suspension/reactivation, audit records and email immutability.

**Deferred:** public signup, email or WhatsApp invitations, subscription billing, password-reset email, support impersonation and tenant data inspection.

---

## Planning Contract

### Key Technical Decisions

- KTD1. Store Platform Admin identities separately from tenant users and issue typed platform JWTs checked by dedicated middleware.
- KTD2. Reuse the existing transactional tenant-and-owner creation operation behind an authenticated platform endpoint; remove the public route.
- KTD3. Add a persisted `must_change_password` flag to tenant users and clear it only after a successful password change.
- KTD4. Calculate onboarding progress from tenant-scoped aggregate facts rather than duplicating business data in a second database.
- KTD5. Keep platform API state and tokens separate from the POS Redux auth state and local-storage keys.
- KTD6. Enforce immutable profile email in validation, service types, repository writes, UI controls and tests.

### Implementation Sequence

1. Add database migration and Prisma models for Platform Admin, platform audit records and first-login state.
2. Add platform authentication, middleware and a bootstrap command for the first Platform Admin.
3. Add platform tenant list, creation and status endpoints with tests.
4. Remove public owner registration and lock profile email changes with regression tests.
5. Add separate platform routes, login, dashboard and create-shop workflow in the Ionic UI.
6. Add first-login password enforcement, responsive checks, translations and handbook updates.
7. Run focused tests, full builds, code review and open separate UI/server PRs into `dev`.

### Verification

- Server unit tests cover platform/POS token separation, atomic shop creation, uniqueness, audit records, suspension and immutable email.
- UI tests cover platform login, shop creation, progress/status display and read-only profile email.
- Server and UI production builds pass.
- No deployment or merge occurs without explicit approval.
