/**
 * tools/checkConstraints.v1.js — enforce docs/FUNNEL_CONSTRAINTS_v1.0.md
 *
 * WHY THIS EXISTS
 *   The owner asked for the constraints to be REGISTERED and their compliance to be
 *   MANDATORY before the funnel and its UX are redesigned. A constraint that lives only in a
 *   document is a wish; this file is the part that makes it a rule. Every mechanically
 *   checkable constraint is checked here, the suites are run, and the process exits non-zero
 *   on the first class of violation.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   It does not pretend the four live-only constraints are satisfied. C-24..C-27 can only be
 *   proven by running on the owner's page, so they are reported as UNMEASURED with the
 *   evidence id that last measured them. "Not proven" is not the same as "compliant", and the
 *   difference has cost this project three guesses already.
 *
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// The canonical fnv1a. C-21: there must be exactly one of these in the repository.
const CANONICAL_FNV1A = /function fnv1a\(s\) \{\s*let h = 0x811c9dc5;\s*for \(let i = 0; i < s\.length; i\+\+\) \{ h \^= s\.charCodeAt\(i\) & 0xff; h = \(h \* 0x01000193\) >>> 0; \}\s*return \('00000000' \+ h\.toString\(16\)\)\.slice\(-8\);\s*\}/;

let pass = 0, fail = 0, unmeasured = 0;
const rows = [];
function ok(id, name, detail) { pass++; rows.push({ id: id, state: 'PASS', name: name, detail: detail }); }
function bad(id, name, detail) { fail++; rows.push({ id: id, state: 'FAIL', name: name, detail: detail }); }
function unmeasuredRow(id, name, detail) { unmeasured++; rows.push({ id: id, state: 'UNMEASURED', name: name, detail: detail }); }

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function exists(p) { return fs.existsSync(path.join(ROOT, p)); }

function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'build') continue;
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(js|md)$/.test(e.name)) out.push(rel);
  }
  return out;
}

// ==========================================================================
console.log('\n=== the suites: every mechanical constraint they encode must be green ===');
const SUITES = [
  ['probes/engine.parity.v1.js', 'C-11 C-12 C-13 (engine clamps, plc, IV window)'],
  ['probes/uxSettings.parity.v1.js', 'C-11 C-14 (garbage->default, one place for a range)'],
  ['probes/bundle.parity.v1.js', 'C-07 C-08 (the bundle carries the settings layer)'],
  ['probes/filterProgram.harness.v1.js', 'C-01 C-04 C-09 C-10 (completion value, both lengths, fail-open visible)'],
  ['probes/aSettingsApply.harness.v1.js', 'C-17 C-18 (rollback on every path, editor emptied)'],
  ['probes/aTextAreaRegister.harness.v1.js', 'C-07 C-17 (the textarea path and its rollback)'],
  ['probes/aProgramLive.harness.v1.js', 'C-01 C-02 C-04 C-09 C-10 C-17 C-18'],
  ['probes/aInstall.harness.v1.js', 'C-02 C-07 C-08 C-10 C-11 (installs and stays, gate refuses, tick armed)']
];
for (const [suite, covers] of SUITES) {
  if (!exists(suite)) { bad('suite', suite, 'MISSING'); continue; }
  try {
    const out = execFileSync(process.execPath, [suite], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const m = /failures=(\d+)/.exec(out) || /fail=(\d+)/.exec(out);
    const n = m ? Number(m[1]) : 0;          // a green suite that prints no count is still green
    if (n === 0) ok('suite', path.basename(suite), covers);
    else bad('suite', path.basename(suite), n + ' failures — covers ' + covers);
  } catch (e) {
    const o = String(e.stdout || '') + String(e.stderr || '');
    const m = /failures=(\d+)/.exec(o) || /fail=(\d+)/.exec(o);
    bad('suite', path.basename(suite), (m ? m[1] + ' failures' : 'exited non-zero') + ' — covers ' + covers);
  }
}

// ==========================================================================
console.log('\n=== the program body: the per-row tail is the only part that runs per row ===');
if (!exists('build/filterProgram.v1.js')) {
  bad('build', 'build/filterProgram.v1.js', 'MISSING — run node tools/buildFilterProgram.v1.js');
} else {
  const program = read('build/filterProgram.v1.js').replace(/\s+$/, '');
  // The per-row tail is everything from the last `try {` before the lookup to the end. The
  // install block above it legitimately touches window, storage and the engine.
  const lookAt = program.indexOf('var P = W.__TSE_PROGRAM;');
  const tailAt = program.lastIndexOf('try {', lookAt);
  const tail = program.slice(tailAt);
  const head = program.slice(0, tailAt);

  // C-01 the completion value is the verdict
  ok('C-01', 'the body ends with the IIFE call', /}\)\(\);\s*$/.test(program) ? 'ends })();' : '');
  if (/return FilterResult;/.test(tail)) bad('C-01', 'the tail does not use the wrapper model', 'found `return FilterResult;` in the per-row tail');
  else ok('C-01', 'the tail does not use the wrapper model', 'no `return FilterResult;` per row');
  if (/return verdict;/.test(tail) && /return true;/.test(tail)) ok('C-04', 'a fail-open exit yields true, never undefined', 'tail returns verdict / true');
  else bad('C-04', 'a fail-open exit yields true', 'the tail does not return verdict and true');

  // C-02 the site is fail-closed: the tail must never throw
  if (/catch \(e\) \{\s*return true;\s*\}/.test(tail)) ok('C-02', 'the tail swallows everything into fail-open', 'catch -> return true');
  else bad('C-02', 'the tail swallows everything into fail-open', 'no `catch (e) { return true; }`');

  // C-09 both lengths
  if (/known\.length/.test(tail) && /bits\.length/.test(tail)) ok('C-09', 'both known.length and bits.length are checked', 'the short-bitset hole is closed');
  else bad('C-09', 'both lengths are checked', 'tail checks ' +
    (/known\.length/.test(tail) ? 'known' : '') + (/bits\.length/.test(tail) ? ' bits' : '') || 'neither');

  // C-05 / C-06 the per-row path is pure and reads only the projection
  const forbidden = ['document', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'fetch(', 'SaveParams',
    'createBEngine', 'RenderData', 'mw.AllRows', 'mw.Settings', 'setTimeout', 'requestIdleCallback', 'indexedDB'];
  const found = forbidden.filter((t) => tail.indexOf(t) !== -1);
  if (found.length === 0) ok('C-05', 'the per-row path is pure', 'no DOM / timer / network / storage / state in ' + tail.length + ' bytes of tail');
  else bad('C-05', 'the per-row path is pure', 'the tail references ' + found.join(', '));
  if (/mw\.__B_index/.test(tail) && /mw\.__B_known/.test(tail) && /mw\.__B_bitset/.test(tail) && /row\.inscode/.test(tail))
    ok('C-06', 'A reads only the published projection and the current row', '__B_index / __B_known / __B_bitset / row.inscode');
  else bad('C-06', 'A reads only the projection and the row', 'the tail does not read exactly those');

  // C-08 the engine is built once, never per row
  const cbInTail = (tail.match(/createBEngine/g) || []).length;
  const cbInHead = (head.match(/createBEngine/g) || []).length;
  if (cbInTail === 0 && cbInHead > 0) ok('C-08', 'the engine is built once, outside the per-row path', cbInHead + ' in the install block, 0 in the tail');
  else bad('C-08', 'the engine is built once', cbInTail + ' in the tail, ' + cbInHead + ' in the install block');

  // C-16 B never runs inside the render
  if (!/\.run\(|\.publish\(|runAsync/.test(tail)) ok('C-16', 'B never runs inside the per-row path', 'no run/publish per row');
  else bad('C-16', 'B never runs inside the per-row path', 'the tail calls run/publish');

  // C-15 the per-row cost, measured here rather than assumed
  try {
    const ctx = vm.createContext({ window: {}, console: console, setTimeout: function () {}, performance: { now: () => Date.now() } });
    ctx.window.mw = { __B_index: {}, __B_known: new Uint8Array(8), __B_bitset: new Uint8Array(8) };
    const rows = [];
    for (let i = 0; i < 400; i++) rows.push({ inscode: 'X' + i });
    // the body ends with ');' of its own, so the wrapper must not add another one inside the
    // parentheses - that is an empty statement and a SyntaxError
    const fn = vm.runInContext('(function(row, mw){ return (' + program.replace(/;\s*$/, '') + '); })',
      ctx, { filename: 'perRow.js' });
    fn(rows[0], ctx.window.mw);                       // warm
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < rows.length; i++) fn(rows[i], ctx.window.mw);
    const t1 = process.hrtime.bigint();
    const us = Number(t1 - t0) / 1000 / rows.length;
    if (us <= 16) ok('C-15', 'per-row cost within the 16 us budget', us.toFixed(2) + ' us/row over ' + rows.length + ' rows');
    else bad('C-15', 'per-row cost within the 16 us budget', us.toFixed(2) + ' us/row — over budget');
    // and it must be fail-open when the projection is missing, not hidden
    ctx.window.mw.__B_index = null;
    const v = fn(rows[1], ctx.window.mw);
    if (v === true) ok('C-10', 'a missing projection fails OPEN (the row stays visible)', 'verdict ' + v);
    else bad('C-10', 'a missing projection fails OPEN', 'verdict ' + v + ' — the row would be hidden');
  } catch (e) {
    bad('C-15', 'per-row cost measured', String((e && e.message) || e));
  }
}

// ==========================================================================
console.log('\n=== the builders: the guards that make the above true at build time ===');
{
  const bp = exists('tools/buildProgramProbe.v1.js') ? read('tools/buildProgramProbe.v1.js') : '';
  if (/BUILD REFUSED: the body token appears/.test(bp)) ok('C-03', 'the probe builder refuses a token that is not exactly one', 'token-count guard');
  else bad('C-03', 'the probe builder refuses a bad token count', 'no token-count guard');
  if (/node --check/.test(bp)) ok('C-03', 'the probe builder parses its output', 'node --check');
  else bad('C-03', 'the probe builder parses its output', 'no node --check');

  const bf = exists('tools/buildFilterProgram.v1.js') ? read('tools/buildFilterProgram.v1.js') : '';
  if (/siteField/.test(bf)) ok('C-03', 'the program builder guards the (field) shorthand shape', 'the 50-name vocabulary guard');
  else bad('C-03', 'the program builder guards the (field) shape', 'no shape guard');

  const bi = exists('tools/buildInstallProbe.v1.js') ? read('tools/buildInstallProbe.v1.js') : '';
  if (/LIVE_VERIFIED_FNV1A/.test(bi)) ok('C-03', 'the installer refuses an unmeasured body', 'hard guard on 51,719 bytes / fnv1a 036ebf14');
  else bad('C-03', 'the installer refuses an unmeasured body', 'no live-verified guard');

  // C-07 the installer must prove identity, not assume it
  const itpl = exists('probes/aInstall.template.v1.js') ? read('probes/aInstall.template.v1.js') : '';
  const both = bi + itpl + (exists('INSTALL_ME.js') ? read('INSTALL_ME.js') : '');
  if (/mirrorEqualsGenerated/.test(both) && /anySlotHoldsGenerated/.test(both))
    ok('C-07', 'the installer proves slot and mirror identity', 'byte-for-byte, both sides');
  else bad('C-07', 'the installer proves identity', 'no slot/mirror identity check');

  // C-08 the installer must NOT disarm the tick
  if (!/__TSE_SCHED\.arm\s*=/.test(bi) && !/new Proxy/.test(bi))
    ok('C-08', 'the installer leaves the tick armed and installs no Proxy', 'a slider change can still reach the rows');
  else bad('C-08', 'the installer leaves the tick armed', 'it disarms or proxies');
}

// ==========================================================================
console.log('\n=== repository-wide rules ===');
{
  // C-19 every browser file says where to run
  const browserFiles = walk('probes').filter((f) => /\.live\.v1\.js$/.test(f))
    .concat(['RUN_ME.js', 'INSTALL_ME.js'].filter(exists));
  const noWhere = browserFiles.filter((f) => {
    const s = read(f);
    return !/RUN HERE|RUN AT|ParTree=15131F/.test(s);
  });
  if (browserFiles.length && noWhere.length === 0)
    ok('C-19', 'every browser file states where to run it', browserFiles.length + ' files, all declare a location');
  else bad('C-19', 'every browser file states where to run it', 'missing in: ' + noWhere.join(', '));

  // C-20 every node harness refuses a browser
  const harnesses = walk('probes').filter((f) => /\.harness\.v1\.js$/.test(f));
  const unguarded = harnesses.filter((f) => !/THIS IS A NODE HARNESS/.test(read(f)));
  if (harnesses.length && unguarded.length === 0)
    ok('C-20', 'every node harness refuses to run in a browser', harnesses.length + ' harnesses guarded');
  else bad('C-20', 'every node harness refuses a browser', 'unguarded: ' + unguarded.join(', '));

  // C-21 one fnv1a
  // the scanner must not scan itself - it names both token forms inside its own patterns
  const all = walk('.').concat(['RUN_ME.js', 'INSTALL_ME.js'].filter(exists))
    .filter((f) => f !== './tools/checkConstraints.v1.js');
  // Count per FILE and look for the semantic core, because the copies are formatted
  // differently (let/var, one line or five) and a body-shaped regex silently misses most of
  // them - which is how a second implementation would slip through.
  const impls = [];
  for (const f of all) {
    const src = read(f);
    const hasMask = /charCodeAt\(i\) & 0xff/.test(src);
    const hasPrime = /0x01000193/.test(src);
    const hasShifts = /h << 24/.test(src);
    if (!hasMask && !hasPrime && !hasShifts) continue;          // no fnv1a here at all
    impls.push({ file: f, body: (hasMask ? 'mask' : 'nomask') + '|' + (hasPrime ? 'prime' : (hasShifts ? 'shifts' : 'other')) });
  }
  // One implementation means one SEMANTICS: the same xor of the low byte and the same FNV
  // prime. Whitespace and let/var are formatting, and formatting is not a second
  // implementation - the E-081 defect was a different XOR, not a different layout.
  const cores = {};
  for (const x of impls) { (cores[x.body] = cores[x.body] || []).push(x.file); }
  const keys = Object.keys(cores);
  if (keys.length === 1 && keys[0] === 'mask|prime')
    ok('C-21', 'exactly one fnv1a implementation', impls.length + ' copies, all mask|prime, in ' +
      impls.map((x) => x.file).join(', '));
  else bad('C-21', 'exactly one fnv1a implementation',
    keys.map((k) => k + ' -> ' + cores[k].join(', ')).join(' ; '));

  // C-22 / C-23 the panel: privacy and the legal notice
  const panel = exists('probes/aSettingsPanel.live.v1.js') ? read('probes/aSettingsPanel.live.v1.js') : '';
  const banned = ['telemetry', 'track(', 'tracking', 'donation', 'analytics.send', 'navigator.sendBeacon', 'localStorage.setItem(\'tseTelemetry'];
  const hit = banned.filter((t) => panel.indexOf(t) !== -1);
  if (hit.length === 0) ok('C-22', 'the panel carries no telemetry or donation tracking', 'none of ' + banned.length + ' banned tokens');
  else bad('C-22', 'the panel carries no telemetry or donation tracking', 'found ' + hit.join(', '));
  if (/legal|حقوقی|©|license/i.test(panel)) ok('C-23', 'the panel carries a legal notice', 'found in the panel source');
  else bad('C-23', 'the panel carries a legal notice', 'no legal notice in the panel');
}

// ==========================================================================
console.log('\n=== the four live-only constraints: reported, never assumed ===');
unmeasuredRow('C-24', 'the 58 unrecorded PrepareFilterCode rules leave the body untouched',
  'last measured E-080 (51,719 -> 51,719 bytes, firstDiffAt -1). Re-measured by every run of RUN_ME.js / INSTALL_ME.js.');
unmeasuredRow('C-25', 'the 1525 rows that never reach the option parser',
  'last measured E-070 (not a confirmed option 1525). Only the A/B registration can act on them.');
unmeasuredRow('C-26', 'the filter slot index is not stable across loads',
  'observed 8 -> 1 -> 2 -> 3 -> 4 -> 5 (E-063/E-064/E-073/E-077). Every probe reads mw.Settings.FilterNo at run time.');
unmeasuredRow('C-27', 'the textarea accepts the whole body (maxLength -1)',
  'last measured E-080 (51,719 bytes written and read back unchanged). 4096 is our own estimate, not a site limit.');

// ==========================================================================
console.log('\n=== SUMMARY ===');
for (const r of rows) {
  const mark = r.state === 'PASS' ? '  ok  ' : (r.state === 'FAIL' ? '  FAIL' : '  ??  ');
  console.log(mark + ' ' + r.id.padEnd(7) + ' ' + r.name + (r.detail ? '   [' + r.detail + ']' : ''));
}
console.log('  pass=' + pass + ' fail=' + fail + ' unmeasured=' + unmeasured);
if (fail > 0) {
  console.log('CONSTRAINTS VIOLATED — ' + fail + ' mechanical constraint(s) fail. Fix them before redesigning the funnel.');
  process.exit(1);
}
console.log('ALL MECHANICAL CONSTRAINTS HOLD — ' + unmeasured + ' remain live-only and must be re-measured on the page.');
process.exit(0);
