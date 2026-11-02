import * as THREE from 'three';
import type { PlanetId } from '../data/roamingData';

export interface PlanetSurfaceMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpScale: number;
  roughness: number;
}

type RGB = readonly [number, number, number];
type Paint = { base: RGB; low: RGB; high: RGB; tint: RGB; bumpScale: number };

// Pigment is independent from the app's existing background mapping. These
// warmer, more saturated midtones retain a clear silhouette for the white spirit.
const PAINT: Record<PlanetId, Paint> = {
  OMEGA_01: { base: [250, 191, 106], low: [213, 129, 57], high: [255, 225, 151], tint: [232, 151, 100], bumpScale: .025 },
  DELTA_02: { base: [130, 201, 150], low: [66, 151, 119], high: [187, 227, 172], tint: [97, 191, 174], bumpScale: .022 },
  SIGMA_03: { base: [137, 176, 232], low: [117, 115, 197], high: [188, 215, 245], tint: [181, 143, 224], bumpScale: .024 },
  PSI_04: { base: [160, 119, 197], low: [113, 78, 163], high: [203, 176, 224], tint: [211, 140, 191], bumpScale: .026 },
};

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return { element, context: element.getContext('2d')! };
}

function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }

/** A longitude-continuous field in sphere space: there is no painted UV seam
 * and the pole colors converge naturally instead of forming little pinwheels. */
function softField(x: number, y: number, z: number) {
  return .47 * Math.sin(x * 3.2 + z * 2.7 + Math.sin(y * 3.1))
    + .31 * Math.sin(y * 5.1 - z * 2.3 + x * 1.7)
    + .22 * Math.cos(z * 4.8 + x * 2.2 - y * 2.1);
}

function softEllipse(context: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, center: string, edge: string) {
  context.save();
  context.translate(x, y);
  context.scale(rx, ry);
  const gradient = context.createRadialGradient(-.17, -.2, .02, 0, 0, 1);
  gradient.addColorStop(0, center);
  gradient.addColorStop(1, edge);
  context.fillStyle = gradient;
  context.beginPath(); context.arc(0, 0, 1, 0, Math.PI * 2); context.fill();
  context.restore();
}

function leafPath(context: CanvasRenderingContext2D, size: number) {
  context.beginPath();
  context.moveTo(0, -size * .8);
  context.bezierCurveTo(size * .59, -size * .35, size * .56, size * .49, 0, size * .8);
  context.bezierCurveTo(-size * .49, size * .29, -size * .52, -size * .37, 0, -size * .8);
  context.closePath();
}

function drawLeaf(context: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, relief: boolean) {
  context.save();
  context.translate(x, y); context.rotate(rotation);
  const paint = context.createLinearGradient(-size / 2, 0, size / 2, 0);
  paint.addColorStop(0, relief ? '#9c9c9c' : 'rgba(99,170,136,.38)');
  paint.addColorStop(.5, relief ? '#838383' : 'rgba(140,207,163,.46)');
  paint.addColorStop(1, relief ? '#747474' : 'rgba(92,170,142,.2)');
  leafPath(context, size);
  context.fillStyle = paint; context.fill();
  context.lineCap = 'round'; context.lineJoin = 'round';
  context.lineWidth = 2.1;
  context.strokeStyle = relief ? '#aaaaaa' : 'rgba(227,247,205,.42)';
  context.beginPath(); context.moveTo(0, size * .69); context.quadraticCurveTo(-size * .055, 0, 0, -size * .63); context.stroke();
  context.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const v = -.4 + i * .25;
    const width = Math.sqrt(1 - v * v) * size * .33;
    context.beginPath();
    context.moveTo(0, v * size);
    context.quadraticCurveTo(-width * .55, (v - .1) * size, -width, (v - .23) * size);
    context.moveTo(0, (v + .06) * size);
    context.quadraticCurveTo(width * .55, (v - .05) * size, width, (v - .17) * size);
    context.stroke();
  }
  context.restore();
}

function starPath(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.moveTo(x, y - radius);
  context.quadraticCurveTo(x + radius * .2, y - radius * .18, x + radius * .76, y);
  context.quadraticCurveTo(x + radius * .2, y + radius * .18, x, y + radius);
  context.quadraticCurveTo(x - radius * .2, y + radius * .18, x - radius * .76, y);
  context.quadraticCurveTo(x - radius * .2, y - radius * .18, x, y - radius);
  context.closePath();
}

function finishTexture(element: HTMLCanvasElement, maxAnisotropy: number, pigment: boolean) {
  const texture = new THREE.CanvasTexture(element);
  if (pigment) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.name = pigment ? 'planet-airbrush-pigment' : 'planet-soft-surface-relief';
  return texture;
}

/** Original, lightweight airbrush/plush material. No network requests, bitmap
 * assets or randomness during rendering; regenerate only when the planet changes.
 * The caller owns and must dispose all three textures. */
export function createPlanetSurfaceMaps(planetId: PlanetId, maxAnisotropy: number): PlanetSurfaceMaps {
  // Mobile-sized source maps are sufficient for the on-screen world. Keep
  // procedural creation bounded; no half-million-pixel work on planet arrival.
  const width = 512, height = 256;
  const pigment = canvas(width, height);
  const relief = canvas(width, height);
  const rough = canvas(width, height);
  const colorPixels = pigment.context.createImageData(width, height);
  const heightPixels = relief.context.createImageData(width, height);
  const roughPixels = rough.context.createImageData(width, height);
  const palette = PAINT[planetId];
  const cosine = new Float32Array(width), sine = new Float32Array(width);
  for (let u = 0; u < width; u++) {
    const longitude = u / (width - 1) * Math.PI * 2;
    cosine[u] = Math.cos(longitude); sine[u] = Math.sin(longitude);
  }
  let grainSeed = 173 + Object.keys(PAINT).indexOf(planetId) * 619;
  for (let row = 0; row < height; row++) {
    const latitude = row / (height - 1) * Math.PI;
    const y = Math.cos(latitude), belt = Math.sin(latitude);
    for (let column = 0; column < width; column++) {
      const x = -cosine[column] * belt, z = sine[column] * belt;
      const field = softField(x, y, z);
      let band: number, tint: number, bump: number;
      if (planetId === 'OMEGA_01') {
        const phase = y * 11.5 + Math.sin(x * 2.2 + z * 1.6) * 1.6;
        band = .5 + .5 * Math.sin(phase);
        tint = .18 * (.5 + .5 * field);
        // Broad flowing field ridges, rather than hard stripes or rocky gravel.
        bump = Math.sin(phase - .4) * 12;
      } else if (planetId === 'DELTA_02') {
        band = clamp(.55 + field * .45 + y * .06);
        tint = .23 * (.5 + .5 * Math.sin(x * 3.1 - y * 2.4 + z));
        bump = field * 7;
      } else if (planetId === 'SIGMA_03') {
        const phase = y * 9.2 + Math.sin(x * 2.7 + z * 1.5) * 1.25;
        band = clamp(.55 + Math.sin(phase) * .27 + field * .18);
        tint = .22 * (.5 + .5 * Math.cos(phase + .7));
        bump = Math.sin(phase) * 10 + field * 4;
      } else {
        band = clamp(.49 + field * .28 + y * .13);
        tint = .29 * (.5 + .5 * Math.sin(x * 4.1 + z * 2.8 - y));
        bump = field * 6;
      }
      // Closely spaced, smooth fibers add velvety light response. Their contrast
      // is intentionally much lower than the old random paper/gravel texture.
      const fibers = Math.sin(x * 119 + Math.sin(y * 37) * 2.3) * Math.cos(z * 103 - y * 71)
        + Math.sin(z * 157 + x * 63 + Math.cos(y * 47) * 2) * .45;
      grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0;
      const grain = ((grainSeed >>> 24) / 255 - .5) * belt;
      const variation = fibers * 2.8 + grain * 3.2;
      const index = (row * width + column) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const bandColor = palette.low[channel] + (palette.high[channel] - palette.low[channel]) * band;
        const grounded = bandColor * .76 + palette.base[channel] * .24;
        colorPixels.data[index + channel] = grounded + (palette.tint[channel] - grounded) * tint + variation;
        heightPixels.data[index + channel] = 128 + bump + fibers * 9 + grain * 6;
        roughPixels.data[index + channel] = 230 + fibers * 2 + grain * 4;
      }
      colorPixels.data[index + 3] = heightPixels.data[index + 3] = roughPixels.data[index + 3] = 255;
    }
    // Match both longitude edges exactly, including the very faint random grain.
    const first = row * width * 4, last = first + (width - 1) * 4;
    for (let channel = 0; channel < 4; channel++) {
      colorPixels.data[last + channel] = colorPixels.data[first + channel];
      heightPixels.data[last + channel] = heightPixels.data[first + channel];
      roughPixels.data[last + channel] = roughPixels.data[first + channel];
    }
  }
  pigment.context.putImageData(colorPixels, 0, 0);
  relief.context.putImageData(heightPixels, 0, 0);
  rough.context.putImageData(roughPixels, 0, 0);

  // Detail paths use a fixed illustration coordinate system at either quality.
  const detailWidth = 1024, detailHeight = 512;
  for (const context of [pigment.context, relief.context, rough.context]) {
    context.scale(width / detailWidth, height / detailHeight);
  }

  if (planetId === 'DELTA_02') {
    for (const [u, v, scale, turn] of [[.15, .3, 66, -.55], [.48, .51, 78, .7], [.78, .68, 57, -.9], [.95, .4, 68, .5]]) {
      for (const wrap of [-detailWidth, 0, detailWidth]) {
        drawLeaf(pigment.context, u * detailWidth + wrap, v * detailHeight, scale, turn, false);
        drawLeaf(relief.context, u * detailWidth + wrap, v * detailHeight, scale, turn, true);
      }
    }
    const rng = random(7206);
    for (let i = 0; i < 16; i++) {
      const x = rng() * detailWidth, y = (rng() * .61 + .2) * detailHeight;
      const r = 5 + rng() * 9;
      for (const wrap of [-detailWidth, 0, detailWidth]) {
        softEllipse(pigment.context, x + wrap, y, r, r * .86, 'rgba(239,255,224,.63)', 'rgba(119,203,166,0)');
        softEllipse(relief.context, x + wrap, y, r, r * .86, '#bcbcbc', 'rgba(128,128,128,0)');
        softEllipse(rough.context, x + wrap, y, r, r * .86, '#929292', 'rgba(230,230,230,0)');
        softEllipse(pigment.context, x + wrap - r * .24, y - r * .29, r * .19, r * .1, 'rgba(255,255,243,.7)', 'rgba(255,255,243,0)');
      }
    }
  }

  if (planetId === 'PSI_04') {
    const rng = random(5047);
    for (let i = 0; i < 15; i++) {
      const x = rng() * detailWidth, y = (.2 + rng() * .61) * detailHeight;
      const r = 8 + rng() * 13;
      for (const wrap of [-detailWidth, 0, detailWidth]) {
        softEllipse(pigment.context, x + wrap, y, r * 1.25, r, 'rgba(122,102,170,.28)', 'rgba(194,171,221,0)');
        softEllipse(pigment.context, x + wrap + 1, y + r * .21, r * .91, r * .76, 'rgba(215,191,235,.12)', 'rgba(221,196,239,0)');
        softEllipse(relief.context, x + wrap, y, r * 1.25, r, '#606060', 'rgba(128,128,128,0)');
        softEllipse(rough.context, x + wrap, y, r * 1.25, r, '#eeeeee', 'rgba(230,230,230,0)');
      }
    }
    // A few soft pearl inlays, not a dense star pattern competing with the UI.
    for (const [u, v, r] of [[.24, .38, 19], [.59, .62, 15], [.86, .45, 22]]) {
      const x = u * detailWidth, y = v * detailHeight;
      softEllipse(pigment.context, x, y, r * 1.7, r * 1.6, 'rgba(255,224,232,.23)', 'rgba(255,224,232,0)');
      starPath(pigment.context, x, y, r);
      pigment.context.fillStyle = 'rgba(248,231,224,.79)'; pigment.context.fill();
      starPath(relief.context, x, y, r);
      relief.context.fillStyle = '#9b9b9b'; relief.context.fill();
      starPath(rough.context, x, y, r);
      rough.context.fillStyle = '#c8c8c8'; rough.context.fill();
    }
  }

  const map = finishTexture(pigment.element, maxAnisotropy, true);
  const bumpMap = finishTexture(relief.element, maxAnisotropy, false);
  const roughnessMap = finishTexture(rough.element, maxAnisotropy, false);
  map.name = `${planetId}-airbrush-pigment`;
  bumpMap.name = `${planetId}-velvet-relief`;
  roughnessMap.name = `${planetId}-soft-roughness`;
  return { map, bumpMap, roughnessMap, bumpScale: palette.bumpScale, roughness: .93 };
}
