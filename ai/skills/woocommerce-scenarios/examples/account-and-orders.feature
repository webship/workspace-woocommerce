Feature: A customer's order, from the checkout to its completion
  The customer orders with the saved addresses, the shop manager completes the order, and the customer
  sees it in the order history and gets the mail. The order is deleted again at the end.
  Written for a shop with the sample products and the default accounts
  (cmd-woocommerce-project.sh <name> --install --add-users --sample-data).

  Scenario: A customer's order completed by the shop manager
    Given I am a logged in user with the "customer" user
    And my cart is empty
    And I am on the shop
    When I add "Cap" to the cart from the product list
    And I go to the checkout
    Then I should see "2 Test Avenue"
    When I choose the "Cash on delivery" payment method
    And I place the order
    Then I should see the order confirmation
    And my order history should list the last placed order as "Processing"
    Given I am a logged in user with the "shop_manager" user
    When I open the last placed order in the admin
    Then the order should belong to "customer"
    When I add the order note "Packed and ready to ship"
    And I change the order status to "Completed"
    Then the order notes should include "Order status changed from Processing to Completed."
    And an email with the subject "on its way" should be sent to "customer"
    Given I am a logged in user with the "customer" user
    Then my order history should list the last placed order as "Completed"
    Given I am a logged in user with the "shop_manager" user
    When I delete the last placed order
    Then the orders list should not include the last placed order
