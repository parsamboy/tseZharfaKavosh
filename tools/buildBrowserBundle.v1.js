/**
 * tseZharfaKavosh — browser bundle builder v0.1.0 (node, build-time only)
 *
 * Concatenates the five pure modules the B engine and the A body need into ONE
 * browser script:
 *   src/models/jalaliCalendar.v0.1.0.js   (calendar -> T = DTE/365, q9)
 *   src/optionParser.v0.1.0.js            (l18/l30 -> strike/kind/expiry)
 *   src/models/greeks.v0.1.0.js           (impliedVol / bsGreeks)
 *   src/engine/bEngine.v0.1.0.js          (the engine itself)
 *   src/engine/aLookup.v0.1.0.js          (the A body generator: buildFilterCodeBody)
 *
 * Output: src/engine/tseEngine.browser.v1.js — an IIFE that puts
 *   window.TseBEngine  = { createBEngine, ... }   (the engine, unchanged)
 *   window.TseModels   = { optionParser, greeks, calendar }
 *   window.TseLookup   = { evaluateRow, buildFilterCodeBody, capacityCheck, ... }
 * on the page, exactly like src/engine/bEngine.v0.1.0.js already does for
 * TseBEngine when it detects a window.
 *
 * aLookup is bundled on purpose: the live probe must register the A body the
 * REPO generates, not a hand-copied literal, so that what is measured live is
 * the body production would ship.
 *
 * Two transformations, both mechanical and both verified:
 *   1. `require('./../models/jalaliCalendar.v0.1.0.js')` -> `__req('jalaliCalendar')`
 *      (the only require() call in the four modules).
 *   2. Comments and blank lines are stripped by a real lexer (strings, template
 *      literals and regex literals are never touched) so the bundle pastes into a
 *      console at a workable size. Nothing else changes: no renaming, no
 *      reordering, no semantic edit.
 *
 * The lexer exists because optionParser and jalaliCalendar contain regex
 * literals (`/ي/g`, `/^(\d{4})\/(\d{2})\/(\d{2})$/`), which a naive comment
 * stripper would eat.
 *
 * Verification after every build (see probes/bundle.parity.v1.js):
 *   node --check on the output, plus a row-by-row verdict comparison of the
 *   BUNDLED engine against the ORIGINAL modules.
 *
 * Run: node tools/buildBrowserBundle.v1.js
 * SPDX-License-Identifier: Smart-FFA-1.1
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src/engine/tseEngine.browser.v1.js');

const SRC = [
  ['jalaliCalendar', 'src/models/jalaliCalendar.v0.1.0.js', null],
  ['optionParser', 'src/optionParser.v0.1.0.js', null],
  ['greeks', 'src/models/greeks.v0.1.0.js', null],
  ['aLookup', 'src/engine/aLookup.v0.1.0.js', null],
  ['bEngine', 'src/engine/bEngine.v0.1.0.js',
    [/^const\s+CAL\s*=\s*require\('\.\/\.\.\/models\/jalaliCalendar\.v0\.1\.0\.js'\);\s*$/m,
     "const CAL = __req('jalaliCalendar');"]],
  // after bEngine: it requires bEngine's DEFAULT_FUNNEL_CONFIG / normalizeFunnelConfig,
  // and __def runs each factory immediately, so order is load-bearing.
  ['funnelSettings', 'src/ux/funnelSettings.v0.1.0.js',
    [/^const\s+ENG\s*=\s*require\('\.\/\.\.\/engine\/bEngine\.v0\.1\.0\.js'\);\s*$/m,
     "const ENG = __req('bEngine');"]]
];

/**
 * Comment/blank-line stripper with a real token walk.
 * States: code, line-comment, block-comment, ', ", `, regex.
 * A `/` opens a regex only when the previous significant token cannot end an
 * expression (i.e. it is not an identifier, number, `)`, `]`, `}` or `+`/`-`
 * used as postfix) — the standard heuristic, sufficient for these four files.
 * @param {string} code
 * @returns {string}
 */
function strip(code) {
  let out = '';
  let i = 0;
  const n = code.length;
  let lastTok = '';        // previous significant token, for the regex test
  let atLineStart = true;  // so `a / b` on its own line still starts as code

  function emit(ch) { out += ch; }

  while (i < n) {
    const c = code[i];
    const c2 = code[i + 1];

    // ---- line comment ----
    if (c === '/' && c2 === '/') {
      while (i < n && code[i] !== '\n') i++;
      emit('\n');            // keep the newline so error line numbers still work
      atLineStart = true;
      continue;
    }
    // ---- block comment ----
    if (c === '/' && c2 === '*') {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (code[i] === '/' && code[i + 1] === '*') { depth++; i += 2; continue; }
        if (code[i] === '*' && code[i + 1] === '/') { depth--; i += 2; continue; }
        i++;
      }
      emit(' ');             // one space: tokens on either side stay separate
      atLineStart = false;
      continue;
    }

    // ---- string literals ----
    if (c === "'" || c === '"') {
      const quote = c;
      emit(c); i++;
      while (i < n) {
        if (code[i] === '\\') { emit(code[i]); emit(code[i + 1]); i += 2; continue; }
        if (code[i] === quote) { emit(code[i]); i++; break; }
        emit(code[i]); i++;
      }
      lastTok = ')';
      atLineStart = false;
      continue;
    }

    // ---- template literal (backtick, escapes honoured) ----
    if (c === '`') {
      emit(c); i++;
      while (i < n) {
        if (code[i] === '\\') { emit(code[i]); emit(code[i + 1]); i += 2; continue; }
        if (code[i] === '`') { emit(code[i]); i++; break; }
        emit(code[i]); i++;
      }
      lastTok = ')';
      atLineStart = false;
      continue;
    }

    // ---- regex literal ----
    if (c === '/' && c2 !== '/' && c2 !== '*' && c2 !== '=' && isRegexStart(lastTok, atLineStart)) {
      emit(c); i++;
      let inClass = false;
      let closed = false;
      while (i < n) {
        if (code[i] === '\\') { emit(code[i]); emit(code[i + 1]); i += 2; continue; }
        if (code[i] === '[') inClass = true;
        else if (code[i] === ']') inClass = false;
        else if (code[i] === '/' && !inClass) { emit(code[i]); i++; closed = true; break; }
        emit(code[i]); i++;
      }
      if (!closed) throw new Error('strip: unterminated regex literal near ' + i);
      while (i < n && /[a-z]/.test(code[i])) { emit(code[i]); i++; } // flags
      lastTok = ')';
      atLineStart = false;
      continue;
    }

    // ---- plain code ----
    if (c === '\n') { emit(c); atLineStart = true; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { emit(c); i++; continue; }

    // identifier / number -> remember for the next regex test
    if (/[A-Za-z_$0-9]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z_$0-9]/.test(code[j])) j++;
      lastTok = code.slice(i, j);
      for (let k = i; k < j; k++) emit(code[k]);
      i = j;
      atLineStart = false;
      continue;
    }

    emit(c);
    if (!' \t\r\n'.includes(c)) lastTok = c;
    atLineStart = false;
    i++;
  }
  return out;
}

/** Regex-vs-division heuristic. */
function isRegexStart(lastTok, atLineStart) {
  if (atLineStart && lastTok === '') return true;
  if (lastTok === '') return true;
  if (/^[A-Za-z_$]/.test(lastTok)) return false;            // identifier
  if (/^[0-9]/.test(lastTok)) return false;                  // number
  if (lastTok === ')' || lastTok === ']' || lastTok === '}') return false;
  if (lastTok === '++' || lastTok === '--') return false;
  return true;                                               // operator / punct
}

/**
 * Drop blank lines only (comments are already gone). Keeps line numbering
 * identical to the stripped source, which keeps `node --check` errors honest.
 */
function dropBlankLines(code) {
  return code.split('\n').filter(function (l) { return l.trim() !== ''; }).join('\n') + '\n';
}

function main() {
  const parts = [];
  let totalRaw = 0, totalOut = 0;

  for (const [id, rel, patch] of SRC) {
    let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    totalRaw += src.length;
    if (patch) {
      const before = src;
      src = src.replace(patch[0], patch[1]);
      if (src === before) throw new Error('require patch did not apply for ' + id);
    }
    const stripped = dropBlankLines(strip(src));
    totalOut += stripped.length;
    parts.push({ id: id, rel: rel, code: stripped, name: path.basename(rel) });
  }

  const lines = [];
  lines.push('/**');
  lines.push(' * tseZharfaKavosh — B engine + models, BROWSER BUNDLE v1 (generated)');
  lines.push(' *');
  lines.push(' * GENERATED FILE — do not edit by hand. Build with:');
  lines.push(' *   node tools/buildBrowserBundle.v1.js');
  lines.push(' * from these sources (verifiable, byte-for-byte apart from comments):');
  for (const p of parts) lines.push(' *   ' + p.rel + '  -> module "' + p.id + '"');
  lines.push(' *');
  lines.push(' * Paste this whole file in the page console ONCE, before any probe that');
  lines.push(' * needs the real engine. It defines:');
  lines.push(' *   window.TseBEngine  — { createBEngine, VERSION, DEFAULT_FUNNEL_CONFIG, ... }');
  lines.push(' *   window.TseModels   — { optionParser, greeks, calendar }');
  lines.push(' *   window.TseLookup   — { evaluateRow, buildFilterCodeBody, capacityCheck, ... }');
  lines.push(' *   window.TseFunnelSettings = { SCHEMA, DEFAULTS, PRESETS, normalizeSettings, toFunnelConfig, configHash, load, save, applyChange, applyPreset, describe }');
  lines.push(' * No DOM, no network, no storage: the engine stays pure. funnelSettings takes an');
  lines.push(' * INJECTED storage, so the same code runs in node tests and against localStorage.');
  lines.push(' * SPDX-License-Identifier: Smart-FFA-1.1');
  lines.push(' */');
  lines.push("(function (global) {");
  lines.push("'use strict';");
  lines.push('var __registry = {};');
  lines.push('function __req(id) {');
  lines.push("  var m = __registry[id];");
  lines.push("  if (!m) throw new Error('tseEngine bundle: unknown module ' + id);");
  lines.push('  return m.exports;');
  lines.push('}');
  lines.push('function __def(id, factory) {');
  lines.push('  var module = { exports: {} };');
  lines.push('  __registry[id] = module;');
  lines.push('  factory(module, module.exports);');
  lines.push('  return module.exports;');
  lines.push('}');
  lines.push('');

  for (const p of parts) {
    lines.push('__def(' + JSON.stringify(p.id) + ', function (module) {');
    lines.push(p.code.replace(/\n$/, ''));
    lines.push('});');
    lines.push('');
  }

  lines.push('global.TseBEngine = __req(' + JSON.stringify('bEngine') + ');');
  lines.push("global.TseModels = { optionParser: __req('optionParser'), greeks: __req('greeks'), calendar: __req('jalaliCalendar') };");
  lines.push("global.TseLookup = __req('aLookup');");
  lines.push("global.TseFunnelSettings = __req('funnelSettings');");
  lines.push("})(typeof window !== 'undefined' ? window : globalThis);");
  lines.push('');

  const bundle = lines.join('\n');
  fs.writeFileSync(OUT, bundle, 'utf8');

  console.log('built  ' + OUT.replace(ROOT + '/', ''));
  console.log('  sources  ' + parts.map(function (p) { return p.rel; }).join(', '));
  console.log('  raw      ' + totalRaw + ' bytes');
  console.log('  stripped ' + totalOut + ' bytes (comments + blank lines removed)');
  console.log('  bundle   ' + bundle.length + ' bytes');
  console.log('  ratio    ' + (100 * bundle.length / totalRaw).toFixed(1) + '% of raw');
}

main();
