import * as THREE from 'three';
import { VehicleConfig } from '../types/game';

export interface Car3DObject {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  bioCoreMesh: THREE.Mesh;
  exhaustPipes: THREE.Mesh[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  shadowMesh: THREE.Mesh;
  update: (wheelRotation: number, steerAngle: number, nitroActive: boolean, time: number) => void;
  setColor: (primary: string, glow: string) => void;
  dispose: () => void;
}

/**
 * Creates a circular soft radial gradient contact shadow texture
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates a procedural tire tread texture
 */
function createTireTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e2022';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#111213';
  for (let x = 0; x < 256; x += 16) {
    ctx.fillRect(x, 0, 6, 64);
    ctx.fillRect(x + 8, 10, 4, 44);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/**
 * Generates carbon-fiber pattern texture for aerodynamic splitters & spoilers
 */
function createCarbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#27272a';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function buildProceduralCar(config: VehicleConfig): Car3DObject {
  const carGroup = new THREE.Group();
  carGroup.name = `car_${config.id}`;

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  const tireTexture = createTireTexture();
  texturesToDispose.push(tireTexture);

  const carbonTexture = createCarbonTexture();
  texturesToDispose.push(carbonTexture);

  const shadowTexture = createContactShadowTexture();
  texturesToDispose.push(shadowTexture);

  // 1. Primary Metallic Body Material (Roughness: 0.18, Metalness: 0.88)
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(config.primaryColor),
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
  });
  materialsToDispose.push(bodyMaterial);

  // 2. Carbon-Fiber Aero Material (Roughness: 0.55, Metalness: 0.25)
  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x222225,
    map: carbonTexture,
    metalness: 0.25,
    roughness: 0.55,
  });
  materialsToDispose.push(carbonMaterial);

  // 3. Transmissive Cockpit Glass Material (Transmission: 0.85, Roughness: 0.08)
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.08,
    transmission: 0.85,
    ior: 1.52,
    thickness: 0.5,
    transparent: true,
    opacity: 0.92,
  });
  materialsToDispose.push(glassMaterial);

  // 4. Biomechanical glowing core material
  const bioCoreMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.glowColor),
    emissive: new THREE.Color(config.glowColor),
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.4,
  });
  materialsToDispose.push(bioCoreMaterial);

  // 5. Tire rubber material
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2428,
    map: tireTexture,
    roughness: 0.85,
    metalness: 0.05,
  });
  materialsToDispose.push(tireMaterial);

  // 6. Titanium Rim & Caliper Material
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.95,
    roughness: 0.12,
  });
  materialsToDispose.push(rimMaterial);

  const caliperMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.accentColor),
    metalness: 0.6,
    roughness: 0.3,
  });
  materialsToDispose.push(caliperMaterial);

  // 7. Headlight & Taillight materials
  const headlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
  });
  materialsToDispose.push(headlightMaterial);

  const taillightMaterial = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
  });
  materialsToDispose.push(taillightMaterial);

  // --- PART 1: Main Aerodynamic Lower Chassis / Hull ---
  // Using ExtrudeGeometry with beveled contours for sleek supercar styling
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-0.95, -1.9);
  bodyShape.lineTo(0.95, -1.9);
  bodyShape.quadraticCurveTo(1.02, -0.6, 1.0, 0.4);
  bodyShape.quadraticCurveTo(0.95, 1.4, 0.75, 1.95);
  bodyShape.lineTo(-0.75, 1.95);
  bodyShape.quadraticCurveTo(-0.95, 1.4, -1.0, 0.4);
  bodyShape.quadraticCurveTo(-1.02, -0.6, -0.95, -1.9);

  const extrudeSettings = {
    steps: 1,
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelOffset: 0,
    bevelSegments: 4,
  };

  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
  geometriesToDispose.push(bodyGeom);
  bodyGeom.rotateX(-Math.PI / 2);
  bodyGeom.computeVertexNormals();

  const mainBodyMesh = new THREE.Mesh(bodyGeom, bodyMaterial);
  mainBodyMesh.position.set(0, 0.32, 0);
  mainBodyMesh.castShadow = true;
  mainBodyMesh.receiveShadow = true;
  carGroup.add(mainBodyMesh);

  // --- PART 2: Upper Cabin Canopy & Cockpit Glass ---
  const cabinGeom = new THREE.ConeGeometry(0.72, 1.7, 4);
  geometriesToDispose.push(cabinGeom);
  cabinGeom.rotateY(Math.PI / 4);
  cabinGeom.scale(1.2, 0.45, 1.4);

  const cabinMesh = new THREE.Mesh(cabinGeom, glassMaterial);
  cabinMesh.position.set(0, 0.68, -0.1);
  cabinMesh.castShadow = true;
  carGroup.add(cabinMesh);

  // Interior Driver Seat Silhouette
  const seatGeom = new THREE.BoxGeometry(0.45, 0.35, 0.5);
  geometriesToDispose.push(seatGeom);
  const seatMesh = new THREE.Mesh(seatGeom, carbonMaterial);
  seatMesh.position.set(0, 0.58, -0.15);
  carGroup.add(seatMesh);

  // --- PART 3: Biomechanical Glowing Core (Visible in mid-rear engine bay) ---
  const coreGeom = new THREE.TorusGeometry(0.24, 0.08, 12, 24);
  geometriesToDispose.push(coreGeom);
  coreGeom.rotateX(Math.PI / 2);
  const bioCoreMesh = new THREE.Mesh(coreGeom, bioCoreMaterial);
  bioCoreMesh.position.set(0, 0.52, -0.85);
  carGroup.add(bioCoreMesh);

  // Inner energy sphere
  const coreSphereGeom = new THREE.SphereGeometry(0.12, 12, 12);
  geometriesToDispose.push(coreSphereGeom);
  const coreSphere = new THREE.Mesh(coreSphereGeom, bioCoreMaterial);
  coreSphere.position.set(0, 0.52, -0.85);
  carGroup.add(coreSphere);

  // --- PART 4: Carbon Aerodynamic Front Splitter & Canards ---
  const splitterGeom = new THREE.BoxGeometry(1.85, 0.06, 0.45);
  geometriesToDispose.push(splitterGeom);
  const splitterMesh = new THREE.Mesh(splitterGeom, carbonMaterial);
  splitterMesh.position.set(0, 0.16, 1.88);
  splitterMesh.castShadow = true;
  carGroup.add(splitterMesh);

  // Left & Right Canards
  const canardGeom = new THREE.BoxGeometry(0.25, 0.04, 0.35);
  geometriesToDispose.push(canardGeom);

  const leftCanard = new THREE.Mesh(canardGeom, carbonMaterial);
  leftCanard.position.set(-0.95, 0.3, 1.6);
  leftCanard.rotation.z = -0.3;
  carGroup.add(leftCanard);

  const rightCanard = new THREE.Mesh(canardGeom, carbonMaterial);
  rightCanard.position.set(0.95, 0.3, 1.6);
  rightCanard.rotation.z = 0.3;
  carGroup.add(rightCanard);

  // --- PART 5: Rear Carbon Wing & Diffuser Fins ---
  const wingGeom = new THREE.BoxGeometry(1.9, 0.05, 0.42);
  geometriesToDispose.push(wingGeom);
  const wingMesh = new THREE.Mesh(wingGeom, carbonMaterial);
  wingMesh.position.set(0, 0.88, -1.78);
  wingMesh.castShadow = true;
  carGroup.add(wingMesh);

  // Dual wing stanchions
  const stanchionGeom = new THREE.BoxGeometry(0.06, 0.35, 0.18);
  geometriesToDispose.push(stanchionGeom);

  const leftStanchion = new THREE.Mesh(stanchionGeom, carbonMaterial);
  leftStanchion.position.set(-0.48, 0.72, -1.75);
  leftStanchion.rotation.x = -0.15;
  carGroup.add(leftStanchion);

  const rightStanchion = new THREE.Mesh(stanchionGeom, carbonMaterial);
  rightStanchion.position.set(0.48, 0.72, -1.75);
  rightStanchion.rotation.x = -0.15;
  carGroup.add(rightStanchion);

  // Rear Diffuser
  const diffuserGeom = new THREE.BoxGeometry(1.6, 0.14, 0.35);
  geometriesToDispose.push(diffuserGeom);
  const diffuserMesh = new THREE.Mesh(diffuserGeom, carbonMaterial);
  diffuserMesh.position.set(0, 0.18, -1.9);
  carGroup.add(diffuserMesh);

  // --- PART 6: Dual Exhaust Thruster Ports ---
  const exhaustPipes: THREE.Mesh[] = [];
  const exhaustGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16);
  geometriesToDispose.push(exhaustGeom);
  exhaustGeom.rotateX(Math.PI / 2);

  const exhaustMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.2,
  });
  materialsToDispose.push(exhaustMaterial);

  const leftExhaust = new THREE.Mesh(exhaustGeom, exhaustMaterial);
  leftExhaust.position.set(-0.35, 0.28, -1.98);
  carGroup.add(leftExhaust);
  exhaustPipes.push(leftExhaust);

  const rightExhaust = new THREE.Mesh(exhaustGeom, exhaustMaterial);
  rightExhaust.position.set(0.35, 0.28, -1.98);
  carGroup.add(rightExhaust);
  exhaustPipes.push(rightExhaust);

  // --- PART 7: Headlights and Taillights ---
  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];

  const hlGeom = new THREE.BoxGeometry(0.3, 0.07, 0.1);
  geometriesToDispose.push(hlGeom);

  const leftHeadlight = new THREE.Mesh(hlGeom, headlightMaterial);
  leftHeadlight.position.set(-0.62, 0.38, 1.96);
  leftHeadlight.rotation.y = -0.2;
  carGroup.add(leftHeadlight);
  headlights.push(leftHeadlight);

  const rightHeadlight = new THREE.Mesh(hlGeom, headlightMaterial);
  rightHeadlight.position.set(0.62, 0.38, 1.96);
  rightHeadlight.rotation.y = 0.2;
  carGroup.add(rightHeadlight);
  headlights.push(rightHeadlight);

  // Taillight bar
  const tlGeom = new THREE.BoxGeometry(0.55, 0.06, 0.06);
  geometriesToDispose.push(tlGeom);

  const leftTaillight = new THREE.Mesh(tlGeom, taillightMaterial);
  leftTaillight.position.set(-0.55, 0.45, -1.96);
  carGroup.add(leftTaillight);
  taillights.push(leftTaillight);

  const rightTaillight = new THREE.Mesh(tlGeom, taillightMaterial);
  rightTaillight.position.set(0.55, 0.45, -1.96);
  carGroup.add(rightTaillight);
  taillights.push(rightTaillight);

  // --- PART 8: 4 Wheels (Tires + 5-Spoke Rims + Brake Calipers) ---
  const wheels: THREE.Mesh[] = [];

  const wheelGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 24);
  geometriesToDispose.push(wheelGeom);
  wheelGeom.rotateZ(Math.PI / 2);

  const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 16);
  geometriesToDispose.push(rimGeom);
  rimGeom.rotateZ(Math.PI / 2);

  const caliperGeom = new THREE.BoxGeometry(0.08, 0.16, 0.12);
  geometriesToDispose.push(caliperGeom);

  function createWheelUnit(): { wheelGroup: THREE.Group; tireMesh: THREE.Mesh } {
    const wheelGroup = new THREE.Group();

    const tire = new THREE.Mesh(wheelGeom, tireMaterial);
    tire.castShadow = true;
    wheelGroup.add(tire);
    wheels.push(tire);

    const rim = new THREE.Mesh(rimGeom, rimMaterial);
    wheelGroup.add(rim);

    const caliper = new THREE.Mesh(caliperGeom, caliperMaterial);
    caliper.position.set(0, 0.1, 0.12);
    wheelGroup.add(caliper);

    return { wheelGroup, tireMesh: tire };
  }

  // Front Left
  const frontLeft = createWheelUnit();
  const frontLeftWheel = frontLeft.wheelGroup;
  frontLeftWheel.position.set(-0.95, 0.34, 1.25);
  carGroup.add(frontLeftWheel);

  // Front Right
  const frontRight = createWheelUnit();
  const frontRightWheel = frontRight.wheelGroup;
  frontRightWheel.position.set(0.95, 0.34, 1.25);
  carGroup.add(frontRightWheel);

  // Rear Left
  const rearLeft = createWheelUnit();
  const rearLeftWheel = rearLeft.wheelGroup;
  rearLeftWheel.position.set(-0.95, 0.34, -1.25);
  carGroup.add(rearLeftWheel);

  // Rear Right
  const rearRight = createWheelUnit();
  const rearRightWheel = rearRight.wheelGroup;
  rearRightWheel.position.set(0.95, 0.34, -1.25);
  carGroup.add(rearRightWheel);

  // --- PART 9: Contact Shadow Grounding Plane ---
  // Soft radial contact shadow under the car flush with ground
  const shadowGeom = new THREE.PlaneGeometry(2.6, 4.4);
  geometriesToDispose.push(shadowGeom);
  shadowGeom.rotateX(-Math.PI / 2);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  materialsToDispose.push(shadowMat);

  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.position.set(0, 0.02, 0); // 0.02 above ground to avoid Z-fighting
  shadowMesh.renderOrder = 1;
  carGroup.add(shadowMesh);

  // Initial update
  const carObject: Car3DObject = {
    group: carGroup,
    wheels,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    bioCoreMesh,
    exhaustPipes,
    headlights,
    taillights,
    shadowMesh,
    update: (wheelRotation: number, steerAngle: number, nitroActive: boolean, time: number) => {
      // Steer front wheels
      frontLeftWheel.rotation.y = steerAngle;
      frontRightWheel.rotation.y = steerAngle;

      // Rotate all wheels forward/backward
      wheels.forEach((w) => {
        w.rotation.x = wheelRotation;
      });

      // Bio core pulsation
      const pulseRate = nitroActive ? 12 : 4;
      const pulse = 1.0 + Math.sin(time * pulseRate) * 0.3;
      (bioCoreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = nitroActive ? 2.8 : 1.2 * pulse;
      bioCoreMesh.rotation.z = time * (nitroActive ? 6 : 2);
    },
    setColor: (primary: string, glow: string) => {
      bodyMaterial.color.set(primary);
      bioCoreMaterial.color.set(glow);
      bioCoreMaterial.emissive.set(glow);
    },
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      texturesToDispose.forEach((t) => t.dispose());
    },
  };

  return carObject;
}
