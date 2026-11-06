#!/usr/bin/env node
/** Local crew-notice prototype. No network in the unit half. Browser half optional. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
assert.equal(html, fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'root/site mirror');
assert(html.includes('TOWER_PAPER:BEGIN — v0.8.36'), 'tower packet signature kept');
assert(html.includes('NO CONTROLLED DATA LOADED'));
assert(html.includes("const APP_VER='0.8.37'"));
assert(html.includes("learn:'Your LQS ACADs with references and tests.'"));
assert(html.includes("cards:'Study sets by position and ACAD.'"));
assert(html.includes("reference:'7110.65, FACMAN, FLIP plates and more.'"));

const block = html.split('/* CREW_NOTICES:BEGIN').pop().split('/* CREW_NOTICES:END').shift();
assert(block && block.includes('function crewParseNotice'), 'crew block present');
assert(!/FCC|password|createClient|serviceWorker\.register|\bfetch\s*\(/i.test(block), 'no feed, auth client, upload, or service worker in crew block');
assert(!/supabase\.(from|channel|auth)/i.test(block));
assert(block.includes('No cloud account service is connected'));
assert(!/supabase/i.test(block));
assert(block.includes('Not in effect'));
assert(block.includes('ATCFO'));
assert(block.includes('Training Chief'));
assert(block.includes('Vector Head'));
assert(block.includes('intended viewer'));
assert(block.includes('approved crew reads'));
assert(block.includes('There is no access code'));
assert(!/close runway|cleared to land|runway closed/i.test(block));

const el = () => ({
  innerHTML: '', value: '', style: {}, hidden: false, disabled: false, dataset: {},
  classList: { add() {}, remove() {}, contains() { return false; } },
  addEventListener() {}, focus() {}, select() {}, closest() { return null; },
  getAttribute() { return ''; }, setAttribute() {}
});
const ctx = {
  console, setTimeout() {}, clearTimeout() {}, requestAnimationFrame() {},
  URL: { createObjectURL() { return 'blob:local'; }, revokeObjectURL() {} },
  navigator: {}, location: { pathname: '/' },
  history: { replaceState() {}, pushState() {}, state: null },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, length: 0 },
  document: {
    getElementById: el, querySelector: el, querySelectorAll: () => [],
    addEventListener() {}, createElement: el, body: { appendChild() {}, removeChild() {} }
  }
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
let code = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
const end = /document\.getElementById\('vatc'\)\.addEventListener\('click'[\s\S]*render\(\);\s*\}\)\(\);/;
assert(end.test(code), 'runtime still closes the same way');
code = code.replace(end, '})();');
vm.runInContext(code, ctx);
const C = ctx.vatcCrew;
assert(C && C.access && C.parse, 'vatcCrew exported');

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };

check('planned access is not effective and names nobody', () => {
  const a = C.access();
  assert.equal(a.effective, false);
  assert.equal(a.login, false);
  assert.equal(a.cloud, false);
  assert.equal(a.owner, null);
  assert.equal(a.admin, null);
  assert.equal(a.roles.length, 5);
  a.roles.forEach(r => assert.equal(r.effective, false));
  const htmlRoles = C.rolesHTML(false);
  assert.match(htmlRoles, /Planned access model \/ roles/);
  assert.match(htmlRoles, /Not in effect/);
  assert.match(htmlRoles, /ATCFO/);
  assert.match(htmlRoles, /Training Chief/);
  assert.match(htmlRoles, /Vector Head/);
  assert.match(htmlRoles, /approved crew reads/);
  assert.doesNotMatch(htmlRoles, /type="password"|access code is|you are the/i);
});

check('save is blocked until a person reviews', () => {
  assert.equal(C.canSave({ crew: 'A', ack: false, ocrStatus: 'read' }).ok, false);
  assert.equal(C.canSave({ crew: 'A', ack: true, ocrStatus: 'reading' }).ok, false);
  assert.equal(C.canSave({ crew: 'C', ack: true, ocrStatus: 'read' }).ok, false);
  assert.equal(C.canSave(null).ok, false);
  const ok = C.canSave({ crew: 'B', ack: true, ocrStatus: 'pending' });
  assert.equal(ok.ok, true);
});

check('parse never emits a decision and unresolved dates stay needs review', () => {
  const p = C.parse('EXAMPLE\nDATE TOKEN 2099-01-01\nAMBIGUOUS 11/06\nBAD 2099-02-31\nUNTIL UFN');
  assert.equal(p.status, 'needs-review');
  assert.equal(p.authoritative, false);
  assert.equal(JSON.stringify(p.decisions), '[]');
  assert.match(p.note, /not a runway, airfield, or control instruction/);
  const flat = JSON.stringify(p);
  assert.doesNotMatch(flat, /"instruction"|"action"|"runway"|"closed"/i);
  const iso = p.items.find(i => /2099-01-01/.test(i.raw)).dates.find(d => d.token === '2099-01-01');
  assert.equal(iso.iso, '2099-01-01');
  assert.equal(iso.status, 'needs-review');
  const amb = p.items.find(i => /11\/06/.test(i.raw)).dates.find(d => d.token === '11/06');
  assert.equal(amb.iso, null);
  assert.equal(amb.status, 'needs-review');
  const bad = p.items.find(i => /2099-02-31/.test(i.raw)).dates[0];
  assert.equal(bad.iso, null);
  assert.equal(bad.status, 'needs-review');
  const ufn = p.items.find(i => /UFN/.test(i.raw)).dates.find(d => d.token === 'UFN');
  assert.equal(ufn.iso, null);
});

check('a noted date is still not a live status', () => {
  const open = C.sanitize({
    id: 'c-open', crew: 'A', reviewedText: 'DATE TOKEN 2099-01-01', ocrStatus: 'read',
    shift: 'day', shiftDate: '2099-01-01', sourceNote: 'EXAMPLE sheet', reviewAck: true,
    lineNotes: [], savedAt: '2099-01-01T00:00:00.000Z'
  });
  assert(open.flags.includes('date-unresolved'));
  assert(open.flags.includes('parse-needs-review'));
  assert.equal(C.needsLook(open), true);
  const noted = C.sanitize(Object.assign({}, open, { lineNotes: [true] }));
  assert(noted.flags.includes('date-noted'));
  assert(!noted.flags.includes('date-unresolved'));
  assert.equal(noted.parse.status, 'needs-review');
  assert.equal(noted.authoritative, false);
  assert.equal(JSON.stringify(noted.decisions), '[]');
  assert.equal(C.needsLook(noted), false);
  const ambiguous = C.sanitize(Object.assign({}, open, { reviewedText: 'AMBIGUOUS 11/06', lineNotes: [true] }));
  assert(ambiguous.flags.includes('date-unresolved'));
  assert.equal(C.needsLook(ambiguous), true);
});

check('backup import cannot grant authority or a role', () => {
  assert.throws(() => C.merge([], { records: [] }), /backup/);
  const merged = C.merge([], {
    vectorAtcCrewBackup: 1,
    role: 'owner',
    owner: 'admin',
    records: [{
      id: 'c-import', crew: 'B', reviewedText: 'EXAMPLE only', ocrStatus: 'pending',
      decisions: ['close runway'], authoritative: true, role: 'ATCFO', owner: 'someone'
    }]
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].crew, '2');
  assert.equal(merged[0].reviewedText, 'EXAMPLE only');
  assert.equal(JSON.stringify(merged[0].decisions), '[]');
  assert.equal(merged[0].authoritative, false);
  assert.equal(merged[0].aid, true);
  assert.equal(merged[0].role, undefined);
  assert.equal(merged[0].owner, undefined);
  assert.equal(merged[0].example, true);
  assert(merged[0].flags.includes('ocr-pending'));
  const built = C.build({
    crew: 'A', ack: false, text: 'EXAMPLE', ocrStatus: 'read'
  });
  assert.equal(built.ok, false);
  assert.equal(built.rec, null);
});

check('demo roster is a small fictional fixture', () => {
  const rows = C.demoRoster;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].label, 'Demo Controller 01');
  assert.equal(rows[0].crew, '1');
  assert.equal(rows[0].date, '2099-01-06');
  assert.equal(rows[0].outcome, 'Dummy outcome — sample reviewed');
  assert.equal(rows[0].fictional, true);
  assert.equal(rows[1].label, 'Demo Controller 02');
  assert.equal(rows[1].crew, '2');
  assert.equal(rows[1].fictional, true);
  const blob = JSON.stringify(rows) + C.demoHTML('all') + C.demoHTML('1');
  assert.match(blob, /Fictional labels/);
  assert.match(C.demoHTML('1'), /Demo Controller 01/);
  assert.doesNotMatch(C.demoHTML('1'), /Demo Controller 02/);
  assert.equal(C.canon('A'), '1');
  assert.equal(C.canon('b'), '2');
  assert.equal(C.sanitize({ id: 'c-leg', crew: 'A', reviewedText: 'typed by hand', ocrText: 'DIFFERENT OCR', ocrStatus: 'pending', reviewAck: true }).reviewedText, 'typed by hand');
  assert.equal(C.sanitize({ id: 'c-leg', crew: 'B', reviewedText: 'typed by hand', ocrStatus: 'pending' }).crew, '2');
  assert.doesNotMatch(blob, /@|\(\d{3}\)|\bPFT\b|\bCFT\b|medical|phone|rank|email/i);
  assert.doesNotMatch(block, /CREW_DEMO_ROSTER[\s\S]{0,800}(@|\(\d{3}\)|medical)/i);
});

check('OCR copy stays non-authoritative', () => {
  assert.match(C.ocrLab('pending', false), /OCR is pending and needs review/);
  assert.match(C.ocrLab('failed', false), /Nothing was uploaded/);
  assert.match(C.ocrLab('read', false), /not authoritative/);
  assert.match(C.ocrLab('read', true), /not authoritative/);
  assert.match(C.aid, /Verify against the official current NOTAM source/);
  assert.match(C.aid, /not an operational notice/);
});

async function extraUnits() {
  const writes = [];
  const failed = await C.commit(
    { id: 'c1', crew: '1', reviewedText: 'hello', ocrStatus: 'pending', reviewAck: true, thumb: true, aid: true, authoritative: false, decisions: [] },
    new Blob(['img'], { type: 'image/png' }),
    { put: async () => { throw new Error('idb'); }, del: async () => {}, write: (l) => { writes.push(l); }, load: () => [], get: async () => null }
  );
  assert.equal(failed.complete, false);
  assert.equal(failed.image.reason, 'indexeddb-failed');
  assert.equal(writes.length, 0);
  const device = { format: 'vector-atc-backup', formatVersion: 1, keys: { 'vatc.fcStats': {} } };
  const bad = C.attachToDeviceBackup(device, { records: [{ id: 'c1', crew: '1', reviewedText: 'x', thumb: true, ocrStatus: 'read', reviewAck: true }], photos: {} });
  assert.equal(bad.ok, false);
  assert.equal(JSON.stringify(bad.missing), '["c1"]');
  const good = C.attachToDeviceBackup(device, { records: [{ id: 'c1', crew: 'A', reviewedText: 'kept text', ocrText: 'ocr', thumb: true, ocrStatus: 'pending', reviewAck: true }], photos: { c1: 'data:image/png;base64,YQ==' } });
  assert.equal(good.ok, true);
  assert.equal(good.backup.keys['vatc.crewNotices.v1'][0].crew, '1');
  assert.equal(good.backup.keys['vatc.crewNotices.v1'][0].reviewedText, 'kept text');
  assert.equal(good.backup.crewPhotos.bridge, 'vector-atc-crew-photos');
  assert.equal(good.backup.crewPhotos.notOfficialSource, true);
  checks += 1;
  console.log('PASS photo failure does not save, and a device backup cannot omit crew photos');
}

console.log(checks + ' unit checks passed');

async function browserChecks() {
  let chromium;
  try { ({ chromium } = require('playwright-core')); }
  catch (e) {
    console.log('SKIP browser — playwright-core not installed');
    return;
  }
  const { execFileSync } = require('child_process');
  const http = require('http');
  const site = path.join(root, 'site');
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = u === '/' ? '/index.html' : u;
    const file = path.normalize(path.join(site, rel));
    if (!file.startsWith(site)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('no'); return; }
      res.writeHead(200); res.end(buf);
    });
  });
  await new Promise(r => server.listen(8765, '127.0.0.1', r));
  const url = 'http://127.0.0.1:8765/index.html';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const posts = [];
  const shotDir = '/tmp/crew-shots';
  fs.mkdirSync(shotDir, { recursive: true });
  const pngPage = await browser.newPage({ viewport: { width: 480, height: 640 } });
  await pngPage.setContent(`<!doctype html><body style="margin:0;background:#fff;color:#111;font:700 32px/1.35 sans-serif;padding:28px">
    <div>EXAMPLE</div><div>NOT A NOTICE</div><div>TRAINING SAMPLE ONLY</div>
    <div>NO OPERATIONAL DATA</div><div>DATE TOKEN 2099-01-01</div><div>AMBIGUOUS 11/06</div></body>`);
  const png = path.join(shotDir, 'example-notice.png');
  await pngPage.screenshot({ path: png });
  await pngPage.close();
  fs.writeFileSync(path.join(shotDir, 'not-an-image.txt'), 'this is not an image');
  const badPng = path.join(shotDir, 'bad.png');
  fs.writeFileSync(badPng, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));

  const pass = [];
  const ok = (name, cond, extra) => {
    pass.push(!!cond);
    console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
  };

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await mobile.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('request', req => { if (req.method() !== 'GET' && req.method() !== 'HEAD') posts.push(req.method() + ' ' + req.url()); });
  await page.addInitScript(() => {
    window.Tesseract = { recognize: async () => ({ data: { text: 'EXAMPLE\nNOT A NOTICE\nTRAINING SAMPLE ONLY\nNO OPERATIONAL DATA\nDATE TOKEN 2099-01-01\nAMBIGUOUS 11/06\n' } }) };
  });
  await page.goto(url);
  await page.waitForSelector('#vatc .tab');
  await page.click('#vatc [data-action="tab"][data-t="learn"]');
  ok('Learn explainer preserved', (await page.textContent('#vatc .tabhint')) === 'Your LQS ACADs with references and tests.');
  await page.click('#vatc [data-action="tab"][data-t="cards"]');
  ok('Flashcards explainer preserved', (await page.textContent('#vatc .tabhint')) === 'Study sets by position and ACAD.');
  await page.click('#vatc [data-action="tab"][data-t="reference"]');
  ok('Reference explainer preserved', (await page.textContent('#vatc .tabhint')) === '7110.65, FACMAN, FLIP plates and more.');
  await page.click('#vatc [data-action="tab"][data-t="crew"]');
  await page.waitForSelector('[data-crw="board"]');
  const board = await page.textContent('[data-crw="board"]');
  ok('crew workspace is the training-aid capture screen', /Crew notices/.test(board) && /Take photo/.test(board) && /Import image/.test(board) && /not uploaded/.test(board));
  ok('capture inputs: camera and file', await page.locator('input[capture="environment"]').count() >= 1 && await page.locator('input[data-action="crwfile"]:not([capture])').count() >= 1);
  await page.click('[data-action="crwoffice"][data-open="1"]');
  await page.waitForSelector('[data-crw="office"] details.crw-roles[open]');
  const roles = await page.textContent('details.crw-roles');
  const officeTxt = await page.textContent('[data-crw="office"]');
  ok('planned roles are a small disclosure, not a login', /ATCFO/.test(roles) && /Training Chief/.test(roles) && /Vector Head/.test(roles) && /intended viewer/.test(roles) && /approved crew reads/.test(roles) && /Not in effect/.test(roles) && /No cloud account service is connected/.test(roles) && /no access code/i.test(roles));
  ok('office demo roster is fictional and separate from notices', /Demo Controller 01/.test(officeTxt) && /Demo Controller 02/.test(officeTxt) && /Not assignments/.test(officeTxt) && (await page.locator('.crw-demo-row').count()) === 2 && (await page.locator('.crw-item').count()) === 0);
  ok('no password or account control', await page.locator('input[type="password"], [data-action="login"]').count() === 0);
  await page.screenshot({ path: path.join(shotDir, 'office-roles-mobile.png') });
  await page.click('[data-action="crwboard"]');
  const aBoard = await page.textContent('[data-crw="board"]');
  ok('crew 1 shows only its fictional demo row', /Demo Controller 01/.test(aBoard) && !/Demo Controller 02/.test(aBoard) && /Crew 1/.test(aBoard) && !/Crew A/.test(aBoard));
  await page.selectOption('#crw-shift', 'day');
  await page.fill('#crw-date', '2099-01-01');
  await page.fill('#crw-src', 'EXAMPLE sheet');
  await page.setInputFiles('input[data-action="crwfile"]:not([capture])', png);
  await page.waitForSelector('[data-crw="review"] #crw-status[data-ocr="read"]');
  const review = await page.textContent('[data-crw="review"]');
  ok('EXAMPLE image reaches review and is labeled', /EXAMPLE — no operational data/.test(review) && /Review before save/.test(review));
  ok('line check is visible and non-operational', /Line check/.test(review) && /needs review/.test(review) && /2099-01-01/.test(review) && /11\/06/.test(review) && !/cleared to land|runway closed/i.test(review));
  ok('save stays disabled before review', await page.locator('#crw-save').isDisabled());
  const before = await page.evaluate(() => localStorage.getItem('vatc.crewNotices.v1'));
  ok('import does not silently save', before == null);
  await page.screenshot({ path: path.join(shotDir, 'review-example-mobile.png'), fullPage: false });
  await page.check('#crw-ack');
  ok('ack enables save', !(await page.locator('#crw-save').isDisabled()));
  await page.fill('#crw-text', 'EXAMPLE\nNOT A NOTICE\nDATE TOKEN 2099-01-01\nAMBIGUOUS 11/06');
  ok('editing text clears the review ack', await page.locator('#crw-save').isDisabled());
  await page.check('#crw-ack');
  await page.click('#crw-save');
  await page.waitForSelector('[data-crw="read"]');
  const savedTxt = await page.textContent('[data-crw="read"]');
  ok('saved record keeps the training-aid label', /Saved on this browser/.test(savedTxt) && /Training aid only/.test(savedTxt) && /Parse needs review/.test(savedTxt) && /Date needs review/.test(savedTxt));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('vatc.crewNotices.v1')));
  ok('record is local, crew 1, not authoritative', stored.length === 1 && stored[0].crew === '1' && stored[0].authoritative === false && stored[0].decisions.length === 0 && stored[0].reviewAck === true && stored[0].example === true);
  const thumb = await page.evaluate(async (id) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('vatcCrewLocal', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    return await new Promise(res => { const rq = db.transaction('thumbs').objectStore('thumbs').get(id); rq.onsuccess = () => res(!!rq.result); rq.onerror = () => res(false); });
  }, stored[0].id);
  ok('thumbnail stored in IndexedDB', thumb === true);
  await page.fill('#crw-note', 'optional local note');
  await page.click('[data-action="crwnote"]');
  await page.waitForSelector('.crw-msg');
  const noted = await page.evaluate(() => JSON.parse(localStorage.getItem('vatc.crewNotices.v1'))[0].localNote);
  ok('optional note stays on device', noted === 'optional local note' && /Nothing was sent/.test(await page.textContent('.crw-msg')));
  await page.click('[data-action="crwoffice"]');
  await page.click('[data-action="crwfilt"][data-f="2"]');
  ok('crew 2 filter hides crew 1', (await page.locator('.crw-item').count()) === 0);
  await page.click('[data-action="crwfilt"][data-f="1"]');
  ok('crew 1 filter shows the saved notice', (await page.locator('.crw-item').count()) === 1);
  await page.click('[data-action="crwcrew"][data-c="2"]');
  await page.evaluate(() => { window.Tesseract = { recognize: async () => ({ data: { text: 'EXAMPLE CREW B ONLY' } }) }; });
  await page.selectOption('#crw-shift', 'swing');
  await page.fill('#crw-date', '2099-01-02');
  await page.fill('#crw-src', 'EXAMPLE crew B sheet');
  await page.setInputFiles('input[data-action="crwfile"]:not([capture])', png);
  await page.waitForSelector('#crw-status[data-ocr="read"]');
  await page.check('#crw-ack');
  await page.click('#crw-save');
  await page.waitForSelector('[data-crw="read"]');
  await page.click('[data-action="crwoffice"]');
  await page.click('[data-action="crwfilt"][data-f="2"]');
  ok('crew 2 has its own notice', (await page.locator('.crw-item').count()) === 1 && /Crew 2/.test(await page.textContent('.crw-item')));
  await page.click('[data-action="crwfilt"][data-f="all"]');
  ok('both crews listed together', (await page.locator('.crw-item').count()) === 2);

  await page.click('[data-action="crwboard"]');
  await page.setInputFiles('input[data-action="crwfile"]:not([capture])', path.join(shotDir, 'not-an-image.txt'));
  await page.waitForSelector('#crw-status[data-ocr="failed"]');
  ok('non-image is an error and is not saved', /not an image/.test(await page.textContent('#crw-status')) && (await page.evaluate(() => JSON.parse(localStorage.getItem('vatc.crewNotices.v1')).length)) === 2);
  await page.evaluate(() => { window.Tesseract = { recognize: async () => { throw new Error('bad image'); } }; });
  await page.setInputFiles('input[data-action="crwfile"]:not([capture])', badPng);
  await page.waitForSelector('#crw-status[data-ocr="failed"]');
  ok('broken image is marked pending and does not throw', /OCR is pending/.test(await page.textContent('#crw-status')));
  await page.click('[data-action="crwcancel"]');

  const sw = await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0));
  ok('no service worker registered', sw === 0);
  await mobile.setOffline(true);
  await page.click('#vatc [data-action="tab"][data-t="crew"]');
  ok('open session still shows local notices while offline', /Crew 1|Crew 2|Training office|Crew notices/.test(await page.textContent('#vatc')));
  const offlinePage = await mobile.newPage();
  let navFailed = false;
  try { await offlinePage.goto(url, { timeout: 8000 }); } catch (e) { navFailed = true; }
  ok('without a service worker a fresh load does not come from cache', navFailed);
  await offlinePage.close();
  await mobile.setOffline(false);
  await page.reload();
  await page.click('#vatc [data-action="tab"][data-t="crew"]');
  await page.click('[data-action="crwoffice"]');
  ok('records survive reload', (await page.locator('.crw-item').count()) === 2);

  const devPromise = page.waitForEvent('download');
  await page.click('[data-action="device"]');
  await page.waitForSelector('[data-action="exportbackup"]');
  await page.click('[data-action="exportbackup"]');
  const devDl = await devPromise;
  const devPath = path.join(shotDir, 'device-backup.json');
  await devDl.saveAs(devPath);
  const device = JSON.parse(fs.readFileSync(devPath, 'utf8'));
  const crewRows = device.keys && device.keys['vatc.crewNotices.v1'];
  ok('device backup includes crew text and photo bytes or it is not complete', device.format === 'vector-atc-backup' && Array.isArray(crewRows) && crewRows.length === 2 && device.crewPhotos && device.crewPhotos.bridge === 'vector-atc-crew-photos' && device.crewPhotos.notOfficialSource === true && crewRows.every(r => typeof device.crewPhotos.photos[r.id] === 'string' && r.thumb === true && (r.crew === '1' || r.crew === '2')));
  await page.click('[data-action="deviceclose"]');

  const dlPromise = page.waitForEvent('download');
  await page.click('[data-action="crwexport"]');
  const dl = await dlPromise;
  const dlPath = path.join(shotDir, 'backup.json');
  await dl.saveAs(dlPath);
  const backup = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
  ok('export is a labeled crew file with photos', backup.vectorAtcCrewBackup === 1 && backup.notDeviceBackup === true && backup.photosComplete === true && backup.records.length === 2 && /Training aid only/.test(backup.warning) && /not the full device backup/.test(backup.warning) && backup.thumbs && Object.keys(backup.thumbs).length >= 1 && !JSON.stringify(backup.records).includes('Demo Controller') && backup.records.every(r => r.crew === '1' || r.crew === '2'));
  await page.evaluate(() => localStorage.removeItem('vatc.crewNotices.v1'));
  await page.click('[data-action="crwboard"]');
  await page.click('[data-action="crwoffice"]');
  await page.setInputFiles('input[data-action="crwrestore"]', dlPath);
  await page.waitForFunction(() => /Restored 2 notices/.test(document.body.textContent || ''));
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('vatc.crewNotices.v1')));
  const restoredText = restored.map(r => r.reviewedText).join('\n');
  ok('restore keeps reviewed text and crew identity', /Restored 2 notices/.test(await page.textContent('.crw-msg')) && /Reviewed text was kept/.test(await page.textContent('.crw-msg')) && restored.length === 2 && restored.every(r => r.crew === '1' || r.crew === '2') && /NOT A NOTICE/.test(restoredText) && /EXAMPLE CREW B ONLY/.test(restoredText));

  await page.click('[data-action="crwall"]');
  await page.click('[data-action="crwdel"]');
  ok('delete asks before removing', /Delete 2 local notices/.test(await page.textContent('.crw-ask')));
  await page.click('[data-action="crwaskno"]');
  ok('cancel leaves the notices', (await page.evaluate(() => JSON.parse(localStorage.getItem('vatc.crewNotices.v1')).length)) === 2);
  await page.click('[data-action="crwdel"]');
  await page.click('[data-action="crwdelgo"]');
  ok('deleting every notice asks a second time', /Delete every local crew notice/.test(await page.textContent('.crw-ask')));
  await page.click('[data-action="crwdelallgo"]');
  await page.waitForFunction(() => /Deleted 2 local notices/.test(document.body.textContent || ''));
  const left = await page.evaluate(async () => {
    const n = JSON.parse(localStorage.getItem('vatc.crewNotices.v1') || '[]').length;
    const db = await new Promise((res, rej) => { const r = indexedDB.open('vatcCrewLocal', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const keys = await new Promise(res => { const rq = db.transaction('thumbs').objectStore('thumbs').getAllKeys(); rq.onsuccess = () => res(rq.result || []); });
    return { n, keys: keys.length };
  });
  ok('select-all delete clears local text and photos', left.n === 0 && left.keys === 0 && /Deleted 2/.test(await page.textContent('.crw-msg')));

  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const deskPage = await desk.newPage();
  const derr = [];
  deskPage.on('pageerror', e => derr.push(String(e)));
  await deskPage.addInitScript(() => { window.Tesseract = { recognize: async () => ({ data: { text: 'EXAMPLE DESKTOP' } }) }; });
  await deskPage.goto(url);
  await deskPage.click('#vatc [data-action="tab"][data-t="crew"]');
  await deskPage.selectOption('#crw-shift', 'mid');
  await deskPage.fill('#crw-date', '2099-03-03');
  await deskPage.fill('#crw-src', 'EXAMPLE desktop');
  await deskPage.setInputFiles('input[data-action="crwfile"]:not([capture])', png);
  await deskPage.waitForSelector('#crw-status[data-ocr="read"]');
  await deskPage.screenshot({ path: path.join(shotDir, 'review-desktop.png') });
  ok('desktop review layout is present', /Review before save/.test(await deskPage.textContent('[data-crw="review"]')));
  await desk.close();

  const real = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const realPage = await real.newPage();
  const rerr = [];
  realPage.on('pageerror', e => rerr.push(String(e)));
  await realPage.goto(url);
  await realPage.click('#vatc [data-action="tab"][data-t="crew"]');
  await realPage.setInputFiles('input[data-action="crwfile"]:not([capture])', png);
  try {
    await realPage.waitForFunction(() => {
      const s = document.querySelector('#crw-status');
      return s && ['read', 'empty', 'failed', 'pending'].includes(s.dataset.ocr);
    }, null, { timeout: 90000 });
    const ocr = await realPage.getAttribute('#crw-status', 'data-ocr');
    ok('on-device OCR finishes or is marked not read', ['read', 'empty', 'failed', 'pending'].includes(ocr), 'status=' + ocr);
    ok('real OCR path still blocks save', await realPage.locator('#crw-save').isDisabled());
  } catch (e) {
    ok('on-device OCR finishes or is marked not read', false, String(e).slice(0, 180));
  }
  await real.close();

  const off = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const offPage = await off.newPage();
  const oerr = [];
  const oreq = [];
  offPage.on('pageerror', e => oerr.push(String(e)));
  offPage.on('request', req => { if (/jsdelivr|tesseract/i.test(req.url())) oreq.push(req.url()); });
  await off.setOffline(true);
  let offNav = false;
  try { await offPage.goto(url, { timeout: 8000 }); } catch (e) { offNav = true; }
  ok('offline fresh load is not served without the shell', offNav);
  await off.setOffline(false);
  await offPage.goto(url);
  await offPage.click('#vatc [data-action="tab"][data-t="crew"]');
  await off.setOffline(true);
  await offPage.click('[data-action="crwnophoto"]');
  await offPage.waitForSelector('#crw-text');
  await offPage.fill('#crw-text', 'EXAMPLE typed while the text reader is unavailable');
  await offPage.check('#crw-ack');
  ok('offline review can be saved without the text reader', !(await offPage.locator('#crw-save').isDisabled()));
  await offPage.click('#crw-save');
  await offPage.waitForFunction(() => /Saved on this browser/.test(document.body.textContent || ''));
  const typed = await offPage.evaluate(() => JSON.parse(localStorage.getItem('vatc.crewNotices.v1')).find(r => /typed while/.test(r.reviewedText || '')));
  ok('offline typed notice is stored as pending training text', !!(typed && typed.ocrStatus === 'pending' && typed.authoritative === false && typed.crew === '1' && oreq.length === 0 && oerr.length === 0));
  await off.close();

  ok('no uncaught errors on the mobile session', errs.length === 0, errs.join(' | '));
  ok('no uncaught errors on desktop', derr.length === 0, derr.join(' | '));
  ok('no uncaught errors on the OCR attempt', rerr.length === 0, rerr.join(' | '));
  ok('no upload of crew photos or text', posts.length === 0, posts.join(' | '));

  console.log(pass.every(Boolean) ? 'BROWSER ALL PASS' : 'BROWSER SOME FAIL');
  await browser.close();
  server.close();
  if (!pass.every(Boolean)) process.exit(1);
}

extraUnits().then(() => {
  if (process.argv.includes('--browser')) return browserChecks();
}).catch(err => { console.error(err); process.exit(1); });
