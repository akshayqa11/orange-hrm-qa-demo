Feature: System User CRUD - Parallel Create/Update with Dependent API Delete


  # TC-001
  @user-crud @parallel-create @smoke
  Scenario: Create a new System User (Scenario A) and verify success toast and create API response
    Given the user opens the Add User form from the System Users list
    When the user submits the Add User form with unique generated details for scenario "A"
    Then the system user create API response should be successful and match the submitted details
    And the "Successfully Saved" success toast should be displayed
    And the created user should appear in the System Users list
    And the created user's id should be handed off to the dependent delete scenario as "A"

  # TC-002
  @user-crud @parallel-create
  Scenario: Create then update a System User (Scenario B) and verify success toasts and API responses
    Given the user opens the Add User form from the System Users list
    When the user submits the Add User form with unique generated details for scenario "B"
    Then the system user create API response should be successful and match the submitted details
    And the "Successfully Saved" success toast should be displayed
    When the user opens the Edit form for the just-created scenario "B" user and disables the status
    Then the system user update API response should be successful and match the updated details
    And the "Successfully Updated" success toast should be displayed
    And the created user's id should be handed off to the dependent delete scenario as "B"

  # TC-003
  @user-crud @delete-dependent
  Scenario: Delete the users created by Scenario A and Scenario B via a direct API call
    Given the handed-off user ids from scenario "A" and scenario "B" are available
    When the users are deleted via a direct DELETE API request
    Then the delete API response should confirm both ids were removed
    And a follow-up GET request should confirm the users no longer exist
    And the handoff files should be cleared
