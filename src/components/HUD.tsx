import React from 'react';
import { PlayerTelemetry, RacerState } from '../types/game';
import { Activity, Zap, Flag, Timer, Heart, Sun, CloudRain, CloudSnow } from 'lucide-react';

interface HUDProps {
  telemetry: PlayerTelemetry;
  racers: RacerState[];
  miniMapPoints: { x: number; y: number }[];
  onMobileInput: (action: 'forward' | 'backward' | 'left' | 'right' | 'boost' | 'drift', active: boolean) => void;
  activeBioName: string;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  racers,
  miniMapPoints,
  onMobileInput,
  activeBioName,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Tachometer angle calculation (RPM from 1000 to 8000 -> -120 to +120 deg)
  const rpmRatio = Math.min(1.0, Math.max(0, (telemetry.rpm - 1000) / 7000));
  const tachAngle = -120 + rpmRatio * 240;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* High Adrenaline Vignette */}
      {telemetry.adrenalinePercent > 70 && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle at center, transparent 60%, rgba(225, 29, 72, 0.25) 100%)',
            opacity: (telemetry.adrenalinePercent - 70) / 30,
          }}
        />
      )}

      {/* Rain Storm Screen Droplet Vignette */}
      {telemetry.weather === 'rain' && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(15,23,42,0.45)_100%)] border-2 border-blue-500/10" />
      )}

      {/* Snow Blizzard Frosted Vignette */}
      {telemetry.weather === 'snow' && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(186,230,253,0.18)_100%)] border-2 border-cyan-300/20" />
      )}

      {/* Nitro Speed Lines Overlay */}
      {telemetry.isBoosting && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,182,212,0.18)_100%)]" />
      )}

      {/* TOP LEFT: Race Standings & Timing */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Position & Lap Header */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 shadow-xl">
          <div className="flex items-baseline gap-1.5 border-r border-slate-700 pr-3">
            <span className="text-xs font-semibold tracking-wider text-slate-400">POS</span>
            <span className="text-3xl font-black text-cyan-400 italic">
              {getOrdinal(telemetry.position)}
            </span>
            <span className="text-xs text-slate-500">/{telemetry.totalRacers}</span>
          </div>

          <div className="flex items-center gap-2 pl-1">
            <Flag className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-wider text-slate-400">LAP</span>
              <span className="text-lg font-black text-white">
                {telemetry.currentLap} <span className="text-xs text-slate-400">/ {telemetry.totalLaps}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Lap Timers */}
        <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-1.5 text-xs shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Timer className="h-3.5 w-3.5 text-cyan-400" /> Current
            </span>
            <span className="font-mono font-bold text-white tracking-wide">
              {formatTime(telemetry.lapTime)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-1">
            <span className="text-[11px] text-slate-400">Best Lap</span>
            <span className="font-mono text-xs font-semibold text-emerald-400">
              {telemetry.bestLapTime ? formatTime(telemetry.bestLapTime) : '--:--.--'}
            </span>
          </div>
        </div>

        {/* Dynamic Weather & Surface Grip Badge */}
        <div
          className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs shadow-md transition-all ${
            telemetry.weather === 'rain'
              ? 'border-blue-500/60 bg-blue-950/85 text-blue-200'
              : telemetry.weather === 'snow'
              ? 'border-cyan-400/60 bg-cyan-950/85 text-cyan-100'
              : 'border-slate-800 bg-slate-900/85 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {telemetry.weather === 'rain' ? (
              <CloudRain className="h-3.5 w-3.5 text-blue-400" />
            ) : telemetry.weather === 'snow' ? (
              <CloudSnow className="h-3.5 w-3.5 text-cyan-300" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="font-semibold capitalize">
              {telemetry.weather === 'rain' ? 'Rain' : telemetry.weather === 'snow' ? 'Snow' : 'Clear Sky'}
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-300 ml-2">
            {telemetry.trackGripPercent}% GRIP
          </span>
        </div>

        {/* Active Bio-Catalyst Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-cyan-800/60 bg-cyan-950/70 px-3 py-1.5 text-xs text-cyan-200">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span className="truncate max-w-[170px] font-medium">{activeBioName}</span>
        </div>
      </div>

      {/* TOP RIGHT: Driver Biotelemetry & Adrenaline */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2.5">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3.5 shadow-xl min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300">
              <Activity className="h-4 w-4 text-rose-500" /> BIOTELEMETRY
            </span>
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              {telemetry.gForce > 1.5 ? 'HIGH G' : 'NOMINAL'}
            </span>
          </div>

          {/* Heart Rate BPM */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Heart className="h-3.5 w-3.5 text-rose-400" /> Heart Rate
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-base font-black text-rose-400">
                {telemetry.heartRateBpm}
              </span>
              <span className="text-[10px] text-slate-500">BPM</span>
            </div>
          </div>

          {/* Adrenaline Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Adrenaline Surge</span>
              <span className="font-mono font-bold text-amber-400">{telemetry.adrenalinePercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-150"
                style={{ width: `${telemetry.adrenalinePercent}%` }}
              />
            </div>
          </div>

          {/* G-Force */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-xs">
            <span className="text-slate-400">Lateral Force</span>
            <span className="font-mono font-bold text-cyan-300">{telemetry.gForce} G</span>
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: Real-Time Circuit Radar Mini-Map */}
      <div className="absolute bottom-24 left-4 z-10 hidden sm:block">
        <div className="relative h-40 w-40 rounded-2xl border border-slate-700/80 bg-slate-950/85 p-2 shadow-2xl">
          <div className="absolute top-2 left-2.5 text-[10px] font-bold tracking-wider text-slate-400">
            CIRCUIT RADAR
          </div>

          <svg className="h-full w-full" viewBox="0 0 100 100">
            {/* Track Path */}
            {miniMapPoints.length > 1 && (
              <polyline
                points={miniMapPoints.map((p) => `${p.x * 76 + 12},${p.y * 76 + 14}`).join(' ')}
                fill="none"
                stroke="#334155"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {miniMapPoints.length > 1 && (
              <polyline
                points={miniMapPoints.map((p) => `${p.x * 76 + 12},${p.y * 76 + 14}`).join(' ')}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* AI Rival Blips */}
            {racers
              .filter((r) => !r.isPlayer)
              .map((ai) => {
                const sampleIdx = Math.floor(ai.progress * (miniMapPoints.length - 1));
                const pt = miniMapPoints[sampleIdx] || miniMapPoints[0];
                return (
                  <circle
                    key={ai.id}
                    cx={pt.x * 76 + 12}
                    cy={pt.y * 76 + 14}
                    r="3.2"
                    fill={ai.color}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                );
              })}

            {/* Player Blip (Large Cyan) */}
            {miniMapPoints.length > 0 && (() => {
              const sampleIdx = Math.floor(
                (racers.find((r) => r.isPlayer)?.progress || 0) * (miniMapPoints.length - 1)
              );
              const playerPt = miniMapPoints[sampleIdx] || miniMapPoints[0];
              return (
                <g>
                  <circle
                    cx={playerPt.x * 76 + 12}
                    cy={playerPt.y * 76 + 14}
                    r="4.8"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* BOTTOM RIGHT: Futuristic Speedometer & RPM Gauge */}
      <div className="absolute bottom-24 right-4 z-10">
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-2xl">
          {/* Circular RPM Arc Gauge */}
          <div className="relative h-28 w-44 overflow-hidden">
            <svg className="h-full w-full" viewBox="0 0 200 120">
              {/* Background Arc */}
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Active RPM Arc */}
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="url(#rpmGradient)"
                strokeWidth="14"
                strokeDasharray="251"
                strokeDashoffset={251 * (1 - rpmRatio)}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
              <defs>
                <linearGradient id="rpmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="70%" stopColor="#3b82f6" />
                  <stop offset="90%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* Needle Pivot */}
            <div
              className="absolute bottom-0 left-1/2 h-20 w-1 origin-bottom bg-cyan-400 transition-transform duration-75"
              style={{
                transform: `translateX(-50%) rotate(${tachAngle}deg)`,
                boxShadow: '0 0 8px #06b6d4',
              }}
            />
          </div>

          {/* Digital Speed & Gear Display */}
          <div className="flex items-baseline gap-3 mt-[-10px]">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400">GEAR</span>
              <span className="font-mono text-2xl font-black text-amber-400">{telemetry.gear}</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-mono text-5xl font-black italic tracking-tighter text-white">
                {telemetry.speedKmh}
              </span>
              <span className="text-xs font-bold text-slate-400">KM/H</span>
            </div>
          </div>

          {/* Nitro Boost Tank Bar */}
          <div className="mt-3 flex w-full flex-col gap-1">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-cyan-300">
                <Zap className="h-3 w-3 text-cyan-400" /> BIO-NITROUS
              </span>
              <span className="font-mono text-cyan-400">{telemetry.nitroPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-100"
                style={{
                  width: `${telemetry.nitroPercent}%`,
                  boxShadow: telemetry.isBoosting ? '0 0 10px #06b6d4' : 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE TOUCH CONTROLS (Only visible on touch / small screens) */}
      <div className="pointer-events-auto absolute bottom-28 left-4 right-4 z-20 flex justify-between md:hidden">
        {/* Left/Right Steer */}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-2xl font-black text-white active:bg-cyan-600"
            onTouchStart={() => onMobileInput('left', true)}
            onTouchEnd={() => onMobileInput('left', false)}
            onMouseDown={() => onMobileInput('left', true)}
            onMouseUp={() => onMobileInput('left', false)}
          >
            ◀
          </button>
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-2xl font-black text-white active:bg-cyan-600"
            onTouchStart={() => onMobileInput('right', true)}
            onTouchEnd={() => onMobileInput('right', false)}
            onMouseDown={() => onMobileInput('right', true)}
            onMouseUp={() => onMobileInput('right', false)}
          >
            ▶
          </button>
        </div>

        {/* Gas, Brake & Boost */}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-600/80 bg-amber-950/80 text-xs font-black text-amber-300 active:bg-amber-600 active:text-white"
            onTouchStart={() => onMobileInput('boost', true)}
            onTouchEnd={() => onMobileInput('boost', false)}
            onMouseDown={() => onMobileInput('boost', true)}
            onMouseUp={() => onMobileInput('boost', false)}
          >
            NITRO
          </button>
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-700 bg-rose-950/80 text-xs font-black text-rose-300 active:bg-rose-600 active:text-white"
            onTouchStart={() => onMobileInput('backward', true)}
            onTouchEnd={() => onMobileInput('backward', false)}
            onMouseDown={() => onMobileInput('backward', true)}
            onMouseUp={() => onMobileInput('backward', false)}
          >
            BRAKE
          </button>
          <button
            type="button"
            className="flex h-16 w-20 items-center justify-center rounded-2xl border border-emerald-600 bg-emerald-700 text-sm font-black text-white active:bg-emerald-500"
            onTouchStart={() => onMobileInput('forward', true)}
            onTouchEnd={() => onMobileInput('forward', false)}
            onMouseDown={() => onMobileInput('forward', true)}
            onMouseUp={() => onMobileInput('forward', false)}
          >
            GAS
          </button>
        </div>
      </div>
    </div>
  );
};
