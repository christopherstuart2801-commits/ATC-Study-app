/* One-sheet workbook reader and writer. No network. Store-method files and
   deflate (method 8) files, inline strings and shared strings. Not a general
   Office suite. */
(function (root) {
  'use strict';

  var CRC_TABLE = null;
  function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    CRC_TABLE = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[n] = c >>> 0;
    }
    return CRC_TABLE;
  }
  function crc32(bytes) {
    var table = crcTable();
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function u16(n) { return [n & 255, (n >>> 8) & 255]; }
  function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
  function concat(parts) {
    var n = 0;
    for (var i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n);
    var o = 0;
    for (var j = 0; j < parts.length; j++) { out.set(parts[j], o); o += parts[j].length; }
    return out;
  }
  function bytesOf(part) {
    if (part instanceof Uint8Array) return part;
    return new Uint8Array(part);
  }
  function encode(s) { return new TextEncoder().encode(String(s)); }
  function decode(bytes) { return new TextDecoder('utf-8').decode(bytes); }
  function xml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function colName(index) {
    var s = '';
    var i = index + 1;
    while (i > 0) {
      var m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }
  function colIndex(letters) {
    var n = 0;
    var s = String(letters || '').toUpperCase();
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }
  function sheetXml(rows) {
    var body = '';
    for (var r = 0; r < rows.length; r++) {
      var cells = '';
      var row = rows[r] || [];
      for (var c = 0; c < row.length; c++) {
        var ref = colName(c) + (r + 1);
        cells += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xml(row[c]) + '</t></is></c>';
      }
      body += '<row r="' + (r + 1) + '">' + cells + '</row>';
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + body + '</sheetData></worksheet>';
  }
  function zipStore(files) {
    var parts = [];
    var central = [];
    var offset = 0;
    files.forEach(function (f) {
      var name = encode(f.name);
      var data = f.data;
      var crc = crc32(data);
      var local = concat([
        bytesOf(u32(0x04034b50)), bytesOf(u16(20)), bytesOf(u16(0)), bytesOf(u16(0)),
        bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u32(crc)), bytesOf(u32(data.length)),
        bytesOf(u32(data.length)), bytesOf(u16(name.length)), bytesOf(u16(0)), name, data
      ]);
      parts.push(local);
      central.push(concat([
        bytesOf(u32(0x02014b50)), bytesOf(u16(20)), bytesOf(u16(20)), bytesOf(u16(0)),
        bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u32(crc)),
        bytesOf(u32(data.length)), bytesOf(u32(data.length)), bytesOf(u16(name.length)),
        bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u32(0)),
        bytesOf(u32(offset)), name
      ]));
      offset += local.length;
    });
    var centralBytes = concat(central);
    var eocd = concat([
      bytesOf(u32(0x06054b50)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(files.length)),
      bytesOf(u16(files.length)), bytesOf(u32(centralBytes.length)), bytesOf(u32(offset)), bytesOf(u16(0))
    ]);
    return concat(parts.concat([centralBytes, eocd]));
  }
  function readU16(b, o) { return b[o] | (b[o + 1] << 8); }
  function readU32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function findEocd(b) {
    var start = Math.max(0, b.length - 22 - 65535);
    for (var i = b.length - 22; i >= start; i--) {
      if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x05 && b[i + 3] === 0x06) return i;
    }
    return -1;
  }
  function inflateRaw(bytes) {
    var DS = typeof DecompressionStream !== 'undefined' ? DecompressionStream : null;
    if (!DS) return Promise.reject(new Error('This browser cannot read a compressed workbook.'));
    var stream = new Blob([bytes]).stream().pipeThrough(new DS('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }
  function listZip(bytes) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var eocd = findEocd(b);
    if (eocd < 0) return Promise.reject(new Error('Not a workbook file.'));
    var count = readU16(b, eocd + 10);
    var cenOff = readU32(b, eocd + 16);
    var files = [];
    var p = cenOff;
    for (var i = 0; i < count; i++) {
      if (readU32(b, p) !== 0x02014b50) return Promise.reject(new Error('Workbook directory is unreadable.'));
      var method = readU16(b, p + 10);
      var comp = readU32(b, p + 20);
      var nameLen = readU16(b, p + 28);
      var extraLen = readU16(b, p + 30);
      var commentLen = readU16(b, p + 32);
      var localOff = readU32(b, p + 42);
      var name = decode(b.subarray(p + 46, p + 46 + nameLen));
      files.push({ name: name, method: method, comp: comp, localOff: localOff });
      p += 46 + nameLen + extraLen + commentLen;
    }
    var jobs = files.map(function (f) {
      var lp = f.localOff;
      if (readU32(b, lp) !== 0x04034b50) return Promise.reject(new Error('Workbook entry is unreadable.'));
      var nLen = readU16(b, lp + 26);
      var xLen = readU16(b, lp + 28);
      var start = lp + 30 + nLen + xLen;
      var slice = b.subarray(start, start + f.comp);
      if (f.method === 0) return Promise.resolve({ name: f.name, text: decode(slice) });
      if (f.method === 8) return inflateRaw(slice).then(function (raw) { return { name: f.name, text: decode(raw) }; });
      return Promise.reject(new Error('Unsupported workbook compression.'));
    });
    return Promise.all(jobs);
  }
  function textOf(fragment) {
    var out = '';
    var re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    var m;
    while ((m = re.exec(fragment))) out += m[1];
    return out.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }
  function sharedStrings(xmlText) {
    var list = [];
    var re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    var m;
    while ((m = re.exec(xmlText))) list.push(textOf(m[1]));
    return list;
  }
  function sheetRows(xmlText, strings) {
    var rows = [];
    var re = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    var rm;
    while ((rm = re.exec(xmlText))) {
      var line = [];
      var cre = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      var cm;
      while ((cm = cre.exec(rm[1]))) {
        var attrs = cm[1];
        var body = cm[2];
        var ref = (/r="([A-Z]+)\d+"/i.exec(attrs) || [])[1] || '';
        var idx = ref ? colIndex(ref) : line.length;
        var type = (/t="([^"]+)"/.exec(attrs) || [])[1] || '';
        var value = '';
        if (type === 'inlineStr') value = textOf(body);
        else if (type === 's') {
          var n = parseInt((/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1] || '0', 10);
          value = strings[n] || '';
        } else {
          value = ((/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1] || '').trim();
        }
        while (line.length < idx) line.push('');
        line[idx] = value;
      }
      rows.push(line);
    }
    return rows;
  }
  function deflateRaw(bytes) {
    var CS = typeof CompressionStream !== 'undefined' ? CompressionStream : null;
    if (!CS) return Promise.reject(new Error('no deflate'));
    var stream = new Blob([bytes]).stream().pipeThrough(new CS('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }
  function zipDeflate(files) {
    return Promise.all(files.map(function (f) { return deflateRaw(f.data).then(function (comp) { return { name: f.name, data: f.data, comp: comp }; }); })).then(function (packed) {
      var parts = [];
      var central = [];
      var offset = 0;
      packed.forEach(function (f) {
        var name = encode(f.name);
        var crc = crc32(f.data);
        var local = concat([
          bytesOf(u32(0x04034b50)), bytesOf(u16(20)), bytesOf(u16(0)), bytesOf(u16(8)),
          bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u32(crc)), bytesOf(u32(f.comp.length)),
          bytesOf(u32(f.data.length)), bytesOf(u16(name.length)), bytesOf(u16(0)), name, f.comp
        ]);
        parts.push(local);
        central.push(concat([
          bytesOf(u32(0x02014b50)), bytesOf(u16(20)), bytesOf(u16(20)), bytesOf(u16(0)),
          bytesOf(u16(8)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u32(crc)),
          bytesOf(u32(f.comp.length)), bytesOf(u32(f.data.length)), bytesOf(u16(name.length)),
          bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u32(0)),
          bytesOf(u32(offset)), name
        ]));
        offset += local.length;
      });
      var centralBytes = concat(central);
      var eocd = concat([
        bytesOf(u32(0x06054b50)), bytesOf(u16(0)), bytesOf(u16(0)), bytesOf(u16(packed.length)),
        bytesOf(u16(packed.length)), bytesOf(u32(centralBytes.length)), bytesOf(u32(offset)), bytesOf(u16(0))
      ]);
      return concat(parts.concat([centralBytes, eocd]));
    });
  }
  function writeWorkbook(sheets) {
    var sheetXmls = sheets.map(function (s) { return encode(sheetXml(s.rows)); });
    var overrides = sheetXmls.map(function (_, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join('');
    var sheetTags = sheets.map(function (s, i) {
      return '<sheet name="' + xml(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    }).join('');
    var rels = sheets.map(function (_, i) {
      return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    }).join('');
    var files = [
      { name: '[Content_Types].xml', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + overrides + '</Types>') },
      { name: '_rels/.rels', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { name: 'xl/workbook.xml', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheetTags + '</sheets></workbook>') },
      { name: 'xl/_rels/workbook.xml.rels', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>') }
    ];
    sheetXmls.forEach(function (data, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: data }); });
    return zipStore(files);
  }
  function readWorkbook(bytes) {
    return listZip(bytes).then(function (files) {
      var byName = {};
      files.forEach(function (f) { byName[f.name.replace(/^\/+/, '')] = f.text; });
      var book = byName['xl/workbook.xml'] || '';
      var rels = byName['xl/_rels/workbook.xml.rels'] || '';
      var strings = sharedStrings(byName['xl/sharedStrings.xml'] || '');
      var targets = {};
      var rm = /<Relationship\b([^>]*)\/?>/g;
      var m;
      while ((m = rm.exec(rels))) {
        var id = (/Id="([^"]+)"/.exec(m[1]) || [])[1] || '';
        var targetRel = (/Target="([^"]+)"/.exec(m[1]) || [])[1] || '';
        if (id) targets[id] = targetRel.replace(/^\//, '');
      }
      var sheets = [];
      var sm = /<sheet\b([^>]*)\/?>/g;
      var s;
      while ((s = sm.exec(book))) {
        var name = (/name="([^"]+)"/.exec(s[1]) || [])[1] || 'Sheet';
        var rid = (/r:id="([^"]+)"/.exec(s[1]) || [])[1] || '';
        var target = targets[rid] || '';
        if (target.indexOf('xl/') !== 0) target = 'xl/' + target.replace(/^\//, '');
        var xmlText = byName[target] || '';
        sheets.push({ name: name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&quot;/g, '"'), rows: sheetRows(xmlText, strings) });
      }
      if (!sheets.length) throw new Error('No sheets in this workbook.');
      return sheets;
    });
  }

  function writeWorkbookCompressed(sheets) {
    var sheetXmls = sheets.map(function (s) { return encode(sheetXml(s.rows)); });
    var overrides = sheetXmls.map(function (_, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join('');
    var sheetTags = sheets.map(function (s, i) {
      return '<sheet name="' + xml(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    }).join('');
    var rels = sheets.map(function (_, i) {
      return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    }).join('');
    var files = [
      { name: '[Content_Types].xml', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + overrides + '</Types>') },
      { name: '_rels/.rels', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { name: 'xl/workbook.xml', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheetTags + '</sheets></workbook>') },
      { name: 'xl/_rels/workbook.xml.rels', data: encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>') }
    ];
    sheetXmls.forEach(function (data, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: data }); });
    return zipDeflate(files);
  }
  root.VATC_XLSX = { writeWorkbook: writeWorkbook, writeWorkbookCompressed: writeWorkbookCompressed, readWorkbook: readWorkbook, crc32: crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VATC_XLSX;
})(typeof globalThis !== 'undefined' ? globalThis : this);
