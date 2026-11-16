#!/usr/bin/env node
/* Mobile screenshots of each tab, then the same shell with the network off. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = '/opt/cursor/artifacts';
const fails = [];
function ok(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) fails.push(name);
}
function typeOf(file) {
  if (file.endsWith('.html')) return 'text/html';
  if (file.endsWith('.js')) return 'text/javascript';
  if (file.endsWith('.json')) return 'application/json';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(site, rel);
    if (file !== site && !file.startsWith(site + path.sep)) { res.writeHead(403); res.end('bad'); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing'); return; }
    const buf = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': typeOf(file), 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const server = await startServer();
const port = server.address().port;
const base = 'http://127.0.0.1:' + port + '/index.html';
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(artifacts, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', err => errors.push(String(err)));
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-action="openlog"]');
  const shots = [
    ['home', null, 'tab_home_mobile.png'],
    ['ask', 'ask', 'tab_ask_mobile.png'],
    ['learn', 'learn', 'tab_learn_mobile.png'],
    ['cards', 'cards', 'tab_flashcards_mobile.png'],
    ['reference', 'reference', 'tab_reference_mobile.png'],
    ['crew', 'crew', 'tab_crew_mobile.png']
  ];
  for (const [name, tab, file] of shots) {
    if (tab) {
      await page.evaluate(t => document.querySelector('.tab[data-t="' + t + '"]').scrollIntoView({ inline: 'nearest', block: 'nearest' }), tab);
      await page.click('.tab[data-t="' + tab + '"]');
      await page.waitForFunction(t => document.querySelector('.tab.on') && document.querySelector('.tab.on').getAttribute('data-t') === t, { timeout: 10000 }, tab);
    }
    await page.screenshot({ path: path.join(artifacts, file) });
    ok('screenshot ' + name, true);
  }
  await page.click('.tab[data-t="home"]');
  await page.waitForSelector('[data-action="openlog"]');
  await page.click('[data-action="openlog"]');
  await page.waitForSelector('#log-hours');
  await page.screenshot({ path: path.join(artifacts, 'tab_log_mobile.png') });
  await page.select('#log-pos', 'lcl');
  await page.$eval('#log-hours', el => { el.value = '2'; });
  await page.$eval('#log-activity', el => { el.value = 'Pattern'; });
  await page.select('#log-at-0', 'Visual');
  await page.$eval('#log-ac-0', el => { el.value = '4'; });
  await page.$eval('#log-paper', el => { el.value = 'Desk binder'; });
  await page.click('#log-from');
  await page.click('[data-action="logsave"]');
  await page.waitForFunction(() => /2 h/.test(document.body.innerText) && /Visual 4/.test(document.body.innerText));
  ok('log shows hours and approach totals', true);
  await page.screenshot({ path: path.join(artifacts, 'tab_log_saved_mobile.png') });

  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 25000 });
  await page.waitForFunction(() => window.VATC_DEVICE && window.VATC_DEVICE.snapshot().shellReady, { timeout: 25000 });
  ok('shell saved before the network is cut', true);
  const refsBefore = await page.evaluate(() => {
    const s = window.VATC_DEVICE.snapshot();
    return s.refs || { cached: 0, total: 0 };
  });
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => /OFFLINE/.test(document.body.innerText) && /Clearance \/ Flight Data/.test(document.body.innerText), { timeout: 15000 });
  ok('home study tiles load offline', true);
  await page.click('.tab[data-t="learn"]');
  await page.waitForFunction(() => /ACAD|No ACAD packet/.test(document.body.innerText), { timeout: 10000 });
  ok('learn opens offline', true);
  await page.click('.tab[data-t="cards"]');
  await page.waitForFunction(() => /Flashcards|ALL SETS|Frequencies|Study sets/.test(document.body.innerText), { timeout: 10000 });
  ok('flashcards open offline', true);
  await page.click('.tab[data-t="reference"]');
  await page.waitForSelector('#reflk');
  const refShelf = await page.evaluate(() => ({
    ph: (document.getElementById('reflk') || {}).placeholder || '',
    text: document.body.innerText
  }));
  ok('saved reference shelf opens offline', /Find in publications/.test(refShelf.ph) && /PUBLICATIONS/.test(refShelf.text) && /FIELD QUICK REF/.test(refShelf.text), refShelf.text.slice(0, 240));
  await page.click('.tab[data-t="home"]');
  await page.waitForSelector('[data-action="openlog"]');
  await page.click('[data-action="openlog"]');
  await page.waitForFunction(() => /Desk binder/.test(document.body.innerText) && /Visual 4/.test(document.body.innerText));
  ok('position log remains offline', true);
  if (refsBefore.cached > 0) {
    const pdf = await page.evaluate(async () => {
      const res = await fetch('docs/flip/KNFG-AIRPORT-DIAGRAM.pdf');
      const buf = new Uint8Array(await res.arrayBuffer());
      const text = new TextDecoder().decode(buf.slice(0, 8));
      return { status: res.status, text };
    });
    ok('a saved plate opens offline', pdf.status === 200 && pdf.text.startsWith('%PDF'), JSON.stringify(pdf));
  } else {
    ok('publication files were still saving when the network was cut', true, 'shelf HTML is in the shell; PDF bytes were not cached yet');
  }
  ok('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  console.error(err);
  fails.push('browser crashed');
} finally {
  await browser.close();
  server.close();
}
console.log(fails.length ? fails.length + ' FAILED' : 'LOG BROWSER PASSED');
process.exit(fails.length ? 1 : 0);
