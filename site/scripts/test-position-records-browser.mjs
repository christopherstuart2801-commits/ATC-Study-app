#!/usr/bin/env node
/* Browser checks for a local position record. Dates here are fictional and are not shown in app screenshots. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
function ok(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) fails.push(name);
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(site, rel);
    if (file !== site && !file.startsWith(site + path.sep)) { res.writeHead(403); res.end('bad'); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing ' + rel); return; }
    const buf = fs.readFileSync(file);
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(buf);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const server = await startServer();
const port = server.address().port;
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.emulateTimezone('America/Los_Angeles');
await page.evaluateOnNewDocument(() => {
  const fixed = Date.parse('2026-11-06T00:30:00.000Z');
  const Orig = Date;
  function FakeDate(...args) {
    if (!(this instanceof FakeDate)) return args.length ? String(new Orig(...args)) : String(new Orig(fixed));
    if (args.length === 0) return new Orig(fixed);
    return new Orig(...args);
  }
  FakeDate.now = () => fixed;
  FakeDate.parse = Orig.parse;
  FakeDate.UTC = Orig.UTC;
  FakeDate.prototype = Orig.prototype;
  window.Date = FakeDate;
});
const posts = [];
page.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') posts.push(req.method() + ' ' + req.url()); });
page.on('pageerror', err => fails.push('pageerror ' + err));
await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.home-row');

const home = await page.evaluate(() => {
  const row = document.querySelector('.home-row[data-pos="gnd"]');
  const pct = getComputedStyle(row.querySelector('.pcpct')).fontSize;
  const text = document.querySelector('#posgrid').innerText;
  return { pct: parseFloat(pct), text, local: new Date().toDateString() };
});
ok('home has no position-record line and keeps a large percent', home.pct >= 28 && !/POSITION RECORD/i.test(home.text) && !/No record/.test(home.text) && !/Add record/.test(home.text) && !/2020-11-/.test(home.text) && !/2026-11-/.test(home.text), JSON.stringify(home));
ok('frozen clock is local Nov 5 in PST', /Nov 0?5 2026/.test(home.local), home.local);

await page.click('[data-action="poslearn"][data-p="gnd"]');
await page.waitForSelector('[data-testid="training-record"][data-pos="gnd"]');
const opened = await page.evaluate(() => ({
  home: document.querySelector('#posgrid') ? document.querySelector('#posgrid').innerText : '',
  study: document.querySelector('[data-testid="position-study"]').innerText
}));
ok('Ground study page holds the training record', /training record/i.test(opened.study) && /Not entered/.test(opened.study) && !/POSITION RECORD/i.test(opened.home), opened.study.slice(0, 180));

await page.evaluate(() => { document.querySelector('.prec[data-pos="gnd"]').open = true; });
await page.select('#prec-st-gnd', 'qualified');
await page.$eval('#prec-sd-gnd', el => { el.value = '2026-11-01'; });
await page.$eval('#prec-qd-gnd', el => { el.value = '2026-11-06'; });
await page.click('.prec[data-pos="gnd"] [data-action="precsave"]');
const future = await page.evaluate(() => ({
  err: document.getElementById('prec-err-gnd').textContent,
  stored: localStorage.getItem('vatc.positionRecords.v1')
}));
ok('local Nov 6 is rejected while UTC is already Nov 6', /cannot be in the future/.test(future.err) && !future.stored, JSON.stringify(future));

await page.$eval('#prec-qd-gnd', el => { el.value = '2026-11-05'; });
await page.click('.prec[data-pos="gnd"] [data-action="precsave"]');
await page.waitForFunction(() => /Days between entered dates: 4/.test(document.querySelector('.prec[data-pos="gnd"]').innerText));
ok('Ground Nov 1 to Nov 5 is 4 local days', true);

await page.evaluate(() => { document.querySelector('.prec[data-pos="gnd"]').open = true; });
await page.select('#prec-st-gnd', 'qualified');
await page.$eval('#prec-sd-gnd', el => { el.value = '2020-11-01'; });
await page.$eval('#prec-qd-gnd', el => { el.value = '2020-11-28'; });
await page.click('.prec[data-pos="gnd"] [data-action="precsave"]');
await page.waitForFunction(() => /Days between entered dates: 27/.test(document.querySelector('.prec[data-pos="gnd"]').innerText));
const empty = { pos: 'gnd' };
const saved = await page.evaluate((pos) => {
  const rec = document.querySelector('.prec[data-pos="' + pos + '"]');
  return { text: rec.innerText, key: localStorage.getItem('vatc.positionRecords.v1') };
}, empty.pos);
ok('save shows 27 days and persists the versioned key', /Recorded qualified/.test(saved.text) && /confirm in training records/.test(saved.text) && /2020-11-01/.test(saved.key) && /"status":"qualified"/.test(saved.key));

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.home-row');
const homeAfter = await page.evaluate(() => document.querySelector('#posgrid').innerText);
ok('home still hides the saved record', !/POSITION RECORD/i.test(homeAfter) && !/No record/.test(homeAfter) && !/Add record/.test(homeAfter) && !/2020-11-01/.test(homeAfter), homeAfter.slice(0, 240));
await page.click('[data-action="poslearn"][data-p="gnd"]');
await page.waitForFunction(() => {
  const rec = document.querySelector('.prec[data-pos="gnd"]');
  return rec && /Days between entered dates: 27/.test(rec.textContent) && /Recorded qualified/.test(rec.innerText);
});
ok('reload keeps the entered record on the Ground study page', true);

const backup = await page.evaluate(() => {
  const raw = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    raw[k] = localStorage.getItem(k);
  }
  const built = VATC_BACKUP.build(raw, { appVersion: '0.8.37', exportedAt: '2020-12-01T00:00:00.000Z', progressVer: '2026-10-21' });
  localStorage.removeItem('vatc.positionRecords.v1');
  const wiped = localStorage.getItem('vatc.positionRecords.v1');
  const applied = VATC_BACKUP.apply(localStorage, built.backup, { progressVer: '2026-10-21' });
  return { ok: built.ok && applied.ok, has: (built.backup.keys['vatc.positionRecords.v1'] || {}).items, restored: localStorage.getItem('vatc.positionRecords.v1'), wiped };
});
ok('backup JSON includes the record and restore is not partial', backup.ok && backup.wiped == null && /2020-11-28/.test(backup.restored) && backup.has && Object.keys(backup.has).length === 1, JSON.stringify(backup).slice(0, 240));
ok('record save and backup made no upload', posts.length === 0, posts.join(','));

await page.reload({ waitUntil: 'domcontentloaded' });
await page.click('[data-action="poslearn"][data-p="gnd"]');
await page.waitForSelector('.prec[data-pos="gnd"]');
const denied = await page.evaluate(async (pos) => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === 'vatc.positionRecords.v1') throw new Error('denied');
    return orig.call(this, k, v);
  };
  document.querySelector('.prec[data-pos="' + pos + '"]').open = true;
  document.getElementById('prec-st-' + pos).value = 'training';
  document.getElementById('prec-sd-' + pos).value = '2020-11-02';
  document.getElementById('prec-qd-' + pos).value = '';
  document.querySelector('[data-action="precsave"][data-pos="' + pos + '"]').click();
  const err = document.getElementById('prec-err-' + pos).textContent;
  const kept = document.getElementById('prec-sd-' + pos).value;
  const status = document.getElementById('prec-st-' + pos).value;
  Storage.prototype.setItem = orig;
  return { err, kept, status };
}, empty.pos);
ok('denied storage keeps the form', /Could not save/.test(denied.err) && denied.kept === '2020-11-02' && denied.status === 'training', JSON.stringify(denied));

await page.evaluate(() => localStorage.setItem('vatc.positionRecords.v1', '{'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#posgrid');
const corruptHome = await page.evaluate(() => document.querySelector('#posgrid').innerText);
await page.click('[data-action="poslearn"][data-p="gnd"]');
await page.waitForSelector('[data-testid="training-record"]');
const corruptText = await page.evaluate(() => document.querySelector('[data-testid="training-record"] summary').innerText);
ok('corrupt storage still offers a training record on the study page only', /Not entered/.test(corruptText) && !/No record/.test(corruptHome) && !/Add record/.test(corruptHome), corruptText + ' | ' + corruptHome.slice(0, 180));

await browser.close();
server.close();
if (fails.length) {
  console.error(fails.length + ' failed');
  process.exit(1);
}
console.log('position-record browser checks passed');
