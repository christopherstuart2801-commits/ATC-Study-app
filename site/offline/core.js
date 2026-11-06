/* VECTOR ATC offline routing. Classic script: service worker importScripts and node require.
   URLs are resolved against the service worker scope, so GitHub Pages /ATC-Study-app/ and a
   site-root host both work. This file does not touch localStorage. */
(function (root) {
  'use strict';

  function scopeBase(scope) {
    var u = new URL(String(scope || '/'), 'https://example.invalid/');
    if (!u.pathname.endsWith('/')) u.pathname += '/';
    return u;
  }

  function locate(scope, url) {
    var base = scopeBase(scope);
    var u;
    try { u = new URL(url, base); } catch (e) { return { where: 'ignore' }; }
    if (u.origin !== base.origin) return { where: 'ignore' };
    if (u.username || u.password) return { where: 'passthrough' };
    if (u.pathname !== base.pathname && u.pathname.indexOf(base.pathname) !== 0) return { where: 'ignore' };
    var rel = u.pathname.slice(base.pathname.length);
    try { rel = decodeURIComponent(rel); } catch (e2) { return { where: 'passthrough' }; }
    if (rel.indexOf('\\') >= 0 || rel.split('/').indexOf('..') >= 0) return { where: 'passthrough' };
    u.hash = '';
    u.search = '';
    return { where: 'in', rel: rel, href: u.href };
  }

  function headerGet(headers, name) {
    if (!headers) return null;
    if (typeof headers.get === 'function') return headers.get(name);
    var v = headers[name];
    if (v == null) v = headers[String(name).toLowerCase()];
    return v == null ? null : String(v);
  }

  function listHas(list, rel) {
    if (!list || !list.length) return false;
    return list.indexOf(rel) >= 0;
  }

  function classify(scope, manifest, req) {
    req = req || {};
    var method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET') return 'ignore';
    if (headerGet(req.headers, 'x-vatc-net') === '1') return 'passthrough';
    if (req.cache === 'reload' || req.cache === 'no-store') return 'passthrough';
    var loc = locate(scope, req.url || '');
    if (loc.where !== 'in') return loc.where;
    var rel = loc.rel;
    var lower = rel.toLowerCase();
    if (lower === 'sw.js' || lower.indexOf('sw.js?') === 0) return 'passthrough';
    if (/^api\//.test(lower) || lower.indexOf('/api/') >= 0 || lower.indexOf('supabase') >= 0) return 'passthrough';
    if (lower.indexOf('__vatc/') === 0) return 'passthrough';
    var mode = req.mode || '';
    var dest = req.destination || '';
    var shellNav = mode === 'navigate' && (dest === '' || dest === 'document') && (rel === '' || rel === 'index.html');
    if (shellNav) return 'navigate';
    if (listHas(manifest && manifest.precache, rel)) return 'precache';
    if (listHas(manifest && manifest.lazy, rel)) return 'lazy';
    return 'passthrough';
  }

  function canonical(scope, rel) {
    return new URL(String(rel || '').replace(/^\//, ''), scopeBase(scope)).href;
  }

  function isCacheable(res) {
    if (!res || res.status !== 200 || res.ok === false) return false;
    var t = res.type || 'default';
    return t === 'basic' || t === 'default';
  }

  function textResponse(status, message) {
    return new Response(String(message || ''), {
      status: status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  function parseByteRange(header, size) {
    var m = /^bytes=(\d*)-(\d*)$/i.exec(String(header || '').trim());
    if (!m || (m[1] === '' && m[2] === '')) return null;
    var start;
    var end;
    if (m[1] === '') {
      var suffix = parseInt(m[2], 10);
      if (!suffix || suffix < 0) return { unsatisfiable: true, size: size };
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === '' ? size - 1 : parseInt(m[2], 10);
    }
    if (!isFinite(start) || !isFinite(end) || start < 0 || start >= size || end < start) {
      return { unsatisfiable: true, size: size };
    }
    return { start: start, end: Math.min(end, size - 1), size: size };
  }

  async function rangeFromResponse(res, rangeHeader) {
    var buf = await res.arrayBuffer();
    var parsed = parseByteRange(rangeHeader, buf.byteLength);
    if (!parsed) {
      return new Response(buf, { status: 200, headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(buf.byteLength) } });
    }
    if (parsed.unsatisfiable) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + buf.byteLength } });
    }
    var slice = buf.slice(parsed.start, parsed.end + 1);
    var headers = new Headers();
    var ct = res.headers && res.headers.get && res.headers.get('Content-Type');
    headers.set('Content-Type', ct || 'application/octet-stream');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(slice.byteLength));
    headers.set('Content-Range', 'bytes ' + parsed.start + '-' + parsed.end + '/' + buf.byteLength);
    return new Response(slice, { status: 206, headers: headers });
  }

  async function cacheEntries(fetchImpl, cache, urls) {
    var ok = [];
    var failed = [];
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i];
      try {
        var res = await fetchImpl(url, { cache: 'reload', headers: { 'X-VATC-Net': '1' } });
        if (!isCacheable(res)) throw new Error('HTTP ' + (res && res.status));
        await cache.put(url, res.clone());
        ok.push(url);
      } catch (e) {
        failed.push({ url: url, error: String((e && e.message) || e) });
      }
    }
    return { ok: ok, failed: failed };
  }

  function shellInstallError(result) {
    if (!result || !result.failed || !result.failed.length) return null;
    return 'Shell cache incomplete: ' + result.failed.map(function (f) { return f.url + ' (' + f.error + ')'; }).join('; ');
  }

  function cachesToDelete(names, keep) {
    var keepSet = {};
    (keep || []).forEach(function (n) { keepSet[n] = true; });
    return (names || []).filter(function (n) {
      return /^vatc-(shell|refs)-/.test(String(n)) && !keepSet[n];
    });
  }

  function cacheNames(version) {
    return { shell: 'vatc-shell-' + version, refs: 'vatc-refs-' + version };
  }

  function statusRel() { return '__vatc/ref-status.json'; }

  async function fetchShell(env) {
    var url = canonical(env.scope, 'index.html');
    try {
      var res = await env.fetch(url, { cache: 'reload', headers: { 'X-VATC-Net': '1' } });
      if (isCacheable(res)) {
        var cache = await env.caches.open(env.shellCache);
        await cache.put(url, res.clone());
        return res;
      }
    } catch (e) { /* offline or failed revalidation: fall through to the saved shell */ }
    var opened = await env.caches.open(env.shellCache);
    var hit = await opened.match(url);
    if (hit) return hit;
    return textResponse(503, 'Offline, and this device does not have the VECTOR ATC shell yet. Open the site once while online.');
  }

  async function fromCache(env, cacheName, href, rangeHeader) {
    var cache = await env.caches.open(cacheName);
    var hit = await cache.match(href);
    if (!hit) return null;
    if (rangeHeader) return rangeFromResponse(hit, rangeHeader);
    return hit;
  }

  async function fetchAsset(env, cacheName, href, request, info) {
    var rangeHeader = headerGet(info.headers, 'range');
    var hit = await fromCache(env, cacheName, href, rangeHeader);
    if (hit) return hit;
    try {
      var res = await env.fetch(request || href, { cache: 'reload', headers: { 'X-VATC-Net': '1' } });
      if (isCacheable(res)) {
        var cache = await env.caches.open(cacheName);
        await cache.put(href, res.clone());
        return res;
      }
      if (res) return res;
    } catch (e) { /* network unavailable */ }
    return textResponse(503, 'This file is not saved on this device, and the network is unavailable.');
  }

  async function fetchLazy(env, request, info) {
    var loc = locate(env.scope, info.url);
    var href = loc.href;
    var rangeHeader = headerGet(info.headers, 'range');
    var hit = await fromCache(env, env.refCache, href, rangeHeader);
    if (hit) return hit;
    if (rangeHeader && env.scheduleFullCache) env.scheduleFullCache(href);
    if (rangeHeader) {
      try {
        var ranged = await env.fetch(request);
        if (ranged) return ranged;
      } catch (e) { /* offline */ }
      return textResponse(503, 'This publication is not saved on this device, and the network is unavailable.');
    }
    return fetchAsset(env, env.refCache, href, href, info);
  }

  async function handleFetch(env, request, info) {
    info = info || request || {};
    var kind = classify(env.scope, env.manifest, info);
    if (kind === 'ignore' || kind === 'passthrough') return null;
    if (kind === 'navigate') return fetchShell(env);
    var loc = locate(env.scope, info.url);
    if (kind === 'precache') return fetchAsset(env, env.shellCache, loc.href, request, info);
    if (kind === 'lazy') return fetchLazy(env, request, info);
    return null;
  }

  var api = {
    scopeBase: scopeBase,
    locate: locate,
    classify: classify,
    canonical: canonical,
    isCacheable: isCacheable,
    textResponse: textResponse,
    parseByteRange: parseByteRange,
    rangeFromResponse: rangeFromResponse,
    cacheEntries: cacheEntries,
    shellInstallError: shellInstallError,
    cachesToDelete: cachesToDelete,
    cacheNames: cacheNames,
    statusRel: statusRel,
    handleFetch: handleFetch
  };
  root.VATC_OFFLINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
