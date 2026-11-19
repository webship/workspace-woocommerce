/**
 * WooCommerce for Webship Workspace: a platform plugin, on top of the WordPress plugin.
 *
 * What the package carries is placed by the installer from the manifest: the builder in the sites folders,
 * its functions and argparse under core/scripts/plugins/woocommerce/, the shop's first feature and the header
 * of its theme beside them, and its AI items (ai/ in this package) in the folder of their kind: the agents in
 * AI Agents, the skill in AI Skills, the command in AI Commands, the prompts in AI Prompts. The plugin needs
 * the WordPress plugin (the manifest's `needs`): its builder starts from that plugin's, and the shop's CLI is
 * that plugin's WP-CLI tool. The dashboard needs nothing drawn for it: the builder is in the Build list
 * because it is a cmd-*-project.sh, the row menus are the core's, the AI items are listed like any other.
 * What register() adds is what the assistant is told.
 *
 * Everything the dashboard is asked for goes through `api`; this package requires nothing from the
 * dashboard's own files, so it can be installed from npm and removed without a trace.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';

/** The plugin's name: the folder of its scripts and the name its functions carry. */
export const PLATFORM = 'woocommerce';

/** The plugin it builds on (a need of the manifest): its builder makes the site, its CLI tool runs WP-CLI. */
export const BASE = 'wordpress';

/** The commands the installer places in every sites folder. */
export const COMMANDS = ['cmd-woocommerce-project.sh'];

/** The agents the installer places in the AI Agents folder. */
export const AGENTS = ['woocommerce-site-builder', 'woocommerce-tester'];

/** The skill the installer places in the AI Skills folder (a folder each, with its SKILL.md). */
export const SKILLS = ['woocommerce-scenarios'];

/** The slash command the installer places in the AI Commands folder. */
export const AI_COMMANDS = ['woocommerce-test'];

/** The prompts the installer places in the AI Prompts folder: each a whole launch command for a new session. */
export const PROMPTS = ['woocommerce-build-and-test', 'woocommerce-order-to-completion'];

/** What the assistant is told about WooCommerce in this workspace. */
export function assistantContext(): string {
  return [
    'WooCommerce (a plugin, @webship.co/workspace-woocommerce, on top of the WordPress plugin): a shop is built with',
    '`bash cmd-woocommerce-project.sh <name> --install --add-users --sample-data` from a sites folder (dev, test, sandboxes, demos):',
    'the WordPress plugin\'s builder makes the site, then the free WooCommerce plugin is added and set up as a new shop starts',
    '(the onboarding wizard skipped, open to visitors, the offline payments, a flat rate, the mini cart in the header of the default theme),',
    'in a container like every other project, at https://<name>.ddev.site; `--sample-data` imports the shop\'s own sample products,',
    '`--add-users` adds the default accounts (administrator, shop_manager, customer). The shop\'s CLI is WP-CLI\'s `wc` commands, through',
    'the WordPress plugin\'s tool: `bash cmd-tools-wordpress-cli.sh <name> --run "wc product list --user=administrator"`.',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the WooCommerce step pack and the WordPress pack it extends; `--run` runs the suite.',
    `For WooCommerce work, hand over to the agents ${AGENTS.map((a) => `\`${a}\``).join(' and ')}.`,
    `The plugin also places the skill ${SKILLS.map((a) => `\`${a}\``).join(', ')} (the step pack's phrases, by area) in ai-skills/,`,
    `the command ${AI_COMMANDS.map((a) => `\`/${a} <shop>\``).join(', ')} in ai-commands/ and the prompts ${PROMPTS.map((a) => `\`${a}\``).join(' and ')} in ai-prompts/.`,
    'Never run php, wp or composer on the host for a project; never connect the shop to an account of the vendor or install a paid extension.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}
