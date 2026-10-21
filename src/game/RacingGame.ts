import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BioCompound, CameraViewMode, GameState, PlayerTelemetry, RacerState, VehicleConfig, WeatherType } from '../types/game';
import { buildProceduralCar, Car3DObject } from './CarModel';
import { buildRacingTrack, TrackData } from './TrackGenerator';
import { InputState, PhysicsEngine } from './PhysicsEngine';
import { AI_RIVALS } from '../data/scienceData';
import { soundSystem } from '../audio/SoundEffects';

export class RacingGameInstance {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  // Track & Physics
  private trackData: TrackData;
  private physics: PhysicsEngine;

  // 3D Objects
  private playerCar: Car3DObject;
  private aiCarObjects: Map<string, Car3DObject> = new Map();
  private nitroParticles: THREE.Points;
  private nitroGeo: THREE.BufferGeometry;
  private nitroMat: THREE.PointsMaterial;
  private skidParticles: THREE.Points;
  private skidGeo: THREE.BufferGeometry;
  private skidMat: THREE.PointsMaterial;

  // Weather System
  public weather: WeatherType = 'clear';
  public onWeatherChange?: (weather: WeatherType) => void;
  private dirLight!: THREE.DirectionalLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private rainParticles!: THREE.Points;
  private rainGeo!: THREE.BufferGeometry;
  private rainMat!: THREE.PointsMaterial;
  private snowParticles!: THREE.Points;
  private snowGeo!: THREE.BufferGeometry;
  private snowMat!: THREE.PointsMaterial;

  // Camera settings
  public cameraMode: CameraViewMode = 'chase';
  private targetCameraPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();

  // Input
  public input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
    drift: false,
  };

  // State callbacks
  public onTelemetryUpdate?: (telemetry: PlayerTelemetry, racers: RacerState[]) => void;
  public onRaceFinish?: (telemetry: PlayerTelemetry) => void;
  public gameState: GameState = 'racing';

  // Keyboard handlers
  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'Space':
        this.input.drift = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyE':
        this.input.boost = true;
        break;
      case 'KeyC':
        this.cycleCamera();
        break;
      case 'KeyV':
        this.cycleWeather();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'Space':
        this.input.drift = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyE':
        this.input.boost = false;
        break;
    }
  };

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  constructor(
    container: HTMLDivElement,
    vehicleConfig: VehicleConfig,
    bioCompound: BioCompound
  ) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0035);

    // 2. Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, -10);

    // 3. Renderer with PBR Pipeline
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 4. RoomEnvironment for realistic metallic reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 5. 3-Point Studio Lighting Rig
    const hemisphereLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    this.hemisphereLight = hemisphereLight;
    this.scene.add(hemisphereLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    this.dirLight = dirLight;
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 400;
    const d = 120;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    // 6. Build Track
    this.trackData = buildRacingTrack();
    this.scene.add(this.trackData.trackMesh);
    this.scene.add(this.trackData.kerbMesh);
    this.scene.add(this.trackData.guardrailMesh);
    this.scene.add(this.trackData.terrainMesh);
    this.scene.add(this.trackData.decorationsGroup);
    this.scene.add(this.trackData.finishBannerGroup);
    this.trackData.boostZones.forEach((b) => this.scene.add(b.mesh));

    // 7. Physics Engine
    this.physics = new PhysicsEngine(vehicleConfig, bioCompound, this.trackData);

    // 8. Player Car Model
    this.playerCar = buildProceduralCar(vehicleConfig);
    this.scene.add(this.playerCar.group);

    // 9. AI Rival Cars
    AI_RIVALS.forEach((rival) => {
      const aiCar = buildProceduralCar(rival.vehicleConfig);
      aiCar.setColor(rival.color, rival.vehicleConfig.glowColor);
      this.scene.add(aiCar.group);
      this.aiCarObjects.set(rival.id, aiCar);
    });

    // 10. Particle Systems (Nitro & Skid Sparks)
    const { nitroPoints, nitroGeo, nitroMat } = this.createNitroParticles();
    this.nitroParticles = nitroPoints;
    this.nitroGeo = nitroGeo;
    this.nitroMat = nitroMat;
    this.scene.add(this.nitroParticles);

    const { skidPoints, skidGeo, skidMat } = this.createSkidParticles();
    this.skidParticles = skidPoints;
    this.skidGeo = skidGeo;
    this.skidMat = skidMat;
    this.scene.add(this.skidParticles);

    // Dynamic Weather Systems (Rain & Snow)
    const { rainPoints, rainGeo, rainMat } = this.createRainParticles();
    this.rainParticles = rainPoints;
    this.rainGeo = rainGeo;
    this.rainMat = rainMat;
    this.scene.add(this.rainParticles);

    const { snowPoints, snowGeo, snowMat } = this.createSnowParticles();
    this.snowParticles = snowPoints;
    this.snowGeo = snowGeo;
    this.snowMat = snowMat;
    this.scene.add(this.snowParticles);

    // 11. Pre-warm Shaders & Event Listeners
    this.renderer.compile(this.scene, this.camera);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    // Start loop
    this.animate();
  }

  private createNitroParticles() {
    const particleCount = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100; // hidden initially
      positions[i * 3 + 2] = 0;

      // Cyan to purple gradient
      colors[i * 3] = 0.1;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    return { nitroPoints: points, nitroGeo: geo, nitroMat: mat };
  }

  private createSkidParticles() {
    const particleCount = 80;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.35,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    return { skidPoints: points, skidGeo: geo, skidMat: mat };
  }

  private createRainParticles() {
    const rainCount = 3500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = Math.random() * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.38,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    return { rainPoints: points, rainGeo: geo, rainMat: mat };
  }

  private createSnowParticles() {
    const snowCount = 2500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(snowCount * 3);

    for (let i = 0; i < snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = Math.random() * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.52,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    return { snowPoints: points, snowGeo: geo, snowMat: mat };
  }

  public setWeather(weather: WeatherType) {
    this.weather = weather;
    this.physics.setWeather(weather);

    const roadMat = this.trackData.trackMesh.material as THREE.MeshStandardMaterial;

    if (weather === 'clear') {
      this.rainParticles.visible = false;
      this.snowParticles.visible = false;

      // Crisp high-visibility sci-fi night
      this.scene.background = new THREE.Color(0x0a0f1d);
      if (this.scene.fog && 'density' in this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.0035;
        this.scene.fog.color.setHex(0x0a0f1d);
      }

      this.dirLight.intensity = 1.6;
      this.dirLight.color.setHex(0xffedd5);
      this.hemisphereLight.intensity = 0.85;
      this.hemisphereLight.color.setHex(0x38bdf8);

      roadMat.roughness = 0.82;
      roadMat.metalness = 0.15;
      roadMat.color.setHex(0xffffff);
    } else if (weather === 'rain') {
      this.rainParticles.visible = true;
      this.snowParticles.visible = false;

      // Dark stormy overcast atmosphere with reduced visibility mist
      this.scene.background = new THREE.Color(0x060a12);
      if (this.scene.fog && 'density' in this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.0078;
        this.scene.fog.color.setHex(0x060a12);
      }

      this.dirLight.intensity = 0.75;
      this.dirLight.color.setHex(0x94a3b8);
      this.hemisphereLight.intensity = 0.55;
      this.hemisphereLight.color.setHex(0x475569);

      // Wet, glossy reflective asphalt
      roadMat.roughness = 0.28;
      roadMat.metalness = 0.40;
      roadMat.color.setHex(0xbfdbfe);
    } else if (weather === 'snow') {
      this.rainParticles.visible = false;
      this.snowParticles.visible = true;

      // Frosted winter blizzard atmosphere with heavy low visibility
      this.scene.background = new THREE.Color(0x182338);
      if (this.scene.fog && 'density' in this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.0092;
        this.scene.fog.color.setHex(0x182338);
      }

      this.dirLight.intensity = 1.1;
      this.dirLight.color.setHex(0xdbeafe);
      this.hemisphereLight.intensity = 0.9;
      this.hemisphereLight.color.setHex(0xe0f2fe);

      // Frosted icy road surface
      roadMat.roughness = 0.65;
      roadMat.metalness = 0.12;
      roadMat.color.setHex(0xe0f2fe);
    }

    soundSystem.setWeatherAudio(this.weather);

    if (this.onWeatherChange) {
      this.onWeatherChange(this.weather);
    }
  }

  public cycleWeather(): WeatherType {
    const next: WeatherType = this.weather === 'clear' ? 'rain' : this.weather === 'rain' ? 'snow' : 'clear';
    this.setWeather(next);
    return next;
  }

  public cycleCamera() {
    if (this.cameraMode === 'chase') {
      this.cameraMode = 'hood';
    } else if (this.cameraMode === 'hood') {
      this.cameraMode = 'orbit';
    } else {
      this.cameraMode = 'chase';
    }
  }

  public setVehicle(config: VehicleConfig) {
    this.physics.setVehicle(config);
    this.playerCar.setColor(config.primaryColor, config.glowColor);
  }

  public setBioCompound(compound: BioCompound) {
    this.physics.setBioCompound(compound);
  }

  public resetRace() {
    this.physics.resetPlayerToStart();
    this.gameState = 'racing';
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.gameState === 'racing') {
      this.physics.update(delta, this.input);

      // Check race completion (after totalLaps)
      if (this.physics.playerLap > this.physics.totalLaps) {
        this.gameState = 'finished';
        if (this.onRaceFinish) {
          this.onRaceFinish(this.physics.getPlayerTelemetry());
        }
      }
    }

    // 1. Update Player 3D Mesh
    this.playerCar.group.position.copy(this.physics.playerPosition);
    this.playerCar.group.rotation.y = this.physics.playerHeading;

    // Body roll during drift/turns
    const rollAngle = -this.physics.steerAngle * 0.12;
    this.playerCar.group.rotation.z = THREE.MathUtils.damp(this.playerCar.group.rotation.z, rollAngle, 8, delta);

    // Pitch during acceleration/braking
    const accelPitch = this.input.forward ? -0.04 : (this.input.backward ? 0.06 : 0);
    this.playerCar.group.rotation.x = THREE.MathUtils.damp(this.playerCar.group.rotation.x, accelPitch, 6, delta);

    this.playerCar.update(
      this.physics.wheelRotation,
      this.physics.steerAngle,
      this.physics.isBoosting,
      elapsedTime
    );

    // 2. Update AI 3D Meshes
    this.physics.aiRivals.forEach((ai) => {
      const aiObj = this.aiCarObjects.get(ai.id);
      if (aiObj) {
        aiObj.group.position.copy(ai.position);
        aiObj.group.rotation.y = ai.heading;
        aiObj.update(ai.wheelRotation, 0, false, elapsedTime);
      }
    });

    // 3. Update Camera Kinematics (Silky smooth exponential damping)
    this.updateCamera(delta);

    // 4. Update Particle Trails
    this.updateParticles(delta, elapsedTime);

    // 5. Notify React HUD
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.physics.getPlayerTelemetry(), this.physics.getRacerStates());
    }

    // 6. Render
    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(delta: number) {
    const heading = this.physics.playerHeading;
    const carPos = this.physics.playerPosition;
    const speedRatio = Math.min(1.0, this.physics.playerSpeed / 75);

    if (this.cameraMode === 'chase') {
      // Dynamic chase camera with speed-based distance and FOV expansion
      const followDist = 7.0 + speedRatio * 2.2;
      const followHeight = 3.2 + (this.physics.isBoosting ? 0.4 : 0);

      const targetX = carPos.x - Math.sin(heading) * followDist;
      const targetZ = carPos.z - Math.cos(heading) * followDist;
      const targetY = carPos.y + followHeight;

      this.targetCameraPos.set(targetX, targetY, targetZ);
      this.targetLookAt.set(
        carPos.x + Math.sin(heading) * 10,
        carPos.y + 1.2,
        carPos.z + Math.cos(heading) * 10
      );

      // FOV speed rush effect (60 base up to 76 during nitro)
      const targetFov = 60 + speedRatio * 10 + (this.physics.isBoosting ? 8 : 0);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, delta);
      this.camera.updateProjectionMatrix();

      // Exponential damping
      this.camera.position.lerp(this.targetCameraPos, Math.min(1.0, 10 * delta));
      this.camera.lookAt(this.targetLookAt);
    } else if (this.cameraMode === 'hood') {
      // First-person cockpit perspective
      const hoodOffset = 0.9;
      const hoodHeight = 0.8;

      this.targetCameraPos.set(
        carPos.x + Math.sin(heading) * hoodOffset,
        carPos.y + hoodHeight,
        carPos.z + Math.cos(heading) * hoodOffset
      );

      this.targetLookAt.set(
        carPos.x + Math.sin(heading) * 30,
        carPos.y + hoodHeight,
        carPos.z + Math.cos(heading) * 30
      );

      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 74 + (this.physics.isBoosting ? 8 : 0), 6, delta);
      this.camera.updateProjectionMatrix();

      this.camera.position.copy(this.targetCameraPos);
      this.camera.lookAt(this.targetLookAt);
    } else {
      // Orbit / Cinematic Spectator Camera
      const orbitAngle = this.clock.getElapsedTime() * 0.4;
      const radius = 9.0;
      this.targetCameraPos.set(
        carPos.x + Math.cos(orbitAngle) * radius,
        carPos.y + 3.5,
        carPos.z + Math.sin(orbitAngle) * radius
      );

      this.camera.position.lerp(this.targetCameraPos, 5 * delta);
      this.camera.lookAt(carPos.x, carPos.y + 1.0, carPos.z);
    }
  }

  private updateParticles(delta: number, elapsedTime: number) {
    // 1. Nitro Thruster Particles
    const nitroPositions = this.nitroGeo.attributes.position.array as Float32Array;
    const count = nitroPositions.length / 3;

    if (this.physics.isBoosting) {
      const heading = this.physics.playerHeading;
      const carPos = this.physics.playerPosition;

      // Spawn behind dual exhausts
      for (let i = 0; i < count; i += 2) {
        if (Math.random() > 0.4) {
          const side = Math.random() > 0.5 ? 0.35 : -0.35;
          const exX = carPos.x - Math.sin(heading) * 2.0 + Math.cos(heading) * side;
          const exZ = carPos.z - Math.cos(heading) * 2.0 - Math.sin(heading) * side;

          nitroPositions[i * 3] = exX + (Math.random() - 0.5) * 0.2;
          nitroPositions[i * 3 + 1] = carPos.y + 0.28 + (Math.random() - 0.5) * 0.15;
          nitroPositions[i * 3 + 2] = exZ + (Math.random() - 0.5) * 0.2;
        } else {
          // Push backward
          nitroPositions[i * 3] -= Math.sin(heading) * 12 * delta;
          nitroPositions[i * 3 + 2] -= Math.cos(heading) * 12 * delta;
        }
      }
      this.nitroGeo.attributes.position.needsUpdate = true;
    } else {
      // Hide nitro particles
      for (let i = 0; i < count; i++) {
        nitroPositions[i * 3 + 1] = -100;
      }
      this.nitroGeo.attributes.position.needsUpdate = true;
    }

    // 2. Skid Smoke Particles
    const skidPositions = this.skidGeo.attributes.position.array as Float32Array;
    const skidCount = skidPositions.length / 3;

    if (this.physics.isDrifting) {
      const heading = this.physics.playerHeading;
      const carPos = this.physics.playerPosition;

      for (let i = 0; i < skidCount; i++) {
        if (Math.random() > 0.6) {
          const side = (Math.random() - 0.5) * 1.8;
          skidPositions[i * 3] = carPos.x - Math.sin(heading) * 1.2 + Math.cos(heading) * side;
          skidPositions[i * 3 + 1] = carPos.y + 0.1 + Math.random() * 0.3;
          skidPositions[i * 3 + 2] = carPos.z - Math.cos(heading) * 1.2 - Math.sin(heading) * side;
        } else {
          skidPositions[i * 3 + 1] += 0.4 * delta; // rise up
        }
      }
      this.skidGeo.attributes.position.needsUpdate = true;
    } else {
      for (let i = 0; i < skidCount; i++) {
        skidPositions[i * 3 + 1] = -100;
      }
      this.skidGeo.attributes.position.needsUpdate = true;
    }

    // 3. Dynamic Rain Weather Particles
    if (this.weather === 'rain' && this.rainParticles.visible) {
      const rainPos = this.rainGeo.attributes.position.array as Float32Array;
      const rainCount = rainPos.length / 3;
      const carPos = this.physics.playerPosition;

      for (let i = 0; i < rainCount; i++) {
        rainPos[i * 3 + 1] -= 55 * delta;

        // Reset above car if fallen below ground
        if (rainPos[i * 3 + 1] < carPos.y - 1.0) {
          rainPos[i * 3 + 1] = carPos.y + 36 + Math.random() * 8;
          rainPos[i * 3] = carPos.x + (Math.random() - 0.5) * 130;
          rainPos[i * 3 + 2] = carPos.z + (Math.random() - 0.5) * 130;
        }
        // Lateral bounds tracking
        if (Math.abs(rainPos[i * 3] - carPos.x) > 65) {
          rainPos[i * 3] = carPos.x + (Math.random() - 0.5) * 130;
        }
        if (Math.abs(rainPos[i * 3 + 2] - carPos.z) > 65) {
          rainPos[i * 3 + 2] = carPos.z + (Math.random() - 0.5) * 130;
        }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // 4. Dynamic Snow Weather Particles
    if (this.weather === 'snow' && this.snowParticles.visible) {
      const snowPos = this.snowGeo.attributes.position.array as Float32Array;
      const snowCount = snowPos.length / 3;
      const carPos = this.physics.playerPosition;

      for (let i = 0; i < snowCount; i++) {
        snowPos[i * 3 + 1] -= 5.5 * delta;
        snowPos[i * 3] += Math.sin(elapsedTime * 2.2 + i) * 2.0 * delta;
        snowPos[i * 3 + 2] += Math.cos(elapsedTime * 1.8 + i) * 2.0 * delta;

        if (snowPos[i * 3 + 1] < carPos.y - 0.5) {
          snowPos[i * 3 + 1] = carPos.y + 32 + Math.random() * 6;
          snowPos[i * 3] = carPos.x + (Math.random() - 0.5) * 130;
          snowPos[i * 3 + 2] = carPos.z + (Math.random() - 0.5) * 130;
        }
        if (Math.abs(snowPos[i * 3] - carPos.x) > 65) {
          snowPos[i * 3] = carPos.x + (Math.random() - 0.5) * 130;
        }
        if (Math.abs(snowPos[i * 3 + 2] - carPos.z) > 65) {
          snowPos[i * 3 + 2] = carPos.z + (Math.random() - 0.5) * 130;
        }
      }
      this.snowGeo.attributes.position.needsUpdate = true;
    }
  }

  public getTrackMiniMap() {
    return this.trackData.miniMapPoints;
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    this.playerCar.dispose();
    this.aiCarObjects.forEach((ai) => ai.dispose());
    this.trackData.dispose();

    this.nitroGeo.dispose();
    this.nitroMat.dispose();
    this.skidGeo.dispose();
    this.skidMat.dispose();

    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.snowGeo.dispose();
    this.snowMat.dispose();

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
