STRIPS section in VECTOR ATC Reference tab via stripsRef(), called from refView() in index.html.

Source of truth for strip *examples* and field labels: NFG FACMAN Appendix D (FIG D-1…D-6) + §6-1-10 / §5-1-10 + TBL 5-3 / 5-4 / 5-5.
Sourced notes: docs/FACMAN-appendix-D-strips.txt (from facman-pages p-155…p-161).

- facmanStripBlock() — Learn ACAD topic 4 (collapsed details): primary FIG D-4 dep (ATLAS40) + FIG D-5 IFR arr (STMPD19) only. Multi-GCA / non-radar / OTP / tower D-1…D-3 / D-6 live in Reference STRIPS.
- stripsRef() — Reference STRIPS: FIG D-1…D-6 + 6-1-10 + compact TBL 5-3/5-4/5-5 abbrevs. Primary: D-4 dep + D-5 arr. MORE order: D-4 OTP (Vista ATLAS22 → STI26 RWY21 → ATLAS22 RWY3), then D-5 multi-GCA/non-radar, D-1 tower IFR (ATLAS40/STMPD19) + D-2 + D-3 + D-1 Vista/CORRI OTP (SWIFT13/SWIFT22), then D-6 overflight/point-out/Fallbrook. Validated App D mocks use figure-identity labels (e.g. `FIG D-4 · ATLAS40 IFR DEPARTURE`), not SAMPLE chrome; no invented fields. STI26 + ATLAS22 RWY3 keep blank CLNC (`—`). Non-radar ACTUAL IFR blank on figure (`—`).
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
