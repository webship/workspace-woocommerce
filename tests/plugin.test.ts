import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import { register, assistantContext, PLATFORM, BASE, COMMANDS, AGENTS } from '../src/index';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const read = (f: string) => fs.readFileSync(path.join(PKG, f), 'utf8');
const manifest = JSON.parse(read('package.json')).workspacePlugin;

test('the manifest names the platform, and every file it names ships', () => {
  assert.strictEqual(manifest.name, PLATFORM);
  const named = [...manifest.commands.files, ...manifest.scripts.functions, ...manifest.scripts.args, ...manifest.scripts.machine,
    ...manifest.ai.agents, ...manifest.ai.skills, ...manifest.ai.commands, ...manifest.ai.prompts, ...manifest.features];
  for (const f of named) assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the package`);
  assert.deepStrictEqual(manifest.commands.files.map((f: string) => path.basename(f)), COMMANDS);
  assert.deepStrictEqual(manifest.ai.agents.map((f: string) => path.basename(f, '.md')), AGENTS);
  assert.deepStrictEqual(manifest.commands.types, ['sites'], 'the commands go to sites folders only');
  assert.ok(manifest.needs.includes(BASE), `it needs the plugin it builds on, ${BASE}`);
  const files: string[] = JSON.parse(read('package.json')).files;
  for (const f of named) assert.ok(files.includes(f.split('/')[0]), `${f} is published with the package`);
});

test('the machine files land beside the functions, under the names the functions read', () => {
  const functions = read('scripts/functions/fun-woocommerce.sh');
  for (const f of manifest.scripts.machine) {
    assert.ok(functions.includes(`\${WORKSPACE_SCRIPTS}/plugins/woocommerce/${path.basename(f)}`), `the functions read ${path.basename(f)} where the installer puts it`);
  }
});

test('every command finds the workspace by itself, names its folder, and sources its args from where the installer puts them', () => {
  for (const f of manifest.commands.files) {
    const src = read(f);
    assert.match(src, /^#!\/usr\/bin\/env bash/, `${f} is a bash script`);
    assert.match(src, /WORKSPACE_SCRIPTS="\$\{WORKSPACE_SCRIPTS:-\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)\/\.\.\/core\/scripts" && pwd\)\}"/, `${f} locates the tooling from its own path`);
    assert.match(src, /workspace\.__WORKSPACE__\.settings\.yml/, `${f} loads the settings of the folder it is installed into`);
    assert.match(src, /source \$\{WORKSPACE_SCRIPTS\}\/plugins\/woocommerce\/args\/arg-[a-z-]+\.sh \|\| exit 1 ;/, `${f} reads its arguments from the plugin's args`);
    const last = src.trim().split('\n').pop() as string;
    assert.match(read('scripts/functions/fun-woocommerce.sh'), new RegExp(`^function ${last.replace(/ ;$/, '')}\\(\\)`, 'm'), `${f} ends by calling a function the plugin defines`);
  }
  assert.match(read('commands/cmd-woocommerce-project.sh'), /^# workspace-name: WooCommerce/m, 'the builder carries the name the Build list shows');
});

test('the help of the builder asks for nothing and changes nothing', () => {
  // The args file is argparse input: every option has a help line, and the flags the brief names are there.
  const args = read('scripts/args/arg-woocommerce.sh');
  for (const flag of ['--install', '--add-users', '--sample-data', '--version', '--wordpress-version', '--launch', '--php-version']) {
    assert.match(args, new RegExp(`'${flag}'`), `the builder has ${flag}`);
  }
  assert.strictEqual((args.match(/parser\.add_argument\(/g) || []).length, (args.match(/help=/g) || []).length, 'every option says what it does');
  // The dashboard's Build form reads a help in single quotes (core/workspace-app/builder-args.js): one in double
  // quotes is drawn without its text.
  assert.doesNotMatch(args, /help="/, 'every help is in single quotes, as the Build form reads it');
});

test('every shell script parses', () => {
  for (const f of [...manifest.commands.files, ...manifest.scripts.functions, ...manifest.scripts.args]) {
    const r = spawnSync('bash', ['-n', path.join(PKG, f)], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('the functions carry the names the core\'s tools look for, and never write database settings', () => {
  const src = read('scripts/functions/fun-woocommerce.sh');
  for (const fn of ['set_woocommerce_users', 'add_woocommerce_users', 'cancel_woocommerce_users', 'testing_configure_woocommerce', 'woocommerce_build', 'woocommerce_is_project']) {
    assert.match(src, new RegExp(`^function ${fn}\\(\\) \\{`, 'm'), `${fn} is defined`);
  }
  assert.doesNotMatch(src, /^function wordpress_[a-z_]+\(\)/m, 'the WordPress plugin\'s functions are used, not redefined');
  assert.doesNotMatch(src, /--dbname|--dbuser|--dbpass|DB_(HOST|NAME|USER|PASSWORD)=/, 'the container tool owns the database settings');
  assert.match(src, /wp plugin install woocommerce/, 'the free plugin, from the plugin directory');
  assert.match(src, /WC_Install::newly_installed\(\)/, 'set up the way a new shop starts');
  assert.match(src, /woocommerce_coming_soon no/, 'open to visitors');
  assert.match(src, /woocommerce_onboarding_profile '\{"skipped":true\}'/, 'the onboarding wizard skipped');
  assert.match(src, /for gateway in bacs cheque cod/, 'the offline payments only');
  assert.match(src, /sample-data\/sample_products\.xml/, 'the shop\'s own sample products');
  assert.match(src, /regenerate_product_lookup_tables/, 'the lookup tables an import leaves empty');
  assert.doesNotMatch(src, /woocommerce\.com\/|wccom|helper_data|jetpack/i, 'no connection to an account of the vendor');
  assert.doesNotMatch(src, /ddev stop -y/, 'ddev stop takes no -y');
  // The runtimes: the address is the runtime's to say, and the layer chooses the tool.
  assert.doesNotMatch(src.replace(/^\s*#.*$/gm, '').replace(/echo "https:\/\/\$\{PROJECT_NAME\}\.ddev\.site"/, ''), /ddev\.site/, 'ddev.site only as the answer of a core with no layer');
  assert.doesNotMatch(src.replace(/^\s*#.*$/gm, ''), /\b(docker|podman|kubectl) |command ddev/, 'only `ddev <verb>`: the layer chooses');
});

test('each agent is a definition the AI Agents folder can list: named after its file, described, on the fable model', () => {
  for (const f of manifest.ai.agents) {
    const src = read(f);
    const head = src.split('\n---\n')[0];
    assert.match(head, /^---\n/, `${f} opens with frontmatter`);
    assert.match(head, new RegExp(`^name: ${path.basename(f, '.md')}$`, 'm'));
    assert.match(head, /^description: .{80,}$/m, `${f} says when to use it`);
    assert.match(head, /^model: fable$/m);
    assert.match(head, /^tools:\n(  - \S+\n?)+/m);
    assert.match(src, /cmd-tools-testing\.sh|cmd-woocommerce-project\.sh/, `${f} names the plugin's commands`);
  }
  const tester = read('ai/agents/woocommerce-tester.md');
  assert.match(tester, /Never create an account in a suite/);
  assert.match(tester, /No platform name in a step phrase/);
  assert.match(tester, /Playwright MCP browser first/);
});

test('register() adds the assistant context and nothing else', () => {
  const calls: string[] = [];
  const api: any = { name: 'woocommerce', addAssistantContext: (fn: () => string) => calls.push(fn()) };
  register(api);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0], assistantContext());
  for (const c of COMMANDS) assert.ok(calls[0].includes(c), `the assistant is told about ${c}`);
  for (const a of AGENTS) assert.ok(calls[0].includes(a), `the assistant is told about ${a}`);
  assert.ok(calls[0].includes('cmd-tools-wordpress-cli.sh'), 'and about the WP-CLI tool the shop is run with');
});

test('the docs say container-based, name only what ships, and carry no personal value', () => {
  const docs = ['README.md', ...manifest.ai.agents, 'scripts/functions/fun-woocommerce.sh'];
  for (const f of docs) {
    const src = read(f);
    assert.doesNotMatch(src, /DDEV-only/i, `${f}: the workspace is container-based, DDEV by default`);
    assert.doesNotMatch(src, /\/home\/(?!YOUR_USER)[a-z]/, `${f} carries no personal path`);
    const mails = src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}/g) || [];
    for (const m of mails) assert.match(m, /@example\.(com|org)$/, `${f}: ${m} is not an example address`);
  }
  for (const c of COMMANDS) assert.ok(read('README.md').includes(c), `the README lists ${c}`);
});
