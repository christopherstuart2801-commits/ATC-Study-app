#!/usr/bin/env node
/* Browser smoke: GitHub Pages subpath, manifest, offline reload, PDF range, Head Guide.
   Requires puppeteer-core and a local Chrome. Does not deploy. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = '/opt/cursor/artifacts';
const PREFIX = '/ATC-Study-app';

function typeOf(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  if (file.endsWith('.pdf')) return 'application/pdf';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.md') || file.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname !== PREFIX && !pathname.startsWith(PREFIX + '/')) {
      res.writeHead(404); res.end('outside app'); return;
    }
    let rel = pathname.slice(PREFIX.length).replace(/^\/+/, '');
    if (!rel) rel = 'index.html';
    const file = path.resolve(site, rel);
    if (!file.startsWith(site + path.sep) && file !== site) { res.writeHead(403); res.end('bad path'); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing ' + rel); return; }
    const stat = fs.statSync(file);
    const headers = {
      'Content-Type': typeOf(file),
      'Accept-Ranges': 'bytes',
      'Cache-Control': file.endsWith('sw.js') || file.endsWith('manifest.js') ? 'no-cache' : 'no-cache'
    };
    const range = req.headers.range;
    if (range && file.endsWith('.pdf')) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (!m) { res.writeHead(416, headers); res.end(); return; }
      let start = m[1] === '' ? Math.max(0, stat.size - parseInt(m[2], 10)) : parseInt(m[1], 10);
      let end = m[2] === '' ? stat.size - 1 : parseInt(m[2], 10);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= stat.size || end < start) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }); res.end(); return;
      }
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, Object.assign({}, headers, {
        'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
        'Content-Length': end - start + 1
      }));
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, Object.assign({}, headers, { 'Content-Length': stat.size }));
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function fail(msg) { console.log('FAIL', msg); process.exitCode = 1; }
function pass(msg) { console.log('PASS', msg); }

const server = await startServer();
const port = server.address().port;
const base = 'http://127.0.0.1:' + port + PREFIX + '/index.html';
let browser;
try {
  const puppeteer = (await import('puppeteer-core')).default;
  fs.mkdirSync(artifacts, { recursive: true });
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = [];
  const posts = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') posts.push(req.method() + ' ' + req.url()); });
  await page.goto(base + '#guide', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-guide="vector-head"]', { timeout: 20000 });
  const guideText = await page.$eval('[data-guide="vector-head"]', el => el.innerText);
  if (!/VECTOR HEAD GUIDE/.test(guideText)) fail('guide title missing'); else pass('hash #guide opens the Head Guide with no login');
  if (!/Rosters — not enabled/.test(guideText) || !/does not include that updater/.test(guideText) || !/does not accept a chief code/.test(guideText)) fail('guide labels missing: ' + guideText.slice(0, 400));
  else pass('guide labels later office work, planned updater, and chief code as not active');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const res = await fetch(link.href);
    const json = await res.json();
    return { href: link.href, display: json.display, start: json.start_url, scope: json.scope, icons: (json.icons || []).map(i => i.sizes + ':' + i.purpose) };
  });
  if (!manifest.href.endsWith('/ATC-Study-app/manifest.webmanifest')) fail('manifest url ' + manifest.href);
  else pass('manifest resolves under the GitHub Pages subpath');
  if (manifest.display !== 'standalone' || manifest.start !== './index.html' || manifest.scope !== './') fail('manifest fields ' + JSON.stringify(manifest));
  else pass('manifest is standalone with a relative start and scope');
  await page.screenshot({ path: path.join(artifacts, 'vector-head-guide-narrow.png') });

  await page.click('[data-action="feedback"]');
  await page.waitForSelector('[data-route="feedback"]', { timeout: 10000 });
  const feedback = await page.$eval('[data-route="feedback"]', el => el.innerText);
  if (!/does not transmit feedback/.test(feedback)) fail('feedback route copy missing');
  else pass('feedback route is visible and says it does not send');

  await page.click('[data-route="feedback"] [data-action="guide"]');
  await page.waitForSelector('[data-guide="vector-head"]', { timeout: 10000 });
  await page.click('[data-action="guidehome"]');
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('camp pendleton'), { timeout: 10000 });
  pass('study home is still available');

  await page.evaluate(() => {
    localStorage.setItem('vector_progress_ver', '2026-10-21');
    localStorage.setItem('vatc.trainee', JSON.stringify({ name: 'Ada Lovelace', initials: 'AL' }));
    localStorage.setItem('vatc.fcStats', JSON.stringify({ poggi: { status: 'KNOWN', times_correct: 1, times_missed: 0, last_seen: 1, mc_ok: true, written_ok: true } }));
    localStorage.setItem('vatc.pkOpen.v1', JSON.stringify({ quick: true, 'home:tower': true }));
    localStorage.setItem('vatc.tests.v1', JSON.stringify({ 'cd:1:lqs': { best: 90, last: 80, date: '2026-11-06' } }));
  });

  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 30000 });
  pass('service worker controls the page');
  const shellReady = await page.waitForFunction(async () => {
    const keys = await caches.keys();
    return keys.some(k => k.indexOf('vatc-shell-') === 0);
  }, { timeout: 30000 }).then(() => true).catch(() => false);
  if (!shellReady) fail('shell cache missing'); else pass('shell cache exists');

  await page.waitForFunction(() => {
    const s = window.VATC_DEVICE && window.VATC_DEVICE.snapshot();
    return s && s.shellReady && s.refs && s.refs.total > 0 && s.refs.cached === s.refs.total && !s.refs.running;
  }, { timeout: 180000 });
  const refSnap = await page.evaluate(() => window.VATC_DEVICE.snapshot().refs);
  pass('all ' + refSnap.cached + ' enumerated publications saved');

  await page.click('[data-action="device"]');
  await page.waitForSelector('.modal.device', { timeout: 10000 });
  const deviceText = await page.$eval('.modal.device', el => el.innerText);
  if (!/Add to Home Screen/.test(deviceText) || !/Install VECTOR ATC/.test(deviceText) || !/not an app-store download/.test(deviceText) || !/not a Department of Defense approval/.test(deviceText)) fail('install guidance missing');
  else pass('device panel shows Windows and iPhone install guidance');
  if (!/Site files saved: \d+\/\d+ publications/.test(deviceText) || !/Browser storage estimate:/.test(deviceText) || !/may exclude the cache/.test(deviceText)) fail('storage wording missing: ' + deviceText.slice(0, 700));
  else pass('device panel counts saved publications separately from the browser estimate');
  if (/Reported 0/.test(deviceText) && !/does not mean the files above are missing/.test(deviceText)) fail('zero estimate lacks the cache caveat');
  const installOffered = await page.evaluate(() => !!(window.VATC_DEVICE && window.VATC_DEVICE.snapshot().canInstall));
  const measured = await page.evaluate(async () => {
    const est = (navigator.storage && navigator.storage.estimate) ? await navigator.storage.estimate() : null;
    const s = window.VATC_DEVICE.snapshot();
    return { estimate: est, shellReady: s.shellReady, refs: s.refs, storage: s.storage };
  });
  console.log('INFO beforeinstallprompt offered:', installOffered);
  console.log('INFO storage estimate after shell and publications:', JSON.stringify(measured));
  await page.screenshot({ path: path.join(artifacts, 'vector-device-narrow.png') });
  await page.click('[data-action="deviceclose"]');

  const noteCached = await page.evaluate(async () => {
    await fetch('docs/NATOPS-VECTOR-ATC-one-pager.md');
    const keys = await caches.keys();
    for (const k of keys) {
      const cache = await caches.open(k);
      const hit = await cache.match(location.origin + location.pathname.replace(/[^/]+$/, '') + 'docs/NATOPS-VECTOR-ATC-one-pager.md');
      if (hit) return true;
    }
    return false;
  });
  if (noteCached) fail('a notes file was cached'); else pass('notes file was not added to the cache');

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.innerText.includes('VECTOR ATC') && document.body.innerText.includes('OFFLINE'), { timeout: 20000 });
  const kept = await page.evaluate(() => ({
    trainee: localStorage.getItem('vatc.trainee'),
    stats: localStorage.getItem('vatc.fcStats'),
    tests: localStorage.getItem('vatc.tests.v1'),
    pockets: localStorage.getItem('vatc.pkOpen.v1'),
    stamp: localStorage.getItem('vector_progress_ver')
  }));
  if (kept.trainee !== JSON.stringify({ name: 'Ada Lovelace', initials: 'AL' }) || !kept.stats.includes('KNOWN') || kept.stamp !== '2026-10-21' || !kept.tests.includes('90') || !kept.pockets.includes('home:tower')) fail('progress lost offline ' + JSON.stringify(kept));
  else pass('offline reload keeps every seeded vatc value');
  if (!/camp pendleton/i.test(await page.evaluate(() => document.body.innerText))) fail('study home missing offline');
  else pass('study home renders offline');

  await page.goto(base + '#guide', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-guide="vector-head"]', { timeout: 15000 });
  pass('Head Guide opens offline');

  const pdf = await page.evaluate(async () => {
    const res = await fetch('docs/flip/KNFG-AIRPORT-DIAGRAM.pdf', { headers: { Range: 'bytes=0-7' } });
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { status: res.status, type: res.headers.get('content-type'), text: new TextDecoder().decode(bytes), range: res.headers.get('content-range') };
  });
  if (!(pdf.text.startsWith('%PDF') && pdf.type && pdf.type.includes('pdf') && !pdf.text.includes('<html') && (pdf.status === 206 || pdf.status === 200))) fail('pdf offline ' + JSON.stringify(pdf));
  else pass('offline PDF range is the publication, not the app page (' + pdf.status + ')');

  const worker = await page.evaluate(async () => {
    const res = await fetch('vendor/pdfjs/pdf.worker.min.js');
    const text = (await res.text()).slice(0, 80);
    return { status: res.status, type: res.headers.get('content-type'), text };
  });
  if (worker.status !== 200 || /<!DOCTYPE|<html/i.test(worker.text) || !/javascript|ecmascript/i.test(worker.type || '')) fail('worker offline ' + JSON.stringify(worker));
  else pass('pdf.js worker is served as JavaScript offline');

  if (posts.length) fail('feedback sent a request ' + posts.join(', '));
  else pass('opening feedback did not send a non-GET request');
  const realErrors = errors.filter(e => !/fonts\.googleapis|Failed to load resource/i.test(e));
  if (realErrors.length) fail('page errors ' + realErrors.join(' | '));
  else pass('no page errors');
  if (!process.exitCode) console.log('SMOKE PASSED');
} catch (err) {
  console.error('FAIL smoke exception', err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
}
process.exit(process.exitCode || 0);
