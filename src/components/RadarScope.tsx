import React, { useEffect, useRef, useState } from 'react';
import { Aircraft, ControlPosition, Waypoint } from '../types';
import { KNFG_WAYPOINTS } from '../data/knfgData';
import { audioEngine } from '../utils/audio';
import {
  Compass,
  Radio,
  Sliders,
  Play,
  RotateCcw,
  Plane,
  Shield,
  Zap,
  Target,
  Navigation,
  ChevronRight,
  Eye,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';

interface RadarScopeProps {
  aircraftList: Aircraft[];
  onUpdateAircraft: (updated: Aircraft[]) => void;
  activePosition: ControlPosition;
  onSendTransmission: (cmd: string, callsign: string, readback: string) => void;
}

export const RadarScope: React.FC<RadarScopeProps> = ({
  aircraftList,
  onUpdateAircraft,
  activePosition,
  onSendTransmission,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scopeMode, setScopeMode] = useState<'ppi' | 'par'>('ppi');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(aircraftList[0]?.id || null);
  const [radarRangeNM, setRadarRangeNM] = useState<number>(6); // 6 NM radius
  const [sweepAngle, setSweepAngle] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Command Controls State
  const [cmdHeading, setCmdHeading] = useState<number>(210);
  const [cmdAltitude, setCmdAltitude] = useState<number>(1500);
  const [cmdSpeed, setCmdSpeed] = useState<number>(120);

  const selectedAircraft = aircraftList.find((a) => a.id === selectedAircraftId);

  // Update command inputs when selected aircraft changes
  useEffect(() => {
    if (selectedAircraft) {
      setCmdHeading(selectedAircraft.targetHeading);
      setCmdAltitude(selectedAircraft.targetAltitude);
      setCmdSpeed(selectedAircraft.targetSpeed);
    }
  }, [selectedAircraftId]);

  // Main Radar Movement & Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updateLoop = (now: number) => {
      const dt = (now - lastTime) / 1000; // seconds
      lastTime = now;

      if (!isPaused) {
        // Rotate sweep beam (60 deg per sec)
        setSweepAngle((prev) => (prev + 40 * dt) % 360);

        // Move aircraft
        onUpdateAircraft((prevList) =>
          prevList.map((ac) => {
            let heading = ac.heading;
            let altitude = ac.altitude;
            let speed = ac.speed;

            // Turn heading smoothly
            if (heading !== ac.targetHeading) {
              const diff = (ac.targetHeading - heading + 360) % 360;
              const turnRate = 6; // deg per sec
              if (diff < 180) {
                heading = (heading + Math.min(diff, turnRate * dt * 5)) % 360;
              } else {
                heading = (heading - Math.min(360 - diff, turnRate * dt * 5) + 360) % 360;
              }
            }

            // Climb/descend smoothly
            if (altitude !== ac.targetAltitude) {
              const altDiff = ac.targetAltitude - altitude;
              const climbRate = 1200; // ft per min
              const altChange = (climbRate / 60) * dt * 5;
              if (Math.abs(altDiff) <= altChange) {
                altitude = ac.targetAltitude;
              } else {
                altitude += Math.sign(altDiff) * altChange;
              }
            }

            // Speed change smoothly
            if (speed !== ac.targetSpeed) {
              const spdDiff = ac.targetSpeed - speed;
              const accel = 15; // kts per sec
              const spdChange = accel * dt;
              if (Math.abs(spdDiff) <= spdChange) {
                speed = ac.targetSpeed;
              } else {
                speed += Math.sign(spdDiff) * spdChange;
              }
            }

            // Calculate movement (Speed in knots -> NM per second: speed / 3600)
            const speedNMps = (speed / 3600) * dt * 3; // 3x real-time scale for crisp practice
            const rad = ((heading - 90) * Math.PI) / 180;
            const newX = ac.x + Math.cos(rad) * speedNMps;
            const newY = ac.y + Math.sin(rad) * speedNMps;

            // Keep trail history
            const history = [...ac.history];
            if (history.length === 0 || Math.hypot(history[history.length - 1].x - newX, history[history.length - 1].y - newY) > 0.1) {
              history.push({ x: newX, y: newY });
              if (history.length > 8) history.shift();
            }

            return {
              ...ac,
              x: newX,
              y: newY,
              heading: Math.round(heading),
              altitude: Math.round(altitude),
              speed: Math.round(speed),
              history,
            };
          })
        );
      }

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = (Math.min(width, height) / 2 - 20) / radarRangeNM; // pixels per NM

    // Clear background
    ctx.fillStyle = '#030712'; // Slate 950 deep radar background
    ctx.fillRect(0, 0, width, height);

    if (scopeMode === 'ppi') {
      // --- 2D PLAN POSITION INDICATOR (PPI) MODE ---

      // Background CRT Grid / Crosshair
      ctx.strokeStyle = '#064e3b'; // subtle dark green grid
      ctx.lineWidth = 1;

      // Range Rings (1, 2, 4, 6 NM)
      const rings = [1, 2, 4, 6];
      rings.forEach((r) => {
        if (r <= radarRangeNM) {
          ctx.beginPath();
          ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
          ctx.strokeStyle = r === 4.3 ? '#0284c7' : '#047857'; // Class D ring highlighted
          ctx.setLineDash(r === 4.3 ? [6, 4] : []);
          ctx.stroke();
          ctx.setLineDash([]);

          // Ring Distance Labels
          ctx.fillStyle = '#059669';
          ctx.font = '10px monospace';
          ctx.fillText(`${r} NM`, cx + 5, cy - r * scale + 12);
        }
      });

      // Airspace Class D 4.3 NM Ring
      ctx.beginPath();
      ctx.arc(cx, cy, 4.3 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8'; // Sky blue Class D
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px monospace';
      ctx.fillText('KNFG CLASS D (SUR-2500 MSL)', cx + 4.3 * scale - 120, cy - 8);

      // R-2503 Restricted Airspace Overlay Polygon (North/North-East)
      ctx.beginPath();
      ctx.moveTo(cx - 1.5 * scale, cy - 2.5 * scale);
      ctx.lineTo(cx + 4.5 * scale, cy - 5.5 * scale);
      ctx.lineTo(cx + 5.5 * scale, cy + 2.0 * scale);
      ctx.lineTo(cx + 2.0 * scale, cy + 0.5 * scale);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // Subtle red fill
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f87171';
      ctx.font = '10px monospace';
      ctx.fillText('R-2503 IMPACT AREA', cx + 1.2 * scale, cy - 2.8 * scale);

      // Center Crosshair
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy + 15);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.stroke();

      // KNFG Runway 03/21 Graphic
      const rwyLen = 1.0 * scale; // 1 NM scaled visual length
      const rwyAngle = (212 * Math.PI) / 180;
      const rx1 = cx + Math.sin(rwyAngle) * (rwyLen / 2);
      const ry1 = cy - Math.cos(rwyAngle) * (rwyLen / 2);
      const rx2 = cx - Math.sin(rwyAngle) * (rwyLen / 2);
      const ry2 = cy + Math.cos(rwyAngle) * (rwyLen / 2);

      // Runway line
      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.strokeStyle = '#f59e0b'; // Amber runway
      ctx.lineWidth = 4;
      ctx.stroke();

      // Runway centerline extensions
      ctx.beginPath();
      ctx.moveTo(rx1 + Math.sin(rwyAngle) * scale * 3, ry1 - Math.cos(rwyAngle) * scale * 3);
      ctx.lineTo(rx2 - Math.sin(rwyAngle) * scale * 3, ry2 + Math.cos(rwyAngle) * scale * 3);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('RWY 21', rx1 + 8, ry1);
      ctx.fillText('RWY 03', rx2 - 40, ry2 + 12);

      // Render Waypoints & Navaids
      KNFG_WAYPOINTS.forEach((wpt) => {
        const wx = cx + wpt.x * scale;
        const wy = cy - wpt.y * scale;

        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;

        if (wpt.type === 'navaid') {
          // Hexagon for TACAN/VORTAC
          ctx.beginPath();
          ctx.arc(wx, wy, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`▲ ${wpt.code}`, wx + 8, wy + 4);
        } else if (wpt.type === 'reporting_point') {
          // Diamond for VFR reporting point
          ctx.beginPath();
          ctx.moveTo(wx, wy - 4);
          ctx.lineTo(wx + 4, wy);
          ctx.lineTo(wx, wy + 4);
          ctx.lineTo(wx - 4, wy);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px monospace';
          ctx.fillText(wpt.code, wx + 6, wy + 3);
        }
      });

      // Radar Sweep Line (Phosphor Rotating Beam)
      const sweepRad = ((sweepAngle - 90) * Math.PI) / 180;
      const sweepX = cx + Math.cos(sweepRad) * (radarRangeNM * scale);
      const sweepY = cy + Math.sin(sweepRad) * (radarRangeNM * scale);

      const sweepGradient = ctx.createConicGradient(sweepRad + Math.PI / 2, cx, cy);
      sweepGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      sweepGradient.addColorStop(0.1, 'rgba(16, 185, 129, 0.05)');
      sweepGradient.addColorStop(0.2, 'transparent');

      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarRangeNM * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Render Aircraft Targets & Flight Data Blocks
      aircraftList.forEach((ac) => {
        const ax = cx + ac.x * scale;
        const ay = cy - ac.y * scale;
        const isSelected = ac.id === selectedAircraftId;

        // Render Trail History Dots
        ac.history.forEach((hist, idx) => {
          const hx = cx + hist.x * scale;
          const hy = cy - hist.y * scale;
          const opacity = (idx + 1) / ac.history.length;
          ctx.fillStyle = `rgba(52, 211, 153, ${opacity * 0.4})`;
          ctx.beginPath();
          ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Target Velocity Leader Line
        const leadRad = ((ac.heading - 90) * Math.PI) / 180;
        const leadLen = (ac.speed / 120) * 20; // scaled vector
        const lx = ax + Math.cos(leadRad) * leadLen;
        const ly = ay + Math.sin(leadRad) * leadLen;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(lx, ly);
        ctx.strokeStyle = isSelected ? '#fbbf24' : ac.isEmergency ? '#f87171' : '#34d399';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Target Blip Symbol
        ctx.fillStyle = isSelected ? '#fbbf24' : ac.isEmergency ? '#ef4444' : '#10b981';
        ctx.beginPath();
        if (ac.category === 'tiltrotor' || ac.category === 'rotary') {
          // Rotated Square / Diamond
          ctx.rect(ax - 4, ay - 4, 8, 8);
        } else {
          // Circle / Triangle
          ctx.arc(ax, ay, 4, 0, Math.PI * 2);
        }
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ax, ay, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Flight Data Tag (Data Block)
        const tagX = ax + 14;
        const tagY = ay - 10;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(tagX - 2, tagY - 12, 85, 30);
        ctx.strokeStyle = isSelected ? '#fbbf24' : '#334155';
        ctx.strokeRect(tagX - 2, tagY - 12, 85, 30);

        ctx.fillStyle = isSelected ? '#fbbf24' : ac.isEmergency ? '#fca5a5' : '#e2e8f0';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(ac.callsign, tagX, tagY);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        const altFormatted = String(Math.round(ac.altitude / 100)).padStart(3, '0'); // e.g. 015 = 1500 ft
        const spdFormatted = String(Math.round(ac.speed / 10)).padStart(2, '0'); // e.g. 12 = 120 kts
        ctx.fillText(`${altFormatted} ${spdFormatted} ${ac.type}`, tagX, tagY + 12);
      });
    } else {
      // --- PAR (PRECISION APPROACH RADAR) FINAL SCOPE MODE ---
      // Split Screen: Upper Azimuth (Left/Right centerline) & Lower Elevation (Glidepath elevation)

      // Divider line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Labels
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('PAR AZIMUTH SCOPE (RUNWAY 21 CENTERLINE)', 15, 25);
      ctx.fillText('PAR ELEVATION SCOPE (3.0° GLIDEPATH)', 15, cy + 25);

      // Distance Markers (1 NM to 5 NM)
      const parScaleX = (width - 100) / 5; // 5 NM scope width
      for (let d = 1; d <= 5; d++) {
        const xPos = width - 50 - d * parScaleX;

        // Azimuth vertical lines
        ctx.beginPath();
        ctx.moveTo(xPos, 40);
        ctx.lineTo(xPos, cy - 20);
        ctx.strokeStyle = '#047857';
        ctx.setLineDash([2, 4]);
        ctx.stroke();

        // Elevation vertical lines
        ctx.beginPath();
        ctx.moveTo(xPos, cy + 40);
        ctx.lineTo(xPos, height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#10b981';
        ctx.font = '10px monospace';
        ctx.fillText(`${d} NM`, xPos - 12, cy - 5);
        ctx.fillText(`${d} NM`, xPos - 12, height - 5);
      }

      // Azimuth Centerline
      ctx.beginPath();
      ctx.moveTo(50, cy / 2);
      ctx.lineTo(width - 50, cy / 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Elevation 3.0° Glidepath Line
      const touchX = width - 50;
      const touchY = height - 30;
      const gpHeight = 5 * 318; // ~1590 ft at 5 NM
      const gpScaleY = (cy - 60) / 1800; // pixels per foot elevation

      ctx.beginPath();
      ctx.moveTo(touchX, touchY);
      ctx.lineTo(touchX - 5 * parScaleX, touchY - gpHeight * gpScaleY);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Upper & Lower Glidepath Limits (+/- 0.5 deg safety corridor)
      ctx.beginPath();
      ctx.moveTo(touchX, touchY);
      ctx.lineTo(touchX - 5 * parScaleX, touchY - (gpHeight * 1.2) * gpScaleY);
      ctx.moveTo(touchX, touchY);
      ctx.lineTo(touchX - 5 * parScaleX, touchY - (gpHeight * 0.8) * gpScaleY);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Render PAR Targets
      aircraftList.forEach((ac) => {
        // Calculate distance to touchdown (Runway 21 threshold)
        const distNM = Math.hypot(ac.x - 0.5, ac.y - (-0.5));
        if (distNM <= 5.5) {
          const px = touchX - distNM * parScaleX;

          // Azimuth offset (heading relative to 212° alignment)
          const azOffsetDeg = ac.heading - 212;
          const pyAz = cy / 2 + azOffsetDeg * 12;

          // Elevation offset (altitude relative to glidepath at distNM)
          const targetGPAlt = distNM * 318 + 78; // ft MSL
          const altOffset = ac.altitude - targetGPAlt;
          const pyEl = touchY - (ac.altitude - 78) * gpScaleY;

          // Render Azimuth Blip
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(px, pyAz, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.font = '10px monospace';
          ctx.fillText(`${ac.callsign}`, px + 8, pyAz + 3);

          // Render Elevation Blip
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(px, pyEl, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = Math.abs(altOffset) > 100 ? '#f87171' : '#34d399';
          ctx.fillText(`${ac.altitude}' MSL (${Math.round(altOffset)}' GP)`, px + 8, pyEl + 3);
        }
      });
    }
  }, [aircraftList, scopeMode, selectedAircraftId, radarRangeNM, sweepAngle]);

  // Handle Canvas Click to Select Target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = (Math.min(width, height) / 2 - 20) / radarRangeNM;

    // Find nearest aircraft within 20px
    let nearestId: string | null = null;
    let minDist = 25; // max click radius

    aircraftList.forEach((ac) => {
      const ax = cx + ac.x * scale;
      const ay = cy - ac.y * scale;
      const d = Math.hypot(clickX - ax, clickY - ay);
      if (d < minDist) {
        minDist = d;
        nearestId = ac.id;
      }
    });

    if (nearestId) {
      setSelectedAircraftId(nearestId);
      audioEngine.playSquelch('press');
    }
  };

  // Issue Quick Instruction
  const issueQuickInstruction = (type: string) => {
    if (!selectedAircraft) return;

    let newHeading = selectedAircraft.targetHeading;
    let newAlt = selectedAircraft.targetAltitude;
    let newSpeed = selectedAircraft.targetSpeed;
    let cmdText = '';
    let readbackText = '';

    switch (type) {
      case 'land_21':
        cmdText = `${selectedAircraft.callsign}, RUNWAY 21, CLEARED TO LAND.`;
        readbackText = `CLEARED TO LAND RUNWAY 21, ${selectedAircraft.callsign}.`;
        newHeading = 212;
        newAlt = 78;
        newSpeed = 90;
        break;

      case 'touch_go':
        cmdText = `${selectedAircraft.callsign}, RUNWAY 21, CLEARED TOUCH AND GO.`;
        readbackText = `CLEARED TOUCH AND GO RUNWAY 21, ${selectedAircraft.callsign}.`;
        newHeading = 212;
        break;

      case 'option':
        cmdText = `${selectedAircraft.callsign}, RUNWAY 21, CLEARED FOR THE OPTION.`;
        readbackText = `CLEARED FOR THE OPTION RUNWAY 21, ${selectedAircraft.callsign}.`;
        break;

      case 'left_pattern':
        cmdText = `${selectedAircraft.callsign}, ENTER LEFT TRAFFIC PATTERN RUNWAY 21, MAINTAIN 1,000.`;
        readbackText = `ENTER LEFT TRAFFIC RUNWAY 21, MAINTAIN 1,000, ${selectedAircraft.callsign}.`;
        newHeading = 32;
        newAlt = 1000;
        break;

      case 'hold_short_03':
        cmdText = `${selectedAircraft.callsign}, TAXI VIA ALPHA, HOLD SHORT RUNWAY 03.`;
        readbackText = `TAXI VIA ALPHA, HOLDING SHORT RUNWAY 03, ${selectedAircraft.callsign}.`;
        newSpeed = 0;
        break;

      case 'svfr_cleared':
        cmdText = `${selectedAircraft.callsign}, CLEARED TO ENTER KNFG CLASS D AIRSPACE SPECIAL VFR, MAINTAIN SPECIAL VFR AT OR BELOW 1,000.`;
        readbackText = `CLEARED SPECIAL VFR CLASS D AT OR BELOW 1,000, ${selectedAircraft.callsign}.`;
        newAlt = 800;
        break;

      case 'vector_custom':
        cmdText = `${selectedAircraft.callsign}, TURN HEADING ${String(cmdHeading).padStart(3, '0')}, CLIMB AND MAINTAIN ${cmdAltitude}, SPEED ${cmdSpeed} KNOTS.`;
        readbackText = `HEADING ${String(cmdHeading).padStart(3, '0')}, MAINTAIN ${cmdAltitude}, SPEED ${cmdSpeed} KNOTS, ${selectedAircraft.callsign}.`;
        newHeading = cmdHeading;
        newAlt = cmdAltitude;
        newSpeed = cmdSpeed;
        break;
    }

    // Update target parameters
    onUpdateAircraft(
      aircraftList.map((ac) =>
        ac.id === selectedAircraft.id
          ? {
              ...ac,
              targetHeading: newHeading,
              targetAltitude: newAlt,
              targetSpeed: newSpeed,
              lastInstruction: cmdText,
              pilotReadback: readbackText,
            }
          : ac
      )
    );

    // Speak audio readback
    audioEngine.speakReadback(readbackText);

    // Trigger parent transmission handler
    onSendTransmission(cmdText, selectedAircraft.callsign, readbackText);
  };

  // Add new target
  const handleSpawnAircraft = (type: 'MV-22B' | 'AH-1Z' | 'F-35B' | 'C-130') => {
    const callsigns = ['DEVIL 21', 'VIPER 09', 'KNIGHT 44', 'RAIDER 12', 'PIRATE 03', 'COPTER 05'];
    const randomCall = callsigns[Math.floor(Math.random() * callsigns.length)];
    const id = 'ac-spawn-' + Date.now();

    const newAc: Aircraft = {
      id,
      callsign: randomCall,
      type,
      category: type === 'MV-22B' ? 'tiltrotor' : type === 'AH-1Z' ? 'rotary' : type === 'F-35B' ? 'jet' : 'heavy',
      x: (Math.random() * 4 - 2),
      y: (Math.random() * 4 - 2),
      altitude: 1500,
      heading: 30,
      speed: 130,
      targetAltitude: 1000,
      targetHeading: 30,
      targetSpeed: 120,
      squawk: String(Math.floor(4000 + Math.random() * 900)),
      status: 'inbound',
      history: [],
    };

    onUpdateAircraft([...aircraftList, newAc]);
    setSelectedAircraftId(id);
    audioEngine.playSquelch('press');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto">
      {/* Scope Canvas Area */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
        {/* Scope Mode Header */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Target className="w-4 h-4 animate-spin-slow" />
            </span>
            <span className="font-bold font-mono text-sm text-slate-100">
              {scopeMode === 'ppi' ? '2D RADAR PPI SCOPE (KNFG)' : 'PAR FINAL APPROACH SCOPE (RWY 21)'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {/* Scope Mode Toggle */}
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center space-x-1">
              <button
                id="btn-scope-ppi"
                onClick={() => setScopeMode('ppi')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  scopeMode === 'ppi' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                PPI Scope
              </button>
              <button
                id="btn-scope-par"
                onClick={() => setScopeMode('par')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  scopeMode === 'par' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                PAR Final GCA
              </button>
            </div>

            {/* Range Selector */}
            {scopeMode === 'ppi' && (
              <select
                id="radar-range-select"
                value={radarRangeNM}
                onChange={(e) => setRadarRangeNM(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value={4}>4 NM Range</option>
                <option value={6}>6 NM Range</option>
                <option value={10}>10 NM Range</option>
              </select>
            )}

            {/* Pause/Play Simulation */}
            <button
              id="btn-radar-pause"
              onClick={() => setIsPaused(!isPaused)}
              className={`p-1.5 rounded border transition-all ${
                isPaused
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-amber-300" /> : <RotateCcw className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="relative w-full aspect-square max-w-[620px] bg-slate-950 rounded-xl border border-emerald-900/40 overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair object-contain"
          />

          {/* Quick Spawn Targets Bar */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg p-2 flex items-center justify-between text-xs text-slate-300">
            <span className="font-mono text-slate-400 flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> Spawn Target:
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                id="spawn-btn-mv22"
                onClick={() => handleSpawnAircraft('MV-22B')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-2 py-1 rounded font-mono text-[11px] transition-all"
              >
                + Osprey
              </button>
              <button
                id="spawn-btn-ah1z"
                onClick={() => handleSpawnAircraft('AH-1Z')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 px-2 py-1 rounded font-mono text-[11px] transition-all"
              >
                + Cobra/Viper
              </button>
              <button
                id="spawn-btn-f35b"
                onClick={() => handleSpawnAircraft('F-35B')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 px-2 py-1 rounded font-mono text-[11px] transition-all"
              >
                + F-35B
              </button>
              <button
                id="spawn-btn-c130"
                onClick={() => handleSpawnAircraft('C-130')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-400 px-2 py-1 rounded font-mono text-[11px] transition-all"
              >
                + C-130
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Control & Radio Transmission Deck */}
      <div className="lg:col-span-4 space-y-4">
        {/* Selected Target Inspector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Plane className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-100 font-mono text-sm">AIRCRAFT DATA BLOCK</h3>
            </div>
            {selectedAircraft && (
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                SQK {selectedAircraft.squawk}
              </span>
            )}
          </div>

          {selectedAircraft ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Target Header Stats */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">CALLSIGN</span>
                  <span className="text-amber-400 font-bold text-base">{selectedAircraft.callsign}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TYPE</span>
                  <span className="text-sky-300 font-bold text-sm">{selectedAircraft.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ALTITUDE (MSL)</span>
                  <span className="text-emerald-400 font-bold text-sm">{selectedAircraft.altitude} FT</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SPEED / HEADING</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {selectedAircraft.speed} KT / {String(selectedAircraft.heading).padStart(3, '0')}°
                  </span>
                </div>
              </div>

              {/* Vector Adjustment Controls */}
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-bold text-[11px] uppercase flex items-center justify-between">
                  <span>Vector & Altitude Command</span>
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                </div>

                {/* Heading */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Assigned Heading:</span>
                    <span className="text-amber-300 font-bold">{String(cmdHeading).padStart(3, '0')}°</span>
                  </div>
                  <input
                    id="slider-heading"
                    type="range"
                    min={1}
                    max={360}
                    value={cmdHeading}
                    onChange={(e) => setCmdHeading(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Altitude */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Assigned Altitude:</span>
                    <span className="text-emerald-300 font-bold">{cmdAltitude} FT</span>
                  </div>
                  <input
                    id="slider-altitude"
                    type="range"
                    min={200}
                    max={3500}
                    step={100}
                    value={cmdAltitude}
                    onChange={(e) => setCmdAltitude(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Assigned Speed:</span>
                    <span className="text-sky-300 font-bold">{cmdSpeed} KTS</span>
                  </div>
                  <input
                    id="slider-speed"
                    type="range"
                    min={60}
                    max={250}
                    step={10}
                    value={cmdSpeed}
                    onChange={(e) => setCmdSpeed(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <button
                  id="btn-transmit-custom-vector"
                  onClick={() => issueQuickInstruction('vector_custom')}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold py-2 rounded-lg transition-all flex items-center justify-center space-x-2 text-xs shadow-md"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Transmit Vector Instruction</span>
                </button>
              </div>

              {/* Quick Clearance Buttons */}
              <div className="space-y-2">
                <span className="text-slate-400 text-[10px] font-bold block uppercase">
                  Standard Clearance Directives (JO 7110.65):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-clear-land-21"
                    onClick={() => issueQuickInstruction('land_21')}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-2 rounded-lg text-[11px] font-bold transition-all text-left"
                  >
                    Cleared Land RWY 21
                  </button>
                  <button
                    id="btn-clear-touch-go"
                    onClick={() => issueQuickInstruction('touch_go')}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-2 rounded-lg text-[11px] font-bold transition-all text-left"
                  >
                    Cleared Touch & Go
                  </button>

                  <button
                    id="btn-clear-left-pattern"
                    onClick={() => issueQuickInstruction('left_pattern')}
                    className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 p-2 rounded-lg text-[11px] font-bold transition-all text-left"
                  >
                    Left Pattern 1000'
                  </button>
                  <button
                    id="btn-clear-svfr"
                    onClick={() => issueQuickInstruction('svfr_cleared')}
                    className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 p-2 rounded-lg text-[11px] font-bold transition-all text-left"
                  >
                    Cleared SVFR Class D
                  </button>
                </div>
              </div>

              {/* Live Readback Feed */}
              {selectedAircraft.pilotReadback && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-amber-400 font-bold block mb-1 flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" /> PILOT READBACK:
                  </span>
                  <p className="text-slate-300 italic">"{selectedAircraft.pilotReadback}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">
              <Target className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
              Click any blip target on the radar scope to select and issue clearances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
