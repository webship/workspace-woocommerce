#!/usr/bin/env node
'use strict';

// Writes tests/fixtures/step-definitions.txt: one regular expression per step definition of the step
// pack, of the WordPress step pack it brings along and of webship-js, as a project whose testing stack is
// set up has them, for tests/items.test.ts. A step registered with a regular expression is written as it
// is (also one registered with ThenF or with OWN_LENGTH); one registered with a Cucumber expression ('a
// cookie with the name {string} should exist') is turned into the regular expression it stands for.
//
// Usage, from the folder of a project whose testing stack is set up:
//   node <this plugin>/tests/fixtures/refresh-step-definitions.js > <this plugin>/tests/fixtures/step-definitions.txt

const fs = require('fs');
const path = require('path');

const pack = '@webship-js/woocommerce-steps';
const base = '@webship-js/wordpress-steps';
const dirs = [pack, base, 'webship-js'].map((name) => path.join('node_modules', name, 'tests', 'step-definitions'));
const version = (name) => JSON.parse(fs.readFileSync(path.join('node_modules', name, 'package.json'), 'utf8')).version;

function fromExpression(text) {
  let s = text.replace(/[.*+?^$|[\]\\]/g, '\\$&');
  s = s.replace(/\(([^)]*)\)/g, '(?:$1)?');
  s = s.replace(/\b(\w+(?:\/\w+)+)\b/g, (m) => '(?:' + m.split('/').join('|') + ')');
  s = s.replace(/\{string\}/g, '"([^"]*)"').replace(/\{int\}/g, '(-?\\d+)').replace(/\{float\}/g, '(-?\\d*\\.?\\d+)').replace(/\{word\}/g, '([^\\s]+)').replace(/\{\}/g, '(.*)');
  return '^' + s + '$';
}

const out = new Set();
for (const dir of dirs) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of src.matchAll(/^[ \t]*(?:Given|When|Then)F?\(\s*(?:\/((?:\\\/|[^/\n])+)\/[a-z]*|'((?:\\'|[^'\n])*)')/gm)) {
      out.add(m[1] !== undefined ? m[1] : fromExpression(m[2]));
    }
  }
}
process.stdout.write(`# ${pack} ${version(pack)}, ${base} ${version(base)} and webship-js ${version('webship-js')}\n${[...out].sort().join('\n')}\n`);
