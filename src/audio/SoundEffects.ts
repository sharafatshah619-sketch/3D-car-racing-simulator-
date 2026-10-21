class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Engine audio nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Nitro noise nodes
  private nitroSource: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  // Tire squeal nodes
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  // Weather ambience nodes
  private weatherSource: AudioBufferSourceNode | null = null;
  private weatherGain: GainNode | null = null;
  private weatherFilter: BiquadFilterNode | null = null;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngine();
      this.setupNitroNoise();
      this.setupSkidNoise();
      this.setupWeatherAudio();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupEngine() {
    if (!this.ctx) return;

    // Dual oscillator for rich mechanical engine drone
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(46, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private setupNitroNoise() {
    if (!this.ctx) return;

    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.nitroSource = this.ctx.createBufferSource();
    this.nitroSource.buffer = noiseBuffer;
    this.nitroSource.loop = true;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = 'bandpass';
    this.nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.nitroFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.nitroSource.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.ctx.destination);

    this.nitroSource.start();
  }

  private setupSkidNoise() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const skidSource = this.ctx.createBufferSource();
    skidSource.buffer = noiseBuffer;
    skidSource.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    skidSource.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.ctx.destination);

    skidSource.start();
  }

  private setupWeatherAudio() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.weatherSource = this.ctx.createBufferSource();
    this.weatherSource.buffer = noiseBuffer;
    this.weatherSource.loop = true;

    this.weatherFilter = this.ctx.createBiquadFilter();
    this.weatherFilter.type = 'lowpass';
    this.weatherFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
    this.weatherFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.weatherGain = this.ctx.createGain();
    this.weatherGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.weatherSource.connect(this.weatherFilter);
    this.weatherFilter.connect(this.weatherGain);
    this.weatherGain.connect(this.ctx.destination);

    this.weatherSource.start();
  }

  public setWeatherAudio(weather: 'clear' | 'rain' | 'snow') {
    if (!this.ctx || !this.weatherGain || !this.weatherFilter || this.isMuted) return;
    const t = this.ctx.currentTime;

    if (weather === 'rain') {
      this.weatherFilter.frequency.setTargetAtTime(1400, t, 0.2);
      this.weatherGain.gain.setTargetAtTime(0.08, t, 0.2);
    } else if (weather === 'snow') {
      this.weatherFilter.frequency.setTargetAtTime(450, t, 0.2);
      this.weatherGain.gain.setTargetAtTime(0.06, t, 0.2);
    } else {
      this.weatherGain.gain.setTargetAtTime(0.0, t, 0.2);
    }
  }

  public updateEngine(speedKmh: number, isAccelerating: boolean, isBoosting: boolean) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const normalizedSpeed = Math.min(speedKmh / 320, 1.0);
    const baseFreq = 45 + normalizedSpeed * 220 + (isAccelerating ? 25 : 0);

    if (this.engineOsc1 && this.engineOsc2) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.08);
    }

    if (this.engineFilter) {
      const filterFreq = 300 + normalizedSpeed * 1800 + (isAccelerating ? 600 : 0) + (isBoosting ? 800 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);
    }

    if (this.engineGain) {
      const targetGain = 0.08 + normalizedSpeed * 0.12 + (isAccelerating ? 0.06 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.08);
    }

    // Nitro sound
    if (this.nitroGain && this.nitroFilter) {
      if (isBoosting) {
        this.nitroGain.gain.setTargetAtTime(0.2, t, 0.05);
        this.nitroFilter.frequency.setTargetAtTime(1600 + normalizedSpeed * 1000, t, 0.05);
      } else {
        this.nitroGain.gain.setTargetAtTime(0.0, t, 0.1);
      }
    }
  }

  public setSkid(active: boolean, intensity: number = 0.5) {
    if (!this.ctx || !this.skidGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    if (active) {
      this.skidGain.gain.setTargetAtTime(Math.min(0.25 * intensity, 0.3), t, 0.05);
    } else {
      this.skidGain.gain.setTargetAtTime(0.0, t, 0.1);
    }
  }

  public playCheckpoint() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15); // A5

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playLapComplete() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Harmonic fan-fare chord
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.15, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.55);
    });
  }

  public playCountdown(isFinal: boolean) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'square' : 'sine';
    const freq = isFinal ? 880 : 440;
    osc.frequency.setValueAtTime(freq, t);

    const duration = isFinal ? 0.6 : 0.25;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playCollision() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx?.currentTime || 0);
    }
    if (this.nitroGain) {
      this.nitroGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    if (this.skidGain) {
      this.skidGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    if (this.weatherGain) {
      this.weatherGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundSystem = new SoundSystem();
