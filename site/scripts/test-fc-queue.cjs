#!/usr/bin/env node
/* v0.8.18 brief-polish — node tests for the flashcard queue logic (FCQ block in index.html).
   Run: node scripts/test-fc-queue.cjs */
const fs = require('fs');
const path = require('path');
const htmlPath = [path.join(__dirname, '..', 'index.html'), path.join(__dirname, '..', 'site', 'index.html')].find(p => fs.existsSync(p));
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/\/\* FCQ:BEGIN[\s\S]*?\/\* FCQ:END \*\//);
if (!m) { console.log('FAIL FCQ block not found'); process.exit(1); }
const FCQ = new Function(m[0] + '\nreturn FCQ;')();

let fails = 0, passes = 0;
function ok(name, cond, detail) { if (cond) { passes++; console.log('PASS ' + name); } else { fails++; console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); } }
function rngFrom(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mkIds = n => Array.from({ length: n }, (_, i) => 'c' + i);

/* ---------- SORT ---------- */
{
  let backToBack = 0, onlyLearning = true, roundsOk = true, sessions = 0, allKnownEnd = true;
  for (let seed = 1; seed <= 300; seed++) {
    const rng = rngFrom(seed), n = 1 + (seed % 23), ids = mkIds(n), stats = {};
    let st = FCQ.sortStart(ids, stats, rng, null), last = null, guard = 0;
    if (st.queue.length !== n || new Set(st.queue).size !== n) roundsOk = false;
    while (!st.finished && guard++ < 5000) {
      if (st.done) {
        const learning = st.learning.slice();
        st = FCQ.sortNextRound(st, rng);
        if (st.finished) break;
        if (st.queue.length !== learning.length || !st.queue.every(id => learning.includes(id) && FCQ.status(stats, id) === FCQ.SL)) onlyLearning = false;
        continue;
      }
      const id = FCQ.sortCurrent(st);
      if (id === last && st.queue.length > 1) backToBack++;
      last = id;
      FCQ.sortMark(st, stats, rng() < 0.6, 1);
    }
    sessions++;
    if (!ids.every(id => FCQ.status(stats, id) === FCQ.KN)) allKnownEnd = false;
  }
  ok('sort: round 1 = whole deck shuffled, each card once', roundsOk);
  ok('sort: never the same card twice in a row (300 sessions)', backToBack === 0, 'repeats=' + backToBack);
  ok('sort: next round uses ONLY STILL_LEARNING cards', onlyLearning);
  ok('sort: repeats until every card KNOWN', allKnownEnd);
  const stats = {}; const st = FCQ.sortStart(mkIds(5), stats, rngFrom(9), null);
  FCQ.sortMark(st, stats, true, 1); FCQ.sortMark(st, stats, false, 1); FCQ.sortMark(st, stats, true, 1); FCQ.sortMark(st, stats, false, 1); FCQ.sortMark(st, stats, false, 1);
  ok('sort: round summary counts piles (2 know / 3 still learning)', st.done && st.known.length === 2 && st.learning.length === 3);
  const st2 = FCQ.sortStart(mkIds(5), { c0: { status: 'KNOWN' }, c1: { status: 'KNOWN' } }, rngFrom(3), null);
  ok('sort: KNOWN cards skipped when a new sort starts', st2.queue.length === 3 && !st2.queue.includes('c0'));
  const st3 = FCQ.sortStart(mkIds(2), { c0: { status: 'KNOWN' }, c1: { status: 'KNOWN' } }, rngFrom(3), null);
  ok('sort: all KNOWN → finished (UI offers reset)', st3.finished === true);
  const s4 = {}; FCQ.sortMark(FCQ.sortStart(['x'], s4, rngFrom(1), null), s4, false, 42);
  ok('sort: stats track times_missed + last_seen', s4.x.times_missed === 1 && s4.x.last_seen === 42 && s4.x.status === 'STILL_LEARNING');
}

/* ---------- CARDS tab (Sort rules merged into Cards) ---------- */
{
  const ids = mkIds(6), stats = { c2: { status: 'KNOWN' } };
  const a = FCQ.sortStart(ids, stats, rngFrom(1), null, { keepOrder: true, includeKnown: true });
  ok('cards: round 1 keeps deck order and includes KNOWN cards when "Not known only" is off', a.queue.join() === ids.join());
  const b = FCQ.sortStart(ids, stats, rngFrom(1), null, { keepOrder: true, includeKnown: false });
  ok('cards: "Not known only" round skips KNOWN cards', b.queue.length === 5 && !b.queue.includes('c2'));
  FCQ.sortMark(a, stats, false, 1); FCQ.sortMark(a, stats, true, 1);
  FCQ.sortBack(a);
  ok('cards: PREV steps back one card and takes it out of its pile', FCQ.sortCurrent(a) === 'c1' && !a.known.includes('c1') && a.learning.join() === 'c0');
  FCQ.sortJump(a, 'c4');
  ok('cards: tapping a list row shows that card next', FCQ.sortCurrent(a) === 'c4' && a.queue.filter(x => x === 'c4').length === 1);
  FCQ.sortJump(a, 'c0');
  ok('cards: tapping an already-marked card re-adds it and clears its mark', FCQ.sortCurrent(a) === 'c0' && !a.learning.includes('c0'));
  let st = FCQ.sortStart(ids, {}, rngFrom(2), null, { keepOrder: true, includeKnown: true }); const s2 = {};
  while (!st.done) FCQ.sortMark(st, s2, FCQ.sortCurrent(st) === 'c3' || FCQ.sortCurrent(st) === 'c5' ? false : true, 1);
  const nx = FCQ.sortNextRound(st, rngFrom(2));
  ok('cards: round summary → next round is Still-learning cards only', st.known.length === 4 && st.learning.length === 2 && nx.queue.slice().sort().join() === 'c3,c5' && nx.round === 2);
  while (!nx.done) FCQ.sortMark(nx, s2, true, 1);
  ok('cards: all marked Know → finished (UI offers Reset deck / Go again)', nx.finished && ids.every(id => FCQ.status(s2, id) === 'KNOWN'));
}

/* ---------- CARDS tab NEXT (v0.8.21): advance without marking ---------- */
{
  const ids = mkIds(5), stats = { c1: { status: 'KNOWN' }, c2: { status: 'STILL_LEARNING' } };
  const before = JSON.stringify(stats);
  const a = FCQ.sortStart(ids, stats, rngFrom(1), null, { keepOrder: true, includeKnown: true });
  FCQ.sortSkip(a, stats);
  ok('next: advances one card without changing any status', FCQ.sortCurrent(a) === 'c1' && JSON.stringify(stats) === before && a.skipped.join() === 'c0');
  FCQ.sortSkip(a, stats); FCQ.sortSkip(a, stats);
  ok('next: card lands in the pile of its current status (KNOWN → Know, STILL_LEARNING → Still learning)', a.known.join() === 'c1' && a.learning.join() === 'c2');
  FCQ.sortBack(a);
  ok('next then PREV: steps back and clears its pile', FCQ.sortCurrent(a) === 'c2' && !a.learning.includes('c2'));
  FCQ.sortSkip(a, stats); FCQ.sortMark(a, stats, true, 1); FCQ.sortSkip(a, stats);
  ok('next on the last card ends the round (summary), not finished while unmarked cards remain', a.done && !a.finished && a.skipped.join() === 'c0,c4');
  const nx = FCQ.sortNextRound(a, rngFrom(4));
  ok('next round = Still learning + unmarked cards', nx.round === 2 && nx.queue.slice().sort().join() === 'c0,c2,c4' && nx.carried === 2);
  while (!nx.done) FCQ.sortMark(nx, stats, true, 1);
  ok('next: all marked Know afterwards → finished', nx.finished);
  const b = FCQ.sortStart(['k1', 'k2'], { k1: { status: 'KNOWN' }, k2: { status: 'KNOWN' } }, rngFrom(1), null, { keepOrder: true, includeKnown: true });
  FCQ.sortSkip(b, {k1:{status:'KNOWN'},k2:{status:'KNOWN'}}); FCQ.sortSkip(b, {k1:{status:'KNOWN'},k2:{status:'KNOWN'}});
  ok('next through an all-KNOWN deck → finished', b.done && b.finished);
}

/* ---------- LEARN ---------- */
{
  // reinsertion 2–3 later
  let reOk = true, reCount = 0, reDist = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const rng = rngFrom(seed), ids = mkIds(12), stats = {};
    const st = FCQ.learnStart(ids, stats, rng, null, 1);
    const id = FCQ.learnCurrent(st), before = st.queue.length;
    FCQ.learnAnswer(st, stats, false, rng, 1);
    const pos = st.queue.indexOf(id);
    // pos is 0-based index in the remaining queue: index 2 → 2 other cards shown first, i.e. it is the 3rd card later
    if (!(pos === 2 || pos === 3) || st.fb.reinsertAt !== pos || st.queue.length !== before) reOk = false;
    reDist.add(pos); reCount++;
    if (FCQ.status(stats, id) !== FCQ.SL) reOk = false;
  }
  ok('learn: missed card re-inserted 2–3 cards later in the same round', reOk && reDist.has(2) && reDist.has(3), 'positions seen=' + [...reDist].join(','));
  // round of 7, STILL_LEARNING first then NEW
  const stats = {}; const ids = mkIds(20);
  ['c15', 'c16'].forEach(id => FCQ.touch(stats, id, { status: 'STILL_LEARNING', times_missed: 1 }, 1));
  FCQ.touch(stats, 'c3', { status: 'KNOWN', mc_ok: true, written_ok: true }, 1);
  const st = FCQ.learnStart(ids, stats, rngFrom(5), null, 1);
  ok('learn: round = 7 cards, STILL_LEARNING first then NEW, no KNOWN', st.queue.length === 7 && st.queue[0] === 'c15' && st.queue[1] === 'c16' && !st.queue.includes('c3'), st.queue.join(','));
  ok('learn: first exposure is multiple choice', FCQ.stageOf(stats, 'c0') === 'mc');
  // KNOWN only after BOTH
  const s2 = {}; const l2 = FCQ.learnStart(['a', 'b', 'c'], s2, rngFrom(2), null, 1);
  const first = FCQ.learnCurrent(l2);
  FCQ.learnAnswer(l2, s2, true, rngFrom(2), 1);
  const afterMc = FCQ.status(s2, first), stageAfter = FCQ.stageOf(s2, first);
  const s3 = {}; FCQ.touch(s3, 'w', { written_ok: false }, 1);
  const l3 = FCQ.learnStart(['w'], s3, rngFrom(1), null, 1);
  // force written stage without MC: must NOT become KNOWN
  s3.w.mc_ok = false; FCQ.learnAnswer(l3, s3, true, rngFrom(1), 1);
  const writtenOnly = FCQ.status(s3, 'w');
  ok('learn: correct MC → STILL_LEARNING (not KNOWN), next appearance is written', afterMc === 'STILL_LEARNING' && stageAfter === 'written');
  ok('learn: written alone never makes KNOWN', writtenOnly !== 'KNOWN');
  const s4 = {}; FCQ.touch(s4, 'k', { status: 'STILL_LEARNING', mc_ok: true }, 1);
  const l4 = FCQ.learnStart(['k', 'z'], s4, rngFrom(1), null, 1);
  while (FCQ.learnCurrent(l4) !== 'k') { FCQ.learnAnswer(l4, s4, true, rngFrom(1), 1); FCQ.learnContinue(l4, ['k', 'z'], s4); }
  FCQ.learnAnswer(l4, s4, false, rngFrom(1), 1);
  ok('learn: missed written stays STILL_LEARNING', FCQ.status(s4, 'k') === 'STILL_LEARNING');
  FCQ.learnContinue(l4, ['k', 'z'], s4);
  const s5 = {}; FCQ.touch(s5, 'k', { status: 'STILL_LEARNING', mc_ok: true }, 1);
  FCQ.learnAnswer(FCQ.learnStart(['k'], s5, rngFrom(1), null, 1), s5, true, rngFrom(1), 1);
  ok('learn: KNOWN after correct MC + correct written', s5.k.status === 'KNOWN' && s5.k.mc_ok && s5.k.written_ok);
  // override undoes a written miss
  const s6 = {}; FCQ.touch(s6, 'o', { status: 'STILL_LEARNING', mc_ok: true }, 1);
  const l6 = FCQ.learnStart(['o', 'p', 'q', 'r'], s6, rngFrom(4), null, 1);
  while (FCQ.learnCurrent(l6) !== 'o') { FCQ.learnAnswer(l6, s6, true, rngFrom(1), 1); FCQ.learnContinue(l6, [], s6); }
  FCQ.learnAnswer(l6, s6, false, rngFrom(1), 1); FCQ.learnOverride(l6, s6, 2);
  const s7 = {}; FCQ.touch(s7, 'v', { status: 'KNOWN' }, 1); FCQ.touch(s7, 'u', { status: 'STILL_LEARNING', mc_ok: true }, 5);
  const l7 = FCQ.learnStart(['u', 'v'], s7, rngFrom(1), 'u', 2);
  ok('learn: 1-card round after that same card → a review card goes first (no back-to-back)', l7.queue[0] === 'v' && l7.queue[1] === 'u');
  FCQ.learnAnswer(l7, s7, true, rngFrom(1), 6);
  ok('learn: a correct answer never demotes a KNOWN review card', s7.v.status === 'KNOWN');
  ok('learn: "I was right" override removes re-insert and counts as correct', s6.o.status === 'KNOWN' && s6.o.times_missed === 0 && !l6.queue.includes('o'));

  // full simulations: no back-to-back, missed sooner than correct, ends all KNOWN
  let b2b = 0, endOk = true, sooner = true, sims = 0, mcGateOk = true;
  for (let seed = 1; seed <= 300; seed++) {
    const rng = rngFrom(seed * 7), n = 2 + (seed % 30), ids = mkIds(n), stats = {};
    let st = FCQ.learnStart(ids, stats, rng, null, 1), last = null, guard = 0, t = 0;
    const missAt = {}, correctAt = {};
    while (guard++ < 20000) {
      if (st.fb) { FCQ.learnContinue(st, ids, stats); continue; }
      if (st.done) { if (st.finished) break; st = FCQ.learnNextRound(st, ids, stats, rng); if (st.finished) break; continue; }
      const id = FCQ.learnCurrent(st);
      t++;
      if (id === last) b2b++;
      if (missAt[id] != null) { if (t - missAt[id] > 4) sooner = false; delete missAt[id]; }
      last = id;
      const wasMc = !FCQ.stat(stats, id).mc_ok;
      const correct = rng() < 0.65;
      FCQ.learnAnswer(st, stats, correct, rng, t);
      if (stats[id].status === 'KNOWN' && !(stats[id].mc_ok && stats[id].written_ok)) mcGateOk = false;
      if (wasMc && stats[id].status === 'KNOWN') mcGateOk = false;
      if (!correct && st.fb.reinsertAt >= 0) missAt[id] = t;
    }
    sims++;
    if (!ids.every(id => FCQ.status(stats, id) === 'KNOWN')) endOk = false;
  }
  ok('learn: never the same card twice in a row (300 sessions)', b2b === 0, 'repeats=' + b2b);
  ok('learn: a missed card comes back within 3 cards (sooner than correct cards, which wait for the next round)', sooner);
  ok('learn: KNOWN only with mc_ok AND written_ok in every simulated answer', mcGateOk);
  ok('learn: rounds continue until every card KNOWN', endOk);
}

/* ---------- multiple choice ---------- */
{
  const cards = mkIds(10).map((id, i) => ({ id, a: 'ans' + (i % 6) }));
  const ch = FCQ.mcChoices('c2', cards, rngFrom(8));
  ok('mc: 1 correct + 3 distinct distractors from the same deck', ch.length === 4 && ch.filter(x => x === 'ans2').length === 1 && new Set(ch).size === 4);
}

/* ---------- written grading ---------- */
{
  const g = (u, a) => FCQ.grade(u, a);
  const r1 = g('Pendelton Departure', 'Pendleton Departure');
  ok('grade: minor typo accepted but flagged', r1.ok && r1.typo, JSON.stringify(r1));
  ok('grade: capitalization ignored, no flag', g('pendleton departure', 'Pendleton Departure').ok && !g('pendleton departure', 'Pendleton Departure').typo);
  ok('grade: frequency digit typo is WRONG (128.757 vs 128.775)', !g('128.757', '128.775').ok && g('128.775', '128.775').ok);
  ok('grade: squadron number exact (HMLA 367 ok, HMLA 376 wrong)', g('hmla 367', 'HMLA 367').ok && g('HMLA367', 'HMLA 367').ok && !g('hmla 376', 'HMLA 367').ok);
  ok('grade: altitude / heading exact', !g('3500', '3000').ok && g('3000', '3000').ok && !g('210', '201').ok);
  ok('grade: digits inside a long answer must match', !g('climb and maintain 4000 feet', 'Climb and maintain 3000 feet').ok);
  ok('grade: very short answers strict (VMA vs VMM)', !g('VMM', 'VMA').ok && g('vma', 'VMA').ok);
  ok('grade: callsign typo flagged (COYOTTE → COYOTE)', g('coyotte', 'COYOTE').ok && g('coyotte', 'COYOTE').typo);
  ok('grade: swapped letters = one typo (COYOET → COYOTE, flagged)', g('COYOET', 'COYOTE').ok && g('COYOET', 'COYOTE').typo && FCQ.lev('coyoet','coyote') === 1);
  ok('grade: wrong word rejected', !g('Miramar Approach', 'Pendleton Departure').ok);
  ok('grade: empty answer wrong', !g('', 'COYOTE').ok);
}

console.log(`\n${passes} passed, ${fails} failed`);
if (fails) process.exit(1);
console.log('ALL QUEUE TESTS PASSED');
