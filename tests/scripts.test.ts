import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(PKG, 'scripts', 'functions', 'fun-woocommerce.sh');

// The cucumber.js webship-js scaffolds, as far as the testing hook reads it.
const SCAFFOLD = `module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.
      'tests/step-definitions/**/*.js',                                  // Your custom step definitions.
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost:8080',
    },
  },
};
`;

// What the WordPress plugin's testing hook (@webship.co/workspace-wordpress 1.0.11) writes into that
// scaffold: its pack after webship-js's, and its users registry at the start of worldParameters.
const WORDPRESS_PART = `function testing_configure_wordpress() {
  echo "wordpress hook" >> "\${DDEV_LOG:-/dev/null}" ;
  python3 - "$1" <<'PY'
import re, sys, json
p = sys.argv[1]
pkg = json.load(open(p + '/package.json'))
pkg.setdefault('devDependencies', {})['@webship-js/wordpress-steps'] = '^2.2.0'
open(p + '/package.json', 'w').write(json.dumps(pkg, indent=2) + '\\n')
s = open(p + '/cucumber.js').read()
if 'wordpress-steps' not in s:
    s = s.replace("'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.",
        "'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.\\n      'node_modules/@webship-js/wordpress-steps/tests/step-definitions/**/*.js',")
    s = s.replace("    worldParameters: {\\n", "    worldParameters: {\\n      users: {\\n        admin: { username: process.env.WP_ADMIN_USER || 'administrator', password: process.env.WP_ADMIN_PASSWORD || 'dD.123123ddd' },\\n        editor: { username: process.env.WP_EDITOR_USER || 'editor', password: process.env.WP_EDITOR_PASSWORD || 'dD.123123ddd' },\\n      },\\n")
    open(p + '/cucumber.js', 'w').write(s)
PY
}`;

/** A project folder with the testing stack scaffolded, and the tooling folder the installer would have filled. */
function project(type: string, shop = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'woocommerce-plugin-'));
  const dir = path.join(root, 'dev', 'site1');
  fs.mkdirSync(path.join(dir, '.ddev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ddev', 'config.yaml'), `name: site1\ntype: ${type}\ndocroot: ""\n`);
  fs.writeFileSync(path.join(dir, 'cucumber.js'), SCAFFOLD);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'site1', devDependencies: { 'webship-js': '^2.0.16' } }, null, 2));
  if (shop) {
    fs.mkdirSync(path.join(dir, 'wp-content', 'plugins', 'woocommerce'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'wp-content', 'plugins', 'woocommerce', 'woocommerce.php'), '<?php\n');
  }
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'woocommerce'), { recursive: true });
  fs.copyFileSync(path.join(PKG, 'testing', 'shop.feature'), path.join(scripts, 'plugins', 'woocommerce', 'shop.feature'));
  fs.copyFileSync(path.join(PKG, 'site', 'header-with-mini-cart.html'), path.join(scripts, 'plugins', 'woocommerce', 'header-with-mini-cart.html'));
  return { root, dir, scripts };
}

/** Run bash with the plugin's functions sourced and `ddev` replaced by a recorder. */
function bash(script: string, env: Record<string, string> = {}) {
  const r = spawnSync('bash', ['-c', `ddev() { echo "ddev $*" >> "\${DDEV_LOG:-/dev/null}" ; [ "$1 $2" = "wp eval" ] && echo "wp eval got $(( $# - 2 )) argument(s)" >> "\${DDEV_LOG:-/dev/null}" ; case "$*" in "wp user list"*) echo admin1 ;; "wp user get customer --field=ID") echo 7 ;; "wp option get stylesheet") echo twentytwentyfive ;; "wp post create"*) echo 42 ;; esac ; return 0 ; }\nsource ${FUNCTIONS}\n${script}`],
    { encoding: 'utf8', env: { ...process.env, ...env } });
  return r;
}

test('the default accounts are one per role of the shop, with example addresses', () => {
  const r = bash('set_woocommerce_users ; for u in "${users[@]}" ; do n="user_${u}_name" ; m="user_${u}_mail" ; p="user_${u}_password" ; l="user_${u}_role" ; echo "${!n}|${!m}|${!p}|${!l}" ; done');
  assert.strictEqual(r.status, 0, r.stderr);
  const rows = r.stdout.trim().split('\n').map((l) => l.split('|'));
  assert.deepStrictEqual(rows.map((x) => x[0]), ['administrator', 'shop_manager', 'customer']);
  assert.deepStrictEqual(rows.map((x) => x[3]), ['administrator', 'shop_manager', 'customer'], 'each named after its role');
  for (const [name, mail, password] of rows) {
    assert.strictEqual(mail, `${name}@example.com`);
    assert.ok(password.length >= 8);
  }
});

test('a shop is a WordPress project with the shop plugin in it; a plain WordPress site is not', () => {
  const shop = project('wordpress');
  const plain = project('wordpress', false);
  const other = project('drupal11');
  assert.strictEqual(bash(`woocommerce_is_project ${shop.dir}`).status, 0);
  assert.strictEqual(bash(`woocommerce_is_project ${plain.dir}`).status, 1);
  assert.strictEqual(bash(`woocommerce_is_project ${other.dir}`).status, 1);
});

test('the accounts are created with their roles, the customer gets its addresses, the shop manager the order mail', () => {
  const p = project('wordpress');
  const log = path.join(p.root, 'ddev.log');
  const env = { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log };
  let r = bash('set_woocommerce_users ; add_woocommerce_users', env);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const written = fs.readFileSync(log, 'utf8');
  // The recorder answers "wp user get" with success: each account is there already and gets its role.
  for (const role of ['administrator', 'shop_manager', 'customer']) assert.match(written, new RegExp(`^ddev wp user set-role ${role} ${role}$`, 'm'));
  assert.match(written, /^ddev wp wc customer update 7 --user=admin1 --first_name=Casey --last_name=Customer --billing=\{"first_name":"Casey".*"city":"Los Angeles".*"email":"customer@example\.com"/m);
  assert.match(written, /--shipping=\{"first_name":"Casey".*"address_1":"2 Test Avenue"/);
  // WP-CLI's eval takes one argument, the code; the shop manager's address is in it, as base64.
  assert.match(written, /^ddev wp eval .*"recipient"\] = base64_decode\( "c2hvcF9tYW5hZ2VyQGV4YW1wbGUuY29t" \)/m);
  assert.strictEqual(Buffer.from('c2hvcF9tYW5hZ2VyQGV4YW1wbGUuY29t', 'base64').toString(), 'shop_manager@example.com');
  const evals = written.match(/^wp eval got \d+ argument\(s\)$/gm) || [];
  assert.ok(evals.length >= 1, 'the order notifications are set with wp eval');
  for (const line of evals) assert.strictEqual(line, 'wp eval got 1 argument(s)', 'wp eval takes the code and nothing else');
  fs.writeFileSync(log, '');
  r = bash('set_woocommerce_users ; cancel_woocommerce_users', env);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  for (const name of ['administrator', 'shop_manager', 'customer']) assert.match(fs.readFileSync(log, 'utf8'), new RegExp(`^ddev wp user delete ${name} --yes$`, 'm'));
});

test('the builder makes the site with the WordPress plugin\'s builder, then sets the shop up, imports the products and adds the accounts', () => {
  const p = project('wordpress');
  const log = path.join(p.root, 'ddev.log');
  const env = { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log, account_name: 'webmaster' };
  const r = bash(`trim_project_name() { :; } ; wordpress_build() { echo "wordpress_build VERSION=$VERSION ADD_USERS=$ADD_USERS LAUNCH=$LAUNCH" >> "$DDEV_LOG" ; } ; INSTALL=yes ADD_USERS=yes SAMPLE_DATA=yes LAUNCH=no VERSION=11.3.0 WORDPRESS_VERSION=7.1.5 woocommerce_build`, env);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const written = fs.readFileSync(log, 'utf8');
  const lines = written.split('\n');
  const at = (re: RegExp) => lines.findIndex((l) => re.test(l));
  assert.match(written, /^wordpress_build VERSION=7\.1\.5 ADD_USERS=no LAUNCH=no$/m, 'the WordPress builder gets WordPress\'s version, and leaves the accounts and the browser to the shop\'s builder');
  assert.ok(at(/wp plugin install woocommerce --version=11\.3\.0 --activate/) > at(/^wordpress_build/), 'the shop plugin comes after the site');
  assert.ok(at(/WC_Install::newly_installed/) > at(/wp plugin install woocommerce/), 'then it is set up as a new shop');
  assert.ok(at(/wp option update woocommerce_coming_soon no/) > at(/WC_Install::newly_installed/), 'open to visitors after the first-visit setup turned "coming soon" on');
  for (const gateway of ['bacs', 'cheque', 'cod']) assert.match(written, new RegExp(`wp wc payment_gateway update ${gateway} --enabled=true`));
  assert.match(written, /wp wc shipping_zone_method create 0 --method_id=flat_rate --enabled=true --settings=\{"cost":"5\.00"\}/);
  assert.match(written, /wp post create \.webship-header-with-mini-cart\.html --post_type=wp_template_part/);
  assert.match(written, /wp post term set 42 wp_theme twentytwentyfive/);
  assert.ok(at(/wp import wp-content\/plugins\/woocommerce\/sample-data\/sample_products\.xml/) > at(/wp plugin install wordpress-importer/));
  assert.ok(at(/wp plugin uninstall wordpress-importer/) > at(/wp import/), 'the importer goes again');
  assert.ok(at(/regenerate_product_lookup_tables/) > at(/wp import/), 'the lookup tables are built for the imported products');
  assert.ok(at(/wp user set-role customer customer/) > at(/regenerate_product_lookup_tables/), 'the accounts come last');
  assert.deepStrictEqual(fs.readdirSync(p.dir).filter((f) => f.startsWith('.webship-')), [], 'the header file is gone from the project');
});

test('the builder says so, and stops, when the WordPress plugin is not here', () => {
  const p = project('wordpress');
  const r = bash('trim_project_name() { :; } ; INSTALL=yes woocommerce_build', { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1' });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /builds on the WordPress plugin, which is not installed here/);
  assert.match(r.stdout, /plugins\.sh --install wordpress/);
});

test('the testing hook runs the WordPress plugin\'s part first, then adds the shop\'s pack and handles to its registry, once', () => {
  const p = project('wordpress');
  const log = path.join(p.root, 'ddev.log');
  const run = () => bash(`${WORDPRESS_PART}\ncd ${p.dir} && testing_configure_woocommerce ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log });
  const r = run();
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(fs.readFileSync(log, 'utf8'), /^wordpress hook$/m, 'the WordPress plugin\'s hook ran');
  const pkg = JSON.parse(fs.readFileSync(path.join(p.dir, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.devDependencies['@webship-js/woocommerce-steps'], '^2.0.0');
  assert.strictEqual(pkg.devDependencies['@webship-js/wordpress-steps'], '^2.2.0', 'the base pack stays');
  const cucumber = fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8');
  const lines = cucumber.split('\n');
  const base = lines.findIndex((l) => l.includes('node_modules/@webship-js/wordpress-steps/tests/step-definitions'));
  assert.strictEqual(lines[base + 1], "      'node_modules/@webship-js/woocommerce-steps/tests/step-definitions/**/*.js',", 'the shop\'s pack right after the WordPress pack, in the same profile');
  assert.doesNotMatch(cucumber, /webship-workspace profile/, 'no profile of its own: the extension goes with its base');
  assert.match(cucumber, /shop_manager: \{ username: process\.env\.WP_SHOP_MANAGER_USER \|\| 'shop_manager', password: process\.env\.WP_SHOP_MANAGER_PASSWORD \|\| '[^']+', email: 'shop_manager@example\.com' \},/);
  assert.match(cucumber, /customer: \{ username: process\.env\.WP_CUSTOMER_USER \|\| 'customer'/);
  assert.strictEqual((cucumber.match(/^\s*admin: \{/gm) || []).length, 1, 'the WordPress plugin\'s admin stays the only one');
  assert.match(cucumber, /mailUrl: process\.env\.MAIL_URL \|\|/);
  assert.match(cucumber, /tags: process\.env\.CUCUMBER_TAGS \|\| 'not @wip and not @must-fail',/);
  assert.match(cucumber, /ignore: 'Permissions policy violation: unload is not allowed'/, 'the browser\'s noise on the classic editor screens is named and left out');
  // Still a module node can load, with one registry where webship-js reads it.
  const loaded = spawnSync(process.execPath, ['-e', `const c = require(${JSON.stringify(path.join(p.dir, 'cucumber.js'))}).default; console.log(JSON.stringify([c.require, Object.keys(c.worldParameters.users), c.tags, typeof c.worldParameters.mailUrl]))`], { encoding: 'utf8', env: { ...process.env, LAUNCH_URL: 'https://site1.ddev.site' } });
  assert.strictEqual(loaded.status, 0, loaded.stderr);
  const [requires, handles, tags, mail] = JSON.parse(loaded.stdout);
  assert.strictEqual(requires.length, 4);
  assert.deepStrictEqual(handles.sort(), ['admin', 'customer', 'editor', 'shop_manager']);
  assert.match(tags, /not @must-fail/);
  assert.strictEqual(mail, 'string');
  assert.ok(fs.existsSync(path.join(p.dir, 'tests', 'features', 'shop.feature')));
  // Again, after a person changed the feature: nothing is doubled, nothing is reset.
  fs.writeFileSync(path.join(p.dir, 'tests', 'features', 'shop.feature'), 'Feature: mine\n');
  assert.strictEqual(run().status, 0);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), cucumber);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'shop.feature'), 'utf8'), 'Feature: mine\n');
});

test('without the WordPress plugin\'s hook, the testing hook writes the whole registry itself', () => {
  const p = project('wordpress');
  const r = bash(`cd ${p.dir} && testing_configure_woocommerce ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1' });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const cucumber = fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8');
  const lines = cucumber.split('\n');
  const core = lines.findIndex((l) => l.includes('node_modules/webship-js/tests/step-definitions'));
  assert.strictEqual(lines[core + 1], "      'node_modules/@webship-js/woocommerce-steps/tests/step-definitions/**/*.js',", 'after webship-js: the pack loads the WordPress pack itself');
  const loaded = spawnSync(process.execPath, ['-e', `console.log(Object.keys(require(${JSON.stringify(path.join(p.dir, 'cucumber.js'))}).default.worldParameters.users).join(','))`], { encoding: 'utf8' });
  assert.strictEqual(loaded.stdout.trim(), 'admin,shop_manager,customer');
});

test('the testing hook leaves a project that is not a shop alone', () => {
  for (const p of [project('drupal11'), project('wordpress', false)]) {
    const r = bash(`cd ${p.dir} && testing_configure_woocommerce ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1' });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
    assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), SCAFFOLD);
    assert.ok(!fs.existsSync(path.join(p.dir, 'tests')));
  }
});

test('the user tools refuse a project that is not a shop', () => {
  const p = project('wordpress', false);
  const r = bash('set_woocommerce_users ; add_woocommerce_users', { WORKSPACE_ROOT: p.root, doc_name: 'dev', PROJECT_NAME: 'site1' });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /is not a shop/);
});

test('the first feature names no platform in a step, and no password', () => {
  const feature = fs.readFileSync(path.join(PKG, 'testing', 'shop.feature'), 'utf8');
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  assert.ok(steps.length >= 15);
  for (const s of steps) assert.doesNotMatch(s, /woocommerce|wordpress|woo\b/i, s);
  assert.doesNotMatch(feature, /password "/);
  assert.doesNotMatch(feature, /user create|I register/i, 'a suite never creates an account');
});
