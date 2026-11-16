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
const posts = [];
page.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') posts.push(req.method() + ' ' + req.url()); });
page.on('pageerror', err => fails.push('pageerror ' + err));
await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.home-row');

const empty = await page.evaluate(() => {
  const row = document.querySelector('.home-row');
  const pct = getComputedStyle(row.querySelector('.pcpct')).fontSize;
  return {
    pos: row.getAttribute('data-pos'),
    station: row.getAttribute('data-station'),
    text: row.querySelector('.prec summary').innerText,
    pct: parseFloat(pct)
  };
});
ok('empty record offers Add record and a large percent', /No record/.test(empty.text) && /Add record/.test(empty.text) && empty.pct >= 28, JSON.stringify(empty));

await page.evaluate((pos) => {
  document.querySelector('.prec[data-pos="' + pos + '"]').open = true;
}, empty.pos);
await page.select('#prec-st-' + empty.pos, 'qualified');
await page.$eval('#prec-sd-' + empty.pos, el => { el.value = '2020-11-01'; });
await page.$eval('#prec-qd-' + empty.pos, el => { el.value = '2020-11-28'; });
await page.click('.prec[data-pos="' + empty.pos + '"] [data-action="precsave"]');
await page.waitForFunction((pos) => /Days between entered dates: 27/.test(document.querySelector('.prec[data-pos="' + pos + '"]').innerText), {}, empty.pos);
const saved = await page.evaluate((pos) => {
  const rec = document.querySelector('.prec[data-pos="' + pos + '"]');
  return { text: rec.innerText, key: localStorage.getItem('vatc.positionRecords.v1') };
}, empty.pos);
ok('save shows 27 days and persists the versioned key', /Recorded qualified/.test(saved.text) && /confirm in training records/.test(saved.text) && /2020-11-01/.test(saved.key) && /"status":"qualified"/.test(saved.key));

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction((pos) => {
  const rec = document.querySelector('.prec[data-pos="' + pos + '"]');
  return rec && /Days between entered dates: 27/.test(rec.textContent) && /Recorded qualified/.test(rec.querySelector('summary').innerText);
}, {}, empty.pos);
ok('reload keeps the entered record', true);

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
const corrupt = await page.evaluate(() => ({
  home: !!document.querySelector('.home-row'),
  text: document.querySelector('.prec summary').innerText
}));
ok('corrupt storage still shows No record', corrupt.home && /No record/.test(corrupt.text), JSON.stringify(corrupt));

function ymd(d, utc) {
  const p = (n) => String(n).padStart(2, '0');
  return utc
    ? d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate())
    : d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
async function clockOf(target) {
  return target.evaluate(() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const local = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    const utc = d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
    return { local, utc, today: globalThis.VATC_POSREC.today() };
  });
}

const live = await browser.newPage();
const livePosts = [];
live.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') livePosts.push(req.method() + ' ' + req.url()); });
await live.emulateTimezone('America/Los_Angeles');
await live.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
await live.waitForSelector('.home-row');
const liveClock = await clockOf(live);
ok('live Pacific today follows the local calendar, not UTC', liveClock.today === liveClock.local && liveClock.local !== liveClock.utc, JSON.stringify(liveClock));
await live.close();

const pinned = await browser.newPage();
pinned.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') livePosts.push(req.method() + ' ' + req.url()); });
await pinned.emulateTimezone('America/Los_Angeles');
await pinned.evaluateOnNewDocument(() => {
  const fixed = Date.parse('2026-11-06T06:27:00.000Z');
  const Orig = Date;
  function Clock(...args) {
    if (args.length === 0) return new Orig(fixed);
    return new Orig(...args);
  }
  Clock.prototype = Orig.prototype;
  Clock.now = () => fixed;
  Clock.parse = Orig.parse;
  Clock.UTC = Orig.UTC;
  window.Date = Clock;
});
await pinned.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
await pinned.waitForSelector('.home-row');
const pinnedClock = await clockOf(pinned);
ok('pinned PST evening is local Nov 5 while UTC is Nov 6', pinnedClock.local === '2026-11-05' && pinnedClock.utc === '2026-11-06' && pinnedClock.today === '2026-11-05', JSON.stringify(pinnedClock));
const ground = await pinned.evaluate(() => {
  const row = [...document.querySelectorAll('.home-row')].find(el => /Ground/.test(el.innerText));
  const pos = row.getAttribute('data-pos');
  row.querySelector('summary').click();
  return pos;
});
const limits = await pinned.evaluate((pos) => ({
  start: document.getElementById('prec-sd-' + pos).max,
  qual: document.getElementById('prec-qd-' + pos).max
}), ground);
ok('date inputs stop at the local today', limits.start === '2026-11-05' && limits.qual === '2026-11-05', JSON.stringify(limits));
await pinned.select('#prec-st-' + ground, 'qualified');
await pinned.$eval('#prec-sd-' + ground, el => { el.value = '2026-11-01'; });
await pinned.$eval('#prec-qd-' + ground, el => { el.value = '2026-11-05'; });
await pinned.click('.prec[data-pos="' + ground + '"] [data-action="precsave"]');
await pinned.waitForFunction((pos) => /Days between entered dates: 4/.test(document.querySelector('.prec[data-pos="' + pos + '"]').textContent), {}, ground);
await pinned.reload({ waitUntil: 'domcontentloaded' });
await pinned.waitForFunction((pos) => /Days between entered dates: 4/.test(document.querySelector('.prec[data-pos="' + pos + '"]').textContent), {}, ground);
await pinned.evaluate((pos) => { document.querySelector('.prec[data-pos="' + pos + '"]').open = true; }, ground);
fs.mkdirSync('/opt/cursor/artifacts', { recursive: true });
await pinned.screenshot({ path: '/opt/cursor/artifacts/study-record-local-nov5.png' });
ok('browser saved Nov 1 to Nov 5 as 4 days and reloaded it', true);
const rejected = await pinned.evaluate((pos) => {
  const rec = document.querySelector('.prec[data-pos="' + pos + '"]');
  rec.open = true;
  document.getElementById('prec-st-' + pos).value = 'qualified';
  document.getElementById('prec-sd-' + pos).value = '2026-11-01';
  document.getElementById('prec-qd-' + pos).value = '2026-11-06';
  document.querySelector('[data-action="precsave"][data-pos="' + pos + '"]').click();
  return {
    err: document.getElementById('prec-err-' + pos).textContent,
    kept: document.getElementById('prec-qd-' + pos).value,
    stored: localStorage.getItem('vatc.positionRecords.v1')
  };
}, ground);
ok('local Nov 6 is rejected and the saved Nov 5 record stays', /cannot be in the future/.test(rejected.err) && rejected.kept === '2026-11-06' && /2026-11-05/.test(rejected.stored) && !/"qualified":"2026-11-06"/.test(rejected.stored), JSON.stringify(rejected));
await pinned.evaluate(() => localStorage.removeItem('vatc.positionRecords.v1'));
await pinned.reload({ waitUntil: 'domcontentloaded' });
const cleared = await pinned.evaluate((pos) => document.querySelector('.prec[data-pos="' + pos + '"] summary').innerText, ground);
ok('ephemeral Nov 5 record is cleared', /No record/.test(cleared) && /Add record/.test(cleared), cleared);
ok('local-date browser checks made no upload', livePosts.length === 0, livePosts.join(','));
await pinned.close();

await browser.close();
server.close();
if (fails.length) {
  console.error(fails.length + ' failed');
  process.exit(1);
}
console.log('position-record browser checks passed');
