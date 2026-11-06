# Tower paper Learn / LQS — v0.8.36

## Provenance and boundaries

The four supplied syllabus photos were read directly from `/workspace/vector-tower-paper/`:

- Topic 1: `c3d1b48880a422e61f66a3592abc199f656d437d3fa76fc544c5eb9dc3d69eea.jpg`
- Topic 2: `d6ad3d0282b862dc12f60509dae0ff6ab2b2b1a6bf0af840b5651c21fd14d5eb.jpg`
- Topic 3: `02f62092119782b934a97f7714821fa84ad406721001218e73646c81bc9d3454.jpg`
- Topic 4: `a24ca93d19b045f24f7a65b7ff6348b7202c7f61d5fb2adc8f39310ad3b989aa.jpg`

Photos supply syllabus topics/references, **not an answer key**. They are not shipped.
The packet is explicitly shared by CD/GND/LCL; it is not three position-specific qualification syllabi.
The new bank has 22 written-answer LQs and 22 matching uniquely defined flashcards:

| Paper topic | ACAD | LQs | Cards |
| --- | --- | ---: | ---: |
| 1 Radio and Interphone Communications | 0520 | 6 | 6 |
| 2 Aircraft Movement Data | 0521 | 5 | 5 |
| 2 Flight Progress Strips | 0522 | 5 | 5 |
| 3 ATC Clearance Knowledge | 0523 | 6 | 6 |
| 4 Tower Visibility Observations (Open Book) | paper has no ACAD number | 0 | 0 |

Each answer was checked using `pdftotext -layout` on existing JO 7110.65BB and NFG FACMAN July 2026 PDFs.
Each item has `src.doc/pg/pa/hl`; `pg` is the actual paragraph/table identifier, not a guessed PDF-page offset.
Tower cite metadata maps to independently checked one-based PDF body pages. Existing JO Change 2 was checked;
it contains no replacement body paragraphs for the JO rules in the new bank.
All 22 highlights are verified against the actual cited page (or its immediate continuation) in the targeted test.

No inferred LOA clearances, initial altitudes, minima, frequencies, routes or visibility answers were added.
FLIP refs open the four already-present ODP study plates, labelled to verify currency; no FLIP-answer items added.
No photos, extracted source files, new PDFs or controlled publications were added to the app.
No backend/login/PWA work. Existing radar syllabus data is unchanged.

## Honest blocks / edition notes

- SOCAL TRACON LOA: IFR departures/initial SID altitudes and clearances, VFR-on-top, clearance priority.
- CNAF M-3710: 5.3.4.1 takeoff minimums, 5.3.5.2 multipiloted approach criteria.
- NAVAIR Weather Observations by Control Tower Personnel: all seven visibility rubric areas. No source = no LQs.
- SAN TEC route entry/read: current FAA Chart Supplement listing is not loaded. FACMAN 5-1-9 is linked for
  context/classifications only, not substituted for the actual SAN listing.
- Photo says 1939/4777/4779; actual July 2026 FACMAN 8-1-4 says **1939/4977/4779**. UI preserves and explains
  this difference instead of manufacturing a 4777-line rule.

Blocked rows have no click actions, disabled dropdown choices and no PDF Prev/Next destinations.
Blocked refs are excluded from completion totals. Tower ref checkoffs are namespaced separately from radar.
The visibility topic cannot launch an empty test or the radar Topic 4 strip component.
Long written responses retain the app's existing compare/self-grade pattern.

## Verification

- `node scripts/test-fc-queue.cjs`: 49 passed, 0 failed.
- `node scripts/test-my-sets.cjs`: all 10 checks passed, no page errors.
- `node scripts/test-tower-paper.cjs`: 7 grouped checks passed, including actual PDF excerpt and page checks,
  paper refs, source fields, IDs, tags, written-only LQs, missing-pub blocks and radar-progress isolation.
- `node site/scripts/verify-ask-rfc.cjs`: same 12 baseline failures, no new failures (baseline captured before edits).
- Mobile Chromium smoke (390×844): CD/GND/LCL open shared packet; blocked refs have no action;
  no horizontal overflow; clearance relay opens JO PDF page 218; written LQ input/reveal renders; no page errors.
- Root and site HTML are byte-identical.
