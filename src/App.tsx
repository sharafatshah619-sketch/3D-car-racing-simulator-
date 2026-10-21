import { useEffect, useRef, useState, useCallback } from 'react';
import { BIO_COMPOUNDS, VEHICLE_CONFIGS } from './data/scienceData';
import { BioCompound, CameraViewMode, PlayerTelemetry, RacerState, VehicleConfig, WeatherType } from './types/game';
import { RacingGameInstance } from './game/RacingGame';
import { soundSystem } from './audio/SoundEffects';
import { HUD } from './components/HUD';
import { ControlDock } from './components/ControlDock';
import { BioLabModal } from './components/BioLabModal';
import { VictoryModal } from './components/VictoryModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<RacingGameInstance | null>(null);

  const [activeVehicle, setActiveVehicle] = useState<VehicleConfig>(VEHICLE_CONFIGS[0]);
  const [activeBioCompound, setActiveBioCompound] = useState<BioCompound>(BIO_COMPOUNDS[0]);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [isMuted, setIsMuted] = useState(false);
  const [isBioLabOpen, setIsBioLabOpen] = useState(false);
  const [isRaceFinished, setIsRaceFinished] = useState(false);
  const [miniMapPoints, setMiniMapPoints] = useState<{ x: number; y: number }[]>([]);

  // Telemetry state for HUD
  const [telemetry, setTelemetry] = useState<PlayerTelemetry>({
    speedKmh: 0,
    rpm: 1000,
    gear: 1,
    nitroPercent: 100,
    adrenalinePercent: 10,
    heartRateBpm: 80,
    gForce: 0,
    currentLap: 1,
    totalLaps: 3,
    lapTime: 0,
    bestLapTime: null,
    totalTime: 0,
    position: 1,
    totalRacers: 4,
    isDrifting: false,
    isBoosting: false,
    offTrack: false,
    distanceAlongTrack: 0,
    weather: 'clear',
    trackGripPercent: 100,
  });

  const [racers, setRacers] = useState<RacerState[]>([]);

  // Throttled frame state updates to prevent excessive React re-renders
  const lastUiUpdateRef = useRef(0);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    // First user gesture triggers audio init
    const startAudioOnInteraction = () => {
      soundSystem.init();
      soundSystem.resume();
      window.removeEventListener('keydown', startAudioOnInteraction);
      window.removeEventListener('pointerdown', startAudioOnInteraction);
    };
    window.addEventListener('keydown', startAudioOnInteraction, { once: true });
    window.addEventListener('pointerdown', startAudioOnInteraction, { once: true });

    const game = new RacingGameInstance(
      canvasMountRef.current,
      activeVehicle,
      activeBioCompound
    );
    gameRef.current = game;
    setMiniMapPoints(game.getTrackMiniMap());

    game.onTelemetryUpdate = (newTelemetry, newRacers) => {
      const now = performance.now();
      // Update React HUD at ~30fps to keep render loop 60+ FPS smooth
      if (now - lastUiUpdateRef.current > 32) {
        setTelemetry(newTelemetry);
        setRacers(newRacers);
        lastUiUpdateRef.current = now;
      }
    };

    game.onRaceFinish = () => {
      setIsRaceFinished(true);
    };

    game.onWeatherChange = (newWeather) => {
      setWeather(newWeather);
    };

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  // Update vehicle
  const handleSelectVehicle = useCallback((veh: VehicleConfig) => {
    setActiveVehicle(veh);
    if (gameRef.current) {
      gameRef.current.setVehicle(veh);
    }
  }, []);

  // Update bio-compound
  const handleSelectBioCompound = useCallback((comp: BioCompound) => {
    setActiveBioCompound(comp);
    if (gameRef.current) {
      gameRef.current.setBioCompound(comp);
    }
  }, []);

  // Cycle camera
  const handleCameraChange = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.cycleCamera();
      setCameraMode(gameRef.current.cameraMode);
    }
  }, []);

  // Toggle weather
  const handleToggleWeather = useCallback(() => {
    if (gameRef.current) {
      const next = gameRef.current.cycleWeather();
      setWeather(next);
    }
  }, []);

  // Toggle audio
  const handleToggleSound = useCallback(() => {
    soundSystem.init();
    soundSystem.resume();
    const muted = soundSystem.toggleMute();
    setIsMuted(muted);
  }, []);

  // Reset race
  const handleResetRace = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.resetRace();
    }
    setIsRaceFinished(false);
  }, []);

  // Mobile virtual buttons
  const handleMobileInput = useCallback(
    (action: 'forward' | 'backward' | 'left' | 'right' | 'boost' | 'drift', active: boolean) => {
      soundSystem.init();
      soundSystem.resume();
      if (!gameRef.current) return;
      gameRef.current.input[action] = active;
    },
    []
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Isolated Three.js WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Main In-Game HUD Overlay */}
      <HUD
        telemetry={telemetry}
        racers={racers}
        miniMapPoints={miniMapPoints}
        onMobileInput={handleMobileInput}
        activeBioName={activeBioCompound.name.split(' ')[0]}
      />

      {/* Collapsible Ergonomic Bottom Control Dock (Three.js Directive Compliant) */}
      <ControlDock
        cameraMode={cameraMode}
        onCameraChange={handleCameraChange}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        onOpenBioLab={() => setIsBioLabOpen(true)}
        onResetRace={handleResetRace}
        activeVehicle={activeVehicle}
        allVehicles={VEHICLE_CONFIGS}
        onSelectVehicle={handleSelectVehicle}
        weather={weather}
        onToggleWeather={handleToggleWeather}
      />

      {/* Bio-Catalyst Molecular Garage Workbench */}
      <BioLabModal
        isOpen={isBioLabOpen}
        onClose={() => setIsBioLabOpen(false)}
        activeCompound={activeBioCompound}
        onSelectCompound={handleSelectBioCompound}
      />

      {/* Victory & Grand Prix Podium Summary Modal */}
      {isRaceFinished && (
        <VictoryModal
          telemetry={telemetry}
          vehicle={activeVehicle}
          bioCompound={activeBioCompound}
          onRestart={handleResetRace}
          onOpenBioLab={() => {
            setIsRaceFinished(false);
            setIsBioLabOpen(true);
          }}
        />
      )}
    </main>
  );
}
