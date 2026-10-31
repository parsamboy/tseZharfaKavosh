'use strict';
/**
 * tools/buildProgramProbe.v1.js
 *
 * Injects build/filterProgram.v1.js into probes/aProgramLive.template.v1.js and writes
 * probes/aProgramLive.v1.js - the file the owner pastes into the console.
 *
 * The body is injected as a JSON string literal. Doing it any other way (a heredoc, a
 * template literal, a marker-and-slice) either escapes incorrectly or breaks if the body
 * ever contains the end marker. JSON.stringify is the only form that cannot.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */

const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'probes', 'aProgramLive.template.v1.js');
const BODY = path.join(ROOT, 'build', 'filterProgram.v1.js');
// The probe is written to the REPO ROOT under an unmistakable name. It used to be written
// into probes/ beside two dozen other *.live.v1.js files, and the owner twice pasted a
// different one (an old probe that wants the bundle pasted first, and a node harness).
// There is now exactly ONE file in this repository that is meant to be pasted into the
// page, and its name says so.
const OUT = path.join(ROOT, 'RUN_ME.js');
const TOKEN = "'__TSE_PROGRAM_BODY__'";

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}

const template = fs.readFileSync(TEMPLATE, 'utf8');
const program = fs.readFileSync(BODY, 'utf8').replace(/\s+$/, '');

const count = template.split(TOKEN).length - 1;
if (count !== 1) {
  console.error('BUILD REFUSED: the body token appears ' + count + ' times in the template (expected exactly 1).');
  process.exit(1);
}
if (!program.length) {
  console.error('BUILD REFUSED: build/filterProgram.v1.js is empty - run tools/buildFilterProgram.v1.js first.');
  process.exit(1);
}

// Splice by index, never with String.replace: the replacement is ~51 KB of engine source
// full of `$` characters (regexes such as /^\\d+$/), and replace() interprets `$&`, `$\``,
// `$\'` and `$1`..`$99` inside the replacement string. That silently corrupts the body.
const at = template.indexOf(TOKEN);
const literal = JSON.stringify(program);
const probe = template.slice(0, at) + literal + template.slice(at + TOKEN.length);

// the generated file must parse, and the injected body must be present verbatim
try {
  // eslint-disable-next-line no-new-func
  new Function(probe);
} catch (e) {
  console.error('BUILD REFUSED: the generated probe does not parse: ' + String((e && e.message) || e));
  process.exit(1);
}
if (probe.indexOf('var BODY = ' + literal + ';') === -1) {
  console.error('BUILD REFUSED: the injected body is not present in the probe verbatim.');
  process.exit(1);
}
if (probe.indexOf(TOKEN) !== -1) {
  console.error('BUILD REFUSED: the body token survived into the generated probe.');
  process.exit(1);
}

// A banner the owner cannot miss, because two different files have now been pasted by
// mistake: an obsolete probe that wants the bundle pasted first, and a node harness.
const BANNER = [
  '/**',
  ' * ===========================================================================',
  ' *  RUN_ME.js  -  PASTE THIS WHOLE FILE INTO THE PAGE CONSOLE.',
  ' *  https://old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  F12 -> Console.',
  ' *  Nothing else needs to be pasted first: the program is self-contained.',
  ' *  Do NOT paste any *.harness.v1.js (those are node files) and do NOT paste',
  ' *  src/engine/tseEngine.browser.v1.js (this file already contains it).',
  ' * ===========================================================================',
  ' */',
  ''
].join('\n');
fs.writeFileSync(OUT, BANNER + probe);

// It must parse. The vm.Script check above catches syntax, but node --check is the same
// engine the owner's browser is closest to, and it costs nothing.
try {
  execFileSync(process.execPath, ['--check', OUT], { stdio: 'pipe' });
} catch (e) {
  console.error('BUILD REFUSED: node --check failed on the written probe.');
  process.exit(1);
}
console.log('  probe template  ' + path.relative(ROOT, TEMPLATE) + '  (' + template.length + ' bytes)');
console.log('  program body    ' + program.length + ' bytes / fnv1a ' + fnv1a(program));
console.log('  probe           ' + probe.length + ' bytes -> ' + path.relative(ROOT, OUT));
console.log('  round-trip      identical');
console.log('  RUN AT          old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12), one paste, no prerequisite');
console.log('  PASTE THIS      RUN_ME.js  (the only file in this repo meant for the browser)');
