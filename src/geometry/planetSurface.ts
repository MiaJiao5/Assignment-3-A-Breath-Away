import * as THREE from 'three';
import type { PlanetId } from '../data/roamingData';

export type PlanetForm = 'round' | 'lobed' | 'cloud-triangle' | 'soft-cube';

export interface PlanetSurface {
  kind: PlanetForm;
  /** Reference radius used by the directional movement clock. */
  radius: number;
  /** Conservative radial bounds, for clearance and camera framing. */
  minRadius: number;
  maxRadius: number;
  /** Map an existing planet-local radial direction onto the actual surface.
   * Offset follows the geometric normal, rather than lifting radially. */
  point(direction: THREE.Vector3, offset?: number, target?: THREE.Vector3): THREE.Vector3;
  normal(direction: THREE.Vector3, target?: THREE.Vector3): THREE.Vector3;
  geometry(widthSegments?: number, heightSegments?: number, offset?: number): THREE.BufferGeometry;
}

const SQRT_THREE_OVER_TWO = Math.sqrt(3) / 2;

/** Each form stays star-convex: the existing direction-based walking loop has
 * exactly one surface point everywhere, including seams and geographic poles.
 * Actual positions AND contact normals share this model; the decorative mesh
 * is never stretched independently of the gameplay surface. */
export function createPlanetSurface(planetId: PlanetId, radius: number): PlanetSurface {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Planet radius must be positive.');

  let kind: PlanetForm;
  let minimum: number;
  let maximum: number;
  let radialFactor: (x: number, y: number, z: number) => number;

  switch (planetId) {
    case 'DELTA_02':
      kind = 'lobed';
      minimum = .81;
      maximum = 1.18;
      // A four-lobed, puffed clover. Its broad lobes initially face the walking
      // camera; rounded depth caps keep this a volume when the world rolls.
      // A polynomial harmonic avoids angle seams and pole singularities.
      radialFactor = (x, y, z) => {
        const u = x;
        const v = .738 * y - .675 * z;
        const w = .675 * y + .738 * z;
        return .99 + .17 * (u ** 4 - 6 * u * u * v * v + v ** 4) - .045 * w * w;
      };
      break;
    case 'SIGMA_03':
      kind = 'cloud-triangle';
      minimum = .85;
      maximum = 1.25;
      // A softly rounded triangular prism. Three smooth supporting faces form
      // a triangle in XY, while rounded front/back caps give it real depth.
      // Blending with a sphere softens the edges without erasing the silhouette.
      radialFactor = (x, y, z) => {
        const faceA = Math.max(0, SQRT_THREE_OVER_TWO * x + .5 * y);
        const faceB = Math.max(0, -SQRT_THREE_OVER_TWO * x + .5 * y);
        const faceC = Math.max(0, -y);
        const denominator = Math.pow(faceA ** 4 + faceB ** 4 + faceC ** 4 + (.95 * z) ** 4, .25);
        return .35 + .65 * .78 / denominator;
      };
      break;
    case 'PSI_04':
      kind = 'soft-cube';
      minimum = .82;
      maximum = 1.19;
      // An L6 superellipsoid gives broad square faces and rounded corners.
      // Its corners remain within a similar envelope to the other worlds.
      radialFactor = (x, y, z) => .82 / Math.pow(x ** 6 + y ** 6 + z ** 6, 1 / 6);
      break;
    default:
      kind = 'round';
      minimum = .97;
      maximum = 1.04;
      // Amber retains the round familiar world, with a very gentle rolling
      // contour that supports its field-like material without jagged terrain.
      radialFactor = (x, y, z) => 1 + .014 * (x * x - y * y)
        + .012 * Math.sin(3.2 * x + 1.1 * y) * Math.sin(2.8 * z - .6 * y);
  }

  const radialAt = (x: number, y: number, z: number) => {
    const inverseLength = 1 / (Math.hypot(x, y, z) || 1);
    return radius * radialFactor(x * inverseLength, y * inverseLength, z * inverseLength);
  };

  function normal(direction: THREE.Vector3, target = new THREE.Vector3()) {
    const inverseLength = 1 / (direction.length() || 1);
    const x = direction.x * inverseLength;
    const y = direction.lengthSq() === 0 ? 1 : direction.y * inverseLength;
    const z = direction.z * inverseLength;
    const step = .0004;
    const r = radialAt(x, y, z);
    // Differentiating r(normalize(direction)) produces a tangent gradient, so
    // this remains well behaved at poles and the texture's longitude seam.
    const dx = (radialAt(x + step, y, z) - radialAt(x - step, y, z)) / (2 * step);
    const dy = (radialAt(x, y + step, z) - radialAt(x, y - step, z)) / (2 * step);
    const dz = (radialAt(x, y, z + step) - radialAt(x, y, z - step)) / (2 * step);
    return target.set(x - dx / r, y - dy / r, z - dz / r).normalize();
  }

  const offsetNormal = new THREE.Vector3();
  function point(direction: THREE.Vector3, offset = 0, target = new THREE.Vector3()) {
    // Read before writing, allowing point(vector, 0, vector) in the frame loop.
    const inverseLength = 1 / (direction.length() || 1);
    const x = direction.x * inverseLength;
    const y = direction.lengthSq() === 0 ? 1 : direction.y * inverseLength;
    const z = direction.z * inverseLength;
    const r = radialAt(x, y, z);
    if (offset !== 0) normal(direction, offsetNormal);
    target.set(x * r, y * r, z * r);
    if (offset !== 0) target.addScaledVector(offsetNormal, offset);
    return target;
  }

  function geometry(widthSegments = 80, heightSegments = 64, offset = 0): THREE.BufferGeometry {
    const result = new THREE.SphereGeometry(1, widthSegments, heightSegments);
    const positions = result.getAttribute('position');
    const normals = result.getAttribute('normal');
    const direction = new THREE.Vector3();
    const vertex = new THREE.Vector3();
    const vertexNormal = new THREE.Vector3();
    for (let index = 0; index < positions.count; index++) {
      direction.fromBufferAttribute(positions, index).normalize();
      point(direction, offset, vertex);
      normal(direction, vertexNormal);
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
      normals.setXYZ(index, vertexNormal.x, vertexNormal.y, vertexNormal.z);
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
    result.computeBoundingBox();
    result.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * maximum + Math.abs(offset));
    result.userData.planetForm = kind;
    return result;
  }

  return { kind, radius, minRadius: radius * minimum, maxRadius: radius * maximum, point, normal, geometry };
}
