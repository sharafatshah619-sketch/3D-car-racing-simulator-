import React, { useEffect } from 'react';
import { PlayerTelemetry, VehicleConfig, BioCompound } from '../types/game';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Timer, Zap, Heart, RotateCcw, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  telemetry: PlayerTelemetry;
  vehicle: VehicleConfig;
  bioCompound: BioCompound;
  onRestart: () => void;
  onOpenBioLab: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  telemetry,
  vehicle,
  bioCompound,
  onRestart,
  onOpenBioLab,
}) => {
  useEffect(() => {
    if (telemetry.position <= 3) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback
      }
    }
  }, [telemetry.position]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const isWinner = telemetry.position === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/85" />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header Ribbon */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-3xl border shadow-xl ${
              isWinner
                ? 'border-amber-400/40 bg-amber-500/20 text-amber-400'
                : 'border-cyan-500/30 bg-cyan-950/60 text-cyan-400'
            }`}
          >
            {isWinner ? <Trophy className="h-10 w-10" /> : <Medal className="h-10 w-10" />}
          </div>

          <span className="mt-3 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
            Grand Prix Complete
          </span>

          <h2 className="mt-2 text-3xl font-black italic text-white">
            {isWinner ? 'VICTORY - 1ST PLACE!' : `FINISHED ${telemetry.position}${['st','nd','rd','th'][Math.min(3, telemetry.position-1)]} PLACE`}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Piloting <span className="text-white font-semibold">{vehicle.name}</span> boosted with{' '}
            <span className="text-cyan-400 font-semibold">{bioCompound.name.split(' ')[0]}</span>
          </p>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Timer className="h-4 w-4 text-cyan-400" />
              <span>Total Race Time</span>
            </div>
            <div className="font-mono text-xl font-black text-white">
              {formatTime(telemetry.totalTime)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Best Lap Time</span>
            </div>
            <div className="font-mono text-xl font-black text-emerald-400">
              {telemetry.bestLapTime ? formatTime(telemetry.bestLapTime) : formatTime(telemetry.lapTime)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Heart className="h-4 w-4 text-rose-400" />
              <span>Peak Heart Rate</span>
            </div>
            <div className="font-mono text-xl font-black text-rose-400">
              {telemetry.heartRateBpm} <span className="text-xs text-slate-500 font-normal">BPM</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Peak G-Force</span>
            </div>
            <div className="font-mono text-xl font-black text-amber-400">
              {telemetry.gForce} G
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-black uppercase tracking-wider text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Race Again</span>
          </button>

          <button
            type="button"
            onClick={onOpenBioLab}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <span>Tune in Bio-Lab</span>
          </button>
        </div>
      </div>
    </div>
  );
};
