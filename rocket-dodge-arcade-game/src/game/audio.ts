// Procedural sound effects using Web Audio API — zero network, zero files

let audioCtx: AudioContext | null = null;
let lastSoundTime = 0;

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

// ─── SMASHING EXPLOSION (Sci-fi Digital Crash) ──────────────────────────────
export function playExplosion() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Impact layer
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(10, now + 0.4);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);

  // Noise/Crunch layer
  const bufSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.2, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(nGain);
  nGain.connect(ctx.destination);
  noise.start(now);
}

// ─── UP/SIDES: SIMPLE DIRECTIONAL (Clean Zip) ──────────────────────────────
export function playBoom() {
  const ctx = getCtx();
  if (!ctx || ctx.currentTime - lastSoundTime < 0.08) return;
  lastSoundTime = ctx.currentTime;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle'; 
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

// ─── DOWN: DECELERATION (Smooth Slide Down) ────────────────────────────────
export function playSoftHum() {
  const ctx = getCtx();
  if (!ctx || ctx.currentTime - lastSoundTime < 0.1) return;
  lastSoundTime = ctx.currentTime;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.3); // Pitch drops low

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

// ─── COMBO CHIME ────────────────────────────────────────────────────────────
export function playCombo() {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.2);
  });
}

// ─── GAME START FANFARE ─────────────────────────────────────────────────────
export function playStart() {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = [262, 392, 523];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.2);
  });
}
