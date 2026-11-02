import * as THREE from 'three';
import type { PlanetSurface } from '../geometry/planetSurface';

/** Convert screen directions (right/down positive) to the transported surface
 * frame. Sampling the actual surface also handles the slopes of the four forms.
 * Inverting its projected tangent basis avoids reversed controls after camera
 * turns, rear listening views, pole crossings or accumulated frame rotation. */
export function createScreenSurfaceMovement() {
  const direction = new THREE.Vector3();
  const east = new THREE.Vector3(), north = new THREE.Vector3();
  const origin = new THREE.Vector3(), pointX = new THREE.Vector3(), pointZ = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const result = new THREE.Vector2();
  return (
    x: number, y: number, frame: THREE.Quaternion, surface: PlanetSurface,
    world: THREE.Matrix4, camera: THREE.Camera, width: number, height: number,
  ): THREE.Vector2 => {
    const magnitude = Math.hypot(x, y);
    if (magnitude < 1e-12) return result.set(0, 0);
    direction.set(0, 1, 0).applyQuaternion(frame);
    east.set(1, 0, 0).applyQuaternion(frame);
    north.set(0, 0, 1).applyQuaternion(frame);
    surface.point(direction, 0, origin).applyMatrix4(world).project(camera);
    probe.copy(direction).addScaledVector(east, .001).normalize();
    surface.point(probe, 0, pointX).applyMatrix4(world).project(camera);
    probe.copy(direction).addScaledVector(north, .001).normalize();
    surface.point(probe, 0, pointZ).applyMatrix4(world).project(camera);
    const xx = (pointX.x - origin.x) * width;
    const xy = (origin.y - pointX.y) * height;
    const zx = (pointZ.x - origin.x) * width;
    const zy = (origin.y - pointZ.y) * height;
    const determinant = xx * zy - zx * xy;
    const tolerance = 1e-6 * Math.hypot(xx, xy) * Math.hypot(zx, zy) + 1e-12;
    if (Math.abs(determinant) > tolerance) {
      result.set((zy * x - zx * y) / determinant, (xx * y - xy * x) / determinant);
    } else {
      // At a silhouette edge one tangent can project to almost zero. The
      // projected gradient still moves toward the requested screen direction.
      result.set(xx * x + xy * y, zx * x + zy * y);
    }
    if (!Number.isFinite(result.x) || !Number.isFinite(result.y) || result.lengthSq() < 1e-20) return result.set(0, 0);
    return result.setLength(magnitude);
  };
}
