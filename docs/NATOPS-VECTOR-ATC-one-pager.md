# VECTOR ATC — Monday Dry Run One-Pager (Gunny Harris)

**Live app:** https://christopherstuart2801-commits.github.io/ATC-Study-app/  
**Build:** **v0.7.3 · rfd-acad** (GitHub Pages)  
**Owner:** LCPL Stuart (CS) · KNFG / MCAS Camp Pendleton (Munn Field) · Radar Final + Radar Flight Data syllabus  
**This sit-down:** Gunny Harris practice dry run → later Captain Lopez / cabin brief → October NATOPS inspection concept  

---

## 1. What it is
Phone-friendly trainee study app tied to the **paper ATC Training Syllabus**, not a generic quiz bank.

| Tab (pitch focus) | Role |
|-------------------|------|
| **Home** | Position chips — **Radar Final** live (Monday demo); **Radar Flight Data** live from Oct 2025 paper (ACAD-0520 / ACAD-0534); other positions empty until paper |
| **Ask** | Pub FIND — search 7110.65 / FACMAN by heading / wording |
| **Learn** | ACAD packets: Lesson Topic → ref checklist → open cite PDF |
| **Reference** | Full publication shelf + section jumps |
| *Sim* | Exists; **de-emphasize** for this brief (not the demo path) |

**Core study loop:** open an ACAD cite → PDF opens on the **real chapter page** via heading Find → optional markup → **← BACK** to the same Learn topic. **PREV/NEXT SECTION** walks **real cites only** (skips ACAD section headers).

---

## 2. Accuracy rule (non-negotiable)
- **Source-anchored only.** Every card, alias, and checklist cite maps to a real pub page / paragraph.
- **No invented** freqs, SIDs, minima, routes, charts, ACAD codes, App D-8, other-position ACADs, or FIG polish.
- Gate: `node scripts/verify-ask-rfc.js` → **ALL CHECKS PASSED** before any push.
- Unphotographed RFD lesson topics, other-position ACADs, TNR manuals, CWT CAT A–I detail, Vengeance/Coyote, **00-80T-114**, FIG/AOM stay **empty / blocked** until official paper or pubs upload.

---

## 3. Demo path (2–3 minutes) — exact taps
1. Open live link → confirm statusbar **v0.7.3 · rfd-acad**.
2. **Home** → **R/FINAL** (Radar Final) if not already selected.
3. **Learn** → **ACAD-0520 Radio & Interphone** (or Basic Radar).
4. Tap checklist cite **7110.65 2-4-3 · Pilot Acknowledgement**.
5. Confirm PDF paints **real JO body** (not blank / not cover) — expect ~**p.79 / 732**, heading **2-4-3**.
6. Tap **NEXT SECTION** → lands on next **real cite** (e.g. 2-4-5), not a header row.
7. Tap **← BACK** → returns to the same Learn checklist (progress tick updates).
8. Optional (30–45 s): **Ask** or **Reference** → FIND `Pilot Acknowledgement` → same JO hit.

---

## 4. Live today vs blocked on paper

**Live**
- Sticky Home / Ask / Learn / Sim / Reference (pitch: four tabs above; Sim quiet)
- **Radar Final** ACAD cite → PDF heading Find + chapter-floor landing (Monday demo lead)
- **Radar Flight Data** chip live from Oct 2025 paper in-hand (cover STUART/CS; overview RDR-3700 / QUAL-6100 / QUAL-6103; **ACAD-0520** + **ACAD-0534** photographed) — same cite → JO/FACMAN PDF open / PREV/NEXT / BACK
- Remaining RFD lesson topics **not photographed** stay empty
- FACMAN + JO sections filled where sourced (BOOK / Ask / flashcard sets)
- GitHub Pages deploy from `ATC-Study-app` (`site/` → Pages)

**Blocked until paper / pubs upload**
- Unphotographed RFD ACADs / other KNFG position ACADs (same packet pattern ready)
- Detailed charts, nav routes, strip guides, TNR manuals, DOD FLIP minima pages
- **00-80T-114** (still blocked — not in app), CWT CAT A–I numbers, Vengeance/Coyote, FIG 2-3 / AOM
- Sign-on → airstation → student/trainer split (planned; not required for concept demo)

---

## 5. Scale plan (all positions)
Same reusable pipeline for every position chip:
1. Upload syllabus packet + pubs for that position  
2. Red Lesson Topic / ACAD codes  
3. 7110.65 + FACMAN (or FAC) ref checklist with heading-based Find  
4. Test Exercise + sourced Quizlets  
5. Verify script green → push to Pages  

**Ask of NATOPS / training:** authorize use of official pubs and paper packets inside this trainee tool; keep content ownership with the squadron syllabus, not ad-hoc notes.

---

## 6. Asks of Radar Chief (Gunny Harris — this dry run)
1. Confirm the accuracy / no-invention rule is the right bar for inspection.  
2. Walk the 2–3 min demo; note any UI or cite-landing friction.  
3. Priority for remaining RFD pages (unphotographed topics) and next position after RFD.  
4. Blessing to brief VECTOR ATC as a **syllabus-aligned study aid** at the October NATOPS visit (not a replacement for pubs or instructors).  
5. Green light for Captain Lopez / cabin brief using the same lean path (no SIM grind).

---

## 7. Monday readiness snapshot
| Item | Status |
|------|--------|
| Live cite PDF paints real chapter | **GO** (smoked 2026-09-19 PT) |
| PREV/NEXT SECTION real cites only | **GO** |
| ← BACK to Learn | **GO** |
| Ask / Reference FIND by heading | **GO** |
| `verify-ask-rfc.js` | **ALL CHECKS PASSED** |
| RFD chip ACAD-0520 / ACAD-0534 (paper) | **GO** (v0.7.3 · rfd-acad) |
| Presentation pack | `docs/MONDAY-DRY-RUN-PRESENTATION.md` |

*Less is more. Accuracy first. Pub page over excerpt chrome. Home / Ask / Learn / Reference — not SIM.*
