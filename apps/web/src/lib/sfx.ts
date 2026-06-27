// =============================================================================
// SFX — efectos de sonido sintetizados (Web Audio). Sin archivos: todo se genera
// con osciladores/ruido, así no pesa nada y no hay que cargar assets.
// El AudioContext se desbloquea en el primer gesto del usuario (política de
// autoplay). Si está silenciado o falla, no rompe nada.
// =============================================================================

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  return ctx;
}

/** Llamar en el primer gesto (click) para habilitar audio en móviles. */
export function unlockSfx() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setSfxEnabled(on: boolean) {
  enabled = on;
  if (!on && ctx) { try { ctx.suspend(); } catch { /* noop */ } }
  if (on) unlockSfx();
}
export function isSfxEnabled() { return enabled; }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, when = 0, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.08, when = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); // decae
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  src.connect(hp).connect(g).connect(c.destination);
  src.start(t0);
}

// --- Eventos del juego ---

/** Carta que cae sobre el fieltro (susurro corto). */
export function sfxDeal() { noise(0.09, 0.06); }

/** Fichas apostadas (clinks rápidos como fichas reales sobre el fieltro). */
export function sfxChips() {
  for (let i = 0; i < 3; i++) tone(2300 - i * 220, 0.03, 'triangle', 0.06, i * 0.035);
  noise(0.05, 0.05, 0.02);
}

/** Pasar / check (golpe seco en la mesa, como tocar con los nudillos). */
export function sfxCheck() { tone(190, 0.05, 'sine', 0.11); tone(150, 0.06, 'sine', 0.09, 0.06); }

/** Es tu turno (campanita de dos notas ascendente). */
export function sfxYourTurn() { tone(660, 0.12, 'sine', 0.14); tone(880, 0.16, 'sine', 0.14, 0.1); }

/** Se acaba el tiempo (beep urgente). */
export function sfxTimeWarning() { tone(520, 0.12, 'triangle', 0.13, 0, 380); }

/** Ganaste el bote (acorde alegre). */
export function sfxWin() { tone(523, 0.18, 'sine', 0.12); tone(659, 0.18, 'sine', 0.12, 0.08); tone(784, 0.26, 'sine', 0.12, 0.16); }
