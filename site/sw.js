/* VECTOR ATC service worker. Scope is the directory of this file (GitHub Pages includes /ATC-Study-app/).
   Precaches the enumerated shell. Publication PDFs are cached from the enumerated lazy list.
   Does not read or write the saved study profile. Does not cache other websites. */
importScripts('offline/core.js', 'offline/manifest.js');

var MANIFEST = self.VATC_MANIFEST;
var NAMES = self.VATC_OFFLINE.cacheNames(MANIFEST.version);
var SHELL = NAMES.shell;
var REFS = NAMES.refs;
var refJob = null;

function abs(rel) {
  return new URL(rel, self.registration.scope).href;
}

function broadcast(msg) {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    list.forEach(function (c) { c.postMessage(msg); });
  }).catch(function () {});
}

function makeEnv() {
  return {
    scope: self.registration.scope,
    manifest: MANIFEST,
    caches: caches,
    fetch: function (input, init) { return fetch(input, init); },
    shellCache: SHELL,
    refCache: REFS,
    scheduleFullCache: function (href) { scheduleFull(href); }
  };
}

function scheduleFull(href) {
  caches.open(REFS).then(function (cache) {
    return cache.match(href).then(function (hit) {
      if (hit) return null;
      return fetch(href, { cache: 'reload', headers: { 'X-VATC-Net': '1' } }).then(function (res) {
        if (!self.VATC_OFFLINE.isCacheable(res)) return null;
        return cache.put(href, res);
      });
    });
  }).catch(function () {});
}

function cacheRefs() {
  if (refJob) return refJob;
  refJob = (async function () {
    var cache = await caches.open(REFS);
    var urls = (MANIFEST.lazy || []).map(abs);
    var ok = [];
    var failed = [];
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i];
      try {
        var existing = await cache.match(url);
        if (!existing) {
          var res = await fetch(url, { cache: 'reload', headers: { 'X-VATC-Net': '1' } });
          if (!self.VATC_OFFLINE.isCacheable(res)) throw new Error('HTTP ' + res.status);
          await cache.put(url, res);
        }
        ok.push(url);
      } catch (e) {
        failed.push({ url: url, error: String((e && e.message) || e) });
      }
      broadcast({ type: 'REF_PROGRESS', cached: ok.length, failed: failed, total: urls.length });
    }
    var body = JSON.stringify({ cached: ok.length, failed: failed, total: urls.length, running: false, at: Date.now() });
    await cache.put(abs(self.VATC_OFFLINE.statusRel()), new Response(body, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    }));
    broadcast({ type: 'REF_DONE', cached: ok.length, failed: failed, total: urls.length });
    return { cached: ok.length, failed: failed, total: urls.length };
  })().finally(function () { refJob = null; });
  return refJob;
}

async function readStatus() {
  var shell = await caches.open(SHELL);
  var shellReady = !!(await shell.match(abs('index.html')));
  var refs = await caches.open(REFS);
  var status = { cached: 0, failed: [], total: (MANIFEST.lazy || []).length, running: !!refJob };
  var hit = await refs.match(abs(self.VATC_OFFLINE.statusRel()));
  if (hit) {
    try {
      var parsed = await hit.json();
      status.cached = parsed.cached || 0;
      status.failed = parsed.failed || [];
    } catch (e) { /* ignore a broken status record */ }
  }
  status.running = !!refJob;
  status.total = (MANIFEST.lazy || []).length;
  return { type: 'STATUS', version: MANIFEST.version, shellReady: shellReady, refs: status };
}

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    var cache = await caches.open(SHELL);
    var urls = (MANIFEST.precache || []).map(abs);
    var result = await self.VATC_OFFLINE.cacheEntries(function (url, init) {
      return fetch(url, init);
    }, cache, urls);
    var err = self.VATC_OFFLINE.shellInstallError(result);
    if (err) {
      await caches.delete(SHELL);
      throw new Error(err);
    }
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var names = await caches.keys();
    var drop = self.VATC_OFFLINE.cachesToDelete(names, [SHELL, REFS]);
    await Promise.all(drop.map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CACHE_REFS') {
    event.waitUntil(cacheRefs().then(function (result) {
      if (event.ports && event.ports[0]) event.ports[0].postMessage(result);
    }));
    return;
  }
  if (data.type === 'STATUS') {
    event.waitUntil(readStatus().then(function (status) {
      if (event.ports && event.ports[0]) event.ports[0].postMessage(status);
    }));
  }
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var info = {
    url: req.url,
    method: req.method,
    mode: req.mode,
    destination: req.destination,
    cache: req.cache,
    headers: req.headers
  };
  var kind = self.VATC_OFFLINE.classify(self.registration.scope, MANIFEST, info);
  if (kind === 'ignore' || kind === 'passthrough') return;
  event.respondWith(self.VATC_OFFLINE.handleFetch(makeEnv(), req, info));
});
