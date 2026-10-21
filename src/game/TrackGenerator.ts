import * as THREE from 'three';

export interface BoostZone {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  mesh: THREE.Mesh;
  progress: number;
}

export interface TrackData {
  curve: THREE.CatmullRomCurve3;
  trackMesh: THREE.Mesh;
  kerbMesh: THREE.Mesh;
  guardrailMesh: THREE.Mesh;
  terrainMesh: THREE.Mesh;
  boostZones: BoostZone[];
  decorationsGroup: THREE.Group;
  finishBannerGroup: THREE.Group;
  trackPoints: THREE.Vector3[];
  trackLength: number;
  roadWidth: number;
  miniMapPoints: { x: number; y: number }[];
  dispose: () => void;
}

/**
 * Procedural asphalt texture with subtle road grain and lane markings
 */
function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, 512, 1024);

  // Road noise / grain
  const imgData = ctx.getImageData(0, 0, 512, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Outer border lines (White)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(24, 0, 8, 1024);
  ctx.fillRect(512 - 32, 0, 8, 1024);

  // Center dashed lane markings (Cyan Bio-luminescent)
  ctx.fillStyle = '#06b6d4';
  for (let y = 0; y < 1024; y += 96) {
    ctx.fillRect(256 - 4, y, 8, 56);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Red/White alternating racing kerb texture
 */
function createKerbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Red and white stripes
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 64, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 100);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural grass/terrain texture
 */
function createTerrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a'; // Deep sci-fi midnight biome
  ctx.fillRect(0, 0, 512, 512);

  // Subtle bio-circuit grid and mineral specks
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Organic bioluminescent noise
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  for (let i = 0; i < 120; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const r = 2 + Math.random() * 6;
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildRacingTrack(): TrackData {
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  // Key track control points (forming a loop with straights, elevation changes, and high-G turns)
  const baseControlPoints = [
    new THREE.Vector3(0, 0, 0),         // Start / Finish Straight
    new THREE.Vector3(0, 0, 140),       // Main Acceleration Straight
    new THREE.Vector3(45, 6, 220),      // Gentle uphill right bend
    new THREE.Vector3(120, 12, 260),    // Cresting hill top
    new THREE.Vector3(200, 6, 220),     // Fast downhill right sweep
    new THREE.Vector3(220, 0, 130),     // Sector 1 Split
    new THREE.Vector3(170, -3, 60),     // Technical chicane entry
    new THREE.Vector3(190, 0, -20),     // Technical chicane exit
    new THREE.Vector3(150, 4, -120),    // Sector 2 Straight
    new THREE.Vector3(60, 2, -180),     // Hairpin entry
    new THREE.Vector3(-30, 0, -200),    // Hairpin apex
    new THREE.Vector3(-120, -2, -150),  // Hairpin exit
    new THREE.Vector3(-160, 4, -60),    // S-curve rise
    new THREE.Vector3(-140, 8, 30),     // Overpass ridge
    new THREE.Vector3(-80, 2, 80),      // Final corner entry
    new THREE.Vector3(-35, 0, 30),      // Final straight approach
  ];

  const curve = new THREE.CatmullRomCurve3(baseControlPoints, true, 'centripetal', 0.5);
  const segments = 450;
  const roadWidth = 14;
  const trackLength = curve.getLength();

  // Textures
  const roadTexture = createRoadTexture();
  const kerbTexture = createKerbTexture();
  const terrainTexture = createTerrainTexture();
  texturesToDispose.push(roadTexture, kerbTexture, terrainTexture);

  // Sample points along the spline
  const trackPoints: THREE.Vector3[] = [];
  const trackNormals: THREE.Vector3[] = [];
  const trackBinormals: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    trackPoints.push(pt);
    trackNormals.push(normal);
    trackBinormals.push(binormal);
  }

  // --- Build Road Geometry ---
  const roadPositions: number[] = [];
  const roadNormalsArr: number[] = [];
  const roadUVs: number[] = [];
  const roadIndices: number[] = [];

  const halfWidth = roadWidth / 2;

  for (let i = 0; i <= segments; i++) {
    const pt = trackPoints[i];
    const n = trackNormals[i];
    const up = trackBinormals[i];
    const v = i / 10; // UV repetition

    // Left vertex
    const leftPt = pt.clone().addScaledVector(n, -halfWidth);
    roadPositions.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
    roadNormalsArr.push(up.x, up.y, up.z);
    roadUVs.push(0, v);

    // Right vertex
    const rightPt = pt.clone().addScaledVector(n, halfWidth);
    roadPositions.push(rightPt.x, rightPt.y + 0.05, rightPt.z);
    roadNormalsArr.push(up.x, up.y, up.z);
    roadUVs.push(1, v);

    if (i < segments) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      roadIndices.push(v0, v1, v2);
      roadIndices.push(v1, v3, v2);
    }
  }

  const roadGeom = new THREE.BufferGeometry();
  geometriesToDispose.push(roadGeom);
  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeom.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormalsArr, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
  roadGeom.setIndex(roadIndices);

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.82,
    metalness: 0.15,
  });
  materialsToDispose.push(roadMaterial);

  const trackMesh = new THREE.Mesh(roadGeom, roadMaterial);
  trackMesh.receiveShadow = true;

  // --- Build Red/White Kerbs along inner & outer edges ---
  const kerbPositions: number[] = [];
  const kerbNormalsArr: number[] = [];
  const kerbUVs: number[] = [];
  const kerbIndices: number[] = [];
  const kerbWidth = 1.0;

  for (let i = 0; i <= segments; i++) {
    const pt = trackPoints[i];
    const n = trackNormals[i];
    const v = i / 2;

    // Left kerb: outer edge to road edge
    const lKerbOuter = pt.clone().addScaledVector(n, -halfWidth - kerbWidth);
    const lKerbInner = pt.clone().addScaledVector(n, -halfWidth);

    const baseIdx = i * 4;
    kerbPositions.push(lKerbOuter.x, lKerbOuter.y + 0.08, lKerbOuter.z);
    kerbPositions.push(lKerbInner.x, lKerbInner.y + 0.06, lKerbInner.z);
    kerbNormalsArr.push(0, 1, 0, 0, 1, 0);
    kerbUVs.push(0, v, 1, v);

    // Right kerb: road edge to outer edge
    const rKerbInner = pt.clone().addScaledVector(n, halfWidth);
    const rKerbOuter = pt.clone().addScaledVector(n, halfWidth + kerbWidth);

    kerbPositions.push(rKerbInner.x, rKerbInner.y + 0.06, rKerbInner.z);
    kerbPositions.push(rKerbOuter.x, rKerbOuter.y + 0.08, rKerbOuter.z);
    kerbNormalsArr.push(0, 1, 0, 0, 1, 0);
    kerbUVs.push(0, v, 1, v);

    if (i < segments) {
      // Left kerb quad
      kerbIndices.push(baseIdx, baseIdx + 1, baseIdx + 4);
      kerbIndices.push(baseIdx + 1, baseIdx + 5, baseIdx + 4);

      // Right kerb quad
      kerbIndices.push(baseIdx + 2, baseIdx + 3, baseIdx + 6);
      kerbIndices.push(baseIdx + 3, baseIdx + 7, baseIdx + 6);
    }
  }

  const kerbGeom = new THREE.BufferGeometry();
  geometriesToDispose.push(kerbGeom);
  kerbGeom.setAttribute('position', new THREE.Float32BufferAttribute(kerbPositions, 3));
  kerbGeom.setAttribute('normal', new THREE.Float32BufferAttribute(kerbNormalsArr, 3));
  kerbGeom.setAttribute('uv', new THREE.Float32BufferAttribute(kerbUVs, 2));
  kerbGeom.setIndex(kerbIndices);

  const kerbMaterial = new THREE.MeshStandardMaterial({
    map: kerbTexture,
    roughness: 0.6,
    metalness: 0.1,
  });
  materialsToDispose.push(kerbMaterial);

  const kerbMesh = new THREE.Mesh(kerbGeom, kerbMaterial);
  kerbMesh.receiveShadow = true;

  // --- Glowing Guardrail Barriers (Cyan / Amber Neon Edge) ---
  const railPositions: number[] = [];
  const railIndices: number[] = [];
  const railOffset = halfWidth + 1.2;
  const railHeight = 0.9;

  for (let i = 0; i <= segments; i++) {
    const pt = trackPoints[i];
    const n = trackNormals[i];

    // Left barrier bottom & top
    const lBase = pt.clone().addScaledVector(n, -railOffset);
    const lTop = lBase.clone();
    lTop.y += railHeight;

    // Right barrier bottom & top
    const rBase = pt.clone().addScaledVector(n, railOffset);
    const rTop = rBase.clone();
    rTop.y += railHeight;

    const baseIdx = i * 4;
    railPositions.push(lBase.x, lBase.y, lBase.z);
    railPositions.push(lTop.x, lTop.y, lTop.z);
    railPositions.push(rBase.x, rBase.y, rBase.z);
    railPositions.push(rTop.x, rTop.y, rTop.z);

    if (i < segments) {
      // Left rail quad
      railIndices.push(baseIdx, baseIdx + 1, baseIdx + 4);
      railIndices.push(baseIdx + 1, baseIdx + 5, baseIdx + 4);

      // Right rail quad
      railIndices.push(baseIdx + 2, baseIdx + 6, baseIdx + 3);
      railIndices.push(baseIdx + 3, baseIdx + 6, baseIdx + 7);
    }
  }

  const railGeom = new THREE.BufferGeometry();
  geometriesToDispose.push(railGeom);
  railGeom.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railGeom.setIndex(railIndices);
  railGeom.computeVertexNormals();

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.8,
  });
  materialsToDispose.push(railMaterial);

  const guardrailMesh = new THREE.Mesh(railGeom, railMaterial);
  guardrailMesh.receiveShadow = true;

  // --- Expansive Rolling Terrain (Zero Void, Horizon Matched) ---
  const terrainGeom = new THREE.PlaneGeometry(1200, 1200, 80, 80);
  geometriesToDispose.push(terrainGeom);
  terrainGeom.rotateX(-Math.PI / 2);

  // Add gentle landscape undulation
  const posAttr = terrainGeom.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const pz = posAttr.getZ(i);

    // Keep center flatter so track sits nicely, elevate mountains in the perimeter
    const distFromCenter = Math.sqrt(px * px + pz * pz);
    const elevationFactor = Math.min(1.0, Math.max(0, (distFromCenter - 180) / 300));
    const hillHeight = (Math.sin(px * 0.015) * Math.cos(pz * 0.015) * 25 + Math.sin(px * 0.005) * 35) * elevationFactor;

    posAttr.setY(i, -1.0 + hillHeight);
  }
  terrainGeom.computeVertexNormals();

  const terrainMaterial = new THREE.MeshStandardMaterial({
    map: terrainTexture,
    roughness: 0.9,
    metalness: 0.05,
    color: 0x0f172a,
  });
  materialsToDispose.push(terrainMaterial);

  const terrainMesh = new THREE.Mesh(terrainGeom, terrainMaterial);
  terrainMesh.position.y = -0.5;
  terrainMesh.receiveShadow = true;

  // --- Speed Boost Zones along track ---
  const boostZones: BoostZone[] = [];
  const boostProgressPositions = [0.12, 0.38, 0.65, 0.88];

  const boostPadGeom = new THREE.PlaneGeometry(roadWidth * 0.75, 5);
  geometriesToDispose.push(boostPadGeom);
  boostPadGeom.rotateX(-Math.PI / 2);

  const boostCanvas = document.createElement('canvas');
  boostCanvas.width = 256;
  boostCanvas.height = 128;
  const bctx = boostCanvas.getContext('2d')!;
  bctx.fillStyle = '#0284c7';
  bctx.fillRect(0, 0, 256, 128);

  // Chevron arrows
  bctx.fillStyle = '#38bdf8';
  for (let x = 32; x < 256; x += 64) {
    bctx.beginPath();
    bctx.moveTo(x, 110);
    bctx.lineTo(x + 28, 64);
    bctx.lineTo(x, 18);
    bctx.lineTo(x + 18, 18);
    bctx.lineTo(x + 46, 64);
    bctx.lineTo(x + 18, 110);
    bctx.closePath();
    bctx.fill();
  }
  const boostTex = new THREE.CanvasTexture(boostCanvas);
  boostTex.colorSpace = THREE.SRGBColorSpace;
  texturesToDispose.push(boostTex);

  const boostPadMat = new THREE.MeshBasicMaterial({
    map: boostTex,
    transparent: true,
    opacity: 0.9,
  });
  materialsToDispose.push(boostPadMat);

  boostProgressPositions.forEach((p) => {
    const pos = curve.getPointAt(p);
    const tangent = curve.getTangentAt(p);

    const padMesh = new THREE.Mesh(boostPadGeom, boostPadMat);
    padMesh.position.copy(pos);
    padMesh.position.y += 0.08;

    // Align with track tangent
    const angle = Math.atan2(tangent.x, tangent.z);
    padMesh.rotation.y = angle + Math.PI / 2;

    boostZones.push({
      position: pos,
      direction: tangent,
      mesh: padMesh,
      progress: p,
    });
  });

  // --- Finish Line Gantries & Grandstand Banner ---
  const finishBannerGroup = new THREE.Group();

  const startPt = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0);
  const startNormal = new THREE.Vector3().crossVectors(startTangent, new THREE.Vector3(0, 1, 0)).normalize();

  // Dual Gantry Truss Towers
  const towerGeom = new THREE.BoxGeometry(1.2, 8.5, 1.2);
  geometriesToDispose.push(towerGeom);

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.2,
  });
  materialsToDispose.push(trussMat);

  const leftTower = new THREE.Mesh(towerGeom, trussMat);
  leftTower.position.copy(startPt).addScaledVector(startNormal, -halfWidth - 2.5);
  leftTower.position.y += 4.0;
  finishBannerGroup.add(leftTower);

  const rightTower = new THREE.Mesh(towerGeom, trussMat);
  rightTower.position.copy(startPt).addScaledVector(startNormal, halfWidth + 2.5);
  rightTower.position.y += 4.0;
  finishBannerGroup.add(rightTower);

  // Overhead Arch
  const archGeom = new THREE.BoxGeometry(roadWidth + 6, 1.4, 1.8);
  geometriesToDispose.push(archGeom);
  const archMesh = new THREE.Mesh(archGeom, trussMat);
  archMesh.position.copy(startPt);
  archMesh.position.y += 8.0;
  const archAngle = Math.atan2(startTangent.x, startTangent.z);
  archMesh.rotation.y = archAngle + Math.PI / 2;
  finishBannerGroup.add(archMesh);

  // Checkered Finish Line Strip on road
  const checkCanvas = document.createElement('canvas');
  checkCanvas.width = 256;
  checkCanvas.height = 64;
  const cctx = checkCanvas.getContext('2d')!;
  cctx.fillStyle = '#ffffff';
  cctx.fillRect(0, 0, 256, 64);
  cctx.fillStyle = '#000000';
  for (let x = 0; x < 256; x += 32) {
    for (let y = 0; y < 64; y += 32) {
      if ((x + y) % 64 === 0) {
        cctx.fillRect(x, y, 32, 32);
      }
    }
  }
  const checkTex = new THREE.CanvasTexture(checkCanvas);
  checkTex.colorSpace = THREE.SRGBColorSpace;
  texturesToDispose.push(checkTex);

  const checkMat = new THREE.MeshBasicMaterial({ map: checkTex });
  materialsToDispose.push(checkMat);

  const checkGeom = new THREE.PlaneGeometry(roadWidth, 2.5);
  geometriesToDispose.push(checkGeom);
  checkGeom.rotateX(-Math.PI / 2);

  const finishStripMesh = new THREE.Mesh(checkGeom, checkMat);
  finishStripMesh.position.copy(startPt);
  finishStripMesh.position.y += 0.07;
  finishStripMesh.rotation.y = archAngle + Math.PI / 2;
  finishBannerGroup.add(finishStripMesh);

  // --- Instanced Bio-Trees / Cyber Pylons along track periphery ---
  const decorationsGroup = new THREE.Group();

  const treeCount = 180;
  const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 3.8, 8);
  const foliageGeom = new THREE.ConeGeometry(2.4, 6.2, 8);
  geometriesToDispose.push(trunkGeom, foliageGeom);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.1,
  });
  materialsToDispose.push(trunkMat);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x064e3b,
    emissiveIntensity: 0.25,
    roughness: 0.7,
    metalness: 0.2,
  });
  materialsToDispose.push(foliageMat);

  const trunkInstanced = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);
  const foliageInstanced = new THREE.InstancedMesh(foliageGeom, foliageMat, treeCount);

  const dummy = new THREE.Object3D();
  const colorDummy = new THREE.Color();

  for (let i = 0; i < treeCount; i++) {
    const t = Math.random();
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    // Random offset on either side of the track (beyond guardrails)
    const side = Math.random() > 0.5 ? 1 : -1;
    const dist = (roadWidth / 2 + 5) + Math.random() * 45;
    const treePos = pt.clone().addScaledVector(normal, side * dist);
    treePos.y -= 0.2;

    const scale = 0.85 + Math.random() * 0.35; // ±15% variation

    // Trunk matrix
    dummy.position.copy(treePos);
    dummy.position.y += (3.8 * scale) / 2;
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    trunkInstanced.setMatrixAt(i, dummy.matrix);

    // Foliage matrix
    dummy.position.y += (3.8 * scale) / 2 + (6.2 * scale) / 3;
    dummy.updateMatrix();
    foliageInstanced.setMatrixAt(i, dummy.matrix);

    // Subtle bioluminescent hue variation
    const hue = 0.42 + (Math.random() - 0.5) * 0.12;
    colorDummy.setHSL(hue, 0.75, 0.35);
    foliageInstanced.setColorAt(i, colorDummy);
  }

  trunkInstanced.computeBoundingSphere();
  foliageInstanced.computeBoundingSphere();
  decorationsGroup.add(trunkInstanced);
  decorationsGroup.add(foliageInstanced);

  // --- Generate 2D Mini-Map Normalized Path ---
  // Normalize X and Z into 0..1 bounding box for radar rendering
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  baseControlPoints.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  });

  const mapPointsCount = 100;
  const miniMapPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < mapPointsCount; i++) {
    const pt = curve.getPointAt(i / mapPointsCount);
    const normX = (pt.x - minX) / (maxX - minX);
    const normY = (pt.z - minZ) / (maxZ - minZ);
    miniMapPoints.push({ x: normX, y: normY });
  }

  return {
    curve,
    trackMesh,
    kerbMesh,
    guardrailMesh,
    terrainMesh,
    boostZones,
    decorationsGroup,
    finishBannerGroup,
    trackPoints,
    trackLength,
    roadWidth,
    miniMapPoints,
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      texturesToDispose.forEach((t) => t.dispose());
    },
  };
}
