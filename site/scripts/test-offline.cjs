#!/usr/bin/env node
/* Install, offline cache, device backup, and Head Guide checks. Study banks must stay byte-identical. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const site = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(site, 'sw.js'), 'utf8');
const client = fs.readFileSync(path.join(site, 'offline', 'client.js'), 'utf8');
const coreSrc = fs.readFileSync(path.join(site, 'offline', 'core.js'), 'utf8');
function loadClassic(rel) {
  const sandbox = { console, URL, Response, Request, Headers, fetch };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(site, rel), 'utf8'), sandbox, { filename: rel });
  return sandbox;
}
const guide = loadClassic('offline/head-guide.js').VATC_HEAD_GUIDE;
const backup = loadClassic('offline/backup.js').VATC_BACKUP;
const offline = loadClassic('offline/core.js').VATC_OFFLINE;
const { enumerate, VERSION } = require(path.join(site, 'scripts', 'build-offline-manifest.cjs'));

let fails = 0;
function ok(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else { fails++; console.log('FAIL', name, extra || ''); }
}
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

const built = enumerate();
const sandbox = { self: {} };
vm.runInNewContext(fs.readFileSync(path.join(site, 'offline', 'manifest.js'), 'utf8'), sandbox);
const manifest = sandbox.self.VATC_MANIFEST;

ok('manifest version matches builder', manifest.version === VERSION && manifest.version === '0.8.37');
ok('committed manifest matches enumeration', JSON.stringify(manifest) === JSON.stringify(built));
ok('precache is an explicit list', Array.isArray(manifest.precache) && manifest.precache.every(p => typeof p === 'string' && !/[*?]/.test(p)));
ok('lazy list is explicit pdfs only', manifest.lazy.length === 25 && manifest.lazy.every(p => p.startsWith('docs/') && p.endsWith('.pdf') && !/[*?]/.test(p)));
ok('shell includes guide, pdf.js, and study data',
  ['index.html', 'manifest.webmanifest', 'offline/head-guide.js', 'offline/client.js', 'offline/backup.js', 'offline/core.js', 'data/para-index.json', 'data/ask-aliases.json', 'vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'].every(p => manifest.precache.includes(p)));
ok('lazy list includes JO and a plate', manifest.lazy.includes('docs/JO-7110.65BB.pdf') && manifest.lazy.includes('docs/flip/KNFG-AIRPORT-DIAGRAM.pdf'));
ok('notes and scripts are not cached', !manifest.precache.concat(manifest.lazy).some(p => /\.(md|txt|cjs)$/.test(p) || p.includes('NOTES')));
ok('no external or api urls in the manifest', manifest.precache.concat(manifest.lazy).every(p => !/^https?:/i.test(p) && !/supabase|\/api\//i.test(p)));
manifest.precache.concat(manifest.lazy).forEach(p => {
  ok('file exists ' + p, fs.existsSync(path.join(site, p)));
});

const web = JSON.parse(fs.readFileSync(path.join(site, 'manifest.webmanifest'), 'utf8'));
ok('web manifest is installable', web.name === 'VECTOR ATC' && web.display === 'standalone' && web.start_url === './index.html' && web.scope === './');
ok('web manifest does not claim a store or DoD approval', /not an app-store/i.test(web.description) && /not a Department of Defense approval/i.test(web.description));
ok('icons are png and sized', ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'].every(rel => {
  const buf = fs.readFileSync(path.join(site, rel));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const want = rel.includes('192') ? 192 : rel.includes('180') || rel.includes('apple') ? 180 : 512;
  return buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a' && w === want && h === want;
}));
ok('manifest lists 192 and 512 icons', web.icons.some(i => i.sizes === '192x192' && i.purpose === 'any') && web.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'));

const scope = 'https://crew.github.io/ATC-Study-app/';
function req(url, extra) { return Object.assign({ url, method: 'GET', mode: '', destination: '', headers: { get: () => null } }, extra || {}); }
ok('pages subpath navigation is the shell', offline.classify(scope, manifest, req(scope, { mode: 'navigate', destination: 'document' })) === 'navigate');
ok('pages index navigation is the shell', offline.classify(scope, manifest, req(scope + 'index.html', { mode: 'navigate', destination: 'document' })) === 'navigate');
ok('pdf navigation is not the shell', offline.classify(scope, manifest, req(scope + 'docs/JO-7110.65BB.pdf', { mode: 'navigate', destination: 'document' })) === 'lazy');
ok('iframe pdf is not the shell', offline.classify(scope, manifest, req(scope + 'docs/flip/KNFG-AIRPORT-DIAGRAM.pdf', { mode: 'navigate', destination: 'iframe' })) === 'lazy');
ok('worker is precached', offline.classify(scope, manifest, req(scope + 'vendor/pdfjs/pdf.worker.min.js', { destination: 'worker' })) === 'precache');
ok('cdn is ignored', offline.classify(scope, manifest, req('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')) === 'ignore');
ok('fonts are ignored', offline.classify(scope, manifest, req('https://fonts.googleapis.com/css2?family=Oswald')) === 'ignore');
ok('outside the project path is ignored', offline.classify(scope, manifest, req('https://crew.github.io/docs/JO-7110.65BB.pdf')) === 'ignore');
ok('notes are not cached', offline.classify(scope, manifest, req(scope + 'docs/NATOPS-VECTOR-ATC-one-pager.md')) === 'passthrough');
ok('api is not cached', offline.classify(scope, manifest, req(scope + 'api/progress')) === 'passthrough');
ok('supabase path is not cached', offline.classify(scope, manifest, req(scope + 'supabase/auth')) === 'passthrough');
ok('reload bypasses the cache', offline.classify(scope, manifest, req(scope + 'index.html', { cache: 'reload' })) === 'passthrough');
ok('network header bypasses the cache', offline.classify(scope, manifest, req(scope + 'index.html', { headers: { get: (n) => n === 'x-vatc-net' ? '1' : null } })) === 'passthrough');
ok('canonical url keeps the project prefix', offline.canonical(scope, 'docs/JO-7110.65BB.pdf') === scope + 'docs/JO-7110.65BB.pdf');

function memCaches() {
  const stores = new Map();
  return {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const box = stores.get(name);
      return {
        async put(url, res) { box.set(String(url), res); },
        async match(url) { const hit = box.get(String(url)); return hit ? hit.clone() : undefined; }
      };
    }
  };
}
function envFor(fetchImpl, caches) {
  const names = offline.cacheNames(manifest.version);
  return {
    scope, manifest, caches, fetch: fetchImpl, shellCache: names.shell, refCache: names.refs,
    scheduleFullCache: () => {}
  };
}

(async () => {
  const caches = memCaches();
  const shellUrl = scope + 'index.html';
  const shell = new Response('<!DOCTYPE html><title>VECTOR ATC</title>', { status: 200, headers: { 'Content-Type': 'text/html' } });
  const shellCache = await caches.open(offline.cacheNames(manifest.version).shell);
  await shellCache.put(shellUrl, shell);
  const offlineEnv = envFor(async () => { throw new Error('offline'); }, caches);
  const nav = await offline.handleFetch(offlineEnv, { url: scope, method: 'GET' }, req(scope, { mode: 'navigate', destination: 'document' }));
  ok('offline reload serves the shell', nav && nav.status === 200 && (await nav.text()).includes('VECTOR ATC'));

  const pdfUrl = scope + 'docs/flip/KNFG-AIRPORT-DIAGRAM.pdf';
  const missed = await offline.handleFetch(offlineEnv, { url: pdfUrl, method: 'GET' }, req(pdfUrl));
  const missedText = await missed.text();
  const missedType = missed.headers.get('Content-Type') || '';
  ok('missing pdf offline is not HTML', missed.status === 503 && !/<!DOCTYPE|<html/i.test(missedText) && missedType.indexOf('text/html') < 0, missedType + ' ' + missedText.slice(0, 80));

  const pdfBody = '%PDF-1.7\nplate';
  const refCache = await caches.open(offline.cacheNames(manifest.version).refs);
  await refCache.put(pdfUrl, new Response(pdfBody, { status: 200, headers: { 'Content-Type': 'application/pdf' } }));
  const ranged = await offline.handleFetch(offlineEnv, { url: pdfUrl, method: 'GET' }, req(pdfUrl, { headers: { get: (n) => n === 'range' ? 'bytes=0-4' : null } }));
  const rangedBuf = Buffer.from(await ranged.arrayBuffer());
  ok('cached pdf serves a range', ranged.status === 206 && ranged.headers.get('Content-Range') === 'bytes 0-4/' + pdfBody.length && rangedBuf.toString() === '%PDF-', ranged.status + ' ' + rangedBuf.toString());

  let scheduled = null;
  let networkHits = 0;
  const partialEnv = envFor(async (input) => {
    networkHits++;
    const url = typeof input === 'string' ? input : input.url;
    if (String(url).includes('Range-probe') || (input && input.headers && input.headers.get && input.headers.get('range'))) {
      return new Response('PART', { status: 206, headers: { 'Content-Type': 'application/pdf' } });
    }
    return new Response('no', { status: 404 });
  }, caches);
  partialEnv.scheduleFullCache = (href) => { scheduled = href; };
  const freshPdf = scope + 'docs/AIM-2025-02-20.pdf';
  const partial = await offline.handleFetch(partialEnv, new Request(freshPdf, { headers: { Range: 'bytes=0-3' } }), req(freshPdf, { headers: { get: (n) => n === 'range' ? 'bytes=0-3' : null } }));
  ok('uncached range is not stored as a partial and not replaced with HTML', partial.status === 206 && scheduled === freshPdf && (await partial.text()) === 'PART');

  const fetched = new Map();
  const result = await offline.cacheEntries(async (url) => {
    fetched.set(url, (fetched.get(url) || 0) + 1);
    if (String(url).endsWith('missing.js')) return new Response('no', { status: 404 });
    return new Response('ok:' + url, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }, { async put(url, res) { fetched.set('put:' + url, await res.text()); } }, [scope + 'a.js', scope + 'missing.js', scope + 'b.js']);
  ok('one cache failure is reported and the others are kept', result.ok.length === 2 && result.failed.length === 1 && /HTTP 404/.test(result.failed[0].error));
  ok('shell install aborts when any shell entry fails', !!offline.shellInstallError(result) && offline.shellInstallError({ ok: ['a'], failed: [] }) === null);

  const names = offline.cacheNames('0.8.37');
  const drop = offline.cachesToDelete(['vatc-shell-0.8.36', 'vatc-refs-0.8.36', names.shell, names.refs, 'other-cache'], [names.shell, names.refs]);
  ok('version upgrade deletes only old VECTOR caches', drop.length === 2 && drop.includes('vatc-shell-0.8.36') && drop.includes('vatc-refs-0.8.36') && !drop.includes('other-cache'));

  ok('service worker does not touch storage or skip waiting on install', !/localStorage\s*\.|indexedDB\s*\.|caches\.addAll|supabase/i.test(sw) && sw.indexOf('skipWaiting') === sw.lastIndexOf('skipWaiting') && /SKIP_WAITING/.test(sw.slice(0, sw.indexOf('skipWaiting'))));
  ok('service worker imports the enumerated manifest', /importScripts\('offline\/core\.js', 'offline\/manifest\.js'\)/.test(sw));
  ok('client update does not clear storage', !/localStorage\.clear|removeItem\('vatc/.test(client) && /Progress on this device stays/.test(client));
  ok('client registers the worker and install prompt', /serviceWorker\.register\('sw\.js'\)/.test(client) && /beforeinstallprompt/.test(client));

  function memStorage(initial) {
    const m = new Map(Object.entries(initial || {}));
    return {
      get length() { return m.size; },
      key(i) { return [...m.keys()][i] || null; },
      getItem(k) { return m.has(k) ? m.get(k) : null; },
      setItem(k, v) { m.set(String(k), String(v)); },
      removeItem(k) { m.delete(k); }
    };
  }
  const sample = {
    'vatc.trainee': JSON.stringify({ name: 'Ada Lovelace', initials: 'AL' }),
    'vatc.studymarks': JSON.stringify({ '7110.65 2-1-7': { hl: ['special handling'], ul: [] } }),
    'vatc.rfcChk': JSON.stringify({ 'topic:cd:1': true }),
    'vatc.lessonsDone': JSON.stringify({ 'les-1': true }),
    'vatc.fcStats': JSON.stringify({ poggi: { status: 'KNOWN', times_correct: 2, times_missed: 0, last_seen: 5, mc_ok: true, written_ok: true } }),
    'vatc.fcRated': JSON.stringify({ old: { status: 'KNOWN' } }),
    'vatc.tests.v1': JSON.stringify({ 'cd:1:lqs': { best: 80, last: 70, date: '2026-11-01' } }),
    'vatc.mySets.v1': JSON.stringify([{ id: 's1', name: 'Pads', t: 1, cards: [{ id: 'c1', q: 'Front', a: 'Back' }] }]),
    'vatc.pkOpen.v1': JSON.stringify({ quick: true, 'home:tower': false }),
    'vatc.futureFlag': JSON.stringify({ keep: true }),
    'vector_progress_ver': '2026-10-21',
    'unrelated': 'leave me'
  };
  const builtBackup = backup.build(sample, { appVersion: '0.8.37', exportedAt: '2026-11-06T00:00:00.000Z', progressVer: '2026-10-21' });
  ok('export keeps every vatc value and the plain progress stamp', builtBackup.ok && builtBackup.backup.keys['vatc.futureFlag'].keep === true && builtBackup.backup.keys['vatc.trainee'].initials === 'AL' && !builtBackup.backup.keys.unrelated, builtBackup.errors && builtBackup.errors.join(';'));
  const round = memStorage({ 'vatc.fcStats': '{"gone":{"status":"NEW"}}', 'vector_progress_ver': '1999-01-01' });
  const applied = backup.apply(round, builtBackup.backup, { progressVer: '2026-10-21' });
  ok('import replaces study data and keeps the current progress stamp', applied.ok && JSON.parse(round.getItem('vatc.mySets.v1'))[0].name === 'Pads' && round.getItem('vector_progress_ver') === '2026-10-21' && round.getItem('vatc.fcStats').indexOf('gone') < 0, applied.error || '');
  ok('import does not touch unrelated keys', round.getItem('unrelated') == null);

  const badStore = memStorage(sample);
  let badWrites = 0;
  const realSet = badStore.setItem.bind(badStore);
  badStore.setItem = (k, v) => { badWrites++; realSet(k, v); };
  const bad = backup.parse('{"format":"nope"}');
  const badApply = backup.apply(badStore, { format: 'nope' }, { progressVer: '2026-10-21' });
  ok('invalid backup does not write', !bad.ok && !badApply.ok && badWrites === 0 && badStore.getItem('vatc.trainee') === sample['vatc.trainee']);

  const poison = backup.parse('{"format":"' + backup.FORMAT + '","formatVersion":1,"keys":{"__proto__":{"admin":true}}}');
  ok('prototype key is rejected', !poison.ok);

  const throwing = memStorage({ 'vatc.trainee': sample['vatc.trainee'], 'vatc.fcStats': sample['vatc.fcStats'] });
  let sets = 0;
  const orig = throwing.setItem.bind(throwing);
  throwing.setItem = (k, v) => { sets++; if (sets === 2) throw new Error('disk full'); orig(k, v); };
  const failedApply = backup.apply(throwing, builtBackup.backup, { progressVer: '2026-10-21' });
  ok('failed import restores the previous profile', !failedApply.ok && throwing.getItem('vatc.trainee') === sample['vatc.trainee'] && throwing.getItem('vatc.fcStats') === sample['vatc.fcStats'], failedApply.error || '');

  const cleared = memStorage({ 'vatc.fcStats': sample['vatc.fcStats'], 'vector_progress_ver': '1999-01-01' });
  const emptyParsed = backup.parse(JSON.stringify({ format: backup.FORMAT, formatVersion: 1, keys: { 'vatc.pkOpen.v1': { quick: true } } }));
  const emptyApply = emptyParsed.ok ? backup.apply(cleared, emptyParsed.backup, { progressVer: '2026-10-21' }) : emptyParsed;
  ok('replace drops keys the backup does not contain', emptyApply.ok && cleared.getItem('vatc.fcStats') == null && JSON.parse(cleared.getItem('vatc.pkOpen.v1')).quick === true);

  ok('head guide is for a successor and needs no login', /no login/i.test(guide.lead) && guide.sections.some(s => s.id === 'chief' && s.badge === 'LATER'));
  const office = guide.sections.find(s => s.id === 'office');
  ok('office rosters, progress, tests, and reviews are labeled later', office && office.badge === 'LATER' && /Rosters — not enabled/.test(office.html) && /Office view of progress — not enabled/.test(office.html) && /Tests the office assigns or reviews — not enabled/.test(office.html) && /Reviews — not enabled/.test(office.html) && /On-device practice tests/.test(office.html));
  const pubs = guide.sections.find(s => s.id === 'pubs');
  ok('publication updater is planned and not claimed', pubs && pubs.badge === 'PLANNED' && /does not include that updater/.test(pubs.html) && /official-publication updater is planned/.test(pubs.html));
  ok('offline study and device backup are labeled now', guide.sections.find(s => s.id === 'offline').badge === 'NOW' && guide.sections.find(s => s.id === 'backup').badge === 'NOW' && /not cloud sync/.test(guide.sections.find(s => s.id === 'backup').html));
  const chief = guide.sections.find(s => s.id === 'chief').html;
  ok('chief code is outside the app and does not elevate', /one-time code issued outside this app/.test(chief) && /does not accept a chief code/.test(chief) && /cannot elevate access/.test(chief) && !/CHIEF_CODE|activationCode|adminPassword/.test(JSON.stringify(guide)));
  ok('guide has no network and no secret', !/fetch\(|XMLHttpRequest|supabase|mailto:/i.test(JSON.stringify(guide) + guide.feedbackDraft));
  const draft = guide.feedbackDraft('Radio check', { version: '0.8.37', online: false, sw: 'ready', shellReady: true, refs: { cached: 2, total: 25, failed: [] } });
  ok('feedback draft says it was not sent', /did not send it/.test(draft) && /Radio check/.test(draft) && /none on this version/.test(draft));
  ok('guide version matches the app', guide.version === VERSION);

  ok('page links the manifest and icons', /rel="manifest" href="manifest\.webmanifest"/.test(html) && /apple-touch-icon/.test(html) && /theme-color/.test(html));
  ok('page loads the guide and backup without a server', /src="offline\/head-guide\.js"/.test(html) && /src="offline\/backup\.js"/.test(html) && /src="offline\/client\.js"/.test(html));
  ok('page version is 0.8.37 and progress stamp is unchanged', /const APP_VER='0\.8\.37'/.test(html) && /PROGRESS_VER='2026-10-21'/.test(html));
  ok('guide and feedback routes are in the page', /data-action="guide"/.test(html) && /data-action="feedback"/.test(html) && /#guide/.test(html) && /#feedback/.test(html));
  ok('install guidance names Windows and iPhone without a store', /Add to Home Screen/.test(html) && /Install VECTOR ATC/.test(html) && /not an app-store download/.test(html) && /not a Department of Defense approval/.test(html));
  ok('import asks before replace', /Replace all study progress on this device with this backup/.test(html) && /Cancel leaves current progress unchanged/.test(html) && /VATC_BACKUP\.apply\(/.test(html));
  ok('page does not add supabase or clear storage on update', !/supabase/i.test(html) && !/localStorage\.clear/.test(html));
  ok('storage status separates saved files from the browser estimate',
    /function siteFilesLine/.test(html) && /Site files saved:/.test(html) && /App shell is not saved yet/.test(html) &&
    /Browser storage estimate:/.test(html) && /may exclude the cache/.test(html) && /does not mean the files above are missing/.test(html) &&
    !/About '\+fmtBytes/.test(html));

  function sliceBetween(a, b) {
    const i = html.indexOf(a);
    const j = html.indexOf(b, i + a.length);
    if (i < 0 || j < 0) return '';
    return html.slice(i, j);
  }
  const regions = {
    fc: [sliceBetween('const FC_SETS={', 'const QZ_DECKS={'), 'c4f43d3ddba877054ff5a726255ed64b3a6a7194cb5e922757873e0283fa45a5'],
    tower: [sliceBetween('/* TOWER_PAPER:BEGIN', '/* TOWER_PAPER:END */'), 'c79644e256e3c5a6fde33f6a46c4fbef7f7b955a2598d5241f3fda70f73a991c'],
    book: [(html.match(/^  const BOOK=.*$/m) || [])[0], 'ac0aa6baf6caa9784b637bdc13a2428afeffeb3b345daab9bdffb1045f39c6c4'],
    syl: [(html.match(/^  const SYLLABUS=.*$/m) || [])[0], '6b692f5fdf3a089789aacd47340b4daf2c17a571087b97f07acb9745384eb913'],
    plates: [(html.match(/^  const PLATES=.*$/m) || [])[0], '585eaa4e62d521cac1f0d751b375193b818c604b80371b7a6f2926bc032cafdc'],
    pubs: [(html.match(/const PUBS=\[[\s\S]*?\];/) || [])[0], '4488619a19f3244f9ef281005ff03c8445f86b2712466b06c53d0ca4a2ec7ab5'],
    reset: [(html.match(/const PROGRESS_VER_KEY[\s\S]*?oneTimeProgressReset\(\)\{[\s\S]*?\}\)\(\);/) || [])[0], 'bfa97648d0d69ffa6b58454a43b93168c7202191b987a693cc196f6e7ee677bd'],
    fcq: [(html.match(/\/\* FCQ:BEGIN[\s\S]*?\/\* FCQ:END \*\//) || [])[0], 'b2f47de2cbc25bc99325922d0886e6f8257512e651fb6b80d8aafe890c529112']
  };
  Object.keys(regions).forEach((name) => {
    ok('study region unchanged ' + name, sha(regions[name][0] || '') === regions[name][1], sha(regions[name][0] || ''));
  });
  ok('flashcard count unchanged', (html.match(/fcCard\(/g) || []).length === 1232);
  ok('para index unchanged', sha(fs.readFileSync(path.join(site, 'data', 'para-index.json'))) === '76b0dbe8410390a500c49f92b8347f81c04ba750ffa04de050db9e198d26fe32');
  ok('ask aliases unchanged', sha(fs.readFileSync(path.join(site, 'data', 'ask-aliases.json'))) === '180d77491114d0f84e9b2ae1300e4551fb773606fc4e41a77aa8cf839da9c4b9');

  const resetSrc = regions.reset[0];
  function runReset(storage) {
    const fn = new Function('localStorage', resetSrc);
    fn(storage);
  }
  const stale = memStorage({ 'vector_progress_ver': '1999-01-01', 'vatc.fcStats': sample['vatc.fcStats'], 'vatc.trainee': sample['vatc.trainee'], 'vatc.studymarks': sample['vatc.studymarks'] });
  runReset(stale);
  ok('old progress stamp still migrates by clearing checks and cards', stale.getItem('vector_progress_ver') === '2026-10-21' && stale.getItem('vatc.fcStats') == null && stale.getItem('vatc.trainee') === sample['vatc.trainee']);
  const current = memStorage({ 'vector_progress_ver': '2026-10-21', 'vatc.fcStats': sample['vatc.fcStats'], 'vatc.rfcChk': sample['vatc.rfcChk'] });
  runReset(current);
  ok('current progress stamp does not wipe study data', current.getItem('vatc.fcStats') === sample['vatc.fcStats'] && current.getItem('vatc.rfcChk') === sample['vatc.rfcChk']);
  const restored = memStorage({});
  backup.apply(restored, builtBackup.backup, { progressVer: '2026-10-21' });
  runReset(restored);
  ok('imported progress survives the migration check', restored.getItem('vatc.fcStats') === sample['vatc.fcStats'] && restored.getItem('vatc.rfcChk') === sample['vatc.rfcChk']);

  ok('core source has no wildcard cache', !/addAll\(\s*\[?\s*['`][^'`]+\*/.test(coreSrc) && !/\*\.\*/.test(coreSrc));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
