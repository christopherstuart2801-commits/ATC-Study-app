import React, { useState, useMemo } from 'react';
import { ControlPosition } from '../types';
import { KNFG_AIRFIELD_INFO } from '../data/knfgData';
import { audioEngine } from '../utils/audio';
import {
  Radio,
  Mic,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Volume2,
  ShieldAlert,
  Sliders,
  Search,
  X,
  Filter,
} from 'lucide-react';

export interface TransmissionLogEntry {
  id: string;
  timestamp: string;
  command: string;
  callsign: string;
  readback: string;
}

interface RadioConsoleProps {
  activePosition: ControlPosition;
  selectedCallsign?: string;
  onSendTransmission: (cmd: string, callsign: string, readback: string) => void;
  transmissions?: TransmissionLogEntry[];
}

export const RadioConsole: React.FC<RadioConsoleProps> = ({
  activePosition,
  selectedCallsign = 'DEVIL 11',
  onSendTransmission,
  transmissions: externalTransmissions = [],
}) => {
  const [selectedFreq, setSelectedFreq] = useState<string>('128.775');
  const [transmissionText, setTransmissionText] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<{
    score: number;
    feedback: string;
    readback: string;
    corrections: string[];
    source?: string;
  } | null>(null);

  // Search & History State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localTransmissions, setLocalTransmissions] = useState<TransmissionLogEntry[]>([
    {
      id: 'tx-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      command: 'DEVIL 11, KNFG TOWER, RUNWAY 21 CLEARED TO LAND, WIND 220 AT 9.',
      callsign: 'DEVIL 11',
      readback: 'CLEARED TO LAND RUNWAY 21, DEVIL 11.',
    },
    {
      id: 'tx-2',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      command: 'SWIFT 22, KNFG TOWER, TAXI VIA ALPHA, HOLD SHORT RUNWAY 03.',
      callsign: 'SWIFT 22',
      readback: 'TAXI VIA ALPHA, HOLD SHORT RUNWAY 03, SWIFT 22.',
    },
    {
      id: 'tx-3',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      command: 'RAIDER 05, KNFG TOWER, CLEARED SPECIAL VFR IN CLASS D AT OR BELOW 1000.',
      callsign: 'RAIDER 05',
      readback: 'CLEARED SPECIAL VFR AT OR BELOW 1000, RAIDER 05.',
    },
  ]);

  // Combine external and local transmission logs without duplicates
  const allTransmissions = useMemo(() => {
    const map = new Map<string, TransmissionLogEntry>();
    [...externalTransmissions, ...localTransmissions].forEach((tx) => {
      if (!map.has(tx.id)) {
        map.set(tx.id, tx);
      }
    });
    return Array.from(map.values());
  }, [externalTransmissions, localTransmissions]);

  // Filter transmission log by callsign or command keyword
  const filteredTransmissions = useMemo(() => {
    if (!searchQuery.trim()) return allTransmissions;
    const q = searchQuery.toLowerCase().trim();
    return allTransmissions.filter(
      (tx) =>
        tx.callsign.toLowerCase().includes(q) ||
        tx.command.toLowerCase().includes(q) ||
        tx.readback.toLowerCase().includes(q)
    );
  }, [allTransmissions, searchQuery]);

  const handleTransmit = async () => {
    if (!transmissionText.trim()) return;

    audioEngine.playSquelch('press');
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/ai/evaluate-phraseology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: transmissionText,
          position: activePosition,
          callsign: selectedCallsign,
          context: `Operations at KNFG Munn Field on ${selectedFreq} MHz`,
        }),
      });

      const data = await res.json();
      setEvalResult(data);

      if (data.readback) {
        audioEngine.speakReadback(data.readback);
        onSendTransmission(transmissionText, selectedCallsign, data.readback);

        const newLog: TransmissionLogEntry = {
          id: 'tx-' + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          command: transmissionText,
          callsign: selectedCallsign,
          readback: data.readback,
        };
        setLocalTransmissions((prev) => [newLog, ...prev]);
      }
    } catch (e) {
      console.error('Failed to evaluate phraseology:', e);
      // Fallback response if network error
      const fallbackReadback = `${selectedCallsign}, ROGER, WILCO.`;
      setEvalResult({
        score: 80,
        feedback: 'Transmission sent.',
        readback: fallbackReadback,
        corrections: [],
      });
      audioEngine.speakReadback(fallbackReadback);
      onSendTransmission(transmissionText, selectedCallsign, fallbackReadback);

      const newLog: TransmissionLogEntry = {
        id: 'tx-' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        command: transmissionText,
        callsign: selectedCallsign,
        readback: fallbackReadback,
      };
      setLocalTransmissions((prev) => [newLog, ...prev]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const setQuickTemplate = (text: string) => {
    setTransmissionText(text.replace('{CALLSIGN}', selectedCallsign));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 font-mono space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">ATC RADIO CONSOLE & PHRASEOLOGY EVALUATOR</h3>
            <p className="text-xs text-slate-400">VHF/UHF Transceiver & FAA JO 7110.65 Standard Checker</p>
          </div>
        </div>

        {/* Selected Frequency Selector */}
        <select
          id="select-radio-freq"
          value={selectedFreq}
          onChange={(e) => setSelectedFreq(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          {KNFG_AIRFIELD_INFO.frequencies.map((f) => (
            <option key={f.service} value={f.vhf}>
              {f.service} ({f.vhf} MHz)
            </option>
          ))}
        </select>
      </div>

      {/* Main Input Box & PTT Button */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            id="input-transmission-text"
            rows={2}
            value={transmissionText}
            onChange={(e) => setTransmissionText(e.target.value)}
            placeholder={`e.g. "${selectedCallsign}, KNFG TOWER, RUNWAY 21 CLEARED TO LAND, WIND 220 AT 9 KNOTS."`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 resize-none font-mono"
          />

          <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
            {/* Target indicator */}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              TARGET: <strong className="text-amber-400">{selectedCallsign}</strong>
            </span>

            <button
              id="btn-transmit-phraseology"
              onClick={handleTransmit}
              disabled={isEvaluating || !transmissionText.trim()}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 shadow-lg ${
                isEvaluating || !transmissionText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 shadow-emerald-500/20'
              }`}
            >
              {isEvaluating ? (
                <>
                  <Zap className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>TRANSMIT PTT</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Phraseology Clips */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Quick Standard Phraseology Templates:</span>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              id="tmpl-land"
              onClick={() => setQuickTemplate('{CALLSIGN}, RUNWAY 21 CLEARED TO LAND, WIND 220 AT 8.')}
              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2 py-1 rounded border border-slate-700/60 text-[11px]"
            >
              Cleared to Land 21
            </button>
            <button
              id="tmpl-touchgo"
              onClick={() => setQuickTemplate('{CALLSIGN}, RUNWAY 21 CLEARED TOUCH AND GO.')}
              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2 py-1 rounded border border-slate-700/60 text-[11px]"
            >
              Cleared Touch & Go
            </button>
            <button
              id="tmpl-holdshort"
              onClick={() => setQuickTemplate('{CALLSIGN}, TAXI VIA ALPHA, HOLD SHORT RUNWAY 03.')}
              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2 py-1 rounded border border-slate-700/60 text-[11px]"
            >
              Hold Short RWY 03
            </button>
            <button
              id="tmpl-svfr"
              onClick={() => setQuickTemplate('{CALLSIGN}, CLEARED SPECIAL VFR IN KNFG CLASS D AT OR BELOW 1,000.')}
              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2 py-1 rounded border border-slate-700/60 text-[11px]"
            >
              SVFR Clearance
            </button>
          </div>
        </div>

        {/* AI Evaluation Results Panel */}
        {evalResult && (
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 mt-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                STANDARD PHRASEOLOGY SCORE:
              </span>
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded border ${
                  evalResult.score >= 90
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : evalResult.score >= 75
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {evalResult.score} / 100
              </span>
            </div>

            <p className="text-slate-300">{evalResult.feedback}</p>

            {/* Readback */}
            <div className="bg-slate-900/90 p-2 rounded border border-slate-800/80">
              <span className="text-amber-400 font-bold block text-[10px] uppercase">Pilot Readback:</span>
              <p className="text-slate-200 italic">"{evalResult.readback}"</p>
            </div>

            {/* Corrections */}
            {evalResult.corrections && evalResult.corrections.length > 0 && (
              <div className="space-y-1">
                <span className="text-rose-400 font-bold text-[10px] uppercase block">Phraseology Defects Identified:</span>
                <ul className="list-disc list-inside text-rose-300/90 text-[11px] space-y-0.5">
                  {evalResult.corrections.map((corr, idx) => (
                    <li key={idx}>{corr}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Radio Transmission History Log Section */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h4 className="font-bold text-xs text-slate-100 uppercase tracking-wider">
              RADIO TRANSMISSION HISTORY LOG
            </h4>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 font-mono font-semibold">
              {filteredTransmissions.length} {filteredTransmissions.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
          </div>

          {searchQuery && (
            <span className="text-[11px] text-slate-400">
              Showing filtered results ({filteredTransmissions.length} of {allTransmissions.length})
            </span>
          )}
        </div>

        {/* Search Bar Input */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              id="input-search-transmission-log"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past transmissions by callsign or command keyword (e.g. DEVIL 11, LAND, TAXI)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                id="btn-clear-transmission-search"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tag Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Quick Filters:
            </span>
            {['DEVIL 11', 'SWIFT 22', 'LAND', 'TAXI', 'SVFR', 'HOLD SHORT'].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => setSearchQuery(searchQuery === keyword ? '' : keyword)}
                className={`px-2 py-0.5 rounded border font-mono transition-all ${
                  searchQuery.toUpperCase() === keyword.toUpperCase()
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {keyword}
              </button>
            ))}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-rose-400 hover:text-rose-300 underline ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filtered Transmissions Log Items List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {filteredTransmissions.length > 0 ? (
            filteredTransmissions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {tx.callsign}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{tx.timestamp}</span>
                </div>
                <p className="text-emerald-300 font-medium text-[11px]">
                  <strong className="text-slate-400 font-semibold">ATC:</strong> "{tx.command}"
                </p>
                <p className="text-slate-300 italic text-[11px]">
                  <strong className="text-slate-500 font-semibold not-italic">PILOT:</strong> "{tx.readback}"
                </p>
              </div>
            ))
          ) : (
            <div className="bg-slate-950/60 p-5 rounded-xl border border-dashed border-slate-800 text-center space-y-1">
              <p className="text-slate-400 font-bold text-xs">No matching transmissions found</p>
              <p className="text-slate-500 text-[11px]">
                No entries match the query "{searchQuery}". Try searching for another callsign or command keyword.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold underline"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

