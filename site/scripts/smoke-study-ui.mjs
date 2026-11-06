#!/usr/bin/env node
/* Desktop and mobile smoke for the study shell. Does not deploy or upload study data.
   Screenshots: /opt/cursor/artifacts/study-*-desktop.png and study-*-mobile.png */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = '/opt/cursor/artifacts';

function typeOf(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
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
    res.writeHead(200, { 'Content-Type': typeOf(file), 'Content-Length': buf.length, 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function lum(rgb) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
  if (!m) return null;
  const lin = [m[1], m[2], m[3]].map(n => {
    const c = Number(n) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a, b) {
  const L1 = lum(a), L2 = lum(b);
  if (L1 == null || L2 == null) return 0;
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

const fails = [];
function ok(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) fails.push(name);
}

const server = await startServer();
const port = server.address().port;
const base = 'http://127.0.0.1:' + port + '/index.html';
let browser;
try {
  const puppeteer = (await import('puppeteer-core')).default;
  fs.mkdirSync(artifacts, { recursive: true });
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  async function session(width, height, mobile) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: 1 });
    const errors = [];
    const posts = [];
    page.on('pageerror', err => errors.push(String(err)));
    page.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') posts.push(req.method() + ' ' + req.url()); });
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.today-card');
    return { page, errors, posts };
  }

  const desk = await session(1280, 800, false);
  const home = await desk.page.evaluate(() => document.body.innerText);
  ok('desktop home names study, cited pages, both crews, and offline', /today/i.test(home) && /study a position/i.test(home) && /cited pages/i.test(home) && /verify that page/i.test(home) && /crew 1 and crew 2/i.test(home) && /offline on this device/i.test(home));
  ok('desktop home keeps the station and the study boundary', /MCAS Camp Pendleton \(KNFG\)/i.test(home) && /KNFG Quizlets/i.test(home) && /not a substitute for the current official source/i.test(home) && /NO CONTROLLED DATA LOADED/.test(home));
  ok('desktop home does not claim a live status or a qualification', /not a qualification/.test(home) && /Not a live airfield status/.test(home));
  const deskFit = await desk.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  ok('desktop home does not widen the page', deskFit);
  await desk.page.screenshot({ path: path.join(artifacts, 'study-home-desktop.png') });

  const ratio = await desk.page.evaluate(() => {
    const card = document.querySelector('.today-card');
    const body = card.querySelector('.today-d');
    const tab = document.querySelector('.tab:not(.on)');
    const on = document.querySelector('.tab.on');
    const bar = document.querySelector('.tabs');
    return {
      card: [getComputedStyle(body).color, getComputedStyle(card).backgroundColor],
      tab: [getComputedStyle(tab).color, getComputedStyle(bar).backgroundColor],
      on: [getComputedStyle(on).color, getComputedStyle(on).backgroundColor]
    };
  });
  ok('today card text contrast is at least 4.5:1', contrast(ratio.card[0], ratio.card[1]) >= 4.5, contrast(ratio.card[0], ratio.card[1]).toFixed(2));
  ok('inactive tab contrast is at least 4.5:1', contrast(ratio.tab[0], ratio.tab[1]) >= 4.5, contrast(ratio.tab[0], ratio.tab[1]).toFixed(2));
  ok('active tab contrast is at least 4.5:1', contrast(ratio.on[0], ratio.on[1]) >= 4.5, contrast(ratio.on[0], ratio.on[1]).toFixed(2));

  await desk.page.focus('[data-action="today"][data-go="ask"]');
  await desk.page.keyboard.press('Enter');
  await desk.page.waitForSelector('#reflk');
  const ask = await desk.page.evaluate(() => ({
    on: document.querySelector('.tab[data-t="ask"]').classList.contains('on'),
    text: document.body.innerText
  }));
  ok('keyboard opens Ask from the home card', ask.on && /Search every pub and get a cited answer\./.test(ask.text));
  await desk.page.screenshot({ path: path.join(artifacts, 'study-ask-desktop.png') });

  await desk.page.click('.tab[data-t="learn"]');
  await desk.page.waitForFunction(() => document.querySelector('.tabhint') && document.querySelector('.tabhint').textContent === 'Your LQS ACADs with references and tests.');
  ok('Learn explainer unchanged', true);
  await desk.page.screenshot({ path: path.join(artifacts, 'study-learn-desktop.png') });

  await desk.page.click('.tab[data-t="crew"]');
  await desk.page.waitForSelector('[data-crw="board"]');
  const crew = await desk.page.evaluate(() => document.querySelector('[data-crw="board"]').innerText);
  ok('crew board keeps capture, both crews, and the training-aid limit', /crew notices/i.test(crew) && /crew 1/i.test(crew) && /crew 2/i.test(crew) && /take photo/i.test(crew) && /import image/i.test(crew) && /training office/i.test(crew) && /not uploaded/i.test(crew) && /Training aid only/.test(crew) && /official current NOTAM source/.test(crew));
  await desk.page.screenshot({ path: path.join(artifacts, 'study-crew-desktop.png') });

  await desk.page.click('[data-action="device"]');
  await desk.page.waitForSelector('.modal.device');
  const device = await desk.page.evaluate(() => {
    const d = document.querySelector('.modal.device');
    return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), text: d.innerText, active: document.activeElement === d };
  });
  ok('device dialog is labeled and keeps install, guide, and backup', device.role === 'dialog' && device.modal === 'true' && /THIS DEVICE/.test(device.text) && /EXPORT BACKUP/.test(device.text) && /HEAD GUIDE/.test(device.text) && /Nothing is uploaded/.test(device.text) && /Add to Home Screen/.test(device.text) && /not a Department of Defense approval/.test(device.text));
  ok('opening device moves focus into the dialog', device.active);
  await desk.page.screenshot({ path: path.join(artifacts, 'study-device-desktop.png') });
  await desk.page.keyboard.press('Escape');
  await desk.page.waitForFunction(() => !document.querySelector('.modal.device'));
  ok('Escape closes the device dialog', true);

  const phone = await session(390, 844, true);
  const phoneHome = await phone.page.evaluate(() => document.body.innerText);
  ok('mobile home still explains today', /today/i.test(phoneHome) && /crew 1 and crew 2/i.test(phoneHome) && /NO CONTROLLED DATA LOADED/.test(phoneHome));
  const phoneFit = await phone.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  ok('mobile home does not widen the page', phoneFit, await phone.page.evaluate(() => document.documentElement.scrollWidth + '/' + document.documentElement.clientWidth));
  await phone.page.screenshot({ path: path.join(artifacts, 'study-home-mobile.png') });

  await phone.page.evaluate(() => document.querySelector('.tab[data-t="crew"]').scrollIntoView({ inline: 'nearest', block: 'nearest' }));
  await phone.page.click('.tab[data-t="crew"]');
  await phone.page.waitForSelector('[data-crw="board"]');
  const crewFit = await phone.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  ok('mobile crew does not widen the page', crewFit);
  const phoneCrew = await phone.page.evaluate(() => document.body.innerText);
  ok('mobile crew shows both crews', /crew 1/i.test(phoneCrew) && /crew 2/i.test(phoneCrew));
  await phone.page.screenshot({ path: path.join(artifacts, 'study-crew-mobile.png') });

  await phone.page.click('.tab[data-t="cards"]');
  ok('Flashcards explainer unchanged', (await phone.page.$eval('.tabhint', el => el.textContent)) === 'Study sets by position and ACAD.');
  await phone.page.click('.tab[data-t="reference"]');
  ok('Reference explainer unchanged', (await phone.page.$eval('.tabhint', el => el.textContent)) === '7110.65, FACMAN, FLIP plates and more.');
  await phone.page.screenshot({ path: path.join(artifacts, 'study-reference-mobile.png') });

  await phone.page.click('.tab[data-t="home"]');
  await phone.page.waitForSelector('[data-go="positions"]');
  await phone.page.focus('[data-go="positions"]');
  await phone.page.keyboard.press('Enter');
  const focusedPos = await phone.page.evaluate(() => {
    const el = document.activeElement;
    return !!(el && el.getAttribute && el.getAttribute('data-action') === 'poslearn');
  });
  ok('keyboard from Study a position focuses a position tile', focusedPos);

  ok('no page errors on desktop', desk.errors.length === 0, desk.errors.join(' | '));
  ok('no page errors on mobile', phone.errors.length === 0, phone.errors.join(' | '));
  ok('no unexpected uploads', desk.posts.length + phone.posts.length === 0, desk.posts.concat(phone.posts).join(' | '));

  await desk.page.close();
  await phone.page.close();
} catch (err) {
  console.error(err);
  fails.push('smoke crashed');
} finally {
  if (browser) await browser.close();
  server.close();
}

console.log(fails.length ? fails.length + ' FAILED' : 'SMOKE PASSED');
process.exit(fails.length ? 1 : 0);
