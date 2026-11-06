/* Page-side install, offline status, and backup actions. No network except the app's own service worker. */
(function (root) {
  'use strict';

  var state = {
    online: true,
    version: '',
    sw: 'unsupported',
    swError: '',
    shellReady: false,
    refs: { total: 0, cached: 0, failed: [], running: false },
    canInstall: false,
    installed: false,
    storage: null
  };
  var deferred = null;
  var wantsReload = false;
  var started = false;
  var onChange = function () {};

  function installedNow() {
    try {
      if (root.navigator && root.navigator.standalone) return true;
      return !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);
    } catch (e) { return false; }
  }

  function snapshot() {
    state.installed = installedNow();
    state.online = !(root.navigator && root.navigator.onLine === false);
    var refs = state.refs || {};
    return {
      online: state.online,
      version: state.version,
      sw: state.sw,
      swError: state.swError,
      shellReady: state.shellReady,
      refs: {
        total: refs.total || 0,
        cached: refs.cached || 0,
        failed: (refs.failed || []).slice(),
        running: !!refs.running
      },
      canInstall: !!state.canInstall,
      installed: !!state.installed,
      storage: state.storage ? { usage: state.storage.usage, quota: state.storage.quota, reported: !!state.storage.reported } : null
    };
  }

  function emit() {
    try { onChange(snapshot()); } catch (e) { /* the page paints on its own schedule */ }
  }

  function post(type) {
    return new Promise(function (resolve) {
      var sw = root.navigator && root.navigator.serviceWorker;
      var ctrl = sw && sw.controller;
      if (!ctrl) return resolve(null);
      try {
        var ch = new MessageChannel();
        var timer = setTimeout(function () { resolve(null); }, 8000);
        ch.port1.onmessage = function (ev) {
          clearTimeout(timer);
          resolve(ev.data || null);
        };
        ctrl.postMessage({ type: type }, [ch.port2]);
      } catch (e) { resolve(null); }
    });
  }

  function refreshEstimate() {
    var nav = root.navigator;
    if (!(nav && nav.storage && nav.storage.estimate)) {
      state.storage = { usage: null, quota: null, reported: false };
      emit();
      return Promise.resolve();
    }
    return nav.storage.estimate().then(function (est) {
      state.storage = {
        usage: est && typeof est.usage === 'number' ? est.usage : null,
        quota: est && typeof est.quota === 'number' ? est.quota : null,
        reported: true
      };
      emit();
    }).catch(function () {
      state.storage = { usage: null, quota: null, reported: false };
      emit();
    });
  }

  function applyStatus(data) {
    if (!data) return;
    if (data.version) state.version = state.version || data.version;
    state.shellReady = !!data.shellReady;
    if (data.refs) {
      state.refs = {
        total: data.refs.total || 0,
        cached: data.refs.cached || 0,
        failed: data.refs.failed || [],
        running: !!data.refs.running
      };
    }
    if (state.sw !== 'error') state.sw = 'ready';
    emit();
    if (state.shellReady && state.refs && !state.refs.running) refreshEstimate();
  }

  function refreshStatus() {
    return post('STATUS').then(applyStatus);
  }

  function kickRefs() {
    var sw = root.navigator && root.navigator.serviceWorker;
    var ctrl = sw && sw.controller;
    if (!ctrl) return Promise.resolve(null);
    state.refs.running = true;
    emit();
    try { ctrl.postMessage({ type: 'CACHE_REFS' }); } catch (e) { state.refs.running = false; emit(); }
    return Promise.resolve(null);
  }

  function showBanner() {
    if (root.document.getElementById('vatc-update')) return;
    var bar = root.document.createElement('div');
    bar.id = 'vatc-update';
    bar.innerHTML = '<p>A new version of VECTOR ATC is saved and ready. Reload to use it. Progress on this device stays. Nothing is erased.</p><p><button type="button" id="vatc-update-go">UPDATE</button><button type="button" id="vatc-update-later">LATER</button></p>';
    root.document.body.appendChild(bar);
    bar.querySelector('#vatc-update-go').onclick = function () { acceptUpdate(); };
    bar.querySelector('#vatc-update-later').onclick = function () { bar.remove(); };
  }

  function acceptUpdate() {
    var sw = root.navigator.serviceWorker;
    wantsReload = true;
    sw.getRegistration().then(function (reg) {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }).catch(function () {});
  }

  function watchRegistration(reg) {
    function arm(worker) {
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && root.navigator.serviceWorker.controller) showBanner();
        if (worker.state === 'installed' && !root.navigator.serviceWorker.controller) worker.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    if (reg.waiting && root.navigator.serviceWorker.controller) showBanner();
    if (reg.installing) arm(reg.installing);
    reg.addEventListener('updatefound', function () { arm(reg.installing); state.sw = 'installing'; emit(); });
  }

  function start(opts) {
    if (started) return snapshot();
    started = true;
    opts = opts || {};
    state.version = opts.version || state.version;
    if (typeof opts.onChange === 'function') onChange = opts.onChange;
    state.online = !(root.navigator && root.navigator.onLine === false);
    state.installed = installedNow();
    root.addEventListener('online', function () { state.online = true; emit(); refreshStatus(); });
    root.addEventListener('offline', function () { state.online = false; emit(); });
    root.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      state.canInstall = true;
      emit();
    });
    root.addEventListener('appinstalled', function () {
      deferred = null;
      state.canInstall = false;
      state.installed = true;
      emit();
    });
    refreshEstimate();
    if (!(root.navigator && root.navigator.serviceWorker)) {
      state.sw = 'unsupported';
      emit();
      return snapshot();
    }
    root.navigator.serviceWorker.addEventListener('message', function (ev) {
      var data = ev.data || {};
      if (data.type === 'REF_PROGRESS' || data.type === 'REF_DONE') {
        state.refs.cached = data.cached || 0;
        state.refs.total = data.total || state.refs.total;
        state.refs.running = data.type === 'REF_PROGRESS';
        if (data.failed) state.refs.failed = data.failed;
        emit();
        if (data.type === 'REF_DONE') { refreshStatus(); refreshEstimate(); }
      }
    });
    root.navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (wantsReload) { root.location.reload(); return; }
      state.sw = 'ready';
      refreshStatus();
      kickRefs();
    });
    root.navigator.serviceWorker.register('sw.js').then(function (reg) {
      state.sw = root.navigator.serviceWorker.controller ? 'ready' : 'installing';
      state.swError = '';
      emit();
      watchRegistration(reg);
      reg.update().catch(function () {});
      if (root.navigator.serviceWorker.controller) { refreshStatus(); kickRefs(); }
    }).catch(function (err) {
      state.sw = 'error';
      state.swError = String((err && err.message) || err);
      emit();
    });
    return snapshot();
  }

  function install() {
    if (!deferred) return Promise.resolve({ ok: false, reason: 'unavailable' });
    deferred.prompt();
    return deferred.userChoice.then(function (choice) {
      deferred = null;
      state.canInstall = false;
      emit();
      return { ok: !!(choice && choice.outcome === 'accepted') };
    });
  }

  function feedbackText(note) {
    var guide = root.VATC_HEAD_GUIDE;
    if (!guide || !guide.feedbackDraft) return String(note || '');
    return guide.feedbackDraft(note, snapshot());
  }

  root.VATC_DEVICE = {
    start: start,
    snapshot: snapshot,
    refreshStatus: refreshStatus,
    kickRefs: kickRefs,
    install: install,
    acceptUpdate: acceptUpdate,
    feedbackText: feedbackText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VATC_DEVICE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
