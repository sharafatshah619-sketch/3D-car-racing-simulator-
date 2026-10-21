import React, { useState } from 'react';
import { CameraViewMode, VehicleConfig, WeatherType } from '../types/game';
import {
  Camera,
  Volume2,
  VolumeX,
  FlaskConical,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Car,
  Keyboard,
  Sun,
  CloudRain,
  CloudSnow,
} from 'lucide-react';

interface ControlDockProps {
  cameraMode: CameraViewMode;
  onCameraChange: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenBioLab: () => void;
  onResetRace: () => void;
  activeVehicle: VehicleConfig;
  allVehicles: VehicleConfig[];
  onSelectVehicle: (v: VehicleConfig) => void;
  weather: WeatherType;
  onToggleWeather: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  cameraMode,
  onCameraChange,
  isMuted,
  onToggleSound,
  onOpenBioLab,
  onResetRace,
  activeVehicle,
  allVehicles,
  onSelectVehicle,
  weather,
  onToggleWeather,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);

  return (
    <div
      className="fixed z-30 transition-transform duration-300 ease-in-out select-none"
      style={{
        bottom: '16px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isCollapsed ? 'calc(100% - 28px)' : '0'})`,
        maxWidth: 'min(940px, 94vw)',
        width: 'max-content',
      }}
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 rounded-t-lg border-t border-x border-slate-700 bg-slate-900 px-3.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-md"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Unified Dock Container */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-4 py-2.5 shadow-2xl">
        {/* Dynamic Weather Toggle (Clear / Rain / Snow) */}
        <button
          type="button"
          onClick={onToggleWeather}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            weather === 'rain'
              ? 'border-blue-500/70 bg-blue-950/70 text-blue-300 hover:bg-blue-900/80'
              : weather === 'snow'
              ? 'border-cyan-300/70 bg-cyan-950/70 text-cyan-200 hover:bg-cyan-900/80'
              : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-500 hover:text-amber-300'
          }`}
          title="Toggle Weather: Clear / Rain / Snow (Press V)"
        >
          {weather === 'rain' ? (
            <>
              <CloudRain className="h-4 w-4 text-blue-400" />
              <span>Rain (72% Grip)</span>
            </>
          ) : weather === 'snow' ? (
            <>
              <CloudSnow className="h-4 w-4 text-cyan-300" />
              <span>Snow (52% Grip)</span>
            </>
          ) : (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Clear Sky (Dry)</span>
            </>
          )}
        </button>

        {/* Camera View Switcher */}
        <button
          type="button"
          onClick={onCameraChange}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
          title="Switch Camera (Press C)"
        >
          <Camera className="h-4 w-4 text-cyan-400" />
          <span className="capitalize">{cameraMode} Cam</span>
        </button>

        {/* Audio FX & Engine Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            isMuted
              ? 'border-rose-900/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
              : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-500 hover:text-emerald-400'
          }`}
          title="Toggle Sound Effects & Engine"
        >
          {isMuted ? (
            <>
              <VolumeX className="h-4 w-4 text-rose-400" />
              <span>Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <span>Audio On</span>
            </>
          )}
        </button>

        {/* Bio-Lab & PubChem Molecular Garage */}
        <button
          type="button"
          onClick={onOpenBioLab}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/70 bg-cyan-950/60 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/80 hover:text-cyan-100 transition-all shadow-sm"
          title="Open Bio-Catalyst & Molecular Garage"
        >
          <FlaskConical className="h-4 w-4 text-cyan-400" />
          <span>Bio-Lab Garage</span>
        </button>

        {/* Vehicle Quick Switch Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVehiclePicker(!showVehiclePicker)}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700 transition-colors"
          >
            <Car className="h-4 w-4 text-amber-400" />
            <span className="max-w-[130px] truncate">{activeVehicle.name}</span>
          </button>

          {showVehiclePicker && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
              <div className="mb-1 px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Vehicle
              </div>
              <div className="flex flex-col gap-1">
                {allVehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onSelectVehicle(v);
                      setShowVehiclePicker(false);
                    }}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${
                      activeVehicle.id === v.id
                        ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="text-[10px] text-slate-400">{v.topSpeed} km/h</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls Keyboard Shortcut Help Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowControlsHelp(!showControlsHelp)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            title="Keyboard Controls Guide"
          >
            <Keyboard className="h-4 w-4 text-slate-400" />
            <span className="hidden sm:inline">Controls</span>
          </button>

          {showControlsHelp && (
            <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl text-xs text-slate-300">
              <div className="font-bold text-white border-b border-slate-800 pb-1 mb-2">
                Racing Controls
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Steer:</span>
                  <span className="font-mono text-cyan-400 font-bold">A / D or ← / →</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Accelerate:</span>
                  <span className="font-mono text-cyan-400 font-bold">W or ↑</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Brake / Reverse:</span>
                  <span className="font-mono text-cyan-400 font-bold">S or ↓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Handbrake Drift:</span>
                  <span className="font-mono text-cyan-400 font-bold">Space</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bio-Nitrous Boost:</span>
                  <span className="font-mono text-cyan-400 font-bold">Shift or E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Change Camera:</span>
                  <span className="font-mono text-cyan-400 font-bold">C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Toggle Weather:</span>
                  <span className="font-mono text-cyan-400 font-bold">V</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Restart Race */}
        <button
          type="button"
          onClick={onResetRace}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Restart Race"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Restart</span>
        </button>
      </div>
    </div>
  );
};
