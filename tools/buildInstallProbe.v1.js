/**
 * tools/buildInstallProbe.v1.js — build INSTALL_ME.js (the clean install paste)
 *
 * WHY A SEPARATE BUILDER
 *   RUN_ME.js is a PROBE: it measures, cross-checks and rolls back, because its job is to
 *   answer a question about the program. The owner then asked for the opposite — «یک کد تمیز
 *   تا اینجا تهیه کن در تکست اریا ثبت بشود و حداقل UX را نمایش بدهد» — a clean install that
 *   registers the program through the textarea and shows the UX. That is a different product
 *   with a different contract (no rollback, no disarm, no Proxy), so it gets its own template
 *   and its own builder rather than a flag bolted onto the probe.
 *
 * TWO INJECTIONS, BOTH BY INDEX
 *   build/filterProgram.v1.js  -> the 51,719-byte self-contained program
 *   probes/aSettingsPanel.live.v1.js -> the E-070/G-29 UX panel, embedded verbatim
 *
 *   Neither is spliced with String.replace: a 51 KB engine body and a 23 KB panel both contain
 *   `$&`, `` $` ``, `$'` and `$1..$99`, which replace() would interpret in the replacement and
 *   silently corrupt. The token is replaced by an index-based slice, and JSON.stringify is the
 *   only literal form that cannot be escaped wrong (a template literal or a marker-and-slice
 *   either escapes incorrectly or breaks if the body ever contains the end marker).
 *
 * GUARDS (all must pass or nothing is written)
 *   1. each token appears exactly once
 *   2. the program round-trips: JSON.parse of the injected literal === the file on disk
 *   3. the panel round-trips the same way
 *   4. no token is left in the output
 *   5. the output parses as JavaScript
 *   6. the program's fnv1a is reported, so the operator can see it is the same program that
 *      ran live (036ebf14 in E-077/E-078/E-079/E-080)
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'probes', 'aInstall.template.v1.js');
const PROGRAM = path.join(ROOT, 'build', 'filterProgram.v1.js');
const PANEL = path.join(ROOT, 'probes', 'aSettingsPanel.live.v1.js');
const OUT = path.join(ROOT, 'INSTALL_ME.js');

const PROGRAM_TOKEN = "'__TSE_PROGRAM_BODY__'";
const PANEL_TOKEN = "'__TSE_PANEL_PROBE__'";

// MUST stay byte-for-byte the same function as tools/buildFilterProgram.v1.js,
// tools/buildProgramProbe.v1.js and probes/aProgramLive.template.v1.js. A second
// implementation once silently disagreed with the one that produced the live hash: it omitted
// the `& 0xff`, so any character above U+00FF hashed differently and the installer reported
// 41df8acb for the very program every live run reports as 036ebf14. One hash function, or the
// identity claim cannot be checked at all.
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 0xff; h = (h * 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}

// The installer must not put an unverified program on the owner's page. 036ebf14 is the
// fnv1a of the body that E-077, E-078, E-079 and E-080 all ran live and verified. If the body
// changes, the change must be run through RUN_ME.js first and this constant updated with the
// evidence id - otherwise the installer would be shipping something nobody has measured.
const LIVE_VERIFIED_FNV1A = '036ebf14';
const LIVE_VERIFIED_BYTES = 51719;

// A JS string literal must not contain a raw U+2028/U+2029: they are legal in JSON but were
// line terminators in JavaScript until ES2019, so an older engine would see a syntax error.
function jsLiteral(s) {
  return JSON.stringify(s)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function read(p) {
  if (!fs.existsSync(p)) {
    console.error('MISSING: ' + path.relative(ROOT, p) + ' — run the builder that produces it first.');
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

const template = read(TEMPLATE);
const program = read(PROGRAM).replace(/\s+$/, '');   // the same trailing-whitespace strip
const panel = read(PANEL);

// ---- guard 1: each token exactly once ----
for (const [name, tok] of [['program', PROGRAM_TOKEN], ['panel', PANEL_TOKEN]]) {
  const n = template.split(tok).length - 1;
  if (n !== 1) {
    console.error('REFUSING TO BUILD: the ' + name + ' token appears ' + n + ' times, expected exactly 1.');
    process.exit(1);
  }
}

// ---- inject by index, never with replace() ----
let out = template;
{
  const at = out.indexOf(PROGRAM_TOKEN);
  out = out.slice(0, at) + jsLiteral(program) + out.slice(at + PROGRAM_TOKEN.length);
}
{
  const at = out.indexOf(PANEL_TOKEN);
  out = out.slice(0, at) + jsLiteral(panel) + out.slice(at + PANEL_TOKEN.length);
}

// ---- guard 4: no token left ----
// The bare names also appear in the header comment on purpose, so the guard looks for the
// QUOTED token - the literal that would be left behind by a failed injection.
if (out.indexOf(PROGRAM_TOKEN) !== -1 || out.indexOf(PANEL_TOKEN) !== -1) {
  console.error('REFUSING TO BUILD: a token survived the injection.');
  process.exit(1);
}

// ---- guards 2 and 3: the round-trip ----
// Parse the two injected literals back out of the built file by re-evaluating the assignment
// lines, and require them to equal the sources byte for byte.
const roundTrip = vm.runInNewContext(
  '(function(){ var BODY = ' + jsLiteral(program) + '; var PANEL_SRC = ' + jsLiteral(panel) + ';' +
  ' return { body: BODY, panel: PANEL_SRC }; })()', {}, { filename: 'roundtrip.js' });
if (roundTrip.body !== program) {
  console.error('REFUSING TO BUILD: the program does not round-trip (' +
    roundTrip.body.length + ' vs ' + program.length + ' bytes).');
  process.exit(1);
}
if (roundTrip.panel !== panel) {
  console.error('REFUSING TO BUILD: the panel does not round-trip.');
  process.exit(1);
}
// and the literals actually present in the output must decode to the same things
const inOutput = vm.runInNewContext(
  '(function(src){ var BODY = ' + extract(out, 'var BODY = ') + ';' +
  ' var PANEL_SRC = ' + extract(out, 'var PANEL_SRC = ') + ';' +
  ' return { body: BODY, panel: PANEL_SRC }; })()', {}, { filename: 'inoutput.js' });
function extract(src, prefix) {
  const at = src.indexOf(prefix);
  if (at === -1) throw new Error('cannot find ' + prefix.trim());
  const from = at + prefix.length;
  // the literal ends at the first `;` that is not inside the string: walk the quotes
  let i = from, q = src[from], esc = false;
  if (q !== '"') throw new Error('expected a double-quoted literal after ' + prefix.trim());
  for (i = from + 1; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === q) { i++; break; }
  }
  return src.slice(from, i);
}
if (inOutput.body !== program || inOutput.panel !== panel) {
  console.error('REFUSING TO BUILD: the literals in the output do not decode to the sources.');
  process.exit(1);
}

// ---- guard 4b: this is the program that ran live ----
const programFnv = fnv1a(program);
if (programFnv !== LIVE_VERIFIED_FNV1A || program.length !== LIVE_VERIFIED_BYTES) {
  console.error('REFUSING TO BUILD: build/filterProgram.v1.js is ' + program.length +
    ' bytes / fnv1a ' + programFnv + ', but the live-verified program is ' +
    LIVE_VERIFIED_BYTES + ' bytes / fnv1a ' + LIVE_VERIFIED_FNV1A +
    ' (E-077/E-078/E-079/E-080).');
  console.error('  An installer must not put an unmeasured body on the owner\'s page.');
  console.error('  Run node tools/buildProgramProbe.v1.js, paste RUN_ME.js, confirm it verifies,');
  console.error('  then update LIVE_VERIFIED_FNV1A here with the new evidence id.');
  process.exit(1);
}

// ---- guard 5: it parses ----
try {
  new vm.Script(out, { filename: 'INSTALL_ME.js' });
} catch (e) {
  console.error('REFUSING TO BUILD: the output does not parse — ' + e.message);
  process.exit(1);
}
const BANNER = [
  '/**',
  ' * ===========================================================================',
  ' *  INSTALL_ME.js  —  PASTE THIS WHOLE FILE INTO THE PAGE CONSOLE.',
  ' *  https://old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  F12 -> Console.',
  ' *  ONE paste, nothing before it. It REGISTERS the program in the filter textarea',
  ' *  (so it is live and survives a reload) and shows the UX panel bottom-left.',
  ' *  It does NOT measure and it does NOT roll back — the registration is the product.',
  ' *  To take it off the page afterwards, follow the instructions it prints.',
  ' * ===========================================================================',
  ' */',
  ''
].join('\n');

fs.writeFileSync(OUT, BANNER + out);

// guard 5, on the file that was actually written
try {
  execFileSync(process.execPath, ['--check', OUT], { stdio: 'pipe' });
} catch (e) {
  console.error('REFUSING TO BUILD: node --check failed on the written file.');
  process.exit(1);
}

console.log('  program          ' + program.length + ' bytes / ' + (program.split('\n').length) + ' lines / fnv1a ' + fnv1a(program));
console.log('  panel            ' + panel.length + ' bytes / fnv1a ' + fnv1a(panel));
console.log('  installer        ' + out.length + ' bytes -> INSTALL_ME.js');
console.log('  round-trip       program and panel both byte-identical');
console.log('  RUN AT           old.tsetmc.com/Loader.aspx?ParTree=15131F  ->  Console (F12), one paste, no prerequisite');
console.log('  PASTE THIS       INSTALL_ME.js  (the only file in this repo meant for the browser)');
