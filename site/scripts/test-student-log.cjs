#!/usr/bin/env node
/* Position log: local document, paper fields, CSV. No network. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const site = path.join(__dirname, '..');
const sandbox = { globalThis: {}, module: { exports: {} }, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(site, 'offline', 'student-log.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(site, 'offline', 'backup.js'), 'utf8'), sandbox);
const log = sandbox.VATC_LOG;
const backup = sandbox.VATC_BACKUP;

let n = 0;
function ok(name, cond) {
  assert.equal(!!cond, true, name);
  n += 1;
  console.log('PASS', name);
}

function mem(initial) {
  const m = new Map(Object.entries(initial || {}));
  return {
    get length() { return m.size; },
    key(i) { return [...m.keys()][i] || null; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(String(k), String(v)); },
    removeItem(k) { m.delete(k); }
  };
}

const day = new Date(2026, 10, 16, 21, 30);
ok('local today uses the Date local calendar', log.localToday(day) === '2026-11-16');

const store = mem();
const bad = log.add(store, { position: 'cd', date: '2026-11-17', hours: 1 }, day);
ok('future date is rejected', !bad.ok && /future/.test(bad.errors.join(' ')));

const paper = log.add(store, { position: 'fin', date: '2026-11-16', hours: 1, fromPaper: true }, day);
ok('paper entry needs a reference', !paper.ok && /paper/.test(paper.errors.join(' ')));

const saved = log.add(store, {
  trainee: 'Ada Lovelace', initials: 'al', station: 'knfg', position: 'fin',
  date: '2026-11-16', hours: 2.5, activity: 'Vectors to final',
  approaches: [{ type: 'Precision', count: 3 }, { type: 'Visual', count: 1 }],
  paperRef: 'Binder 4, page 12', paperDate: '2026-11-16', fromPaper: true, note: 'Copied from the sheet'
}, day);
ok('paper backfill saves', saved.ok && saved.entry.fromPaper && saved.entry.initials === 'AL' && saved.entry.station === 'KNFG');

const again = log.add(store, {
  position: 'cd', date: '2026-11-15', hours: 1, activity: 'Strips',
  approaches: [{ type: 'Precision', count: 2 }]
}, day);
ok('second entry saves', again.ok);

const loaded = log.load(store);
ok('newest date is first', loaded.entries[0].date === '2026-11-16' && loaded.entries.length === 2);
const tot = log.totals(loaded.entries);
ok('totals add hours and approach types', tot.all.hours === 3.5 && tot.all.approaches.Precision === 5 && tot.all.approaches.Visual === 1 && tot.byPosition.fin.hours === 2.5 && tot.byPosition.cd.entries === 1);
ok('recent can filter a position', log.recent(loaded.entries, 'cd', 10).length === 1);

const text = log.csv(loaded.entries);
ok('csv header matches a paper line', text.startsWith('date,trainee,initials,station,position,hours,activity,approaches,paper_ref,paper_date,from_paper,note\n'));
ok('csv quotes a paper ref that contains a comma', /"Binder 4, page 12"/.test(text) && /Precision 3; Visual 1/.test(text) && /from_paper/.test(text));

store.setItem(log.KEY, '{');
ok('corrupt storage loads empty', log.load(store).entries.length === 0);

const denied = mem();
denied.setItem = function () { throw new Error('denied'); };
ok('denied storage does not report success', !log.add(denied, { position: 'gnd', date: '2026-11-16', hours: 0.5 }, day).ok);

const good = mem();
log.add(good, { position: 'arr', date: '2026-11-10', hours: 4, approaches: [{ type: 'Nonprecision', count: 2 }], note: 'He said "go"' }, day);
const raw = {};
raw[log.KEY] = good.getItem(log.KEY);
raw['vatc.trainee'] = JSON.stringify({ name: 'Ada Lovelace', initials: 'AL' });
const built = backup.build(raw, { appVersion: '0.8.39', exportedAt: '2026-11-16T00:00:00.000Z', progressVer: '2026-10-21' });
ok('backup accepts the log document', built.ok && built.backup.keys[log.KEY].entries.length === 1);
const fresh = mem();
const applied = backup.apply(fresh, built.backup, { progressVer: '2026-10-21' });
ok('import restores the log', applied.ok && /Nonprecision/.test(fresh.getItem(log.KEY)));

const junk = mem();
junk.setItem(log.KEY, JSON.stringify({ v: 1, entries: [{ id: 'lnotvalid', position: 'nope', date: '2026-11-16', hours: 1, approaches: [], fromPaper: false, trainee: '', initials: '', station: 'KNFG', activity: '', paperRef: '', paperDate: '', note: '', savedAt: '2026-11-16T00:00:00.000Z' }] }));
const badBuild = backup.build({ [log.KEY]: junk.getItem(log.KEY) }, { appVersion: '0.8.39', exportedAt: '2026-11-16T00:00:00.000Z', progressVer: '2026-10-21' });
ok('backup rejects a log with an unknown position', !badBuild.ok);

console.log(n + ' position-log checks passed');
