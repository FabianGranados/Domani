// ============================================================
// Rueda 2.5D de la Ruleta — render en canvas
// ============================================================
// Portado del prototipo HTML, encapsulado como controlador para React.
//
// ⚠️ Anti-fraude: esta rueda NO decide el número. El servidor lo
// decide (spin_roulette); aquí sólo ANIMAMOS la bola hasta el número
// que nos pasan por lockTo(). Si el número aún no llegó cuando la bola
// termina de caer, la bola "flota" en la pista hasta que lo recibimos.
// ============================================================

import { WHEEL_ORDER, colorOf } from '@domani/game-roulette';

const ORDER = WHEEL_ORDER as readonly number[];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const N = 37;
const SEG = (Math.PI * 2) / N;
const TAU = Math.PI * 2;

// Geometría de la escena (coordenadas del canvas base).
const W = 1040, H = 780, CX = 520, CY = 360, TILT = 0.78, DEPTH = 122;
const R_OUT = 356, R_RIM_IN = 296, R_TRACK_IN = 250, R_PK_OUT = 248, R_PAD_IN = 206,
  R_PETAL = 182, R_NUM = 225, R_CONE = 176, CONE_H = 70;
const SPEED = 0.30, R_BALL_HI = 278, R_BALL_LO = 230;
const LAUNCH_WV = -8.5;

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r * f));
  g = Math.min(255, Math.round(g * f));
  b = Math.min(255, Math.round(b * f));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
const proj = (a: number, r: number) => ({ x: CX + r * Math.cos(a), y: CY + r * TILT * Math.sin(a) });
const colorBg = (n: number) => (n === 0 ? '#1f9a47' : REDS.has(n) ? '#d51f2a' : '#141414');

function cyl(c: CanvasRenderingContext2D, base: string, lo?: number, hi?: number) {
  const g = c.createLinearGradient(CX - R_OUT, 0, CX + R_OUT, 0);
  g.addColorStop(0, shade(base, lo ?? 0.5));
  g.addColorStop(0.22, shade(base, hi ?? 1.18));
  g.addColorStop(0.5, shade(base, 0.92));
  g.addColorStop(0.8, shade(base, 0.6));
  g.addColorStop(1, shade(base, lo ?? 0.45));
  return g;
}

interface BallState {
  phase: 'idle' | 'launch' | 'settle';
  angle: number; lockedLocal: number; r: number; wv: number; vr: number;
  landing: boolean; lockOff: number | null; lockTo: number; lockI: number;
}

export type WheelColor = ReturnType<typeof colorOf>;

export class RouletteWheel {
  private ctx: CanvasRenderingContext2D;
  private bgCanvas!: HTMLCanvasElement;
  private coneCanvas!: HTMLCanvasElement;
  private raf = 0;
  private last = 0;
  private wheelAngle = 0;
  private ball: BallState = {
    phase: 'idle', angle: -Math.PI / 2, lockedLocal: -Math.PI / 2, r: R_BALL_LO,
    wv: 0, vr: 0, landing: false, lockOff: null, lockTo: 0, lockI: 0,
  };
  /** índice (en ORDER) del número que el servidor decidió; null = aún no llega */
  private targetIndex: number | null = null;
  private landedCb: ((n: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    this.ctx = ctx;
    this.preRender(DPR);
  }

  /** Empieza el loop de animación (rueda girando, bola en reposo). */
  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.wheelAngle -= SPEED * dt;
      this.updateBall(now, dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Lanza la bola (la rueda ya está girando). */
  launch() {
    const b = this.ball;
    b.phase = 'launch';
    b.wv = LAUNCH_WV * (0.95 + Math.random() * 0.1);
    b.r = R_BALL_HI;
    b.vr = 0;
    b.landing = false;
    b.lockOff = null;
    this.targetIndex = null;
  }

  /** "¡NO VA MÁS!": la bola empieza a caer en espiral. */
  settle() {
    const b = this.ball;
    if (b.phase !== 'launch') return;
    b.phase = 'settle';
    b.vr = -6;
    b.landing = false;
    b.lockOff = null;
  }

  /** Fija el número (del servidor) hacia el que la bola debe aterrizar. */
  lockTo(num: number) {
    const idx = ORDER.indexOf(num);
    this.targetIndex = idx >= 0 ? idx : 0;
  }

  onLanded(cb: (n: number) => void) {
    this.landedCb = cb;
  }

  get phase() {
    return this.ball.phase;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  // ---------------------- física de la bola ----------------------
  private updateBall(now: number, dt: number) {
    const b = this.ball;
    if (b.phase === 'launch') {
      b.angle += b.wv * dt;
      b.wv += 0.30 * dt;
      if (b.wv > 0) b.wv = 0; // decelera, nunca acelera
      b.r = R_BALL_HI + Math.sin(now / 120) * 0.8;
    } else if (b.phase === 'settle') {
      b.angle += b.wv * dt;
      b.wv += 0.55 * dt;
      if (b.wv > 0) b.wv = 0;
      if (!b.landing) {
        b.vr += -24 * dt;
        if (b.vr > -7) b.vr = -7;
        if (b.vr < -90) b.vr = -90; // cae con piso de velocidad
        b.r += b.vr * dt + Math.sin(now / 45) * 0.5; // espiral + leve rebote
        if (b.r <= R_BALL_LO) {
          b.r = R_BALL_LO;
          b.landing = true;
          b.lockOff = null;
        }
      } else {
        // En la pista esperando el veredicto del servidor.
        if (this.targetIndex === null) {
          // flota en el borde, arrastrada por la rueda, hasta que llegue el número
          b.angle += b.wv * dt;
          b.r = R_BALL_LO;
          return;
        }
        if (b.lockOff === null) {
          const i = this.targetIndex;
          b.lockI = i;
          const tgt = -Math.PI / 2 + i * SEG;
          const cur = b.angle - this.wheelAngle;
          b.lockTo = tgt + Math.round((cur - tgt) / TAU) * TAU;
          b.lockOff = cur;
        }
        b.lockOff += (b.lockTo - b.lockOff) * Math.min(1, 3 * dt);
        b.r += (R_BALL_LO - b.r) * Math.min(1, 4 * dt);
        b.angle = this.wheelAngle + b.lockOff;
        if (Math.abs(b.lockOff - b.lockTo) < 0.004) {
          b.lockedLocal = -Math.PI / 2 + b.lockI * SEG;
          b.r = R_BALL_LO;
          b.phase = 'idle';
          this.landedCb?.(ORDER[b.lockI]);
        }
      }
    } else {
      b.angle = this.wheelAngle + b.lockedLocal;
      b.r = R_BALL_LO;
    }
  }

  // ---------------------- render ----------------------
  private preRender(DPR: number) {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = W * DPR;
    this.bgCanvas.height = H * DPR;
    const bc = this.bgCanvas.getContext('2d')!;
    bc.scale(DPR, DPR);
    this.drawStatic(bc);

    this.coneCanvas = document.createElement('canvas');
    this.coneCanvas.width = W * DPR;
    this.coneCanvas.height = H * DPR;
    const cc = this.coneCanvas.getContext('2d')!;
    cc.scale(DPR, DPR);
    this.drawConeLayer(cc);
  }

  private render() {
    const c = this.ctx;
    c.clearRect(0, 0, W, H);
    c.drawImage(this.bgCanvas, 0, 0, W, H);
    this.drawRing(c);
    if (Math.sin(this.ball.angle) < -0.05) this.drawBall(c);
    c.drawImage(this.coneCanvas, 0, 0, W, H);
    this.drawTurret(c);
    if (Math.sin(this.ball.angle) >= -0.05) this.drawBall(c);
  }

  private drawStatic(c: CanvasRenderingContext2D) {
    const bg = c.createRadialGradient(CX, CY - 40, 80, CX, CY, 660);
    bg.addColorStop(0, '#241a10'); bg.addColorStop(0.5, '#140d07'); bg.addColorStop(1, '#080503');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.save(); c.translate(CX, CY + DEPTH + 30); c.scale(1, TILT * 0.8);
    const sh = c.createRadialGradient(0, 0, R_OUT * 0.4, 0, 0, R_OUT * 1.2);
    sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.beginPath(); c.arc(0, 0, R_OUT * 1.2, 0, TAU); c.fillStyle = sh; c.fill(); c.restore();
    const radiusAt = (d: number) => { const u = d / DEPTH; return R_OUT + Math.sin(u * Math.PI) * 8 - u * u * 30; };
    for (let d = DEPTH; d >= 0; d--) {
      const r = radiusAt(d); let grad;
      if (d >= 64 && d <= 80) grad = cyl(c, '#d9b66a', 0.42, 1.35);
      else if (d > 80) grad = cyl(c, '#5c3a22', 0.4, 1.05);
      else grad = cyl(c, '#7e5132', 0.42, 1.16);
      c.beginPath(); c.ellipse(CX, CY + d, r, r * TILT, 0, 0, TAU); c.fillStyle = grad; c.fill();
    }
    [64, 80].forEach((d) => {
      const r = radiusAt(d); c.beginPath(); c.ellipse(CX, CY + d, r, r * TILT, 0, 0, TAU);
      c.lineWidth = 1; c.strokeStyle = 'rgba(90,60,20,.4)'; c.stroke();
    });
    c.beginPath(); c.ellipse(CX, CY, R_OUT, R_OUT * TILT, 0, 0, TAU); c.fillStyle = cyl(c, '#8a5a38', 0.5, 1.22); c.fill();
    c.save(); c.beginPath(); c.ellipse(CX, CY, R_OUT, R_OUT * TILT, 0, 0, TAU);
    c.ellipse(CX, CY, R_RIM_IN, R_RIM_IN * TILT, 0, 0, TAU); c.clip('evenodd');
    c.globalAlpha = 0.12;
    for (let i = 0; i < 5; i++) {
      const rr = R_RIM_IN + (R_OUT - R_RIM_IN) * (i + 0.5) / 5;
      c.beginPath(); c.ellipse(CX, CY, rr, rr * TILT, 0, 0, TAU); c.lineWidth = 1; c.strokeStyle = '#3a2412'; c.stroke();
    }
    c.restore();
    c.beginPath(); c.ellipse(CX, CY, R_OUT - 1, (R_OUT - 1) * TILT, 0, 0, TAU); c.lineWidth = 2; c.strokeStyle = 'rgba(255,225,180,.5)'; c.stroke();
    c.beginPath(); c.ellipse(CX, CY, R_RIM_IN, R_RIM_IN * TILT, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = 'rgba(40,24,12,.55)'; c.stroke();
    c.beginPath(); c.ellipse(CX, CY, R_RIM_IN, R_RIM_IN * TILT, 0, 0, TAU); c.fillStyle = cyl(c, '#cda86c', 0.62, 1.18); c.fill();
    c.save(); c.beginPath(); c.ellipse(CX, CY, R_RIM_IN, R_RIM_IN * TILT, 0, 0, TAU); c.clip();
    const ao = c.createRadialGradient(CX, CY, R_TRACK_IN, CX, CY, R_RIM_IN);
    ao.addColorStop(0, 'rgba(60,40,20,0)'); ao.addColorStop(1, 'rgba(50,30,14,.5)');
    c.fillStyle = ao; c.beginPath(); c.ellipse(CX, CY, R_RIM_IN, R_RIM_IN * TILT, 0, 0, TAU); c.fill();
    c.globalAlpha = 0.1;
    for (let i = 0; i < 4; i++) {
      const rr = R_TRACK_IN + (R_RIM_IN - R_TRACK_IN) * (i + 0.5) / 4;
      c.beginPath(); c.ellipse(CX, CY, rr, rr * TILT, 0, 0, TAU); c.lineWidth = 1.4; c.strokeStyle = '#7a5326'; c.stroke();
    }
    c.restore();
    const rDef = (R_RIM_IN + R_TRACK_IN) / 2 + 4;
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI / 2 + k * (TAU / 8); const front = (Math.sin(a) + 1) / 2;
      const ax = proj(a, rDef - 18 - 4 * front), bx = proj(a, rDef + 18 + 4 * front), s1 = proj(a - 0.05, rDef), s2 = proj(a + 0.05, rDef);
      c.beginPath(); c.moveTo(ax.x, ax.y); c.lineTo(s2.x, s2.y); c.lineTo(bx.x, bx.y); c.lineTo(s1.x, s1.y); c.closePath();
      const dg = c.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
      dg.addColorStop(0, '#8c9098'); dg.addColorStop(0.5, '#f2f4f6'); dg.addColorStop(1, '#9aa0a8');
      c.fillStyle = dg; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 4; c.shadowOffsetY = 2; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    }
  }

  private drawRing(c: CanvasRenderingContext2D) {
    const order: { i: number; mid: number; front: number }[] = [];
    for (let i = 0; i < N; i++) {
      const mid = -Math.PI / 2 + i * SEG + this.wheelAngle;
      order.push({ i, mid, front: (Math.sin(mid) + 1) / 2 });
    }
    order.sort((a, b) => a.front - b.front);
    const steps = 5;
    for (const o of order) {
      const i = o.i, mid = o.mid, front = o.front, a0 = mid - SEG / 2, a1 = mid + SEG / 2, n = ORDER[i];
      c.beginPath(); let p = proj(a0, R_PK_OUT); c.moveTo(p.x, p.y);
      for (let s = 1; s <= steps; s++) { const a = a0 + (a1 - a0) * s / steps; p = proj(a, R_PK_OUT); c.lineTo(p.x, p.y); }
      for (let s = 0; s <= steps; s++) { const a = a1 - (a1 - a0) * s / steps; p = proj(a, R_PAD_IN); c.lineTo(p.x, p.y); }
      c.closePath();
      const base = colorBg(n), cOut = proj(mid, R_PK_OUT), cIn = proj(mid, R_PAD_IN);
      const pg = c.createLinearGradient(cIn.x, cIn.y, cOut.x, cOut.y);
      pg.addColorStop(0, shade(base, 0.7)); pg.addColorStop(0.5, base); pg.addColorStop(1, shade(base, 1.14));
      c.fillStyle = pg; c.fill(); c.fillStyle = 'rgba(0,0,0,' + (0.5 * (1 - front)).toFixed(3) + ')'; c.fill();
      const apex = proj(mid, R_PETAL), bl = proj(a0, R_PAD_IN + 2), br = proj(a1, R_PAD_IN + 2);
      c.beginPath(); c.moveTo(bl.x, bl.y); c.quadraticCurveTo(apex.x, apex.y - 2, br.x, br.y);
      c.quadraticCurveTo((br.x + apex.x) / 2, apex.y + 6, apex.x, apex.y + 3);
      c.quadraticCurveTo((bl.x + apex.x) / 2, apex.y + 6, bl.x, bl.y); c.closePath();
      const sg = c.createLinearGradient(apex.x, apex.y, (bl.x + br.x) / 2, (bl.y + br.y) / 2);
      sg.addColorStop(0, shade('#1a1a1a', 0.5 + front)); sg.addColorStop(1, shade('#2a2a2a', 0.5 + front));
      c.fillStyle = sg; c.fill();
      c.beginPath(); c.ellipse((bl.x + apex.x) / 2, (bl.y + apex.y) / 2, 3, 2, 0, 0, TAU);
      c.fillStyle = 'rgba(255,255,255,' + (0.12 + 0.25 * front) + ')'; c.fill();
      const f0 = proj(a1, R_PK_OUT), f1 = proj(a1, R_PETAL); c.beginPath(); c.moveTo(f1.x, f1.y); c.lineTo(f0.x, f0.y);
      c.lineWidth = 1.2 + 0.8 * front; c.strokeStyle = 'rgba(220,210,180,' + (0.3 + 0.5 * front) + ')'; c.stroke();
      const tp = proj(mid, R_NUM), fs = 10 + 6 * front; c.save(); c.translate(tp.x, tp.y);
      c.font = '600 ' + fs.toFixed(1) + "px 'Inter', sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * front).toFixed(2) + ')'; c.fillText('' + n, 0, 0); c.restore();
    }
    c.beginPath(); c.ellipse(CX, CY, R_PK_OUT, R_PK_OUT * TILT, 0, 0, TAU); c.lineWidth = 2.5; c.strokeStyle = 'rgba(214,180,110,.9)'; c.stroke();
  }

  private drawConeLayer(c: CanvasRenderingContext2D) {
    const Rb = R_CONE, Hc = CONE_H, Rt = 30;
    const projT = (a: number, r: number, yc: number) => ({ x: CX + r * Math.cos(a), y: yc + r * TILT * Math.sin(a) });
    c.beginPath(); c.ellipse(CX, CY, Rb, Rb * TILT, 0, 0, TAU); c.fillStyle = '#6f5526'; c.fill();
    c.beginPath(); let p = projT(0, Rb, CY); c.moveTo(p.x, p.y);
    for (let s = 1; s <= 24; s++) { const a = Math.PI * s / 24; p = projT(a, Rb, CY); c.lineTo(p.x, p.y); }
    p = projT(Math.PI, Rt, CY - Hc); c.lineTo(p.x, p.y);
    for (let s = 1; s <= 24; s++) { const a = Math.PI + Math.PI * s / 24; p = projT(a, Rt, CY - Hc); c.lineTo(p.x, p.y); }
    c.closePath();
    const body = c.createLinearGradient(CX - Rb, 0, CX + Rb, 0);
    body.addColorStop(0, '#7a5c28'); body.addColorStop(0.18, '#d8b86e'); body.addColorStop(0.36, '#fff6db'); body.addColorStop(0.5, '#e8cf92');
    body.addColorStop(0.66, '#c2a056'); body.addColorStop(0.84, '#8a6c32'); body.addColorStop(1, '#5e481f'); c.fillStyle = body; c.fill();
    c.save(); c.clip();
    const hl = c.createRadialGradient(CX - 18, CY - Hc * 0.9, 4, CX, CY - Hc * 0.4, Rb * 0.9);
    hl.addColorStop(0, 'rgba(255,255,255,.6)'); hl.addColorStop(0.4, 'rgba(255,250,230,.12)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hl; c.fillRect(CX - Rb, CY - Hc - Rb, Rb * 2, Rb * 2 + Hc);
    c.globalAlpha = 0.5;
    for (let j = 1; j <= 6; j++) {
      const frac = j / 7, rr = Rb + (Rt - Rb) * frac, yc = CY - Hc * frac;
      c.beginPath(); c.ellipse(CX, yc, rr, rr * TILT, 0, 0, TAU); c.lineWidth = 1; c.strokeStyle = 'rgba(74,54,22,.55)'; c.stroke();
    }
    c.restore();
    c.beginPath(); c.ellipse(CX, CY - Hc, Rt, Rt * TILT, 0, 0, TAU);
    const tg = c.createRadialGradient(CX - 8, CY - Hc - 6, 2, CX, CY - Hc, Rt);
    tg.addColorStop(0, '#fff7df'); tg.addColorStop(0.6, '#e2c684'); tg.addColorStop(1, '#9c7c3e'); c.fillStyle = tg; c.fill();
    c.beginPath(); c.ellipse(CX, CY - Hc, Rt, Rt * TILT, 0, 0, TAU); c.lineWidth = 1; c.strokeStyle = 'rgba(110,84,38,.7)'; c.stroke();
    c.beginPath(); c.ellipse(CX, CY, Rb, Rb * TILT, 0, 0, TAU); c.lineWidth = 2; c.strokeStyle = 'rgba(110,84,38,.7)'; c.stroke();
  }

  private drawTurret(c: CanvasRenderingContext2D) {
    const topY = CY - CONE_H, spindleH = 78;
    const gold = c.createLinearGradient(CX - 16, 0, CX + 16, 0);
    gold.addColorStop(0, '#7a5826'); gold.addColorStop(0.34, '#fff3cf'); gold.addColorStop(0.5, '#fffbe8'); gold.addColorStop(0.66, '#e6c87e'); gold.addColorStop(1, '#7a5826');
    const ballAt = (x: number, y: number, r: number) => {
      const bg = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 1, x, y, r * 1.2);
      bg.addColorStop(0, '#fffae6'); bg.addColorStop(0.5, '#ecd28e'); bg.addColorStop(1, '#8c6a32');
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = bg; c.fill();
      c.beginPath(); c.arc(x - r * 0.34, y - r * 0.4, r * 0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill();
    };
    c.beginPath(); c.ellipse(CX, topY, 22, 13, 0, 0, TAU); c.fillStyle = gold; c.fill();
    const hubY = topY - spindleH;
    c.beginPath(); c.moveTo(CX - 11, topY); c.lineTo(CX + 11, topY); c.lineTo(CX + 8, hubY); c.lineTo(CX - 8, hubY); c.closePath(); c.fillStyle = gold; c.fill();
    c.beginPath(); c.ellipse(CX, topY - spindleH * 0.34, 14, 8, 0, 0, TAU); c.fillStyle = gold; c.fill();
    c.beginPath(); c.ellipse(CX, topY - spindleH * 0.66, 11, 6, 0, 0, TAU); c.fillStyle = gold; c.fill();
    c.beginPath(); c.moveTo(CX - 4, topY - 4); c.lineTo(CX - 1, topY - 4); c.lineTo(CX - 2, hubY + 4); c.lineTo(CX - 4, hubY + 4); c.closePath(); c.fillStyle = 'rgba(255,251,228,.7)'; c.fill();
    const armR = 104, lift = 0.5;
    const arms: { a: number; ex: number; ey: number; front: number }[] = [];
    for (let k = 0; k < 4; k++) {
      const a = this.wheelAngle + k * (Math.PI / 2);
      arms.push({ a, ex: CX + armR * Math.cos(a), ey: hubY + armR * TILT * Math.sin(a) * lift, front: Math.sin(a) });
    }
    arms.sort((p, q) => p.front - q.front);
    const drawArm = (arm: { a: number; ex: number; ey: number; front: number }) => {
      const dx = arm.ex - CX, dy = arm.ey - hubY, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux, w0 = 5.5, w1 = 3.5;
      c.beginPath(); c.moveTo(CX + nx * w0, hubY + ny * w0); c.lineTo(arm.ex + nx * w1, arm.ey + ny * w1);
      c.lineTo(arm.ex - nx * w1, arm.ey - ny * w1); c.lineTo(CX - nx * w0, hubY - ny * w0); c.closePath();
      const ag = c.createLinearGradient(CX + nx * w0, hubY + ny * w0, CX - nx * w0, hubY - ny * w0);
      ag.addColorStop(0, '#7a5826'); ag.addColorStop(0.5, '#fff6db'); ag.addColorStop(1, '#9c7838');
      c.fillStyle = ag; c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 4; c.fill(); c.shadowBlur = 0;
      [0.42, 0.72].forEach((f) => {
        const mx = CX + ux * len * f, my = hubY + uy * len * f;
        c.beginPath(); c.ellipse(mx, my, 5.5, 4, Math.atan2(uy, ux), 0, TAU); c.fillStyle = '#e6c87e'; c.fill();
        c.lineWidth = 1; c.strokeStyle = 'rgba(110,79,34,.6)'; c.stroke();
      });
      ballAt(arm.ex, arm.ey, 9 + 2 * Math.max(0, arm.front));
    };
    arms.filter((a) => a.front < 0).forEach(drawArm);
    ballAt(CX, hubY, 14);
    arms.filter((a) => a.front >= 0).forEach(drawArm);
    ballAt(CX, hubY - 5, 8);
  }

  private drawBall(c: CanvasRenderingContext2D) {
    const b = this.ball, p = proj(b.angle, b.r), front = (Math.sin(b.angle) + 1) / 2, br = 7.5 + 3.2 * front;
    c.beginPath(); c.ellipse(p.x + 1.5, p.y + br * 0.66, br * 1.05, br * 0.5, 0, 0, TAU); c.fillStyle = 'rgba(0,0,0,.42)'; c.fill();
    const g = c.createRadialGradient(p.x - br * 0.4, p.y - br * 0.45, 1, p.x, p.y, br * 1.2);
    g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ece7d8'); g.addColorStop(1, '#9a9486');
    c.beginPath(); c.arc(p.x, p.y, br, 0, TAU); c.fillStyle = g; c.fill();
    c.beginPath(); c.arc(p.x - br * 0.34, p.y - br * 0.42, br * 0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill();
  }
}
