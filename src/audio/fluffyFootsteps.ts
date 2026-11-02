import type { FluffyFoot } from '../animation/fluffyGait';
import { createFluffyFootstepSamples, FLUFFY_FOOTSTEP_GAIN } from './fluffyFootstepSample';

/** Fluffy Little Footsteps: original synthesis, with no recordings or loops. */
export class FluffyFootsteps {
  private readonly sample: AudioBuffer;
  private readonly voices = new Set<{ gain: GainNode; sources: AudioScheduledSourceNode[]; stopping: boolean }>();

  constructor(private readonly ctx: BaseAudioContext, private readonly output: AudioNode) {
    const samples = createFluffyFootstepSamples(ctx.sampleRate);
    this.sample = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    this.sample.getChannelData(0).set(samples);
  }

  // The optional time supports OfflineAudioContext previews; the application
  // always plays immediately from a rendered foot-contact event.
  play(foot: FluffyFoot, speed: number, when = this.ctx.currentTime): void {
    const ctx = this.ctx;
    const rate = (foot === 'left' ? 1.012 : .988) * (.985 + Math.random() * .03);
    const duration = this.sample.duration / rate;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = FLUFFY_FOOTSTEP_GAIN * (.65 + .25 * Math.min(1, Math.max(0, speed) / 2.1)) * (.94 + Math.random() * .12);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (foot === 'left' ? -.12 : .12) + (Math.random() - .5) * .05;
    voiceGain.connect(pan); pan.connect(this.output);
    const nodes: AudioNode[] = [voiceGain, pan];
    const step = ctx.createBufferSource();
    step.buffer = this.sample;
    step.playbackRate.value = rate;
    step.connect(voiceGain);
    nodes.push(step);
    const sources: AudioScheduledSourceNode[] = [step];
    const voice = { gain: voiceGain, sources, stopping: false };
    this.voices.add(voice);
    const cleanup = () => {
      nodes.forEach(node => node.disconnect());
      this.voices.delete(voice);
    };
    let remaining = sources.length;
    for (const source of sources) {
      source.onended = () => {
        if (--remaining) return;
        cleanup();
      };
    }
    step.start(when);
    step.stop(when + duration);
  }

  stop(): void {
    const now = this.ctx.currentTime;
    const tail = this.ctx.state === 'running' ? .012 : 0;
    for (const voice of this.voices) {
      if (voice.stopping) continue;
      voice.stopping = true;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + tail);
      voice.sources.forEach(source => { try { source.stop(now + tail); } catch { /* already ended */ } });
    }
  }
}
