import { PLANETS, PlanetId } from '../data/roamingData';

/**
 * 《短暂漫游 (Brief Roaming)》治愈音频引擎
 *
 * 支持双模式：
 * 1. 预留 <audio> 外部音频文件路径替换接口：
 *    若 PLANETS[planetId].externalAudioUrl 配置了音频文件路径，则自动挂载并循环播放 <audio> 标签。
 * 2. Web Audio API 实时程序化合成模式：
 *    为 4 个星球分别编写 4 段不同和弦与律动的柔和氛围音乐循环，并叠加可独立开关的自然环境白噪音。
 */

interface PlanetMusicalProfile {
  tempoMs: number;
  chords: number[][];
  melodyNotes: number[];
  waveform: OscillatorType;
  subWaveform: OscillatorType;
  filterFreq: number;
  noiseFilterType: BiquadFilterType;
  noiseCenterFreq: number;
  noiseLfoHz: number;
  noiseGainLevel: number;
}

const MUSICAL_PROFILES: Record<PlanetId, PlanetMusicalProfile> = {
  // 代号 Ω-01（琥珀暖阳）：温暖原声感，Fmaj9 - Cmaj7 - Dm9 - Bbmaj7 暖阳木吉他/电钢琴般柔和分解律动
  OMEGA_01: {
    tempoMs: 4200,
    chords: [
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
      [130.81, 196.0, 246.94, 293.66, 329.63], // Cmaj9
      [146.83, 220.0, 261.63, 329.63, 349.23], // Dm9
      [116.54, 174.61, 220.0, 261.63, 293.66], // Bbmaj9
    ],
    melodyNotes: [523.25, 587.33, 659.25, 783.99, 880.0],
    waveform: 'triangle',
    subWaveform: 'sine',
    filterFreq: 950,
    noiseFilterType: 'bandpass',
    noiseCenterFreq: 420,
    noiseLfoHz: 0.14,
    noiseGainLevel: 0.032,
  },

  // 代号 Δ-02（薄荷晨风）：清新自然风，Gmaj7 - Em9 - Cmaj9 - D11 清透五声风铃与晨叶律动
  DELTA_02: {
    tempoMs: 3600,
    chords: [
      [196.0, 246.94, 293.66, 369.99, 440.0], // Gmaj9
      [164.81, 246.94, 293.66, 369.99, 392.0], // Em9
      [130.81, 196.0, 246.94, 293.66, 392.0], // Cmaj9
      [146.83, 220.0, 261.63, 329.63, 392.0], // D11
    ],
    melodyNotes: [587.33, 659.25, 739.99, 783.99, 987.77, 1174.66],
    waveform: 'sine',
    subWaveform: 'triangle',
    filterFreq: 1250,
    noiseFilterType: 'bandpass',
    noiseCenterFreq: 680,
    noiseLfoHz: 0.22,
    noiseGainLevel: 0.028,
  },

  // 代号 Σ-03（晴空零度）：空灵放空感，Dmaj9(#11) - Aadd9 - Bm11 - Gmaj7(#11) 漂浮失重长音
  SIGMA_03: {
    tempoMs: 5200,
    chords: [
      [146.83, 220.0, 277.18, 329.63, 369.99], // Dmaj9
      [110.0, 164.81, 220.0, 246.94, 329.63], // Aadd9
      [123.47, 185.0, 220.0, 293.66, 329.63], // Bm11
      [196.0, 246.94, 293.66, 369.99, 493.88], // Gmaj7#11
    ],
    melodyNotes: [440.0, 493.88, 554.37, 659.25, 739.99, 880.0],
    waveform: 'sine',
    subWaveform: 'sine',
    filterFreq: 860,
    noiseFilterType: 'lowpass',
    noiseCenterFreq: 520,
    noiseLfoHz: 0.09,
    noiseGainLevel: 0.025,
  },

  // 代号 Ψ-04（静谧星海）：静谧星夜感，Ebmaj9 - Cm11 - Abmaj7(#11) - Bb13sus 深邃星尘泛音
  PSI_04: {
    tempoMs: 4800,
    chords: [
      [155.56, 233.08, 293.66, 349.23, 392.0], // Ebmaj9
      [130.81, 196.0, 233.08, 293.66, 349.23], // Cm11
      [103.83, 155.56, 207.65, 246.94, 293.66], // Abmaj9
      [116.54, 174.61, 207.65, 261.63, 349.23], // Bb11
    ],
    melodyNotes: [466.16, 523.25, 587.33, 698.46, 783.99, 932.33],
    waveform: 'triangle',
    subWaveform: 'sine',
    filterFreq: 780,
    noiseFilterType: 'lowpass',
    noiseCenterFreq: 340,
    noiseLfoHz: 0.11,
    noiseGainLevel: 0.034,
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseLfo: OscillatorNode | null = null;

  private loopTimer: number | null = null;
  private arpeggioTimer: number | null = null;
  private chordIndex = 0;

  private currentPlanet: PlanetId | null = null;
  private isPlaying = false;
  private isMuted = false;
  private whiteNoiseEnabled = true;

  // 预留的 <audio> 外部音频元素引用
  private externalAudioEl: HTMLAudioElement | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.75;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  /**
   * 播放轻柔的 UI 气泡点击反馈音效
   */
  public playSoftClick(pitchOffset = 0): void {
    if (this.isMuted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 460 + pitchOffset;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.14);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio errors if blocked
    }
  }

  /**
   * 轻点白色毛绒小精灵时的治愈风铃互动音
   */
  public playSpiritChime(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;
      const notes = [659.25, 783.99, 987.77, 1174.66];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.055);
        gain.gain.linearRampToValueAtTime(0.055, now + idx * 0.055 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.48);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * 1.5秒曲速过渡时的柔和星风音效
   */
  public playWarpTransition(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      const shimmerNotes = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0];
      shimmerNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, now + 1.4);

        gain.gain.setValueAtTime(0.0001, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.04, now + i * 0.12 + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.12);
        osc.stop(now + 1.55);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * 启动对应星球的治愈背景音乐循环（坐下听歌时调用）
   */
  public startPlanetMusic(planetId: PlanetId): void {
    const ctx = this.ensureContext();
    this.stopPlanetMusicImmediate();

    this.currentPlanet = planetId;
    this.isPlaying = true;
    this.chordIndex = 0;

    // 恢复主音量（若之前做过淡出）
    if (this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0001 : 0.75, now);
    }

    const planetConfig = PLANETS[planetId];

    // 优先检查是否配置了外部 <audio> 音频路径
    if (planetConfig.externalAudioUrl && planetConfig.externalAudioUrl.trim() !== '') {
      const audioEl = document.getElementById('brief-roaming-external-audio') as HTMLAudioElement | null;
      if (audioEl) {
        this.externalAudioEl = audioEl;
        audioEl.src = planetConfig.externalAudioUrl;
        audioEl.loop = true;
        audioEl.volume = this.isMuted ? 0 : 0.75;
        audioEl.play().catch(() => {});
        return;
      }
    }

    const profile = MUSICAL_PROFILES[planetId];

    // 启动粉红/柔焦环境白噪音层
    this.startWhiteNoiseLayer(profile);

    // 立即播放第一个和弦并启动循环
    this.triggerChordPad(profile);
    this.loopTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.triggerChordPad(profile);
    }, profile.tempoMs);

    // 启动轻柔随机泛音星尘音符
    this.arpeggioTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.triggerMelodyDroplet(profile);
    }, Math.round(profile.tempoMs / 3));
  }

  private triggerChordPad(profile: PlanetMusicalProfile): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const chord = profile.chords[this.chordIndex % profile.chords.length];
    this.chordIndex++;

    const durationSec = (profile.tempoMs / 1000) * 1.35;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(profile.filterFreq, now);
    filter.connect(this.masterGain);

    chord.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? profile.subWaveform : profile.waveform;
      // 微小失谐营造温暖复古喷枪合成器包裹感
      const detuneCents = (i - 2) * 3.5;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detuneCents, now);

      const noteDelay = i * 0.14;
      const peakGain = i === 0 ? 0.055 : 0.038;

      gain.gain.setValueAtTime(0.0001, now + noteDelay);
      gain.gain.linearRampToValueAtTime(peakGain, now + noteDelay + durationSec * 0.32);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + noteDelay + durationSec);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(now + noteDelay);
      osc.stop(now + noteDelay + durationSec + 0.05);
    });
  }

  private triggerMelodyDroplet(profile: PlanetMusicalProfile): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (Math.random() < 0.22) return; // 留白呼吸感

    const now = this.ctx.currentTime;
    const freq = profile.melodyNotes[Math.floor(Math.random() * profile.melodyNotes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  private startWhiteNoiseLayer(profile: PlanetMusicalProfile): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // 生成柔和粉红噪音 (Pink Noise approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = profile.noiseFilterType;
    filter.frequency.value = profile.noiseCenterFreq;
    filter.Q.value = 0.7;

    // 呼吸式 LFO 调制滤波器频率，模拟自然微风与星海潮汐起伏
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = profile.noiseLfoHz;
    lfoGain.gain.value = profile.noiseCenterFreq * 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    const targetNoiseGain = this.whiteNoiseEnabled && !this.isMuted ? profile.noiseGainLevel : 0.0001;
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(targetNoiseGain, this.ctx.currentTime + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    lfo.start();

    this.noiseSource = noise;
    this.noiseLfo = lfo;
    this.noiseGain = gain;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.externalAudioEl) {
      this.externalAudioEl.volume = muted ? 0 : 0.75;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.75, now + 0.35);
    }
  }

  public setWhiteNoiseEnabled(enabled: boolean): void {
    this.whiteNoiseEnabled = enabled;
    if (this.ctx && this.noiseGain && this.currentPlanet) {
      const profile = MUSICAL_PROFILES[this.currentPlanet];
      const now = this.ctx.currentTime;
      this.noiseGain.gain.cancelScheduledValues(now);
      this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
      this.noiseGain.gain.linearRampToValueAtTime(
        enabled && !this.isMuted ? profile.noiseGainLevel : 0.0001,
        now + 0.4
      );
    }
  }

  /**
   * 点击右上角 [ 👋 先去忙啦 ] 时，音乐音量在 1.4 秒内平滑淡出
   */
  public fadeOutAndStop(durationSec = 1.4): void {
    this.isPlaying = false;
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.arpeggioTimer !== null) {
      clearInterval(this.arpeggioTimer);
      this.arpeggioTimer = null;
    }

    if (this.externalAudioEl && !this.externalAudioEl.paused) {
      const audio = this.externalAudioEl;
      const startVol = audio.volume;
      const steps = 20;
      let currentStep = 0;
      const fadeInterval = window.setInterval(() => {
        currentStep++;
        audio.volume = Math.max(0, startVol * (1 - currentStep / steps));
        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audio.pause();
        }
      }, (durationSec * 1000) / steps);
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      window.setTimeout(() => {
        this.cleanupNoiseNodes();
      }, durationSec * 1000 + 100);
    } else {
      this.cleanupNoiseNodes();
    }
  }

  public stopPlanetMusicImmediate(): void {
    this.isPlaying = false;
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.arpeggioTimer !== null) {
      clearInterval(this.arpeggioTimer);
      this.arpeggioTimer = null;
    }
    if (this.externalAudioEl) {
      this.externalAudioEl.pause();
    }
    this.cleanupNoiseNodes();
  }

  private cleanupNoiseNodes(): void {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch {
        // Ignore
      }
      this.noiseSource = null;
    }
    if (this.noiseLfo) {
      try {
        this.noiseLfo.stop();
        this.noiseLfo.disconnect();
      } catch {
        // Ignore
      }
      this.noiseLfo = null;
    }
    this.noiseGain = null;
  }
}

export const soundEngine = new SoundEngine();
