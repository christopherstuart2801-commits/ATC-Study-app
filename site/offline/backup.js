/* Device backup for VECTOR ATC. Local JSON only: no network. Classic script. */
(function (root) {
  'use strict';

  var FORMAT = 'vector-atc-backup';
  var FORMAT_VERSION = 1;
  var MAX_BYTES = 12 * 1024 * 1024;
  var PROGRESS_KEY = 'vector_progress_ver';
  var KEY_RE = /^vatc\.[A-Za-z0-9][A-Za-z0-9._-]{0,64}$/;
  var BANNED = Object.create(null);
  BANNED['__proto__'] = 1;
  BANNED.constructor = 1;
  BANNED.prototype = 1;

  var KNOWN = {
    'vatc.trainee': 'trainee',
    'vatc.studymarks': 'marks',
    'vatc.rfcChk': 'boolmap',
    'vatc.lessonsDone': 'boolmap',
    'vatc.fcStats': 'statmap',
    'vatc.fcRated': 'objmap',
    'vatc.tests.v1': 'tests',
    'vatc.mySets.v1': 'sets',
    'vatc.pkOpen.v1': 'boolmap'
  };

  function isPlain(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function bannedKey(k) {
    return !k || Object.prototype.hasOwnProperty.call(BANNED, k);
  }

  function walk(v, depth) {
    if (depth > 8) return 'nested too deep';
    if (v == null || typeof v === 'string' || typeof v === 'boolean') return '';
    if (typeof v === 'number') return isFinite(v) ? '' : 'non-finite number';
    if (Array.isArray(v)) {
      for (var i = 0; i < v.length; i++) {
        var ae = walk(v[i], depth + 1);
        if (ae) return ae;
      }
      return '';
    }
    if (!isPlain(v)) return 'unsupported value';
    var keys = Object.keys(v);
    for (var k = 0; k < keys.length; k++) {
      if (bannedKey(keys[k])) return 'unsafe key ' + keys[k];
      var e = walk(v[keys[k]], depth + 1);
      if (e) return e;
    }
    return '';
  }

  function boolMap(v) {
    if (!isPlain(v)) return 'expected an object';
    var keys = Object.keys(v);
    for (var i = 0; i < keys.length; i++) {
      if (bannedKey(keys[i])) return 'unsafe key';
      if (typeof v[keys[i]] !== 'boolean') return 'expected true or false';
    }
    return '';
  }

  function objMap(v) {
    if (!isPlain(v)) return 'expected an object';
    var keys = Object.keys(v);
    for (var i = 0; i < keys.length; i++) {
      if (bannedKey(keys[i])) return 'unsafe key';
      if (!isPlain(v[keys[i]])) return 'expected an object';
      var e = walk(v[keys[i]], 0);
      if (e) return e;
    }
    return '';
  }

  function checkKnown(key, v) {
    var kind = KNOWN[key];
    if (kind === 'trainee') {
      if (!isPlain(v)) return 'trainee must be an object';
      if (typeof v.name !== 'string' || typeof v.initials !== 'string') return 'trainee needs name and initials';
      if (!v.name.trim() || !v.initials.trim()) return 'trainee name and initials are empty';
      if (v.name.length > 120 || v.initials.length > 8) return 'trainee value is too long';
      return '';
    }
    if (kind === 'boolmap') return boolMap(v);
    if (kind === 'marks') return objMap(v);
    if (kind === 'statmap' || kind === 'objmap') return objMap(v);
    if (kind === 'tests') {
      var te = objMap(v);
      if (te) return te;
      var tkeys = Object.keys(v);
      for (var i = 0; i < tkeys.length; i++) {
        var row = v[tkeys[i]];
        if (row.best != null && typeof row.best !== 'number') return 'test best must be a number';
        if (row.last != null && typeof row.last !== 'number') return 'test last must be a number';
        if (row.date != null && typeof row.date !== 'string') return 'test date must be a string';
      }
      return '';
    }
    if (kind === 'sets') {
      if (!Array.isArray(v)) return 'custom sets must be a list';
      if (v.length > 200) return 'too many custom sets';
      for (var s = 0; s < v.length; s++) {
        var set = v[s];
        if (!isPlain(set) || typeof set.id !== 'string' || typeof set.name !== 'string' || !Array.isArray(set.cards)) return 'custom set is incomplete';
        if (set.cards.length > 500) return 'a custom set has too many cards';
        for (var c = 0; c < set.cards.length; c++) {
          var card = set.cards[c];
          if (!isPlain(card) || typeof card.id !== 'string' || typeof card.q !== 'string' || typeof card.a !== 'string') return 'a custom card is incomplete';
        }
      }
      return walk(v, 0);
    }
    return 'unknown known-key kind';
  }

  function checkKeyValue(key, v) {
    if (key === PROGRESS_KEY) return typeof v === 'string' && v.length > 0 && v.length < 80 ? '' : 'progress stamp is invalid';
    if (!KEY_RE.test(key) || bannedKey(key)) return 'key is not a study value: ' + key;
    if (Object.prototype.hasOwnProperty.call(KNOWN, key)) return checkKnown(key, v);
    var e = walk(v, 0);
    return e ? e : '';
  }

  function storageKeys(storage) {
    var out = [];
    var n = storage.length || 0;
    for (var i = 0; i < n; i++) out.push(storage.key(i));
    return out.filter(Boolean);
  }

  function build(rawMap, meta) {
    meta = meta || {};
    var keys = {};
    var names = Object.keys(rawMap || {});
    var errors = [];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (name !== PROGRESS_KEY && !KEY_RE.test(name)) continue;
      var raw = rawMap[name];
      if (raw == null) continue;
      var parsed;
      if (name === PROGRESS_KEY) {
        parsed = String(raw);
        try { var asJson = JSON.parse(raw); if (typeof asJson === 'string') parsed = asJson; } catch (e) { /* plain stamp, same as the app writes it */ }
      } else {
        try { parsed = JSON.parse(raw); } catch (e2) { errors.push(name + ' is not JSON'); continue; }
      }
      var err = checkKeyValue(name, parsed);
      if (err) { errors.push(name + ': ' + err); continue; }
      keys[name] = parsed;
    }
    if (errors.length) return { ok: false, errors: errors };
    var backup = {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      appVersion: String(meta.appVersion || ''),
      exportedAt: String(meta.exportedAt || ''),
      progressVer: typeof keys[PROGRESS_KEY] === 'string' ? keys[PROGRESS_KEY] : String(meta.progressVer || ''),
      keys: keys
    };
    if (JSON.stringify(backup).length > MAX_BYTES) return { ok: false, errors: ['backup is too large'] };
    return { ok: true, backup: backup };
  }

  function parse(text) {
    var raw = String(text || '').replace(/^\uFEFF/, '');
    if (/"__proto__"\s*:/.test(raw)) return { ok: false, errors: ['backup contains an unsafe key'] };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { ok: false, errors: ['file is not JSON'] }; }
    var errors = validate(data);
    if (errors.length) return { ok: false, errors: errors };
    return { ok: true, backup: data };
  }

  function ownTree(v, depth) {
    if (v == null || typeof v !== 'object') return '';
    if (depth > 8) return 'nested too deep';
    var proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== Array.prototype) return 'unsafe object';
    var keys = Object.keys(v);
    for (var i = 0; i < keys.length; i++) {
      if (bannedKey(keys[i])) return 'unsafe key';
      var e = ownTree(v[keys[i]], depth + 1);
      if (e) return e;
    }
    return '';
  }

  function validate(data) {
    var errors = [];
    if (!isPlain(data)) return ['backup must be a JSON object'];
    var tree = ownTree(data, 0);
    if (tree) return [tree];
    var top = Object.keys(data);
    for (var i = 0; i < top.length; i++) {
      if (bannedKey(top[i])) errors.push('unsafe backup field');
    }
    if (data.format !== FORMAT) errors.push('not a VECTOR ATC backup');
    if (data.formatVersion !== FORMAT_VERSION) errors.push('unsupported backup version');
    if (data.appVersion != null && typeof data.appVersion !== 'string') errors.push('appVersion is invalid');
    if (data.exportedAt != null && typeof data.exportedAt !== 'string') errors.push('exportedAt is invalid');
    if (data.progressVer != null && typeof data.progressVer !== 'string') errors.push('progressVer is invalid');
    if (!isPlain(data.keys)) errors.push('backup keys are missing');
    if (errors.length) return errors;
    if (JSON.stringify(data).length > MAX_BYTES) return ['backup is too large'];
    var names = Object.keys(data.keys);
    for (var k = 0; k < names.length; k++) {
      var key = names[k];
      if (key !== PROGRESS_KEY && !KEY_RE.test(key)) errors.push('refusing key ' + key);
      var one = checkKeyValue(key, data.keys[key]);
      if (one) errors.push(key + ': ' + one);
    }
    return errors;
  }

  function snapshot(storage) {
    var snap = {};
    storageKeys(storage).forEach(function (k) {
      if (k === PROGRESS_KEY || KEY_RE.test(k)) snap[k] = storage.getItem(k);
    });
    return snap;
  }

  function restore(storage, snap) {
    storageKeys(storage).forEach(function (k) {
      if (k === PROGRESS_KEY || KEY_RE.test(k)) {
        try { storage.removeItem(k); } catch (e) { /* keep going and rewrite the snapshot */ }
      }
    });
    Object.keys(snap).forEach(function (k) {
      if (snap[k] == null) storage.removeItem(k);
      else storage.setItem(k, snap[k]);
    });
  }

  function apply(storage, backup, opts) {
    opts = opts || {};
    var errors = validate(backup);
    if (errors.length) return { ok: false, error: errors.join('; ') };
    if (typeof opts.progressVer !== 'string' || !opts.progressVer) return { ok: false, error: 'missing progress stamp' };
    var snap = snapshot(storage);
    try {
      storageKeys(storage).forEach(function (k) {
        if (k === PROGRESS_KEY || KEY_RE.test(k)) storage.removeItem(k);
      });
      var names = Object.keys(backup.keys);
      for (var i = 0; i < names.length; i++) {
        if (names[i] === PROGRESS_KEY) continue;
        storage.setItem(names[i], JSON.stringify(backup.keys[names[i]]));
      }
      /* Keep this app's migration stamp so the one-time progress reset does not
         discard a backup that was exported before the stamp existed. */
      storage.setItem(PROGRESS_KEY, opts.progressVer);
      var check = snapshot(storage);
      for (var j = 0; j < names.length; j++) {
        if (names[j] === PROGRESS_KEY) continue;
        var got = JSON.parse(check[names[j]]);
        if (JSON.stringify(got) !== JSON.stringify(backup.keys[names[j]])) throw new Error('verify failed for ' + names[j]);
      }
      if (check[PROGRESS_KEY] !== opts.progressVer) throw new Error('progress stamp was not saved');
      return { ok: true };
    } catch (e) {
      try { restore(storage, snap); } catch (e2) { return { ok: false, error: 'import failed and restore failed' }; }
      return { ok: false, error: String((e && e.message) || e) };
    }
  }

  var api = {
    FORMAT: FORMAT,
    FORMAT_VERSION: FORMAT_VERSION,
    PROGRESS_KEY: PROGRESS_KEY,
    KNOWN: KNOWN,
    build: build,
    parse: parse,
    validate: validate,
    apply: apply,
    snapshot: snapshot
  };
  root.VATC_BACKUP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
