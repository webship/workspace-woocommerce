Feature: The shop answers and its accounts work
  As the owner of the shop
  I want the shop, the cart and each default account to work
  So that a build that came out broken is caught before anything else is tested

  # Placed by the workspace's testing setup as a starting point: it is yours to change. It is written for
  # a shop with the sample products (cmd-woocommerce-project.sh <name> --install --add-users --sample-data).
  # The accounts are the default ones (cmd-tools-add-users.sh <name> woocommerce); a scenario logs in by
  # a handle of the users registry in cucumber.js, so no password is written here.

  @critical
  Scenario: The shop is open to visitors and lists its products
    Given I am an anonymous user
    And I am on the shop
    Then I should not see the coming soon page
    And I should see the product "Beanie" in the product list

  @critical
  Scenario: A visitor puts a product in the cart, and takes it out again
    Given I am an anonymous user
    And I am on the shop
    When I add "Beanie" to the cart from the product list
    Then the mini cart should show 1 item
    When I go to the cart
    Then the cart should contain "Beanie"
    When I remove "Beanie" from the cart
    Then the cart should be empty

  Scenario: The shop manager has the shop's screens, not the site's plugins
    Given I am a logged in user with the "shop_manager" user
    When I go to the "Orders" admin screen
    Then I should be on the "Orders" admin screen
    And the admin menu should list "Products"
    And the admin menu should not list "Plugins"

  Scenario: The customer logs in to the store and finds the account's addresses
    Given I am an anonymous user
    When I log in to the store as "customer"
    Then I should be logged in as the "customer" user
    And my billing address should contain "Los Angeles"
