---
title: KIR-1 About screen
date: 2026-10-07
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

## Goal Capsule

**Objective:** An authenticated Kirana POS user can find the application name and current version from app navigation.

**Means:** Add an About route and side-menu entry using the UI's existing routing and app metadata constants (KTD1, KTD2).

**Authority:** [KIR-1](https://kirana-pos-demo.atlassian.net/browse/KIR-1) and its acceptance criteria; this plan; existing UI patterns. Stop if the issue contract conflicts with a discovered product constraint. Implement on `KIR-1-add-about-screen` and open a PR into `dev`; merging requires a separate user decision.

## Product Contract

### Summary

Add a simple About screen to the POS navigation, showing Kirana POS and the app version.

### Problem Frame

Users currently have no navigable place in the POS to identify the app and its version.

### Requirements

- **R1:** The About screen is reachable from app navigation for an authenticated user.
- **R2:** The screen displays the Kirana POS name and current app version.
- **R3:** Existing UI build and tests continue to pass.

### Scope Boundaries

The issue calls for a simple informational screen. No API, database, or account behavior changes are needed.

## Planning Contract

### Key Technical Decisions

- **KTD1:** Add `ROUTES.ABOUT` and render the screen inside `MainLayout` so the existing side menu can navigate to it. Add the matching authenticated route in `App.tsx`, following other main-layout screens.
- **KTD2:** Render the existing `APP_NAME` and `APP_VERSION` constants from `src/core/constants/index.ts`. They currently default to `Kirana POS` and `1.0.0`, matching `package.json`; avoid a second hard-coded value in the new page.

### Assumptions

- The side menu is the intended app navigation for this secondary screen. This is an implementation assumption, not a new Jira requirement.

## Implementation Units

### U1. Add the About screen and navigation

**Goal:** Satisfy R1 and R2.

**Files:** `src/features/about/AboutPage.tsx`, `src/core/constants/index.ts`, `src/components/SideMenu/SideMenu.tsx`, `src/layouts/MainLayout.tsx`, `src/App.tsx`, `src/features/about/AboutPage.test.tsx`.

**Approach:** Use the established Ionic page/header/content pattern. Add an About menu item with a clear icon and label; keep it available to all authenticated roles without changing role permissions.

**Test scenarios:** (1) The page shows the app name and version from the shared constants. (2) The side menu exposes an About action that navigates to `ROUTES.ABOUT`. (3) Direct navigation to the route stays behind `PrivateRoute`.

**Dependencies:** None.

## Verification Contract

- Run `npm test`, `npm run lint`, and `npm run build` in `kirana-ui`.
- Check the About route from the side menu in a browser when a usable authenticated session is available.
- Review the diff for unrelated edits and confirm the original `kirana-ui` checkout's uncommitted files remain untouched.

## Definition of Done

- R1-R3 are met and the U1 test scenarios are checked.
- No abandoned implementation remains in the diff.
- The PR links KIR-1 and targets `dev`; do not merge without explicit user approval.
