---
description: Test a WooCommerce shop of the Webship Workspace with webship-js and the WooCommerce step pack — set the testing stack up when it is missing, match every step, run the suite (or one feature, or one tag) in the shop's container, and report what failed and why.
argument-hint: '<shop> [tests/features/<name>.feature | @tag]'
---

# /woocommerce-test

Test the WooCommerce shop named in: `$ARGUMENTS`

`$ARGUMENTS` stands for what was typed after the command. An AI CLI that does not fill it in
reads the same from the request: the name of the shop, then, if anything, one feature path or one
tag.

The first word is the shop (its folder name in a sites folder of the workspace). What follows, if
anything, narrows the run: a path that starts with `tests/features/` is one feature (or one
folder of features), a word that starts with `@` is a tag expression. With nothing after the shop,
the whole suite runs. With no shop at all, stop and ask for one: list the candidates with
`ls -d ~/workspace/*/*/wp-content/plugins/woocommerce`.

The workspace is container-based (DDEV by default) and everything below runs in the shop's
container through the workspace's own command. Never run `npx cucumber-js`, `npx playwright`,
`php` or `wp` on the host for a shop.

## 1. Find the shop

```bash
ls -d ~/workspace/*/<shop>/.ddev/config.yaml
ls -d ~/workspace/<folder>/<shop>/wp-content/plugins/woocommerce
```

`<folder>` is the sites folder the shop is in (`dev`, `test`, `sandboxes`, `demos`). If the project
has no `wp-content/plugins/woocommerce`, stop: this command is for a shop built with
`cmd-woocommerce-project.sh`. If `<folder>` has no `cmd-tools-testing.sh`, stop and say that the
folder is not a sites folder of this workspace.

## 2. Make sure the testing stack is there

```bash
cd ~/workspace/<folder>
grep -c "@webship-js/woocommerce-steps" <shop>/cucumber.js
```

If `cucumber.js` is missing or does not name the step pack, set the stack up (it adds what is
missing and keeps what was changed):

```bash
bash cmd-tools-testing.sh <shop>
```

## 3. Match every step, without a browser

```bash
bash cmd-tools-testing.sh <shop> --dry-run                                        # the whole suite
bash cmd-tools-testing.sh <shop> --dry-run --path tests/features/<name>.feature   # one feature
bash cmd-tools-testing.sh <shop> --dry-run --tags "@critical"                     # one tag
```

Use the form that matches what was asked. An `Undefined` or `Ambiguous` step is a finding: name
the feature, the line and the phrase, show the closest phrase the packs define
(`grep -hE "^(Given|When|Then)\(" <shop>/node_modules/@webship-js/woocommerce-steps/tests/step-definitions/*.steps.js`),
and stop before the real run.

## 4. Run

```bash
bash cmd-tools-testing.sh <shop> --run                                            # the whole suite
bash cmd-tools-testing.sh <shop> --run --path tests/features/<name>.feature       # one feature
bash cmd-tools-testing.sh <shop> --run --tags "@critical"                         # one tag
```

Run it once. Do not add `--retry`, do not tag a scenario `@wip` and do not change a feature to
make the run pass.

## 5. Report

Say, in this order:

1. The shop, its address (`https://<shop>.ddev.site`) and what was run (suite, feature or tag).
2. The totals the run printed: scenarios and steps, passed and failed, and the time.
3. For each failed scenario: the feature and line, the step that failed, the message, and what
   it means for the shop — a defect of the shop, a scenario that asserts something the shop never
   did, or the environment (the shop was stopped, an account is missing:
   `bash cmd-tools-add-users.sh <shop> woocommerce` writes the default ones again; the sample products
   are missing: the shop was built without `--sample-data`).
4. Where the report is: `~/workspace/<folder>/<shop>/tests/reports/`.

A failing suite is a result: report it as it is. Never create an account for a scenario, never
write a password into a feature file, and never write a platform name into a step phrase. For
writing or fixing scenarios, use the `woocommerce-scenarios` skill or hand over to the
`woocommerce-tester` agent; for changing the shop, to `woocommerce-site-builder`.

Before you write or change a scenario, or read a failed run, read the book *Automated Functional
Testing Recipes* (its `README.md`, then the matching chapter):
`.claude/automated-functional-testing-recipes/` in the project,
`~/.claude/automated-functional-testing-recipes/`, or
https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
