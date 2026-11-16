/* Fictional VECTOR demo. Public walkthrough code, not an account and not a permission.
   Demo values live under vatc.demo.slot.* so normal study keys stay untouched. */
(function (root) {
  'use strict';

  var CODE = 'VECTOR-DEMO';
  var FLAG = 'vatc.demo.flag';
  var DIRTY = 'vatc.demo.dirty';
  var EXPORTED = 'vatc.demo.exported';
  var PREFIX = 'vatc.demo.slot.';
  var PROGRESS = '2026-10-21';

  var bound = null;
  var rawGet, rawSet, rawRemove, rawKey, rawClear;

  function isMeta(key) {
    return key === FLAG || key === DIRTY || key === EXPORTED;
  }

  function useRaw(storage) {
    return !!(bound && storage === bound && rawGet);
  }

  function getRaw(storage, key) {
    if (useRaw(storage)) return rawGet.call(storage, key);
    return storage.getItem(key);
  }

  function putRaw(storage, key, value) {
    if (useRaw(storage)) rawSet.call(storage, key, String(value));
    else storage.setItem(key, String(value));
  }

  function delRaw(storage, key) {
    if (useRaw(storage)) rawRemove.call(storage, key);
    else storage.removeItem(key);
  }

  function physicalKeys(storage) {
    var out = [];
    if (useRaw(storage)) {
      for (var i = 0; ; i++) {
        var k = rawKey.call(storage, i);
        if (k == null) break;
        out.push(k);
      }
      return out;
    }
    var n = storage.length || 0;
    for (var j = 0; j < n; j++) {
      var name = storage.key(j);
      if (name) out.push(name);
    }
    return out;
  }

  function logicalKeys(storage) {
    var all = physicalKeys(storage);
    var on = getRaw(storage, FLAG) === '1';
    if (on) {
      var seen = {};
      var out = [];
      all.forEach(function (k) {
        if (k.indexOf(PREFIX) !== 0) return;
        var logical = k.slice(PREFIX.length);
        if (!logical || seen[logical]) return;
        seen[logical] = 1;
        out.push(logical);
      });
      return out;
    }
    return all.filter(function (k) { return k.indexOf('vatc.demo.') !== 0; });
  }

  function storageOf(storage) {
    return storage || bound;
  }

  function active(storage) {
    storage = storageOf(storage);
    if (!storage) return false;
    return getRaw(storage, FLAG) === '1';
  }

  function checkCode(input) {
    var s = String(input == null ? '' : input).trim().toUpperCase();
    if (!s) return { ok: false, message: 'Enter the demo code.' };
    if (s === CODE) return { ok: true, message: 'Demo only — does not create an account or grant permissions.' };
    return { ok: false, message: 'That code does not open the demo.' };
  }

  function seedPayload() {
    return {
      'vector_progress_ver': PROGRESS,
      'vatc.trainee': JSON.stringify({ name: 'Demo controller', initials: 'DEM' }),
      'vatc.positionRecords.v1': JSON.stringify({
        v: 1,
        items: {
          'KNFG:gnd': { status: 'training', started: '2026-10-01', qualified: '' },
          'KNFG:lcl': { status: 'qualified', started: '2026-10-01', qualified: '2026-10-28' }
        }
      }),
      'vatc.fcStats': JSON.stringify({
        'twy-widths': { status: 'STILL_LEARNING', times_correct: 0, times_missed: 1, last_seen: 1, mc_ok: false, written_ok: false },
        'tower-paper-1-01': { status: 'KNOWN', times_correct: 1, times_missed: 0, last_seen: 2, mc_ok: true, written_ok: true },
        'crash-phone': { status: 'STILL_LEARNING', times_correct: 0, times_missed: 1, last_seen: 3, mc_ok: false, written_ok: false }
      })
    };
  }

  function writeSeed(storage) {
    var data = seedPayload();
    Object.keys(data).forEach(function (k) { putRaw(storage, PREFIX + k, data[k]); });
    putRaw(storage, DIRTY, '1');
    putRaw(storage, EXPORTED, '0');
  }

  function hasSeed(storage) {
    return getRaw(storage, PREFIX + 'vatc.positionRecords.v1') != null;
  }

  function enter(storage) {
    storage = storageOf(storage);
    putRaw(storage, FLAG, '1');
    var seeded = false;
    if (!hasSeed(storage)) { writeSeed(storage); seeded = true; }
    return { ok: true, seeded: seeded, message: 'Demo only — does not create an account or grant permissions.' };
  }

  function exit(storage) {
    storage = storageOf(storage);
    delRaw(storage, FLAG);
    return { ok: true };
  }

  function reset(storage) {
    storage = storageOf(storage);
    physicalKeys(storage).forEach(function (k) {
      if (k.indexOf('vatc.demo.') === 0) delRaw(storage, k);
    });
    return { ok: true };
  }

  function markExported(storage) {
    storage = storageOf(storage);
    putRaw(storage, EXPORTED, '1');
    putRaw(storage, DIRTY, '0');
  }

  function needsExportWarning(storage) {
    storage = storageOf(storage);
    return active(storage) && getRaw(storage, DIRTY) === '1';
  }

  function install(storage) {
    if (!storage || bound) return api;
    var proto = Object.getPrototypeOf(storage);
    if (!proto || !proto.getItem) return api;
    rawGet = proto.getItem;
    rawSet = proto.setItem;
    rawRemove = proto.removeItem;
    rawKey = proto.key;
    rawClear = proto.clear;
    bound = storage;

    proto.getItem = function (key) {
      if (this !== bound) return rawGet.call(this, key);
      var name = String(key);
      if (isMeta(name)) return rawGet.call(this, name);
      if (rawGet.call(this, FLAG) === '1') return rawGet.call(this, PREFIX + name);
      return rawGet.call(this, name);
    };
    proto.setItem = function (key, value) {
      if (this !== bound) return rawSet.call(this, key, value);
      var name = String(key);
      if (isMeta(name)) return rawSet.call(this, name, value);
      if (rawGet.call(this, FLAG) === '1') {
        rawSet.call(this, PREFIX + name, value);
        rawSet.call(this, DIRTY, '1');
        rawSet.call(this, EXPORTED, '0');
        return;
      }
      return rawSet.call(this, name, value);
    };
    proto.removeItem = function (key) {
      if (this !== bound) return rawRemove.call(this, key);
      var name = String(key);
      if (isMeta(name)) return rawRemove.call(this, name);
      if (rawGet.call(this, FLAG) === '1') {
        rawRemove.call(this, PREFIX + name);
        rawSet.call(this, DIRTY, '1');
        rawSet.call(this, EXPORTED, '0');
        return;
      }
      return rawRemove.call(this, name);
    };
    proto.key = function (index) {
      if (this !== bound) return rawKey.call(this, index);
      var keys = logicalKeys(this);
      return index >= 0 && index < keys.length ? keys[index] : null;
    };
    proto.clear = function () {
      if (this !== bound) return rawClear.call(this);
      var on = rawGet.call(this, FLAG) === '1';
      physicalKeys(this).forEach(function (k) {
        if (on) {
          if (k.indexOf(PREFIX) === 0) rawRemove.call(bound, k);
        } else if (k.indexOf('vatc.demo.') !== 0) {
          rawRemove.call(bound, k);
        }
      });
      if (on) {
        rawSet.call(bound, DIRTY, '1');
        rawSet.call(bound, EXPORTED, '0');
      }
    };
    return api;
  }

  var api = {
    CODE: CODE,
    FLAG: FLAG,
    PREFIX: PREFIX,
    checkCode: checkCode,
    seedPayload: seedPayload,
    active: active,
    enter: enter,
    exit: exit,
    reset: reset,
    markExported: markExported,
    needsExportWarning: needsExportWarning,
    logicalKeys: function (storage) { return logicalKeys(storageOf(storage)); },
    install: install
  };

  root.VATC_DEMO = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined' && root.localStorage) install(root.localStorage);
})(typeof globalThis !== 'undefined' ? globalThis : this);
