/** Synthesized audio: one-shot SFX and a generative gothic ambient score. No audio files needed. */
type Sfx = 'hit' | 'crit' | 'swing' | 'cast' | 'blood' | 'dash' | 'hurt' | 'kill' | 'feed' | 'pickup' | 'gold' | 'chest' | 'boss' | 'levelup' | 'ui' | 'portal' | 'shield' | 'thunder' | 'fire' | 'frost' | 'deny' | 'heartbeat';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  reverb!: ConvolverNode;
  private noiseBuf!: AudioBuffer;
  private musicTimer = 0;
  private musicOn = false;
  private mood: 'haven' | 'hunt' | 'boss' = 'haven';
  sfxVol = 0.7;
  musicVol = 0.5;
  private last: Record<string, number> = {};

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVol * 0.5; this.musicBus.connect(this.master);
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    this.reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35; this.reverb.connect(wet); wet.connect(this.master);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx; this.musicVol = music;
    if (this.ctx) { this.sfxBus.gain.value = sfx; this.musicBus.gain.value = music * 0.5; }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, opts: { slide?: number; attack?: number; reverb?: number; delay?: number; bus?: GainNode } = {}) {
    const ctx = this.ctx!; const t = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + (opts.attack ?? 0.005)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(opts.bus ?? this.sfxBus);
    if (opts.reverb) { const s = ctx.createGain(); s.gain.value = opts.reverb; gn.connect(s); s.connect(this.reverb); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, filter: BiquadFilterType, freq: number, opts: { q?: number; sweep?: number; reverb?: number; delay?: number } = {}) {
    const ctx = this.ctx!; const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t); f.Q.value = opts.q ?? 1;
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(freq * opts.sweep, t + dur);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(gn); gn.connect(this.sfxBus);
    if (opts.reverb) { const s = ctx.createGain(); s.gain.value = opts.reverb; gn.connect(s); s.connect(this.reverb); }
    src.start(t); src.stop(t + dur + 0.05);
  }

  play(s: Sfx, intensity = 1) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const now = performance.now();
    if (now - (this.last[s] ?? 0) < 35) return; // de-duplicate bursts
    this.last[s] = now;
    const v = Math.min(1, intensity);
    switch (s) {
      case 'swing': this.noise(0.14, 0.18 * v, 'bandpass', 1800, { sweep: 0.4, q: 0.8 }); break;
      case 'hit': this.noise(0.09, 0.35 * v, 'lowpass', 1400, { sweep: 0.3 }); this.tone(140, 0.12, 'square', 0.12 * v, { slide: 0.5 }); break;
      case 'crit': this.noise(0.15, 0.4, 'lowpass', 2400, { sweep: 0.2 }); this.tone(90, 0.25, 'sawtooth', 0.18, { slide: 0.4, reverb: 0.3 }); break;
      case 'cast': this.tone(420, 0.25, 'sine', 0.12, { slide: 2, reverb: 0.5 }); this.noise(0.25, 0.08, 'highpass', 3000, { reverb: 0.4 }); break;
      case 'blood': this.noise(0.22, 0.2, 'bandpass', 600, { sweep: 2.5, q: 3, reverb: 0.3 }); this.tone(220, 0.2, 'triangle', 0.08, { slide: 1.6 }); break;
      case 'dash': this.noise(0.18, 0.18, 'bandpass', 900, { sweep: 3, q: 1.5 }); break;
      case 'hurt': this.tone(110, 0.22, 'sawtooth', 0.2, { slide: 0.6 }); this.noise(0.12, 0.2, 'lowpass', 800); break;
      case 'kill': this.noise(0.3, 0.25, 'lowpass', 900, { sweep: 0.2, reverb: 0.3 }); this.tone(70, 0.35, 'sine', 0.3, { slide: 0.4 }); break;
      case 'feed': this.tone(55, 0.9, 'sine', 0.35, { attack: 0.1, reverb: 0.4 }); this.noise(0.8, 0.12, 'bandpass', 400, { q: 6, sweep: 0.5 }); break;
      case 'heartbeat': this.tone(55, 0.15, 'sine', 0.4); this.tone(50, 0.15, 'sine', 0.3, { delay: 0.18 }); break;
      case 'pickup': this.tone(660, 0.12, 'triangle', 0.12); this.tone(990, 0.15, 'triangle', 0.1, { delay: 0.06 }); break;
      case 'gold': this.tone(1320, 0.08, 'square', 0.04); this.tone(1760, 0.1, 'square', 0.035, { delay: 0.05 }); break;
      case 'chest': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, { delay: i * 0.07, reverb: 0.6 })); break;
      case 'levelup': [262, 330, 392, 523, 659].forEach((f, i) => this.tone(f, 0.9, 'sawtooth', 0.06, { delay: i * 0.09, reverb: 0.8 })); break;
      case 'boss': this.tone(41, 2.5, 'sawtooth', 0.3, { attack: 0.3, reverb: 0.9 }); this.tone(61.7, 2.5, 'sawtooth', 0.2, { attack: 0.3, reverb: 0.9 }); this.noise(2, 0.15, 'lowpass', 200, { reverb: 0.8 }); break;
      case 'portal': this.tone(200, 1.2, 'sine', 0.2, { slide: 3, reverb: 0.9, attack: 0.2 }); break;
      case 'shield': this.tone(520, 0.4, 'sine', 0.12, { slide: 0.7, reverb: 0.5 }); this.tone(780, 0.4, 'sine', 0.08, { slide: 0.7 }); break;
      case 'thunder': this.noise(0.6, 0.4, 'lowpass', 3000, { sweep: 0.05, reverb: 0.6 }); break;
      case 'fire': this.noise(0.4, 0.25, 'bandpass', 500, { sweep: 2, q: 0.6, reverb: 0.2 }); break;
      case 'frost': this.tone(1800, 0.3, 'sine', 0.06, { slide: 0.5, reverb: 0.6 }); this.noise(0.25, 0.1, 'highpass', 5000); break;
      case 'ui': this.tone(880, 0.06, 'triangle', 0.06); break;
      case 'deny': this.tone(140, 0.15, 'square', 0.08); break;
    }
  }

  // ───────────── Music: slow organ-like minor chords + bell motifs ─────────────
  startMusic(mood: 'haven' | 'hunt' | 'boss') {
    this.mood = mood;
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.scheduleBar(0);
  }
  stopMusic() { this.musicOn = false; clearTimeout(this.musicTimer); }

  private scheduleBar(bar: number) {
    if (!this.musicOn || !this.ctx) return;
    const PROG: number[][] = [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]]; // i – VI – VII – v (in semitones from root)
    const root = this.mood === 'boss' ? 41.2 : this.mood === 'hunt' ? 55 : 49;
    const len = this.mood === 'boss' ? 2.2 : 4.4;
    const chord = PROG[bar % 4];
    const bus = this.musicBus;
    for (const st of chord) {
      const f = root * 2 * 2 ** (st / 12);
      this.tone(f, len * 1.05, 'sawtooth', 0.025, { attack: len * 0.35, bus, reverb: 0.6 });
      this.tone(f * 2.003, len, 'sine', 0.03, { attack: len * 0.3, bus, reverb: 0.5 });
    }
    this.tone(root * 2 ** (chord[0] / 12), len, 'triangle', 0.06, { attack: 0.4, bus });
    if (this.mood !== 'haven' || bar % 2 === 0) {
      const scale = [0, 2, 3, 5, 7, 8, 10, 12];
      const notes = this.mood === 'boss' ? 6 : 3;
      for (let i = 0; i < notes; i++) {
        if (Math.random() < 0.35) continue;
        const st = scale[Math.floor(Math.random() * scale.length)] + 12;
        this.tone(root * 4 * 2 ** (st / 12), 1.6, 'sine', 0.035, { delay: (i * len) / notes, bus, reverb: 0.9 });
      }
    }
    if (this.mood === 'boss') for (let i = 0; i < 4; i++) this.noise(0.18, 0.08, 'lowpass', 120, { delay: (i * len) / 4 });
    this.musicTimer = window.setTimeout(() => this.scheduleBar(bar + 1), len * 1000);
  }
}

export const audio = new AudioEngine();
