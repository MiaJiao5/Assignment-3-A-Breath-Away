// Run with Node.js 22.18+ or 24: node scripts/generate-fluffy-footsteps.cjs
// No audio service, recording, extra dependency or downloaded sample is used.
const fs = require('node:fs');
const path = require('node:path');
const { createFluffyFootstepSamples, FLUFFY_FOOTSTEP_GAIN } = require('../src/audio/fluffyFootstepSample.ts');
const root = path.resolve(__dirname, '..');
const sampleRate = 48000;
const sample = createFluffyFootstepSamples(sampleRate);

function wav(channels) {
  const length = channels[0].length, count = channels.length;
  const output = Buffer.alloc(44 + length * count * 2);
  output.write('RIFF', 0); output.writeUInt32LE(output.length - 8, 4);
  output.write('WAVEfmt ', 8); output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20); output.writeUInt16LE(count, 22);
  output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * count * 2, 28);
  output.writeUInt16LE(count * 2, 32); output.writeUInt16LE(16, 34);
  output.write('data', 36); output.writeUInt32LE(length * count * 2, 40);
  for (let i = 0; i < length; i++) for (let ch = 0; ch < count; ch++) {
    output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, channels[ch][i])) * 32767), 44 + (i * count + ch) * 2);
  }
  return output;
}
function save(relative, channels) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, wav(channels));
  console.log(`${relative}: ${(channels[0].length / sampleRate).toFixed(3)} seconds, ${channels.length} channel(s)`);
}
save('public/audio/fluffy-little-footstep.wav', [sample]);
const demo = [new Float32Array(sampleRate * 4), new Float32Array(sampleRate * 4)];
const landings = [.2, .72, 1.24, 1.76, 2.18, 2.51, 2.84, 3.17];
landings.forEach((time, index) => {
  const rate = index % 2 ? .988 : 1.012;
  const pan = index % 2 ? .12 : -.12;
  const gains = [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
  const offset = Math.round(time * sampleRate);
  for (let i = 0; i < sample.length / rate; i++) {
    const position = i * rate, from = Math.floor(position), mix = position - from;
    const value = (sample[from] || 0) * (1 - mix) + (sample[from + 1] || 0) * mix;
    for (let ch = 0; ch < 2; ch++) demo[ch][offset + i] += value * gains[ch] * FLUFFY_FOOTSTEP_GAIN * .85 * .75;
  }
});
save('docs/audio/fluffy-little-footsteps-preview.wav', demo);
