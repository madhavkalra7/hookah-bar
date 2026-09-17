// Realistic Web Audio synthesizer for Hookah Baar
// Generates water bubbling sounds during inhalation (draw)
// and soft airy exhale whoosh sounds during smoke blow.

class HookahAudio {
  constructor() {
    this.ctx = null;
    this.drawGain = null;
    this.exhaleGain = null;
    this.bubbleTimer = null;
    this.isDrawing = false;
    this.isExhaling = false;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    // Create 2 seconds of pink/brown noise
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown/pink filter
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    // Master draw gain
    this.drawGain = this.ctx.createGain();
    this.drawGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.drawGain.connect(this.ctx.destination);

    // Master exhale gain
    this.exhaleGain = this.ctx.createGain();
    this.exhaleGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.exhaleGain.connect(this.ctx.destination);

    // Setup Exhale noise source
    const exhaleSource = this.ctx.createBufferSource();
    exhaleSource.buffer = this.noiseBuffer;
    exhaleSource.loop = true;

    const exhaleFilter = this.ctx.createBiquadFilter();
    exhaleFilter.type = 'lowpass';
    exhaleFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
    exhaleFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    exhaleSource.connect(exhaleFilter);
    exhaleFilter.connect(this.exhaleGain);
    exhaleSource.start();
  }

  // Create individual water bubble "plop / blub"
  _triggerBubble(intensity = 1.0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // Bubble oscillator (sine wave with rapid rising pitch)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    const startFreq = 160 + Math.random() * 120;
    const endFreq = startFreq + 180 + Math.random() * 140;
    const duration = 0.04 + Math.random() * 0.04;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    oscGain.gain.setValueAtTime(0.01, now);
    oscGain.gain.linearRampToValueAtTime(0.22 * intensity, now + 0.008);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Noise burst for the water splash / pop
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(320 + Math.random() * 150, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.2);

    osc.connect(oscGain);
    oscGain.connect(this.drawGain);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.drawGain);

    osc.start(now);
    noiseSrc.start(now);

    osc.stop(now + duration);
    noiseSrc.stop(now + duration * 1.2);
  }

  update(state) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const isDrawing = state.state === 'drawing' || (state.drawIntensity && state.drawIntensity > 0.1);
    const isExhaling = state.state === 'exhaling' || (state.exhaleRate && state.exhaleRate > 0.05);

    // Handle Bubbling (Drawing)
    if (isDrawing) {
      const now = this.ctx.currentTime;
      this.drawGain.gain.setTargetAtTime(0.8, now, 0.05);
      if (!this.bubbleTimer) {
        const scheduleBubble = () => {
          if (!this.isDrawing) return;
          this._triggerBubble(state.drawIntensity || 1.0);
          const nextInterval = 45 + Math.random() * 65; // Rapid bubbling 12-18 bubbles/sec
          this.bubbleTimer = setTimeout(scheduleBubble, nextInterval);
        };
        this.isDrawing = true;
        scheduleBubble();
      }
    } else {
      this.isDrawing = false;
      if (this.bubbleTimer) {
        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = null;
      }
      if (this.drawGain) {
        this.drawGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }

    // Handle Exhale sound
    if (isExhaling && state.lung > 0) {
      const rate = state.exhaleRate || 0.6;
      this.exhaleGain.gain.setTargetAtTime(Math.min(0.5, rate * 0.45), this.ctx.currentTime, 0.08);
    } else {
      this.exhaleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
    }
  }
}

window.hookahAudio = new HookahAudio();
document.addEventListener('pointerdown', () => {
  window.hookahAudio.init();
}, { once: true });
document.addEventListener('keydown', () => {
  window.hookahAudio.init();
}, { once: true });
