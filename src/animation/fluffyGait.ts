export type FluffyFoot = 'left' | 'right';

/** World-space distance between successive landings, shared by legs and SFX. */
export const FLUFFY_STEP_DISTANCE = .55;
export const MIN_GAIT_SPEED = .035;
const TAU = Math.PI * 2;

export function advanceFluffyGait(phase: number, distance: number) {
  if (!Number.isFinite(distance) || distance <= 0) return { phase, posePhase: phase, landing: null as FluffyFoot | null };
  const next = phase + distance / FLUFFY_STEP_DISTANCE * Math.PI;
  const contact = Math.floor(next / Math.PI);
  const crossed = contact > Math.floor(phase / Math.PI);
  const landing: FluffyFoot | null = crossed ? (contact % 2 ? 'left' : 'right') : null;
  // Display the actual contact pose for this rendered frame. The continuous
  // phase keeps its remaining travel, so no distance or cadence is lost.
  return { phase: next % TAU, posePhase: crossed ? (contact * Math.PI) % TAU : next % TAU, landing };
}
