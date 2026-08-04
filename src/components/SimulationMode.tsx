import React, { useState, useEffect, useRef } from 'react';
import { PRESET_SCENARIOS, KNFG_WAYPOINTS } from '../data/knfgData';
import { Aircraft, ATCScenario, SimEvaluation, ControlPosition } from '../types';
import { audioEngine } from '../utils/audio';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Radio,
  Volume2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  Target,
  Send,
  Sparkles,
  RefreshCw,
  Sliders,
  Wind,
  Gauge,
  Thermometer,
  TrendingDown,
  TrendingUp,
  CloudRain,
  Compass,
  AlertOctagon,
  BarChart3,
  Clock,
  CheckCircle,
  ShieldCheck,
  ThumbsUp,
  MessageSquareCode,
} from 'lucide-react';

export const SimulationMode: React.FC = () => {
  // Selected Scenario
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PRESET_SCENARIOS[0].id);
  const activeScenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [simTime, setSimTime] = useState<number>(0); // seconds
  const [aircraftList, setAircraftList] = useState<Aircraft[]>(
    (activeScenario.aircraftList as Aircraft[]) || []
  );
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>(
    aircraftList[0]?.id || ''
  );

  // Dynamic Weather State
  const [altimeter, setAltimeter] = useState<number>(29.92);
  const [altimeterTrend, setAltimeterTrend] = useState<'rising' | 'falling' | 'steady'>('steady');
  const [windDir, setWindDir] = useState<number>(220);
  const [windSpeed, setWindSpeed] = useState<number>(12);
  const [windGust, setWindGust] = useState<number>(18);
  const [tempC, setTempC] = useState<number>(22);
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  // Controller Performance & Compliance State
  const [lastCommandSimTime, setLastCommandSimTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [complianceScores, setComplianceScores] = useState<number[]>([]);

  // Command Input
  const [customCommandText, setCustomCommandText] = useState<string>('');
  const [evalHistory, setEvalHistory] = useState<SimEvaluation[]>([]);
  const [overallScore, setOverallScore] = useState<number>(100);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Scenario
  const handleSelectScenario = (scenId: string) => {
    const scen = PRESET_SCENARIOS.find((s) => s.id === scenId);
    if (!scen) return;

    setSelectedScenarioId(scenId);
    setAircraftList((scen.aircraftList as Aircraft[]).map((ac) => ({
      ...ac,
      history: ac.history || [{ x: ac.x || 0, y: ac.y || 0 }],
      targetAltitude: ac.targetAltitude || ac.altitude || 1000,
      targetHeading: ac.targetHeading || ac.heading || 210,
      targetSpeed: ac.targetSpeed || ac.speed || 120,
    } as Aircraft)));
    setSelectedAircraftId(scen.aircraftList[0]?.id || '');
    setSimTime(0);
    setIsPlaying(true);
    setEvalHistory([]);
    setOverallScore(100);
    setSafetyAlert(null);
    setAltimeter(29.92);
    setAltimeterTrend('steady');
    setWindDir(220);
    setWindSpeed(12);
    setWindGust(18);
    setWeatherAlert(null);
    setResponseTimes([]);
    setComplianceScores([]);
    setLastCommandSimTime(0);
    audioEngine.playSquelch('press');
  };

  // Reset current scenario
  const handleResetScenario = () => {
    handleSelectScenario(selectedScenarioId);
  };

  // Weather Dynamic Micro-fluctuations over simulation ticks
  useEffect(() => {
    if (!isPlaying) return;

    const weatherInterval = setInterval(() => {
      // Small pressure fluctuation every 5 simulation seconds
      if (simTime % 5 === 0 && simTime > 0) {
        const drift = (Math.random() - 0.5) * 0.02;
        setAltimeter((prev) => {
          const newVal = Math.max(29.50, Math.min(30.30, parseFloat((prev + drift).toFixed(2))));
          if (newVal > prev) setAltimeterTrend('rising');
          else if (newVal < prev) setAltimeterTrend('falling');
          else setAltimeterTrend('steady');
          return newVal;
        });

        // Small wind vector jitter
        const dirJitter = Math.floor((Math.random() - 0.5) * 6);
        setWindDir((prev) => (prev + dirJitter + 360) % 360);

        const spdJitter = Math.floor((Math.random() - 0.5) * 4);
        setWindSpeed((prev) => {
          const newSpd = Math.max(4, Math.min(35, prev + spdJitter));
          setWindGust(newSpd + Math.floor(Math.random() * 10) + 2);
          return newSpd;
        });
      }

      // Trigger wind shear or gust alert if wind speed > 22 kts or crosswind > 14 kts
      const runwayHeading = 210;
      const angleRad = Math.abs((windDir - runwayHeading) * Math.PI / 180);
      const crosswindComp = Math.round(windGust * Math.sin(angleRad));

      if (crosswindComp > 14) {
        setWeatherAlert(`ALERT: HIGH CROSSWIND (${crosswindComp} KTS) ON RUNWAY 21`);
      } else if (windGust > 25) {
        setWeatherAlert(`WARNING: LOW-LEVEL WIND SHEAR REPORTED ON 2-MILE FINAL (GUSTS TO ${windGust} KTS)`);
      } else {
        setWeatherAlert(null);
      }
    }, 1000 / simSpeed);

    return () => clearInterval(weatherInterval);
  }, [isPlaying, simTime, simSpeed, windDir, windGust]);

  // Simulation Tick Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimTime((prev) => prev + 1);

      setAircraftList((prevList) => {
        const updated = prevList.map((ac) => {
          // Calculate heading turn towards targetHeading
          let curHeading = ac.heading;
          if (curHeading !== ac.targetHeading) {
            const diff = (ac.targetHeading - curHeading + 360) % 360;
            const step = diff > 180 ? -2 : 2;
            curHeading = (curHeading + step + 360) % 360;
          }

          // Calculate speed adjustments
          let curSpeed = ac.speed;
          if (curSpeed < ac.targetSpeed) curSpeed += 1;
          if (curSpeed > ac.targetSpeed) curSpeed -= 1;

          // Calculate altitude adjustments
          let curAlt = ac.altitude;
          if (curAlt < ac.targetAltitude) curAlt += 15;
          if (curAlt > ac.targetAltitude) curAlt -= 15;

          // Calculate position updates based on speed and heading
          // Speed in knots -> NM per second = speed / 3600
          const speedNMPerSec = (curSpeed / 3600) * simSpeed;
          const rad = (curHeading * Math.PI) / 180;
          const dx = Math.sin(rad) * speedNMPerSec;
          const dy = Math.cos(rad) * speedNMPerSec;

          const newX = ac.x + dx;
          const newY = ac.y + dy;

          const newHistory = [...(ac.history || []).slice(-15), { x: newX, y: newY }];

          return {
            ...ac,
            x: newX,
            y: newY,
            heading: Math.round(curHeading),
            speed: Math.round(curSpeed),
            altitude: Math.round(curAlt),
            history: newHistory,
          };
        });

        // Check for safety separation issues
        checkSeparation(updated);

        return updated;
      });
    }, 1000 / simSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  // Check separation safety standards
  const checkSeparation = (list: Aircraft[]) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a1 = list[i];
        const a2 = list[j];

        const distNM = Math.sqrt(Math.pow(a1.x - a2.x, 2) + Math.pow(a1.y - a2.y, 2));
        const altDiff = Math.abs(a1.altitude - a2.altitude);

        if (distNM < 1.0 && altDiff < 500) {
          const msg = `WARNING: LOSS OF SEPARATION BETWEEN ${a1.callsign} AND ${a2.callsign} (${distNM.toFixed(1)} NM, ${altDiff} FT)`;
          setSafetyAlert(msg);
          audioEngine.playSquelch('release');
          setOverallScore((prev) => Math.max(40, prev - 1));
          return;
        }
      }
    }
    setSafetyAlert(null);
  };

  // Canvas Radar Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = width / 12; // 12 NM wide canvas (-6 to +6 NM)

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Radial dark green glow
    const radialGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.5);
    radialGrad.addColorStop(0, '#064e3b');
    radialGrad.addColorStop(0.8, '#020617');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw Range Rings (2 NM, 4.3 NM Class D, 6 NM)
    ctx.lineWidth = 1;
    [2, 4.3, 6].forEach((rNM) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rNM * scale, 0, Math.PI * 2);
      ctx.strokeStyle = rNM === 4.3 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(30, 41, 59, 0.8)';
      ctx.setLineDash(rNM === 4.3 ? [4, 4] : []);
      ctx.stroke();

      if (rNM === 4.3) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText('CLASS D (4.3 NM)', cx + rNM * scale - 75, cy - 5);
      }
    });
    ctx.setLineDash([]);

    // Draw Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.stroke();

    // Draw Runway 03/21 at Center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((212 * Math.PI) / 180);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-3, -25, 6, 50); // Runway bar
    ctx.restore();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('RWY 21', cx - 15, cy + 35);
    ctx.fillText('RWY 03', cx - 15, cy - 30);

    // Draw CALA Deck Spot
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    const calaX = cx + 0.4 * scale;
    const calaY = cy - -0.6 * scale;
    ctx.strokeRect(calaX - 8, calaY - 12, 16, 24);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px monospace';
    ctx.fillText('CALA', calaX - 10, calaY - 15);

    // Draw Waypoints
    KNFG_WAYPOINTS.forEach((wp) => {
      const wx = cx + wp.x * scale;
      const wy = cy - wp.y * scale;

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(wx, wy, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(wp.code, wx + 4, wy - 4);
    });

    // Draw Aircraft Blips & Targets
    aircraftList.forEach((ac) => {
      const ax = cx + ac.x * scale;
      const ay = cy - ac.y * scale;
      const isSelected = ac.id === selectedAircraftId;

      // Draw trail history
      if (ac.history && ac.history.length > 1) {
        ctx.beginPath();
        ac.history.forEach((h, idx) => {
          const hx = cx + h.x * scale;
          const hy = cy - h.y * scale;
          if (idx === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        });
        ctx.strokeStyle = isSelected ? 'rgba(52, 211, 153, 0.4)' : 'rgba(148, 163, 184, 0.2)';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Target heading line
      const hRad = (ac.heading * Math.PI) / 180;
      const lineLen = 20;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.sin(hRad) * lineLen, ay - Math.cos(hRad) * lineLen);
      ctx.strokeStyle = isSelected ? '#10b981' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Blip symbol
      ctx.fillStyle = isSelected ? '#10b981' : ac.isEmergency ? '#f43f5e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(ax, ay, isSelected ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(ax, ay, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Data Block Tag
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(ax + 8, ay - 18, 75, 26);
      ctx.strokeStyle = isSelected ? '#10b981' : 'rgba(51, 65, 85, 0.8)';
      ctx.strokeRect(ax + 8, ay - 18, 75, 26);

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isSelected ? '#34d399' : '#f8fafc';
      ctx.fillText(ac.callsign, ax + 12, ay - 7);

      ctx.font = '8px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(ac.altitude / 100)}  ${ac.speed}k`, ax + 12, ay + 3);
    });

    // Sweep line animation simulation
    const sweepRad = ((simTime % 6) / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(sweepRad) * (width * 0.5), cy - Math.cos(sweepRad) * (height * 0.5));
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [aircraftList, selectedAircraftId, simTime]);

  // Execute Radio Transmission Instruction
  const handleExecuteInstruction = (cmd: string) => {
    if (!cmd.trim()) return;

    const targetAc = aircraftList.find((ac) => ac.id === selectedAircraftId) || aircraftList[0];
    if (!targetAc) return;

    audioEngine.playSquelch('press');

    // Calculate Response Time
    const timeDelta = simTime > lastCommandSimTime && lastCommandSimTime > 0
      ? (simTime - lastCommandSimTime)
      : Math.floor(2 + Math.random() * 2);
    const calculatedResponseTime = parseFloat(Math.max(1.2, Math.min(8.5, timeDelta)).toFixed(1));
    setLastCommandSimTime(simTime);
    setResponseTimes((prev) => [calculatedResponseTime, ...prev]);

    // Generate pilot readback
    let readback = `${targetAc.callsign}, WILCO.`;
    let isSeparationValid = true;
    let score = 95;
    let feedback = 'Standard phraseology recognized.';
    let rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_WORK' | 'CRITICAL_HAZARD' = 'EXCELLENT';

    const upperCmd = cmd.toUpperCase();

    // Phraseology Compliance Score Calculation
    let compScore = 100;
    const issues: string[] = [];

    const acCallsign = targetAc.callsign.toUpperCase();
    const shortCallsign = acCallsign.split(' ')[0] || acCallsign;

    if (!upperCmd.includes(acCallsign) && !upperCmd.includes(shortCallsign)) {
      compScore -= 20;
      issues.push('Missing explicit callsign prefix');
    }

    const hasStandardKeyword = [
      'CLEARED TO LAND',
      'CLEARED TOUCH AND GO',
      'TOUCH AND GO',
      'HOLD SHORT',
      'SPECIAL VFR',
      'SVFR',
      'HEADING',
      'CLEARED FOR DEPARTURE',
      'TAXI VIA',
      'REPORT',
      'CLEARED FOR THE OPTION',
      'MAINTAIN',
      'SQUAWK',
      'WIND'
    ].some((kw) => upperCmd.includes(kw));

    if (!hasStandardKeyword) {
      compScore -= 25;
      issues.push('Non-standard phraseology');
    }

    if (
      (upperCmd.includes('LAND') || upperCmd.includes('TOUCH') || upperCmd.includes('HOLD') || upperCmd.includes('TAXI')) &&
      !upperCmd.includes('RUNWAY') && !upperCmd.includes('RWY') && !upperCmd.includes('PAD')
    ) {
      compScore -= 15;
      issues.push('Missing runway/pad identifier');
    }

    const finalComplianceScore = Math.max(30, compScore);
    setComplianceScores((prev) => [finalComplianceScore, ...prev]);

    if (issues.length > 0) {
      feedback = `Phraseology Advisory: ${issues.join('; ')}`;
      score = finalComplianceScore;
      rating = finalComplianceScore >= 85 ? 'GOOD' : 'NEEDS_WORK';
    }

    // Check specific directives
    if (upperCmd.includes('CLEARED TO LAND')) {
      readback = `CLEARED TO LAND RUNWAY 21, ${targetAc.callsign}.`;
      setAircraftList((prev) =>
        prev.map((ac) =>
          ac.id === targetAc.id
            ? { ...ac, targetAltitude: 78, targetSpeed: 70, status: 'final_approach' }
            : ac
        )
      );
    } else if (upperCmd.includes('CLEARED TOUCH AND GO') || upperCmd.includes('TOUCH AND GO')) {
      readback = `CLEARED TOUCH AND GO RUNWAY 21, ${targetAc.callsign}.`;
      setAircraftList((prev) =>
        prev.map((ac) =>
          ac.id === targetAc.id ? { ...ac, status: 'pattern' } : ac
        )
      );
    } else if (upperCmd.includes('HOLD SHORT')) {
      readback = `HOLDING SHORT RUNWAY 21, ${targetAc.callsign}.`;
      setAircraftList((prev) =>
        prev.map((ac) =>
          ac.id === targetAc.id ? { ...ac, targetSpeed: 0, status: 'holding' } : ac
        )
      );
    } else if (upperCmd.includes('SPECIAL VFR') || upperCmd.includes('SVFR')) {
      readback = `CLEARED SPECIAL VFR IN CLASS D AT OR BELOW 1,000 CLEAR OF CLOUDS, ${targetAc.callsign}.`;
      score = 100;
      feedback = 'Correct Special VFR altitude and cloud clearance directive issued.';
    } else if (upperCmd.includes('HEADING')) {
      const hdgMatch = upperCmd.match(/HEADING\s+(\d{3})/);
      const newHdg = hdgMatch ? parseInt(hdgMatch[1], 10) : 210;
      readback = `FLY HEADING ${newHdg}, ${targetAc.callsign}.`;
      setAircraftList((prev) =>
        prev.map((ac) =>
          ac.id === targetAc.id ? { ...ac, targetHeading: newHdg } : ac
        )
      );
    } else {
      readback = `ROGER, ${cmd}, ${targetAc.callsign}.`;
    }

    // Audio readback playback
    setTimeout(() => {
      audioEngine.speak(readback);
    }, 400);

    const evalRecord: SimEvaluation = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      callsign: targetAc.callsign,
      command: cmd,
      readback,
      score,
      feedback,
      isSeparationValid,
      efficiencyRating: rating,
      responseTime: calculatedResponseTime,
      complianceScore: finalComplianceScore,
    };

    setEvalHistory([evalRecord, ...evalHistory]);
    setCustomCommandText('');
  };

  // Performance Summary Derived Values
  const avgResponseTime =
    responseTimes.length > 0
      ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
      : '2.4';

  const avgComplianceScore =
    complianceScores.length > 0
      ? Math.round(complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length)
      : 96;

  const readbackEfficiencyRatio =
    complianceScores.length > 0
      ? Math.round((complianceScores.filter((s) => s >= 80).length / complianceScores.length) * 100)
      : 98;

  const selectedAc = aircraftList.find((ac) => ac.id === selectedAircraftId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Simulation Header & Scenario Picker */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold tracking-wider uppercase">
              <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>KNFG SIMULATION MODE • AIR TRAFFIC RADAR SCOPE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight font-mono mt-1">
              MUNN FIELD RADAR SIMULATION & EVALUATOR
            </h2>
          </div>

          {/* Simulation Time & Speed Controls */}
          <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 px-2">
              SIM TIME: <strong className="text-emerald-400">{Math.floor(simTime / 60)}m {simTime % 60}s</strong>
            </span>

            <div className="h-4 w-px bg-slate-800" />

            <button
              id="sim-play-pause-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1.5 rounded-lg border transition-all ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              id="sim-reset-btn"
              onClick={handleResetScenario}
              title="Reset Scenario"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="sim-speed-btn"
              onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 font-bold transition-all"
            >
              {simSpeed}x
            </button>
          </div>
        </div>

        {/* Predefined Scenarios Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_SCENARIOS.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <button
                key={scen.id}
                id={`sim-scen-btn-${scen.id}`}
                onClick={() => handleSelectScenario(scen.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-amber-400 font-bold">{scen.difficulty}</span>
                  <span className="text-slate-400">{scen.runwayInUse} ACTIVE</span>
                </div>
                <h3 className="font-bold text-xs text-slate-100 font-mono line-clamp-1">
                  {scen.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {scen.objective}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Weather & Atmospheric Dynamics Widget */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Wind className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold font-mono text-white flex items-center space-x-2">
                <span>REAL-TIME ATMOSPHERIC & WIND VECTOR MONITOR</span>
                <span className="bg-sky-500/20 text-sky-300 text-[10px] px-2 py-0.5 rounded border border-sky-500/30">
                  LIVE DYNAMICS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Continuous barometric drift, density altitude calculations & vector alerts for Runway 21 (210°)
              </p>
            </div>
          </div>

          {/* Interactive Weather Injector Controls */}
          <div className="flex items-center space-x-2">
            <button
              id="inject-wind-shear-btn"
              onClick={() => {
                setWindSpeed(26);
                setWindGust(34);
                setWindDir(280);
                setWeatherAlert('MICROBURST / LOW-LEVEL WIND SHEAR DETECTED ON RUNWAY 21 FINAL!');
                audioEngine.playSquelch('release');
              }}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>Inject Wind Shear</span>
            </button>

            <button
              id="inject-pressure-drop-btn"
              onClick={() => {
                setAltimeter(29.68);
                setAltimeterTrend('falling');
                audioEngine.playSquelch('press');
              }}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1"
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Pressure Drop (29.68)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Weather Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          {/* Altimeter & Barometric Pressure */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>ALTIMETER</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-300">
                {altimeterTrend === 'rising' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                {altimeterTrend === 'falling' && <TrendingDown className="w-3 h-3 text-rose-400" />}
                <span className="capitalize">{altimeterTrend}</span>
              </span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {altimeter.toFixed(2)} <span className="text-xs text-slate-400 font-normal">inHg</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Press Alt: <strong className="text-sky-300">{Math.round((29.92 - altimeter) * 1000)} FT</strong>
            </div>
          </div>

          {/* Wind Vector & Gusts */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>WIND VECTOR</span>
              </span>
              <span className="text-emerald-400 font-bold">{windDir}°</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              {windSpeed} <span className="text-xs text-slate-400 font-normal">G{windGust} KTS</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Direction: <strong className="text-slate-200">{windDir}° ({windDir > 180 ? 'SW/W' : 'NE/E'})</strong>
            </div>
          </div>

          {/* Crosswind & Headwind Components (RWY 21) */}
          {(() => {
            const angleRad = Math.abs((windDir - 210) * Math.PI / 180);
            const headwind = Math.round(windSpeed * Math.cos(angleRad));
            const crosswind = Math.round(windSpeed * Math.sin(angleRad));

            return (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center space-x-1">
                    <Wind className="w-3.5 h-3.5 text-amber-400" />
                    <span>RWY 21 VECTORS</span>
                  </span>
                  <span className="text-amber-400 font-bold">210°</span>
                </div>
                <div className="text-sm font-bold text-slate-100 flex items-center justify-between pt-1">
                  <span>HEADWIND: <strong className="text-emerald-400">{headwind} KT</strong></span>
                  <span>CROSS: <strong className={crosswind > 12 ? 'text-rose-400 font-black' : 'text-amber-300'}>{crosswind} KT</strong></span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Max Limit: <strong className="text-slate-300">15 KT Crosswind</strong>
                </div>
              </div>
            );
          })()}

          {/* Temperature & Density Altitude */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
                <span>TEMP & DENSITY ALT</span>
              </span>
              <span className="text-indigo-300 font-bold">{tempC}°C</span>
            </div>
            {(() => {
              const pressAlt = (29.92 - altimeter) * 1000;
              const isaTemp = 15 - 2 * (pressAlt / 1000);
              const densityAlt = Math.round(pressAlt + 120 * (tempC - isaTemp));
              return (
                <div>
                  <div className="text-xl font-extrabold text-indigo-300">
                    {densityAlt} <span className="text-xs text-slate-400 font-normal">FT DA</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Airfield Elev: <strong className="text-slate-300">78 FT MSL</strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Dynamic Weather Alert Banner */}
        {weatherAlert && (
          <div className="bg-amber-500/20 border-2 border-amber-500/80 p-3.5 rounded-xl text-amber-200 font-mono text-xs flex items-center justify-between space-x-3 animate-pulse">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-bold">{weatherAlert}</span>
            </div>
            <button
              onClick={() => setWeatherAlert(null)}
              className="text-amber-400 hover:text-white text-[10px] underline uppercase"
            >
              Acknowledge
            </button>
          </div>
        )}
      </div>

      {/* Controller Performance & Compliance Dashboard */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BarChart3 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold font-mono text-white flex items-center space-x-2">
                <span>CONTROLLER PERFORMANCE & PHRASEOLOGY DASHBOARD</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                  FAA JO 7110.65 ANALYTICS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Real-time pilot readback efficiency, average response latency & FAA standard phraseology compliance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold border ${
              avgComplianceScore >= 90
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : avgComplianceScore >= 75
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {avgComplianceScore >= 90 ? 'GRADE A: FAA COMPLIANT' : avgComplianceScore >= 75 ? 'GRADE B: SATISFACTORY' : 'GRADE C: NEEDS REVISION'}
            </span>
          </div>
        </div>

        {/* Performance KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {/* KPI 1: Avg Response Time */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>AVG RESPONSE TIME</span>
              </span>
              <span className="text-sky-400 text-[10px]">Target &lt; 4.0s</span>
            </div>
            <div className="text-2xl font-black text-white flex items-baseline space-x-1">
              <span>{avgResponseTime}</span>
              <span className="text-xs text-slate-400 font-normal">SEC</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Reaction Speed:</span>
              <strong className={parseFloat(avgResponseTime) <= 3.5 ? 'text-emerald-400' : 'text-amber-400'}>
                {parseFloat(avgResponseTime) <= 3.5 ? 'OPTIMAL LATENCY' : 'MODERATE LATENCY'}
              </strong>
            </div>
          </div>

          {/* KPI 2: Compliance Score */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>COMPLIANCE SCORE</span>
              </span>
              <span className="text-emerald-400 text-[10px]">FAA Standard</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 flex items-baseline space-x-1">
              <span>{avgComplianceScore}%</span>
            </div>
            {/* Visual Compliance Meter */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  avgComplianceScore >= 90 ? 'bg-emerald-400' : avgComplianceScore >= 75 ? 'bg-amber-400' : 'bg-rose-400'
                }`}
                style={{ width: `${avgComplianceScore}%` }}
              />
            </div>
          </div>

          {/* KPI 3: Pilot Readback Efficiency */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <MessageSquareCode className="w-3.5 h-3.5 text-amber-400" />
                <span>READBACK EFFICIENCY</span>
              </span>
              <span className="text-amber-400 text-[10px]">Clean Readbacks</span>
            </div>
            <div className="text-2xl font-black text-amber-300 flex items-baseline space-x-1">
              <span>{readbackEfficiencyRatio}%</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Transmissions:</span>
              <strong className="text-slate-200">{evalHistory.length} Issued</strong>
            </div>
          </div>

          {/* KPI 4: Airspace Safety Margin */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>SAFETY MARGIN</span>
              </span>
              <span className="text-indigo-400 text-[10px]">Zero Separation Loss</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 flex items-baseline space-x-1">
              <span>{safetyAlert ? '85%' : '100%'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Status:</span>
              <strong className={safetyAlert ? 'text-rose-400' : 'text-emerald-400'}>
                {safetyAlert ? 'SAFETY ALERT ACTIVE' : 'SEPARATION MAINTAINED'}
              </strong>
            </div>
          </div>
        </div>

        {/* Phraseology Diagnostics & Controller Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Callsign Included: <strong className="text-emerald-300">100%</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Standard Directives: <strong className="text-sky-300">{avgComplianceScore}%</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Runway Designators Specified: <strong className="text-amber-300">98%</strong></span>
          </div>
        </div>
      </div>

      {/* Safety Alert Banner */}
      {safetyAlert && (
        <div className="bg-rose-500/20 border-2 border-rose-500 p-4 rounded-xl text-rose-300 font-mono text-xs flex items-center space-x-3 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <span className="font-bold">{safetyAlert}</span>
        </div>
      )}

      {/* Radar Scope & Controller Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Scope */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-2 px-2">
            <span className="text-emerald-400 font-bold">MUNN FIELD RADAR (RANGE 6 NM)</span>
            <span>ALT: 2,500' MSL CLASS D</span>
          </div>

          <canvas
            ref={canvasRef}
            width={520}
            height={520}
            className="w-full max-w-[520px] aspect-square rounded-xl border border-slate-800 shadow-inner bg-slate-950 cursor-crosshair"
          />

          {/* Target Aircraft Selector Strip */}
          <div className="w-full mt-4 flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-xs font-mono text-slate-400 shrink-0">SELECT AIRCRAFT:</span>
            {aircraftList.map((ac) => (
              <button
                key={ac.id}
                id={`select-ac-${ac.id}`}
                onClick={() => setSelectedAircraftId(ac.id)}
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs transition-all shrink-0 ${
                  ac.id === selectedAircraftId
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {ac.callsign} ({ac.type})
              </button>
            ))}
          </div>
        </div>

        {/* Right: Controller Command Console & Feedback */}
        <div className="lg:col-span-5 space-y-6">
          {/* Target Aircraft State Card */}
          {selectedAc && (
            <div className="bg-slate-900 border-l-4 border-l-emerald-500 border-y border-r border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-slate-100 text-sm">
                    TARGET: {selectedAc.callsign}
                  </h3>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  {selectedAc.type}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500">ALTITUDE:</span>
                  <p className="text-emerald-400 font-bold">{selectedAc.altitude} FT</p>
                </div>
                <div>
                  <span className="text-slate-500">HEADING:</span>
                  <p className="text-sky-300 font-bold">{selectedAc.heading}°</p>
                </div>
                <div>
                  <span className="text-slate-500">SPEED:</span>
                  <p className="text-amber-300 font-bold">{selectedAc.speed} KTS</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Command Macros */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Standard Command Macros</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="cmd-cleared-land-btn"
                onClick={() =>
                  handleExecuteInstruction(
                    `${selectedAc?.callsign || 'DEVIL 11'}, RUNWAY 21, CLEARED TO LAND, WIND 220 AT 9 KNOTS.`
                  )
                }
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-emerald-400 rounded-xl border border-slate-800 text-xs font-mono font-bold text-left transition-all"
              >
                Cleared to Land RWY 21
              </button>

              <button
                id="cmd-touch-go-btn"
                onClick={() =>
                  handleExecuteInstruction(
                    `${selectedAc?.callsign || 'DEVIL 11'}, RUNWAY 21, CLEARED TOUCH AND GO, MAKE LEFT TRAFFIC.`
                  )
                }
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-800 text-xs font-mono font-bold text-left transition-all"
              >
                Cleared Touch & Go
              </button>

              <button
                id="cmd-hold-short-btn"
                onClick={() =>
                  handleExecuteInstruction(
                    `${selectedAc?.callsign || 'DEVIL 11'}, TAXI VIA ALPHA, HOLD SHORT RUNWAY 21.`
                  )
                }
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-800 text-xs font-mono font-bold text-left transition-all"
              >
                Hold Short RWY 21
              </button>

              <button
                id="cmd-svfr-clearance-btn"
                onClick={() =>
                  handleExecuteInstruction(
                    `${selectedAc?.callsign || 'DEVIL 11'}, CLEARED SPECIAL VFR IN KNFG CLASS D AIRSPACE, MAINTAIN AT OR BELOW 1,000, CLEAR OF CLOUDS.`
                  )
                }
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-purple-400 rounded-xl border border-slate-800 text-xs font-mono font-bold text-left transition-all"
              >
                Special VFR Clearance
              </button>
            </div>

            {/* Custom Transceiver Bar */}
            <div className="pt-2 flex items-center space-x-2">
              <input
                id="custom-command-input"
                type="text"
                value={customCommandText}
                onChange={(e) => setCustomCommandText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteInstruction(customCommandText);
                }}
                placeholder="Type custom ATC phraseology command..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                id="send-custom-command-btn"
                onClick={() => handleExecuteInstruction(customCommandText)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-xl font-bold transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Evaluator Feedback Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-slate-100">CONTROLLER EVALUATION LOG</h3>
              </div>
              <span className="text-emerald-400 font-bold">
                SCORE: {overallScore}%
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {evalHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Issue ATC radio commands to generate live pilot responses and performance evaluations.
                </div>
              ) : (
                evalHistory.map((record, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-amber-400 font-bold">{record.callsign}</span>
                      <span>{record.timestamp}</span>
                    </div>
                    <p className="text-emerald-300 font-medium">ATC: "{record.command}"</p>
                    <p className="text-slate-300 italic">PILOT: "{record.readback}"</p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900">
                      <span>{record.feedback}</span>
                      <span className="text-emerald-400 font-bold">+{record.score} PTS</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
