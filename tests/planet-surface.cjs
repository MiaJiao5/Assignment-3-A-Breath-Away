// Numeric surface regression; run with Node.js 22.18+ (native TypeScript).
const assert = require('node:assert/strict');
const { createPlanetSurface } = require('../src/geometry/planetSurface.ts');

(async () => {
const THREE = await import('three');

const expected = {
  OMEGA_01: 'round', DELTA_02: 'lobed',
  SIGMA_03: 'cloud-triangle', PSI_04: 'soft-cube',
};
const r = 1.68;
const extrema = {};
for (const [id, kind] of Object.entries(expected)) {
  const surface = createPlanetSurface(id, r);
  assert.equal(surface.kind, kind);
  let minimum = Infinity, maximum = 0;
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let latitude = -90; latitude <= 90; latitude += 6) {
    for (let longitude = 0; longitude < 360; longitude += 6) {
      const lon = longitude * Math.PI / 180, lat = latitude * Math.PI / 180;
      const direction = new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.cos(lon) * Math.cos(lat), Math.sin(lat));
      surface.point(direction, 0, point); surface.normal(direction, normal);
      const radial = point.length();
      minimum = Math.min(minimum, radial); maximum = Math.max(maximum, radial);
      assert.ok(Number.isFinite(radial) && radial >= surface.minRadius - 1e-6 && radial <= surface.maxRadius + 1e-6, `${id}: conservative radius bounds`);
      assert.ok(Math.abs(normal.length() - 1) < 1e-10 && normal.dot(direction) > .45, `${id}: finite outward normal`);
      const tangent = new THREE.Vector3().crossVectors(direction, Math.abs(direction.z) < .9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)).normalize();
      const a = surface.point(direction.clone().addScaledVector(tangent, .0001));
      const b = surface.point(direction.clone().addScaledVector(tangent, -.0001));
      const surfaceTangent = a.sub(b).normalize();
      assert.ok(Math.abs(normal.dot(surfaceTangent)) < .00001, `${id}: true normal follows the mapped surface tangent`);
      const raised = surface.point(direction, .08);
      const offset = raised.sub(point);
      assert.ok(Math.abs(offset.length() - .08) < 1e-10 && offset.normalize().dot(normal) > .999999, `${id}: landmark offset follows geometric normal`);
      const aliased = direction.clone();
      surface.point(aliased, 0, aliased);
      assert.ok(aliased.distanceTo(point) < 1e-10, `${id}: allocation-free aliasing is safe`);
    }
  }
  extrema[id] = { min: minimum / r, max: maximum / r };
  const geometry = surface.geometry(32, 24);
  assert.equal(geometry.userData.planetForm, kind);
  assert.equal(geometry.getAttribute('position').count, geometry.getAttribute('uv').count);
  for (const attribute of ['position', 'normal', 'uv']) {
    assert.ok([...geometry.getAttribute(attribute).array].every(Number.isFinite), `${id}: no pole/seam NaN values`);
  }
  geometry.dispose();
  assert.ok(Number.isFinite(surface.point(new THREE.Vector3()).length()), `${id}: zero-direction fallback is safe`);
}
assert.ok(extrema.OMEGA_01.max - extrema.OMEGA_01.min < .07, 'Amber remains mostly spherical');
for (const id of ['DELTA_02', 'SIGMA_03', 'PSI_04']) {
  assert.ok(extrema[id].max - extrema[id].min > .2, `${id}: a real physical form, beyond a recolored sphere`);
}
// Four visible rounded lobes alternate with four softer valleys in Mint's
// presentation plane, so it cannot regress to a triangular/potato silhouette.
const mint = createPlanetSurface('DELTA_02', r);
const mintRadii = Array.from({ length: 8 }, (_, index) => {
  const angle = index * Math.PI / 4;
  const u = Math.cos(angle), v = Math.sin(angle);
  return mint.point(new THREE.Vector3(u, .738 * v, -.675 * v).normalize()).length();
});
for (let index = 0; index < mintRadii.length; index += 2) {
  assert.ok(mintRadii[index] > mintRadii[(index + 1) % 8] * 1.3, 'Mint has four broad lobes rather than three projected corners');
}
console.log('PASS: mapped forms, radial bounds, pole/seam continuity, true contact normals, normal offsets and shared mesh geometry.', extrema);
})().catch(error => { console.error(error); process.exitCode = 1; });
