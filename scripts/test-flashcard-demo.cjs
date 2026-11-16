#!/usr/bin/env node
/* Demo isolation, recall queue, and source-anchor audit. No network. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const root = path.join(__dirname, '..');
const site = path.join(root, 'site');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
assert.equal(html, fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'root/site mirror');

const demoSrc = fs.readFileSync(path.join(site, 'offline', 'demo.js'), 'utf8');
const recSrc = fs.readFileSync(path.join(site, 'offline', 'position-records.js'), 'utf8');
const backupSrc = fs.readFileSync(path.join(site, 'offline', 'backup.js'), 'utf8');
assert(!/fetch\(|XMLHttpRequest|supabase|WebSocket/i.test(demoSrc), 'demo module has no network');
assert(/VECTOR-DEMO/.test(demoSrc) && !/password|secret|CHIEF_CODE|adminPassword/i.test(demoSrc));

function loadClassic(src) {
  const sandbox = { globalThis: {}, module: { exports: {} }, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox;
}

const demoBox = loadClassic(demoSrc);
const recBox = loadClassic(recSrc);
const backupBox = loadClassic(backupSrc);
const D = demoBox.VATC_DEMO;
const R = recBox.VATC_POSREC;
const B = backupBox.VATC_BACKUP;

let n = 0;
function ok(name, cond, extra) {
  assert(cond, name + (extra ? ' — ' + extra : ''));
  n++;
  console.log('PASS ' + name);
}

const yes = D.checkCode('vector-demo');
ok('public demo code is accepted', yes.ok && /does not create an account or grant permissions/.test(yes.message));
const no = D.checkCode('not-a-code');
ok('unknown code does not claim a lookup', !no.ok && /does not open the demo/.test(no.message) && !/lookup|unauthorized|password|attempt/i.test(no.message), no.message);
ok('empty code asks for the demo code', !D.checkCode('  ').ok);

function StorageShim() { this.map = new Map(); }
StorageShim.prototype.getItem = function (k) { return this.map.has(k) ? this.map.get(k) : null; };
StorageShim.prototype.setItem = function (k, v) { this.map.set(String(k), String(v)); };
StorageShim.prototype.removeItem = function (k) { this.map.delete(k); };
StorageShim.prototype.key = function (i) { return [...this.map.keys()][i] || null; };
Object.defineProperty(StorageShim.prototype, 'length', { get() { return this.map.size; } });
StorageShim.prototype.clear = function () { this.map.clear(); };

const userStats = JSON.stringify({ keepcard: { status: 'KNOWN', times_correct: 2, times_missed: 0, last_seen: 1, mc_ok: true, written_ok: true } });
const userRec = JSON.stringify({ v: 1, items: { 'KNFG:cd': { status: 'training', started: '2020-11-01', qualified: '' } } });
const shim = new StorageShim();
shim.setItem('vatc.fcStats', userStats);
shim.setItem('vatc.positionRecords.v1', userRec);
D.install(shim);
const entered = D.enter(shim);
ok('enter seeds the demo once', entered.ok && entered.seeded);
ok('normal flashcard stats stay on their own key', shim.map.get('vatc.fcStats') === userStats);
ok('normal position record stays on its own key', shim.map.get('vatc.positionRecords.v1') === userRec);
ok('demo read shows seeded progress, not the normal stats', shim.getItem('vatc.fcStats').indexOf('keepcard') < 0 && shim.getItem('vatc.fcStats').indexOf('twy-widths') >= 0);
ok('demo position notes are Ground training and Local recorded', /KNFG:gnd/.test(shim.getItem('vatc.positionRecords.v1')) && /KNFG:lcl/.test(shim.getItem('vatc.positionRecords.v1')));

const seed = JSON.parse(shim.getItem('vatc.positionRecords.v1'));
const gnd = R.validate(seed.items['KNFG:gnd'], '2026-11-15');
const lcl = R.validate(seed.items['KNFG:lcl'], '2026-11-15');
ok('demo Ground is in training with no qualified date', gnd.ok && gnd.clean.status === 'training' && gnd.clean.qualified === '');
ok('demo Local span is 27 days and not a future date', lcl.ok && lcl.days === 27 && lcl.clean.qualified === '2026-10-28');
const trainee = JSON.parse(shim.getItem('vatc.trainee'));
ok('demo label is the placeholder controller', trainee.name === 'Demo controller' && trainee.initials === 'DEM');
const blob = JSON.stringify(D.seedPayload());
ok('demo seed has no personnel, rank, clinic, or locker fields', !/\b(sgt|cpl|capt|colonel|sergeant|locker|clinic|medical|ssn)\b/i.test(blob), blob.slice(0, 180));

const logical = {};
for (let i = 0; i < shim.length; i++) {
  const k = shim.key(i);
  if (k) logical[k] = shim.getItem(k);
}
ok('demo key list hides the normal stats and the demo prefix', !logical['vatc.fcStats'].includes('keepcard') && !Object.keys(logical).some(k => k.indexOf('vatc.demo.') === 0));
const built = B.build(logical, { appVersion: '0.8.37', exportedAt: '2026-11-15T00:00:00.000Z', progressVer: '2026-10-21' });
ok('demo backup builds from the demo workspace', built.ok, built.errors && built.errors.join(';'));
built.backup.demo = true;
built.backup.demoNote = 'Fictional demo data. Not a training record and not an account.';
ok('demo backup carries the fictional position note and not the normal card', built.backup.keys['vatc.positionRecords.v1'].items['KNFG:lcl'].qualified === '2026-10-28' && !JSON.stringify(built.backup.keys['vatc.fcStats']).includes('keepcard'));
ok('demo backup does not smuggle a person or a rank', !/\b(sgt|cpl|capt|colonel|locker|clinic)\b/i.test(JSON.stringify(built.backup)));

D.exit(shim);
ok('exit returns the normal flashcard stats', shim.getItem('vatc.fcStats') === userStats);
ok('exit returns the normal position record', shim.getItem('vatc.positionRecords.v1') === userRec);
ok('exit keeps the demo copy for a later visit', shim.map.get('vatc.demo.slot.vatc.fcStats').indexOf('twy-widths') >= 0);
const again = D.enter(shim);
ok('a second enter does not reseed over the demo copy', again.ok && again.seeded === false);
D.reset(shim);
ok('reset removes only demo keys', ![...shim.map.keys()].some(k => k.indexOf('vatc.demo.') === 0) && shim.getItem('vatc.fcStats') === userStats && shim.getItem('vatc.positionRecords.v1') === userRec);

const homeStart = html.indexOf('function homeView()');
const homeEnd = html.indexOf('function askView()');
const homeFn = html.slice(homeStart, homeEnd);
ok('home does not render the position record', !/posRecHTML|POSITION RECORD|Add record/.test(homeFn));
ok('home offers the demo without a standing code form', /demoEntryHTML\(\)/.test(homeFn) && /if\(!S\.demoEntry\)/.test(html));
ok('training record is on the position study page', /function positionStudyHead\(/.test(html) && /data-testid="training-record"/.test(html) && /studyHead/.test(html.slice(html.indexOf('function learnView'), html.indexOf('function scopeDiagram'))));

const m = html.match(/\/\* FCQ:BEGIN[\s\S]*?\/\* FCQ:END \*\//);
assert(m, 'FCQ block missing');
const FCQ = new Function(m[0] + '\nreturn FCQ;')();
const ids = ['a', 'b', 'c'];
const stats = {};
let st = FCQ.studyStart(ids, stats, () => 0, null, { includeKnown: true });
ok('study queue starts with each card once', st.queue.length === 3 && new Set(st.queue).size === 3);
const first = FCQ.studyCurrent(st);
FCQ.studyAgain(st, stats, 1);
ok('Again queues that card once at the end', st.queue[st.queue.length - 1] === first && st.queue.filter(id => id === first).length === 1 && FCQ.studyCurrent(st) !== first && stats[first].status === 'STILL_LEARNING');
const second = FCQ.studyCurrent(st);
FCQ.studyGot(st, stats, 2);
ok('Got it removes the card and marks it known', !st.queue.includes(second) && stats[second].status === 'KNOWN');
const againId = st.queue[st.queue.length - 1];
while (FCQ.studyCurrent(st) !== againId && st.queue.length) FCQ.studySkip(st);
FCQ.studyAgain(st, stats, 3);
ok('a second Again does not insert another copy', st.queue.filter(id => id === againId).length <= 1);
const saved = { queue: st.queue.slice(), i: st.i, againOnce: st.againOnce, lastId: st.lastId };
const resumed = FCQ.studyStart(ids, stats, () => 0, saved, { includeKnown: true });
ok('resume keeps the remaining queue', resumed.queue.join() === saved.queue.join() && resumed.i === saved.i);
const slFirst = FCQ.studyStart(['n1', 's1', 'n2'], { s1: { status: 'STILL_LEARNING', times_missed: 1 } }, () => 0.5, null, { includeKnown: false });
ok('a new session leads with Again cards', slFirst.queue[0] === 's1');

function cardsWithHighlight(source) {
  const out = [];
  const re = /fcCard\('([^']+)'[\s\S]*?\{doc:'([^']*)',pg:'([^']*)',pa:'([^']*)'(?:,hl:'((?:\\'|[^'])*)')?/g;
  let hit;
  while ((hit = re.exec(source))) {
    out.push({ id: hit[1], doc: hit[2], pg: hit[3], pa: hit[4], hl: hit[5] ? hit[5].replace(/\\'/g, "'") : '' });
  }
  const tw = source.match(/"id": "(tower-paper-[^"]+)"[\s\S]{0,800}?"src": \{[\s\S]*?"doc": "([^"]*)"[\s\S]*?"pg": "([^"]*)"[\s\S]*?"pa": "([^"]*)"[\s\S]*?"hl": "([^"]*)"/g) || [];
  tw.forEach(block => {
    const id = /"id": "([^"]+)"/.exec(block)[1];
    const doc = /"doc": "([^"]*)"/.exec(block)[1];
    const pg = /"pg": "([^"]*)"/.exec(block)[1];
    const pa = /"pa": "([^"]*)"/.exec(block)[1];
    const hl = /"hl": "([^"]*)"/.exec(block)[1];
    out.push({ id, doc, pg, pa, hl });
  });
  return out;
}
const parsed = cardsWithHighlight(html);
const accepted = parsed.filter(c => c.doc && (c.pg || c.pa) && c.hl);
const rejected = parsed.filter(c => !c.hl || !c.doc || !(c.pg || c.pa));
ok('parsed cards with a highlight quote also have a publication and a place', accepted.length > 0 && accepted.every(c => c.doc && (c.pg || c.pa) && c.hl), 'accepted ' + accepted.length);
console.log('AUDIT accepted ' + accepted.length + ' rejected-or-unquoted ' + rejected.length);
rejected.slice(0, 40).forEach(c => console.log('AUDIT missing ' + c.id + ' doc=' + (c.doc || '-') + ' pg=' + (c.pg || '-') + ' hl=' + (c.hl ? 'yes' : 'no')));
ok('JO 7110.65 2-1-7 is page 42', /"7110\.65 2-1-7": \{\s*"pub": "jo",\s*"page": 42/.test(html));
ok('recall hides the answer until reveal', /fcface front"[\s\S]{0,220}Tap to reveal/.test(html) && !/fcface front" data-answer=/.test(html));
ok('source button carries the highlight quote', /data-testid="fc-quote"/.test(html) && /data-testid="fc-source"/.test(html) && /data-needle="\$\{escTxt\(quote\)\}"/.test(html));

console.log(n + ' flashcard-demo checks passed');
