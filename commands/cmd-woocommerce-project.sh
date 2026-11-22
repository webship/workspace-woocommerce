#!/usr/bin/env bash

# workspace-name: WooCommerce (shop on WordPress)

# Installed by the WooCommerce plugin (plugins.sh --install woocommerce); __WORKSPACE__ is the workspace it was installed into.
#
# Build a shop in a container: on DDEV (the default) at https://<name>.ddev.site, and with --runtime
# docker, podman or kubernetes on that runtime, at the address the build prints. The WordPress plugin's builder makes the
# site (the latest WordPress, or the one --wordpress-version names), then the free WooCommerce plugin is
# added from the plugin directory. With --install the shop is set up the way a new shop starts (the
# onboarding wizard skipped, open to visitors, the offline payments, a flat rate, the mini cart in the
# header of the default theme); with --sample-data it gets WooCommerce's own sample products; with
# --add-users the default accounts. The shop's CLI is WP-CLI's `wc` commands, through the WordPress
# plugin's tool: bash cmd-tools-wordpress-cli.sh <name> --run "wc product list --user=administrator".

# Bootstrap.
# Find the workspace tooling from this script, so a fresh clone needs no setup.
WORKSPACE_SCRIPTS="${WORKSPACE_SCRIPTS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../core/scripts" && pwd)}";
source ${WORKSPACE_SCRIPTS}/bootstrap.sh || exit 1 ;

# Load workspace settings.
eval $(parse_yaml ${WORKSPACE_CONFIG}/workspace.__WORKSPACE__.settings.yml);

# Set the versions: of WooCommerce (--version) and of WordPress (--wordpress-version).
site_version="latest";
wordpress_version="latest";

# Distribution.
distribution_name="woocommerce";
distribution_title="WooCommerce";
distribution_webroot="";

ARGPARSE_DESCRIPTION="Build a ${distribution_title} shop in __WORKSPACE__"
# The args file comes with the plugin: core/scripts/plugins/woocommerce/ is where plugins.sh --install puts it.
source ${WORKSPACE_SCRIPTS}/plugins/woocommerce/args/arg-woocommerce.sh || exit 1 ;

shift $#;

woocommerce_build ;
