/** Original Fluffy Little Footsteps one-shot. Shared by runtime Web Audio and
 * the WAV export script, so the downloadable sound matches the in-game sound. */
export const FLUFFY_FOOTSTEP_SECONDS = .118;
export const FLUFFY_FOOTSTEP_GAIN = .375;

export function createFluffyFootstepSamples(sampleRate: number, seed = 0xaba2026): Float32Array {
  const samples = new Float32Array(Math.ceil(sampleRate * FLUFFY_FOOTSTEP_SECONDS));
  const smooth = (value: number) => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  };
  const noise = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff * 2 - 1;
  };
  const coefficient = (hz: number) => 1 - Math.exp(-2 * Math.PI * hz / sampleRate);
  const fabricCoefficient = coefficient(580);
  const airHighCoefficient = coefficient(2100), airLowCoefficient = coefficient(850);
  let phase = 0, fabric = 0, airHigh = 0, airLow = 0, peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const attack = smooth(t / .009);
    const release = 1 - smooth((t - .075) / (FLUFFY_FOOTSTEP_SECONDS - .075));
    const envelope = attack * Math.exp(-t * 31) * release;
    phase += 2 * Math.PI * (79 + 90 * Math.exp(-t * 24)) / sampleRate;
    const random = noise();
    fabric += fabricCoefficient * (random - fabric);
    airHigh += airHighCoefficient * (random - airHigh);
    airLow += airLowCoefficient * (random - airLow);
    // A warm padded tap, a little phone-speaker body, and a soft airy rustle.
    const tap = Math.sin(phase) * .76 + Math.sin(phase * 1.92) * .08;
    const texture = fabric * .24 + (airHigh - airLow) * .09;
    samples[i] = (tap + texture) * envelope;
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const level = .16 / Math.max(peak, 1e-8);
  for (let i = 0; i < samples.length; i++) samples[i] *= level;
  return samples;
}
