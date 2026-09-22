Feature: Login (Standalone, Parallel-Safe)
  As a user of OrangeHRM
  I want to log in and log out
  So that I can securely access and leave my account

 

  # TC-L01
  @regression @login @negative
  Scenario: Empty username and password shows required-field validation
    Given a user is on the Login page
    When the user clicks the Login button without entering a username or password
    Then two "Required" validation messages are displayed for the Username and Password fields
    And the user remains on the login page

  # TC-L02
  @regression @login @negative
  Scenario Outline: Invalid credentials show an "Invalid credentials" error
    Given a user is on the Login page
    When the user enters the "<credentialSet>" credentials and clicks the Login button
    Then an "Invalid credentials" error alert is displayed
    And the user remains on the login page

    Examples:
      | credentialSet            |
      | wrongPassword            |
      | wrongUsername            |
      | wrongUsernameAndPassword |

  # TC-L03
  @smoke @sit @regression @login
  Scenario: Valid credentials log the user in and redirect to the Dashboard
    Given a user is on the Login page
    When the user enters valid credentials and clicks the Login button
    Then the user is redirected to the Dashboard page

  # TC-L04
  @smoke @sit @regression @logout
  Scenario: Logout invalidates the session and redirects to the Login page
    Given a user is logged in with valid credentials and is on the Dashboard page
    When the user opens the user dropdown menu and clicks "Logout"
    Then the user is redirected to the Login page
    And navigating to a protected page redirects back to the Login page
