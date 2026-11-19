Write and run the webship-js scenario of an order on a WooCommerce shop, from the checkout to its completion.

The launch command below is for Claude Code, the default; the text between the triple quotes can be given to another AI CLI as it is.

```
claude --permission-mode bypassPermissions """
Write the scenario of an order on this shop, from the checkout to its completion, and run it
# ~/workspace/<folder>/<shop> · https://<shop>.ddev.site · container-based (DDEV by default)
# the phrases are in the woocommerce-scenarios skill; the woocommerce-tester agent is the one to hand this work over to
# look at the shop first: in the Playwright MCP browser, in a tab of your own, place the order by hand once before writing its scenario
# a feature to write or a run to read: the book Automated Functional Testing Recipes first (its README.md, then the matching chapter), from .claude/automated-functional-testing-recipes/ in the project, ~/.claude/automated-functional-testing-recipes/ or https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes

The order: <a guest|the customer> buys <a product of the shop> and pays with <Direct bank transfer|Check payments|Cash on delivery>.
Then the shop manager opens it, writes a note, sets it to <Completed|Cancelled>, and the buyer gets the mail of that status.

Read the installed steps first:
grep -hE '^(Given|When|Then)\(' node_modules/@webship-js/woocommerce-steps/tests/step-definitions/*.steps.js

Write one feature in tests/features/<name>.feature, from phrases that exist.
Log in by the handle of the users registry (admin, shop_manager, customer):
no password in the feature, no account created by a scenario (a guest's checkout makes none), no platform name in a step phrase.
What the scenario makes, it removes in the same scenario: it ends with the shop manager deleting the order (When I delete the last placed order).

Then, from the sites folder (cd ..):
bash cmd-tools-testing.sh <shop> --dry-run --path tests/features/<name>.feature
bash cmd-tools-testing.sh <shop> --run --path tests/features/<name>.feature

A failing scenario is a result: tell me what the shop did, do not loosen the scenario.
When you are done: the scenario, the result of the run, and any step you could not find in the packs
"""
```
