#!/usr/bin/env node
/* Workbook round-trip and merge. No network. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const site = path.join(__dirname, '..');
const sandbox = {
  globalThis: {},
  module: { exports: {} },
  console: console,
  DecompressionStream: globalThis.DecompressionStream,
  CompressionStream: globalThis.CompressionStream,
  TextEncoder: globalThis.TextEncoder,
  TextDecoder: globalThis.TextDecoder,
  Uint8Array: globalThis.Uint8Array,
  Uint32Array: globalThis.Uint32Array,
  Blob: globalThis.Blob,
  Response: globalThis.Response,
  Promise: globalThis.Promise
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(site, 'offline', 'student-log.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(site, 'offline', 'xlsx-lite.js'), 'utf8'), sandbox);
const log = sandbox.VATC_LOG;
const xlsx = sandbox.VATC_XLSX;

let n = 0;
function ok(name, cond) {
  assert.equal(!!cond, true, name);
  n += 1;
  console.log('PASS', name);
}

function entry(over) {
  return Object.assign({
    id: 'labcdefghij', trainee: 'Ada', initials: 'AL', station: 'KNFG', position: 'fin',
    date: '2026-11-16', hours: 1, activity: 'Vectors', approaches: [{ type: 'Precision', count: 2 }],
    paperRef: '', paperDate: '', fromPaper: false, note: '', removed: false, savedAt: '2026-11-16T18:00:00.000Z'
  }, over);
}

const app = [entry({})];
const newerSheet = [entry({ hours: 2, activity: 'Vectors and missed', savedAt: '2026-11-16T19:00:00.000Z' })];
const preview = log.previewMerge(app, newerSheet);
ok('newer sheet edit is an update that defaults to the sheet', preview.length === 1 && preview[0].kind === 'update' && preview[0].winner === 'sheet');
const merged = log.applyMerge(app, preview, {});
ok('apply keeps the newer hours', merged.length === 1 && merged[0].hours === 2 && merged[0].activity === 'Vectors and missed');

const olderSheet = [entry({ hours: 0.5, savedAt: '2026-11-16T17:00:00.000Z' })];
const keepApp = log.previewMerge(app, olderSheet);
ok('older sheet edit defaults to the app', keepApp[0].winner === 'app' && log.applyMerge(app, keepApp, {})[0].hours === 1);
ok('admin can pick the sheet anyway', log.applyMerge(app, keepApp, { labcdefghij: 'sheet' })[0].hours === 0.5);

const tie = log.previewMerge(app, [entry({ note: 'different', savedAt: app[0].savedAt })]);
ok('same timestamp is a conflict and stays with the app until picked', tie[0].kind === 'conflict' && tie[0].winner === 'app');

const extra = entry({ id: 'lotherentry1', position: 'cd', activity: 'Strips' });
const kept = log.previewMerge([app[0], extra], newerSheet);
ok('a row missing from the sheet stays in the app', kept.some(c => c.id === 'lotherentry1' && c.kind === 'app-only') && log.applyMerge([app[0], extra], kept, {}).some(r => r.id === 'lotherentry1'));

const removed = log.previewMerge(app, [entry({ removed: true, savedAt: '2026-11-16T20:00:00.000Z' })]);
const afterRemove = log.applyMerge(app, removed, {});
ok('a newer removed flag hides the row', afterRemove.length === 1 && afterRemove[0].removed === true);

const mem = {
  m: new Map(),
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; },
  setItem(k, v) { this.m.set(k, String(v)); }
};
ok('admin switch without a code is local only', log.becomeAdmin(mem, '', '').ok && log.loadRole(mem).role === 'admin');
log.leaveAdmin(mem);
log.saveRole(mem, { role: 'student', code: 'desk' });
ok('wrong device code does not enter admin', !log.becomeAdmin(mem, 'nope', '').ok && log.loadRole(mem).role === 'student');
ok('matching device code enters admin and is still just stored text', log.becomeAdmin(mem, 'desk', '').ok && log.loadRole(mem).code === 'desk');
ok('a student owns only matching rows', log.owns(app[0], { name: 'Ada', initials: 'AL' }) && !log.owns(app[0], { name: 'Grace', initials: 'GH' }));
const coded = log.addCode(mem, 'Crew 1 lead');
ok('a local code is a label plus text, not a login', coded.ok && log.loadCodes(mem).codes[0].label === 'Crew 1 lead');

(async function () {
  const book = xlsx.writeWorkbook([
    { name: 'Position log', rows: log.sheetMatrix(app) },
    { name: 'About', rows: log.aboutRows() }
  ]);
  const sheets = await xlsx.readWorkbook(book);
  const back = log.rowsToEntries(sheets[0].rows);
  ok('stored workbook round-trips a row', back.errors.length === 0 && back.entries[0].hours === 1 && back.entries[0].approaches[0].count === 2 && sheets[1].rows[1][0].indexOf('Not a live Microsoft 365') >= 0);
  const packed = await xlsx.writeWorkbookCompressed([
    { name: 'Position log', rows: log.sheetMatrix([entry({ activity: 'Compressed', hours: 3 })]) }
  ]);
  const again = await xlsx.readWorkbook(packed);
  const parsed = log.rowsToEntries(again[0].rows);
  ok('compressed workbook round-trips', parsed.entries[0].activity === 'Compressed' && parsed.entries[0].hours === 3);
  console.log(n + ' sync checks passed');
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
