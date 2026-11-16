#!/usr/bin/env node
/* Browser checks for the fictional demo and the source-anchored flashcard flow. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = '/opt/cursor/artifacts';
fs.mkdirSync(artifacts, { recursive: true });
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
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(buf);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const server = await startServer();
const port = server.address().port;
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
const posts = [];
page.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') posts.push(req.method() + ' ' + req.url()); });
page.on('pageerror', err => fails.push('pageerror ' + err.message));
page.on('dialog', async dialog => { await dialog.accept(); });

try {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="try-demo"]');
  await page.evaluate(() => {
    localStorage.setItem('vatc.fcStats', JSON.stringify({ keepcard: { status: 'KNOWN', times_correct: 1, times_missed: 0, last_seen: 1, mc_ok: true, written_ok: true } }));
    localStorage.setItem('vatc.positionRecords.v1', JSON.stringify({ v: 1, items: { 'KNFG:cd': { status: 'training', started: '2020-11-01', qualified: '' } } }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const before = await page.evaluate(() => ({
    stats: localStorage.getItem('vatc.fcStats'),
    rec: localStorage.getItem('vatc.positionRecords.v1'),
    gate: !!document.querySelector('[data-testid="demo-gate"]'),
    banner: !!document.querySelector('[data-testid="demo-banner"]')
  }));
  ok('normal data is present and the code form is closed', before.stats.includes('keepcard') && before.rec.includes('KNFG:cd') && !before.gate && !before.banner);

  await page.click('[data-testid="try-demo"]');
  await page.waitForSelector('#democode');
  await page.type('#democode', 'nope');
  await page.click('[data-action="demoenter"]');
  const unknown = await page.$eval('.demo-msg', el => el.textContent);
  ok('unknown code stays friendly', /does not open the demo/.test(unknown) && !/lookup|unauthorized|password/i.test(unknown), unknown);

  await page.click('#democode', { clickCount: 3 });
  await page.type('#democode', 'VECTOR-DEMO');
  await page.click('[data-action="demoenter"]');
  await page.waitForSelector('[data-testid="demo-banner"]');
  const demoHome = await page.evaluate(() => ({
    banner: document.querySelector('[data-testid="demo-banner"]').innerText,
    stats: localStorage.getItem('vatc.fcStats'),
    rec: localStorage.getItem('vatc.positionRecords.v1'),
    home: document.querySelector('#posgrid').innerText
  }));
  ok('demo banner is on home and study data is the fictional seed', /DEMO · fictional data · no sign-in or authorization/.test(demoHome.banner) && demoHome.stats.includes('twy-widths') && !demoHome.stats.includes('keepcard') && demoHome.rec.includes('KNFG:gnd') && demoHome.rec.includes('KNFG:lcl'), demoHome.banner);
  ok('demo home has no position-record row', !/POSITION RECORD|No record|Add record/i.test(demoHome.home));
  await page.screenshot({ path: path.join(artifacts, 'demo-home-desktop.png') });

  await page.setViewport({ width: 390, height: 844 });
  const mobileFit = await page.evaluate(() => {
    const banner = document.querySelector('[data-testid="demo-banner"]').getBoundingClientRect();
    return {
      wide: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      bannerTop: banner.top,
      bannerRight: banner.right,
      w: window.innerWidth
    };
  });
  ok('demo home fits a 390px screen', mobileFit.wide && mobileFit.bannerRight <= mobileFit.w + 1, JSON.stringify(mobileFit));
  await page.screenshot({ path: path.join(artifacts, 'demo-home-mobile.png') });

  await page.setViewport({ width: 1280, height: 800 });
  await page.click('[data-action="demotour"]');
  await page.waitForSelector('[data-testid="demo-tour"]');
  await page.click('[data-action="poslearn"][data-p="gnd"]');
  await page.waitForSelector('[data-testid="training-record"][data-pos="gnd"]');
  const gnd = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="training-record"]');
    el.open = true;
    return el.textContent;
  });
  ok('demo Ground record is in training and labeled fictional', /In training|Started 2026-10-01/.test(gnd) && /training record/i.test(gnd), gnd.slice(0, 220));
  await page.click('.tab[data-t="home"]');
  await page.click('[data-action="poslearn"][data-p="lcl"]');
  await page.waitForSelector('[data-testid="training-record"][data-pos="lcl"]');
  const lcl = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="training-record"]');
    el.open = true;
    return el.textContent;
  });
  ok('demo Local shows the 27-day fictional note', /27/.test(lcl) && /Demo position note/.test(lcl) && /fictional/.test(lcl), lcl.slice(0, 280));

  for (const tab of ['learn', 'cards', 'reference', 'crew', 'home']) {
    await page.click('.tab[data-t="' + tab + '"]');
    await page.waitForSelector('[data-testid="demo-banner"]');
  }
  ok('demo banner stays on the main screens', true);

  await page.click('.tab[data-t="cards"]');
  await page.waitForSelector('#pkq');
  const openedDeck = await page.evaluate(() => {
    const el = document.querySelector('[data-action="fcdeck"][data-d="pk:pos:gnd"]')
      || document.querySelector('[data-action="fcdeck"][data-d^="pk:pos:gnd"]')
      || [...document.querySelectorAll('[data-action="fcdeck"]')].find(b => /ground/i.test(b.textContent));
    if (!el) return '';
    el.click();
    return el.getAttribute('data-d') || el.textContent.slice(0, 40);
  });
  ok('ground flashcard set is in the picker', !!openedDeck, openedDeck);
  if (openedDeck) {
    await page.waitForSelector('[data-testid="fc-card"], [data-testid="fc-empty"]');
    if (await page.$('[data-testid="fc-empty"]') && !(await page.$('[data-testid="fc-card"]'))) {
      await page.select('[data-action="fcstudypos"]', 'cd');
      await page.waitForSelector('[data-testid="fc-card"], [data-testid="fc-empty"]');
    }
    await page.waitForSelector('[data-testid="fc-card"]');
    const hidden = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="fc-card"]');
      const back = card.querySelector('.fcface.back');
      return { revealed: card.classList.contains('is-revealed'), back: (back && back.textContent || '').trim(), q: card.querySelector('.q').textContent };
    });
    ok('flashcard hides the answer before reveal', !hidden.revealed && hidden.back === '' && hidden.q.length > 0, JSON.stringify(hidden));
    await page.click('[data-testid="fc-card"]');
    await page.waitForSelector('[data-testid="fc-quote"]');
    const shown = await page.evaluate(() => {
      const again = document.querySelector('[data-testid="fc-again"]');
      const got = document.querySelector('[data-testid="fc-got"]');
      const ar = again.getBoundingClientRect();
      const gr = got.getBoundingClientRect();
      return {
        quote: document.querySelector('[data-testid="fc-quote"]').textContent,
        source: document.querySelector('[data-testid="fc-source"]').textContent,
        needle: document.querySelector('[data-testid="fc-source"]').dataset.needle,
        againDisabled: again.disabled,
        overlap: ar.right > gr.left + 1 && ar.left < gr.right,
        wide: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      };
    });
    ok('revealed card shows a source quote and separate Again / Got it', shown.quote.length > 8 && shown.needle === shown.quote && !shown.againDisabled && !shown.overlap && shown.wide, JSON.stringify(shown));
    await page.evaluate(() => document.querySelector('[data-testid="fc-again"]').scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(artifacts, 'flashcard-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    const phoneCard = await page.evaluate(() => {
      const again = document.querySelector('[data-testid="fc-again"]').getBoundingClientRect();
      const got = document.querySelector('[data-testid="fc-got"]').getBoundingClientRect();
      return {
        wide: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        overlap: again.right > got.left + 1 && again.top < got.bottom && got.top < again.bottom && again.left < got.right
      };
    });
    ok('flashcard controls fit a 390px screen without overlap', phoneCard.wide && !phoneCard.overlap, JSON.stringify(phoneCard));
    await page.evaluate(() => document.querySelector('[data-testid="fc-again"]').scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(artifacts, 'flashcard-mobile.png') });
    await page.setViewport({ width: 1280, height: 800 });
    const quote = shown.quote;
    await page.click('[data-testid="fc-source"]');
    await page.waitForSelector('#pdffind', { timeout: 15000 });
    await page.waitForFunction(() => {
      const lab = document.getElementById('pdfpglbl');
      return lab && lab.textContent && lab.textContent !== '—';
    }, { timeout: 20000 }).catch(() => {});
    const cite = await page.evaluate(() => ({
      find: (document.getElementById('pdffind') || {}).value || '',
      page: (document.getElementById('pdfpglbl') || {}).textContent || '',
      quoteOnCard: (document.querySelector('[data-testid="fc-quote"]') || {}).textContent || ''
    }));
    const evidence = { quote, find: cite.find, page: cite.page, source: shown.source };
    fs.writeFileSync(path.join(artifacts, 'source-highlight.json'), JSON.stringify(evidence, null, 2));
    ok('source opens FACMAN 2-1-15 on page 25 and searches the card quote', quote.startsWith(cite.find) && cite.find.length >= 40 && /25\s*\//.test(cite.page), JSON.stringify(evidence));
    await page.screenshot({ path: path.join(artifacts, 'flashcard-source-desktop.png') });
  }

  const audit = await page.evaluate(() => window.vatcFcAudit ? window.vatcFcAudit() : null);
  ok('accepted flashcards all carry doc, place, and a quote', !!audit && audit.accepted > 0 && audit.acceptedItems.every(c => c.doc && (c.pg || c.pa)), audit && (audit.accepted + ' accepted, ' + audit.rejected + ' without a verified quote'));
  fs.writeFileSync(path.join(artifacts, 'flashcard-audit.json'), JSON.stringify({
    accepted: audit && audit.accepted,
    rejected: audit && audit.rejected,
    rejectedIds: audit ? audit.rejectedItems.map(c => ({ id: c.id, missing: c.missing })) : []
  }, null, 2));

  await page.click('.tab[data-t="home"]');
  await page.click('[data-action="demoexit"]');
  await page.waitForSelector('[data-testid="try-demo"]');
  const restored = await page.evaluate(() => ({
    stats: localStorage.getItem('vatc.fcStats'),
    rec: localStorage.getItem('vatc.positionRecords.v1'),
    banner: !!document.querySelector('[data-testid="demo-banner"]')
  }));
  ok('exit restores the normal workspace', restored.stats.includes('keepcard') && restored.rec.includes('KNFG:cd') && !restored.banner, JSON.stringify(restored));
  ok('demo activation did not upload', posts.length === 0, posts.join(','));
} catch (err) {
  console.error(err);
  fails.push('demo browser crashed');
} finally {
  await browser.close();
  server.close();
}

if (fails.length) {
  console.error(fails.length + ' failed');
  process.exit(1);
}
console.log('demo browser checks passed');
