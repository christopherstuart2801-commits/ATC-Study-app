import React, { useState } from 'react';
import { ControlPosition, ATISError } from '../types';
import { audioEngine } from '../utils/audio';
import {
  Radio,
  Volume2,
  VolumeX,
  Compass,
  Shield,
  Layers,
  Award,
  HelpCircle,
  FileText,
  Activity,
  Zap,
  BookOpen,
  PlayCircle,
} from 'lucide-react';

export type AppTab = 'radar' | 'simulation' | 'study' | 'diagram' | 'flashcards' | 'exam' | 'manual' | 'scenarios';

interface HeaderProps {
  activePosition: ControlPosition;
  onPositionChange: (pos: ControlPosition) => void;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  atisInfo: ATISError;
  onUpdateATIS: (newCode: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePosition,
  onPositionChange,
  activeTab,
  onTabChange,
  atisInfo,
  onUpdateATIS,
}) => {
  const [isMuted, setIsMuted] = useState(audioEngine.getMuted());

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.setMuted(next);
  };

  const cycleATIS = () => {
    const codes = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT'];
    const currentIdx = codes.indexOf(atisInfo.code);
    const nextCode = codes[(currentIdx + 1) % codes.length];
    onUpdateATIS(nextCode);
    audioEngine.playSquelch('press');
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Airfield Identity */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl flex items-center justify-center text-emerald-400 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white font-mono">
                KNFG ATC TRAINING AID
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs px-2 py-0.5 rounded border border-amber-500/30 font-semibold font-mono">
                MCAS CAMP PENDLETON
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>Munn Field Airspace Qualification System</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono">Class D 2,500' MSL</span>
            </p>
          </div>
        </div>

        {/* Position & Operational Controls */}
        <div className="flex items-center space-x-3 flex-wrap">
          {/* Position Selection */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
            <span className="text-slate-400 px-2 font-mono flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-sky-400" /> POS:
            </span>
            {(['tower', 'ground', 'flight_data', 'par_asr'] as ControlPosition[]).map((pos) => (
              <button
                key={pos}
                id={`pos-btn-${pos}`}
                onClick={() => onPositionChange(pos)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activePosition === pos
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {pos === 'tower' && 'Tower'}
                {pos === 'ground' && 'Ground'}
                {pos === 'flight_data' && 'Clearance'}
                {pos === 'par_asr' && 'PAR/ASR'}
              </button>
            ))}
          </div>

          {/* Audio Mute Button */}
          <button
            id="audio-mute-toggle"
            onClick={toggleMute}
            title={isMuted ? 'Unmute Audio Squelch & Readbacks' : 'Mute Audio'}
            className={`p-2 rounded-xl border transition-all text-xs font-medium flex items-center space-x-1.5 ${
              isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline font-mono">{isMuted ? 'Muted' : 'Radio On'}</span>
          </button>
        </div>
      </div>

      {/* Live ATIS Ticker Bar */}
      <div className="bg-slate-950 border-t border-b border-slate-800 px-4 py-1.5 text-xs font-mono flex items-center justify-between text-slate-300">
        <div className="flex items-center space-x-3 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            id="atis-code-btn"
            onClick={cycleATIS}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold transition-all flex items-center space-x-1"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>INFO {atisInfo.code}</span>
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-slate-200">
            WIND <strong className="text-emerald-400">{atisInfo.wind}</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-200">
            VIS <strong className="text-emerald-400">{atisInfo.visibility}</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-200">
            CEILING <strong className="text-emerald-400">{atisInfo.ceiling}</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-200">
            ALT <strong className="text-sky-300">{atisInfo.altimeter}</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-200">
            ACTIVE RWY <strong className="text-amber-300">{atisInfo.runwayInUse}</strong>
          </span>
        </div>

        <div className="hidden lg:flex items-center space-x-3 text-slate-400">
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>TWR 128.775</span>
          </span>
          <span className="text-slate-700">|</span>
          <span>GND 121.8</span>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="bg-slate-900 px-4 max-w-7xl mx-auto flex items-center space-x-1 border-t border-slate-800/60 overflow-x-auto text-xs font-mono">
        <button
          id="tab-btn-study"
          onClick={() => onTabChange('study')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'study'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Study Mode</span>
        </button>

        <button
          id="tab-btn-simulation"
          onClick={() => onTabChange('simulation')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'simulation'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Simulation Mode</span>
        </button>

        <button
          id="tab-btn-radar"
          onClick={() => onTabChange('radar')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'radar'
              ? 'border-sky-400 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Interactive Radar</span>
        </button>

        <button
          id="tab-btn-scenarios"
          onClick={() => onTabChange('scenarios')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'scenarios'
              ? 'border-purple-400 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Traffic Scenarios</span>
        </button>

        <button
          id="tab-btn-diagram"
          onClick={() => onTabChange('diagram')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'diagram'
              ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Airfield Diagram</span>
        </button>

        <button
          id="tab-btn-flashcards"
          onClick={() => onTabChange('flashcards')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'flashcards'
              ? 'border-pink-400 text-pink-400 bg-pink-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Flashcards</span>
        </button>

        <button
          id="tab-btn-exam"
          onClick={() => onTabChange('exam')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'exam'
              ? 'border-rose-400 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Qualification Exam</span>
        </button>

        <button
          id="tab-btn-manual"
          onClick={() => onTabChange('manual')}
          className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
            activeTab === 'manual'
              ? 'border-teal-400 text-teal-400 bg-teal-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Reference LOPs</span>
        </button>
      </div>
    </header>
  );
};

