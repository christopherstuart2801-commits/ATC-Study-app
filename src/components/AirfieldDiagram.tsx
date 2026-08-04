import React, { useState } from 'react';
import { KNFG_AIRFIELD_INFO, KNFG_WAYPOINTS } from '../data/knfgData';
import { MapPin, Info, Compass, Shield, Navigation, AlertTriangle, Layers, Radio } from 'lucide-react';

export const AirfieldDiagram: React.FC = () => {
  const [selectedFacility, setSelectedFacility] = useState<{
    name: string;
    type: string;
    desc: string;
    specs: string;
  } | null>(null);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Compass className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold font-mono text-slate-100">
                KNFG AIRFIELD & AIRSPACE DIAGRAM
              </h2>
              <p className="text-xs text-slate-400">
                MCAS Camp Pendleton (Munn Field) • Airport Diagram & Facility Layout
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg">
            FIELD ELEV: <strong className="text-emerald-400">78 FT MSL</strong>
          </span>
          <span className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg">
            LAT/LONG: <strong className="text-sky-300">33°18'17"N 117°21'20"W</strong>
          </span>
          <span className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg">
            MAG VAR: <strong className="text-amber-300">12°E</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Interactive Diagram */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Navigation className="w-4 h-4 text-emerald-400" />
              INTERACTIVE VECTOR MAP (CLICK FACILITY TO INSPECT)
            </span>
            <span>NORTH UP ↑</span>
          </div>

          <div className="relative w-full aspect-square max-w-[620px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center p-2">
            <svg
              viewBox="0 0 800 800"
              className="w-full h-full text-slate-200 font-mono select-none"
            >
              {/* Background Grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="800" height="800" fill="url(#grid)" />

              {/* Class D Airspace 4.3 NM Circle */}
              <circle
                cx="400"
                cy="400"
                r="350"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="8 6"
              />
              <text x="420" y="70" fill="#38bdf8" fontSize="12" fontWeight="bold">
                KNFG CLASS D AIRSPACE (SUR-2,500' MSL)
              </text>

              {/* R-2503 Restricted Airspace Boundary */}
              <path
                d="M 250 120 L 720 120 L 750 550 L 520 400 Z"
                fill="rgba(239, 68, 68, 0.08)"
                stroke="#f87171"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="560" y="200" fill="#f87171" fontSize="12" fontWeight="bold">
                R-2503 CAMP PENDLETON IMPACT AREA
              </text>

              {/* Runway 03/21 Primary Strip */}
              <g
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() =>
                  setSelectedFacility({
                    name: 'Runway 03/21',
                    type: 'Primary Runway',
                    desc: 'Primary paved runway for fixed-wing and tiltrotor aircraft at Munn Field.',
                    specs: '6,001 FT x 150 FT Asphalt/Concrete • HIRL / REIL / PAPI 3.0°',
                  })
                }
              >
                {/* Extended Runway Centerline */}
                <line
                  x1="220"
                  y1="680"
                  x2="580"
                  y2="120"
                  stroke="rgba(245, 158, 11, 0.3)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Main Runway Surface */}
                <line x1="310" y1="540" x2="490" y2="260" stroke="#334155" strokeWidth="22" strokeLinecap="square" />
                <line x1="310" y1="540" x2="490" y2="260" stroke="#0f172a" strokeWidth="18" strokeLinecap="square" />

                {/* Threshold Markings */}
                <text x="495" y="250" fill="#fbbf24" fontSize="14" fontWeight="bold">
                  21
                </text>
                <text x="285" y="565" fill="#fbbf24" fontSize="14" fontWeight="bold">
                  03
                </text>
              </g>

              {/* Parallel Taxiway Alpha */}
              <line x1="330" y1="550" x2="510" y2="270" stroke="#f59e0b" strokeWidth="4" />
              <text x="520" y="280" fill="#f59e0b" fontSize="11" fontWeight="bold">
                TWY A
              </text>

              {/* Taxiway Connectors B, C, D, E, F */}
              <line x1="350" y1="520" x2="335" y2="530" stroke="#f59e0b" strokeWidth="3" />
              <line x1="400" y1="440" x2="385" y2="450" stroke="#f59e0b" strokeWidth="3" />
              <line x1="450" y1="360" x2="435" y2="370" stroke="#f59e0b" strokeWidth="3" />

              {/* CALA (Carrier Aircraft Landing Area) */}
              <g
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() =>
                  setSelectedFacility({
                    name: 'CALA (Carrier Aircraft Landing Area)',
                    type: 'Deck Simulator Pad',
                    desc: 'Paved amphibious assault ship (LHD/LHA) deck mockup with optical landing system for tiltrotor / helo carrier deck qualification.',
                    specs: 'Capacity: 2 MV-22 Ospreys or 4 AH-1/UH-1 Helicopters',
                  })
                }
              >
                <rect x="520" y="320" width="90" height="50" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" rx="4" />
                <text x="532" y="350" fill="#38bdf8" fontSize="11" fontWeight="bold">
                  CALA DECK
                </text>
              </g>

              {/* Helipads H1 - H8 */}
              <g
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() =>
                  setSelectedFacility({
                    name: 'Helipads H1 - H8',
                    type: 'Helicopter Landing Pads',
                    desc: 'Dedicated rotorcraft landing pads north and south of Taxiway Alpha.',
                    specs: 'Surface: Heavy concrete pads with perimeter lighting',
                  })
                }
              >
                {[
                  { x: 260, y: 460, id: 'H1' },
                  { x: 280, y: 430, id: 'H2' },
                  { x: 300, y: 400, id: 'H3' },
                  { x: 320, y: 370, id: 'H4' },
                ].map((h) => (
                  <g key={h.id}>
                    <circle cx={h.x} cy={h.y} r="10" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                    <text x={h.x - 5} y={h.y + 4} fill="#10b981" fontSize="10" fontWeight="bold">
                      {h.id}
                    </text>
                  </g>
                ))}
              </g>

              {/* Air Traffic Control Tower */}
              <g
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() =>
                  setSelectedFacility({
                    name: 'KNFG Control Tower',
                    type: 'Air Traffic Control Facility',
                    desc: 'Primary Tower cab responsible for KNFG Class D Airspace, Runway 03/21, and Helipads.',
                    specs: 'Frequencies: Tower 128.775 / 340.2 • Ground 121.8',
                  })
                }
              >
                <rect x="360" y="470" width="24" height="24" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" rx="3" />
                <text x="366" y="486" fill="#f8fafc" fontSize="12" fontWeight="bold">
                  T
                </text>
                <text x="390" y="486" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  TOWER
                </text>
              </g>

              {/* PAR Precision Approach Radar Antenna Site */}
              <g
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() =>
                  setSelectedFacility({
                    name: 'PAR Radar Antenna Site',
                    type: 'GCA Precision Radar',
                    desc: 'Precision Approach Radar providing azimuth and elevation guidance for GCA landings on Runway 21.',
                    specs: 'Frequency: 134.1 VHF / 322.4 UHF',
                  })
                }
              >
                <circle cx="480" cy="240" r="8" fill="#f59e0b" />
                <text x="495" y="244" fill="#fbbf24" fontSize="10" fontWeight="bold">
                  PAR SITE
                </text>
              </g>

              {/* VFR Reporting Waypoints */}
              <g>
                <circle cx="200" cy="620" r="6" fill="#38bdf8" />
                <text x="140" y="635" fill="#38bdf8" fontSize="10">
                  OCEANSIDE PIER
                </text>

                <circle cx="180" cy="180" r="6" fill="#38bdf8" />
                <text x="120" y="170" fill="#38bdf8" fontSize="10">
                  SAN ONOFRE
                </text>

                <circle cx="620" cy="380" r="6" fill="#38bdf8" />
                <text x="632" y="384" fill="#38bdf8" fontSize="10">
                  LAKE O'NEILL
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Facility Detail Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 font-mono">
            <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-800">
              <Info className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-sm text-slate-100">FACILITY INSPECTOR</h3>
            </div>

            {selectedFacility ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Facility Name</span>
                  <span className="text-sky-300 font-bold text-base">{selectedFacility.name}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
                  <span className="text-amber-400 font-bold text-xs">{selectedFacility.type}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Description</span>
                  <p className="text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-1">
                    {selectedFacility.desc}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Technical Specifications</span>
                  <p className="text-emerald-400 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-1">
                    {selectedFacility.specs}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-bounce" />
                Click any runway, helipad, CALA deck, or tower icon on the airfield diagram to view technical specs and local operating procedures.
              </div>
            )}
          </div>

          {/* Airfield Operations & LOP Quick Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 font-mono text-xs space-y-3">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4 text-amber-400" />
              KNFG OPERATIONAL RULES & NOISE RESTRICTIONS
            </h4>

            <ul className="space-y-2 text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-slate-100">Primary Runway:</strong> Runway 21 preferred when wind is calm or 180°-240° onshore.
              </li>
              <li>
                <strong className="text-slate-100">CALA Operations:</strong> Max 2 tiltrotors concurrently. Night ops require optical landing deck lighting.
              </li>
              <li>
                <strong className="text-slate-100">Noise Abatement:</strong> Avoid overflight of Oceanside residential areas south of San Luis Rey River below 1,500' MSL.
              </li>
              <li>
                <strong className="text-slate-100">R-2503 Range Entry:</strong> Range clearance required from BEARMAT on 122.5 / 328.4 prior to boundary crossing.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
