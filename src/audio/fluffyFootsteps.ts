import type { FluffyFoot } from '../animation/fluffyGait';

/** Fluffy Little Footsteps: original synthesis, with no recordings or loops. */
export class FluffyFootsteps {
  private readonly fabric: AudioBuffer;
  private readonly air: AudioBuffer;
  private readonly voices = new Set<{ gain: GainNode; sources: AudioScheduledSourceNode[]; stopping: boolean }>();

  constructor(private readonly ctx: BaseAudioContext, private readonly output: AudioNode) {
    this.fabric = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .6), ctx.sampleRate);
    this.air = ctx.createBuffer(1, this.fabric.length, ctx.sampleRate);
    const fabric = this.fabric.getChannelData(0), air = this.air.getChannelData(0);
    let soft = 0;
    for (let i = 0; i < fabric.length; i++) {
      soft = soft * .96 + (Math.random() * 2 - 1) * .04;
      fabric[i] = soft * 3;
      air[i] = Math.random() * 2 - 1;
    }
  }

  // The optional time supports OfflineAudioContext previews; the application
  // always plays immediately from a rendered foot-contact event.
  play(foot: FluffyFoot, speed: number, when = this.ctx.currentTime): void {
    const ctx = this.ctx;
    const duration = .1 + Math.random() * .025;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = .26 * (.65 + .25 * Math.min(1, Math.max(0, speed) / 2.1)) * (.92 + Math.random() * .16);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (foot === 'left' ? -.12 : .12) + (Math.random() - .5) * .05;
    voiceGain.connect(pan); pan.connect(this.output);
    const nodes: AudioNode[] = [voiceGain, pan];
    const envelope = (peak: number, attack: number) => {
      const gain = ctx.createGain();
      // Start silent before the scheduled attack too. Fractional start times
      // can otherwise expose a single sample at the default gain of one.
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(peak, when + attack);
      gain.gain.exponentialRampToValueAtTime(.0001, when + duration - .012);
      gain.gain.linearRampToValueAtTime(0, when + duration);
      gain.connect(voiceGain); nodes.push(gain);
      return gain;
    };
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    const pitch = (foot === 'left' ? 152 : 146) * (.97 + Math.random() * .06);
    thump.frequency.setValueAtTime(pitch, when);
    thump.frequency.exponentialRampToValueAtTime(pitch * .48, when + duration * .85);
    thump.connect(envelope(.085, .008));

    const rustle = ctx.createBufferSource();
    rustle.buffer = this.fabric;
    const softFilter = ctx.createBiquadFilter();
    softFilter.type = 'lowpass'; softFilter.frequency.value = 600 + Math.random() * 220; softFilter.Q.value = .55;
    rustle.connect(softFilter); softFilter.connect(envelope(.025, .01));

    const puff = ctx.createBufferSource();
    puff.buffer = this.air;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass'; airFilter.frequency.value = 950 + Math.random() * 250; airFilter.Q.value = .65;
    puff.connect(airFilter); airFilter.connect(envelope(.012, .014));
    nodes.push(thump, rustle, puff, softFilter, airFilter);
    const sources: AudioScheduledSourceNode[] = [thump, rustle, puff];
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
    thump.start(when);
    rustle.start(when, Math.random() * (this.fabric.duration - duration));
    puff.start(when, Math.random() * (this.air.duration - duration));
    sources.forEach(source => source.stop(when + duration));
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
