/* Local position notes. Not an official qualification and not sent anywhere. */
(function (root) {
  'use strict';

  var KEY = 'vatc.positionRecords.v1';
  var STATUSES = { none: 1, training: 1, qualified: 1 };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function today(now) {
    var d = now ? new Date(now) : new Date();
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function daysBetween(started, qualified) {
    if (!validDate(started) || !validDate(qualified)) return null;
    var a = Date.UTC(+started.slice(0, 4), +started.slice(5, 7) - 1, +started.slice(8, 10));
    var b = Date.UTC(+qualified.slice(0, 4), +qualified.slice(5, 7) - 1, +qualified.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }

  function validate(raw, todayIso) {
    var rec = raw || {};
    var status = String(rec.status || 'none');
    var started = String(rec.started || '');
    var qualified = String(rec.qualified || '');
    var day = todayIso || today();
    var errors = [];
    if (!STATUSES[status]) errors.push('Choose No record, In training, or Recorded qualified.');
    if (started && !validDate(started)) errors.push('Started date is not a real date.');
    if (qualified && !validDate(qualified)) errors.push('Qualified date is not a real date.');
    if (validDate(started) && started > day) errors.push('Started date cannot be in the future.');
    if (validDate(qualified) && qualified > day) errors.push('Qualified date cannot be in the future.');
    if (status === 'qualified') {
      if (!started) errors.push('Recorded qualified needs a started date.');
      if (!qualified) errors.push('Recorded qualified needs a qualified date.');
      if (validDate(started) && validDate(qualified) && qualified < started) errors.push('Qualified date cannot be before the started date.');
    }
    if (status === 'training' && qualified) errors.push('A qualified date is only kept when status is Recorded qualified.');
    var clean = {
      status: STATUSES[status] ? status : 'none',
      started: status === 'none' ? '' : started,
      qualified: status === 'qualified' ? qualified : ''
    };
    if (clean.status === 'none') { clean.started = ''; clean.qualified = ''; }
    var elapsed = null;
    if (!errors.length && clean.status === 'qualified') elapsed = daysBetween(clean.started, clean.qualified);
    return { ok: errors.length === 0, errors: errors, clean: clean, days: elapsed };
  }

  function emptyStore() { return { v: 1, items: {} }; }

  function itemKey(station, pos) {
    return String(station || '') + ':' + String(pos || '');
  }

  function load(storage) {
    var blank = emptyStore();
    try {
      var raw = storage.getItem(KEY);
      if (!raw) return blank;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.items || typeof data.items !== 'object' || Array.isArray(data.items)) return blank;
      var items = {};
      Object.keys(data.items).forEach(function (k) {
        if (!/^[A-Z0-9]{3,4}:[a-z0-9]{1,12}$/.test(k)) return;
        var row = data.items[k];
        var checked = validate(row, today());
        if (!checked.ok || checked.clean.status === 'none') return;
        items[k] = checked.clean;
      });
      return { v: 1, items: items };
    } catch (e) {
      return blank;
    }
  }

  function save(storage, store) {
    var err = validateStore(store);
    if (err) return { ok: false, error: err };
    try {
      storage.setItem(KEY, JSON.stringify(store));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not save on this device.' };
    }
  }

  function validateStore(store) {
    if (!store || typeof store !== 'object' || Array.isArray(store)) return 'position records must be an object';
    if (store.v !== 1) return 'position records version is not 1';
    if (!store.items || typeof store.items !== 'object' || Array.isArray(store.items)) return 'position records items are missing';
    var names = Object.keys(store.items);
    if (names.length > 200) return 'too many position records';
    for (var i = 0; i < names.length; i++) {
      if (!/^[A-Z0-9]{3,4}:[a-z0-9]{1,12}$/.test(names[i])) return 'position record key is invalid';
      var checked = validate(store.items[names[i]], today());
      if (!checked.ok) return names[i] + ': ' + checked.errors[0];
    }
    return '';
  }

  function summary(rec) {
    if (!rec || !rec.status || rec.status === 'none') {
      return { headline: 'No record', lines: [], note: '', add: true };
    }
    if (rec.status === 'training') {
      if (!rec.started) return { headline: 'In training', lines: ['Qualification not recorded'], note: '', add: false };
      return { headline: 'Started ' + rec.started, lines: ['Qualification not recorded'], note: '', add: false };
    }
    if (rec.status === 'qualified') {
      var n = daysBetween(rec.started, rec.qualified);
      var lines = ['Started ' + rec.started, 'Qualified ' + rec.qualified];
      if (n != null) lines.push('Days between entered dates: ' + n);
      return {
        headline: 'Recorded qualified',
        lines: lines,
        note: 'Recorded qualification · confirm in training records',
        add: false
      };
    }
    return { headline: 'No record', lines: [], note: '', add: true };
  }

  root.VATC_POSREC = {
    KEY: KEY,
    today: today,
    daysBetween: daysBetween,
    validate: validate,
    validateStore: validateStore,
    load: load,
    save: save,
    summary: summary,
    itemKey: itemKey,
    emptyStore: emptyStore
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VATC_POSREC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
