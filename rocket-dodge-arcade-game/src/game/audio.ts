// Procedural sound effects using Web Audio API — zero network, zero files

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function initAudio() {
  getCtx();
}

// ─── Smashing Explosion Sound (on asteroid hit) ─────────────────────────────
export function playExplosion() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Layer 1: Deep bass impact
  const bassOsc = ctx.createOscillator();
  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(150, now);
  bassOsc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(0.5, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  bassOsc.connect(bassGain);
  bassGain.connect(ctx.destination);
  bassOsc.start(now);
  bassOsc.stop(now + 0.5);

  // Layer 2: Crunch noise burst
  const duration = 0.6;
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(duration * sampleRate);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (sampleRate * 0.05)) * 0.6
              + Math.exp(-i / (sampleRate * 0.15)) * 0.4;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(400, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(80, now + duration);
  noiseFilter.Q.setValueAtTime(1, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);

  // Layer 3: Metal screech
  const screechOsc = ctx.createOscillator();
  screechOsc.type = 'sawtooth';
  screechOsc.frequency.setValueAtTime(800, now);
  screechOsc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
  const screechFilter = ctx.createBiquadFilter();
  screechFilter.type = 'highpass';
  screechFilter.frequency.setValueAtTime(600, now);
  const screechGain = ctx.createGain();
  screechGain.gain.setValueAtTime(0.15, now);
  screechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  screechOsc.connect(screechFilter);
  screechFilter.connect(screechGain);
  screechGain.connect(ctx.destination);
  screechOsc.start(now);
  screechOsc.stop(now + 0.3);

  // Layer 4: Debris scatter
  for (let i = 0; i < 5; i++) {
    const clickTime = now + 0.05 + i * 0.06 + Math.random() * 0.03;
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(200 + Math.random() * 800, clickTime);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.08, clickTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(clickTime);
    clickOsc.stop(clickTime + 0.04);
  }
}

// ─── BOOM — Deep bass boom when accelerating ────────────────────────────────
let lastBoomTime = 0;

export function playBoom() {
  const ctx = getCtx();
  if (!ctx) return;

  // Throttle: don't play more than every 180ms
  const now = ctx.currentTime;
  if (now - lastBoomTime < 0.18) return;
  lastBoomTime = now;

  // Deep sub-bass punch
  const bass = ctx.createOscillator();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(80, now);
  bass.frequency.exponentialRampToValueAtTime(30, now + 0.25);
  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(0.35, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  bass.connect(bassGain);
  bassGain.connect(ctx.destination);
  bass.start(now);
  bass.stop(now + 0.25);

  // Mid punch — gives it the "boom" character
  const mid = ctx.createOscillator();
  mid.type = 'triangle';
  mid.frequency.setValueAtTime(200, now);
  mid.frequency.exponentialRampToValueAtTime(60, now + 0.15);
  const midGain = ctx.createGain();
  midGain.gain.setValueAtTime(0.2, now);
  midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  mid.connect(midGain);
  midGain.connect(ctx.destination);
  mid.start(now);
  mid.stop(now + 0.15);

  // Short noise burst — the "whoosh" part of the boom
  const noiseDur = 0.12;
  const sr = ctx.sampleRate;
  const bufSz = Math.floor(noiseDur * sr);
  const buf = ctx.createBuffer(1, bufSz, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSz; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.03));
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = buf;
  const nf = ctx.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.setValueAtTime(500, now);
  nf.frequency.exponentialRampToValueAtTime(100, now + noiseDur);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.15, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);
  noiseSrc.connect(nf);
  nf.connect(ng);
  ng.connect(ctx.destination);
  noiseSrc.start(now);

  // Upper harmonic ring — gives it a rocket-like shimmer
  const shimmer = ctx.createOscillator();
  shimmer.type = 'sawtooth';
  shimmer.frequency.setValueAtTime(400, now);
  shimmer.frequency.exponentialRampToValueAtTime(150, now + 0.08);
  const shimmerFilter = ctx.createBiquadFilter();
  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.setValueAtTime(600, now);
  shimmerFilter.Q.setValueAtTime(5, now);
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0.06, now);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  shimmer.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmer.start(now);
  shimmer.stop(now + 0.08);
}

// ─── Combo Chime ────────────────────────────────────────────────────────────
export function playCombo() {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.2);
  });
}

// ─── Game Start Fanfare ─────────────────────────────────────────────────────
export function playStart() {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [262, 330, 392, 523];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.15);
  });
}
