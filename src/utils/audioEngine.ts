import { EqBand, SynthVoiceConfig } from '../types/music';

// 5-band Seal Equalizer matching Android AudioEffect hardware frequencies
export const DEFAULT_EQ_BANDS: EqBand[] = [
  { frequencyHz: 60, label: '60 Hz', gainDb: 0 },
  { frequencyHz: 230, label: '230 Hz', gainDb: 0 },
  { frequencyHz: 910, label: '910 Hz', gainDb: 0 },
  { frequencyHz: 3600, label: '3.6 kHz', gainDb: 0 },
  { frequencyHz: 14000, label: '14 kHz', gainDb: 0 },
];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  Warm: [3.5, 1.5, 0, -1, -2],
  Vocal: [-2, 1, 3.5, 2.5, 0.5],
  'Bass Boost': [6.5, 4, 0.5, 0, 1],
  Acoustic: [2.5, 1, 1.5, 2.5, 2],
};

export class WebAudioPlayerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private eqInput: GainNode | null = null;
  private bassBoostFilter: BiquadFilterNode | null = null;

  // 3D Spatial Audio (Virtualizer) stereo widening nodes
  private spatialDryGain: GainNode | null = null;
  private spatialWetGain: GainNode | null = null;
  private spatialDelayL: DelayNode | null = null;
  private spatialDelayR: DelayNode | null = null;

  // HTMLAudioElement pipeline for real uploaded files
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Synth pipeline for built-in playable tracks
  private synthOscillators: OscillatorNode[] = [];
  private synthStepTimer: number | null = null;
  private synthGain: GainNode | null = null;

  private eqEnabled = true;
  private currentGains: number[] = DEFAULT_EQ_BANDS.map((b) => b.gainDb);
  private bassBoostStrength = 600; // 0..2000 (Extended Sub-Bass)
  private spatialAudioStrength = 450; // 0..1000 (Spatial 3D HD)

  private ensureGraph() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.eqInput = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.78;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.78;

    this.bassBoostFilter = this.ctx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.value = 80;
    this.bassBoostFilter.gain.value = this.eqEnabled
      ? (this.bassBoostStrength / 2000) * 14
      : 0;

    this.filters = DEFAULT_EQ_BANDS.map((band, index) => {
      const filter = this.ctx!.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === DEFAULT_EQ_BANDS.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.25;
      }
      filter.frequency.value = band.frequencyHz;
      filter.gain.value = this.eqEnabled ? this.currentGains[index] : 0;
      return filter;
    });

    // Build series EQ chain
    let node: AudioNode = this.eqInput;
    node.connect(this.bassBoostFilter);
    node = this.bassBoostFilter;
    for (const filter of this.filters) {
      node.connect(filter);
      node = filter;
    }

    // Build 3D Spatial Audio (Virtualizer) parallel Haas + cross-delay matrix
    this.spatialDryGain = this.ctx.createGain();
    this.spatialWetGain = this.ctx.createGain();
    this.updateSpatialGains();

    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);
    this.spatialDelayL = this.ctx.createDelay(0.05);
    this.spatialDelayR = this.ctx.createDelay(0.05);
    this.spatialDelayL.delayTime.value = 0.011;
    this.spatialDelayR.delayTime.value = 0.019;

    const crossGainL = this.ctx.createGain();
    const crossGainR = this.ctx.createGain();
    crossGainL.gain.value = -0.35;
    crossGainR.gain.value = 0.35;

    node.connect(this.spatialDryGain);
    this.spatialDryGain.connect(this.masterGain);

    node.connect(splitter);
    splitter.connect(this.spatialDelayL, 0);
    splitter.connect(this.spatialDelayR, 1);
    this.spatialDelayL.connect(crossGainL);
    this.spatialDelayR.connect(crossGainR);
    crossGainL.connect(merger, 0, 1);
    crossGainR.connect(merger, 0, 0);
    merger.connect(this.spatialWetGain);
    this.spatialWetGain.connect(this.masterGain);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private updateSpatialGains() {
    if (!this.ctx || !this.spatialDryGain || !this.spatialWetGain) return;
    const wetRatio = this.eqEnabled ? (this.spatialAudioStrength / 1000) * 0.65 : 0;
    this.spatialDryGain.gain.setTargetAtTime(1 - wetRatio * 0.2, this.ctx.currentTime, 0.02);
    this.spatialWetGain.gain.setTargetAtTime(wetRatio, this.ctx.currentTime, 0.02);
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
        enabled ? (this.bassBoostStrength / 2000) * 14 : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
    this.updateSpatialGains();
  }

  public setBassBoostStrength(strength: number) {
    this.bassBoostStrength = Math.max(0, Math.min(2000, strength));
    if (this.bassBoostFilter && this.ctx) {
      this.bassBoostFilter.gain.setTargetAtTime(
        this.eqEnabled ? (this.bassBoostStrength / 2000) * 14 : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public setSpatialAudioStrength(strength: number) {
    this.spatialAudioStrength = Math.max(0, Math.min(1000, strength));
    this.updateSpatialGains();
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
