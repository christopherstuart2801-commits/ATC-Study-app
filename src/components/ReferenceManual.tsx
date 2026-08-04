import React, { useState } from 'react';
import { HelpCircle, Search, BookOpen, Shield, FileText, Compass, AlertTriangle } from 'lucide-react';

export const ReferenceManual: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const manualArticles = [
    {
      id: 'art-1',
      section: 'airspace',
      title: 'KNFG Class D Airspace Structure & Boundaries',
      reference: 'KNFG LOP 3710.1 / FAA JO 7400.11',
      content: `KNFG Class D Airspace is defined as that airspace extending upward from the surface up to and including 2,500 feet MSL within a 4.3 NM radius of MCAS Camp Pendleton (Munn Field).
Two-way radio communication must be established with KNFG Tower (Local Control) on 128.775 VHF / 340.2 UHF prior to entering the airspace.
Special boundaries exist adjacent to Oceanside Municipal Airport (Class E/G buffer) and Camp Pendleton Range R-2503 impact area.`,
    },
    {
      id: 'art-2',
      section: 'svfr',
      title: 'Special VFR (SVFR) Coastal Marine Layer Operations',
      reference: '14 CFR 91.157 / KNFG LOP 3710.1',
      content: `Due to frequent coastal marine layer fog at Munn Field, SVFR clearances are governed as follows:
- Rotorcraft / Helicopters: Minimum 1/2 SM ground visibility, clear of clouds.
- Fixed-Wing Aircraft: Minimum 1 SM ground visibility, clear of clouds (daytime only unless pilot/aircraft IFR rated).
- Controller Directive: Non-radar visual separation standards apply. Only one SVFR fixed-wing arrival/departure allowed concurrently unless visual separation is maintained by Tower.`,
    },
    {
      id: 'art-3',
      section: 'cala',
      title: 'Carrier Aircraft Landing Area (CALA) Operating Procedures',
      reference: 'KNFG Facility Manual Section 4',
      content: `CALA is a paved deck layout equipped with optical landing systems for MV-22 Osprey and rotorcraft amphibious assault ship (LHD/LHA) carrier deck qualification.
- Maximum concurrent deck capacity: 2 MV-22 tiltrotors or 4 AH-1/UH-1 helo spots.
- Night CALA ops require activation of deck edge lighting by Ground/Tower.
- Aircraft transitioning between CALA and Runway 21 must receive explicit taxi or hover-taxi clearance across Taxiway Alpha.`,
    },
    {
      id: 'art-4',
      section: 'r2503',
      title: 'R-2503 Restricted Airspace Coordination (BEARMAT)',
      reference: 'Range Control LOA 2024-02',
      content: `Restricted Airspace R-2503 surrounds Camp Pendleton for artillery live-fire, mortar, and close air support training.
- Controlling Agency: Camp Pendleton Range Control ("BEARMAT") on 122.5 VHF / 328.4 UHF.
- KNFG Tower controllers must not clear any aircraft into R-2503 without active range release approval from BEARMAT.
- VFR rotorcraft corridors (e.g. Pulgas Corridor) require positive handoff to BEARMAT.`,
    },
    {
      id: 'art-5',
      section: 'phraseology',
      title: 'Standard Phraseology Cheat Sheet (FAA JO 7110.65)',
      reference: 'FAA JO 7110.65 Chapter 3',
      content: `Key Controller Clearances:
1. Landing Clearance: "[Callsign], RUNWAY 21, CLEARED TO LAND. WIND 220 AT 9."
2. Touch and Go: "[Callsign], RUNWAY 21, CLEARED TOUCH AND GO."
3. Option Clearance: "[Callsign], RUNWAY 21, CLEARED FOR THE OPTION."
4. Hold Short Directive: "[Callsign], TAXI VIA ALPHA, HOLD SHORT RUNWAY 03." (Mandatory runway designator readback).
5. PAR Final Call: "ON GLIDEPATH, ON CENTERLINE. AT DECISION HEIGHT, REPORT RUNWAY IN SIGHT."`,
    },
    {
      id: 'art-6',
      section: 'emergency',
      title: 'Aircraft Emergency & Crash Fire Rescue (CFR) Protocols',
      reference: 'FAA JO 7110.65 Chapter 10',
      content: `In the event of an in-flight emergency or MAYDAY declaration:
1. Obtain Callsign, Aircraft Type, Nature of Emergency, Fuel Remaining, Souls on Board.
2. Alert KNFG Crash Fire Rescue (CFR) Station via crash net hotline immediately.
3. Clear all non-emergency traffic from active runway and approach paths.
4. Provide PAR/ASR approach guidance if low visibility exists.`,
    },
  ];

  const filteredArticles = manualArticles.filter((art) => {
    const matchesSec = selectedSection === 'all' || art.section === selectedSection;
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSec && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 font-mono">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">KNFG LOCAL OPERATING PROCEDURES & REFERENCE MANUAL</h2>
            <p className="text-xs text-slate-400">Searchable Repository of FAA JO 7110.65 Standards, LOPs & Range LOAs</p>
          </div>
        </div>
      </div>

      {/* Search & Section Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search procedures, phraseology, SVFR rules..."
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Manuals' },
            { id: 'airspace', label: 'Airspace' },
            { id: 'svfr', label: 'SVFR Rules' },
            { id: 'cala', label: 'CALA Deck' },
            { id: 'r2503', label: 'Range R-2503' },
            { id: 'phraseology', label: 'Phraseology' },
            { id: 'emergency', label: 'Emergency' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedSection === sec.id
                  ? 'bg-indigo-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Articles Display */}
      <div className="space-y-4">
        {filteredArticles.map((art) => (
          <div key={art.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{art.title}</h3>
                <span className="text-indigo-400 text-xs font-mono">{art.reference}</span>
              </div>
              <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg">
                {art.section}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              {art.content}
            </p>
          </div>
        ))}

        {filteredArticles.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">
            No matching reference manual articles found for "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
};
