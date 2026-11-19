/**
 * What this plugin needs from the workspace it is added to and from the machine (the manifest's `needs` and `suggests`).
 * The workspace reads them: github.com/webship/workspace, core/workspace-app/PLUGINS.md.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Compiled, this test runs from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;

test("the manifest says what the plugin needs: the plugins and the commands it cannot work without, and what a part of it uses", () => {
  assert.deepStrictEqual(manifest.needs, [['dev', 'test', 'sandboxes', 'demos'], 'wordpress', 'ai-agents', 'ai-skills', 'ai-commands', 'ai-prompts']);
  assert.deepStrictEqual(manifest.suggests, undefined);
  assert.deepStrictEqual(manifest.needs[0], manifest.commands.workspaces, 'the alternatives are the folders the commands go to');
  for (const kind of ['agents', 'skills', 'commands', 'prompts']) assert.ok(manifest.ai[kind].length > 0, `it ships ${kind}, which is why it needs the folder they are placed in`);
  assert.match(fs.readFileSync(path.join(PKG, 'README.md'), 'utf8'), /^## What it needs$/m, 'and the README says so');
});

test('it needs the WordPress plugin, whose builder and WP-CLI tool it builds on, and says so', () => {
  assert.ok(manifest.needs.includes('wordpress'), 'the WordPress plugin is a need: the builder starts from its wordpress_build');
  const functions = fs.readFileSync(path.join(PKG, 'scripts', 'functions', 'fun-woocommerce.sh'), 'utf8');
  assert.match(functions, /\( wordpress_build \) \|\| exit 1 ;/, 'the site is made by the WordPress plugin\'s builder');
  assert.match(functions, /declare -f testing_configure_wordpress/, 'the testing hook runs the WordPress plugin\'s part first');
  assert.match(fs.readFileSync(path.join(PKG, 'README.md'), 'utf8'), /@webship\.co\/workspace-wordpress/, 'the README names it');
});
