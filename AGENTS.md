# Agent instructions — Kirana POS

Generated from the skills in the `kirana-skill` repo. Do not edit directly; run
`./export.sh` instead.

Two git repos, one product: `kirana-ui` (Ionic POS) and `kirana-server` (Express API).
Not microservices. **Jira project KIR is the source of truth.** Developer work runs
through Compound Engineering `lfg`; QA work uses evidence-based bug triage. Default
integration branch is `dev`.

## Before starting anything

```bash
kirana-skill/kirana-start/scripts/preflight.sh
```

## kirana-start

**When to use:** Start Kirana POS work by choosing a role, then route Developer work from Jira through Compound Engineering or QA work through evidence-based bug triage. Use when someone says kirana-start, asks what to work on, names a KIR issue, wants the Jira-to-PR demo, or wants to review test bugs before creating Jira issues.

The entry point for Kirana work.

**Jira project KIR is the source of truth.** Not the code, chat, or GitHub Issues. If work has no Jira issue, draft one and get confirmation before creating it.

Two repos, one product: `kirana-ui` (POS) and `kirana-server` (API). Not microservices.

### Step 1 — preflight

```bash
kirana-skill/kirana-start/scripts/preflight.sh
```

If preflight reports a configuration failure, handle it automatically instead of telling the user to invoke `/kirana-config` or run terminal commands. Run `kirana-skill/kirana-config/scripts/setup.sh`, then re-run preflight. A warning that authentication **could not be verified because the network is unavailable** is not evidence of bad credentials. Retry `gh auth status` and/or `kirana-skill/kirana-start/scripts/jira.sh check` with network access, using the host's network escalation when needed. Only launch `gh auth login` or `kirana-skill/kirana-config/scripts/setup.sh --auth` after a network-enabled check confirms missing or rejected credentials. Never overwrite an existing Jira token merely because a sandbox cannot reach Jira. Launch any required authentication command yourself and wait at its interactive prompt. Never ask the user to paste a token or run the command manually; only ask them to complete the local browser or credential prompt when that interaction is required. Re-run preflight after configuration and continue automatically once it passes. Compound Engineering and authenticated Jira/GitHub access are required for the demo; MySQL is required only when the selected work needs the local API.

### Step 2 — choose the lane

Always show the role menu and wait for the user to choose. Do not infer the lane from the previous session, issue type, spreadsheet, or current Jira assignment.

1. **Developer** — configured: select or create Jira work, then implement through Compound Engineering.
2. **QA** — configured: inspect evidence, triage bug candidates, and prepare Jira Bug drafts.
3. **Product / Business Analyst** — visible but not configured.
4. **Project Manager / Scrum Master** — visible but not configured.

If an unconfigured lane is selected, say that it is not configured and return to the role menu. Do not simulate that role's workflow.

### Step 3 — enter the selected lane

#### Developer lane

List the current sprint and the developer's assigned issues:

```bash
kirana-skill/kirana-start/scripts/jira.sh sprint
kirana-skill/kirana-start/scripts/jira.sh mine
kirana-skill/kirana-start/scripts/jira.sh list
```

After the issue results, always show these choices:

1. Select an existing Jira issue.
2. **Create a new Jira issue.**
3. Refresh the issue list.
4. Return to the role menu.

If they name a key, read it with `jira.sh issue KIR-N` and treat its description and acceptance criteria as the contract.

For new work, collect issue type, title, description, and acceptance criteria. Show the complete draft first. Only after the user approves the draft, preview `jira.sh create Task|Bug "title" "description"`. The helper still writes nothing at this stage. Run it with `--confirm` only after the user separately approves the helper's exact preview.

Start the selected issue with `jira.sh start KIR-N`. This automatically assigns the current Jira user and moves a `To Do` issue to `In Progress`; an issue already `In Progress` continues without another prompt. Other statuses stop for review.

Continue with [Developer execution](#developer-execution).

#### QA lane

Read `kirana-skill/kirana-start/reference/qa.md` and follow it. Start by offering:

1. Review an existing Jira bug.
2. Review a bug spreadsheet or supplied test evidence.
3. **Draft a new Jira Bug.**
4. Return to the role menu.

QA triage is read-only until the user selects a candidate and authorizes bug creation. When the user supplies a complete bug report and asks to create it, or approves the complete draft, run the Jira helper with `--confirm` without asking for separate preview approval. Ask only for missing required details or an unresolved material change to the requested bug. Never create bugs merely because a spreadsheet row looks valid. Do not start implementation, create a branch, or invoke `lfg` from the QA lane.

### Developer execution

#### Step 4 — choose the repo and branch

| Change lives in | Repo |
| --- | --- |
| Screen, RTK slice, Ionic, Capacitor | `kirana-ui` |
| Route, Prisma, JWT, tenant, import | `kirana-server` |
| API contract | usually **both** — server first, then UI |

Default base branch is `dev`. Create:

```bash
kirana-skill/kirana-start/scripts/branch.sh <ui|server> <KIR-key> <short-slug>
```

Inspect the selected repo with `git status --short` before branching. If it has any uncommitted changes, leave that checkout and its workflow untouched. `branch.sh` creates a separate worktree from the latest `dev` for the selected Jira issue and prints its path. Continue all implementation there without asking to commit, stash, or park the existing changes. Reuse an already-created worktree for the same issue when available.

Every unrelated Jira issue gets its own branch and Compound Engineering run. Do not add a second issue to the current feature branch; start it in its own worktree from an up-to-date `dev`.

#### Step 5 — run Compound Engineering

State this clearly in the demo: **"Kirana orchestration is now handing the Jira issue to Compound Engineering."** Then invoke the installed `lfg` skill with an issue packet containing:

- Jira key, URL, type, description, and acceptance criteria;
- selected repo and the current feature branch;
- `dev` as the PR base;
- a requirement to link the Jira URL in the PR;
- a requirement to stop at an open PR and never merge without explicit permission.

`lfg` is the orchestrator. It visibly routes through the applicable CE stages: planning or debugging, `ce-work`, simplification, `ce-code-review`, browser testing when relevant, `ce-commit-push-pr`, and CI watching. Do not replace this with an ordinary chat implementation. If `lfg` or a required CE child skill is unavailable, stop and repair the plugin with `/kirana-config`.

Read `kirana-context/` before changing tenant, ledger, invoice, or barcode behaviour.

Read `kirana-skill/kirana-start/reference/dev.md` for the definition of done.

#### Step 6 — PR, merge, and Jira close-out

The CE run ends with an open PR into `dev`; it does not merge. Present the PR URL and test/CI evidence. Ask for explicit confirmation immediately before merging the PR.

`finish.sh` is a recovery path if CE completed the code but could not ship:

```bash
kirana-skill/kirana-start/scripts/finish.sh <ui|server>
```

It pushes the current branch and opens a PR **into `dev`**. Do not run it if `lfg` already created the PR.

After the PR is actually merged, verify GitHub reports the PR as `MERGED`, then run `jira.sh done KIR-N <PR-URL>`. The helper adds the merge comment and moves Jira to `Done` automatically; it refuses to write if GitHub has not confirmed the merge. Never mark Jira Done merely because a PR exists.

### Demo narration

Show these checkpoints rather than hiding the orchestration:

1. Role menu and selected lane.
2. Jira issues plus the Create a new Jira issue option.
3. Free Jira sprint and selected KIR issue.
4. Repo and `KIR-N-slug` branch from `dev`.
5. Compound Engineering route selected by `lfg`.
6. Local verification and CE code-review result.
7. Open GitHub PR into `dev` and CI result.
8. Explicit merge decision, followed by Jira Done.

## kirana-platform

**When to use:** Orientation for Kirana POS — two git repos, one Express API, one Ionic POS, MySQL tenants. Use when a question is about which repo to change, how a request reaches the database, what tenant_id means, or how invoices, inventory, or barcodes fit together. Also use before a change that spans UI and server.

Read `kirana-context/README.md` and `kirana-context/GLOSSARY.md` first.

### Which repo

| You are touching | Repo |
| --- | --- |
| Ionic page, RTK Query, Redux, Tailwind, Capacitor | `kirana-ui` |
| Express route, Prisma, Zod, JWT, file import | `kirana-server` |
| New field on an invoice/product/customer | Prisma in server, then types + form in UI |
| Shopper cart/order | server modules `cart` / `order` / `catalog` / `customer-auth`; UI is `kirana-ui-customer` if present |

There is no queue, no extra Node service, no separate “billing microservice”.

### How a POS request travels

1. UI `fetchBaseQuery` → `VITE_API_BASE_URL` + path (e.g. `/invoices`).
2. Express `app.use('/api/v1', routes)`.
3. Auth middleware reads Bearer JWT (`userId`, `tenantId`, roles).
4. `extractTenant` sets `req.tenantId`.
5. Service/repository filters by `tenant_id`.
6. Prisma → MySQL.

If the UI shows a 401 loop: refresh is `POST /auth/refresh-token`. Check tokens in `localStorage` (`access_token`, `refresh_token`).

If the UI talks to Railway instead of localhost: `VITE_API_BASE_URL` is unset and `constants` fall back to production.

### Recipes

- `kirana-platform/recipes/trace-a-request.md`
- `kirana-platform/recipes/add-a-column.md`

### Invariants

- Do not drop `tenant_id` from queries.
- Do not add a new HTTP service for a new screen.
- POS roles in the UI are OWNER / MANAGER / CASHIER.
- Sales vs purchases: `invoices` vs `purchase_invoices`.

## kirana-config

**When to use:** Set up or repair what kirana-start needs — Node, gh, sibling repos, Compound Engineering, Cursor install. Use when someone says kirana-config, cannot get preflight to pass, or is on a new machine.

Run the installer, then preflight. Keep existing credentials. If preflight cannot verify authentication because of a network restriction, retry the GitHub and Jira checks with network access before starting a login flow. Run `setup.sh --auth` only when Jira credentials are absent or a network-enabled check rejects them.

```bash
kirana-skill/kirana-config/scripts/setup.sh
kirana-skill/install.sh --cursor --codex
kirana-skill/kirana-start/scripts/preflight.sh
```

When Jira credentials need repair, run `kirana-skill/kirana-config/scripts/setup.sh --auth` and wait at its local hidden-token prompt. When GitHub credentials need repair, run `gh auth login` and wait for browser sign-in. Do not ask the user to paste credentials into chat.

### Expected siblings

Under the same parent as `kirana-skill`:

- `kirana-ui` (clone `git@github.com:iamrajshah/kirana-ui.git`)
- `kirana-server` (clone `git@github.com:iamrajshah/kirana-server.git`)
- `kirana-context`

### Tools

- Node 18+, npm, git, GitHub CLI (`gh auth login`)
- MySQL 8 if they will run the API locally
- Cursor Compound Engineering plugin (required for the Developer demo)
- Jira Cloud API token for the personal `shahrajesh2113@yahoo.com` account

`setup.sh --auth` stores Jira settings with mode `0600` in `~/.config/kirana-start/env`. Never commit or paste that file into chat. Creating or revoking the Atlassian token remains a user-approved account action.

### Editor

Open `kirana.code-workspace` (parent folder) so both apps, skill, and context are visible. New chat after install so rule text loads.

Do not write secrets into the skill repo. `.env` stays in each app, untracked.

## kirana-reload

**When to use:** Pull the latest kirana-skill and reinstall Cursor/Codex files. Use when someone says kirana-reload, asks to refresh the skills, or wonders whether they are on the latest version.

From a clean `kirana-skill` checkout on its main branch:

```bash
git -C kirana-skill pull --ff-only
kirana-skill/install.sh --cursor --codex
```

Inspect the branch and working tree before reloading. If the checkout is clean and on `main`, use the commands above. Otherwise, complete the reload from a temporary worktree without changing the current branch, index, or local files:

1. Fetch `origin/main`. If fetching fails, report the actual network or authentication error and stop; do not claim a successful reload.
2. Create a temporary detached worktree from the freshly fetched `origin/main` outside the normal sibling workspace.
3. Run that worktree's `export.sh --check`. Install its generated Cursor rules/commands and `AGENTS.md` into the original workspace and both app repos. Do not run `install.sh` directly from the temporary worktree: it derives destinations from its own parent. Copy only the same generated paths that `install.sh --cursor --codex` installs.
4. Verify the installed generated files match the temporary worktree, report the installed commit, and remove the temporary worktree after successful installation. On failure, preserve useful recovery artifacts and report the incomplete step.

A dirty tree or feature branch is not a reason to refuse a reload. Do not stash, reset, commit, or switch the user's existing checkout merely to reload. Leave any existing named stashes untouched and report them when relevant.

Cursor: new chat to pick up changed rule text. Codex: new session.

## kirana-update-context

**When to use:** Refresh kirana-context so the docs match the two app repos. Use when someone says kirana-update-context, a doc was wrong, or after a stretch of commits that changed behaviour.

1. `git -C kirana-ui log --oneline -20` and the same for `kirana-server`.
2. Read diffs that touch routes, Prisma, auth, or POS screens.
3. Update only the files in `kirana-context/` that drifted (`kirana-ui/README.md`, `kirana-server/README.md`, `GLOSSARY.md`).
4. Append a dated bullet to `PROVENANCE.md` with SHAs you used.
5. Do not copy whole source files into context. Short maps only.

This is documentation. Do not change `kirana-ui` or `kirana-server` from this skill.

## Files this refers to

Paths are relative to the parent folder that contains the four siblings.

| Path | What |
| --- | --- |
| `kirana-skill/kirana-start/reference/` | Developer and QA lanes |
| `kirana-skill/kirana-start/scripts/` | `preflight.sh`, `jira.sh`, `branch.sh`, `finish.sh` |
| `kirana-skill/kirana-platform/recipes/` | Trace a request; add a column |
| `kirana-context/` | Product knowledge |
