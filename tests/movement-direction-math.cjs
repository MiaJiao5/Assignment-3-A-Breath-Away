const assert = require('node:assert/strict');
const THREE = require('three');
const { createPlanetSurface } = require('../src/geometry/planetSurface.ts');
const { createScreenSurfaceMovement } = require('../src/animation/surfaceMovement.ts');

const ids = ['OMEGA_01', 'DELTA_02', 'SIGMA_03', 'PSI_04'];
const moves = [[-1,0], [1,0], [0,-1], [0,1], [.5,.5], [-.5,-.5]];
const turns = [[0,0,0], [.7,1.1,.3], [2.2,-1.3,.8], [Math.PI,0,Math.PI/2]];
const mapper = createScreenSurfaceMovement();
let checks = 0, oldReversals = 0;
for (const id of ids) for (const turn of turns) {
  const surface = createPlanetSurface(id, 1.68);
  const frame = new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn));
  const world = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(turn[2], -.6, turn[0]));
  const direction = new THREE.Vector3(0,1,0).applyQuaternion(frame);
  const origin = surface.point(direction).applyMatrix4(world);
  const normal = surface.normal(direction).transformDirection(world);
  const east = new THREE.Vector3(1,0,0).applyQuaternion(frame).transformDirection(world);
  const north = new THREE.Vector3(0,0,1).applyQuaternion(frame).transformDirection(world);
  for (const rear of [-1,1]) for (const roll of [0,Math.PI/2,Math.PI]) {
    const camera = new THREE.PerspectiveCamera(38, 390/447, .1, 100);
    camera.position.copy(origin).addScaledVector(normal, 3).addScaledVector(north, rear*4).addScaledVector(east,.6);
    camera.up.copy(normal).applyAxisAngle(camera.position.clone().sub(origin).normalize(), roll);
    camera.lookAt(origin); camera.updateMatrixWorld(true);
    const projection = (a,b,step=.00003) => {
      const axis = new THREE.Vector3(b,0,-a).normalize();
      const next = frame.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis,step));
      const point = surface.point(new THREE.Vector3(0,1,0).applyQuaternion(next)).applyMatrix4(world).project(camera);
      const start = origin.clone().project(camera);
      return new THREE.Vector2((point.x-start.x)*390,(start.y-point.y)*447).normalize();
    };
    for (const [x,y] of moves) {
      const wanted = new THREE.Vector2(x,y).normalize();
      const local = mapper(x,y,frame,surface,world,camera,390,447).clone();
      assert.ok(Number.isFinite(local.x) && Number.isFinite(local.y));
      assert.ok(Math.abs(local.length()-Math.hypot(x,y))<1e-9, 'Analog input magnitude is preserved');
      const actual = projection(local.x,local.y);
      assert.ok(actual.dot(wanted)>.999, `${id} rear=${rear} roll=${roll}: wanted ${wanted.toArray()}, got ${actual.toArray()}`);
      if (projection(x,y).dot(wanted)<0) oldReversals++;
      checks++;
    }
  }
}
assert.ok(oldReversals>50, 'The cases include the previous reversed-direction failure');
assert.deepEqual(mapper(0,0,new THREE.Quaternion(),createPlanetSurface('OMEGA_01',1.68),new THREE.Matrix4(),new THREE.PerspectiveCamera(),390,447).toArray(),[0,0]);
console.log(`PASS: ${checks} screen-direction cases across four forms, rear views, rotated frames, camera roll and analog diagonals; ${oldReversals} would reverse with the old mapping.`);
