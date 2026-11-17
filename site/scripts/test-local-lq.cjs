#!/usr/bin/env node
/* Local Control lesson cards: paper wording, score math, no answer key. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
assert.equal(html, fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'mirror');
const ctx = { console, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, length: 0 } };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'site/offline/local-lq.js'), 'utf8'), ctx);
const lessons = ctx.VATC_LOCAL_LQ;
assert.equal(lessons.length, 7);
const ids = Array.from(lessons, t => String(t.id));
assert.equal(ids.join('|'), ['LTG 1', 'ACAD-0529', 'ACAD-0530 / ACAD-0531', 'ACAD-0526', 'ACAD-0525', 'EQPT-2003', 'COMM-2206'].join('|'));
for (const t of lessons) {
  assert.equal(t.localLq, true);
  assert.equal(t.test.length, 0);
  assert.equal(JSON.stringify(t).includes('"a":'), false, t.id + ' has an answer field');
}
for (const t of lessons.filter(t => t.sim)) {
  const sum = t.sim.items.reduce((n, it) => n + it[1], 0);
  assert.equal(sum, 100, t.sim.title + ' ' + sum);
}
const ex3 = lessons[2].exercise.prompts[9];
assert.match(ex3, /\[sic - paper says "same"; likely means opposite\]/);
assert.match(lessons[2].exercise.note, /Page 13 was not photographed/);
assert.equal(lessons[5].checks.length, 12);
assert.equal(lessons[6].checks.length, 7);
assert.match(html, /DISTRIBUTION: DoW COMMUNITY ONLY/);
assert.match(html, /SYLLABUS\.lcl=LOCAL_LQ/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'site/offline/local-lq.js'), 'utf8'), /answer key|correct answer/i);
console.log('local LQ checks passed');
