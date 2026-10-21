export interface VehicleConfig {
  id: string;
  name: string;
  classType: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  topSpeed: number; // km/h
  acceleration: number; // 0-100 scale
  handling: number; // steer response
  grip: number; // drift threshold
  nitroEfficiency: number;
  description: string;
  bioChassisType: string;
}

export interface BioCompound {
  cid: number;
  name: string;
  formula: string;
  molecularWeight: number;
  iupacName: string;
  category: 'energy' | 'neuro' | 'recovery' | 'structural';
  biologicalRole: string;
  racingBuffDescription: string;
  statBoosts: {
    topSpeedBonus: number; // %
    accelBonus: number; // %
    handlingBonus: number; // %
    nitroDurationBonus: number; // %
    adrenalineGainBonus: number; // %
  };
  pubchemUrl: string;
  uniprotTarget?: string;
  uniprotAccession?: string;
}

export interface PlayerTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number;
  nitroPercent: number;
  adrenalinePercent: number;
  heartRateBpm: number;
  gForce: number;
  currentLap: number;
  totalLaps: number;
  lapTime: number;
  bestLapTime: number | null;
  totalTime: number;
  position: number;
  totalRacers: number;
  isDrifting: boolean;
  isBoosting: boolean;
  offTrack: boolean;
  distanceAlongTrack: number;
  weather: WeatherType;
  trackGripPercent: number;
}

export interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  color: string;
  lap: number;
  progress: number; // 0 to 1 along track
  totalDistance: number;
  speed: number;
  positionRank: number;
  x: number;
  z: number;
}

export type WeatherType = 'clear' | 'rain' | 'snow';

export interface WeatherCondition {
  type: WeatherType;
  name: string;
  description: string;
  frictionMultiplier: number;
  visibilityDistance: number;
  fogDensity: number;
  skyColor: number;
}

export type CameraViewMode = 'chase' | 'hood' | 'orbit';

export type GameState = 'menu' | 'countdown' | 'racing' | 'paused' | 'finished';
