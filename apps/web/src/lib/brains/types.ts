// =============================================================================
// Domani — El Molde de los Cerebros (BrainSpec)
// -----------------------------------------------------------------------------
// Un ciudadano de Domani = UN cerebro (no uno por juego). El cerebro es DATA
// determinista: ejes en [0,1] que describen la personalidad a nivel plataforma.
// El mismo cerebro alimenta ajedrez, póker, economía, ritmo y voz.
//
// Los 10 arquetipos ("Los Pioneros") son 10 BrainSpec. Cada uno de los ~10.000
// ciudadanos hereda un arquetipo + una VARIACIÓN sembrada por su UUID (abajo),
// así dos "Tiburones" no son idénticos pero ambos se sienten Tiburón.
//
// Regla suprema: esto es DETERMINISTA. Nada aquí llama a un LLM en runtime.
// (Ver docs/IA-CEREBROS-DOMANI.md §3 y §13.)
// =============================================================================

/** Dónde aparece el ciudadano en el matchmaking / qué mesas frecuenta. */
export type Tier = 'bajo' | 'medio' | 'alto';

/** Juego favorito (sesga el motor de vida hacia esa sala). */
export type FavGame = 'ajedrez' | 'poker' | 'damas';

// ---- Las seis familias de ejes. Todos en [0,1] salvo donde se indique. -------

/** GUSTOS — qué QUIERE hacer en cada tick (utilidad base de cada acción). */
export interface Gustos {
  jugar: number;    // ganas de casino/juego
  trabajar: number; // ganas de producir/oficio
  invertir: number; // ganas de comerciar/bolsa
  social: number;   // ganas de chatear/relacionarse
}

/** FORTALEZAS — qué tan bien lo hace. */
export interface Fortalezas {
  cognicion: number;  // cálculo → profundidad de ajedrez y calidad de decisión
  finanzas: number;   // olfato de inversión/negociación
  percepcion: number; // leer al rival (ajuste, detectar farol)
  disciplina: number; // adherencia al plan (inverso de impulso)
}

/** DEBILIDADES — la grieta humana (de aquí sale la emergencia). */
export interface Debilidades {
  tilt: number;       // cuánto se descontrola al perder
  codicia: number;    // persigue pérdidas / sobre-apuesta (ludopatía)
  impaciencia: number;// corta el cálculo antes de tiempo
  fatiga: number;     // rinde menos en sesiones largas / de madrugada
}

/** ESTILO — la cara visible en la mesa. */
export interface Estilo {
  agresividad: number;  // apuesta fuerte / ataca
  farol: number;        // frecuencia de farol
  riesgo: number;       // tolerancia a la varianza (tamaño de apuesta)
  exhibicion: number;   // enseña cartas, presume, flashy
}

/** TIMING — el ritmo humano. Arregla el "todos contestan al instante". */
export interface Timing {
  velocidadBase: number; // 0 = lento, 1 = rapidísimo (ms base por decisión)
  pensarEnDuro: number;  // cuánto se "tanquea" en lo crítico (multiplicador)
  varianza: number;      // dispersión de los tiempos (anti-sincronía)
}

/** VOZ — cómo habla y cómo se llama. */
export interface Voz {
  locuacidad: number;   // cuánto habla (prob. de soltar frase por evento)
  bancoVoz: string;     // id del banco de frases (banter/ánimos/apodos)
  patronApodo: string;  // estilo del generador de nombre propio
}

/** Cuánto puede desviarse un ciudadano del arquetipo, por familia. */
export interface Variacion {
  /** Desviación máx. ± aplicada a cada eje (p.ej. 0.08). Sembrada por UUID. */
  jitter: number;
}

/** El cerebro completo de un arquetipo. */
export interface BrainSpec {
  key: string;          // 'tiburon'
  nombre: string;       // 'El Tiburón'
  lema: string;         // una línea que lo resume
  tier: Tier;
  juegoFavorito: FavGame;
  gustos: Gustos;
  fortalezas: Fortalezas;
  debilidades: Debilidades;
  estilo: Estilo;
  timing: Timing;
  voz: Voz;
  variacion: Variacion;
}

// =============================================================================
// VARIACIÓN DETERMINISTA — 1 arquetipo → muchos ciudadanos
// -----------------------------------------------------------------------------
// El mismo UUID siempre produce el mismo ciudadano. Sin Math.random.
// =============================================================================

/** Hash estable string→uint32 (FNV-1a). */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG determinista (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Deriva el cerebro CONCRETO de un ciudadano: arquetipo + jitter sembrado por
 * su UUID. Determinista y reproducible (clave para depurar y para la Sala de
 * Control: "ábreme este ciudadano y muéstrame su cerebro").
 */
export function citizenBrain(base: BrainSpec, citizenId: string): BrainSpec {
  const rng = mulberry32(hash32(citizenId + '|' + base.key));
  const j = base.variacion.jitter;
  const tweak = (x: number) => clamp01(x + (rng() * 2 - 1) * j);
  const fam = <T extends Record<string, number>>(o: T): T => {
    const out: Record<string, number> = {};
    for (const k in o) out[k] = tweak(o[k]);
    return out as T;
  };
  return {
    ...base,
    gustos: fam(base.gustos),
    fortalezas: fam(base.fortalezas),
    debilidades: fam(base.debilidades),
    estilo: fam(base.estilo),
    timing: { ...base.timing, velocidadBase: tweak(base.timing.velocidadBase), varianza: tweak(base.timing.varianza) },
  };
}

// =============================================================================
// MAPEOS — cerebro → configuración de cada motor
// -----------------------------------------------------------------------------
// El cerebro es agnóstico del juego; aquí se traduce a lo que cada motor espera.
// =============================================================================

/** Config de ajedrez derivada (compatible con LEVELS de chessBot.ts). */
export interface ChessFromBrain {
  level: 1 | 2 | 3 | 4 | 5; // fuerza efectiva (matchmaking/escalafón)
  thinkMul: number;         // multiplicador de tiempo de "pensar"
}

/** Mapea cognición/impaciencia a un nivel de ajedrez 1..5. */
export function chessFromBrain(b: BrainSpec): ChessFromBrain {
  const raw = 1 + b.fortalezas.cognicion * 4 - b.debilidades.impaciencia * 1.2;
  const level = Math.max(1, Math.min(5, Math.round(raw))) as 1 | 2 | 3 | 4 | 5;
  return { level, thinkMul: 1 + b.timing.pensarEnDuro };
}

/** Personalidad de póker derivada (compatible con poker.ts). */
export interface PokerFromBrain {
  tightness: number;
  aggression: number;
  bluff: number;
  tilt: number;
  style: 'agresivo' | 'conservador' | 'equilibrado' | 'loco';
}

export function pokerFromBrain(b: BrainSpec): PokerFromBrain {
  const tightness = clamp01(0.25 + b.fortalezas.disciplina * 0.5 - b.debilidades.codicia * 0.3);
  const aggression = clamp01(b.estilo.agresividad);
  const bluff = clamp01(0.04 + b.estilo.farol * 0.4);
  const style: PokerFromBrain['style'] =
    b.debilidades.impaciencia > 0.7 ? 'loco'
    : aggression > 0.7 ? 'agresivo'
    : tightness > 0.65 ? 'conservador'
    : 'equilibrado';
  return { tightness, aggression, bluff, tilt: b.debilidades.tilt, style };
}

/**
 * Retraso humano (ms) antes de actuar. `criticidad` 0..1 = qué tan importante
 * es la decisión (bote grande, mate cercano). Sembrado para no sincronizar.
 */
export function thinkDelayMs(b: BrainSpec, criticidad: number, seed: string): number {
  const rng = mulberry32(hash32(seed));
  const base = 350 + (1 - b.timing.velocidadBase) * 1600; // 350ms..1950ms
  const hard = 1 + criticidad * b.timing.pensarEnDuro * 2.5;
  const noise = 1 + (rng() * 2 - 1) * b.timing.varianza;
  return Math.round(base * hard * Math.max(0.3, noise));
}
