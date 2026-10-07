---
title: Clear UI Lint Failures - Plan
type: chore
date: 2026-10-07
artifact_contract: ce-unified-plan/v1
execution: code
product_contract_source: ce-plan-bootstrap
---

# Clear UI Lint Failures - Plan

## Goal Capsule

Make the existing `kirana-ui` lint command pass without weakening its rules or changing POS behavior. KIR-12 owns this cleanup on its own branch from `dev`; KIR-9 remains separate.

## Product Contract

### Problem Frame

`npm run lint` currently reports 48 errors and 89 warnings across 33 files. The failed gate prevents otherwise verified UI work from shipping under the project's definition of done.

### Requirements

- R1. `npm run lint` exits successfully with zero errors and zero warnings under the existing configuration and `--max-warnings 0` setting.
- R2. Existing POS routes, controls, API response handling, loading states, and error messages retain their behavior.
- R3. `npm run build` and the existing Vitest suite pass after the cleanup.
- R4. KIR-12 ships as a separate PR into `dev` and links the Jira Task.

### Scope Boundaries

Only lint findings present on `dev` are in scope. Do not add KIR-9's Preferences heading, change lint rules, suppress findings without a documented local reason, or redesign product flows.

## Planning Contract

### Key Technical Decisions

- KTD1. Replace broad `any` uses with existing domain types, endpoint result types, or small explicit unions and narrowing at uncertain response boundaries. Preserve fallback response shapes where current code handles them.
- KTD2. Remove unused symbols only after checking whether they represent an omitted UI connection or loading state. Keep behavior-sensitive code until its role is understood.
- KTD3. Stabilize memo dependencies and separate the Theme hook from its provider when needed to satisfy the React rules without changing rendered behavior.

### Existing Patterns

RTK Query endpoint generics and report models live in `src/core/api/` and `src/core/types/index.ts`. Narrow error shapes after `.unwrap()` as in `src/features/payments/PaymentsPage.tsx`. Vitest tests are co-located as `*.test.tsx`.

### Sequencing

Resolve unused symbols first, then type warnings, then the React Hooks and Fast Refresh findings. Re-run focused lint after each area so the remaining diagnostics stay attributable. Behavior-sensitive edits receive focused verification before the final full suite.

## Implementation Units

### U1. Resolve unused symbols

- **Covers:** R1, R2.
- **Files:** Reported files under `src/components/`, `src/features/`, and `src/core/`; especially `src/components/Input.tsx`, `src/features/invoices/InvoiceDetailPage.tsx`, and `src/features/import-export/ImportExportPage.tsx`.
- **Approach:** Remove truly unused imports, variables, and unreachable helpers. Check call sites before changing `required`, invoice finalization, or loading flags. Record any apparent omitted behavior for separate Jira triage rather than connecting it during this cleanup.
- **Test scenarios:** For any behavior-sensitive correction, exercise the affected control or state before and after the edit. Existing `src/components/Input.test.tsx` is the first test home for Input behavior.

### U2. Replace explicit `any` types

- **Covers:** R1, R2.
- **Files:** Lint-reported files in `src/core/api/` and `src/features/`, especially `src/features/reports/ReportsPage.tsx` and `src/core/api/reportsApi.ts`.
- **Approach:** Use domain models, `unknown` with narrowing, and typed error shapes. Retain the array and object response envelopes handled by Reports. Avoid blind assertions that hide a runtime shape mismatch.
- **Test scenarios:** For Reports, verify array and object envelopes, pagination accumulation, and empty responses against rendering. Add focused tests near `src/features/reports/ReportsPage.tsx` only if a test can exercise those paths meaningfully.

### U3. Resolve React rule findings

- **Covers:** R1, R2.
- **Files:** `src/features/inventory/InventoryPage.tsx`, `src/features/products/ProductsPage.tsx`, `src/contexts/ThemeContext.tsx`, and their direct imports.
- **Approach:** Stabilize derived empty arrays used by memo dependencies. Move the shared Theme hook/context to a module that keeps Fast Refresh boundaries valid while retaining the provider and hook API.
- **Test scenarios:** Verify inventory and product grouping with empty and populated responses. Verify theme toggling and persistence from Login and Profile; use existing tests where they cover the flow, otherwise use focused browser checks when authentication is available.

## Verification Contract

| Check | Pass signal |
| --- | --- |
| `npm run lint` | Zero errors and warnings with the existing script and rules. |
| `npm run build` | TypeScript and Vite complete successfully. |
| `npm test` | All existing tests pass; added focused tests pass if behavior-sensitive edits warrant them. |
| Changed-file review | No lint suppression, unrelated feature work, or accidental removal of reachable UI behavior. |

## Definition of Done

R1–R4 are met, the KIR-12 branch contains only lint-cleanup work, Compound Engineering review has no unresolved blocking findings, and an open PR targets `dev` with the KIR-12 URL.
