# orange-hrm-qa-demo

BDD automation for **OrangeHRM Demo** — Login, User Management (search, create, edit/update),
and Logout — built with **Playwright + JavaScript + Cucumber/Gherkin (`playwright-bdd`) + Page
Object Model**.

---

## 1. Setup

```bash
npm install                       # installs Playwright, playwright-bdd, everything
npx playwright install --with-deps
cp .env.example .env.qa           # fill in BASE_URL / USERNAME / PASSWORD
```

**Cucumber HTML report — no extra install needed.** `playwright-bdd` ships its own Cucumber
report generator (`playwright-bdd/reporter/cucumber`) as part of the same package installed
above — it's already wired into `playwright.config.js`. Every test run produces two reports
automatically:

```bash
npm run report            # Playwright's own HTML report
npm run report:cucumber   # Cucumber-style report (Feature > Scenario > Step, with tags)
```

---

## 2. How to Run

| Command | Runs |
|---|---|
| `npm test` | Everything |
| `npm run test:smoke` | `@smoke` tagged scenarios |
| `npm run test:login` | Login feature, in parallel, headed |
| `npm run test:user-crud` | Parallel create + dependent delete |
| `npm run test:qa` | Full suite, `qa` environment, headed |

---

## 3. Project Structure

```
features/            Gherkin .feature files (what is being tested)
tests/step-definitions/   Glue code: Gherkin step -> Playwright action
src/pages/            Page Object Model - one class per screen
config/env.js         Environment config (qa/staging/prod)
playwright.config.js  Projects, parallel/serial rules, reporters
```

**Flow:** `.feature` file → step definition → page object → browser → app, with API
response checked alongside the UI for every save action.

---

## 4. Test Classification

| Tag | Meaning |
|---|---|
| `@smoke` | Fast, critical path |
| `@regression` | Full coverage |
| `@sit` | UI + API integration check |
| `@negative` | Invalid input handling |

---

## 5. Assumptions

- Runs against the public OrangeHRM demo with the provided Admin credentials.
- One browser (Chromium) is used to keep runs fast; the framework supports adding more.
- Each run creates its own unique test user, so runs never clash with each other.

## 6. Limitations

- The main User Management journey runs as one connected flow (shared session), by design,
  so its scenarios stay ordered and readable as a real business story.

## 7. Suggested Improvements

- Add a cleanup step to delete users created during test runs.
- Add cross-browser runs (Firefox/WebKit) once time budget allows.
- Add ESLint/Prettier for consistent code style.

---

## 8. QA/Automation Approach

Built for maintainability, not just passing tests: BDD for readable specs, Page Object Model
for one-place UI changes, UI + API checks together for real confidence, and tags for clear
smoke/regression/SIT visibility.
