#!/usr/bin/env bash

# WooCommerce for the Webship Workspace: build a shop on WordPress, add its default accounts, and wire
# its step pack into the testing setup, next to the WordPress step pack it extends.
#
# Placed by `plugins.sh --install woocommerce` in core/scripts/plugins/woocommerce/functions/, where
# bootstrap sources it with the core's own functions and the WordPress plugin's: this plugin needs
# @webship.co/workspace-wordpress, and its builder starts from that plugin's wordpress_build.
# Everything runs in the project's container (DDEV by default: `ddev wp …`), never on the host. DDEV
# writes wp-config-ddev.php for the database, so nothing here writes database settings.
#
# The shop's CLI is WP-CLI's `wc` commands, through the WordPress plugin's tool:
#   bash cmd-tools-wordpress-cli.sh <shop> --run "wc product list --user=administrator"
#
# Four names are the ones the core's tools look for:
#   set_woocommerce_users          the default accounts        (cmd-tools-add-users.sh <project> woocommerce)
#   add_woocommerce_users          create them with WP-CLI     (the same tool, and --add-users of the builder)
#   cancel_woocommerce_users       delete them                 (cmd-tools-cancel-users.sh <project> woocommerce)
#   testing_configure_woocommerce  the step pack in the testing stack (cmd-tools-testing.sh <project>)
# A shop is a project of the DDEV type `wordpress`: the row's Users menu hands the tools the WordPress
# plugin's list. The shop's own accounts come with the builder's --add-users, with the testing setup,
# and with `cmd-tools-add-users.sh <project> woocommerce`.

# The step pack a shop is tested with, and the release line it is required at. It brings the WordPress
# step pack along; the WordPress plugin's hook adds that one too.
readonly WOOCOMMERCE_STEPS_PACKAGE='@webship-js/woocommerce-steps';
readonly WOOCOMMERCE_STEPS_VERSION='^2.0.0';

# The default accounts: one per role of the shop, the ones a scenario logs in as. Accounts are
# configuration, created once on the site; a test suite never creates or deletes one.
#   administrator  the site's administrator (a second one: the installer's is the workspace account)
#   shop_manager   the shop manager: products, orders, coupons, the shop's settings; gets the order notifications
#   customer       a customer, with a billing and a shipping address
function set_woocommerce_users() {
  users=(administrator shop_manager customer);
  local user ;
  for user in "${users[@]}" ; do
    printf -v "user_${user}_name" '%s' "${user}" ;
    printf -v "user_${user}_mail" '%s' "${user}@example.com" ;
    printf -v "user_${user}_password" '%s' 'dD.123123ddd' ;
    printf -v "user_${user}_role" '%s' "${user}" ;
  done
}

# Is this folder a shop? A WordPress project (its DDEV project type) with WooCommerce in its plugins.
function woocommerce_is_project() {
  local project_path="$1" docroot ;
  grep -qE '^type:[[:space:]]*"?wordpress"?[[:space:]]*$' "${project_path}/.ddev/config.yaml" 2>/dev/null || return 1 ;
  docroot="$(grep -E '^docroot:' "${project_path}/.ddev/config.yaml" 2>/dev/null | head -1 | sed -E 's/^docroot:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/')" ;
  [ -f "${project_path}/${docroot:+${docroot}/}wp-content/plugins/woocommerce/woocommerce.php" ] ;
}

# Go to the project a tool was asked about, or say why not.
function woocommerce_enter_project() {
  local project_path="${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME}";
  if [ ! -d "${project_path}" ] ; then
    echo "No project ${PROJECT_NAME} in ${WORKSPACE_ROOT}/${doc_name}." ;
    return 1 ;
  fi
  if ! woocommerce_is_project "${project_path}" ; then
    echo "${doc_name}/${PROJECT_NAME} is not a shop: a WordPress project (type: wordpress) with WooCommerce in its plugins." ;
    return 1 ;
  fi
  cd "${project_path}" || return 1 ;
}

# An administrator of the site, for WP-CLI's `wc` commands (they act as a user of the site).
function woocommerce_admin_login() {
  ddev wp user list --role=administrator --field=user_login --orderby=ID --order=ASC --number=1 2>/dev/null | head -1 ;
}

# Set a fresh WooCommerce up as a new shop starts, in the project folder: what its first visit of the
# administration does (orders in their own tables, the new e-mails, the "coming soon" page), done now so
# the shop does not change under a first test; then open to visitors, a store in San Francisco in US
# dollars without taxes, the onboarding wizard skipped and its task lists hidden, no marketplace
# suggestions and no tracking, the offline payments and one flat rate.
function woocommerce_set_up_shop() {
  local admin gateway header ;
  admin="$(woocommerce_admin_login)" ;
  ddev wp eval 'WC_Install::newly_installed();' || return 1 ;
  ddev wp option update woocommerce_coming_soon no > /dev/null ;
  ddev wp option update woocommerce_store_address '60 29th Street' > /dev/null ;
  ddev wp option update woocommerce_store_city 'San Francisco' > /dev/null ;
  ddev wp option update woocommerce_store_postcode '94110' > /dev/null ;
  ddev wp option update woocommerce_default_country 'US:CA' > /dev/null ;
  ddev wp option update woocommerce_currency USD > /dev/null ;
  ddev wp option update woocommerce_calc_taxes no > /dev/null ;
  ddev wp option update woocommerce_default_customer_address base > /dev/null ;
  ddev wp option update woocommerce_onboarding_profile '{"skipped":true}' --format=json > /dev/null ;
  ddev wp option update woocommerce_task_list_hidden_lists '["setup","extended"]' --format=json > /dev/null ;
  ddev wp option update woocommerce_show_marketplace_suggestions no > /dev/null ;
  ddev wp option update woocommerce_allow_tracking no > /dev/null ;
  for gateway in bacs cheque cod ; do
    ddev wp wc payment_gateway update "${gateway}" --enabled=true --user="${admin}" --porcelain > /dev/null ;
  done
  if ! ddev wp wc shipping_zone_method list 0 --user="${admin}" --field=method_id 2>/dev/null | grep -qx flat_rate ; then
    ddev wp wc shipping_zone_method create 0 --method_id=flat_rate --enabled=true --settings='{"cost":"5.00"}' --user="${admin}" --porcelain > /dev/null ;
  fi
  # The header of the default theme with the Mini-Cart and the account link, as a shop owner adds them
  # in the site editor: a template part of the theme, saved in the database.
  header="${WORKSPACE_SCRIPTS}/plugins/woocommerce/header-with-mini-cart.html" ;
  if [ -f "${header}" ] && ! ddev wp post list --post_type=wp_template_part --name=header --format=ids 2>/dev/null | grep -q . ; then
    cp "${header}" .webship-header-with-mini-cart.html ;
    local part ;
    part="$(ddev wp post create .webship-header-with-mini-cart.html --post_type=wp_template_part --post_status=publish --post_name=header --post_title=Header --porcelain)" ;
    rm -f .webship-header-with-mini-cart.html ;
    if [ -n "${part}" ] ; then
      ddev wp post term set "${part}" wp_theme "$(ddev wp option get stylesheet)" > /dev/null ;
      ddev wp post term set "${part}" wp_template_part_area header > /dev/null ;
    fi
  fi
}

# The shop's own sample products, as a person imports them in Tools > Import: the WordPress importer
# reads WooCommerce's sample-data/sample_products.xml, and goes again. Sorting by price and the filters
# read the product lookup tables, which an import does not fill: they are built afterwards.
function woocommerce_import_sample_data() {
  local admin ;
  admin="$(woocommerce_admin_login)" ;
  ddev wp plugin install wordpress-importer --activate || return 1 ;
  ddev wp import wp-content/plugins/woocommerce/sample-data/sample_products.xml --authors=skip --quiet 2> /dev/null ;
  ddev wp plugin uninstall wordpress-importer --deactivate ;
  ddev wp wc tool run regenerate_product_lookup_tables --user="${admin}" > /dev/null ;
  ddev wp wc tool run regenerate_product_attributes_lookup_table --user="${admin}" > /dev/null ;
  ddev wp wc tool run recount_terms --user="${admin}" > /dev/null ;
}

# Build a shop from nothing: the WordPress plugin's builder makes the site, then WooCommerce is added.
function woocommerce_build() {
  trim_project_name ;
  local base_url="https://${PROJECT_NAME}.ddev.site" ;
  local woocommerce_version="${VERSION:-${site_version:-latest}}" ;
  local add_users="${ADD_USERS}" launch="${LAUNCH}" ;

  if ! declare -f wordpress_build > /dev/null ; then
    echo "The WooCommerce plugin builds on the WordPress plugin, which is not installed here:" ;
    echo "  bash core/scripts/plugins.sh --install wordpress" ;
    exit 1 ;
  fi

  # The site, by the WordPress plugin's builder: the container, WordPress, and with --install the site
  # with the workspace account as its administrator. Its --version is WordPress's; the accounts and the
  # browser come after the shop is set up.
  VERSION="${WORDPRESS_VERSION:-${wordpress_version:-latest}}" ;
  ADD_USERS='no' ; LAUNCH='no' ;
  ( wordpress_build ) || exit 1 ;
  ADD_USERS="${add_users}" ; LAUNCH="${launch}" ;

  cd "${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME}" || exit 1 ;

  if [ "${INSTALL}" != 'yes' ] ; then
    # No site yet: WooCommerce goes into the plugins, to activate once WordPress is installed.
    local zip="woocommerce.latest-stable.zip" ;
    [ "${woocommerce_version}" != 'latest' ] && zip="woocommerce.${woocommerce_version}.zip" ;
    ddev exec "curl -fsSL https://downloads.wordpress.org/plugin/${zip} -o /tmp/woocommerce.zip && unzip -oq /tmp/woocommerce.zip -d wp-content/plugins && rm -f /tmp/woocommerce.zip" \
      || { echo "WooCommerce could not be downloaded." ; exit 1 ; } ;
    [ "${ADD_USERS}" == 'yes' ] && echo "--add-users needs --install: there is no site to add accounts to yet." ;
    [ "${SAMPLE_DATA}" == 'yes' ] && echo "--sample-data needs --install: there is no shop to import the products into yet." ;
    echo "${doc_name} ${PROJECT_NAME} is ready to install, with WooCommerce in its plugins.";
    echo "Go to ${base_url}";
    cd ${WORKSPACE_ROOT}/${doc_name};
    return 0 ;
  fi

  # Pretty addresses: the shop's pages (/shop/, /cart/, /checkout/, /my-account/) and its products.
  ddev wp rewrite structure '/%postname%/' > /dev/null ;
  ddev wp plugin install woocommerce ${woocommerce_version:+$( [ "${woocommerce_version}" != 'latest' ] && echo "--version=${woocommerce_version}" )} --activate \
    || { echo "WooCommerce could not be installed." ; exit 1 ; } ;
  woocommerce_set_up_shop || { echo "The shop could not be set up." ; exit 1 ; } ;

  if [ "${SAMPLE_DATA}" == 'yes' ] ; then
    woocommerce_import_sample_data || { echo "The sample products could not be imported." ; exit 1 ; } ;
  fi

  if [ "${ADD_USERS}" == 'yes' ] ; then
    set_woocommerce_users ;
    add_woocommerce_users ;
    cd ${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME} || exit 1 ;
  fi

  ddev wp rewrite flush > /dev/null 2>&1 ;
  echo "${doc_name} ${PROJECT_NAME} has been installed: WordPress $(ddev wp core version 2>/dev/null), WooCommerce $(ddev wp plugin get woocommerce --field=version 2>/dev/null), $(ddev wp post list --post_type=product --format=count 2>/dev/null) products.";
  echo "Go to ${base_url}/shop/, and ${base_url}/wp-admin as ${account_name}";

  if [ "${LAUNCH}" == 'yes' ] ; then
    ddev launch /shop/ ;
  fi

  cd ${WORKSPACE_ROOT}/${doc_name};
}

# Create the default accounts with WP-CLI, with their roles; an account that is already there keeps its
# password and gets its role. The customer gets its billing and shipping address, and the shop's order
# notifications go to the shop manager. The list is loaded by the caller (set_woocommerce_users): the
# core's add_users, the builder, the testing setup.
function add_woocommerce_users() {
  woocommerce_enter_project || return 1 ;
  local user user_name user_mail user_password user_role admin id ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name"; user_mail="user_${user}_mail";
    user_password="user_${user}_password"; user_role="user_${user}_role";

    echo " ---------------------------------------------------------------- ";
    echo "      User name: ${!user_name}";
    echo "      User mail: ${!user_mail}";
    echo "  User password: ${!user_password}";
    echo "      User role: ${!user_role}";
    echo " ================================================================= ";

    if ddev wp user get "${!user_name}" --field=ID > /dev/null 2>&1 ; then
      echo "   ${!user_name} is already there." ;
      ddev wp user set-role "${!user_name}" "${!user_role}" > /dev/null ;
    else
      ddev wp user create "${!user_name}" "${!user_mail}" --role="${!user_role}" --user_pass="${!user_password}" ;
    fi
  done
  admin="$(woocommerce_admin_login)" ;
  if [[ " ${users[*]} " == *" customer "* ]] ; then
    id="$(ddev wp user get "${user_customer_name:-customer}" --field=ID 2>/dev/null)" ;
    [ -n "${id}" ] && ddev wp wc customer update "${id}" --user="${admin}" \
      --first_name=Casey --last_name=Customer \
      --billing='{"first_name":"Casey","last_name":"Customer","address_1":"2 Test Avenue","city":"Los Angeles","state":"CA","postcode":"90001","country":"US","email":"'"${user_customer_mail:-customer@example.com}"'","phone":""}' \
      --shipping='{"first_name":"Casey","last_name":"Customer","address_1":"2 Test Avenue","city":"Los Angeles","state":"CA","postcode":"90001","country":"US"}' \
      --porcelain > /dev/null && echo "   the customer's billing and shipping address: 2 Test Avenue, Los Angeles" ;
  fi
  if [[ " ${users[*]} " == *" shop_manager "* ]] ; then
    # WP-CLI's eval takes one argument, the code: the address goes in it as base64, so no character of
    # an address can break the code's quoting.
    local recipient="${user_shop_manager_mail:-shop_manager@example.com}" encoded ;
    encoded="$(printf '%s' "${recipient}" | base64 | tr -d '\n')" ;
    ddev wp eval 'foreach ( array( "new_order", "cancelled_order", "failed_order" ) as $id ) { $o = get_option( "woocommerce_{$id}_settings", array() ); $o = is_array( $o ) ? $o : array(); $o["enabled"] = "yes"; $o["recipient"] = base64_decode( "'"${encoded}"'" ); update_option( "woocommerce_{$id}_settings", $o ); }' > /dev/null \
      && echo "   the shop's order notifications go to ${recipient}" ;
  fi
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# Delete the default accounts, and what they wrote.
function cancel_woocommerce_users() {
  woocommerce_enter_project || return 1 ;
  local user user_name ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name";
    echo " ---------------------------------------------------------------- ";
    echo "      User name: ${!user_name}";
    echo " ================================================================= ";
    if ddev wp user get "${!user_name}" --field=ID > /dev/null 2>&1 ; then
      ddev wp user delete "${!user_name}" --yes ;
    else
      echo "   ${!user_name} is not there." ;
    fi
  done
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The step pack in the testing stack of a shop. The core's testing_configure calls this in the project
# folder once webship-js is scaffolded and before the dependencies are installed; for a project that is
# not a shop it changes nothing.
#
# The shop's pack extends the WordPress pack, and both go in the same profile: the WordPress plugin's
# hook runs first (its pack, its users registry, its first feature), whichever order the core calls the
# hooks in; then this one adds its pack to package.json and its step definitions to cucumber.js, the tags
# that keep its assertions that must fail out of a normal run, the mailbox of the project, the shop's
# handles in the users registry (with the addresses the mail steps read), and a first feature for the
# shop when the project has none. Every part is skipped when it is already there, so a second run adds
# what the first missed and never resets a suite.
function testing_configure_woocommerce() {
  local project_path="$1";
  woocommerce_is_project "${project_path}" || return 0 ;
  if [ ! -f "${project_path}/cucumber.js" ] || [ ! -f "${project_path}/package.json" ] ; then
    echo "  WooCommerce: cucumber.js is not here yet — run the testing setup again once webship-js is scaffolded." ;
    return 1 ;
  fi

  if declare -f testing_configure_wordpress > /dev/null ; then
    testing_configure_wordpress "${project_path}" || return 1 ;
  fi

  echo "Adding the WooCommerce step pack (${WOOCOMMERCE_STEPS_PACKAGE} ${WOOCOMMERCE_STEPS_VERSION}).";
  set_woocommerce_users ;
  local registry="" user user_name user_mail user_password handle ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name"; user_mail="user_${user}_mail"; user_password="user_${user}_password";
    # The WordPress pack's features call the administrator "admin".
    handle="${user}" ; [ "${user}" == 'administrator' ] && handle="admin" ;
    registry="${registry}${handle}|${!user_name}|${!user_password}|${!user_mail}"$'\n' ;
  done

  python3 - "${project_path}" "${WOOCOMMERCE_STEPS_PACKAGE}" "${WOOCOMMERCE_STEPS_VERSION}" 'WP' "${registry}" <<'PYEOF' || return 1
import json, re, sys

project, pack, version, prefix, registry = sys.argv[1:6]

# package.json: the pack as a dev dependency, at the release line this plugin was proven on.
pkg_file = project + '/package.json'
pkg = json.load(open(pkg_file))
if pack not in pkg.get('dependencies', {}) and pack not in pkg.get('devDependencies', {}):
    pkg.setdefault('devDependencies', {})[pack] = version
    open(pkg_file, 'w').write(json.dumps(pkg, indent=2) + '\n')
    print('  package.json: %s %s' % (pack, version))

cucumber_file = project + '/cucumber.js'
src = open(cucumber_file).read()
before = src

# The pack's step definitions, after webship-js's own (and the WordPress pack's, which it loads itself).
if ('node_modules/%s/' % pack) not in src:
    line = "'node_modules/%s/tests/step-definitions/**/*.js'," % pack
    anchor = re.search(r"^([ \t]*)'node_modules/@webship-js/wordpress-steps/tests/step-definitions/[^']*',.*$", src, re.M) \
        or re.search(r"^([ \t]*)'node_modules/webship-js/tests/step-definitions/[^']*',.*$", src, re.M)
    opening = re.search(r"^([ \t]*)require:[ \t]*\[[ \t]*$", src, re.M)
    if anchor:
        src = src[:anchor.end()] + '\n' + anchor.group(1) + line + src[anchor.end():]
    elif opening:
        src = src[:opening.end()] + '\n' + opening.group(1) + '  ' + line + src[opening.end():]
    else:
        sys.exit("  cucumber.js has no require list this can add to. Add this line to it:\n    " + line)
    print('  cucumber.js: the step definitions of %s' % pack)

# The pack's assertions that must fail are no part of a normal run.
if not re.search(r"^[ \t]*tags:", src, re.M):
    default = re.search(r"^([ \t]*)default:[ \t]*\{[ \t]*$", src, re.M)
    if default:
        pad = default.group(1) + '  '
        src = src[:default.end()] + '\n' + pad + "// Work in progress and the assertions that must fail (@must-fail) stay out of a normal run.\n" \
            + pad + "tags: process.env.CUCUMBER_TAGS || 'not @wip and not @must-fail'," + src[default.end():]
        print('  cucumber.js: the tags that keep the assertions that must fail out of a normal run')

world = re.search(r"^([ \t]*)worldParameters:[ \t]*\{[ \t]*$", src, re.M)
if not world:
    sys.exit("  cucumber.js has no worldParameters block to add the users registry to.")
pad = world.group(1) + '  '

# The mailbox of the project: the shop's mail is read in it (port 8026 of a DDEV project).
if not re.search(r"^[ \t]*mailUrl:", src, re.M):
    block = pad + "// The mailbox that catches the shop's mail (the mail steps read it).\n" \
        + pad + "mailUrl: process.env.MAIL_URL || (process.env.LAUNCH_URL || '').replace(/\\/+$/, '') + ':8026',"
    src = src[:world.end()] + '\n' + block + src[world.end():]
    print('  cucumber.js: the mailbox of the project')
    world = re.search(r"^([ \t]*)worldParameters:[ \t]*\{[ \t]*$", src, re.M)

# Console noise that is not the shop's fault: Chromium logs a permissions policy violation for the unload
# handlers of the administration's classic editor screens (a product, a coupon).
if not re.search(r"^[ \t]*javascript:", src, re.M):
    block = pad + "// Chromium logs \"Permissions policy violation: unload is not allowed in this document.\" on the classic editor\n" \
        + pad + "// screens of the administration (a product, a coupon): not a fault of the shop.\n" \
        + pad + "javascript: { mode: process.env.WEBSHIP_JS_ERROR_MODE || 'warn', levels: ['error'], ignore: 'Permissions policy violation: unload is not allowed' },"
    src = src[:world.end()] + '\n' + block + src[world.end():]
    print('  cucumber.js: the console noise of the administration that is not the shop\'s fault')
    world = re.search(r"^([ \t]*)worldParameters:[ \t]*\{[ \t]*$", src, re.M)

rows = [r.split('|') for r in registry.splitlines() if r.strip()]
entry = lambda handle, name, password, mail: "%s: { username: process.env.%s_%s_USER || '%s', password: process.env.%s_%s_PASSWORD || '%s', email: '%s' }," % (
    handle, prefix, handle.upper(), name, prefix, handle.upper(), password, mail)
users = re.search(r"^([ \t]*)users:[ \t]*\{[ \t]*$", src, re.M)
if users:
    # The registry the WordPress plugin wrote: the shop's handles it does not have go in at its start.
    missing = [r for r in rows if not re.search(r"^[ \t]*%s:[ \t]*\{" % re.escape(r[0]), src, re.M)]
    if missing:
        inner = users.group(1) + '  '
        src = src[:users.end()] + '\n' + '\n'.join(inner + entry(*r) for r in missing) + src[users.end():]
        print('  cucumber.js: the shop\'s accounts in the users registry (%s)' % ', '.join(r[0] for r in missing))
else:
    block = [
        pad + "// The users registry: a handle a scenario reads, mapped to an account of this shop (the default",
        pad + "// accounts: cmd-tools-add-users.sh <project> woocommerce). Override one with %s_<HANDLE>_USER and %s_<HANDLE>_PASSWORD." % (prefix, prefix),
        pad + "users: {",
    ] + [pad + '  ' + entry(*r) for r in rows] + [pad + "},"]
    src = src[:world.end()] + '\n' + '\n'.join(block) + src[world.end():]
    print('  cucumber.js: the users registry (%s)' % ', '.join(r[0] for r in rows))

if src != before:
    open(cucumber_file, 'w').write(src)
PYEOF

  # A first feature for the shop, when the project has none: the shop, a product in the cart, the shop
  # manager's orders, the customer's account.
  local feature="${WORKSPACE_SCRIPTS}/plugins/woocommerce/shop.feature" ;
  if [ -f "${feature}" ] && [ ! -f "${project_path}/tests/features/shop.feature" ] ; then
    mkdir -p "${project_path}/tests/features" && cp "${feature}" "${project_path}/tests/features/shop.feature" \
      && echo "  tests/features/shop.feature: a first feature for the shop" ;
  fi

  # The scenarios log in as the default accounts: make sure an installed site has them.
  if ddev wp core is-installed > /dev/null 2>&1 ; then
    ( add_woocommerce_users > /dev/null ) && echo "  the shop's default accounts are on the site (${users[*]})" ;
  fi
}
