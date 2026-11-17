/* Local position log for one device. Not an official training form and not sent anywhere.
   The stored document is the whole log (v:1, entries:[]), so a later sync can move that
   document without inventing a second shape. This file does not open a network connection
   and does not create an account. */
(function (root) {
  'use strict';

  var KEY = 'vatc.studentLog.v1';
  var POS = { cd: 1, gnd: 1, lcl: 1, rfd: 1, fin: 1, arr: 1, oth: 1 };
  var MAX = 2000;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function localToday(now) {
    var d = now ? new Date(now) : new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function clip(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }

  function emptyStore() { return { v: 1, entries: [] }; }

  function roundHours(n) { return Math.round(n * 100) / 100; }

  function cleanApproaches(list, errors) {
    var out = [];
    var seen = Object.create(null);
    var rows = Array.isArray(list) ? list : [];
    if (rows.length > 12) errors.push('Too many approach lines.');
    rows.forEach(function (row) {
      if (!row) return;
      var type = clip(row.type, 40);
      var count = row.count === '' || row.count == null ? 0 : Number(row.count);
      if (!type && !count) return;
      if (!type) { errors.push('An approach count needs a type.'); return; }
      if (!Number.isInteger(count) || count < 1 || count > 99) { errors.push('Approach count must be a whole number from 1 to 99.'); return; }
      var key = type.toLowerCase();
      if (seen[key]) { errors.push('Approach type is listed twice: ' + type); return; }
      seen[key] = 1;
      out.push({ type: type, count: count });
    });
    return out;
  }

  function validateEntry(raw, todayIso) {
    var rec = raw || {};
    var day = todayIso || localToday();
    var errors = [];
    var date = String(rec.date || '');
    var paperDate = String(rec.paperDate || '');
    var hours = rec.hours === '' || rec.hours == null ? NaN : Number(rec.hours);
    var position = String(rec.position || '');
    var station = String(rec.station || 'KNFG').toUpperCase();
    if (!validDate(date)) errors.push('Date is not a real date.');
    else if (date > day) errors.push('Date cannot be in the future.');
    if (!POS[position]) errors.push('Choose a position.');
    if (!/^[A-Z0-9]{3,4}$/.test(station)) errors.push('Station code is not valid.');
    if (!isFinite(hours) || hours < 0 || hours > 24 || Math.round(hours * 100) !== hours * 100) errors.push('Hours must be from 0 to 24, in hundredths.');
    if (paperDate && !validDate(paperDate)) errors.push('Paper date is not a real date.');
    else if (validDate(paperDate) && paperDate > day) errors.push('Paper date cannot be in the future.');
    var fromPaper = !!rec.fromPaper;
    var paperRef = clip(rec.paperRef, 80);
    if (fromPaper && !paperRef) errors.push('A paper sheet needs a short reference so it can be found later.');
    var approaches = cleanApproaches(rec.approaches, errors);
    var clean = {
      id: /^l[a-z0-9]{8,24}$/.test(String(rec.id || '')) ? String(rec.id) : '',
      trainee: clip(rec.trainee, 120),
      initials: clip(rec.initials, 8).toUpperCase(),
      station: station,
      position: position,
      date: date,
      hours: isFinite(hours) ? roundHours(hours) : 0,
      activity: clip(rec.activity, 240),
      approaches: approaches,
      paperRef: paperRef,
      paperDate: validDate(paperDate) ? paperDate : '',
      fromPaper: fromPaper,
      note: clip(rec.note, 500),
      savedAt: /^\d{4}-\d{2}-\d{2}T/.test(String(rec.savedAt || '')) ? String(rec.savedAt).slice(0, 40) : ''
    };
    return { ok: errors.length === 0, errors: errors, clean: clean };
  }

  function newId(now) {
    var n = (now ? new Date(now) : new Date()).getTime().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return ('l' + n + r).replace(/[^a-z0-9]/g, '').slice(0, 24);
  }

  function validateStore(data) {
    if (!data || data.v !== 1 || !Array.isArray(data.entries)) return 'position log must be version 1 with an entries list';
    if (data.entries.length > MAX) return 'position log is too long';
    for (var i = 0; i < data.entries.length; i++) {
      var checked = validateEntry(data.entries[i], '9999-12-31');
      if (!checked.ok) return checked.errors[0] || 'position log entry is not valid';
      if (!checked.clean.id) return 'position log entry is missing an id';
    }
    return '';
  }

  function load(storage) {
    var blank = emptyStore();
    try {
      var raw = storage.getItem(KEY);
      if (!raw) return blank;
      var data = JSON.parse(raw);
      if (validateStore(data)) return blank;
      var entries = data.entries.map(function (row) {
        return validateEntry(row, '9999-12-31').clean;
      }).filter(function (row) { return row.id; });
      entries.sort(function (a, b) { return (b.date + b.savedAt).localeCompare(a.date + a.savedAt); });
      return { v: 1, entries: entries };
    } catch (e) { return blank; }
  }

  function save(storage, store) {
    try {
      var clean = { v: 1, entries: (store.entries || []).slice(0, MAX) };
      if (validateStore(clean)) return { ok: false };
      storage.setItem(KEY, JSON.stringify(clean));
      return { ok: true };
    } catch (e) { return { ok: false }; }
  }

  function add(storage, raw, now) {
    var day = localToday(now);
    var checked = validateEntry(raw, day);
    if (!checked.ok) return { ok: false, errors: checked.errors, entry: null };
    var entry = checked.clean;
    entry.id = newId(now);
    entry.savedAt = (now ? new Date(now) : new Date()).toISOString();
    var store = load(storage);
    store.entries.unshift(entry);
    if (store.entries.length > MAX) store.entries.length = MAX;
    var wrote = save(storage, store);
    if (!wrote.ok) return { ok: false, errors: ['Could not save on this device. Nothing was changed.'], entry: null };
    return { ok: true, errors: [], entry: entry };
  }

  function remove(storage, id) {
    var store = load(storage);
    var next = store.entries.filter(function (row) { return row.id !== id; });
    if (next.length === store.entries.length) return { ok: false };
    return save(storage, { v: 1, entries: next });
  }

  function addApproach(bucket, row) {
    row.approaches.forEach(function (ap) {
      bucket[ap.type] = (bucket[ap.type] || 0) + ap.count;
    });
  }

  function totals(entries) {
    var all = { hours: 0, entries: 0, approaches: {} };
    var by = {};
    (entries || []).forEach(function (row) {
      all.entries += 1;
      all.hours = roundHours(all.hours + row.hours);
      addApproach(all.approaches, row);
      var pos = by[row.position] || (by[row.position] = { hours: 0, entries: 0, approaches: {} });
      pos.entries += 1;
      pos.hours = roundHours(pos.hours + row.hours);
      addApproach(pos.approaches, row);
    });
    return { all: all, byPosition: by };
  }

  function recent(entries, position, limit) {
    var rows = (entries || []).filter(function (row) { return !position || row.position === position; });
    return rows.slice(0, limit || rows.length);
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function approachText(row) {
    return (row.approaches || []).map(function (ap) { return ap.type + ' ' + ap.count; }).join('; ');
  }

  function csv(entries) {
    var head = ['date', 'trainee', 'initials', 'station', 'position', 'hours', 'activity', 'approaches', 'paper_ref', 'paper_date', 'from_paper', 'note'];
    var lines = [head.join(',')];
    (entries || []).forEach(function (row) {
      lines.push([
        row.date, row.trainee, row.initials, row.station, row.position, row.hours,
        row.activity, approachText(row), row.paperRef, row.paperDate, row.fromPaper ? 'yes' : 'no', row.note
      ].map(csvCell).join(','));
    });
    return lines.join('\n') + '\n';
  }

  root.VATC_LOG = {
    KEY: KEY,
    localToday: localToday,
    validDate: validDate,
    validateEntry: validateEntry,
    validateStore: validateStore,
    emptyStore: emptyStore,
    load: load,
    save: save,
    add: add,
    remove: remove,
    totals: totals,
    recent: recent,
    csv: csv,
    approachText: approachText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VATC_LOG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
