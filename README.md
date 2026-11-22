# @webship.co/workspace-woocommerce

WooCommerce for the [Webship Workspace](https://github.com/webship/workspace) dashboard, on top of its
WordPress plugin ([`@webship.co/workspace-wordpress`](https://github.com/webship/workspace-wordpress)):
a builder that makes a real shop in a container — WordPress with the free WooCommerce plugin, set up
the way a new shop starts, with its own sample products and the offline payments — the default
accounts, the [WooCommerce step pack](https://github.com/webship/woocommerce-steps) wired into the
workspace's testing setup next to the WordPress one it extends, and its AI items — two agents, a
skill, a command and two prompts — each listed in the workspace folder of its kind.

The workspace is container-based (DDEV by default): a shop is a WordPress project like any other, so
the row menus the core draws (start, stop, launch, backup, clone, remove, tests) work on it
unchanged.
A shop is also built on Docker Compose or on a Kubernetes cluster: see [Runtimes](#runtimes).

It is made from the reference platform plugin, `@webship.co/workspace-wordpress`, and builds on it:
the shop's site is made by that plugin's builder, and the shop's command line is that plugin's WP-CLI
tool (`cmd-tools-wordpress-cli.sh`, with WP-CLI's `wc` commands).

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require @webship.co/workspace-woocommerce --with-needs   # npm install into the dashboard, with the WordPress plugin
bash core/scripts/plugins.sh --activate woocommerce --with-needs                         # plugins.woocommerce in settings.yml, and what it needs
bash core/scripts/plugins.sh --install woocommerce                                       # the builder, functions, args, AI items
bash core/scripts/plugins.sh --configure woocommerce                                     # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is
idempotent. `--uninstall` removes what it placed; an AI item you edited stays. The WordPress plugin
cannot be deactivated or uninstalled while this one is in use: take this one off first.

Everything the plugin carries lands in the folder it belongs to, when that folder is an active
workspace folder:

| What | Lands in |
| --- | --- |
| `cmd-woocommerce-project.sh` | every active sites folder: `dev/`, `test/`, `sandboxes/`, `demos/` |
| The shop's first feature and the header of its theme | `core/scripts/plugins/woocommerce/`, beside its functions |
| The agents `woocommerce-site-builder`, `woocommerce-tester` | `ai-agents/` |
| The skill `woocommerce-scenarios` | `ai-skills/` |
| The command `/woocommerce-test` | `ai-commands/` |
| The prompts `woocommerce-build-and-test`, `woocommerce-order-to-completion` | `ai-prompts/` |

There they are listed like any other item of the folder, and installed into Claude Code from there.

## What it needs

A workspace starts empty, so the manifest says what else this plugin needs (`needs`):

- one sites folder, for the builder: `dev`, `test`, `sandboxes`, `demos` (`dev` is the one added when none is there). The folder also carries `cmd-tools-testing.sh` and the Users tools this plugin's hooks answer to.
- `wordpress`, the WordPress plugin: the shop's site is made by its builder (`wordpress_build`), its testing hook runs first on a shop (the WordPress step pack, its users registry), and the shop's WP-CLI goes through its tool. `--with-needs` requires it from npm (`@webship.co/workspace-wordpress`), or from the folder beside this package when it was required from a path.
- `ai-agents`, `ai-skills`, `ai-commands` and `ai-prompts`: the AI folders its agents, its skill, its command and its prompts are placed in.

`--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is missing first:

```bash
bash core/scripts/plugins.sh --activate woocommerce --with-needs   # dev, wordpress and the four AI folders are required, activated and installed first
bash core/scripts/plugins.sh --install woocommerce
```

Everything the builder runs for a shop runs in the shop's own container, through the container tool the workspace already needs: WP-CLI is in the web container. The plugin asks for no command of its own on the machine.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-woocommerce-project.sh` | The builder, in the Build list as **WooCommerce (shop on WordPress)**, installed into every sites folder |
| `scripts/functions/fun-woocommerce.sh` | The bash functions behind it, sourced by bootstrap once installed; the names the core's tools look for (`set_woocommerce_users`, `add_woocommerce_users`, `cancel_woocommerce_users`, `testing_configure_woocommerce`) |
| `scripts/args/arg-woocommerce.sh` | Its argparse; the Build form draws the builder's flags from it |
| `testing/shop.feature` | The first feature a shop gets when testing is set up |
| `site/header-with-mini-cart.html` | The header the builder gives the default theme: its site title and navigation, the account link and the mini cart |
| `ai/agents/woocommerce-site-builder.md` | The agent that builds and maintains shops with these commands |
| `ai/agents/woocommerce-tester.md` | The agent that writes and runs scenarios with the shop's step pack |
| `ai/skills/woocommerce-scenarios/` | The skill: the step pack's phrases by area, the traps found on a real shop, three example features |
| `ai/commands/woocommerce-test.md` | The slash command `/woocommerce-test <shop>`: set up, match every step, run, report |
| `ai/prompts/woocommerce-build-and-test.md`, `woocommerce-order-to-completion.md` | Two prompts: whole launch commands for a new session |
| `src/index.ts` | `register(api)`: what the assistant is told about WooCommerce here |
| `features/woocommerce.feature` | Scenarios for the dashboard's own browser suite |
| `features/woocommerce-runtimes.feature` | The row, the test users and the pages of a shop built on Docker Compose and on Kubernetes |

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## The builder

Run it from a sites folder. `--help` is safe.

```bash
cd ~/workspace/dev
bash cmd-woocommerce-project.sh myshop --install --add-users --sample-data
```

| Flag | What it does |
| --- | --- |
| `--install` | Install WordPress with the workspace account as the administrator, then add WooCommerce from the plugin directory and set the shop up as a new shop starts: what its first visit of the administration does (orders in their own tables, the new e-mails) done during the build, the onboarding wizard skipped and its task lists hidden, open to visitors (not "coming soon"), a store in San Francisco in US dollars without taxes, the offline payments (direct bank transfer, check payments, cash on delivery), one flat rate of $5.00 for every address, and the mini cart and the account link in the header of the default theme. Without it, WordPress is downloaded and WooCommerce put in its plugins, to activate once the site is installed |
| `--add-users` | With `--install`: add the default accounts; the customer gets a billing and a shipping address, and the shop's order notifications go to the shop manager |
| `--sample-data` | With `--install`: import the shop's own sample products (its `sample-data/sample_products.xml`: 18 products, their categories, variations and images, with the WordPress importer, which is removed again), and build the product lookup tables an import leaves empty |
| `--version <x>` | The WooCommerce release (`latest` by default) |
| `--wordpress-version <x>` | The WordPress release (`latest` by default) |
| `--locale <x>` | The language WordPress is downloaded in |
| `--php-version <x>` | The PHP of the project container |
| `--runtime <name>` | The container runtime to build on: `ddev` (the default), `docker`, `kubernetes` or `podman`. See [Runtimes](#runtimes) |
| `--launch` | Open the shop when it is ready |

On DDEV the shop answers at `https://myshop.ddev.site/shop/`, its administration at `/wp-admin`, its mail
catcher at `https://myshop.ddev.site:8026`. The WordPress plugin's builder runs `ddev config
--project-type=wordpress` with the Node.js of the workspace (24) and installs the site; the container
tool writes the database settings, the builder writes none. A project of the same name is deleted
first.

Nothing paid and no account anywhere: the free plugin from the plugin directory, its own sample
products, the offline payments. The shop is never connected to an account of the vendor, no extension
of the marketplace is installed, and its "connect your store" prompts are left alone.

### Runtimes

```bash
bash cmd-woocommerce-project.sh myshop --install --add-users --sample-data                        # DDEV, the default
bash cmd-woocommerce-project.sh myshop --install --add-users --sample-data --runtime docker       # Docker Compose
bash cmd-woocommerce-project.sh myshop --install --add-users --sample-data --runtime kubernetes   # a Kubernetes cluster
```

Without `--runtime` a build takes `container.runtime` of the workspace's `settings.yml`, then DDEV.
It needs a Webship Workspace with the container runtimes
([webship/workspace#694](https://github.com/webship/workspace/issues/694)) and the WordPress plugin
1.0.12 or later, whose builder makes the site there; on an older one the builder says so and stops.

| | DDEV | Docker Compose | Kubernetes | Podman |
| --- | --- | --- | --- | --- |
| Build and install, with the default accounts and the sample products | Yes | Yes | Yes | The same code as Docker Compose, not yet run |
| The shop page, the cart, the account page, the administration | Yes | Yes | Yes | Not yet run |
| The row in the dashboard, with the shop's test users in its Tests menu | Yes (the WordPress plugin's list there) | Yes | Yes | Not yet run |
| The shop's `wc` commands, test users added and cancelled | Yes | Yes | Yes | Not yet run |
| The testing setup and the suite, with the pack's examples | Yes | Yes | Yes | Not yet run |
| Mail caught by Mailpit, and read by the suite | Yes | Yes, with webship/workspace#712 | Yes, with webship/workspace#712 | Not yet run |
| Export and import the database, backup, remove | Yes | Yes | Yes | Not yet run |

"Yes" means it was run on a real shop of that runtime.

| Runtime | The shop's address | What the project carries |
| --- | --- | --- |
| DDEV | `https://myshop.ddev.site` | `.ddev/config.yaml`, the project type `wordpress` |
| Docker Compose | `http://127.0.0.1:<port>`, printed by the build | `compose.yaml` (the type `wordpress`, and `platform: woocommerce`), `.webship/runtime/Dockerfile` |
| Kubernetes | `http://<node address>:<port>`, printed by the build | The same, and `k8s/` (the namespace `ws-myshop`) |

What differs on Docker Compose and Kubernetes:

- **The site** is the WordPress plugin's to make there: `wp-config.php` with the database of the
  project's own stack, WordPress's `.htaccess` for Apache, and an address that follows the request.
  This plugin writes no database settings on any runtime.
- **The claim:** the project type is `wordpress` there too, and the builder writes
  `platform: woocommerce` in the `x-webship:` block of `compose.yaml`. The dashboard then knows a
  shop: the row's Tests menu adds and cancels the shop's accounts, not the WordPress plugin's list.
  The WordPress plugin's tool (`cmd-tools-wordpress-cli.sh`) still works on it.
- **The suite** runs in the Workspace's tests container, against the shop's address.
- **The shop's mail** goes to the mail catcher of the project's stack, as the WordPress plugin sets
  it up. The suite's mail steps read the mailbox at `MAIL_URL`: on DDEV port 8026 of the project; on
  Docker Compose and Kubernetes the Workspace's tests container hands the suite the address of the
  mailbox (webship/workspace#712). On a Workspace without it, the scenarios that read a mail have
  nothing to read there.
- **Not there yet:** HTTPS and a host name are DDEV's. Podman runs the same code as Docker Compose
  and was not run yet.

The same commands work on every runtime: `cmd-tools-wordpress-cli.sh`, `cmd-tools-add-users.sh`,
`cmd-tools-testing.sh`. The pattern is the reference plugin's:
[On Docker Compose and Kubernetes](https://github.com/webship/workspace-wordpress/blob/1.0.x/docs/cms-plugin-pattern.md#on-docker-compose-and-kubernetes).

### The shop's command line

The shop's CLI is WP-CLI's `wc` commands, through the WordPress plugin's tool. A `wc` command acts as
an account of the site: name an administrator with `--user`.

```bash
bash cmd-tools-wordpress-cli.sh myshop                                                    # WordPress, plugins, themes, accounts
bash cmd-tools-wordpress-cli.sh myshop --run "wc product list --user=administrator --fields=id,name,price"
bash cmd-tools-wordpress-cli.sh myshop --run "wc shop_order list --user=administrator --fields=id,status,total"
bash cmd-tools-wordpress-cli.sh myshop --update                                           # WordPress, its plugins (the shop's too), themes
```

### The default accounts

| Account | Address | Role | Handle in the tests |
| --- | --- | --- | --- |
| `administrator` | `administrator@example.com` | the site's administrator | `admin` |
| `shop_manager` | `shop_manager@example.com` | the shop manager: products, orders, coupons, the shop's settings; gets the order notifications | `shop_manager` |
| `customer` | `customer@example.com` | a customer with a billing and a shipping address (Casey Customer, 2 Test Avenue, Los Angeles) | `customer` |

One account per role of the shop, each named after its role, with the password of the workspace's
other default lists. They are for local shops and for tests; the site's first account is the
workspace account and is never written into a test. `bash cmd-tools-add-users.sh myshop woocommerce`
adds the same list (`bash cmd-tools-cancel-users.sh myshop woocommerce` deletes it); adding them again
gives them back their role and the customer its addresses. A shop is a project of the DDEV type
`wordpress`, so the row's Users menu on the dashboard adds the WordPress plugin's list (`editor`,
`author`, …): the shop's own accounts come with the builder's `--add-users`, the testing setup, and the
command above. On Docker Compose and Kubernetes the builder claims the project for this plugin, and
the row's Tests menu adds and cancels the shop's accounts.

### Test a shop

```bash
bash cmd-tools-testing.sh myshop                 # webship-js, both step packs, the users registry, the first features
bash cmd-tools-testing.sh myshop --run           # run the suite in the container
bash cmd-tools-testing.sh myshop --run --path tests/features/shop.feature
bash cmd-tools-testing.sh myshop --list-steps    # the step packs the project has, in one profile
```

`cmd-tools-testing.sh` is the workspace's own. For a shop, this plugin's hook first runs the WordPress
plugin's (the WordPress step pack, its users registry and `tests/features/site.feature`), whichever
order the core calls the hooks in, then adds `@webship-js/woocommerce-steps` to `package.json`, lists
its step definitions in `cucumber.js` right after the WordPress pack's, in the same profile (the shop's
pack is an extension of the WordPress one and loads it itself), adds the tags that keep the pack's
assertions that must fail out of a normal run, the mailbox of the project (`mailUrl`), the handles
`shop_manager` and `customer` (with the addresses the mail steps read; overridable with
`WP_<HANDLE>_USER` and `WP_<HANDLE>_PASSWORD`) in the users registry, places
`tests/features/shop.feature` when the project has none, and makes sure the default accounts are on the
shop. Run it again and it adds what is missing and keeps what you changed.

## The AI items

`ai/` in the package holds one folder per kind, the manifest's `ai` block names each item, and
`--install` places it in the workspace folder of that kind.

| Kind | Item | Use it to |
| --- | --- | --- |
| Agent | `woocommerce-site-builder` | Build, update, maintain or remove a shop with the builder and the WP-CLI tool, in containers only, with no account of the vendor and nothing paid |
| Agent | `woocommerce-tester` | Set the testing stack up, look at the shop in the Playwright MCP browser first, write scenarios from the packs' steps and run them; it never creates an account in a suite and never writes a platform name into a step phrase |
| Skill | `woocommerce-scenarios` | Write a scenario from phrases that exist: the packs' steps by area, the handles of the users registry, the traps found on a real shop, and three features that pass on a fresh shop with the sample products |
| Command | `/woocommerce-test <shop> [feature or @tag]` | Run the suite of a shop from inside a session: set up when missing, match every step, run, report what failed and why |
| Prompt | `woocommerce-build-and-test` | Start a session that builds a shop, says what it is, sets the testing stack up and runs the first feature |
| Prompt | `woocommerce-order-to-completion` | Start a session that writes and runs the scenario of an order from the checkout to its completion |

After `--install` each is in its folder on the dashboard. **Install** there puts an agent, a skill
or a command into Claude Code (`~/.claude/agents`, `~/.claude/skills`, `~/.claude/commands`), or
from the command line:

```bash
cd ~/workspace/ai-agents   && bash cmd-tools-ai-items.sh woocommerce-tester --install
cd ~/workspace/ai-skills   && bash cmd-tools-ai-items.sh woocommerce-scenarios --install
cd ~/workspace/ai-commands && bash cmd-tools-ai-items.sh woocommerce-test --install
```

A prompt is not installed: it is the whole `claude …` launch command of a new session, and the
dashboard's **New screen** form lists it as a template. By hand, fill the placeholders in and run
the command of the file from the folder it names.

The items are written for any AI CLI, with Claude Code as the default shape: the frontmatter and
the file layout are Claude Code's, the body of each item is plain Markdown that names no tool or
feature of one CLI, a command says in words what its arguments are, and the text between the
triple quotes of a prompt can be given to another AI CLI as it is.

Every step phrase the items show is checked against the definitions of the shop's step pack, of the
WordPress pack it brings and of webship-js (`tests/fixtures/step-definitions.txt`), and every command
and flag against the plugin's own, the WordPress plugin's and the workspace's.

## Develop it

```bash
npm install     # builds dist/ (TypeScript)
npm run lint
npm test        # the manifest, the builder, the AI items, the functions against a scaffolded project
```

CI runs the same on Node.js 20 and 24, parses every shell script, and runs the plugin's
`features/woocommerce.feature` against a dashboard with this plugin (and the WordPress plugin it
needs) installed (`webship/workspace/.github/workflows/plugin-browser-suite.yml`).

When the step pack's release line changes, refresh the fixture from a project whose testing stack is
set up: `node <this plugin>/tests/fixtures/refresh-step-definitions.js > <this plugin>/tests/fixtures/step-definitions.txt`.
