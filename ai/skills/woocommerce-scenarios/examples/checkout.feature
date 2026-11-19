Feature: A guest's checkout
  A guest orders with a check: the shop confirms the order and mails the guest, makes no account, and
  the shop manager deletes the order again so the shop is left as it was.
  Written for a shop with the sample products and the default accounts
  (cmd-woocommerce-project.sh <name> --install --add-users --sample-data).

  Scenario: A guest orders with a check
    Given I am an anonymous user
    And I am on the shop
    When I add "Beanie" to the cart from the product list
    And I go to the checkout
    And I fill in the checkout email with "guest@example.com"
    And I fill in the shipping address:
      | First name | Gina          |
      | Last name  | Guest         |
      | Address    | 1 Suite Road  |
      | City       | San Francisco |
      | ZIP Code   | 94110         |
    And I choose the "Check payments" payment method
    Then the cart order total should be "$23.00"
    When I place the order
    Then I should see the order confirmation
    And the order total should be "$23.00"
    And the order payment method should be "Check payments"
    And I should not be logged in
    And an email with the subject "order has been received" should be sent to "guest@example.com"
    And the email with the subject "order has been received" to "guest@example.com" should be about the last placed order
    Given I am a logged in user with the "shop_manager" user
    When I open the last placed order in the admin
    Then the order status should be "On hold"
    And the order should belong to a guest
    When I delete the last placed order
    Then the orders list should not include the last placed order
