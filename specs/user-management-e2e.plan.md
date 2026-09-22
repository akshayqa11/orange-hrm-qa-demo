# OrangeHRM User Management End-to-End Workflow

## Application Overview

## Application Under Test
OrangeHRM demo application (verified live at `https://opensource-demo.orangehrmlive.com/web/index.php/...`, project is a Playwright + playwright-bdd JavaScript/Cucumber project on branch `feature/bdd`). The exact base URL used by the automation should be confirmed from `playwright.config.js` / `.env.qa` (the seed-page setup for this plan showed an env named `.env.qa` being injected), rather than hardcoded, since this plan's exploration was done directly against the public demo URL.

**Note on repository inspection**: The planning tool session in this environment did not expose filesystem/read access to the repository (`specs/`, `tests/`, `src/`, `features/`, `config/`, `data/`, `storage/` directories were visible only via `git status`, not readable). This plan therefore documents exact selectors/URLs/API behavior observed by live-driving the browser and network tab, but the automation engineer implementing these scenarios MUST align step-definition/page-object/fixture/data-generation code with whatever conventions already exist in `src/`, `tests/`, and `data/` in the repository (e.g. existing Page Object classes, custom fixtures, data-faker utilities) rather than re-inventing them. ⚠️ Needs verification: confirm exact existing conventions in `src/pages`, `src/steps` (or equivalent) and `data/` before implementation.

## Business flow
A single continuous "User Management" journey: an Admin logs in, creates a new System User via Admin → User Management → Add User, verifies the user was actually persisted (via API, not just a UI toast), searches for the user, edits/updates it, verifies the update persisted via API, performs a negative search, resets the search filters, and finally logs out. All scenarios in the feature file are **ordered and stateful** — later scenarios reuse the browser/login session and the dynamically generated user data (id, username) created by earlier scenarios. This is an explicit design choice for this flow (per task requirements) and differs from the usual "fully independent scenario" guidance; implement using a shared Cucumber World / scenario context (or equivalent already-established pattern in the repo) to pass the created user's `id`/`username` between steps.

## Key facts verified live (2026-09-21) against opensource-demo.orangehrmlive.com
- Login page: `GET /web/index.php/auth/login` — page title "OrangeHRM", shows a heading "Login" and a hint block "Username : Admin" / "Password : admin123".
- Login submit is a classic form POST (not JSON/XHR): `POST /web/index.php/auth/validate` with `content-type: application/x-www-form-urlencoded`, returns **302** with `location` header pointing to `/web/index.php/dashboard/index`. Browser then performs `GET /web/index.php/dashboard/index` → **200**.
- Dashboard page: URL `/web/index.php/dashboard/index`, title "OrangeHRM", heading "Dashboard" visible in banner.
- Admin nav link routes to `GET /web/index.php/admin/viewSystemUsers` (heading "Admin / User Management", sub-heading "System Users"). This is the System Users list page with search filters: **Username** (text), **User Role** (custom dropdown: `-- Select --`, `Admin`, `ESS`), **Employee Name** (autocomplete text "Type for hints..."), **Status** (custom dropdown: `-- Select --`, `Enabled`, `Disabled`), plus **Reset** and **Search** buttons, an **Add** button, and a results table with a "(<n>) Record(s) Found" / "No Records Found" label above it.
- List/search data API: `GET /web/index.php/api/v2/admin/users?limit=50&offset=0&sortField=u.userName&sortOrder=ASC` (unfiltered) or with query params appended per filter, e.g. `&username=<value>`. Response shape: `{"data":[...],"meta":{"total":<n>},"rels":[]}`. Status **200**.
- Clicking **Add** navigates to `GET /web/index.php/admin/saveSystemUser` — heading "Add User", fields: **User Role\*** (dropdown: `Admin`, `ESS`), **Employee Name\*** (autocomplete), **Status\*** (dropdown: `Enabled`, `Disabled`), **Username\*** (text), **Password\*** (text) with helper text "For a strong password...", **Confirm Password\*** (text), buttons **Cancel**/**Save**.
- Submitting the Add User form completely empty triggers **client-side validation only** (no network call): inline "Required" text appears under User Role, Employee Name, Status, Username and Password; Confirm Password shows "Passwords do not match" (since both are empty they're considered non-matching, not "Required").
- Typing partial text (e.g. "Raj") into Employee Name shows an autocomplete `listbox` of matching employees (e.g. "Raj Deshmukh Employee"); must select an option from the list — free text alone does not associate an employee.
- Submitting a fully valid Add User form triggers **`POST /web/index.php/api/v2/admin/users`** with JSON body `{"username":"<u>","password":"<p>","status":true|false,"userRoleId":<n>,"empNumber":<n>}`, response **200** with body `{"data":{"id":<newId>,"userName":"<u>","deleted":false,"status":true|false,"employee":{"empNumber":<n>,"employeeId":"<id>","firstName":"...","middleName":"...","lastName":"...","terminationId":null},"userRole":{"id":<n>,"name":"Admin|ESS","displayName":"..."}},"meta":[],"rels":[]}`. Note: two `GET /web/index.php/api/v2/admin/validation/user-name?userName=<u>` calls (200) fire as live username-uniqueness validation while typing/before submit.
- After successful create, the app redirects to the **unfiltered** `viewSystemUsers` list (a fresh `GET /api/v2/admin/users?...` without filters fires), and the newly created user row is visible in the table. ⚠️ Needs verification: an on-screen success toast/message is expected (OrangeHRM typically shows a "Successfully Saved" toast) but it was not captured in the accessibility snapshot during exploration because it likely auto-dismisses within ~2-3 seconds; the automation must assert on it immediately after save (e.g. via a fast/racing locator wait) and record the exact text actually rendered.
- Editing: clicking the row's Edit action navigates to `GET /web/index.php/admin/saveSystemUser/<id>` (id is the numeric user id, e.g. `.../saveSystemUser/158`), heading "Edit User". Form is pre-populated asynchronously (User Role, Employee Name, Status, Username appear after a brief load) and additionally shows a **"Change Password ?"** Yes checkbox (Password/Confirm Password fields are not shown unless this is checked). ⚠️ Each row in the Actions column has 2 icon buttons (Edit=pencil, Delete=trash); during exploration a mis-targeted locator accidentally opened the **Delete confirmation dialog** ("Are you sure?" / "No, Cancel" / "Yes, Delete") — this dialog exists and must be handled/avoided; the automation should locate the Edit button by scoping to the specific row (e.g. row containing the created username) and using an accessible/robust locator (icon class or title), not a page-wide positional index, to avoid accidentally deleting records.
- Saving an edit fires **`PUT /web/index.php/api/v2/admin/users/<id>`** with JSON body `{"username":"<u>","password":"","status":true|false,"userRoleId":<n>,"empNumber":<n>,"changePassword":false}` (when password isn't being changed), response **200**. A `GET /web/index.php/api/v2/admin/users/<id>` (200) also fires (used to populate/refresh the edit form). After save, redirects back to the **unfiltered** System Users list (search filters are cleared).
- Search: entering a value and clicking Search fires `GET /web/index.php/api/v2/admin/users?...&username=<value>&sortField=u.userName&sortOrder=ASC` → 200 with `meta.total` reflecting the match count; UI label reads **"(<n>) Record Found"** (singular, n=1) or **"(<n>) Records Found"** (plural, n>1). Searching by an exact, unique username returns exactly 1 record (`meta.total:1`); searching by a common Employee Name (this shared demo environment has many "Raj Employee"-named accounts) can return many records — the plan explicitly branches on this.
- Negative search: an unmatched username shows the label **"No Records Found"** and an empty table body (no rows), still with a **200** response and `meta.total:0`/empty `data` array.
- Reset: clicking **Reset** with all filters populated clears the Username text field, resets both dropdowns back to `-- Select --`, clears the Employee Name autocomplete field, and reloads the full unfiltered list (record count returns to the pre-search total).
- Logout: clicking the top-right user menu (profile name, e.g. "Raj Employee") opens a menu with **About / Support / Change Password / Logout**. Clicking **Logout** fires `GET /web/index.php/auth/logout` → **302** redirecting to `/web/index.php/auth/login`. Subsequently attempting to navigate directly to a protected URL (e.g. `/web/index.php/admin/viewSystemUsers`) redirects back to `/web/index.php/auth/login`, confirming the session was invalidated.

## Data requirements
- A unique username per test run (e.g. timestamp/uuid-suffixed) is required for Add User, Search, and Edit scenarios, to avoid collisions in this shared, persistent demo environment (49+ pre-existing users observed) and to guarantee "exactly 1 record" search results.
- An existing employee record must be selected via the Employee Name autocomplete (values are environment/data-dependent — do not hardcode a specific employee name as a long-term assumption; resolve dynamically at run time, e.g. by typing a short substring and picking the first/matching suggestion, or via a known seed employee if the repo's `data/` already defines one).
- A valid strong password value satisfying the app's (client-side, unvalidated in this exploration) password guidance is required for create; update in this plan avoids changing the password (Change Password left unchecked) — a distinct scenario could be added later to cover password change specifically, flagged as out of scope here.


## Test Scenarios

### 1. User Management End-to-End Workflow

**Seed:** `n/a - fresh authenticated browser session per feature run; align with existing seed pattern in repo if one exists`

#### 1.1. TC-001 @smoke @login - Login page loads with expected elements

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user navigates to the application login URL
    - expect: The page title is "OrangeHRM"
    - expect: A "Login" heading is visible
    - expect: Username and Password textboxes and a "Login" button are visible

#### 1.2. TC-002 @smoke @login - Login with valid Admin credentials redirects to Dashboard

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the login page
  2. When the user enters a valid registered admin username and password and clicks the "Login" button
    - expect: UI: the browser navigates to URL ending in /dashboard/index
    - expect: UI: the page title remains "OrangeHRM" and a "Dashboard" heading is visible
    - expect: API: POST /web/index.php/auth/validate returns status 302 with a Location header pointing to the dashboard URL
    - expect: API: the subsequent GET /web/index.php/dashboard/index returns status 200

#### 1.3. TC-003 @smoke @navigation - Navigate to Admin User Management (System Users) page

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is logged in and on the Dashboard
  2. When the user clicks the "Admin" link in the side navigation
    - expect: UI: URL is /web/index.php/admin/viewSystemUsers
    - expect: UI: heading shows "Admin" / "User Management" and a "System Users" section heading
    - expect: UI: Username, User Role, Employee Name, and Status search fields plus Reset, Search and Add controls are visible
    - expect: API: GET /web/index.php/api/v2/admin/users?...&sortField=u.userName&sortOrder=ASC returns status 200

#### 1.4. TC-004 @negative @validation @user-management - Submitting empty Add User form shows required-field validation and creates no user

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the System Users page and clicks the "Add" button
    - expect: UI: URL is /web/index.php/admin/saveSystemUser and an "Add User" heading is visible
  2. When the user clicks "Save" without filling any field
    - expect: UI: a "Required" validation message is shown under User Role, Employee Name, Status, Username, and Password
    - expect: UI: a "Passwords do not match" message is shown under Confirm Password
    - expect: UI: the user remains on the Add User form (no navigation)
    - expect: API: no POST request to /web/index.php/api/v2/admin/users is made (verify via network capture)

#### 1.5. TC-005 @smoke @create @user-management - Create a new system user with valid unique data and verify persistence via API

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the Add User form with a freshly generated unique username, a valid password/confirm password, User Role "Admin", Status "Enabled", and a resolved Employee Name selected from the autocomplete
    - expect: UI: each field reflects the entered/selected value before submitting
  2. When the user clicks "Save"
    - expect: API: POST /web/index.php/api/v2/admin/users returns status 200 with response body data.userName matching the generated username, data.status true, and data.userRole.name "Admin"
    - expect: UI: the user is redirected to the unfiltered System Users list
    - expect: UI: a success confirmation is displayed immediately after save (⚠️ needs verification: capture and record exact toast text/timing since it may auto-dismiss quickly)
    - expect: UI: the new username row appears in the table with the expected User Role, Employee Name, and Status values
    - expect: Store the created user's id (from the POST response) and username in scenario context for use by later scenarios
  3. And the test performs a follow-up GET for the created user (e.g. GET /web/index.php/api/v2/admin/users/<id> or a filtered GET .../api/v2/admin/users?username=<value>)
    - expect: API: response returns status 200 and the returned user record's username, status, and userRole match exactly what was submitted — this is required in addition to (not instead of) the UI success message, since a success message alone does not confirm persistence

#### 1.6. TC-006 @smoke @search @user-management - Search for the created user by username and resolve to a single correct record

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the System Users list and the previously created username is available in scenario context
  2. When the user enters the exact created username into the Username search field and clicks "Search"
    - expect: API: GET /web/index.php/api/v2/admin/users?...&username=<value>&sortField=u.userName&sortOrder=ASC returns status 200 with meta.total
    - expect: UI: the results label reads "(1) Record Found" (branch: if the API/UI ever returns more than 1 record for a supposedly-unique username, the test must fail fast rather than silently pick the first row, since search may return 1 or many records depending on the filter used — this scenario asserts the count is exactly 1 for a unique username)
    - expect: UI: the single displayed row's Username, User Role, Employee Name, and Status match the values stored from TC-005
  3. And the user locates the Edit action scoped to that specific row (not by page-wide position, to avoid the adjacent Delete action)
    - expect: UI: the row's Edit control is uniquely identifiable and does not trigger the Delete confirmation dialog

#### 1.7. TC-007 @regression @edit @user-management - Edit form loads pre-populated with the created user's existing data

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user clicks the Edit action for the created user's row from the search result
    - expect: UI: URL matches /web/index.php/admin/saveSystemUser/<id> where <id> equals the id captured in TC-005
    - expect: UI: an "Edit User" heading is visible
    - expect: API: GET /web/index.php/api/v2/admin/users/<id> returns status 200
  2. When the edit form finishes loading
    - expect: UI: User Role, Employee Name, Status, and Username fields are pre-populated with the values created/expected from TC-005
    - expect: UI: a "Change Password ?" toggle is visible and unchecked by default

#### 1.8. TC-008 @smoke @edit @user-management - Update the created user's Username and Status and verify persistence via API

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the Edit User form for the created user
  2. When the user changes the Username to a new unique value and changes Status from "Enabled" to "Disabled", then clicks "Save"
    - expect: UI: fields reflect the new values before saving
    - expect: API: PUT /web/index.php/api/v2/admin/users/<id> returns status 200 with request body reflecting the updated username and status:false
    - expect: UI: a success confirmation is displayed immediately after save (⚠️ needs verification: exact text/timing)
    - expect: UI: the user is redirected to the unfiltered System Users list
    - expect: UI: the updated username and "Disabled" status are visible in the table
    - expect: Update scenario context with the new username for later scenarios
  3. And the test performs a follow-up GET for the same user id (GET /web/index.php/api/v2/admin/users/<id>)
    - expect: API: response returns status 200 and the returned record's username equals the new username and status equals false — required in addition to the UI success message to confirm the update was actually persisted, not just acknowledged by the UI

#### 1.9. TC-009 @negative @search @user-management - Searching with a non-matching value shows no records

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the System Users list
  2. When the user enters a random, guaranteed-non-existent string into the Username search field and clicks "Search"
    - expect: API: GET /web/index.php/api/v2/admin/users?...&username=<random> returns status 200 with an empty data array / meta.total 0
    - expect: UI: the results label reads exactly "No Records Found" (as observed live; do not assume alternate wording)
    - expect: UI: the results table body contains no data rows

#### 1.10. TC-010 @regression @search @user-management - Reset clears all populated search filters and restores the default list

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is on the System Users list and populates the Username field, selects a User Role, types into Employee Name, and selects a Status
    - expect: UI: all four fields show the populated values before reset
  2. When the user clicks "Reset"
    - expect: UI: the Username and Employee Name text fields are empty
    - expect: UI: the User Role and Status dropdowns display "-- Select --"
    - expect: UI: the results list reloads and the record count returns to the full, unfiltered total (matching the count observed prior to any filtering in this session)
    - expect: API: an unfiltered GET /web/index.php/api/v2/admin/users?...&sortField=u.userName&sortOrder=ASC (no filter query params) returns status 200

#### 1.11. TC-011 @smoke @logout - Logout invalidates the session and redirects to the login page

**File:** `features/user-management-e2e.feature`

**Steps:**
  1. Given the user is logged in and on any authenticated page
  2. When the user opens the top-right user profile menu and clicks "Logout"
    - expect: API: GET /web/index.php/auth/logout returns status 302 with a Location header pointing to the login page
    - expect: UI: the browser ends up on /web/index.php/auth/login with the "Login" heading visible
  3. And the test attempts to navigate directly to a previously-accessible protected URL (e.g. /web/index.php/admin/viewSystemUsers)
    - expect: UI: the app redirects back to /web/index.php/auth/login, confirming the session/cookie is no longer valid and protected routes are inaccessible
