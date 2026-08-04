import React, { useState } from 'react';
import { ControlPosition, Aircraft, ATCScenario, ATISError } from './types';
import { PRESET_SCENARIOS } from './data/knfgData';
import { Header, AppTab } from './components/Header';
import { RadarScope } from './components/RadarScope';
import { RadioConsole } from './components/RadioConsole';
import { AirfieldDiagram } from './components/AirfieldDiagram';
import { Flashcards } from './components/Flashcards';
import { QualificationChecklist } from './components/QualificationChecklist';
import { ScenarioGenerator } from './components/ScenarioGenerator';
import { ReferenceManual } from './components/ReferenceManual';
import { StudyMode } from './components/StudyMode';
import { SimulationMode } from './components/SimulationMode';
import { Radio } from 'lucide-react';

export default function App() {
  const [activePosition, setActivePosition] = useState<ControlPosition>('tower');
  const [activeTab, setActiveTab] = useState<AppTab>('study');

  const [atisInfo, setAtisInfo] = useState<ATISError>({
    code: 'BRAVO',
    wind: '220 at 9 knots',
    visibility: '10 SM',
    ceiling: 'Clear',
    temp: '22',
    dewpoint: '14',
    altimeter: '29.98',
    runwayInUse: '21',
    remarks: 'KNFG CLASS D ACTIVE. CALA ACTIVE.',
  });

  // Initialize aircraft list from first scenario
  const [aircraftList, setAircraftList] = useState<Aircraft[]>(
    (PRESET_SCENARIOS[0].aircraftList as Aircraft[]) || []
  );

  const [transmissions, setTransmissions] = useState<
    { id: string; timestamp: string; command: string; callsign: string; readback: string }[]
  >([
    {
      id: 'tx-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      command: 'DEVIL 11, KNFG TOWER, RUNWAY 21 CLEARED TO LAND, WIND 220 AT 9.',
      callsign: 'DEVIL 11',
      readback: 'CLEARED TO LAND RUNWAY 21, DEVIL 11.',
    },
  ]);

  const handleUpdateATISCode = (newCode: string) => {
    setAtisInfo({ ...atisInfo, code: newCode });
  };

  const handleSendTransmission = (cmd: string, callsign: string, readback: string) => {
    const newTx = {
      id: 'tx-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      command: cmd,
      callsign,
      readback,
    };
    setTransmissions([newTx, ...transmissions.slice(0, 9)]);
  };

  const handleLoadScenario = (scen: ATCScenario) => {
    setAircraftList((scen.aircraftList as Aircraft[]) || []);
    setActivePosition(scen.position);
    setAtisInfo({
      ...atisInfo,
      wind: scen.weather.wind,
      visibility: scen.weather.visibility,
      ceiling: scen.weather.ceiling,
      altimeter: scen.weather.altimeter,
      runwayInUse: scen.runwayInUse,
    });
    setActiveTab('simulation');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* Top Header & Navigation */}
      <Header
        activePosition={activePosition}
        onPositionChange={setActivePosition}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        atisInfo={atisInfo}
        onUpdateATIS={handleUpdateATISCode}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'study' && <StudyMode />}

        {activeTab === 'simulation' && <SimulationMode />}

        {activeTab === 'radar' && (
          <div className="space-y-6">
            <RadarScope
              aircraftList={aircraftList}
              onUpdateAircraft={setAircraftList}
              activePosition={activePosition}
              onSendTransmission={handleSendTransmission}
            />

            {/* Radio Transceiver & Evaluator Console */}
            <div className="max-w-7xl mx-auto px-4">
              <RadioConsole
                activePosition={activePosition}
                selectedCallsign={aircraftList[0]?.callsign || 'DEVIL 11'}
                onSendTransmission={handleSendTransmission}
                transmissions={transmissions}
              />
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <ScenarioGenerator
            activePosition={activePosition}
            onLoadScenario={handleLoadScenario}
          />
        )}

        {activeTab === 'diagram' && <AirfieldDiagram />}

        {activeTab === 'flashcards' && <Flashcards />}

        {activeTab === 'exam' && (
          <QualificationChecklist
            activePosition={activePosition}
            onPositionChange={setActivePosition}
          />
        )}

        {activeTab === 'manual' && <ReferenceManual />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>KNFG ATC TRAINING AID • MCAS CAMP PENDLETON</span>
        </div>
        <div>
          <span>FAA JO 7110.65 / NAVAIR 00-80T-114 STANDARDS</span>
        </div>
      </footer>
    </div>
  );
}

