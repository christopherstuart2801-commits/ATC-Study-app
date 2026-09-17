STRIPS section in VECTOR ATC Reference tab via stripsRef(), called from refView() in index.html.

Source of truth for strip *examples* and field labels: NFG FACMAN Appendix D (FIG D-1…D-6) + §6-1-10 / §5-1-10 + TBL 5-3 / 5-4 / 5-5.
Sourced notes: docs/FACMAN-appendix-D-strips.txt (from facman-pages p-155…p-161).

- facmanStripBlock() — Learn ACAD topic 4 (collapsed details): primary FIG D-4 dep (ATLAS40) + FIG D-5 IFR arr (STMPD19) only. Multi-GCA / non-radar / OTP / tower D-1…D-3 / D-6 live in Reference STRIPS.
- stripsRef() — Reference STRIPS: FIG D-1…D-6 + 6-1-10 + compact TBL 5-3/5-4/5-5 abbrevs. Primary: D-4 dep + D-5 arr. MORE order: D-4 OTP (Vista ATLAS22 → STI26 RWY21 → ATLAS22 RWY3), then D-5 multi-GCA/non-radar, D-1 tower IFR (ATLAS40/STMPD19) + D-2 + D-3 + D-1 Vista/CORRI OTP (SWIFT13/SWIFT22), then D-6 overflight/point-out/Fallbrook. Validated App D mocks use figure-identity labels (e.g. `FIG D-4 · ATLAS40 IFR DEPARTURE`), not SAMPLE chrome; no invented fields. STI26 + ATLAS22 RWY3 keep blank CLNC (`—`). Non-radar strip has no ACTUAL IFR box (TIME AT ID FIX + INBOUND TO TOWER only).
- FC_SETS.termstrip — JO 7110.65 TBL 2-3-3 / 2-3-4 box meanings.
- FC_EXTRA lcl — FIG D-1/D-2/D-3 tower strip flashcards.
- FC_EXTRA rfd/fin — FIG D-4 (dep + OTP) / D-5 (arr + multi-GCA + non-radar) + FIG D-6 (overflight / point-out / Fallbrook) + 6-1-10 / 5-1-10 flashcards.
- scratchpad — TBL 6-4 only.
- pass-a-bay Ask prefers FACMAN 6-3-4 / 6-3-6 / 6-3-7 + TBL 6-4.

User-authored reference/knfg-flight-strip-field-reference.html remains a training aid draft; app Reference STRIPS now follows Appendix D.

2026-09-14 3am night grind: FIG D-5 non-radar SAMPLE IFR cell corrected to blank (match p-160); Learn Topic 4 strip block slimmed to primary D-4/D-5; stripsRef gained TBL 5-3/5-4/5-5 abbrev panel. App D FIG D-1…D-6 covered; App D-8 VFR strip abbreviations listed in TOC but not in the 161-page July 2025 PDF.
2026-09-14 9pm night grind: FIG D-3 Reference STRIPS expanded from dep-only to STI76 dep + ATL40 arr + ATL40 pattern (match p-158). ask-aliases.json synced with live ASK_ALIASES for FIG D-4 / D-5. App D FIG D-1…D-6 still covered; App D-8 still absent from July 2025 PDF body.
2026-09-14 11pm night grind: FIG D-5 multi-GCA SAMPLE/FC/BOOK — PA struck on cleared APCH rows 1–2 (later corrected 2026-09-15 1am: figure shows PA unstruck). App D FIG D-1…D-6 still covered; App D-8 still absent from July 2025 PDF body.
2026-09-15 1am night grind: FIG D-5 multi-GCA SAMPLE/FC/BOOK — PA unstruck on rows 1–2 (match p-160 figure; instructional note still teaches checkmark-through once cleared). App D FIG D-1…D-6 covered; App D-8 still absent from July 2025 PDF body.
2026-09-15 3am night grind: stripsRef() App D FIG D-1…D-6 labels drop SAMPLE chrome → `FIG D-N · …`; Radar Final Learn topic list drops acadChipRow (chips remain on TEST exercise). App D-8 still absent from July 2025 PDF body.
2026-09-15 5am night grind: FIG D-2 TYPE STRIP uses diagonal V/D mark (match p-157); primary FIG D-5 STMPD19 TYPE APCH uses slash-through TZ (not TZ✓); Radar Final Learn drops duplicate ACAD warn pill on live topic list + PERF line on topic detail (req stays as one muted line). App D-8 still absent from July 2025 PDF body.
2026-09-15 9pm night grind: leftover TZ✓ prose in stripsRef field example, fig-d5-arr FC, and BOOK FIG D-5 duals aligned to slash-through TZ (match primary mock / p-160); stripsRef intro says primary not sample. App D FIG D-1…D-6 covered; App D-8 still absent from July 2025 PDF body.
2026-09-15 11pm night grind: primary FIG D-5 STMPD19 TYPE APCH corrected to plain TZ (match p-160 figure; instructional note still teaches checkmark-through once cleared). Radar Final TEST drops SAMPLE when pack is not demo. App D FIG D-1…D-6 covered; App D-8 still absent from July 2025 PDF body.
2026-09-16 1am night grind: FIG D-5 non-radar mock drops invented IFR/`—` column — p-160 template is TIME AT ID FIX + INBOUND TO TOWER only. App D FIG D-1…D-6 covered; App D-8 still absent from July 2025 PDF body.
2026-09-16 3am night grind: FIG D-6 Reference mock/FC/BOOK field headers match p-161 (ROUTE THROUGH LIMA AIRSPACE · TIME AT ID FIX · HANDOFF FACILITY/TIME · TIME ENTERING LIMA · POINTOUT FACILITY · CLEARANCE VOID TIME V< · DEPT POINT). Final ACAD already slim — no further clutter cut. App D-8 still absent from July 2025 PDF body.
2026-09-16 5am night grind: stripsRef mock column count follows each figure (CSS grid-auto-flow column — no fixed 12-col grid). Header labels aligned to FIG D-4/D-5/D-6 pub wording (DEPT POINT · RLS TIME · CLNC ISSUED · PREV/COORD FIX · ACTUAL IFR · TYPE APCH · ROUTE THROUGH LIMA AIRSPACE · ROUTE OF FLIGHT, CLR LIMIT / VOID · ALTITUDE / RDR ID STATUS). Final ACAD unchanged. App D-8 still absent from July 2025 PDF body.
2026-09-16 9pm night grind: Reference STRIPS abbrev panel adds TBL 6-3 (6-1-11) radar strip marks (SA/PA/TZ…/QUNTN/BLDG…) beside TBL 5-3/5-4/5-5; BOOK dual key `TBL 6-3`; Ask alias for TBL 6-3 / radar strip abbreviations. App D FIG D-1…D-6 still covered; App D-8 still absent from July 2025 PDF body.
