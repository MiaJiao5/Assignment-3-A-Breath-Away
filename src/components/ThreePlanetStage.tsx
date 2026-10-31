import { useLanguage } from '../i18n/LanguageContext';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLANETS, PlanetId, surfaceCoordinates } from '../data/roamingData';
import { OverheadBubbleData, SpiritPose } from './FluffySpirit';
import { createPlanetGarden } from './PlanetBiomeGarden';
import { BilingualText } from '../i18n/BilingualText';

export interface JoystickVector {
  x: number; // -1 (left) to +1 (right)
  y: number; // -1 (up/forward) to +1 (down/backward)
}

interface ThreePlanetStageProps {
  planetId: PlanetId;
  pose: SpiritPose;
  isMusicPlaying: boolean;
  interactionEnabled?: boolean;
  guideToPortal?: boolean;
  joystickInputRef: React.MutableRefObject<JoystickVector>;
  planetCoordsRef: React.MutableRefObject<{ lon: number; lat: number }>;
  targetCoordsRef: React.MutableRefObject<{ lon: number; lat: number }>;
  springVelocityRef: React.MutableRefObject<{ lon: number; lat: number }>;
  overheadBubble: OverheadBubbleData | null;
  onNearLandmarkChange: (nearRock: boolean, nearPortal: boolean) => void;
  onSelectLandmark: (landmark: 'rock' | 'portal') => void;
}

// 预分配数学辅助对象（避免在 requestAnimationFrame 循环中产生 GC）
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _surfaceNorth = new THREE.Vector3();

// A local seated push-in: the companion and cushion stay in frame, while the
// globe can naturally extend beyond it. Walking retains its original lens.
const CAMERA_FRAMING = {
  walkingFov: 38,
  restingFov: 34,
  restingElevation: 0.85,
  minimumRestingDistance: 3.8,
  response: 1.8,
};

/**
 * 生成柔焦绘本彩铅颗粒感的星球程序化贴图
 */
function createPlanetTexture(
  planetId: PlanetId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const cfg = PLANETS[planetId].colors;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // 1. 柔和基底渐变
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, cfg.planetCore);
  grad.addColorStop(0.5, cfg.planetMid);
  grad.addColorStop(1, cfg.planetEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 喷枪柔焦色块晕染斑点
  const blobs = [
    { x: 110, y: 80, r: 95, color: cfg.blob1 },
    { x: 340, y: 150, r: 110, color: cfg.blob2 },
    { x: 230, y: 65, r: 85, color: cfg.blob3 },
    { x: 420, y: 75, r: 90, color: cfg.blob4 },
    { x: 75, y: 185, r: 85, color: cfg.blob3 },
  ];

  blobs.forEach((b) => {
    ctx.globalAlpha = .28;
    const rad = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r);
    rad.addColorStop(0, b.color);
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // 3. 细腻彩铅颗粒肌理
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = Math.random() * 0.16;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(80,65,95,${alpha * 0.6})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Fine paper/ceramic relief, independent of the planet's painted colors. */
function createSurfaceRelief(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(canvas.width, canvas.height);
  let seed = 4207;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 110 + (seed >>> 25);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/**
 * 生成柔和圆形接触阴影贴图
 */
function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(55, 42, 75, 0.42)');
  grad.addColorStop(0.55, 'rgba(55, 42, 75, 0.16)');
  grad.addColorStop(1, 'rgba(55, 42, 75, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 将球面经纬度 (lon, lat) 安置到半径为 R 的球体表面，并使局部 +Y 朝向球面法线方向
 */
function placeOnSphere(obj: THREE.Object3D, radius: number, lon: number, lat: number) {
  const cosLat = Math.cos(lat);
  const nx = Math.sin(lon) * cosLat;
  const ny = Math.cos(lon) * cosLat;
  const nz = Math.sin(lat);

  obj.position.set(nx * radius, ny * radius, nz * radius);
  // An orthonormal tangent frame keeps feet, shadow and heading on the surface.
  _vec3A.set(Math.cos(lon), -Math.sin(lon), 0);
  _vec3B.set(nx, ny, nz);
  _surfaceNorth.set(-Math.sin(lon) * Math.sin(lat), -Math.cos(lon) * Math.sin(lat), cosLat);
  _mat4.makeBasis(_vec3A, _vec3B, _surfaceNorth);
  obj.quaternion.setFromRotationMatrix(_mat4);
}

export const ThreePlanetStage: React.FC<ThreePlanetStageProps> = ({
  planetId,
  pose,
  isMusicPlaying,
  interactionEnabled = true,
  guideToPortal = false,
  joystickInputRef,
  planetCoordsRef,
  targetCoordsRef,
  springVelocityRef,
  overheadBubble,
  onNearLandmarkChange,
  onSelectLandmark,
}) => {
  const { copy } = useLanguage();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stoneLabelRef = useRef<HTMLSpanElement | null>(null);
  const portalLabelRef = useRef<HTMLSpanElement | null>(null);
  const overheadBubbleRef = useRef<HTMLDivElement | null>(null);

  // 使用 Ref 同步最新 React 状态，避免重建 WebGL 上下文
  const stateRef = useRef({
    planetId,
    pose,
    isMusicPlaying,
    interactionEnabled,
    guideToPortal,
    onNearLandmarkChange,
    onSelectLandmark,
  });

  useEffect(() => {
    stateRef.current = {
      planetId,
      pose,
      isMusicPlaying,
      interactionEnabled,
      guideToPortal,
      onNearLandmarkChange,
      onSelectLandmark,
    };
  }, [planetId, pose, isMusicPlaying, interactionEnabled, guideToPortal, onNearLandmarkChange, onSelectLandmark]);

  // 存储星球材质与灯光引用以便切换星球时平滑更新色彩
  const sceneRefs = useRef<{
    planetMat: THREE.MeshStandardMaterial | null;
    haloMat: THREE.MeshBasicMaterial | null;
    keyLight: THREE.DirectionalLight | null;
    hemiLight: THREE.HemisphereLight | null;
    renderer: THREE.WebGLRenderer | null;
    hopImpulse: number;
    applyBiome: ((id: PlanetId) => void) | null;
  }>({
    planetMat: null,
    haloMat: null,
    keyLight: null,
    hemiLight: null,
    renderer: null,
    hopImpulse: 0,
    applyBiome: null,
  });

  // 当切换星球时更新 3D 星球贴图与光晕颜色
  useEffect(() => {
    const { planetMat, haloMat, renderer } = sceneRefs.current;
    if (!planetMat || !haloMat || !renderer) return;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const oldMap = planetMat.map;
    const newMap = createPlanetTexture(planetId, maxAniso);
    planetMat.map = newMap;
    planetMat.color.copy(new THREE.Color(PLANETS[planetId].colors.planetMid)).lerp(new THREE.Color(0xffffff), .5);
    planetMat.emissive.set(PLANETS[planetId].colors.planetMid);
    planetMat.needsUpdate = true;
    oldMap?.dispose();

    haloMat.color.set(PLANETS[planetId].colors.planetEdge);
    sceneRefs.current.applyBiome?.(planetId);
  }, [planetId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. 检测是否为软件 WebGL (SwiftShader / llvmpipe)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(CAMERA_FRAMING.walkingFov, width / height, 0.1, 100);
    const frameScene = (w: number, h: number) => {
      // Shift the rendered world up together, preserving all surface relationships.
      camera.setViewOffset(w, h, 0, Math.min(22, h * 0.05), w, h);
    };
    frameScene(width, height);
    const wanderingPosition = new THREE.Vector3(0, 4.4, 5.7);
    const wanderingFocus = new THREE.Vector3(0, 0.18, 0);
    const restingPosition = new THREE.Vector3();
    const restingFocus = new THREE.Vector3();
    const restingBack = new THREE.Vector3();
    const restingRight = new THREE.Vector3();
    const restingUp = new THREE.Vector3();
    const framingPoint = new THREE.Vector3();
    const surfaceNormal = new THREE.Vector3();
    const surfaceForward = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const cameraFocus = wanderingFocus.clone();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    camera.position.copy(wanderingPosition);
    camera.lookAt(cameraFocus);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    container.appendChild(renderer.domElement);
    sceneRefs.current.renderer = renderer;

    // 2. Studio PBR Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3. 暖/冷对比三点式柔和灯光组
    const hemiLight = new THREE.HemisphereLight(0xfff5eb, 0x747da3, 1.05);
    scene.add(hemiLight);
    sceneRefs.current.hemiLight = hemiLight;

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.3);
    keyLight.position.set(3.5, 6.0, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 15;
      const d = 3.2;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);
    sceneRefs.current.keyLight = keyLight;

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.9);
    rimLight.position.set(-4.0, 3.0, -3.5);
    scene.add(rimLight);

    const shadowTex = createSoftShadowTexture();

    // =========================================================================
    // 4. 构建 3D 柔焦星球组 (planetPivot)
    // =========================================================================
    const PLANET_RADIUS = 1.68;
    const planetPivot = new THREE.Group();
    planetPivot.name = 'planet-surface';
    planetPivot.position.set(0, -0.82, 0);
    scene.add(planetPivot);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const initialPlanetTex = createPlanetTexture(stateRef.current.planetId, maxAniso);
    const surfaceRelief = createSurfaceRelief();

    const planetGeo = new THREE.SphereGeometry(PLANET_RADIUS, 64, 48);
    const planetMat = new THREE.MeshStandardMaterial({
      map: initialPlanetTex,
      bumpMap: surfaceRelief,
      bumpScale: .009,
      color: new THREE.Color(PLANETS[stateRef.current.planetId].colors.planetMid).lerp(new THREE.Color(0xffffff), .5),
      roughness: 0.88,
      metalness: 0.04,
      emissive: new THREE.Color(PLANETS[stateRef.current.planetId].colors.planetMid),
      emissiveIntensity: 0.055,
      envMapIntensity: .35,
    });
    sceneRefs.current.planetMat = planetMat;

    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.receiveShadow = true;
    planetPivot.add(planetMesh);

    // 外层喷枪弥散柔光大气圈 (Halo Shell)
    const haloGeo = new THREE.SphereGeometry(PLANET_RADIUS * 1.065, 48, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PLANETS[stateRef.current.planetId].colors.planetEdge),
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      depthWrite: false,
    });
    sceneRefs.current.haloMat = haloMat;
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    planetPivot.add(haloMesh);

    // =========================================================================
    // 5. 地标 1：【🪑 聆听石 (Listening Rock Sanctuary)】 (7部分复合模型)
    // =========================================================================
    const rockGroup = new THREE.Group();
    rockGroup.userData.landmark = 'rock';

    const rockShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.62),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    rockShadow.rotation.x = -Math.PI / 2;
    rockShadow.position.y = 0.01;
    rockGroup.add(rockShadow);

    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0x9364af,
      emissive: 0xb673b6,
      emissiveIntensity: 0.03,
      roughness: 0.78,
      metalness: 0.05,
    });
    const stonePad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 24), stoneBaseMat);
    stonePad.position.y = 0.03;
    stonePad.receiveShadow = true;
    rockGroup.add(stonePad);

    const seatCushionMat = new THREE.MeshStandardMaterial({
      color: 0xe88fac,
      emissive: 0xe982ad,
      emissiveIntensity: 0.03,
      roughness: 0.52,
      metalness: 0.08,
    });
    const seatStone = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), seatCushionMat);
    seatStone.scale.set(.27, .115, .25);
    seatStone.position.y = 0.17;
    seatStone.castShadow = true;
    seatStone.receiveShadow = true;
    rockGroup.add(seatStone);

    // A plump mushroom cushion with creamy spots reads clearly at phone scale.
    const spotMat = new THREE.MeshStandardMaterial({ color: 0xffe6b4, roughness: .9, envMapIntensity: .3 });
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const spot = new THREE.Mesh(new THREE.SphereGeometry(.027, 10, 8), spotMat);
      spot.scale.y = .3;
      spot.position.set(Math.cos(a) * .15, .265, Math.sin(a) * .13);
      rockGroup.add(spot);
    }
    const noteBubbles = new THREE.Group();
    rockGroup.add(noteBubbles);
    const noteMat = new THREE.MeshBasicMaterial({ color: 0xffdf84 });
    for (let i = 0; i < 3; i++) {
      const note = new THREE.Group();
      note.position.set(-.18 + i * .17, .38 + i * .035, -.03);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.023, 10, 8), noteMat);
      head.scale.y = .7;
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .075, 6), noteMat);
      staff.position.set(.016, .035, 0);
      const flag = new THREE.Mesh(new THREE.SphereGeometry(.019, 8, 6), noteMat);
      flag.scale.set(1, .35, .4);
      flag.position.set(.03, .068, 0);
      note.add(head, staff, flag);
      noteBubbles.add(note);
    }

    const backrest = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), stoneBaseMat);
    backrest.scale.set(1.15, 0.9, 0.45);
    backrest.position.set(0, 0.2, -0.11);
    backrest.castShadow = true;
    rockGroup.add(backrest);

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x7e658b,
      roughness: 0.4,
      metalness: 0.35,
    });
    const leftStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 12), stemMat);
    leftStem.position.set(-0.2, 0.16, -0.05);
    rockGroup.add(leftStem);

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    const leftLantern = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), lanternMat);
    leftLantern.position.set(-0.2, 0.34, -0.05);
    rockGroup.add(leftLantern);

    const rightCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfbcfe8,
        emissive: 0xf472b6,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.2,
      })
    );
    rightCrystal.position.set(0.2, 0.26, 0.02);
    rockGroup.add(rightCrystal);

    const stoneCoords = surfaceCoordinates(PLANETS[stateRef.current.planetId].landmarks.stone);
    stoneBaseMat.color.set(PLANETS[stateRef.current.planetId].biome.palette.primary);
    seatCushionMat.color.set(PLANETS[stateRef.current.planetId].biome.palette.secondary);
    placeOnSphere(rockGroup, PLANET_RADIUS, stoneCoords.lon, stoneCoords.lat);
    rockGroup.name = 'listening-stone';
    planetPivot.add(rockGroup);

    // A luminous arch and a curved trail invite the first walk to the stone.
    const guidance = new THREE.Group();
    guidance.name = 'listening-guide';
    planetPivot.add(guidance);
    const guideMaterial = new THREE.MeshBasicMaterial({ color: 0xffe7bd, transparent: true, opacity: 0.56, depthWrite: false });
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xfff3de, transparent: true, opacity: 0.07, depthWrite: false });
    const guideCore = new THREE.Mesh(new THREE.BufferGeometry(), guideMaterial);
    const guideGlow = new THREE.Mesh(new THREE.BufferGeometry(), glowMaterial);
    guidance.add(guideCore, guideGlow);
    const guideSpark = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), guideMaterial);
    guidance.add(guideSpark);
    const beacon = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.01, 8, 40, Math.PI), guideMaterial);
    beacon.name = 'listening-beacon';
    beacon.position.y = 0.08;
    rockGroup.add(beacon);
    const arrivalRing = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.008, 8, 40), guideMaterial);
    arrivalRing.rotation.x = -Math.PI / 2;
    arrivalRing.position.y = 0.025;
    rockGroup.add(arrivalRing);
    let guideCurve: THREE.CatmullRomCurve3 | null = null;
    const guideStart = new THREE.Vector3(Infinity, Infinity, Infinity);
    const guideEnd = rockGroup.position.clone().normalize();
    let guideDestination: 'rock' | 'portal' = 'rock';

    const updateGuide = (start: THREE.Vector3) => {
      guideStart.copy(start);
      const from = start.clone().normalize();
      const arcRotation = new THREE.Quaternion().setFromUnitVectors(from, guideEnd);
      const points = Array.from({ length: 21 }, (_, i) => {
        const t = i / 20;
        const rotation = new THREE.Quaternion().slerp(arcRotation, t);
        return from.clone().applyQuaternion(rotation).multiplyScalar(PLANET_RADIUS + 0.06 + Math.sin(Math.PI * t) * 0.2);
      });
      guideCurve = new THREE.CatmullRomCurve3(points);
      guideCore.geometry.dispose();
      guideGlow.geometry.dispose();
      guideCore.geometry = new THREE.TubeGeometry(guideCurve, 40, 0.008, 5, false);
      guideGlow.geometry = new THREE.TubeGeometry(guideCurve, 40, 0.024, 5, false);
    };

    // =========================================================================
    // 6. 地标 2：【🌀 引力传送门 (Gravity Portal Arch)】 (6部分复合模型)
    // =========================================================================
    const portalGroup = new THREE.Group();
    portalGroup.name = 'portal-landmark';
    portalGroup.userData.landmark = 'portal';
    const portalColors = PLANETS[stateRef.current.planetId].portalColors;

    const portalShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.65),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    portalShadow.rotation.x = -Math.PI / 2;
    portalShadow.position.y = 0.01;
    portalGroup.add(portalShadow);

    const portalPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: portalColors.base, roughness: 0.8, metalness: 0.05 })
    );
    portalPedestal.position.y = 0.03;
    portalGroup.add(portalPedestal);

    const portalArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.042, 12, 36),
      new THREE.MeshStandardMaterial({
        color: portalColors.frame,
        emissive: portalColors.glow,
        emissiveIntensity: 0.25,
        roughness: 0.25,
        metalness: 0.4,
      })
    );
    portalArch.position.y = 0.29;
    portalArch.castShadow = true;
    portalGroup.add(portalArch);

    const portalVortex = new THREE.Mesh(
      new THREE.CircleGeometry(0.21, 32),
      new THREE.MeshBasicMaterial({
        color: portalColors.center,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      })
    );
    portalVortex.position.y = 0.29;
    portalGroup.add(portalVortex);

    const portalInnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.014, 12, 28),
      new THREE.MeshStandardMaterial({
        color: portalColors.light,
        emissive: portalColors.light,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      })
    );
    portalInnerRing.position.y = 0.29;
    portalGroup.add(portalInnerRing);

    const orbitRibbon = new THREE.Mesh(new THREE.TorusGeometry(.29, .014, 8, 40), new THREE.MeshStandardMaterial({ color: portalColors.ribbon, emissive: portalColors.glow, emissiveIntensity: .25, roughness: .7 }));
    orbitRibbon.position.y = .29;
    orbitRibbon.rotation.set(.55, .25, -.45);
    portalGroup.add(orbitRibbon);
    const spiralPoints = Array.from({ length: 65 }, (_, i) => {
      const t = i / 64, a = t * Math.PI * 4, r = .025 + .155 * t;
      return new THREE.Vector3(Math.cos(a) * r, .29 + Math.sin(a) * r, .012);
    });
    const portalSpiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), 64, .008, 5, false), new THREE.MeshBasicMaterial({ color: portalColors.light }));
    portalGroup.add(portalSpiral);

    // Recolor the existing meshes on travel; keep their animation and WebGL state.
    const applyPortalColors = (colors: typeof portalColors) => {
      portalPedestal.material.color.set(colors.base);
      portalArch.material.color.set(colors.frame);
      portalArch.material.emissive.set(colors.glow);
      portalVortex.material.color.set(colors.center);
      portalInnerRing.material.color.set(colors.light);
      portalInnerRing.material.emissive.set(colors.light);
      orbitRibbon.material.color.set(colors.ribbon);
      orbitRibbon.material.emissive.set(colors.glow);
      portalSpiral.material.color.set(colors.light);
    };

    const portalCoords = surfaceCoordinates(PLANETS[stateRef.current.planetId].landmarks.portal);
    placeOnSphere(portalGroup, PLANET_RADIUS, portalCoords.lon, portalCoords.lat);
    planetPivot.add(portalGroup);
    let garden = createPlanetGarden(planetPivot, PLANET_RADIUS, PLANETS[stateRef.current.planetId]);

    // =========================================================================
    // 7. 3D 毛茸茸的白色小精灵 (Fluffy White Spirit) (10部分复合模型)
    // =========================================================================
    const spiritRoot = new THREE.Group();
    spiritRoot.name = 'spirit-surface-root';
    placeOnSphere(spiritRoot, PLANET_RADIUS, planetCoordsRef.current.lon, planetCoordsRef.current.lat);
    planetPivot.add(spiritRoot);
    // Parallel-transport the tangent frame instead of clamping geographic angles.
    // This remains continuous across poles and complete trips around the sphere.
    const walkingFrame = spiritRoot.quaternion.clone();
    const initialFrameInverse = walkingFrame.clone().invert();
    const previousWalkCoords = { ...planetCoordsRef.current };
    const travelAxis = new THREE.Vector3();
    const travelStep = new THREE.Quaternion();
    const counterStep = new THREE.Quaternion();
    const planetStep = new THREE.Quaternion();
    const frameInverse = new THREE.Quaternion();
    const followRotation = new THREE.Quaternion();
    const wanderingOffset = wanderingPosition.clone().sub(planetPivot.position);
    const wanderingFocusOffset = wanderingFocus.clone().sub(planetPivot.position);
    const followPosition = new THREE.Vector3();
    const followFocus = new THREE.Vector3();
    const followUp = new THREE.Vector3();
    const rockNormal = rockGroup.position.clone().normalize();
    const portalNormal = portalGroup.position.clone().normalize();
    // Seated body radius + stone footprint + a small visible gap.
    const minimumStoneAngle = 2 * Math.asin((0.27 + 0.28 + 0.035) / (2 * PLANET_RADIUS));
    const candidateFrame = new THREE.Quaternion();
    const collisionNormal = new THREE.Vector3();
    const collisionTangent = new THREE.Vector3();
    const clearanceNormal = new THREE.Vector3();
    const clearanceRotation = new THREE.Quaternion();
    const acceptedStep = new THREE.Quaternion();
    const identityRotation = new THREE.Quaternion();

    const spiritShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.56),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    spiritShadow.name = 'spirit-contact-shadow';
    spiritShadow.rotation.x = -Math.PI / 2;
    spiritShadow.position.y = 0.015;
    spiritRoot.add(spiritShadow);

    const spiritBodyPivot = new THREE.Group();
    spiritBodyPivot.name = 'spirit-body';
    spiritRoot.add(spiritBodyPivot);

    const fluffyWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02,
      emissive: 0xfff5f7,
      emissiveIntensity: 0.08,
      envMapIntensity: .4,
    });

    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 32), fluffyWhiteMat);
    bodyMesh.scale.set(1.06, 0.96, 1.02);
    bodyMesh.position.y = 0.25;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    spiritBodyPivot.add(bodyMesh);

    // A cool rim separates the white plush silhouette from pale ground.
    const bodyOutline = new THREE.Mesh(bodyMesh.geometry, new THREE.MeshBasicMaterial({ color: 0x9a8ab2, side: THREE.BackSide }));
    bodyOutline.position.copy(bodyMesh.position);
    bodyOutline.scale.copy(bodyMesh.scale).multiplyScalar(1.035);
    spiritBodyPivot.add(bodyOutline);

    const topTuft = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 20), fluffyWhiteMat);
    topTuft.position.set(0, 0.48, 0.02);
    spiritBodyPivot.add(topTuft);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x3b302e,
      roughness: 0.2,
      metalness: 0.1,
    });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 16), eyeMat);
    leftEye.position.set(-0.082, 0.28, 0.228);
    spiritBodyPivot.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 16), eyeMat);
    rightEye.position.set(0.082, 0.28, 0.228);
    spiritBodyPivot.add(rightEye);

    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xf29b91,
      roughness: 0.4,
    });
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), noseMat);
    noseMesh.scale.set(1.3, 0.9, 1);
    noseMesh.position.set(0, 0.255, 0.242);
    spiritBodyPivot.add(noseMesh);

    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      emissive: 0xf472b6,
      emissiveIntensity: 0.35,
      roughness: 0.7,
      transparent: true,
      opacity: 0.82,
    });
    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 16), blushMat);
    leftCheek.scale.set(1.2, 0.75, 0.45);
    leftCheek.position.set(-0.145, 0.235, 0.205);
    spiritBodyPivot.add(leftCheek);

    const rightCheek = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 16), blushMat);
    rightCheek.scale.set(1.2, 0.75, 0.45);
    rightCheek.position.set(0.145, 0.235, 0.205);
    spiritBodyPivot.add(rightCheek);

    const leftArm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 16), fluffyWhiteMat);
    leftArm.scale.set(0.85, 1.15, 0.85);
    leftArm.position.set(-0.24, 0.22, 0.04);
    spiritBodyPivot.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 16), fluffyWhiteMat);
    rightArm.scale.set(0.85, 1.15, 0.85);
    rightArm.position.set(0.24, 0.22, 0.04);
    spiritBodyPivot.add(rightArm);

    const leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), fluffyWhiteMat);
    leftFoot.name = 'left-foot';
    leftFoot.scale.set(0.95, 0.65, 1.25);
    leftFoot.position.set(-0.095, 0.045, 0.05);
    spiritBodyPivot.add(leftFoot);

    const rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), fluffyWhiteMat);
    rightFoot.name = 'right-foot';
    rightFoot.scale.set(0.95, 0.65, 1.25);
    rightFoot.position.set(0.095, 0.045, 0.05);
    spiritBodyPivot.add(rightFoot);

    const auraRingGroup = new THREE.Group();
    auraRingGroup.position.y = 0.26;
    spiritRoot.add(auraRingGroup);
    for (let i = 0; i < 8; i++) {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.024, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfef08a : 0xfbcfe8 })
      );
      const angle = (i / 8) * Math.PI * 2;
      star.position.set(Math.cos(angle) * 0.42, (i % 3) * 0.06 - 0.04, Math.sin(angle) * 0.42);
      auraRingGroup.add(star);
    }

    // Fit only the seated focal area, rather than pulling back to fit the globe.
    const restingBounds = [
      { object: spiritRoot, height: 0.25, radius: 0.46 },
      { object: rockGroup, height: 0.19, radius: 0.42 },
    ];
    let walkingStageHeight = height;
    let restingFrameDirty = true;
    let previousResting = false;
    let restingHeightDifference = 16;
    const framingCamera = camera.clone();
    const torsoCenter = new THREE.Vector3();
    const projectionLeft = new THREE.Vector3();
    const walkingTorsoWorld = new THREE.Matrix4();
    const restingTorsoWorld = new THREE.Matrix4();
    const seatedPivot = new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, .008, 0);
    const seatedTorso = new THREE.Matrix4().compose(new THREE.Vector3(0, .25, 0), new THREE.Quaternion(), new THREE.Vector3(1.12, .86, 1.08));
    let captureWalkingBody = true;
    const projectedTorsoWidth = (view: THREE.PerspectiveCamera, matrix: THREE.Matrix4, w: number) => {
      const vertices = bodyMesh.geometry.attributes.position;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < vertices.count; i++) {
        const x = projectionLeft.fromBufferAttribute(vertices, i).applyMatrix4(matrix).project(view).x;
        min = Math.min(min, x);
        max = Math.max(max, x);
      }
      return (max - min) * w / 2;
    };
    const fitRight = new THREE.Vector3(), fitUp = new THREE.Vector3(), fitBack = new THREE.Vector3();
    const fitWorld = new THREE.Vector3(), fitRelative = new THREE.Vector3();
    const virtualWalkingFocus = new THREE.Vector3();
    function fitWanderingCamera(view: THREE.PerspectiveCamera, focus: THREE.Vector3) {
      // Fit actual geometry after animation, including crowns that extend past
      // the globe's silhouette. CSS overflow cannot recover clipped WebGL pixels.
      scene.updateMatrixWorld(true);
      view.updateMatrixWorld(true);
      fitRight.setFromMatrixColumn(view.matrixWorld, 0);
      fitUp.setFromMatrixColumn(view.matrixWorld, 1);
      fitBack.setFromMatrixColumn(view.matrixWorld, 2);
      const w = view.view!.fullWidth, h = view.view!.fullHeight;
      const tan = Math.tan(THREE.MathUtils.degToRad(view.fov / 2));
      const side = tan * view.aspect * (1 - 32 / w);
      const top = tan * (1 - 2 * (14 + view.view!.offsetY) / h);
      const bottom = tan * (1 - 2 * (18 - view.view!.offsetY) / h);
      let distance = view.position.distanceTo(focus);
      let topSupport = -Infinity, bottomSupport = Infinity;
      const include = (point: THREE.Vector3, radius = 0) => {
        fitRelative.copy(point).sub(focus);
        const x = fitRelative.dot(fitRight), y = fitRelative.dot(fitUp), z = fitRelative.dot(fitBack);
        distance = Math.max(distance, z + (Math.abs(x) + radius * Math.hypot(1, side)) / side);
        topSupport = Math.max(topSupport, y + radius * Math.hypot(1, top) + top * z);
        bottomSupport = Math.min(bottomSupport, y - radius * Math.hypot(1, bottom) - bottom * z);
      };
      include(planetPivot.position, PLANET_RADIUS * 1.065 * haloMesh.scale.x);
      const includeMesh = (object: THREE.Object3D) => {
        if (!(object instanceof THREE.Mesh) || !object.visible) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox;
        if (!box || box.isEmpty()) return;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          include(fitWorld.set(x, y, z).applyMatrix4(object.matrixWorld));
        }
      };
      for (const group of [spiritBodyPivot, rockGroup, portalGroup, guidance]) group.traverseVisible(includeMesh);
      garden.framingMeshes.forEach(includeMesh);
      // Shift the composition within its vertical margins before pulling back.
      // This keeps the globe large and avoids a sudden camera retreat when a
      // plant rotates to the lower edge or briefly enlarges on an encounter.
      distance = Math.max(distance, (topSupport - bottomSupport) / (top + bottom));
      const shift = THREE.MathUtils.clamp(0, topSupport - top * distance, bottomSupport + bottom * distance);
      view.position.addScaledVector(fitBack, distance - view.position.distanceTo(focus)).addScaledVector(fitUp, shift);
      focus.addScaledVector(fitUp, shift);
      view.lookAt(focus);
      view.updateMatrixWorld(true);
    }
    const frameRestingScene = () => {
      if (!restingFrameDirty) return;
      restingFrameDirty = false;
      restingBack.copy(surfaceForward).addScaledVector(surfaceNormal, CAMERA_FRAMING.restingElevation).normalize();
      restingRight.crossVectors(surfaceNormal, restingBack).normalize();
      restingUp.crossVectors(restingBack, restingRight).normalize();
      const w = camera.view!.fullWidth;
      const h = camera.view!.fullHeight;
      const offsetY = camera.view!.offsetY;
      const skyHeight = Math.max(120, container.parentElement?.parentElement?.querySelector('.stardust-layer')?.getBoundingClientRect().height ?? 120);
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(CAMERA_FRAMING.restingFov / 2));
      const sideSlope = tanHalfFov * camera.aspect * (1 - 24 / w);
      const topSlope = tanHalfFov * (1 - 2 * (skyHeight + offsetY) / h);
      const bottomSlope = tanHalfFov * (1 - 2 * (12 - offsetY) / h);
      torsoCenter.set(0, .25, 0);
      spiritRoot.localToWorld(torsoCenter);
      if (captureWalkingBody) {
        bodyMesh.updateWorldMatrix(true, false);
        walkingTorsoWorld.copy(bodyMesh.matrixWorld);
        captureWalkingBody = false;
      }
      restingTorsoWorld.copy(spiritRoot.matrixWorld).multiply(seatedPivot).multiply(seatedTorso);
      // The companion, sphere axis and camera share the same horizontal center.
      // Keep some sky above the head without shifting toward the side cushion.
      restingFocus.copy(torsoCenter).addScaledVector(restingUp, .22);

      // Compare with a virtual walking view at this screen size, so zoom is
      // measured on screen rather than cancelled by a compensating wider lens.
      framingCamera.fov = CAMERA_FRAMING.walkingFov;
      framingCamera.setViewOffset(w, walkingStageHeight, 0, Math.min(22, walkingStageHeight * .05), w, walkingStageHeight);
      framingCamera.position.copy(followPosition);
      framingCamera.up.copy(followUp);
      virtualWalkingFocus.copy(followFocus);
      framingCamera.lookAt(virtualWalkingFocus);
      framingCamera.updateMatrixWorld(true);
      fitWanderingCamera(framingCamera, virtualWalkingFocus);
      const targetWidth = projectedTorsoWidth(framingCamera, walkingTorsoWorld, w) * 1.3;
      framingCamera.fov = CAMERA_FRAMING.restingFov;
      framingCamera.setViewOffset(w, h, 0, offsetY, w, h);
      framingCamera.up.copy(surfaceNormal);
      let low = CAMERA_FRAMING.minimumRestingDistance;
      let high = 18;
      for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2;
        framingCamera.position.copy(restingFocus).addScaledVector(restingBack, mid);
        framingCamera.lookAt(restingFocus);
        framingCamera.updateMatrixWorld(true);
        if (projectedTorsoWidth(framingCamera, restingTorsoWorld, w) > targetWidth) low = mid;
        else high = mid;
      }
      let distance = high;
      const focalBounds: { x: number; y: number; z: number; radius: number }[] = [];
      for (const { object, height, radius } of restingBounds) {
        framingPoint.set(0, height, 0);
        object.localToWorld(framingPoint).sub(restingFocus);
        const x = framingPoint.dot(restingRight);
        const y = framingPoint.dot(restingUp);
        const z = framingPoint.dot(restingBack);
        focalBounds.push({ x, y, z, radius });
        distance = Math.max(distance, z + (Math.abs(x) + radius * Math.hypot(1, sideSlope)) / sideSlope);
      }
      // Solve both vertical edges together, allowing the composition to shift.
      // A nearly horizontal top edge must never send the camera far away just
      // because a wrapped thought or status line has reduced the available sky.
      const verticalSlope = Math.max(.06, topSlope + bottomSlope);
      for (const upper of focalBounds) for (const lower of focalBounds) {
        distance = Math.max(distance, (upper.y - lower.y
          + upper.radius * Math.hypot(1, topSlope) + lower.radius * Math.hypot(1, bottomSlope)
          + topSlope * upper.z + bottomSlope * lower.z) / verticalSlope);
      }
      const minimumShift = Math.max(...focalBounds.map(b => b.y + b.radius * Math.hypot(1, topSlope) - topSlope * (distance - b.z)));
      const maximumShift = Math.min(...focalBounds.map(b => b.y - b.radius * Math.hypot(1, bottomSlope) + bottomSlope * (distance - b.z)));
      restingFocus.addScaledVector(restingUp, Math.max(minimumShift, Math.min(0, maximumShift)));
      distance = Math.max(distance, CAMERA_FRAMING.minimumRestingDistance + torsoCenter.clone().sub(restingFocus).dot(restingBack));
      restingPosition.copy(restingFocus).addScaledVector(restingBack, distance);
    };

    const labelPoint = new THREE.Vector3();
    const labelNormal = new THREE.Vector3();
    const viewDirection = new THREE.Vector3();
    const updateLandmarkLabel = (element: HTMLSpanElement | null, landmark: THREE.Group, visible: boolean) => {
      if (!element) return;
      landmark.getWorldPosition(labelPoint);
      labelNormal.copy(labelPoint).sub(planetPivot.position).normalize();
      viewDirection.copy(camera.position).sub(labelPoint).normalize();
      const frontFacing = labelNormal.dot(viewDirection) > .12;
      landmark.localToWorld(labelPoint.set(0, .65, 0)).project(camera);
      const onScreen = Math.abs(labelPoint.x) < .92 && Math.abs(labelPoint.y) < .9;
      element.style.visibility = visible && frontFacing && onScreen ? 'visible' : 'hidden';
      const halfWidth = element.offsetWidth / 2 + 8;
      const x = THREE.MathUtils.clamp((labelPoint.x + 1) * container.clientWidth / 2, halfWidth, container.clientWidth - halfWidth);
      element.style.transform = `translate(${x}px, ${(1 - labelPoint.y) * container.clientHeight / 2}px) translate(-50%, -100%)`;
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // 8. 点击检测 (Raycasting)：区分轻点与手势滑动 (Swipe)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDownRay = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const handleCanvasClick = (ev: MouseEvent) => {
      if (!stateRef.current.interactionEnabled || stateRef.current.pose === 'sitting') return;
      // 如果手指/鼠标滑动距离超过 7px，视为旋转滑动手势，不触发点击
      const moveDist = Math.hypot(
        ev.clientX - pointerDownPos.x,
        ev.clientY - pointerDownPos.y
      );
      if (moveDist > 7) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);

      const spiritHits = raycaster.intersectObjects(spiritBodyPivot.children, false);
      if (spiritHits.length > 0) {
        return;
      }

      const rockHits = raycaster.intersectObjects(rockGroup.children, false);
      if (rockHits.length > 0) {
        stateRef.current.onSelectLandmark('rock');
        return;
      }

      const portalHits = raycaster.intersectObjects(portalGroup.children, false);
      if (portalHits.length > 0) {
        stateRef.current.onSelectLandmark('portal');
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDownRay);
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // =========================================================================
    // 9. 60fps 物理漫步、二阶弹簧缓动 (Spring Interpolation) 与阻尼动画循环
    // =========================================================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let walkPhase = 0;
    let currentYaw = 0;
    let targetYaw = 0;
    let blinkTimer = 0;
    let idleStarted = 0;
    let nextIdleAt = 5 + Math.random() * 3;
    let idleAction: 'sway' | 'think' | 'dance' = 'sway';
    let idleActionStarted = -10;
    const headPoint = new THREE.Vector3();
    let lastNearRock = false;
    let lastNearPortal = false;
    let activeBiomePlanet = stateRef.current.planetId;
    sceneRefs.current.applyBiome = nextId => {
      if (nextId === activeBiomePlanet) return;
      activeBiomePlanet = nextId;
      const next = PLANETS[nextId];
      garden.dispose();
      garden = createPlanetGarden(planetPivot, PLANET_RADIUS, next);
      const stone = surfaceCoordinates(next.landmarks.stone);
      const portal = surfaceCoordinates(next.landmarks.portal);
      placeOnSphere(rockGroup, PLANET_RADIUS, stone.lon, stone.lat);
      placeOnSphere(portalGroup, PLANET_RADIUS, portal.lon, portal.lat);
      rockNormal.copy(rockGroup.position).normalize();
      portalNormal.copy(portalGroup.position).normalize();
      guideEnd.copy(guideDestination === 'portal' ? portalNormal : rockNormal);
      guideStart.set(Infinity, Infinity, Infinity);
      stoneBaseMat.color.set(next.biome.palette.primary);
      seatCushionMat.color.set(next.biome.palette.secondary);
      applyPortalColors(next.portalColors);
      restingFrameDirty = true;
      lastNearRock = false; lastNearPortal = false;
      stateRef.current.onNearLandmarkChange(false, false);
    };
    stateRef.current.onNearLandmarkChange(false, false);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();
      const isResting = stateRef.current.pose === 'sitting';
      if (isResting !== previousResting) {
        if (isResting) restingHeightDifference = camera.view!.fullHeight - walkingStageHeight;
        if (isResting) captureWalkingBody = true;
        restingFrameDirty = true;
        previousResting = isResting;
      }
      if (!isResting) walkingStageHeight = camera.view!.fullHeight;
      const movementLocked = isResting || !stateRef.current.interactionEnabled;

      const joy = joystickInputRef.current;
      const joyMag = Math.min(1, Math.hypot(joy.x, joy.y));
      const isJoystickActive = joyMag > 0.06 && !movementLocked;

      // 1. 当持续摇杆或方向键按下时，平滑推进 targetCoordsRef
      if (isJoystickActive) {
        const walkSpeed = 1.25;
        targetCoordsRef.current.lon += joy.x * walkSpeed * dt;
        targetCoordsRef.current.lat += joy.y * walkSpeed * 0.75 * dt;
      }

      // 2. 弹簧缓动插值 (Spring-like Interpolation)：将 planetCoordsRef 平滑驱向 targetCoordsRef
      const stiffness = 115; // 弹簧刚度
      const damping = 16; // 阻尼系数

      if (movementLocked) {
        targetCoordsRef.current = { ...planetCoordsRef.current };
        springVelocityRef.current = { lon: 0, lat: 0 };
      } else {
        const diffLon = targetCoordsRef.current.lon - planetCoordsRef.current.lon;
        const diffLat = targetCoordsRef.current.lat - planetCoordsRef.current.lat;

        const accelLon = diffLon * stiffness - springVelocityRef.current.lon * damping;
        const accelLat = diffLat * stiffness - springVelocityRef.current.lat * damping;

        springVelocityRef.current.lon += accelLon * dt;
        springVelocityRef.current.lat += accelLat * dt;

        planetCoordsRef.current.lon += springVelocityRef.current.lon * dt;
        planetCoordsRef.current.lat += springVelocityRef.current.lat * dt;
      }

      const springSpeed = Math.hypot(
        springVelocityRef.current.lon,
        springVelocityRef.current.lat
      );
      const isMoving =
        (isJoystickActive || springSpeed > 0.045) && !movementLocked;

      if (isMoving) {
        const moveVx = isJoystickActive ? joy.x : springVelocityRef.current.lon;
        const moveVy = isJoystickActive ? joy.y : springVelocityRef.current.lat;
        if (Math.hypot(moveVx, moveVy) > 0.02) {
          targetYaw = Math.atan2(moveVx, moveVy || 0.001);
        }
        walkPhase += dt * (7.2 + Math.min(1.4, Math.max(joyMag, springSpeed * 0.85)) * 4.5);
      } else if (!isResting) {
        targetYaw = THREE.MathUtils.damp(targetYaw, 0, 3.5, dt);
      }

      const travelX = planetCoordsRef.current.lon - previousWalkCoords.lon;
      const travelZ = planetCoordsRef.current.lat - previousWalkCoords.lat;
      const travelAngle = Math.hypot(travelX, travelZ);
      if (!movementLocked) {
        frameInverse.copy(walkingFrame).invert();
        candidateFrame.copy(walkingFrame);
        if (travelAngle > 1e-10) {
          travelAxis.set(travelZ, 0, -travelX).normalize();
          travelStep.setFromAxisAngle(travelAxis, travelAngle);
          candidateFrame.multiply(travelStep).normalize();
        }
        const keepClear = (obstacle: THREE.Vector3, angle: number) => {
          collisionNormal.set(0, 1, 0).applyQuaternion(candidateFrame);
          const dot = THREE.MathUtils.clamp(collisionNormal.dot(obstacle), -1, 1);
          const cos = Math.cos(angle);
          if (dot <= cos) return;
          collisionTangent.copy(collisionNormal).addScaledVector(obstacle, -dot);
          if (collisionTangent.lengthSq() < 1e-12) {
            collisionTangent.set(0, 1, 0).applyQuaternion(walkingFrame);
            collisionTangent.addScaledVector(obstacle, -collisionTangent.dot(obstacle));
            if (collisionTangent.lengthSq() < 1e-12) collisionTangent.crossVectors(obstacle, Math.abs(obstacle.y) < .9 ? worldUp : _surfaceNorth.set(1, 0, 0));
          }
          collisionTangent.normalize();
          clearanceNormal.copy(obstacle).multiplyScalar(cos).addScaledVector(collisionTangent, Math.sin(angle));
          clearanceRotation.setFromUnitVectors(collisionNormal, clearanceNormal);
          candidateFrame.premultiply(clearanceRotation).normalize();
        };
        // Iterating also resolves the rare overlap between neighboring boundaries.
        for (let pass = 0; pass < 3; pass++) {
          keepClear(rockNormal, minimumStoneAngle);
          keepClear(portalNormal, 2 * Math.asin((.25 + .29 + .04) / (2 * PLANET_RADIUS)));
          for (const obstacle of garden.obstacles) keepClear(obstacle.normal, 2 * Math.asin((.25 + obstacle.radius + .035) / (2 * PLANET_RADIUS)));
        }
        acceptedStep.copy(frameInverse).multiply(candidateFrame).normalize();
        counterStep.copy(acceptedStep).invert().slerp(identityRotation, 0.55);
        planetStep.copy(walkingFrame).multiply(counterStep).multiply(frameInverse);
        planetPivot.quaternion.multiply(planetStep).normalize();
        walkingFrame.copy(candidateFrame);
      }
      previousWalkCoords.lon = planetCoordsRef.current.lon;
      previousWalkCoords.lat = planetCoordsRef.current.lat;
      spiritRoot.quaternion.copy(walkingFrame);
      spiritRoot.position.set(0, PLANET_RADIUS, 0).applyQuaternion(walkingFrame);
      garden.update(elapsed, Math.min(rawDt, .1), spiritRoot, isMoving, !movementLocked, reducedMotion.matches, camera);

      const nextDestination = stateRef.current.guideToPortal ? 'portal' : 'rock';
      if (guideDestination !== nextDestination) {
        guideDestination = nextDestination;
        guideEnd.copy(guideDestination === 'portal' ? portalNormal : rockNormal);
        (guideDestination === 'portal' ? portalGroup : rockGroup).add(beacon, arrivalRing);
        guideStart.set(Infinity, Infinity, Infinity);
      }
      guidance.userData.destination = guideDestination;
      guidance.visible = !isResting;
      beacon.visible = guidance.visible;
      arrivalRing.visible = guidance.visible;
      if (guidance.visible) {
        if (guideStart.distanceToSquared(spiritRoot.position) > 0.0009) updateGuide(spiritRoot.position);
        guideCurve?.getPoint((elapsed * 0.3) % 1, guideSpark.position);
        glowMaterial.opacity = 0.07 + Math.sin(elapsed * 1.6) * 0.015;
        beacon.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.04);
      }

      // Preserve the rear perspective while fitting the whole seated scene.
      const cameraBlend = reducedMotion.matches ? 1 : 1 - Math.exp(-CAMERA_FRAMING.response * Math.min(rawDt, 0.1));
      const targetFov = isResting ? CAMERA_FRAMING.restingFov : CAMERA_FRAMING.walkingFov;
      if (camera.fov !== targetFov) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, cameraBlend);
        if (Math.abs(camera.fov - targetFov) < 0.001) camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
      surfaceNormal.copy(spiritRoot.position).normalize().applyQuaternion(planetPivot.quaternion);
      surfaceForward.set(0, 0, 1).applyQuaternion(spiritRoot.quaternion).applyQuaternion(planetPivot.quaternion);
      followRotation.copy(planetPivot.quaternion).multiply(walkingFrame).multiply(initialFrameInverse);
      followPosition.copy(wanderingOffset).applyQuaternion(followRotation).add(planetPivot.position);
      followFocus.copy(wanderingFocusOffset).applyQuaternion(followRotation).add(planetPivot.position);
      followUp.copy(worldUp).applyQuaternion(followRotation);
      if (isResting) frameRestingScene();
      camera.position.lerp(isResting ? restingPosition : followPosition, cameraBlend);
      cameraFocus.lerp(isResting ? restingFocus : followFocus, cameraBlend);
      camera.up.lerp(isResting ? surfaceNormal : followUp, cameraBlend).normalize();
      camera.lookAt(cameraFocus);

      // 3. 检测小精灵是否接近【🪑 聆听石】或【🌀 引力传送门】
      const currentNormal = spiritRoot.position.clone().normalize();
      const dRock = Math.acos(THREE.MathUtils.clamp(currentNormal.dot(rockNormal), -1, 1));
      const dPortal = Math.acos(THREE.MathUtils.clamp(currentNormal.dot(portalNormal), -1, 1));
      const nearRock = dRock < (lastNearRock ? 0.46 : 0.38);
      const nearPortal = dPortal < (lastNearPortal ? 0.48 : 0.42);
      const nearDestination = guideDestination === 'portal' ? nearPortal : nearRock;
      guideMaterial.opacity = THREE.MathUtils.damp(guideMaterial.opacity, nearDestination ? 0.76 : 0.56, 5, dt);
      stoneBaseMat.emissiveIntensity = THREE.MathUtils.damp(stoneBaseMat.emissiveIntensity, nearRock ? 0.28 : 0.03, 5, dt);
      seatCushionMat.emissiveIntensity = THREE.MathUtils.damp(seatCushionMat.emissiveIntensity, nearRock ? 0.2 : 0.03, 5, dt);
      lanternMat.emissiveIntensity = THREE.MathUtils.damp(lanternMat.emissiveIntensity, nearRock ? 1.2 : 0.85, 5, dt);
      beacon.visible = !isResting && guidance.visible;
      arrivalRing.visible = beacon.visible;

      if (nearRock !== lastNearRock || nearPortal !== lastNearPortal) {
        lastNearRock = nearRock;
        lastNearPortal = nearPortal;
        stateRef.current.onNearLandmarkChange(nearRock, nearPortal);
      }

      // 4. 更新小精灵朝向与姿态动画（漫步 / 乖巧抱膝坐下 / 轻点跳跃）
      const idleAllowed = !isMoving && !movementLocked && stateRef.current.pose === 'idle' && !reducedMotion.matches;
      if (!idleAllowed) {
        idleStarted = elapsed;
        nextIdleAt = elapsed + 5 + Math.random() * 3;
        idleActionStarted = -10;
      } else if (elapsed >= nextIdleAt && elapsed - idleStarted >= 4) {
        idleAction = (['sway', 'think', 'dance'] as const)[Math.floor(Math.random() * 3)];
        idleActionStarted = elapsed;
        nextIdleAt = elapsed + 8 + Math.random() * 5;
      }
      const idleAge = elapsed - idleActionStarted;
      const idleEnvelope = idleAllowed && idleAge >= 0 && idleAge < 3.6 ? Math.sin(idleAge / 3.6 * Math.PI) : 0;
      spiritBodyPivot.userData.idleAction = idleEnvelope > 0 ? idleAction : null;
      const idleTurn = idleAction === 'dance' ? Math.sin(idleAge * 4) * .22 * idleEnvelope : 0;
      const desiredYaw = isResting ? Math.PI : targetYaw + idleTurn;
      const yawDelta = Math.atan2(Math.sin(desiredYaw - currentYaw), Math.cos(desiredYaw - currentYaw));
      currentYaw += yawDelta * (reducedMotion.matches ? 1 : 1 - Math.exp(-8 * dt));
      spiritBodyPivot.rotation.y = currentYaw;

      if (isResting) sceneRefs.current.hopImpulse = 0;
      if (sceneRefs.current.hopImpulse > 0.01) {
        sceneRefs.current.hopImpulse = Math.max(0, sceneRefs.current.hopImpulse - dt * 2.2);
      }
      const hopOffset = Math.sin(sceneRefs.current.hopImpulse * Math.PI) * 0.24;

      if (stateRef.current.pose === 'sitting') {
        const sway = Math.sin(elapsed * 2.2) * 0.07;
        spiritBodyPivot.position.y = THREE.MathUtils.damp(
          spiritBodyPivot.position.y,
          0.008,
          8,
          dt
        );
        spiritBodyPivot.rotation.z = sway;
        bodyMesh.scale.set(1.12, 0.86, 1.08);

        leftArm.position.set(-0.14, 0.16, 0.18);
        rightArm.position.set(0.14, 0.16, 0.18);
        leftFoot.position.set(-0.11, 0.05, 0.18);
        rightFoot.position.set(0.11, 0.05, 0.18);
      } else if (isMoving || stateRef.current.pose === 'walking') {
        const stepBob = Math.abs(Math.sin(walkPhase)) * 0.075;
        const stepSwing = Math.sin(walkPhase);

        spiritBodyPivot.position.y = stepBob + hopOffset;
        spiritBodyPivot.rotation.z = stepSwing * 0.06;
        bodyMesh.scale.set(
          1.06 - stepBob * 0.3,
          0.96 + stepBob * 0.45,
          1.02
        );

        leftFoot.position.set(
          -0.095,
          0.045 + Math.max(0, stepSwing) * 0.06,
          0.05 + stepSwing * 0.08
        );
        rightFoot.position.set(
          0.095,
          0.045 + Math.max(0, -stepSwing) * 0.06,
          0.05 - stepSwing * 0.08
        );

        leftArm.position.set(-0.24, 0.22, 0.04 - stepSwing * 0.07);
        rightArm.position.set(0.24, 0.22, 0.04 + stepSwing * 0.07);
      } else {
        const breathe = 0.008 + Math.sin(elapsed * 2.4) * 0.006;
        spiritBodyPivot.position.y = THREE.MathUtils.damp(
          spiritBodyPivot.position.y,
          breathe + hopOffset,
          8,
          dt
        );
        spiritBodyPivot.rotation.z = THREE.MathUtils.damp(spiritBodyPivot.rotation.z, 0, 6, dt);
        bodyMesh.scale.set(1.06 + breathe * 0.5, 0.96 - breathe * 0.4, 1.02);

        leftArm.position.set(-0.24, 0.22, 0.04);
        rightArm.position.set(0.24, 0.22, 0.04);
        leftFoot.position.set(-0.095, 0.045, 0.05);
        rightFoot.position.set(0.095, 0.045, 0.05);
        if (idleEnvelope > 0) {
          if (idleAction === 'think') {
            spiritBodyPivot.rotation.z = -.13 * idleEnvelope;
            rightArm.position.set(.18, .33, .15);
          } else {
            const dance = idleAction === 'dance';
            const swing = Math.sin(idleAge * (dance ? 5 : 2.5)) * idleEnvelope;
            spiritBodyPivot.rotation.z = swing * (dance ? .13 : .08);
            if (dance) spiritBodyPivot.position.y = breathe + hopOffset + Math.abs(swing) * .035;
            leftArm.position.y += (dance ? .08 : .025) * idleEnvelope;
            rightArm.position.y += (dance ? .08 : .025) * idleEnvelope;
          }
        }
      }

      bodyOutline.scale.copy(bodyMesh.scale).multiplyScalar(1.035);

      // 5. 自然眨眼动画
      blinkTimer += dt;
      const isBlinking = blinkTimer % 3.6 > 3.44 || stateRef.current.pose === 'sitting';
      const eyeScaleY = isBlinking ? 0.18 : 1.0;
      leftEye.scale.y = THREE.MathUtils.damp(leftEye.scale.y, eyeScaleY, 18, dt);
      rightEye.scale.y = THREE.MathUtils.damp(rightEye.scale.y, eyeScaleY, 18, dt);

      // 6. 地标与听歌星尘粒子动画
      rightCrystal.rotation.y = elapsed * 1.4;
      rightCrystal.position.y = 0.26 + Math.sin(elapsed * 2.5) * 0.03;
      noteBubbles.children.forEach((note, index) => {
        note.position.y = .38 + index * .035 + (reducedMotion.matches ? 0 : Math.sin(elapsed * 1.2 + index) * .025);
      });
      portalVortex.rotation.z = -elapsed * 1.8;
      portalInnerRing.rotation.x = Math.sin(elapsed * 1.5) * 0.35;
      portalInnerRing.rotation.y = elapsed * 1.2;

      auraRingGroup.visible = stateRef.current.isMusicPlaying;
      if (stateRef.current.isMusicPlaying) {
        auraRingGroup.rotation.y = elapsed * 0.85;
        haloMesh.scale.setScalar(1.0 + Math.sin(elapsed * 2.0) * 0.035);
      } else {
        haloMesh.scale.setScalar(1.0);
      }

      if (!isResting) fitWanderingCamera(camera, cameraFocus);
      renderer.render(scene, camera);
      const bubble = overheadBubbleRef.current;
      if (bubble && container) {
        topTuft.localToWorld(headPoint.set(0, .075, 0)).project(camera);
        const headX = (headPoint.x + 1) * container.clientWidth / 2;
        const headY = (1 - headPoint.y) * container.clientHeight / 2;
        const halfWidth = bubble.offsetWidth / 2;
        const x = THREE.MathUtils.clamp(headX, halfWidth + 10, container.clientWidth - halfWidth - 10);
        const y = Math.max(bubble.offsetHeight + 6, headY - 20);
        bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        bubble.style.setProperty('--bubble-tail-x', `${headX - x}px`);
        bubble.style.visibility = 'visible';
      }
      updateLandmarkLabel(stoneLabelRef.current, rockGroup, !isResting && stateRef.current.interactionEnabled);
      updateLandmarkLabel(portalLabelRef.current, portalGroup, !isResting && stateRef.current.interactionEnabled);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 380;
      const h = container.clientHeight || 360;
      if (previousResting) walkingStageHeight = Math.max(1, h - restingHeightDifference);
      frameScene(w, h);
      restingFrameDirty = true;
      renderer.setSize(w, h);
      // A hint can wrap/un-wrap without a window resize. Update the fitted
      // view atomically with the canvas instead of leaving one stale frame.
      if (stateRef.current.pose !== 'sitting') {
        fitWanderingCamera(camera, cameraFocus);
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('resize', handleResize);
    // Sitting reveals the message form and changes the stage height without a window resize.
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    const sky = container.parentElement?.parentElement?.querySelector('.stardust-layer');
    if (sky) resizeObserver.observe(sky);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      garden.dispose();
      sceneRefs.current.applyBiome = null;
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(mat => materials.add(mat));
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(mat => mat.dispose());
      planetMat.map?.dispose();
      surfaceRelief.dispose();
      shadowTex.dispose();
      envTexture.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDownRay);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [joystickInputRef, planetCoordsRef, targetCoordsRef, springVelocityRef]);

  return (
    <div className="three-planet-stage relative w-full flex-1 min-h-0 flex items-center justify-center" data-resting={pose === 'sitting'}>
      <span ref={stoneLabelRef} className="landmark-label" style={{ visibility: 'hidden' }} aria-hidden="true">♫ <BilingualText select={c => c.stoneLabel} /></span>
      <span ref={portalLabelRef} className="landmark-label" style={{ visibility: 'hidden' }} aria-hidden="true">✧ <BilingualText select={c => c.portalLabel} /></span>
      {/* 头顶云朵状白色气泡（正常倾诉 4秒 / 空输入错误轻柔晃动提示） */}
      {overheadBubble && (
        <div
          ref={overheadBubbleRef}
          key={overheadBubble.id}
          style={{ visibility: 'hidden' }}
          className={`spirit-overhead-bubble absolute top-0 left-0 z-30 px-4 py-2.5 rounded-3xl text-center pointer-events-none ${
            overheadBubble.isError
              ? 'airbrush-cloud-bubble text-rose-700/95'
              : 'airbrush-cloud-bubble text-slate-700'
          }`}
        >
          <p className="text-xs leading-relaxed font-medium tracking-wide break-words whitespace-pre-wrap">
            {overheadBubble.messageKey ? <BilingualText className="bilingual-block" select={c => overheadBubble.messageKey === 'emptyErrorBubble' ? c.ROAMING_COPY.emptyErrorBubble : c[overheadBubble.messageKey! as 'spiritHint' | 'stoneGuide']} /> : overheadBubble.text}
          </p>
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white/85"
            style={{ marginLeft: 'var(--bubble-tail-x)', opacity: .6 }}
          />
          <div
            className="absolute -bottom-4 left-1/2 translate-x-1 w-2 h-2 rounded-full bg-white/75"
            style={{ marginLeft: 'var(--bubble-tail-x)', opacity: .5 }}
          />
        </div>
      )}

      {/* Three.js 独立挂载容器 */}
      <div
        ref={mountRef}
        role="img"
        className="planet-canvas-mount w-full h-full touch-none cursor-default"
        title={pose === 'sitting' ? copy.restHint : copy.stageHint}
        aria-label={pose === 'sitting' ? copy.restHint : copy.stageHint}
        aria-description={copy.planets[planetId].biomeHint}
      />
    </div>
  );
};
