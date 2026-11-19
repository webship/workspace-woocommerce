Feature: The WooCommerce plugin on the dashboard
  Once the plugin is activated and installed, with the WordPress plugin it needs, the sites folders
  offer the WooCommerce builder, each AI folder lists the items of its kind the plugin ships, and the
  Settings page lists the plugin with its own page.

  # Settings lists every plugin that was added; the package and what the plugin ships are on its own page.
  Scenario: Settings lists the plugin, and its own page names its package and what it ships
    Given I am on "/settings"
     Then I should see "WooCommerce"
     When I go to "/settings/plugin/woocommerce"
     Then I should see "@webship.co/workspace-woocommerce"
      And I should see "cmd-woocommerce-project.sh"
      And I should see "woocommerce-site-builder"

  # The plugin builds on the WordPress plugin: activating it with what it needs brings that one too.
  Scenario: The WordPress plugin it needs is on Settings as well
    Given I am on "/settings/plugin/wordpress"
     Then I should see "@webship.co/workspace-wordpress"
      And I should see "cmd-wordpress-project.sh"

  Scenario: A sites folder offers the WooCommerce builder next to the WordPress one
    Given I am on "/dev"
     Then "option[value='cmd-woocommerce-project.sh']" should be attached
      And "option[value='cmd-wordpress-project.sh']" should be attached

  # The AI folders are searched by name: with every plugin on, a folder lists more than one page of items.
  Scenario: The AI Agents folder lists the agents the plugin ships
    Given I am on "/ai-agents?q=woocommerce-"
     Then I should see "woocommerce-site-builder"
      And I should see "woocommerce-tester"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills?q=woocommerce-scenarios"
     Then I should see "woocommerce-scenarios"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands?q=woocommerce-test"
     Then I should see "woocommerce-test"

  Scenario: The AI Prompts folder lists the prompts the plugin ships
    Given I am on "/ai-prompts?q=woocommerce-"
     Then I should see "woocommerce-build-and-test"
      And I should see "woocommerce-order-to-completion"
