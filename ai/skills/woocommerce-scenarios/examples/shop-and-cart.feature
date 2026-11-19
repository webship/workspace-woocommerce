Feature: The shop and the cart
  A visitor browses the shop, chooses a variable product's options and changes the cart.
  Written for a shop with the sample products (cmd-woocommerce-project.sh <name> --install --sample-data).

  Scenario: The product list, sorted and paged
    Given I am an anonymous user
    And I am on the shop
    Then I should not see the coming soon page
    And the product list should have 16 products
    And I should not see the product "Hoodie with Pocket" in the product list
    When I sort the product list by "Sort by price: high to low"
    Then the product list should be ordered by price descending
    When I go to page 2 of the product list
    Then the product list should be on page 2

  Scenario: A variable product's options choose its price, and the cart takes it
    Given I am an anonymous user
    And I am on the shop
    When I open the product "Hoodie" from the product list
    Then the breadcrumbs should be "Home / Hoodies / Hoodie"
    And adding the product to the cart should be refused with "Please select some product options"
    When I choose "Blue" for the product option "Color"
    And I choose "Yes" for the product option "Logo"
    Then the product price should be "$45.00"
    When I add the product to the cart
    Then I should see the success message "has been added to your cart"
    And the mini cart should show 1 item
    When I go to the cart
    And I change the cart quantity of "Hoodie" to 3
    Then the cart quantity of "Hoodie" should be 3
    And the cart subtotal should be "$135.00"
    When I remove "Hoodie" from the cart
    Then the cart should be empty
