Build a WooCommerce shop in a sites folder and prove it with its first webship-js features.

The launch command below is for Claude Code, the default; the text between the triple quotes can be given to another AI CLI as it is.

```
claude --permission-mode bypassPermissions """
Build the WooCommerce shop named <name> in this sites folder and test it with webship-js
# ~/workspace/<dev|test|sandboxes|demos> · https://<name>.ddev.site/shop/ · container-based (DDEV by default)
# the builder deletes a project of the same name first: stop if <name> is a shop somebody still needs
# nothing on the host: no php, wp or composer outside the shop's container; no account of the vendor, nothing paid
# a feature to write or a run to read: the book Automated Functional Testing Recipes first (its README.md, then the matching chapter), from .claude/automated-functional-testing-recipes/ in the project, ~/.claude/automated-functional-testing-recipes/ or https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes

1. bash cmd-woocommerce-project.sh <name> --install --add-users --sample-data
2. bash cmd-tools-wordpress-cli.sh <name> --run "wc product list --user=administrator --fields=id,name,price"
   tell me the versions, the address, the products and the accounts the build printed
3. bash cmd-tools-testing.sh <name>
   webship-js, the shop's step pack with the WordPress one, the users registry, tests/features/shop.feature
4. bash cmd-tools-testing.sh <name> --dry-run --path tests/features/shop.feature
5. bash cmd-tools-testing.sh <name> --run --path tests/features/shop.feature

If a command fails, show the line that failed and stop. Do not retry with other flags.
When the feature is green: the address, the versions, how many scenarios and steps passed.
Then ask me whether to keep the shop or remove it with: bash cmd-tools-remove.sh <name>
"""
```
