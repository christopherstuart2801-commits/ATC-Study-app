#!/usr/bin/env node
/* Position notes: validation, days, corrupt storage, backup round-trip. No network. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { spawnSync } = require('child_process');

const site = path.join(__dirname, '..');
const recSrc = fs.readFileSync(path.join(site, 'offline', 'position-records.js'), 'utf8');
const backupSrc = fs.readFileSync(path.join(site, 'offline', 'backup.js'), 'utf8');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
assert.equal(html, fs.readFileSync(path.join(site, '..', 'index.html'), 'utf8'), 'root/site mirror');
assert(html.includes('src="offline/position-records.js"'));
assert(!/certified by VECTOR/i.test(recSrc + html.slice(html.indexOf('function posRecHTML'), html.indexOf('function homeView') + 20)));

const sandbox = { globalThis: {}, module: { exports: {} }, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(recSrc, sandbox);
vm.runInContext(backupSrc, sandbox);
const R = sandbox.VATC_POSREC;
const B = sandbox.VATC_BACKUP;
const TODAY = '2020-12-01';

function mem() {
  const m = new Map();
  return {
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    key(i) { return [...m.keys()][i] || null; },
    get length() { return m.size; }
  };
}

let n = 0;
function ok(name, cond) {
  assert(cond, name);
  n++;
  console.log('PASS ' + name);
}

ok('Nov 1 to Nov 28 is 27 days', R.daysBetween('2026-11-01', '2026-11-28') === 27);
ok('calendar span is 27 days across a DST change', R.daysBetween('2026-03-01', '2026-03-28') === 27);
ok('same day is 0 days', R.daysBetween('2020-11-01', '2020-11-01') === 0);

const qual = R.validate({ status: 'qualified', started: '2020-11-01', qualified: '2020-11-28' }, TODAY);
ok('recorded qualified accepts ordered past dates', qual.ok && qual.days === 27 && qual.clean.status === 'qualified');

const early = R.validate({ status: 'qualified', started: '2020-11-28', qualified: '2020-11-01' }, TODAY);
ok('qualified date before start is rejected', !early.ok && /before the started date/.test(early.errors.join(' ')));

const futureQ = R.validate({ status: 'qualified', started: '2020-11-01', qualified: '2020-12-15' }, TODAY);
ok('future qualified date is rejected', !futureQ.ok && /cannot be in the future/.test(futureQ.errors.join(' ')));

const futureS = R.validate({ status: 'training', started: '2020-12-20', qualified: '' }, TODAY);
ok('future started date is rejected', !futureS.ok);

const training = R.validate({ status: 'training', started: '2020-11-01', qualified: '' }, TODAY);
ok('in training does not invent a qualified date', training.ok && training.clean.qualified === '' && training.days == null);

const stray = R.validate({ status: 'training', started: '2020-11-01', qualified: '2020-11-02' }, TODAY);
ok('qualified date without recorded status is rejected', !stray.ok);

const missing = R.validate({ status: 'qualified', started: '', qualified: '' }, TODAY);
ok('recorded qualified requires both dates', !missing.ok);

const cleared = R.validate({ status: 'none', started: '2020-11-01', qualified: '2020-11-28' }, TODAY);
ok('no record clears dates', cleared.ok && cleared.clean.started === '' && cleared.clean.qualified === '');

const store = R.emptyStore();
store.items['KNFG:cd'] = qual.clean;
const disk = mem();
ok('save writes the versioned key', R.save(disk, store).ok && disk.getItem(R.KEY).includes('KNFG:cd'));
ok('load returns the saved row', R.load(disk).items['KNFG:cd'].started === '2020-11-01');

disk.setItem = () => { throw new Error('denied'); };
const kept = { status: 'training', started: '2020-11-01', qualified: '' };
const denied = R.validate(kept, TODAY);
ok('denied storage does not report success', !R.save(disk, store).ok && denied.ok && denied.clean.started === '2020-11-01');

const badDisk = mem();
badDisk.setItem(R.KEY, '{');
ok('corrupt storage loads as empty', Object.keys(R.load(badDisk).items).length === 0);

const weird = mem();
weird.setItem(R.KEY, JSON.stringify({ v: 1, items: { 'KNFG:cd': { status: 'qualified', started: '2020-11-28', qualified: '2020-11-01' } } }));
ok('invalid stored row is hidden', !R.load(weird).items['KNFG:cd']);

ok('study percent is not a status input', !('percent' in qual.clean));
const sumT = R.summary({ status: 'training', started: '2020-11-01', qualified: '' });
ok('in training copy does not say qualified', /Started 2020-11-01/.test(sumT.headline) && /Qualification not recorded/.test(sumT.lines.join(' ')) && !/Recorded qualified/.test(sumT.headline));
const sumQ = R.summary(qual.clean);
ok('qualified summary names the entered span', /Days between entered dates: 27/.test(sumQ.lines.join(' ')) && /confirm in training records/.test(sumQ.note));
ok('empty summary offers a record', R.summary(null).headline === 'No record' && R.summary(null).add === true);

const raw = {
  'vector_progress_ver': JSON.stringify('2026-10-21'),
  'vatc.fcStats': JSON.stringify({ card: { status: 'KNOWN' } }),
  [R.KEY]: JSON.stringify(store)
};
const built = B.build(raw, { appVersion: '0.8.37', exportedAt: '2020-12-01T00:00:00.000Z', progressVer: '2026-10-21' });
ok('backup build includes position records', built.ok && built.backup.keys[R.KEY].items['KNFG:cd'].qualified === '2020-11-28', built.errors && built.errors.join(';'));

const round = mem();
round.setItem('vatc.fcStats', JSON.stringify({ other: { status: 'NEW' } }));
const applied = B.apply(round, built.backup, { progressVer: '2026-10-21' });
ok('import restores position records and study stats', applied.ok && JSON.parse(round.getItem(R.KEY)).items['KNFG:cd'].started === '2020-11-01' && round.getItem('vatc.fcStats').includes('card'));

round.setItem(R.KEY, JSON.stringify(store));
const wiped = B.build({ 'vector_progress_ver': '2026-10-21', 'vatc.fcStats': round.getItem('vatc.fcStats') }, { progressVer: '2026-10-21' });
const again = B.apply(round, wiped.backup, { progressVer: '2026-10-21' });
ok('backup without the record removes it and keeps other keys', again.ok && round.getItem(R.KEY) == null && round.getItem('vatc.fcStats').includes('card'));

const poisoned = JSON.parse(JSON.stringify(built.backup));
poisoned.keys[R.KEY].items['KNFG:cd'].qualified = '2020-11-01';
poisoned.keys[R.KEY].items['KNFG:cd'].started = '2020-11-28';
const rejected = B.parse(JSON.stringify(poisoned));
ok('import rejects a qualified date before the start', !rejected.ok);

assert(!/fetch\(|XMLHttpRequest|supabase/i.test(recSrc), 'no network in position records');
assert(!/getUTCFullYear|getUTCMonth|getUTCDate/.test(recSrc.slice(recSrc.indexOf('function today'), recSrc.indexOf('function validDate'))), 'today uses the local calendar');

function tzCase(tz, iso) {
  const code = `
    const vm = require('vm');
    const sandbox = { globalThis: {}, module: { exports: {} }, console };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(${JSON.stringify(recSrc)}, sandbox);
    const R = sandbox.VATC_POSREC;
    const day = R.today(${JSON.stringify(iso)});
    const nov5 = R.validate({ status: 'qualified', started: '2026-11-01', qualified: '2026-11-05' }, day);
    const nov6 = R.validate({ status: 'qualified', started: '2026-11-01', qualified: '2026-11-06' }, day);
    const nov7 = R.validate({ status: 'qualified', started: '2026-11-01', qualified: '2026-11-07' }, day);
    process.stdout.write(JSON.stringify({ day, nov5: nov5.ok, days: nov5.days, nov6: nov6.ok, nov7: nov7.ok }));
  `;
  const res = spawnSync(process.execPath, ['-e', code], { env: Object.assign({}, process.env, { TZ: tz }), encoding: 'utf8' });
  assert.equal(res.status, 0, tz + ' ' + (res.stderr || res.stdout));
  return JSON.parse(res.stdout);
}

const pst = tzCase('America/Los_Angeles', '2026-11-06T00:30:00.000Z');
ok('PST afternoon keeps local Nov 5 and rejects Nov 6', pst.day === '2026-11-05' && pst.nov5 === true && pst.days === 4 && pst.nov6 === false, JSON.stringify(pst));
const hnl = tzCase('Pacific/Honolulu', '2026-11-06T04:00:00.000Z');
ok('Honolulu afternoon keeps local Nov 5 and rejects Nov 6', hnl.day === '2026-11-05' && hnl.nov5 === true && hnl.days === 4 && hnl.nov6 === false, JSON.stringify(hnl));
const tokyo = tzCase('Asia/Tokyo', '2026-11-05T16:00:00.000Z');
ok('Tokyo after midnight accepts local Nov 6 while UTC is still Nov 5', tokyo.day === '2026-11-06' && tokyo.nov6 === true && tokyo.nov7 === false, JSON.stringify(tokyo));

console.log(n + ' position-record checks passed');
