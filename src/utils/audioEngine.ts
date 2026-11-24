import { EqBand, SynthVoiceConfig } from '../types/music';

export const DEFAULT_EQ_BANDS: EqBand[] = [
  { frequencyHz: 32, label: '32 Hz', gainDb: 0 },
  { frequencyHz: 64, label: '64 Hz', gainDb: 0 },
  { frequencyHz: 125, label: '125 Hz', gainDb: 0 },
  { frequencyHz: 250, label: '250 Hz', gainDb: 0 },
  { frequencyHz: 500, label: '500 Hz', gainDb: 0 },
  { frequencyHz: 1000, label: '1 kHz', gainDb: 0 },
  { frequencyHz: 2000, label: '2 kHz', gainDb: 0 },
  { frequencyHz: 4000, label: '4 kHz', gainDb: 0 },
  { frequencyHz: 8000, label: '8 kHz', gainDb: 0 },
  { frequencyHz: 16000, label: '16 kHz', gainDb: 0 },
];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Warm: [3, 2.5, 1.5, 0.5, 0, -0.5, -1, -1.5, -2, -2],
  Vocal: [-2, -1.5, -0.5, 1.5, 3, 3.5, 2.5, 1, 0, -1],
  'Bass Boost': [6, 5, 4, 2, 0.5, 0, 0, 0.5, 1, 1],
  Acoustic: [2, 1.5, 1, 0.5, 1, 1.5, 2, 2.5, 2, 1.5],
};

export class WebAudioPlayerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private eqInput: GainNode | null = null;
  private bassBoostFilter: BiquadFilterNode | null = null;

  // HTMLAudioElement pipeline for real uploaded files
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Synth pipeline for built-in playable tracks
  private synthOscillators: OscillatorNode[] = [];
  private synthStepTimer: number | null = null;
  private synthGain: GainNode | null = null;

  private eqEnabled = true;
  private currentGains: number[] = DEFAULT_EQ_BANDS.map((b) => b.gainDb);
  private bassBoostStrength = 0; // 0..1000

  private ensureGraph() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.eqInput = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.78;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;

    this.bassBoostFilter = this.ctx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.value = 85;
    this.bassBoostFilter.gain.value = this.eqEnabled ? (this.bassBoostStrength / 1000) * 10 : 0;

    this.filters = DEFAULT_EQ_BANDS.map((band, index) => {
      const filter = this.ctx!.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === DEFAULT_EQ_BANDS.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = band.frequencyHz;
      filter.gain.value = this.eqEnabled ? this.currentGains[index] : 0;
      return filter;
    });

    let node: AudioNode = this.eqInput;
    node.connect(this.bassBoostFilter);
    node = this.bassBoostFilter;
    for (const filter of this.filters) {
      node.connect(filter);
      node = filter;
    }
    node.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public async resumeContext() {
    this.ensureGraph();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setVolume(value: number) {
    this.ensureGraph();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)),
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public setEqEnabled(enabled: boolean) {
    this.eqEnabled = enabled;
    if (!this.ctx) return;
    this.filters.forEach((filter, idx) => {
      filter.gain.setTargetAtTime(
        enabled ? this.currentGains[idx] : 0,
        this.ctx!.currentTime,
        0.02,
      );
    });
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.setTargetAtTime(
        enabled ? (this.bassBoostStrength / 1000) * 10 : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public setBassBoostStrength(strength: number) {
    this.bassBoostStrength = Math.max(0, Math.min(1000, strength));
    if (this.bassBoostFilter && this.ctx) {
      this.bassBoostFilter.gain.setTargetAtTime(
        this.eqEnabled ? (this.bassBoostStrength / 1000) * 10 : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public setBandGain(index: number, gainDb: number) {
    this.currentGains[index] = gainDb;
    if (this.filters[index] && this.ctx) {
      this.filters[index].gain.setTargetAtTime(
        this.eqEnabled ? gainDb : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public stopAll() {
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.stopSynth();
  }

  private stopSynth() {
    if (this.synthStepTimer !== null) {
      window.clearInterval(this.synthStepTimer);
      this.synthStepTimer = null;
    }
    this.synthOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.synthOscillators = [];
    if (this.synthGain) {
      try {
        this.synthGain.disconnect();
      } catch {
        // ignore
      }
      this.synthGain = null;
    }
  }

  public async playFile(
    fileUrl: string,
    seekSeconds: number,
    onTimeUpdate: (sec: number) => void,
    onEnded: () => void,
  ) {
    await this.resumeContext();
    this.stopSynth();

    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';
      this.mediaSource = this.ctx!.createMediaElementSource(this.audioEl);
      this.mediaSource.connect(this.eqInput!);
    }

    if (this.audioEl.src !== fileUrl) {
      this.audioEl.src = fileUrl;
    }

    this.audioEl.ontimeupdate = () => {
      if (this.audioEl) {
        onTimeUpdate(this.audioEl.currentTime);
      }
    };
    this.audioEl.onended = () => {
      onEnded();
    };

    if (Math.abs(this.audioEl.currentTime - seekSeconds) > 0.75) {
      this.audioEl.currentTime = seekSeconds;
    }

    await this.audioEl.play();
  }

  public seekFile(seconds: number) {
    if (this.audioEl && this.audioEl.src) {
      this.audioEl.currentTime = seconds;
    }
  }

  public async playSynth(config: SynthVoiceConfig) {
    await this.resumeContext();
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.stopSynth();

    const ctx = this.ctx!;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.14;
    voiceGain.connect(this.eqInput!);
    this.synthGain = voiceGain;

    // Warm harmonic pad voices
    const baseRatios = config.chordRatios;
    const oscs: OscillatorNode[] = baseRatios.map((ratio, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = config.rootHz * ratio;

      const trim = ctx.createGain();
      trim.gain.value = idx === 0 ? 0.45 : 0.22;

      osc.connect(trim);
      trim.connect(voiceGain);
      osc.start();
      return osc;
    });

    this.synthOscillators = oscs;

    // Gentle melodic arpeggio step
    let step = 0;
    const intervalMs = Math.round((60 / config.tempoBpm) * 1000);
    this.synthStepTimer = window.setInterval(() => {
      if (!this.ctx || !this.synthGain) return;
      const now = this.ctx.currentTime;
      const noteOsc = this.ctx.createOscillator();
      const noteEnv = this.ctx.createGain();

      const ratio = baseRatios[step % baseRatios.length];
      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(config.rootHz * ratio * 2, now);

      noteEnv.gain.setValueAtTime(0.0001, now);
      noteEnv.gain.exponentialRampToValueAtTime(0.16, now + 0.06);
      noteEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      noteOsc.connect(noteEnv);
      noteEnv.connect(this.eqInput!);
      noteOsc.start(now);
      noteOsc.stop(now + 0.8);
      step++;
    }, intervalMs);
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(target);
    return true;
  }
}
