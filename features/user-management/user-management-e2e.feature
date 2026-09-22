@mode:serial
Feature: User Management End-to-End Workflow
  As an Admin
  I want to log in, create, search, edit, and log out through OrangeHRM User Management
  So that the complete user administration journey works correctly end to end


  # Tag classification:
  #   @smoke      Minimal, fast, critical happy path (login -> navigate -> create
  #               -> search -> update -> logout). Must pass on every push.
  #   @regression Full functional coverage, applied to every scenario (smoke is
  #               a subset of regression). Run nightly / before release.
  #   @sit        System Integration Test: the scenario asserts the backend API
  #               response in addition to the UI, verifying the UI action
  #               actually persisted correctly on the backend, not just that it
  #               rendered. Applied only where an API assertion exists.
  #   @negative   Invalid/edge-case input handling.

  # TC-001
  @regression @login
  Scenario: Login page loads with expected elements
    Given the user navigates to the application login URL
    Then the login page should display the expected title, heading, and login form

  # TC-002
  @smoke @sit @regression @login
  Scenario: Login with valid Admin credentials redirects to the Dashboard
    Given the user is on the login page
    When the user logs in with valid Admin credentials
    Then the login API response should be successful
    And the user should be redirected to the Dashboard

  # TC-003
  @smoke @regression @navigation
  Scenario: Navigate to Admin User Management page
    Given the user is logged in and on the Dashboard
    When the user navigates to the Admin User Management page
    Then the System Users page should be displayed with search filters and an Add button

  # TC-004
  @negative @regression @validation @user-management
  Scenario: Submitting an empty Add User form shows required field validation
    Given the user clicks the "Add" button on the System Users page
    When the user submits the Add User form without entering any details
    Then required field validation messages should be displayed
    And no user should be created

  # TC-005
  @smoke @sit @regression @create @user-management
  Scenario: Create a new system user and verify persistence via API
    Given the user enters valid unique user details in the Add User form
    When the user saves the new user
    Then the create user API response should be successful
    And a success message should be displayed
    And the new user should appear in the System Users list
    And the created user should be retrievable via the API with matching data

  # TC-006
  @smoke @regression @search @user-management
  Scenario: Search for the created user and resolve to a single record
    Given the user is on the System Users list
    When the user searches by the created user's username
    Then exactly one matching record should be found
    And the matching record's details should match the created user

  # TC-007
  @regression @edit @user-management
  Scenario: Edit form loads pre-populated with the created user's data
    Given the user clicks the Edit action for the created user's record
    Then the edit form should be displayed pre-populated with the created user's data

  # TC-008
  @smoke @sit @regression @edit @user-management
  Scenario: Update the created user and verify persistence via API
    Given the user is on the Edit User form for the created user
    When the user updates the username and status and saves
    Then the update user API response should be successful
    And a success message should be displayed
    And the updated details should appear in the System Users list
    And the updated user should be retrievable via the API with matching data

  # TC-009
  @negative @regression @search @user-management
  Scenario: Searching a non-existent username shows no records
    Given the user is on the System Users list
    When the user searches by a non-existent username
    Then no records should be found

  # TC-010
  @regression @search @user-management
  Scenario: Reset clears all populated search filters
    Given the user populates all search filters on the System Users list
    When the user clicks the Reset button
    Then all search filters should be cleared
    And the full unfiltered user list should be restored

  # TC-011
  @smoke @sit @regression @logout
  Scenario: Logout invalidates the session and redirects to the login page
    Given the user is logged in
    When the user logs out
    Then the logout API response should be successful
    And the user should be redirected to the login page
    And protected pages should no longer be accessible
