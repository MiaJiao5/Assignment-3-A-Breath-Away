import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { surfaceCoordinates, type PlanetConfig } from '../data/roamingData';
import { biomeParticleSvg, biomePropSvg } from './BiomeArt';

// Roots, particles and footprints live in planet-local space. Illustrations
// turn only around their local up axis, keeping their feet on the curved world.
export function createPlanetGarden(planet: THREE.Group, radius: number, config: PlanetConfig) {
  const garden = new THREE.Group();
  garden.name = 'interactive-garden';
  garden.userData = { biome: config.biome.id, planetId: config.id, reaction: config.biome.reaction, pendingTextures: 0 };
  planet.add(garden);
  let disposed = false;
  const textures = new Set<THREE.Texture>();
  const imageCleanups: (() => void)[] = [];
  function svgTexture(svg: string) {
    const texture = new THREE.Texture();
    texture.colorSpace = THREE.SRGBColorSpace;
    const image = new Image();
    garden.userData.pendingTextures++;
    image.onload = () => {
      if (disposed) return;
      texture.image = image; texture.needsUpdate = true;
      garden.userData.pendingTextures--;
    };
    image.onerror = () => { if (!disposed) garden.userData.pendingTextures--; };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    imageCleanups.push(() => { image.onload = null; image.onerror = null; });
    textures.add(texture);
    return texture;
  }
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const ctx = glowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255,255,255,.65)');
  gradient.addColorStop(.45, 'rgba(255,255,255,.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  textures.add(glowTexture);
  const propGeometry = new THREE.PlaneGeometry(.62, .775);
  const propMaterials = new Map<string, THREE.MeshBasicMaterial>();
  const normal = new THREE.Vector3(), helper = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0), zAxis = new THREE.Vector3(0, 0, 1);
  const clusters = config.props.map((prop, index) => {
    const root = new THREE.Group();
    root.name = `garden-cluster-${index}`;
    root.userData = { interactions: 0, propType: prop.type, angle: prop.angle, latitude: prop.latitude, biome: config.biome.id };
    const { lon, lat } = surfaceCoordinates(prop);
    const n = new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.cos(lon) * Math.cos(lat), Math.sin(lat));
    root.position.copy(n).multiplyScalar(radius + .008);
    root.quaternion.setFromUnitVectors(yAxis, n);
    root.scale.setScalar(prop.scale);
    garden.add(root);
    const crown = new THREE.Group();
    root.add(crown);
    const key = `${prop.type}:${Object.values(prop.colors).join(':')}`;
    let material = propMaterials.get(key);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ map: svgTexture(biomePropSvg(prop.type, prop.colors)), transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: .005, toneMapped: false });
      propMaterials.set(key, material);
    }
    const illustration = new THREE.Mesh(propGeometry, material);
    illustration.name = `biome-prop-${prop.type}`;
    illustration.position.y = .775 / 2 - .065;
    crown.add(illustration);
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture, color: prop.colors.primary, transparent: true, opacity: .12, depthWrite: false, toneMapped: false });
    const glow = new THREE.Sprite(glowMat);
    glow.position.y = .3; glow.scale.set(.72, .7, 1); glow.renderOrder = -1;
    root.add(glow);
    return { root, crown, normal: n, glowMat, near: false, lastTriggered: -10, energy: 0 };
  });
  const particleMaps = [0,1,2].map(index => svgTexture(biomeParticleSvg(config.biome.reaction, config.biome.palette, index)));
  const particles = Array.from({ length: 18 }, (_, index) => {
    const material = new THREE.SpriteMaterial({ map: particleMaps[index % 3], transparent: true, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Sprite(material);
    mesh.name = 'biome-reaction-particle'; mesh.visible = false;
    garden.add(mesh);
    return { mesh, material, bornAt: -10, variant: index % 3, origin: new THREE.Vector3(), velocity: new THREE.Vector3(), up: new THREE.Vector3(), side: new THREE.Vector3() };
  });
  const footprintGeometry = new THREE.CircleGeometry(1, 10);
  const footprints = Array.from({ length: 32 }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: config.biome.palette.accent, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, toneMapped: false });
    const mesh = new THREE.Mesh(footprintGeometry, mat);
    mesh.name = 'walking-footprint'; mesh.visible = false;
    garden.add(mesh);
    return { mesh, mat, bornAt: -10 };
  });
  let footprintCursor = 0, particleCursor = 0, lastChime = -10, stepDistance = 0;
  const lastPosition = new THREE.Vector3();
  let initialized = false;

  function update(time: number, dt: number, spirit: THREE.Group, moving: boolean, enabled: boolean, reducedMotion: boolean, camera: THREE.Camera) {
    normal.copy(spirit.position).normalize();
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const near = normal.dot(cluster.normal) > Math.cos(cluster.near ? .44 : .34);
      if (near && !cluster.near && enabled && moving && time - cluster.lastTriggered > 5) {
        cluster.energy = 1; cluster.lastTriggered = time;
        cluster.root.userData.interactions++;
        if (time - lastChime > .8) { soundEngine.playGardenChime(i); lastChime = time; }
        if (!reducedMotion) for (let j = 0; j < (config.biome.id === 'autumn' ? 3 : 4); j++) {
          const particle = particles[particleCursor++ % particles.length];
          particle.bornAt = time; particle.mesh.visible = true;
          particle.mesh.scale.setScalar(config.biome.id === 'autumn' && particle.variant !== 2 ? .09 : .065);
          particle.origin.set(0, .3, 0).applyQuaternion(cluster.root.quaternion).add(cluster.root.position);
          particle.velocity.set(Math.sin(j * 2.4) * .09, .2 + j * .018, Math.cos(j * 2.4) * .09).applyQuaternion(cluster.root.quaternion);
          particle.up.copy(cluster.normal);
          particle.side.set(1, 0, 0).applyQuaternion(cluster.root.quaternion);
        }
      }
      if (enabled && (moving || !near)) cluster.near = near;
      cluster.energy = Math.max(0, cluster.energy - dt * .7);
      cluster.root.worldToLocal(helper.copy(camera.position));
      const heading = Math.atan2(helper.x, helper.z);
      const sway = reducedMotion ? 0 : Math.sin(time * 1.6 + i) * (.015 + cluster.energy * .1);
      cluster.crown.rotation.set(sway * .25, heading, sway);
      const bounce = reducedMotion ? 0 : Math.sin((1 - cluster.energy) * Math.PI * 3) * cluster.energy;
      cluster.crown.scale.setScalar(1 + (reducedMotion ? 0 : cluster.energy * .17 + Math.max(0, bounce) * .06));
      cluster.crown.position.y = config.biome.id === 'sky' && !reducedMotion ? Math.sin(time * 1.1 + i) * .016 + cluster.energy * .035 : 0;
      const pulse = reducedMotion ? cluster.energy : cluster.energy * (.55 + .45 * Math.sin((time - cluster.lastTriggered) * 5));
      cluster.glowMat.opacity = .12 + pulse * (config.biome.id === 'starsea' ? .65 : .18);
    }
    if (!initialized) { lastPosition.copy(spirit.position); initialized = true; }
    const traveled = lastPosition.distanceTo(spirit.position);
    lastPosition.copy(spirit.position);
    if (enabled && moving && traveled > .0002) stepDistance += traveled;
    else stepDistance = 0;
    if (stepDistance > .12 && !reducedMotion) {
      stepDistance = 0;
      const mark = footprints[footprintCursor++ % footprints.length];
      helper.set(footprintCursor % 2 ? -.065 : .065, radius + .018, 0).applyQuaternion(spirit.quaternion).normalize().multiplyScalar(radius + .018);
      mark.mesh.position.copy(helper);
      mark.mesh.quaternion.setFromUnitVectors(zAxis, helper.normalize());
      mark.mesh.scale.set(.026, .045, 1); mark.bornAt = time; mark.mesh.visible = true;
    }
    for (const mark of footprints) {
      const age = time - mark.bornAt;
      mark.mesh.visible = age < 1.5;
      mark.mat.opacity = Math.max(0, 1 - age / 1.5) * .48;
    }
    for (const particle of particles) {
      const age = time - particle.bornAt;
      particle.mesh.visible = !reducedMotion && age < 1.6;
      if (!particle.mesh.visible) continue;
      particle.mesh.position.copy(particle.origin).addScaledVector(particle.velocity, age);
      if (config.biome.id === 'autumn' && particle.variant !== 2) particle.mesh.position.addScaledVector(particle.up, -age * age * .14).addScaledVector(particle.side, Math.sin(age * 4) * .035);
      particle.material.rotation = config.biome.id === 'sky' ? Math.sin(age * 2) * .2 : age * .4;
      particle.material.opacity = Math.sin(Math.min(1, age / 1.6) * Math.PI) * .85;
    }
  }
  function dispose() {
    disposed = true;
    imageCleanups.forEach(cleanup => cleanup());
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    garden.traverse(object => {
      if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(mat => mat.dispose());
    textures.forEach(texture => texture.dispose());
    propMaterials.clear(); garden.removeFromParent();
  }
  // Solid roots have a small personal-space boundary; the outer proximity
  // trigger remains reachable without walking through the illustrated crown.
  const obstacles = clusters.map(cluster => ({
    normal: cluster.normal,
    radius: .15 + cluster.root.scale.x * .055,
  }));
  const framingMeshes = clusters.map(cluster => cluster.crown.children[0] as THREE.Mesh);
  return { update, dispose, obstacles, framingMeshes };
}
