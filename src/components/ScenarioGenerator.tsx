import React, { useState } from 'react';
import { ATCScenario, Aircraft, ControlPosition } from '../types';
import { PRESET_SCENARIOS } from '../data/knfgData';
import { audioEngine } from '../utils/audio';
import {
  Layers,
  Sparkles,
  CloudFog,
  Play,
  Zap,
  ShieldAlert,
  Sliders,
  Check,
  Compass,
  Wind,
} from 'lucide-react';

interface ScenarioGeneratorProps {
  activePosition: ControlPosition;
  onLoadScenario: (scenario: ATCScenario) => void;
}

export const ScenarioGenerator: React.FC<ScenarioGeneratorProps> = ({
  activePosition,
  onLoadScenario,
}) => {
  const [scenarios, setScenarios] = useState<ATCScenario[]>(PRESET_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PRESET_SCENARIOS[0].id);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState<boolean>(false);
  const [customDifficulty, setCustomDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Emergency'>('Intermediate');
  const [focusTopic, setFocusTopic] = useState<string>('Osprey Division & SVFR Low Visibility');

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleGenerateCustom = async () => {
    setIsGeneratingCustom(true);
    audioEngine.playSquelch('press');

    try {
      const res = await fetch('/api/ai/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: activePosition,
          difficulty: customDifficulty,
          focusArea: focusTopic,
        }),
      });

      const data = await res.json();
      const newScen: ATCScenario = {
        id: 'scen-ai-' + Date.now(),
        title: data.title || 'AI Custom KNFG Traffic Problem',
        position: activePosition,
        difficulty: customDifficulty,
        weather: {
          visibility: data.weather || '3 SM',
          ceiling: '1000 FT',
          wind: data.wind || '220 at 10 knots',
          altimeter: data.altimeter || '29.92',
          condition: 'MVFR',
        },
        runwayInUse: (data.runwayInUse as '03' | '21') || '21',
        objective: data.objective || 'Manage complex military traffic arrivals and departures.',
        aircraftList: (data.trafficList || []).map((t: any, idx: number) => ({
          id: 'ac-ai-' + idx + '-' + Date.now(),
          callsign: t.callsign || `RAIDER ${idx + 1}`,
          type: t.type || 'MV-22B',
          category: t.type === 'MV-22B' ? 'tiltrotor' : t.type === 'AH-1Z' ? 'rotary' : 'jet',
          x: (Math.random() * 4 - 2),
          y: (Math.random() * 4 - 2),
          altitude: t.altitude || 1500,
          heading: t.heading || 30,
          speed: t.speed || 120,
          targetAltitude: t.altitude || 1000,
          targetHeading: t.heading || 30,
          targetSpeed: t.speed || 120,
          squawk: t.squawk || '4211',
          status: 'inbound',
          history: [],
        })),
      };

      setScenarios([newScen, ...scenarios]);
      setSelectedScenarioId(newScen.id);
    } catch (e) {
      console.error('Failed to generate scenario:', e);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handleApplyToRadar = () => {
    if (selectedScenario) {
      onLoadScenario(selectedScenario);
      audioEngine.playSquelch('press');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 font-mono">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">KNFG TRAFFIC SCENARIO GENERATOR</h2>
            <p className="text-xs text-slate-400">Load authentic operational problems & AI traffic scenarios into the Radar Scope</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Preset Scenarios Selector List */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-slate-100 border-b border-slate-800 pb-2">
            PRESET & CUSTOM SCENARIOS
          </h3>

          <div className="space-y-2">
            {scenarios.map((scen) => (
              <button
                key={scen.id}
                onClick={() => setSelectedScenarioId(scen.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                  selectedScenarioId === scen.id
                    ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-sm">{scen.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      scen.difficulty === 'Emergency'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : scen.difficulty === 'Advanced'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {scen.difficulty}
                  </span>
                </div>
                <p className="text-slate-400 line-clamp-2 text-[11px]">{scen.objective}</p>
              </button>
            ))}
          </div>

          {/* AI Custom Generator Controls */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 pt-3">
            <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> AI CUSTOM SCENARIO BUILDER:
            </span>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Target Difficulty:</label>
                <select
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="Beginner">Beginner VFR</option>
                  <option value="Intermediate">Intermediate Mixed Traffic</option>
                  <option value="Advanced">Advanced High-Density</option>
                  <option value="Emergency">Emergency GCA / Low Fuel</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Focus Practice Area:</label>
                <input
                  type="text"
                  value={focusTopic}
                  onChange={(e) => setFocusTopic(e.target.value)}
                  placeholder="e.g. Osprey division formation touch & go"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded p-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleGenerateCustom}
                disabled={isGeneratingCustom}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg transition-all flex items-center justify-center space-x-2 text-xs shadow-md mt-2"
              >
                {isGeneratingCustom ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    <span>Building Scenario...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Scenario</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Selected Scenario Details & Injection Panel */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {selectedScenario ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-amber-400 text-xs font-bold block uppercase">CURRENTLY SELECTED SCENARIO</span>
                  <h3 className="text-xl font-bold text-slate-100">{selectedScenario.title}</h3>
                </div>

                <button
                  onClick={handleApplyToRadar}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>LOAD INTO RADAR SCOPE</span>
                </button>
              </div>

              {/* Weather & Objective */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <CloudFog className="w-3.5 h-3.5 text-sky-400" /> Weather Briefing:
                  </span>
                  <p className="text-sky-300 font-bold">{selectedScenario.weather.visibility}</p>
                  <p className="text-slate-400">Ceiling: {selectedScenario.weather.ceiling}</p>
                  <p className="text-slate-400">Wind: {selectedScenario.weather.wind}</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" /> Airfield Setup:
                  </span>
                  <p className="text-amber-300 font-bold">Active Runway: {selectedScenario.runwayInUse}</p>
                  <p className="text-slate-400">Altimeter: {selectedScenario.weather.altimeter}</p>
                  <p className="text-slate-400">Condition: {selectedScenario.weather.condition}</p>
                </div>
              </div>

              {/* Objective */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
                <span className="text-amber-400 font-bold block text-[10px] uppercase">CONTROLLER LEARNING OBJECTIVE:</span>
                <p className="text-slate-200 leading-relaxed">{selectedScenario.objective}</p>
              </div>

              {/* Traffic List */}
              <div className="space-y-2">
                <span className="text-slate-400 text-xs font-bold uppercase block">INJECTED TRAFFIC LIST:</span>
                <div className="space-y-2 text-xs">
                  {selectedScenario.aircraftList.map((ac, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-slate-200"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-amber-300 font-bold">{ac.callsign}</span>
                          <span className="text-slate-500 text-[10px] ml-2">({ac.type})</span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px] text-slate-400">
                        <span>{ac.altitude} FT</span> • <span>{ac.speed} KTS</span> • <span>SQK {ac.squawk}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">Select a scenario from the list.</div>
          )}
        </div>
      </div>
    </div>
  );
};
