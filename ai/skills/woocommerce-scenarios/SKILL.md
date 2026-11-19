---
name: woocommerce-scenarios
description: Write and run webship-js scenarios for a WooCommerce shop of the Webship Workspace with the WooCommerce step pack (`@webship-js/woocommerce-steps`, which brings the WordPress step pack along) — the phrases of the packs by area (the product list, a product's options, the mini cart and the cart, coupons, the checkout and the order confirmation, the customer's account, the orders, products and coupons of the administration, the order mail), the handles of the users registry, and the workspace command that runs them in the shop's container. Use when asked to "write a scenario for this shop", "test the checkout", "which step is there for the mini cart", "add a feature for the coupons", or when a `.feature` file of a shop is being written or fixed.
argument-hint: '<shop> [what to cover]'
---

# woocommerce-scenarios

Scenarios for a WooCommerce shop of a Webship Workspace (`~/workspace`, container-based, DDEV by
default), written from the steps of [`@webship-js/woocommerce-steps`](https://github.com/webship/woocommerce-steps),
of the WordPress step pack it brings along and of [webship-js](https://github.com/webship/webship-js)
itself, and run in the shop's container by the workspace's own command. It comes with the WooCommerce
plugin (`@webship.co/workspace-woocommerce`), like the builder (`cmd-woocommerce-project.sh`) and the
agents `woocommerce-site-builder` and `woocommerce-tester`.

## Where everything is

| What | Where |
| --- | --- |
| The shop | `~/workspace/<folder>/<shop>`, at `https://<shop>.ddev.site/shop/` (`<folder>` is a sites folder: `dev`, `test`, `sandboxes`, `demos`) |
| Its mail | the mail catcher of the project, `https://<shop>.ddev.site:8026` |
| The suite's configuration | `<shop>/cucumber.js`: the step definitions it loads, the users registry (`worldParameters.users`), the mailbox (`mailUrl`) |
| The features | `<shop>/tests/features/*.feature` (`shop.feature` and `site.feature` are the first ones the setup wrote) |
| The shop's steps | `<shop>/node_modules/@webship-js/woocommerce-steps/tests/step-definitions/*.steps.js` |
| The site's steps (login, administration) | `<shop>/node_modules/@webship-js/wordpress-steps/tests/step-definitions/*.steps.js` |
| webship-js's steps | `<shop>/node_modules/webship-js/tests/step-definitions/*.js` |
| The reports | `<shop>/tests/reports/` |

## The order of work

1. **Make sure the testing stack is there.** From the sites folder:
   ```bash
   cd ~/workspace/<folder>
   bash cmd-tools-testing.sh <shop>
   ```
   It adds webship-js, both step packs (in one profile: the shop's pack extends the WordPress one),
   the users registry with the shop's handles, the mailbox, `tests/features/site.feature` and
   `tests/features/shop.feature`, and makes sure the default accounts are on the shop. It is safe to
   run again: it adds what is missing and keeps what was changed.
2. **Read the installed steps before writing a phrase.** They are the source of truth: the packs
   move, and a phrase from memory is a guess.
   ```bash
   cd ~/workspace/<folder>/<shop>
   grep -hE "^(Given|When|Then)\(" node_modules/@webship-js/woocommerce-steps/tests/step-definitions/*.steps.js
   ```
   Every step carries a comment block with five examples above it; open the file when a phrase
   is not obvious.
3. **Look at the page first** (the Playwright MCP browser, a tab of your own) when the scenario
   is about a page you have not seen.
4. **Write the feature** in `<shop>/tests/features/`, from phrases that exist (the lists below).
5. **Match every step without a browser**, then run the feature, then the suite:
   ```bash
   cd ~/workspace/<folder>
   bash cmd-tools-testing.sh <shop> --dry-run --path tests/features/<name>.feature
   bash cmd-tools-testing.sh <shop> --run --path tests/features/<name>.feature
   bash cmd-tools-testing.sh <shop> --run --tags "@critical"
   bash cmd-tools-testing.sh <shop> --run
   ```
   A dry run says `Undefined` for a phrase no definition matches: fix the phrase, do not write a
   step for it.

## Accounts: a handle, never a password

```gherkin
Feature: Accounts
  Scenario: The shop manager logs in
    Given I am a logged in user with the "shop_manager" user
    Then I should be logged in as the "shop_manager" user
    And my account should have the "shop_manager" role
```

The handles of the default accounts: `admin` (the site's `administrator`), `shop_manager` and
`customer` (with a billing and a shipping address). A guest is `Given I am an anonymous user`. Never
create an account in a scenario, and never log in as the workspace account.

## The phrases, by area

The store front:

```gherkin
Feature: The store front
  Scenario: The list, sorted, paged, by category and searched
    Given I am an anonymous user
    And I am on the shop
    Then I should not see the coming soon page
    And the result count should be "Showing 1–16 of 17 results"
    And the product list should have 16 products
    And I should see the product "Beanie" in the product list
    When I sort the product list by "Sort by price: low to high"
    Then the product list should be ordered by price ascending
    When I go to the next page of the product list
    Then the product list should be on page 2
    When I open the category "Accessories"
    Then every product of the product list should be in the category "Accessories"
    When I search the store for "hoodie"
    Then the product list should have 3 products
```

A product and the cart:

```gherkin
Feature: A product and the cart
  Scenario: A variable product, the mini cart and the cart
    Given I am an anonymous user
    And I am on the shop
    When I open the product "Hoodie" from the product list
    Then adding the product to the cart should be refused with "Please select some product options"
    When I choose "Blue" for the product option "Color"
    And I choose "Yes" for the product option "Logo"
    Then the product price should be "$45.00"
    When I set the product quantity to 2
    And I add the product to the cart
    Then I should see the success message "have been added to your cart"
    And the mini cart should show 2 items
    When I go to the cart
    Then the cart should contain "Hoodie"
    When I change the cart quantity of "Hoodie" to 1
    Then the cart subtotal should be "$45.00"
    And the cart order total should be "$50.00"
    When I apply the coupon "no-such-coupon"
    Then I should see the field error "does not exist" for "Enter code"
    When I remove "Hoodie" from the cart
    Then the cart should be empty
```

The checkout, the account and the administration: see the three example features below, which
pass on a fresh shop with the sample products (`--install --add-users --sample-data`):

| Example | What it shows |
| --- | --- |
| `examples/shop-and-cart.feature` | The product list, a variable product's options, the mini cart, the cart's quantities and its empty state |
| `examples/checkout.feature` | A guest's order with a check (no account made), its confirmation and mail, and the shop manager deleting it again |
| `examples/account-and-orders.feature` | A customer's order with the saved addresses, the order history, the shop manager completing the order, the customer's mail |

Copy one into `<shop>/tests/features/` and run it as it is before you change it.

## Traps found on a real shop

- **The list loads in place.** Sorting and the pages of the product list do not load a new page on a
  block theme: the store's router swaps the list. The steps wait for it; a plain `I click "2"` does not.
- **A search with one match opens the product.** `When I search the store for "Suite Mug"` lands on
  the product's page, not on a list of one.
- **The quantity waits for the typing to end.** The cart changes a quantity a moment after the field
  changes: `When I change the cart quantity of ...` waits for the cart to hold it; do not follow a
  typed quantity with an assertion of your own.
- **Options filter each other.** Once "Logo" is "Yes", the colour menu of the sample hoodie offers
  blue alone: choose the option that frees the other first.
- **The shop's mail carries its name and the order number.** Match a part of the subject
  (`"order has been received"`, `"New order"`), and tie the mail to the order with `the email with the
  subject "..." to "..." should be about the last placed order`.
- **A customer's cart outlives the scenario.** Start a customer's scenario with `Given my cart is empty`.
- **What a scenario makes, it removes**: `When I delete the last placed order`, `When I delete the
  coupon "suite10" permanently`, and `Given there is no coupon "suite10"` before it makes one.

## The book

For any automated functional testing in this work (a Gherkin feature, a step definition, choosing a
step, a test run and its failures), read the book *Automated Functional Testing Recipes* first.

- **Where.** Use the first that exists: `.claude/automated-functional-testing-recipes/` in the project,
  `~/.claude/automated-functional-testing-recipes/` (installed by webship/webship-js-ai-agent,
  webship/webship-js-skills or webship/ai-agents), or
  https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
- **How.** Its `README.md` first, then the chapter that matches the task (one file per chapter,
  named by its subject), not the single complete file.
- **Which wins.** The installed webship-js package and the step pack are the source of truth for
  step phrasing. When they differ from the book, follow them and say so.
- **For WooCommerce.** Start with `ch06-form-testing-recipes.md` (the checkout's fields and their
  errors), `ch07-waiting-dynamic-content.md` (the cart and the checkout that update in place),
  `ch10-authentication-authorization.md` (the accounts and what each may open) and
  `ch21-when-tests-go-bad.md` (flaky, brittle and slow scenarios).
