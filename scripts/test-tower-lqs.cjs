#!/usr/bin/env node
/* Tower LQS packet: shared Clearance/Ground/Local syllabus, blocked pubs, verified highlights.
   Run: node scripts/test-tower-lqs.cjs */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const site = fs.readFileSync(path.join(root, 'site', 'index.html'), 'utf8');
const top = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let fails = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS', name); }
  else { fails++; console.log('FAIL', name, extra || ''); }
}
ok('site and root index.html match', site === top);

const html = site;
ok('version is v0.8.36 tower paper', /v0\.8\.36 · tower paper/.test(html));
ok('shared banner text', /one packet shared by Clearance, Ground, and Local/.test(html));
ok('home tile says Shared tower paper', /Shared tower paper/.test(html));
ok('topic 4 strip block stays off the tower positions', /T\.n===4 && S\.pos!=='cd' && S\.pos!=='gnd' && S\.pos!=='lcl'/.test(html));
ok('ground and local practice reuse the clearance ACADS cards', /pos==='gnd'\|\|pos==='lcl'/.test(html));

const i = html.indexOf('const TOWER_SYL=');
const scriptStart = html.lastIndexOf('<script', i);
const scriptEnd = html.indexOf('</script>', i);
let body = html.slice(html.indexOf('>', scriptStart) + 1, scriptEnd);
body = body.replace(
  '  render();\n  navInit(); render();\n})();',
  '  globalThis.__vatc={citePubAndSec, pageForCite, syllabusFor, SYLLABUS, FC_UC, BOOK, PLATES, FC_UC_MISS};\n  try{ render(); navInit(); }catch(e){}\n})();'
);
const document = {
  getElementById() {
    return { innerHTML: '', textContent: '', style: {}, value: '', classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, focus() {}, querySelector() { return null; }, querySelectorAll() { return []; }, appendChild() {}, setAttribute() {}, dataset: {} };
  },
  addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() { return this.getElementById(); },
  documentElement: { style: {} }, body: { appendChild() {}, style: {} }, activeElement: null
};
const ctx = {
  document, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: { userAgent: 'test' }, location: { href: 'http://localhost/' },
  history: { pushState() {}, replaceState() {}, back() {} },
  requestAnimationFrame() {}, setTimeout() { return 0; }, clearTimeout() {}, console
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(body, ctx, { filename: 'index.html' });
const v = ctx.__vatc;
ok('app booted with cite resolver', !!v && typeof v.citePubAndSec === 'function');

const norm = s => String(s || '').replace(/[−–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();
const topics = v.syllabusFor('cd').list;
ok('four tower topics', topics.length === 4, String(topics.length));
ok('same packet on ground and local', v.SYLLABUS.cd === v.SYLLABUS.gnd && v.SYLLABUS.gnd === v.SYLLABUS.lcl);
ok('shared note on all three', ['cd', 'gnd', 'lcl'].every(k => /Not position-specific coverage/.test(v.syllabusFor(k).shared)));
ok('radar packets untouched in count', v.SYLLABUS.fin.length === 6 && v.SYLLABUS.rfd.length === 5 && v.SYLLABUS.arr.length === 6);

const expect = [
  ['ACAD-0520', 'Radio and Interphone'],
  ['ACAD-0521/0522', 'Aircraft Movement and Flight Strips'],
  ['ACAD-0523', 'ATC Clearance Knowledge'],
  ['TOPIC 4', 'Tower Visibility Observations']
];
expect.forEach(([id, t], n) => ok('topic ' + (n + 1) + ' label', topics[n].id === id && topics[n].t === t, topics[n].id + ' / ' + topics[n].t));

const t1 = topics[0].refs.map(r => r[0]);
['7110.65 2-4-4', '7110.65 2-4-7', 'FACMAN 5-1-12', 'FACMAN 5-4-3', 'FACMAN 5-4-4'].forEach(c => {
  ok('topic 1 excludes ' + c, !t1.includes(c));
});
['7110.65 2-4-1', '7110.65 2-4-3', '7110.65 2-4-5', '7110.65 2-4-6', '7110.65 2-6-2', '7110.65 2-9-1', 'FACMAN 5-4-5', 'FACMAN 5-4-6', 'FACMAN 2-1-13'].forEach(c => {
  ok('topic 1 includes ' + c, t1.includes(c));
});
ok('topic 1 is 27 JO + 7 FACMAN rows', t1.length === 34, String(t1.length));

const counts = topics.map(t => (t.test || []).length);
ok('LQ counts 10/6/7/0', counts.join() === '10,6,7,0', counts.join());

let citeBad = 0;
topics.forEach(t => {
  const seen = new Set();
  (t.refs || []).forEach(r => {
    if (r[2] === 'hdr') return;
    if (seen.has(r[0])) { citeBad++; console.log('FAIL in-topic duplicate', t.id, r[0]); }
    seen.add(r[0]);
    const info = v.citePubAndSec(r[0]);
    const blocked = !info.pub || (info.book && info.book.missing);
    const wantBlock = /^(SCT LOA|Chart Supplement|CNAF|NAVAIR WX)/.test(r[0]);
    if (wantBlock) {
      if (!blocked || !/blocked/i.test((info.book && info.book.note) || '')) {
        citeBad++; console.log('FAIL not blocked', r[0], info.pub, info.book && info.book.note);
      }
      return;
    }
    if (blocked) { citeBad++; console.log('FAIL unexpected block', r[0]); return; }
    if (String(info.pub).indexOf('knfg-') === 0 || String(info.pub).indexOf('l18') === 0) return;
    const page = v.pageForCite(info.pub, info.sec);
    if (!(page > 1)) { citeBad++; console.log('FAIL page', r[0], info.pub, info.sec, page); }
  });
});
ok('every checklist cite opens its pub or stays blocked', citeBad === 0, 'bad=' + citeBad);

let hlBad = 0;
topics.forEach(t => (t.test || []).forEach(q => {
  const src = q.src || {};
  if (!q.q || !q.a || !src.doc || !src.pa || !src.hl) { hlBad++; console.log('FAIL LQ fields', q.q); return; }
  if (src.doc.indexOf('TPP ') === 0) {
    const plate = v.PLATES.find(p => ('TPP ' + (p.id.indexOf('l18') === 0 ? 'L18 ' : 'KNFG ') + p.lab) === src.doc);
    if (!plate || norm(plate.tx).indexOf(norm(src.hl)) < 0) { hlBad++; console.log('FAIL plate hl', src.hl); }
    return;
  }
  const key = /FACMAN|NFG/i.test(src.doc) ? ('FACMAN ' + src.pg) : ('7110.65 ' + src.pg);
  const b = v.BOOK[key];
  if (!b || norm(b.text).indexOf(norm(src.hl)) < 0) { hlBad++; console.log('FAIL hl', key, src.hl); }
}));
ok('every LQ highlight is in BOOK or the plate text', hlBad === 0, 'bad=' + hlBad);

const cards = (v.FC_UC.cd && v.FC_UC.cd['uc-test']) || [];
ok('clearance ACADS set has the tower cards', cards.length >= 20, String(cards.length));
['twr-241-airborne', 'twr-426-through', 'twr-t52-vortac', 'sid-quntn', 'relay-verbatim'].forEach(id => {
  ok('card ' + id, cards.some(c => c.id === id));
});
ok('no missing tower card ids', !(v.FC_UC_MISS || []).some(x => /twr-/.test(x)), (v.FC_UC_MISS || []).filter(x => /twr-/.test(x)).join(','));
cards.filter(c => c.id.indexOf('twr-') === 0).forEach(c => {
  ok(c.id + ' has doc/pg/pa/hl', !!(c.src && c.src.doc && c.src.pg && c.src.pa && c.src.hl));
});

const fac = path.join(root, 'site', 'docs', 'NFG-FACMAN-July-2026.pdf');
let pdfOk = false;
try {
  const txt = execFileSync('pdftotext', ['-f', '55', '-l', '55', '-q', fac, '-'], { encoding: 'utf8' });
  pdfOk = /VORTAC/.test(txt) && /Departure only/.test(txt) && /800/.test(txt);
} catch (e) { pdfOk = false; }
ok('FACMAN page 55 still shows the TBL 5-2 VORTAC row', pdfOk);

console.log(fails ? ('\n' + fails + ' FAILED, ' + passes + ' passed') : ('\n' + passes + ' passed'));
process.exit(fails ? 1 : 0);
