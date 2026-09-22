# System User CRUD - Parallel Create/Update with Dependent API Delete

## Application Overview

This plan covers a NEW, additive "System User CRUD" feature for the OrangeHRM demo app (Admin > User Management > System Users), separate from the existing serial journey in features/user-management/user-management-e2e.feature. It must NOT modify or duplicate that file.

Application facts (live-verified on opensource-demo.orangehrmlive.com, 2026-09-22, OrangeHRM OS 5.9):
- System Users list: GET /web/index.php/admin/viewSystemUsers. "Add" button opens GET /web/index.php/admin/saveSystemUser with heading "Add User" and fields: User Role* (dropdown: Admin/ESS), Employee Name* (autocomplete textbox "Type for hints...", type text then click an option from the listbox), Status* (dropdown: Enabled/Disabled), Username*, Password*, Confirm Password*, Cancel/Save buttons.
- CREATE: clicking Save fires POST /web/index.php/api/v2/admin/users with JSON body {username, password, status (boolean), userRoleId (number), empNumber (number)}. Response: 200, application/json. The list GET (/api/v2/admin/users?...) response for the created row confirms shape {"data":[...{id, userName, deleted, status, employee:{empNumber, employeeId, firstName, middleName, lastName, terminationId}, userRole:{id, name, displayName}}...], "meta":{"total":N}, "rels":[]}. After save, the app redirects to the unfiltered System Users list (viewSystemUsers) and a toast appears: title "Success", message "Successfully Saved" (auto-dismisses after a few seconds; a close "x" button is also present).
- EDIT: row's second action-icon (pencil, rightmost of the two icons in the Actions cell) navigates to GET /web/index.php/admin/saveSystemUser/<id>, heading "Edit User". Form is pre-populated (User Role, Employee Name, Status, Username) plus a "Change Password ?" checkbox (unchecked by default; password fields only appear/are required if checked "Yes"). Saving fires PUT /web/index.php/api/v2/admin/users/<id> with JSON body {username, password (empty string if not changed), status (boolean), userRoleId, empNumber, changePassword (boolean)}. Response: 200. Redirects to unfiltered list; toast: title "Success", message "Successfully Updated".
- DELETE: row's first action-icon (leftmost of the two icons in the Actions cell) opens a confirmation dialog ("Are you Sure?" / "The selected record will be permanently deleted. Are you sure you want to continue?" with "No, Cancel" / "Yes, Delete" buttons). Confirming fires DELETE /web/index.php/api/v2/admin/users (note: DELETE verb, no id in the URL path) with JSON body {"ids":[<id>, ...]} (array of numeric ids, supports bulk). Response: 200 with body {"data":["<id>", ...], "meta":[], "rels":[]} (ids returned as strings in the data array). This was confirmed live by triggering the UI delete action and inspecting the network call; the automated Scenario C must call this endpoint directly via an API request context (not through the UI).
- Auth: the project's existing Playwright "setup" project (tests/setup/auth.setup.js) logs in once and persists storageState to storage/<env>-auth.json; the "chromium" project already depends on "setup" and reuses that storageState. All scenarios in this new feature assume a session is already authenticated via this same storageState mechanism — no UI login steps in any of the 3 scenarios.
- Reusable data fixtures already present in data/users.json: newSystemUser {userRole: "Admin", status: "Enabled", employeeSearchTerm: "a"} and updatedSystemUser {status: "Disabled"}. Existing page objects to reuse/extend (read them before implementing, do not duplicate): src/pages/SystemUsersPage.js, src/pages/UserFormPage.js, src/pages/DashboardPage.js. Existing utilities to reuse: src/utils/dataGenerator.js (unique usernames), src/utils/dataReader.js. Verify at implementation time whether an existing API-request helper already exists under src/utils before adding a new one for the delete call.

Concurrency/dependency requirement: Scenario A (create+validate) and Scenario B (create+update+validate) must be able to run in PARALLEL, each in its own worker/context, with fully independent, uniquely-generated data (no shared mutable state). Scenario C (API delete, dependent) must run ONLY AFTER both A and B have completed successfully, enforced via a hard ordering dependency (Playwright project `dependencies`), not just a tag filter. A and B hand off their created user id/username to Scenario C via a small shared JSON file on disk (tests/.tmp/created-users.json), appended/merged since both A and B write to it independently.

Out of scope / do not touch: features/user-management/user-management-e2e.feature and its existing step-definitions (create-user.steps.js, edit-user.steps.js, search-user.steps.js) are a separate @mode:serial journey and must not be modified or duplicated.

## Test Scenarios

### 1. System User CRUD - Parallel Create/Update + Dependent API Delete

**Seed:** `tests/setup/auth.setup.js`

#### 1.1. TC-001 [P0] Create a new System User via UI and validate success message and create API response

**File:** `features/user-management/user-crud-parallel.feature`

**Steps:**
  1. Tags: @user-crud @parallel-create @smoke. Priority: P0. Execution: MUST be runnable in parallel with TC-002 (Scenario B), in a separate worker/browser context, with no shared mutable state other than the independent append to the tests/.tmp/created-users.json handoff file at the very end.
  2. Session-level precondition (one-time, reused across scenarios): the test user is already authenticated as an Admin-privileged user via the existing storageState mechanism (tests/setup/auth.setup.js -> storage/<env>-auth.json), consumed by the project the same way the existing 'chromium' project depends on 'setup'. No UI login is performed in this scenario.
  3. Scenario-level precondition: a fresh, unique username/employee-search combination is generated for this run (e.g. via src/utils/dataGenerator.js) so this scenario never collides with TC-002's data, other parallel runs, or leftover data from the existing serial feature.
  4. Data requirement: requires a dynamically generated unique username (e.g. prefixed 'qa_a_' + timestamp/uuid) and reuses static fields from data/users.json newSystemUser fixture (userRole: Admin, status: Enabled, employeeSearchTerm: 'a'). Requires a valid, randomly-generated strong password value (not hardcoded/shared across runs).
  5. Given the user is on the System Users list page (Admin > User Management > System Users, /web/index.php/admin/viewSystemUsers)
    - expect: The page shows heading 'System Users' and an 'Add' button
  6. When the user clicks the 'Add' button
    - expect: The user is navigated to /web/index.php/admin/saveSystemUser showing heading 'Add User' with fields User Role*, Employee Name*, Status*, Username*, Password*, Confirm Password*
  7. And the user selects User Role 'Admin' from the User Role dropdown
    - expect: The User Role field displays 'Admin'
  8. And the user types the employee search term into the Employee Name autocomplete field and selects the first matching option from the resulting listbox
    - expect: The Employee Name field is populated with the selected employee's full name
  9. And the user selects Status 'Enabled' from the Status dropdown
    - expect: The Status field displays 'Enabled'
  10. And the user enters the generated unique username into the Username field
  11. And the user enters a generated strong password into the Password field and the same value into the Confirm Password field
  12. And the user clicks the 'Save' button
    - expect: A POST request is sent to /web/index.php/api/v2/admin/users with JSON body {username, password, status: true, userRoleId: <Admin role id>, empNumber: <selected employee's empNumber>}
    - expect: The API responds with HTTP 200 and application/json content-type
    - expect: A toast/notification appears with title 'Success' and message 'Successfully Saved'
    - expect: The browser redirects to the unfiltered System Users list (/web/index.php/admin/viewSystemUsers)
  13. Then the newly created username should appear as a row in the System Users list
    - expect: A subsequent GET /web/index.php/api/v2/admin/users list call (or the row rendered from it) includes an entry whose userName matches the generated username, userRole.name is 'Admin', and status is true (Enabled)
  14. And the test captures the created user's numeric id and username (e.g. by reading it from the create API response context or by querying the list API for the just-created username) for later cleanup
    - expect: A non-null numeric id is obtained for the created user
  15. And the test appends {id, username, scenario: 'A'} for this run to the shared handoff file tests/.tmp/created-users.json (creating the file/array if absent, merging with any existing entries so a concurrently-running Scenario B does not overwrite its own entry)
    - expect: tests/.tmp/created-users.json exists on disk and contains an entry for this scenario's created user id/username after the scenario completes
  16. Success criteria
    - expect: Create API call (POST /api/v2/admin/users) returns HTTP 200 with a response/list shape matching the submitted username, status and role
    - expect: UI toast reads 'Success' / 'Successfully Saved'
    - expect: The created user is visible in the unfiltered System Users list
    - expect: The created user's id/username is persisted to tests/.tmp/created-users.json for Scenario C
  17. Failure criteria
    - expect: Create API call returns a non-200 status, or the response/list data does not reflect the submitted username/status/role
    - expect: No success toast appears, or toast text does not match 'Success' / 'Successfully Saved'
    - expect: The created user is missing from the System Users list after save
    - expect: The handoff file entry for this scenario's user is missing or malformed after scenario completion

#### 1.2. TC-002 [P0] Create a new System User via UI, then immediately update it, and validate both success messages and API responses

**File:** `features/user-management/user-crud-parallel.feature`

**Steps:**
  1. Tags: @user-crud @parallel-create. Priority: P0. Execution: MUST be runnable in parallel with TC-001 (Scenario A), in a separate worker/browser context, using entirely independent, uniquely-generated data (its own username, its own employee selection where feasible) so it never collides with TC-001's user.
  2. Session-level precondition (one-time, reused across scenarios): the test user is already authenticated as an Admin-privileged user via the existing storageState mechanism (tests/setup/auth.setup.js -> storage/<env>-auth.json). No UI login is performed in this scenario.
  3. Scenario-level precondition: a fresh, unique username is generated for this run (e.g. prefixed 'qa_b_' + timestamp/uuid), independent of TC-001's generated username, so the two scenarios never target the same row even though they run concurrently.
  4. Data requirement: requires a dynamically generated unique username for the initial create, plus an updated value (either a second generated username or the same username with status flipped) driven by data/users.json updatedSystemUser fixture (status: Disabled). Requires a valid, randomly-generated strong password value for creation (not hardcoded/shared across runs).
  5. Given the user is on the System Users list page (/web/index.php/admin/viewSystemUsers)
    - expect: The page shows heading 'System Users' and an 'Add' button
  6. When the user clicks the 'Add' button, selects User Role 'Admin', searches and selects an Employee Name from the autocomplete listbox, selects Status 'Enabled', enters the generated unique username, enters a generated strong password and matching confirm-password, and clicks 'Save'
    - expect: A POST request is sent to /web/index.php/api/v2/admin/users with JSON body {username, password, status: true, userRoleId, empNumber}
    - expect: The API responds with HTTP 200
    - expect: A toast appears with title 'Success' and message 'Successfully Saved'
    - expect: The browser redirects to the unfiltered System Users list
  7. And the test locates the newly created row in the System Users list and captures its numeric id (e.g. from the edit-icon link URL /web/index.php/admin/saveSystemUser/<id> or from the list API response)
    - expect: A non-null numeric id is obtained for the created user
  8. When the user clicks the row's Edit action icon for the just-created user
    - expect: The browser navigates to /web/index.php/admin/saveSystemUser/<id> showing heading 'Edit User' with the form pre-populated with the existing User Role, Employee Name, Status and Username values
  9. And the user changes the Status field to 'Disabled' (and/or updates the Username field to a new unique value per the updatedSystemUser fixture/data requirement)
    - expect: The Status field now displays 'Disabled' (and/or the Username field reflects the new value)
  10. And the user clicks the 'Save' button
    - expect: A PUT request is sent to /web/index.php/api/v2/admin/users/<id> with a JSON body reflecting the updated username/status (e.g. {username, password: '', status: false, userRoleId, empNumber, changePassword: false})
    - expect: The API responds with HTTP 200
    - expect: A toast appears with title 'Success' and message 'Successfully Updated'
    - expect: The browser redirects to the unfiltered System Users list
  11. Then the updated user's row in the System Users list should reflect the new status ('Disabled') and/or new username
    - expect: A subsequent GET /web/index.php/api/v2/admin/users list call (or the row rendered from it) shows status: false and/or the updated username for this user's id
  12. And the test appends {id, username: <final/updated username>, scenario: 'B'} for this run to the shared handoff file tests/.tmp/created-users.json (creating the file/array if absent, merging with any existing entries so a concurrently-running Scenario A does not overwrite its own entry)
    - expect: tests/.tmp/created-users.json exists on disk and contains an entry for this scenario's user id/username after the scenario completes
  13. Success criteria
    - expect: Create API call (POST) returns HTTP 200 with data matching submitted values; create toast reads 'Success' / 'Successfully Saved'
    - expect: Update API call (PUT /api/v2/admin/users/<id>) returns HTTP 200 with data matching the updated status/username; update toast reads 'Success' / 'Successfully Updated'
    - expect: The final row state in the System Users list reflects the updated values
    - expect: The user's id/final username is persisted to tests/.tmp/created-users.json for Scenario C
  14. Failure criteria
    - expect: Either the create or update API call returns a non-200 status, or response data does not reflect submitted values
    - expect: Either toast is missing or has unexpected text
    - expect: The row's final state does not reflect the update
    - expect: The handoff file entry for this scenario's user is missing or malformed after scenario completion

#### 1.3. TC-003 [P0] Delete the users created by TC-001 and TC-002 via direct API call, dependent on both completing first

**File:** `features/user-management/user-crud-parallel.feature`

**Steps:**
  1. Tags: @user-crud @delete-dependent. Priority: P0. Execution/config requirement: this scenario must run in a Playwright project that has a `dependencies` entry (in playwright.config.js) pointing at the project(s) that run TC-001 and TC-002, mirroring how the existing 'chromium' project already depends on 'setup'. Concretely: define one project (e.g. name 'user-crud-parallel-create', matching spec/tag @parallel-create, i.e. TC-001 + TC-002) and a second project (e.g. name 'user-crud-delete-dependent', matching tag @delete-dependent, i.e. TC-003 only) whose `dependencies: ['user-crud-parallel-create']` (in addition to its normal `dependencies: ['setup']` for the storageState). This guarantees TC-003 only starts after both TC-001 and TC-002 have finished, regardless of worker/parallelism settings for the create project itself. Document this exact config addition in the PR that implements this plan; do not edit playwright.config.js as part of this planning step.
  2. Session-level precondition (one-time, reused across scenarios): the test user is already authenticated as an Admin-privileged user via the existing storageState mechanism. This scenario uses an API request context (not the UI) for the delete call itself, but may reuse the authenticated storageState/cookies for that request context so the API call is authorized the same way the UI-driven calls are.
  3. Scenario-level precondition: TC-001 and TC-002 have both completed successfully and each has appended its created user's {id, username} to tests/.tmp/created-users.json. This file is the sole hand-off mechanism between the parallel-worker scenarios and this dependent scenario (no in-memory sharing is possible across workers).
  4. Data requirement: requires reading tests/.tmp/created-users.json at runtime; no static test data values are hardcoded for the ids to delete. ⚠️ Needs verification: exact file schema to standardize on (recommended: JSON array of objects, e.g. [{"id": 105, "username": "qa_a_...", "scenario": "A"}, {"id": 108, "username": "qa_b_...", "scenario": "B"}]), and the file-locking/merge strategy used by TC-001/TC-002 to avoid a race when both append concurrently (e.g. read-modify-write with a simple retry/lock, or each scenario writing to its own uniquely-named file under tests/.tmp/ and this scenario glob-reading all of them and merging).
  5. Given tests/.tmp/created-users.json contains entries for the users created by TC-001 and TC-002
    - expect: The file is present, valid JSON, and contains at least the two expected entries (one per scenario) with non-null numeric ids
  6. When the test reads and parses tests/.tmp/created-users.json to collect the list of user ids to delete
    - expect: A list of 2 numeric ids (one from TC-001, one from TC-002) is extracted
  7. And the test issues a DELETE request directly via an API request context (not through the UI) to /web/index.php/api/v2/admin/users with JSON body {"ids": [<id from A>, <id from B>]} (or one DELETE call per id, per the chosen implementation)
    - expect: The API responds with HTTP 200 and JSON body of the shape {"data": ["<id>", ...], "meta": [], "rels": []} listing the deleted id(s) as strings
  8. Then the test issues a follow-up GET request to /web/index.php/api/v2/admin/users (list endpoint) directly via the API request context
    - expect: The response is HTTP 200
    - expect: The returned data array no longer contains any entry whose id matches the deleted ids from TC-001 or TC-002
  9. And the test clears/removes the processed entries from tests/.tmp/created-users.json (or deletes the file) so a subsequent full-suite run starts clean
    - expect: tests/.tmp/created-users.json no longer references the now-deleted ids after this scenario completes
  10. Success criteria
    - expect: This scenario only executes after both TC-001 and TC-002 have finished (enforced by playwright.config.js project `dependencies`, not just tag filtering)
    - expect: The DELETE API call returns HTTP 200 with a response confirming the deleted id(s)
    - expect: The follow-up GET call confirms the deleted user(s) no longer appear in the System Users list data
    - expect: The handoff file is cleaned up after processing
  11. Failure criteria
    - expect: TC-003 runs before TC-001 and/or TC-002 have completed (a config/ordering defect)
    - expect: tests/.tmp/created-users.json is missing, empty, or missing an expected scenario's entry when TC-003 starts
    - expect: The DELETE API call returns a non-200 status or does not report the submitted id(s) as deleted
    - expect: The follow-up GET call still shows a 'deleted' user in the list data
