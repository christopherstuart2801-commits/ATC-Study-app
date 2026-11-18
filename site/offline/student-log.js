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
      removed: !!rec.removed,
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

  function remove(storage, id, now) {
    var store = load(storage);
    var row = null;
    for (var i = 0; i < store.entries.length; i++) if (store.entries[i].id === id) row = store.entries[i];
    if (!row || row.removed) return { ok: false };
    row.removed = true;
    row.savedAt = (now ? new Date(now) : new Date()).toISOString();
    return save(storage, store);
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
      if (row.removed) return;
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
    var rows = (entries || []).filter(function (row) { return !row.removed && (!position || row.position === position); });
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
      if (row.removed) return;
      lines.push([
        row.date, row.trainee, row.initials, row.station, row.position, row.hours,
        row.activity, approachText(row), row.paperRef, row.paperDate, row.fromPaper ? 'yes' : 'no', row.note
      ].map(csvCell).join(','));
    });
    return lines.join('\n') + '\n';
  }

  var COLS = ['id', 'trainee', 'initials', 'station', 'position', 'date', 'hours', 'activity', 'approaches', 'paper_ref', 'paper_date', 'from_paper', 'note', 'updated_at', 'removed'];
  var ROLE_KEY = 'vatc.localRole.v1';
  var CODES_KEY = 'vatc.localCodes.v1';

  function active(entries) { return (entries || []).filter(function (row) { return !row.removed; }); }

  function signature(entry) {
    return JSON.stringify({
      trainee: entry.trainee, initials: entry.initials, station: entry.station, position: entry.position,
      date: entry.date, hours: entry.hours, activity: entry.activity, approaches: entry.approaches,
      paperRef: entry.paperRef, paperDate: entry.paperDate, fromPaper: entry.fromPaper, note: entry.note,
      removed: !!entry.removed
    });
  }

  function parseApproaches(text) {
    var errors = [];
    var parts = String(text || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
    var list = parts.map(function (p) {
      var m = /^(.*\D)\s+(\d+)$/.exec(p);
      if (!m) return { type: p, count: 1 };
      return { type: m[1].trim(), count: Number(m[2]) };
    });
    return { approaches: cleanApproaches(list, errors), errors: errors };
  }

  function sheetMatrix(entries) {
    var rows = [COLS.slice()];
    (entries || []).forEach(function (row) {
      rows.push([
        row.id, row.trainee, row.initials, row.station, row.position, row.date, String(row.hours),
        row.activity, approachText(row), row.paperRef, row.paperDate, row.fromPaper ? 'yes' : 'no',
        row.note, row.savedAt, row.removed ? 'yes' : 'no'
      ]);
    });
    return rows;
  }

  function aboutRows() {
    return [
      ['VECTOR ATC position log'],
      ['File exchange only. Not a live Microsoft 365 or OneDrive sync.'],
      ['Not an official training form. Column names are generic.'],
      ['updated_at is the last edit time. A newer time wins unless an admin chooses otherwise.'],
      ['removed=yes hides the row when that edit is newer. A row left out of the sheet is kept in the app.']
    ];
  }

  function rowsToEntries(matrix) {
    if (!matrix || !matrix.length) return { entries: [], errors: ['The sheet is empty.'] };
    var head = matrix[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
    var need = ['position', 'date', 'hours'];
    for (var n = 0; n < need.length; n++) if (head.indexOf(need[n]) < 0) return { entries: [], errors: ['This sheet is not a position log. Expected columns include position, date, and hours.'] };
    var idx = {};
    head.forEach(function (h, i) { if (h) idx[h] = i; });
    function cell(row, name) { var i = idx[name]; return i == null ? '' : row[i] == null ? '' : String(row[i]); }
    var entries = [];
    var errors = [];
    for (var r = 1; r < matrix.length; r++) {
      var row = matrix[r] || [];
      if (!row.some(function (c) { return String(c || '').trim(); })) continue;
      var parsed = parseApproaches(cell(row, 'approaches'));
      var raw = {
        id: cell(row, 'id').trim(),
        trainee: cell(row, 'trainee'),
        initials: cell(row, 'initials'),
        station: cell(row, 'station') || 'KNFG',
        position: cell(row, 'position'),
        date: cell(row, 'date').slice(0, 10),
        hours: cell(row, 'hours'),
        activity: cell(row, 'activity'),
        approaches: parsed.approaches,
        paperRef: cell(row, 'paper_ref'),
        paperDate: cell(row, 'paper_date').slice(0, 10),
        fromPaper: /^(yes|true|1)$/i.test(cell(row, 'from_paper').trim()),
        note: cell(row, 'note'),
        removed: /^(yes|true|1)$/i.test(cell(row, 'removed').trim()),
        savedAt: cell(row, 'updated_at').trim()
      };
      var checked = validateEntry(raw, '9999-12-31');
      if (!checked.ok || parsed.errors.length) {
        errors.push('Row ' + (r + 1) + ': ' + (parsed.errors.concat(checked.errors).join(' ')));
        continue;
      }
      if (!checked.clean.id) checked.clean.id = '';
      if (!checked.clean.savedAt) checked.clean.savedAt = '1970-01-01T00:00:00.000Z';
      entries.push(checked.clean);
    }
    return { entries: entries, errors: errors };
  }

  function owns(entry, self) {
    self = self || {};
    var name = clip(self.name || self.trainee, 120).toLowerCase();
    var ini = clip(self.initials, 8).toUpperCase();
    var en = clip(entry.trainee, 120).toLowerCase();
    var ei = clip(entry.initials, 8).toUpperCase();
    if (!name && !ini) return !en && !ei;
    if (name && en !== name) return false;
    if (ini && ei && ei !== ini) return false;
    return true;
  }

  function previewMerge(localEntries, sheetEntries) {
    var local = {};
    var sheet = {};
    (localEntries || []).forEach(function (row) { if (row.id) local[row.id] = row; });
    var news = [];
    (sheetEntries || []).forEach(function (row) {
      if (!row.id) news.push(row);
      else sheet[row.id] = row;
    });
    var changes = [];
    Object.keys(local).forEach(function (id) {
      if (sheet[id]) return;
      changes.push({ id: id, kind: 'app-only', winner: 'app', app: local[id], sheet: null });
    });
    Object.keys(sheet).forEach(function (id) {
      var app = local[id];
      var incoming = sheet[id];
      if (!app) {
        changes.push({ id: id, kind: incoming.removed ? 'ignore' : 'add', winner: 'sheet', app: null, sheet: incoming });
        return;
      }
      if (signature(app) === signature(incoming)) {
        changes.push({ id: id, kind: 'same', winner: 'app', app: app, sheet: incoming });
        return;
      }
      var newer = (incoming.savedAt || '') > (app.savedAt || '') ? 'sheet' : 'app';
      var tie = (incoming.savedAt || '') === (app.savedAt || '');
      changes.push({ id: id, kind: tie ? 'conflict' : 'update', winner: tie ? 'app' : newer, app: app, sheet: incoming });
    });
    news.forEach(function (row, i) {
      changes.push({ id: 'new:' + i, kind: 'add', winner: 'sheet', app: null, sheet: row });
    });
    return changes.filter(function (c) { return c.kind !== 'ignore' && c.kind !== 'same'; });
  }

  function applyMerge(localEntries, changes, picks, now) {
    var local = {};
    (localEntries || []).forEach(function (row) { if (row.id) local[row.id] = row; });
    var stamp = (now ? new Date(now) : new Date()).toISOString();
    changes.forEach(function (change) {
      var choice = (picks && picks[change.id]) || change.winner;
      if (change.kind === 'app-only' || choice === 'app') return;
      var src = change.sheet;
      if (!src) return;
      var copy = JSON.parse(JSON.stringify(src));
      if (!copy.id) copy.id = newId(now);
      if (!copy.savedAt || copy.savedAt === '1970-01-01T00:00:00.000Z') copy.savedAt = stamp;
      local[copy.id] = copy;
    });
    return Object.keys(local).map(function (id) { return local[id]; });
  }

  function loadRole(storage) {
    try {
      var data = JSON.parse(storage.getItem(ROLE_KEY) || '');
      if (!data || (data.role !== 'admin' && data.role !== 'student')) return { v: 1, role: 'student', code: '' };
      return { v: 1, role: data.role, code: String(data.code || '').slice(0, 40) };
    } catch (e) { return { v: 1, role: 'student', code: '' }; }
  }

  function saveRole(storage, role) {
    try {
      storage.setItem(ROLE_KEY, JSON.stringify({ v: 1, role: role.role === 'admin' ? 'admin' : 'student', code: String(role.code || '').slice(0, 40) }));
      return { ok: true };
    } catch (e) { return { ok: false }; }
  }

  function becomeAdmin(storage, typed, newCode) {
    var cur = loadRole(storage);
    if (cur.code && String(typed || '') !== cur.code) return { ok: false, error: 'Device code does not match. Nothing was changed.' };
    var code = cur.code || String(newCode || '');
    if (code && code.length < 4) return { ok: false, error: 'Use at least 4 characters, or leave the device code empty.' };
    return saveRole(storage, { role: 'admin', code: code });
  }

  function leaveAdmin(storage) {
    var cur = loadRole(storage);
    return saveRole(storage, { role: 'student', code: cur.code });
  }

  function loadCodes(storage) {
    try {
      var data = JSON.parse(storage.getItem(CODES_KEY) || '');
      if (!data || !Array.isArray(data.codes)) return { v: 1, codes: [] };
      return { v: 1, codes: data.codes.filter(function (c) { return c && c.id && c.label && c.code; }).slice(0, 200) };
    } catch (e) { return { v: 1, codes: [] }; }
  }

  function saveCodes(storage, pack) {
    try {
      storage.setItem(CODES_KEY, JSON.stringify({ v: 1, codes: (pack.codes || []).slice(0, 200) }));
      return { ok: true };
    } catch (e) { return { ok: false }; }
  }

  function addCode(storage, label, now) {
    var name = clip(label, 80);
    if (!name) return { ok: false, error: 'Name who the code is for.' };
    var pack = loadCodes(storage);
    var code = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
    pack.codes.unshift({ id: newId(now), label: name, code: code, created: (now ? new Date(now) : new Date()).toISOString() });
    var wrote = saveCodes(storage, pack);
    return wrote.ok ? { ok: true, code: code } : { ok: false, error: 'Could not save on this device.' };
  }

  function removeCode(storage, id) {
    var pack = loadCodes(storage);
    pack.codes = pack.codes.filter(function (c) { return c.id !== id; });
    return saveCodes(storage, pack);
  }

  root.VATC_LOG = {
    KEY: KEY,
    ROLE_KEY: ROLE_KEY,
    CODES_KEY: CODES_KEY,
    COLS: COLS,
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
    approachText: approachText,
    active: active,
    sheetMatrix: sheetMatrix,
    aboutRows: aboutRows,
    rowsToEntries: rowsToEntries,
    owns: owns,
    previewMerge: previewMerge,
    applyMerge: applyMerge,
    loadRole: loadRole,
    saveRole: saveRole,
    becomeAdmin: becomeAdmin,
    leaveAdmin: leaveAdmin,
    loadCodes: loadCodes,
    addCode: addCode,
    removeCode: removeCode
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VATC_LOG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
