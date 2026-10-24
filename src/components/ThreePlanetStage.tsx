import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLANETS, PlanetId } from '../data/roamingData';
import { OverheadBubbleData, SpiritPose } from './FluffySpirit';

export interface JoystickVector {
  x: number; // -1 (left) to +1 (right)
  y: number; // -1 (up/forward) to +1 (down/backward)
}

interface ThreePlanetStageProps {
  planetId: PlanetId;
  pose: SpiritPose;
  isMusicPlaying: boolean;
  joystickInputRef: React.MutableRefObject<JoystickVector>;
  planetCoordsRef: React.MutableRefObject<{ lon: number; lat: number }>;
  targetCoordsRef: React.MutableRefObject<{ lon: number; lat: number }>;
  springVelocityRef: React.MutableRefObject<{ lon: number; lat: number }>;
  overheadBubble: OverheadBubbleData | null;
  onNearLandmarkChange: (nearRock: boolean, nearPortal: boolean) => void;
  onTapSpirit: () => void;
  onSelectLandmark: (landmark: 'rock' | 'portal') => void;
}

// 预分配数学辅助对象（避免在 requestAnimationFrame 循环中产生 GC）
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _quatB = new THREE.Quaternion();
const _eulerA = new THREE.Euler();
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();

// 地标在星球球面上的经纬度坐标 (单位：弧度)
export const ROCK_COORDS = { lon: 0.68, lat: 0.08 }; // 右前方【🪑 聆听石】
export const PORTAL_COORDS = { lon: -0.72, lat: -0.06 }; // 左前方【🌀 引力传送门】

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
    const rad = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r);
    rad.addColorStop(0, b.color);
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. 细腻彩铅颗粒肌理
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = Math.random() * 0.08;
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
  _vec3A.set(0, 1, 0);
  _vec3B.set(nx, ny, nz).normalize();
  obj.quaternion.setFromUnitVectors(_vec3A, _vec3B);
}

export const ThreePlanetStage: React.FC<ThreePlanetStageProps> = ({
  planetId,
  pose,
  isMusicPlaying,
  joystickInputRef,
  planetCoordsRef,
  targetCoordsRef,
  springVelocityRef,
  overheadBubble,
  onNearLandmarkChange,
  onTapSpirit,
  onSelectLandmark,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // 使用 Ref 同步最新 React 状态，避免重建 WebGL 上下文
  const stateRef = useRef({
    planetId,
    pose,
    isMusicPlaying,
    onNearLandmarkChange,
    onTapSpirit,
    onSelectLandmark,
  });

  useEffect(() => {
    stateRef.current = {
      planetId,
      pose,
      isMusicPlaying,
      onNearLandmarkChange,
      onTapSpirit,
      onSelectLandmark,
    };
  }, [planetId, pose, isMusicPlaying, onNearLandmarkChange, onTapSpirit, onSelectLandmark]);

  // 存储星球材质与灯光引用以便切换星球时平滑更新色彩
  const sceneRefs = useRef<{
    planetMat: THREE.MeshStandardMaterial | null;
    haloMat: THREE.MeshBasicMaterial | null;
    keyLight: THREE.DirectionalLight | null;
    hemiLight: THREE.HemisphereLight | null;
    renderer: THREE.WebGLRenderer | null;
    hopImpulse: number;
  }>({
    planetMat: null,
    haloMat: null,
    keyLight: null,
    hemiLight: null,
    renderer: null,
    hopImpulse: 0,
  });

  // 当切换星球时更新 3D 星球贴图与光晕颜色
  useEffect(() => {
    const { planetMat, haloMat, renderer } = sceneRefs.current;
    if (!planetMat || !haloMat || !renderer) return;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const oldMap = planetMat.map;
    const newMap = createPlanetTexture(planetId, maxAniso);
    planetMat.map = newMap;
    planetMat.emissive.set(PLANETS[planetId].colors.planetMid);
    planetMat.needsUpdate = true;
    oldMap?.dispose();

    haloMat.color.set(PLANETS[planetId].colors.planetEdge);
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

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 2.35, 5.15);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
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
    const hemiLight = new THREE.HemisphereLight(0xfffdf9, 0xd8b4e2, 1.35);
    scene.add(hemiLight);
    sceneRefs.current.hemiLight = hemiLight;

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.55);
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
    planetPivot.position.set(0, -0.82, 0);
    scene.add(planetPivot);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const initialPlanetTex = createPlanetTexture(stateRef.current.planetId, maxAniso);

    const planetGeo = new THREE.SphereGeometry(PLANET_RADIUS, 64, 48);
    const planetMat = new THREE.MeshStandardMaterial({
      map: initialPlanetTex,
      roughness: 0.88,
      metalness: 0.04,
      emissive: new THREE.Color(PLANETS[stateRef.current.planetId].colors.planetMid),
      emissiveIntensity: 0.16,
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

    // 星球表面散落的 36 颗柔和星尘鹅卵石与微光小花苞 (InstancedMesh)
    const pebbleCount = 36;
    const pebbleGeo = new THREE.DodecahedronGeometry(0.048, 1);
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.1,
    });
    const pebbleInstanced = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
    pebbleInstanced.receiveShadow = true;
    pebbleInstanced.castShadow = true;

    const paletteColors = [0xffffff, 0xfde68a, 0xfbcfe8, 0xa7f3d0, 0xc4b5fd];
    for (let i = 0; i < pebbleCount; i++) {
      const lon = (i / pebbleCount) * Math.PI * 2 + (i % 3) * 0.2;
      const lat = ((i * 7) % 11 - 5) * 0.18;
      if (
        (Math.abs(lon - ROCK_COORDS.lon) < 0.28 && Math.abs(lat - ROCK_COORDS.lat) < 0.28) ||
        (Math.abs(lon + Math.PI * 2 - PORTAL_COORDS.lon) < 0.28 && Math.abs(lat - PORTAL_COORDS.lat) < 0.28)
      ) {
        continue;
      }
      const cosLat = Math.cos(lat);
      const nx = Math.sin(lon) * cosLat;
      const ny = Math.cos(lon) * cosLat;
      const nz = Math.sin(lat);

      _vec3A.set(nx * PLANET_RADIUS, ny * PLANET_RADIUS, nz * PLANET_RADIUS);
      _quatA.setFromUnitVectors(_vec3B.set(0, 1, 0), _vec3A.clone().normalize());
      const s = 0.7 + (i % 4) * 0.22;
      _vec3B.set(s, s * 0.65, s);
      _mat4.compose(_vec3A, _quatA, _vec3B);
      pebbleInstanced.setMatrixAt(i, _mat4);
      pebbleInstanced.setColorAt(i, _color.setHex(paletteColors[i % paletteColors.length]));
    }
    pebbleInstanced.instanceMatrix.needsUpdate = true;
    if (pebbleInstanced.instanceColor) pebbleInstanced.instanceColor.needsUpdate = true;
    pebbleInstanced.computeBoundingSphere();
    planetPivot.add(pebbleInstanced);

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
      color: 0xf5ebe6,
      roughness: 0.78,
      metalness: 0.05,
    });
    const stonePad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 24), stoneBaseMat);
    stonePad.position.y = 0.03;
    stonePad.receiveShadow = true;
    rockGroup.add(stonePad);

    const seatCushionMat = new THREE.MeshStandardMaterial({
      color: 0xfff8f0,
      roughness: 0.52,
      metalness: 0.08,
    });
    const seatStone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.14, 24), seatCushionMat);
    seatStone.position.y = 0.1;
    seatStone.castShadow = true;
    seatStone.receiveShadow = true;
    rockGroup.add(seatStone);

    const backrest = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), stoneBaseMat);
    backrest.scale.set(1.15, 0.9, 0.45);
    backrest.position.set(0, 0.2, -0.11);
    backrest.castShadow = true;
    rockGroup.add(backrest);

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
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

    placeOnSphere(rockGroup, PLANET_RADIUS, ROCK_COORDS.lon, ROCK_COORDS.lat);
    planetPivot.add(rockGroup);

    // =========================================================================
    // 6. 地标 2：【🌀 引力传送门 (Gravity Portal Arch)】 (6部分复合模型)
    // =========================================================================
    const portalGroup = new THREE.Group();
    portalGroup.userData.landmark = 'portal';

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
      new THREE.CylinderGeometry(0.22, 0.26, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xede9fe, roughness: 0.65, metalness: 0.15 })
    );
    portalPedestal.position.y = 0.03;
    portalGroup.add(portalPedestal);

    const portalArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.032, 16, 36),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xc4b5fd,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.4,
      })
    );
    portalArch.position.y = 0.23;
    portalArch.castShadow = true;
    portalGroup.add(portalArch);

    const portalVortex = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 32),
      new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
      })
    );
    portalVortex.position.y = 0.23;
    portalGroup.add(portalVortex);

    const portalInnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.014, 12, 28),
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xfde047,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      })
    );
    portalInnerRing.position.y = 0.23;
    portalGroup.add(portalInnerRing);

    placeOnSphere(portalGroup, PLANET_RADIUS, PORTAL_COORDS.lon, PORTAL_COORDS.lat);
    planetPivot.add(portalGroup);

    // =========================================================================
    // 7. 3D 毛茸茸的白色小精灵 (Fluffy White Spirit) (10部分复合模型)
    // =========================================================================
    const spiritRoot = new THREE.Group();
    const SPIRIT_BASE_Y = PLANET_RADIUS - 0.82;
    spiritRoot.position.set(0, SPIRIT_BASE_Y, 0);
    scene.add(spiritRoot);

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
    spiritShadow.rotation.x = -Math.PI / 2;
    spiritShadow.position.y = 0.015;
    spiritRoot.add(spiritShadow);

    const spiritBodyPivot = new THREE.Group();
    spiritRoot.add(spiritBodyPivot);

    const fluffyWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02,
      emissive: 0xfff5f7,
      emissiveIntensity: 0.18,
    });

    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 32), fluffyWhiteMat);
    bodyMesh.scale.set(1.06, 0.96, 1.02);
    bodyMesh.position.y = 0.25;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    spiritBodyPivot.add(bodyMesh);

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
    leftFoot.scale.set(0.95, 0.65, 1.25);
    leftFoot.position.set(-0.095, 0.045, 0.05);
    spiritBodyPivot.add(leftFoot);

    const rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), fluffyWhiteMat);
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
        sceneRefs.current.hopImpulse = 1.0;
        stateRef.current.onTapSpirit();
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
    let lastNearRock = false;
    let lastNearPortal = false;

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

      const joy = joystickInputRef.current;
      const joyMag = Math.min(1, Math.hypot(joy.x, joy.y));
      const isJoystickActive = joyMag > 0.06 && stateRef.current.pose !== 'sitting';

      // 1. 当持续摇杆或方向键按下时，平滑推进 targetCoordsRef
      if (isJoystickActive) {
        const walkSpeed = 1.25;
        targetCoordsRef.current.lon += joy.x * walkSpeed * dt;
        targetCoordsRef.current.lat = THREE.MathUtils.clamp(
          targetCoordsRef.current.lat + joy.y * walkSpeed * 0.75 * dt,
          -0.62,
          0.62
        );
      }

      // 2. 弹簧缓动插值 (Spring-like Interpolation)：将 planetCoordsRef 平滑驱向 targetCoordsRef
      const stiffness = 115; // 弹簧刚度
      const damping = 16; // 阻尼系数

      const diffLon = targetCoordsRef.current.lon - planetCoordsRef.current.lon;
      const diffLat = targetCoordsRef.current.lat - planetCoordsRef.current.lat;

      const accelLon = diffLon * stiffness - springVelocityRef.current.lon * damping;
      const accelLat = diffLat * stiffness - springVelocityRef.current.lat * damping;

      springVelocityRef.current.lon += accelLon * dt;
      springVelocityRef.current.lat += accelLat * dt;

      planetCoordsRef.current.lon += springVelocityRef.current.lon * dt;
      planetCoordsRef.current.lat = THREE.MathUtils.clamp(
        planetCoordsRef.current.lat + springVelocityRef.current.lat * dt,
        -0.62,
        0.62
      );

      const springSpeed = Math.hypot(
        springVelocityRef.current.lon,
        springVelocityRef.current.lat
      );
      const isMoving =
        (isJoystickActive || springSpeed > 0.045) && stateRef.current.pose !== 'sitting';

      if (isMoving) {
        const moveVx = isJoystickActive ? joy.x : springVelocityRef.current.lon;
        const moveVy = isJoystickActive ? joy.y : springVelocityRef.current.lat;
        if (Math.hypot(moveVx, moveVy) > 0.02) {
          targetYaw = Math.atan2(moveVx, moveVy || 0.001);
        }
        walkPhase += dt * (7.2 + Math.min(1.4, Math.max(joyMag, springSpeed * 0.85)) * 4.5);
      } else {
        targetYaw = THREE.MathUtils.damp(targetYaw, 0, 3.5, dt);
      }

      // 将平滑更新后的 planetCoordsRef 应用到星球四元数姿态
      _eulerA.set(
        planetCoordsRef.current.lat,
        0,
        planetCoordsRef.current.lon,
        'ZXY'
      );
      _quatB.setFromEuler(_eulerA);
      planetPivot.quaternion.slerp(_quatB, 1 - Math.exp(-18 * dt));

      // 3. 检测小精灵是否接近【🪑 聆听石】或【🌀 引力传送门】
      const dRock = Math.hypot(
        planetCoordsRef.current.lon - ROCK_COORDS.lon,
        planetCoordsRef.current.lat - ROCK_COORDS.lat
      );
      const dPortal = Math.hypot(
        planetCoordsRef.current.lon - PORTAL_COORDS.lon,
        planetCoordsRef.current.lat - PORTAL_COORDS.lat
      );
      const nearRock = dRock < 0.36;
      const nearPortal = dPortal < 0.36;

      if (nearRock !== lastNearRock || nearPortal !== lastNearPortal) {
        lastNearRock = nearRock;
        lastNearPortal = nearPortal;
        stateRef.current.onNearLandmarkChange(nearRock, nearPortal);
      }

      // 4. 更新小精灵朝向与姿态动画（漫步 / 乖巧抱膝坐下 / 轻点跳跃）
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 10, dt);
      spiritBodyPivot.rotation.y = currentYaw;

      if (sceneRefs.current.hopImpulse > 0.01) {
        sceneRefs.current.hopImpulse = Math.max(0, sceneRefs.current.hopImpulse - dt * 2.2);
      }
      const hopOffset = Math.sin(sceneRefs.current.hopImpulse * Math.PI) * 0.24;

      if (stateRef.current.pose === 'sitting') {
        const sway = Math.sin(elapsed * 2.2) * 0.07;
        spiritBodyPivot.position.y = THREE.MathUtils.damp(
          spiritBodyPivot.position.y,
          0.06 + hopOffset,
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
        const breathe = Math.sin(elapsed * 2.4) * 0.025;
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
      }

      // 5. 自然眨眼动画
      blinkTimer += dt;
      const isBlinking = blinkTimer % 3.6 > 3.44 || stateRef.current.pose === 'sitting';
      const eyeScaleY = isBlinking ? 0.18 : 1.0;
      leftEye.scale.y = THREE.MathUtils.damp(leftEye.scale.y, eyeScaleY, 18, dt);
      rightEye.scale.y = THREE.MathUtils.damp(rightEye.scale.y, eyeScaleY, 18, dt);

      // 6. 地标与听歌星尘粒子动画
      rightCrystal.rotation.y = elapsed * 1.4;
      rightCrystal.position.y = 0.26 + Math.sin(elapsed * 2.5) * 0.03;
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

      renderer.render(scene, camera);

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
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 头顶云朵状白色气泡（正常倾诉 4秒 / 空输入错误轻柔晃动提示） */}
      {overheadBubble && (
        <div
          key={overheadBubble.id}
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 min-w-[205px] max-w-[275px] px-4 py-2.5 rounded-3xl text-center pointer-events-none transition-all duration-500 ${
            overheadBubble.isError
              ? 'airbrush-cloud-bubble animate-soft-wobble text-rose-700/95'
              : 'airbrush-cloud-bubble text-slate-700'
          }`}
        >
          <p className="text-xs leading-relaxed font-medium tracking-wide break-words">
            {overheadBubble.text}
          </p>
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white/85"
            style={{ boxShadow: '0 0 10px rgba(255,255,255,0.8)' }}
          />
          <div
            className="absolute -bottom-4 left-1/2 translate-x-1 w-2 h-2 rounded-full bg-white/75"
            style={{ boxShadow: '0 0 8px rgba(255,255,255,0.75)' }}
          />
        </div>
      )}

      {/* Three.js 独立挂载容器 */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        title="手指或鼠标滑动旋转星球，或通过底部控制器带小精灵漫步"
      />
    </div>
  );
};
