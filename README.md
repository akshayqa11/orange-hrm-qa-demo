# orange-hrm-qa-demo

A BDD-style Playwright automation project for the **OrangeHRM Demo** application, focused on the
**Admin → User Management** workflow (login → search → create → edit/update → logout).

Built with **Playwright + JavaScript + Cucumber/Gherkin (via `playwright-bdd`) + Page Object Model
(POM)**, aimed at solving the pain points a QA team commonly runs into: flaky automation, unclear
smoke coverage, long regression cycles, weak reporting, and hard-to-maintain tests.

---

## 1. Project Details

| | |
|---|---|
| Application under test | [OrangeHRM Demo](https://opensource-demo.orangehrmlive.com/) |
| Workflow automated | Admin → User Management (login, search/filter, create, edit/update, logout) |
| Language | JavaScript |
| Framework | Playwright + `playwright-bdd` (Gherkin/Cucumber syntax) |
| Design pattern | Page Object Model (POM) |
| Assertions | UI assertions **and** backend API response assertions (see [SIT](#test-classification-and-tags) below) |

**Why BDD?** Feature files (`.feature`) describe the workflow in plain English/Gherkin, so both
technical and non-technical stakeholders can read what's being tested without opening code. Step
definitions translate each Gherkin line into Playwright actions.

---

## 2. Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18 LTS or later
- Git
- (Recommended) [VS Code](https://code.visualstudio.com/) with the **"Playwright Test for VSCode"**
  extension — gives inline test run/debug buttons and trace viewing. This repo also ships a
  `.vscode/` config and an `.mcp.json` wiring the Playwright MCP agent, used during development to
  plan/generate/heal BDD tests (see `.github/agents/`).

### Option A — Install everything in one go (recommended)

```bash
npm install
npx playwright install --with-deps
```

`npm install` reads `package.json` and installs every dependency in one step — you do **not** need
to install Playwright and `playwright-bdd` separately. `npx playwright install --with-deps` then
downloads the actual browser binaries (Chromium/Firefox/WebKit) Playwright drives.

### Option B — Install the key libraries individually (for reference)

If you want to see what each package is for:

```bash
# Playwright's own test runner + assertion library
npm install -D @playwright/test

# playwright-bdd: adds Gherkin/Cucumber (.feature file) support on top of Playwright
npm install playwright-bdd

# dotenv: loads environment-specific config (.env.qa / .env.staging / .env.prod)
npm install dotenv

# Browser binaries Playwright will control
npx playwright install --with-deps
```

### Environment configuration

Copy the example env file and fill in real values (or reuse the public OrangeHRM demo
credentials given in the assignment):

```bash
cp .env.example .env.qa
```

```
BASE_URL=https://opensource-demo.orangehrmlive.com
USERNAME=Admin
PASSWORD=admin123
```

`.env.qa`, `.env.staging`, `.env.prod` are gitignored (never committed) — only `.env.example` is
tracked, as a reference for which variables are required.

---

## 3. How to Run the Tests

| Command | What it does |
|---|---|
| `npm test` | Generates BDD spec files (`bddgen`) and runs the **entire** suite |
| `npm run test:smoke` | Runs only scenarios tagged `@smoke` (see caveat below) |
| `npm run test:regression` | Runs only scenarios tagged `@regression` (currently = the full suite) |
| `npm run test:sit` | Runs only scenarios tagged `@sit` (see caveat below) |
| `npm run test:qa` | Runs against the `qa` environment, headed (visible browser) |
| `npm run test:staging` | Runs against the `staging` environment |
| `npm run test:prod` | Runs against the `prod` environment |
| `npm run report` | Opens the last HTML report |

> **⚠️ Caveat on tag-scoped runs:** because all 11 scenarios are one continuous, stateful journey
> (they share a single browser page and pass data forward — see [Section 5](#5-how-the-pieces-connect-request-flow)),
> `test:smoke` and `test:sit` are **not guaranteed to pass if run standalone** — some tagged-in
> scenarios depend on a step from a tagged-out scenario (e.g. the "create user" scenario assumes
> the Add form was already opened by the earlier "empty form validation" scenario). Treat these
> tags today as **classification/reporting labels**, not an isolated fast-feedback suite. See
> [Assumptions & Limitations](#6-assumptions--limitations).

Run everything with default settings:

```bash
npm test
```

Run only smoke-tagged scenarios (documentation of intent — full suite is safer today):

```bash
npm run test:smoke
```

View the report after a run:

```bash
npm run report
```

---

## 4. Project Structure

```
orange-hrm-qa-demo/
├── features/                         # Gherkin .feature files (human-readable scenarios)
│   └── user-management/
│       └── user-management-e2e.feature
├── tests/
│   ├── setup/
│   │   └── auth.setup.js             # Playwright "setup project": logs in once, saves session
│   └── step-definitions/             # Glue code: Gherkin steps -> Playwright actions
│       ├── fixtures.js               # Custom Given/When/Then + shared page/session fixtures
│       ├── authentication/           # login.steps.js, logout.steps.js
│       ├── navigation/                # navigation.steps.js
│       └── user-management/          # create-user.steps.js, search-user.steps.js, edit-user.steps.js
├── src/
│   ├── pages/                        # Page Object Model — one class per screen
│   │   ├── LoginPage.js
│   │   ├── DashboardPage.js
│   │   ├── SystemUsersPage.js
│   │   └── UserFormPage.js
│   └── utils/
│       ├── dataGenerator.js          # Generates unique usernames/passwords per run
│       └── dataReader.js             # Reads static test data from data/*.json
├── data/
│   └── users.json                    # Static test data (roles, statuses, search terms)
├── config/
│   └── env.js                        # Central place that reads .env.<ENV> into one object
├── storage/                          # Saved login session (storageState) per environment
├── .github/workflows/                # CI pipeline (GitHub Actions)
├── playwright.config.js              # Playwright + playwright-bdd wiring, projects, reporters
└── .env.example                      # Reference list of required environment variables
```

---

## 5. How the Pieces Connect (Request Flow)

### 5a. From Gherkin to a browser action

```
 features/*.feature                 tests/step-definitions/**/*.steps.js        src/pages/*.js
┌───────────────────────┐          ┌───────────────────────────────┐          ┌────────────────────┐
│ Given the user is on   │  Gherkin │ Given('the user is on the      │  calls   │ class LoginPage {   │
│ the login page         │ ───────► │ login page', async () => {     │ ───────► │   navigate() {...}  │
│                        │  text    │   await loginPage.navigate();  │  method  │   login() {...}     │
│ When the user logs in  │  match   │ })                              │          │ }                    │
│ ...                     │          │                                 │          └─────────┬──────────┘
└───────────────────────┘          └───────────────────────────────┘                    │ drives
                                                                                          ▼
                                                                          ┌───────────────────────────┐
                                                                          │ Playwright (Chromium)      │
                                                                          │  -> OrangeHRM Demo App     │
                                                                          └─────────────┬─────────────┘
                                                                                        │ network
                                                                                        ▼
                                                                          ┌───────────────────────────┐
                                                                          │ API response captured &    │
                                                                          │ asserted (apiState fixture)│
                                                                          └───────────────────────────┘
```

- **`.feature` file** — the scenario in plain English/Gherkin (what the assignment calls "BDD-style").
- **Step definition** (`*.steps.js`) — matches each Gherkin line by text, and calls into a Page Object.
- **Page Object** (`src/pages/*.js`) — owns the locators and actions for one screen; step
  definitions never talk to raw Playwright locators directly.
- **`apiState` fixture** — several steps capture the underlying API response (e.g. `POST /admin/saveSystemUser`)
  so assertions check *both* what the UI shows *and* what the backend actually persisted. This is
  what the `@sit` tag marks.

### 5b. From feature file to an executable test (`bddgen`)

```
 features/*.feature  +  tests/step-definitions/**/*.js
              │
              ▼  npx bddgen  (wired in playwright.config.js via defineBddConfig)
              │
              ▼
 .features-gen/  ← auto-generated Playwright spec files (gitignored, regenerated every run)
              │
              ▼  npx playwright test
              │
              ▼
 playwright-report/  (HTML report, screenshots on failure, trace on retry)
```

`playwright-bdd` doesn't run `.feature` files directly — it *compiles* them into normal Playwright
test files first (`bddgen`), then the standard Playwright test runner executes those. The `npm test`
/ `npm run test:*` scripts always run `bddgen` before `playwright test` so this step is never missed.

### 5c. Shared session across the whole journey

Because the 11 scenarios are one continuous story (not 11 independent tests), `tests/step-definitions/fixtures.js`
defines **worker-scoped** fixtures instead of Playwright's default per-test ones:

- `sharedPage` — one browser page reused by every scenario in the file, so "create user" and
  "search for that user" happen in the same live session.
- `userContext` — a scratch object carrying data forward (e.g. the username generated during
  "create" is read again during "search" and "edit").
- `apiState` — holds the most recently captured network response for the next assertion step.

---

## 6. Assumptions & Limitations

- **Scenarios are stateful, by design.** The feature is written as one ordered journey sharing a
  browser session and in-memory data (`userContext`), not 11 independent tests. This keeps the
  scenario file readable as a real business story, but means scenarios **cannot** be reordered,
  parallelized, or safely tag-filtered in isolation today (see the smoke/SIT caveat above).
- **Single browser project (Chromium) is enabled.** Firefox/WebKit projects exist in
  `playwright.config.js` but are commented out, to keep local/CI run time short for this
  assignment's scope — a deliberate tradeoff, not an oversight.
- **Test data depends on a live public demo instance.** `opensource-demo.orangehrmlive.com` is a
  shared public sandbox; other users' activity (or periodic data resets OrangeHRM performs on it)
  could occasionally affect assumptions like "Employee X exists" in `data/users.json`.
- **Unique usernames per run.** `dataGenerator.js` generates a random username/password each run
  specifically so re-running the suite never collides with a previous run's leftover data — there
  is no teardown/cleanup step that deletes created users afterward.
- **No cross-browser or mobile-viewport coverage** in this submission — scope was kept to proving
  out the workflow and framework design, not maximum device coverage.
- **CI runs the full suite**, not a smoke/regression split, because of the stateful-scenario
  limitation above — see [Suggested Improvements](#7-suggested-improvements).

---

## 7. Suggested Improvements

1. **Decouple scenario state** so each scenario can seed its own preconditions (e.g. create a user
   via a direct API call in a `Before` hook, instead of relying on a previous UI scenario having
   opened a form). This would make `@smoke` / `@sit` genuinely safe to run standalone, unlocking a
   real fast-feedback smoke gate on every push and a fuller regression run only nightly/pre-release.
2. **Split CI into a smoke job (on every push) and a regression job (nightly / pre-release)** once
   (1) is done — directly addressing "long regression execution cycles" from the assignment brief.
3. **Add a cleanup/teardown step** (via API) that deletes users created during the run, so the
   shared demo environment doesn't accumulate test data over time.
4. **Richer reporting** — e.g. `playwright-bdd`'s Cucumber-style HTML/JSON report or Allure, to get
   scenario-level (not just spec-level) pass/fail visibility mapped back to Gherkin text, directly
   addressing "weak reporting and visibility."
5. **Re-enable Firefox/WebKit projects** behind a CI matrix once run time budget allows, for real
   cross-browser confidence.
6. **Add ESLint/Prettier** for consistent step-definition and page-object style as the suite grows.
7. **Visual/accessibility checks** (e.g. `@axe-core/playwright`) could be layered onto the existing
   page objects with minimal extra code.

---

## 8. Test Classification and Tags

| Tag | Meaning | Scenarios |
|---|---|---|
| `@smoke` | Minimal, fast, critical happy path — must pass on every push | Login, Navigate, Create, Search, Update, Logout |
| `@regression` | Full functional coverage — applied to every scenario (superset of `@smoke`) | All 11 |
| `@sit` | System Integration Test — the scenario asserts the **backend API response**, not just the UI, verifying the action actually persisted correctly | Login, Create, Update, Logout |
| `@negative` | Invalid/edge-case input handling | Empty form submission, search for a non-existent user |

**Reasoning:** `@smoke` is a subset of `@regression` (every scenario is a regression scenario; the
fast-path subset is additionally marked smoke). `@sit` is orthogonal to the other two — it marks
*which* scenarios validate the UI-to-backend contract (does the change the UI shows actually match
what the API/database now holds), as opposed to scenarios that only check what's rendered on
screen. Pure UI checks with no backend contract to verify (login page load, edit-form
pre-populate, reset-filters) stay `@regression`-only.

---

## 9. QA / Automation Approach — Summary

The goal was to design a **maintainable**, **readable**, and **honest** automation framework, not
just a pile of passing tests:

- **BDD (Gherkin) as the source of truth** for what's being tested, so the workflow reads like a
  business story a non-engineer could review.
- **Page Object Model** keeps locators/actions in one place per screen, so a UI change means
  editing one file, not every scenario that touches that screen.
- **UI + API assertions together** — every "save" action is verified both by what the screen shows
  *and* by re-fetching the record via API, catching the class of bug where the UI looks right but
  the backend state is wrong (or vice versa).
- **Multi-environment config** (`qa`/`staging`/`prod` via `.env.*` + `ENV=`) so the same suite can
  target different environments without code changes.
- **Tag-based classification** (`@smoke`/`@regression`/`@sit`/`@negative`) to make coverage
  intent explicit and reviewable, directly addressing this assignment's "unclear smoke coverage"
  concern — even where (honestly documented) the current stateful design limits standalone
  tag-filtered execution today.
- **CI on every push/PR** via GitHub Actions, generating and running the suite, uploading the HTML
  report as a build artifact for visibility.
- Where a tradeoff was made (single browser, no teardown, stateful scenarios), it's called out
  explicitly above rather than silently left for a reviewer to discover — maintainability and
  honesty about scope were prioritized over maximizing scenario count.
