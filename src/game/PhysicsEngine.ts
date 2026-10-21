import * as THREE from 'three';
import { BioCompound, PlayerTelemetry, RacerState, VehicleConfig } from '../types/game';
import { TrackData } from './TrackGenerator';
import { soundSystem } from '../audio/SoundEffects';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  drift: boolean;
}

export class PhysicsEngine {
  // Player state
  public playerPosition = new THREE.Vector3(0, 0, 0);
  public playerVelocity = new THREE.Vector3(0, 0, 0);
  public playerHeading = 0; // Yaw angle in radians
  public playerSpeed = 0; // in m/s
  public steerAngle = 0;
  public wheelRotation = 0;
  public isDrifting = false;
  public isBoosting = false;
  public nitroRemaining = 100;
  public adrenaline = 0;
  public heartRate = 80;
  public currentGForce = 0;
  public weather: import('../types/game').WeatherType = 'clear';

  // Laps & Timing
  public playerLap = 1;
  public totalLaps = 3;
  public lapStartTime = 0;
  public currentLapTime = 0;
  public bestLapTime: number | null = null;
  public totalRaceTime = 0;
  public playerProgress = 0;
  public playerTotalDistance = 0;
  public lastProgress = 0;

  // AI Rivals
  public aiRivals: {
    id: string;
    name: string;
    color: string;
    progress: number;
    speed: number;
    laneOffset: number;
    lap: number;
    totalDistance: number;
    position: THREE.Vector3;
    heading: number;
    wheelRotation: number;
    steerAngle: number;
    maxSpeed: number;
    accelRate: number;
  }[] = [];

  private vehicleConfig: VehicleConfig;
  private bioCompound: BioCompound;
  private trackData: TrackData;

  // Reusable vectors at class scope to prevent GC in render loop (Three.js Directive)
  private readonly _forwardVec = new THREE.Vector3();
  private readonly _tempVec = new THREE.Vector3();
  private readonly _trackTangent = new THREE.Vector3();
  private readonly _trackNormal = new THREE.Vector3();

  constructor(vehicleConfig: VehicleConfig, bioCompound: BioCompound, trackData: TrackData) {
    this.vehicleConfig = vehicleConfig;
    this.bioCompound = bioCompound;
    this.trackData = trackData;

    this.resetPlayerToStart();
    this.initAiRivals();
  }

  public setVehicle(config: VehicleConfig) {
    this.vehicleConfig = config;
  }

  public setBioCompound(compound: BioCompound) {
    this.bioCompound = compound;
  }

  public setWeather(weather: import('../types/game').WeatherType) {
    this.weather = weather;
  }

  public getTrackGripMultiplier(): number {
    switch (this.weather) {
      case 'rain':
        return 0.72; // Wet asphalt
      case 'snow':
        return 0.52; // Packed ice & frosted snow
      case 'clear':
      default:
        return 1.0; // Optimal dry track
    }
  }

  public resetPlayerToStart() {
    const startPt = this.trackData.curve.getPointAt(0.005);
    const startTangent = this.trackData.curve.getTangentAt(0.005);

    this.playerPosition.copy(startPt);
    this.playerPosition.y += 0.35;
    this.playerHeading = Math.atan2(startTangent.x, startTangent.z);
    this.playerSpeed = 0;
    this.playerVelocity.set(0, 0, 0);
    this.steerAngle = 0;
    this.wheelRotation = 0;
    this.playerLap = 1;
    this.playerProgress = 0.005;
    this.lastProgress = 0.005;
    this.playerTotalDistance = 0;
    this.nitroRemaining = 100;
    this.adrenaline = 10;
    this.heartRate = 82;
    this.currentLapTime = 0;
    this.totalRaceTime = 0;
    this.lapStartTime = 0;
  }

  private initAiRivals() {
    this.aiRivals = [
      {
        id: 'ai-rival-1',
        name: 'Dr. Vance (Synapse Viper)',
        color: '#ef4444',
        progress: 0.015,
        speed: 0,
        laneOffset: -3.5,
        lap: 1,
        totalDistance: 0.015 * this.trackData.trackLength,
        position: new THREE.Vector3(),
        heading: 0,
        wheelRotation: 0,
        steerAngle: 0,
        maxSpeed: 64, // ~230 km/h
        accelRate: 15,
      },
      {
        id: 'ai-rival-2',
        name: 'Aria Thorne (Bio-Stinger)',
        color: '#eab308',
        progress: 0.010,
        speed: 0,
        laneOffset: 3.5,
        lap: 1,
        totalDistance: 0.010 * this.trackData.trackLength,
        position: new THREE.Vector3(),
        heading: 0,
        wheelRotation: 0,
        steerAngle: 0,
        maxSpeed: 62, // ~223 km/h
        accelRate: 14,
      },
      {
        id: 'ai-rival-3',
        name: 'Kaelen Voss (Apex Mitochondrion)',
        color: '#10b981',
        progress: 0.002,
        speed: 0,
        laneOffset: 0.5,
        lap: 1,
        totalDistance: 0.002 * this.trackData.trackLength,
        position: new THREE.Vector3(),
        heading: 0,
        wheelRotation: 0,
        steerAngle: 0,
        maxSpeed: 60, // ~216 km/h
        accelRate: 13,
      },
    ];

    // Position initial AI positions along the spline
    this.aiRivals.forEach((ai) => {
      this.updateAiTransform(ai, 0);
    });
  }

  public update(delta: number, input: InputState): void {
    // Clamp delta to prevent huge jumps
    const dt = Math.min(delta, 0.1);

    this.totalRaceTime += dt;
    this.currentLapTime += dt;

    // --- 1. Vehicle Parameters with Science Buffs ---
    const topSpeedBonus = 1 + (this.bioCompound.statBoosts.topSpeedBonus / 100);
    const accelBonus = 1 + (this.bioCompound.statBoosts.accelBonus / 100);
    const handlingBonus = 1 + (this.bioCompound.statBoosts.handlingBonus / 100);
    const nitroDurBonus = 1 + (this.bioCompound.statBoosts.nitroDurationBonus / 100);
    const adrenalineGainBonus = 1 + (this.bioCompound.statBoosts.adrenalineGainBonus / 100);

    // Max speed in m/s (270 km/h = 75 m/s)
    const baseTopSpeed = (this.vehicleConfig.topSpeed / 3.6) * topSpeedBonus;
    const baseAccel = (this.vehicleConfig.acceleration * 0.22) * accelBonus;

    // --- 2. Nitro Boost Handling ---
    const wantsBoost = input.boost && this.nitroRemaining > 0 && this.playerSpeed > 5;
    this.isBoosting = wantsBoost;

    let targetMaxSpeed = baseTopSpeed;
    let currentAccel = baseAccel;

    if (wantsBoost) {
      targetMaxSpeed *= 1.35; // +35% top speed during boost
      currentAccel *= 2.2;
      this.nitroRemaining = Math.max(0, this.nitroRemaining - (20 / nitroDurBonus) * dt);
      this.adrenaline = Math.min(100, this.adrenaline + 18 * dt * adrenalineGainBonus);
    } else {
      // Slow passive nitro regeneration (cellular ATP re-phosphorylation)
      const regenRate = 4.5 * (this.bioCompound.cid === 5957 ? 2.0 : 1.0); // ATP gives 2x nitro regen
      this.nitroRemaining = Math.min(100, this.nitroRemaining + regenRate * dt);
    }

    // --- 3. Steering & Drift Mechanics ---
    const maxSteer = 0.58 * handlingBonus;
    const steerSpeed = 4.5 * handlingBonus;

    let targetSteer = 0;
    if (input.left) targetSteer += maxSteer;
    if (input.right) targetSteer -= maxSteer;

    // Smooth steer damping
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, steerSpeed, dt);

    const speedRatio = Math.min(1.0, Math.abs(this.playerSpeed) / 25);
    const weatherGrip = this.getTrackGripMultiplier();
    const driftThreshold = 0.35 * (this.vehicleConfig.grip / 100) * weatherGrip;
    const minDriftSpeed = this.weather === 'snow' ? 8 : (this.weather === 'rain' ? 11 : 15);
    this.isDrifting = (input.drift || Math.abs(this.steerAngle) > driftThreshold) && this.playerSpeed > minDriftSpeed;

    // Turn yaw - slicker surfaces increase lateral slide
    const driftYawMultiplier = this.weather === 'snow' ? 2.1 : (this.weather === 'rain' ? 1.85 : 1.6);
    const turnRate = this.steerAngle * speedRatio * (this.isDrifting ? driftYawMultiplier : 1.0);
    this.playerHeading += turnRate * dt;

    // --- 4. Acceleration & Braking Dynamics ---
    const dragCoeff = 0.992;
    // Wet & snow surfaces reduce rolling friction (easier to slide)
    const rollingFriction = this.weather === 'snow' ? 0.993 : (this.weather === 'rain' ? 0.989 : 0.985);

    // Weather impact on acceleration grip (low traction wheel spin)
    const weatherAccelFactor = this.weather === 'snow' ? 0.78 : (this.weather === 'rain' ? 0.89 : 1.0);

    if (input.forward) {
      if (this.playerSpeed < targetMaxSpeed) {
        this.playerSpeed += currentAccel * weatherAccelFactor * dt;
      }
    } else if (input.backward) {
      if (this.playerSpeed > 2) {
        // Braking: wet road and snow lengthen stopping distances
        const brakePower = this.weather === 'snow' ? 1.05 : (this.weather === 'rain' ? 1.35 : 1.8);
        this.playerSpeed -= baseAccel * brakePower * dt;
      } else {
        // Reverse
        this.playerSpeed = Math.max(-12, this.playerSpeed - baseAccel * 0.7 * dt);
      }
    } else {
      // Natural rolling deceleration
      this.playerSpeed *= Math.pow(rollingFriction, dt * 60);
    }

    // High-speed air resistance drag
    this.playerSpeed *= Math.pow(dragCoeff, dt * 60);

    // Lateral G-force calculation
    const lateralAcc = Math.abs(this.playerSpeed * turnRate);
    this.currentGForce = THREE.MathUtils.damp(this.currentGForce, (lateralAcc / 9.81), 6, dt);

    // Update Adrenaline based on G-force & high speed
    if (this.playerSpeed > 40 || this.currentGForce > 1.2 || this.isDrifting) {
      const gBoost = Math.max(0, this.currentGForce - 0.8) * 8;
      this.adrenaline = Math.min(100, this.adrenaline + (gBoost + 3) * dt * adrenalineGainBonus);
    } else {
      this.adrenaline = Math.max(5, this.adrenaline - 3 * dt);
    }

    // Update Heart Rate (Dynamic Bio-Telemetry: 75 to 175 BPM)
    const targetHeartRate = 75 + (this.playerSpeed / baseTopSpeed) * 55 + (this.currentGForce * 22) + (this.isBoosting ? 25 : 0);
    this.heartRate = THREE.MathUtils.damp(this.heartRate, targetHeartRate, 1.5, dt);

    // Audio Skid Update
    soundSystem.setSkid(this.isDrifting, Math.min(1.0, this.currentGForce / 2.0));
    soundSystem.updateEngine(this.playerSpeed * 3.6, input.forward, this.isBoosting);

    // Wheel rotation
    this.wheelRotation += (this.playerSpeed / 0.34) * dt;

    // --- 5. Update Position & Heading Vector ---
    this._forwardVec.set(Math.sin(this.playerHeading), 0, Math.cos(this.playerHeading));
    this.playerVelocity.copy(this._forwardVec).multiplyScalar(this.playerSpeed);

    this.playerPosition.addScaledVector(this.playerVelocity, dt);

    // --- 6. Spline Projection, Banking, and Track Barrier Collisions ---
    this.handleTrackCollisionsAndElevation(dt);

    // --- 7. Speed Boost Pad Collision ---
    this.checkBoostPads();

    // --- 8. AI Rivals Update ---
    this.updateAiRivals(dt);
  }

  private handleTrackCollisionsAndElevation(dt: number) {
    // Find closest track point to determine current spline progress
    // We search near last progress for efficiency
    const searchWindow = 0.08;
    const samples = 35;
    let closestDistSq = Infinity;
    let bestT = this.playerProgress;

    for (let i = -samples; i <= samples; i++) {
      let t = this.lastProgress + (i / samples) * searchWindow;
      if (t < 0) t += 1.0;
      if (t >= 1.0) t -= 1.0;

      const pt = this.trackData.curve.getPointAt(t);
      const distSq = pt.distanceToSquared(this.playerPosition);
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        bestT = t;
      }
    }

    // Check lap completion
    if (this.lastProgress > 0.90 && bestT < 0.10) {
      // Completed a lap!
      soundSystem.playLapComplete();
      if (!this.bestLapTime || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      this.playerLap++;
      this.currentLapTime = 0;
    } else if (this.lastProgress < 0.10 && bestT > 0.90) {
      // Driven backward across finish line
      this.playerLap = Math.max(1, this.playerLap - 1);
    }

    this.lastProgress = bestT;
    this.playerProgress = bestT;
    this.playerTotalDistance = (this.playerLap - 1) * this.trackData.trackLength + bestT * this.trackData.trackLength;

    // Smoothly adhere car height to track elevation
    const trackPoint = this.trackData.curve.getPointAt(bestT);
    this.playerPosition.y = THREE.MathUtils.damp(this.playerPosition.y, trackPoint.y + 0.35, 12, dt);

    // Lateral boundary collision (guard rails)
    const tangent = this.trackData.curve.getTangentAt(bestT);
    this._trackNormal.set(-tangent.z, 0, tangent.x).normalize();

    this._tempVec.subVectors(this.playerPosition, trackPoint);
    const lateralDist = this._tempVec.dot(this._trackNormal);
    const maxHalfWidth = this.trackData.roadWidth / 2 - 1.2;

    if (Math.abs(lateralDist) > maxHalfWidth) {
      // Bump against guard rail barrier
      const sign = Math.sign(lateralDist);
      const correction = sign * maxHalfWidth;

      // Elastic rebound + speed penalty
      this.playerPosition.sub(this._trackNormal.clone().multiplyScalar(lateralDist - correction));
      this.playerSpeed *= 0.82;
      soundSystem.playCollision();

      // Nudge heading back toward track center
      this.playerHeading += sign * -0.15;
    }
  }

  private checkBoostPads() {
    for (const boost of this.trackData.boostZones) {
      const dist = this.playerPosition.distanceTo(boost.position);
      if (dist < 4.2) {
        // Boost active!
        this.playerSpeed = Math.min(this.playerSpeed + 16, (this.vehicleConfig.topSpeed / 3.6) * 1.4);
        this.nitroRemaining = Math.min(100, this.nitroRemaining + 25);
        soundSystem.playCheckpoint();
        break;
      }
    }
  }

  private updateAiRivals(dt: number) {
    this.aiRivals.forEach((ai, idx) => {
      // Natural acceleration towards their target top speed
      if (ai.speed < ai.maxSpeed) {
        ai.speed += ai.accelRate * dt;
      }

      // Progress along spline
      const deltaProgress = (ai.speed * dt) / this.trackData.trackLength;
      ai.progress += deltaProgress;

      if (ai.progress >= 1.0) {
        ai.progress -= 1.0;
        ai.lap++;
      }

      ai.totalDistance = (ai.lap - 1) * this.trackData.trackLength + ai.progress * this.trackData.trackLength;

      // Slight organic weaving between lanes
      const weave = Math.sin(this.totalRaceTime * 0.8 + idx * 2.0) * 1.5;
      const targetOffset = ai.laneOffset + weave;

      this.updateAiTransform(ai, targetOffset);

      // Check collision with player car
      const distToPlayer = this.playerPosition.distanceTo(ai.position);
      if (distToPlayer < 2.5) {
        // Bump between player and AI
        const pushDir = this.playerPosition.clone().sub(ai.position).normalize();
        this.playerPosition.addScaledVector(pushDir, 0.4);
        ai.position.addScaledVector(pushDir, -0.4);

        this.playerSpeed *= 0.92;
        ai.speed *= 0.92;
        soundSystem.playCollision();
      }
    });
  }

  private updateAiTransform(ai: (typeof this.aiRivals)[0], currentOffset: number) {
    const pt = this.trackData.curve.getPointAt(ai.progress);
    const tangent = this.trackData.curve.getTangentAt(ai.progress);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    ai.position.copy(pt).addScaledVector(normal, currentOffset);
    ai.position.y += 0.35;
    ai.heading = Math.atan2(tangent.x, tangent.z);
    ai.wheelRotation += (ai.speed / 0.34) * 0.016;
  }

  public getPlayerTelemetry(): PlayerTelemetry {
    const speedKmh = Math.max(0, Math.round(this.playerSpeed * 3.6));
    const gear = speedKmh === 0 ? 1 : Math.min(6, Math.floor(speedKmh / 50) + 1);
    const rpm = 1200 + ((speedKmh % 50) / 50) * 7500;

    // Calculate current race ranking
    const allRacers: { id: string; totalDist: number }[] = [
      { id: 'player', totalDist: this.playerTotalDistance },
      ...this.aiRivals.map((ai) => ({ id: ai.id, totalDist: ai.totalDistance })),
    ];
    allRacers.sort((a, b) => b.totalDist - a.totalDist);
    const playerRank = allRacers.findIndex((r) => r.id === 'player') + 1;

    return {
      speedKmh,
      rpm: Math.round(rpm),
      gear,
      nitroPercent: Math.round(this.nitroRemaining),
      adrenalinePercent: Math.round(this.adrenaline),
      heartRateBpm: Math.round(this.heartRate),
      gForce: parseFloat(this.currentGForce.toFixed(2)),
      currentLap: Math.min(this.totalLaps, this.playerLap),
      totalLaps: this.totalLaps,
      lapTime: this.currentLapTime,
      bestLapTime: this.bestLapTime,
      totalTime: this.totalRaceTime,
      position: playerRank,
      totalRacers: this.aiRivals.length + 1,
      isDrifting: this.isDrifting,
      isBoosting: this.isBoosting,
      offTrack: false,
      distanceAlongTrack: this.playerTotalDistance,
      weather: this.weather,
      trackGripPercent: Math.round(this.getTrackGripMultiplier() * 100),
    };
  }

  public getRacerStates(): RacerState[] {
    const list: RacerState[] = [
      {
        id: 'player',
        name: 'You',
        isPlayer: true,
        color: this.vehicleConfig.primaryColor,
        lap: this.playerLap,
        progress: this.playerProgress,
        totalDistance: this.playerTotalDistance,
        speed: Math.round(this.playerSpeed * 3.6),
        positionRank: 1,
        x: this.playerPosition.x,
        z: this.playerPosition.z,
      },
      ...this.aiRivals.map((ai) => ({
        id: ai.id,
        name: ai.name,
        isPlayer: false,
        color: ai.color,
        lap: ai.lap,
        progress: ai.progress,
        totalDistance: ai.totalDistance,
        speed: Math.round(ai.speed * 3.6),
        positionRank: 2,
        x: ai.position.x,
        z: ai.position.z,
      })),
    ];

    list.sort((a, b) => b.totalDistance - a.totalDistance);
    list.forEach((r, idx) => {
      r.positionRank = idx + 1;
    });

    return list;
  }
}
