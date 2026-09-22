# Login Feature (Standalone, Parallel-Safe) Test Plan

## Application Overview

## Application Overview
OrangeHRM demo app (https://opensource-demo.orangehrmlive.com) — the actual base URL is resolved at runtime via `config/env.js`, which reads `.env.<ENV>` (default `qa`). This plan targets a NEW, standalone, additive Login feature, independent from the existing serial `features/user-management/user-management-e2e.feature`, which must not be touched or duplicated.

### Target artifacts
- Feature file: `features/authentication/login.feature`
- Step definitions: `tests/step-definitions/authentication/login-standalone.steps.js` (new file — deliberately not `login.steps.js`, which is already wired to the existing serial e2e feature, to avoid step collisions/ambiguous step matches in cucumber)
- Page objects: reuse `src/pages/LoginPage.js` and `src/pages/DashboardPage.js` as-is where possible; extend `LoginPage.js` with one new locator for the invalid-credentials alert (see below) if it does not already exist
- New test data file: `data/login-credentials.json` (invalid/empty credential fixtures only — never real/valid credentials)
- Existing data: `data/users.json` (`validUser`, marked `from_env`) — valid credentials continue to be sourced from `config/env.js`, per existing convention in `tests/step-definitions/authentication/login.steps.js`. Never hardcode real credentials in JSON or step defs.

### Key facts verified live (2026-09-22, against https://opensource-demo.orangehrmlive.com)
- Login page: `GET /web/index.php/auth/login`. Page title "OrangeHRM". Heading (level 5) "Login". Textboxes with accessible names "Username" and "Password". Button with accessible name "Login".
- Demo credential hint shown on page (decorative, not to be treated as a functional locator): "Username : Admin" / "Password : admin123".
- **Empty submit**: Clicking Login with both fields empty does NOT fire the `/auth/validate` request (client-side validation only); two elements with exact text "Required" appear (one under Username, one under Password); URL remains `/web/index.php/auth/login`. This matches the existing `LoginPage.requiredErrors` locator (`page.getByText('Required', { exact: true })`).
- **Invalid credentials submit**: Clicking Login with a non-empty but wrong username/password DOES fire `POST /web/index.php/auth/validate`, which responds **302** (redirects back to the login page, not to dashboard). The rendered login page then shows a `role=alert` element containing a `<p>` with exact text **"Invalid credentials"**. URL remains `/web/index.php/auth/login`. Suggested new locator to add to `LoginPage.js`: `this.invalidCredentialsAlert = page.getByRole('alert').filter({ hasText: 'Invalid credentials' })` (or simply `page.getByText('Invalid credentials', { exact: true })`).
- **Valid credentials submit**: `POST /web/index.php/auth/validate` responds **302**, browser follows redirect to `/web/index.php/dashboard/index`, page title remains "OrangeHRM". This matches `LoginPage.login()` which already returns the `/auth/validate` response for assertion.
- **Logout**: Clicking the user dropdown (top right) then the "Logout" menu item navigates back to `/web/index.php/auth/login`. After logout, directly navigating to a protected URL (e.g. `/web/index.php/pim/viewEmployeeList`) redirects back to `/web/index.php/auth/login`, confirming the session/cookie was invalidated. This matches `DashboardPage.logout()`.

### Data requirements
- Empty-field scenario needs no data (both fields left blank).
- Invalid-credentials scenario(s) need wrong username and/or wrong password strings — sourced from the new `data/login-credentials.json` file via `src/utils/dataReader.js`, never hardcoded inline in step definitions or the feature file's Examples table (Examples table may reference named data keys/aliases, with actual string values resolved from the JSON fixture, OR the JSON fixture can directly supply the Examples-equivalent structure consumed by the step defs — implementer's choice, but no literal invalid-credential strings should live in the `.feature` file or step defs).
- Valid-credentials scenario needs the existing `validUser` entry from `data/users.json` / `config/env.js` — never a new hardcoded value.

### Parallel execution requirement (explicit contrast with existing serial e2e feature)
Unlike `features/user-management/user-management-e2e.feature`, which uses `@mode:serial` and a worker-scoped `sharedPage` fixture to run one continuous stateful journey, **every scenario in this new Login feature must be independent and safe to run in parallel**:
- No `@mode:serial` tag on the feature or any scenario.
- Each scenario uses the framework's default, scenario-scoped `page` fixture (a fresh browser context/page per scenario), not the worker-scoped `sharedPage`.
- No scenario may depend on state (cookies, session, prior navigation) left behind by another scenario. Each scenario starts from `LoginPage.navigate()`, which already clears cookies before navigating to the login page, guaranteeing a clean slate.
- Scenarios may be distributed across multiple Playwright workers and execute in any order or interleaving.

## Test Scenarios

### 1. Authentication - Login (Standalone, Parallel)

**Seed:** `tests/setup/auth.setup.js`

#### 1.1. TC-L01: Empty username and password shows required-field validation

**File:** `features/authentication/login.feature`

**Steps:**
  1. Given a user is on the Login page (fresh/unauthenticated browser context)
    - expect: The page title is "OrangeHRM" and the "Login" heading (level 5) is visible
    - expect: The Username and Password textboxes and the Login button are visible
  2. When the user clicks the Login button without entering a username or password
    - expect: No POST to /web/index.php/auth/validate is triggered (client-side validation blocks submission) — ⚠️ Needs verification if the codebase intends to assert network activity here, since none was observed live
  3. Then two "Required" validation messages are displayed, one below the Username field and one below the Password field
    - expect: Exactly 2 elements with exact text "Required" are visible (matches existing LoginPage.requiredErrors locator)
    - expect: The user remains on /web/index.php/auth/login
    - expect: The Login heading is still visible

#### 1.2. TC-L02: Invalid credentials show 'Invalid credentials' error (Scenario Outline: wrong username, wrong password, both wrong)

**File:** `features/authentication/login.feature`

**Steps:**
  1. Given a user is on the Login page (fresh/unauthenticated browser context)
    - expect: The Login heading is visible
  2. When the user enters a "<credentialSet>" username/password pair (sourced from data/login-credentials.json, e.g. valid-username+wrong-password, wrong-username+valid-looking-password, wrong-username+wrong-password) and clicks the Login button
    - expect: A POST request to /web/index.php/auth/validate is fired and responds with HTTP 302 (redirect back to the login page, not to dashboard)
  3. Then an "Invalid credentials" error alert is displayed and the user remains on the login page
    - expect: A role=alert element containing the exact text "Invalid credentials" is visible
    - expect: The URL remains /web/index.php/auth/login
    - expect: The Login heading is still visible
    - expect: No "Required" field errors are shown

#### 1.3. TC-L03: Valid credentials log the user in and redirect to Dashboard

**File:** `features/authentication/login.feature`

**Steps:**
  1. Given a user is on the Login page (fresh/unauthenticated browser context)
    - expect: The Login heading is visible
  2. When the user enters a valid registered user's username and password (sourced from config/env.js per existing convention, e.g. validUser) and clicks the Login button
    - expect: A POST request to /web/index.php/auth/validate is fired and responds with HTTP 302
  3. Then the user is redirected to the Dashboard page
    - expect: Final URL is /web/index.php/dashboard/index
    - expect: Page title is "OrangeHRM"
    - expect: DashboardPage.verifyLoaded() assertions pass (e.g. dashboard-specific heading/widget visible)

#### 1.4. TC-L04: Logout invalidates the session and redirects to Login; protected pages become inaccessible

**File:** `features/authentication/login.feature`

**Steps:**
  1. Given a user is logged in with valid credentials and is on the Dashboard page (fresh browser context for this scenario, login performed as part of this scenario's Given, not reused from another scenario)
    - expect: Final URL is /web/index.php/dashboard/index before proceeding
  2. When the user opens the user dropdown menu and clicks "Logout"
    - expect: The user is navigated away from the dashboard
  3. Then the user is redirected to the Login page
    - expect: Final URL is /web/index.php/auth/login
    - expect: The Login heading is visible
  4. When the user attempts to directly navigate to a protected/authenticated URL (e.g. /web/index.php/pim/viewEmployeeList)
  5. Then the user is redirected back to the Login page instead of seeing the protected page
    - expect: Final URL is /web/index.php/auth/login, confirming the session/cookie was invalidated by logout
