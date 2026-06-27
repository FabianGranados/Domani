// =============================================================================
// PIONERO #1 — El Tiburón
// -----------------------------------------------------------------------------
// Listo, agresivo, farolea, rápido y filoso. Lee a la gente. Su grieta: algo de
// codicia y de impaciencia (se emociona con un buen bote). Tilt CONTROLADO: no
// se descontrola fácil, por eso es peligroso. No es el más fuerte del mundo en
// cálculo puro (ese es El Don), pero gana por presión, lectura y velocidad.
//
// Se siente Tiburón porque: apuesta fuerte y rápido, farolea seguido, habla
// (pincha al rival), y solo se "tanquea" cuando el bote lo vale.
// =============================================================================

import type { BrainSpec } from '../types';

export const TIBURON: BrainSpec = {
  key: 'tiburon',
  nombre: 'El Tiburón',
  lema: 'Huele la sangre y aprieta.',
  tier: 'alto',
  juegoFavorito: 'poker',

  // GUSTOS — vive para jugar; invierte y socializa medio; casi no "trabaja".
  gustos: {
    jugar: 0.88,
    trabajar: 0.20,
    invertir: 0.55,
    social: 0.62,
  },

  // FORTALEZAS — agudo y buen lector; no es el cerebro más profundo (eso es El Don).
  fortalezas: {
    cognicion: 0.78,
    finanzas: 0.62,
    percepcion: 0.85, // su arma principal: lee al rival
    disciplina: 0.66,
  },

  // DEBILIDADES — su talón: se emociona (codicia/impaciencia). Tilt bajo = letal.
  debilidades: {
    tilt: 0.32,
    codicia: 0.48,
    impaciencia: 0.42,
    fatiga: 0.25,
  },

  // ESTILO — la cara en la mesa: agresivo, farolero, le gusta enseñar la jugada.
  estilo: {
    agresividad: 0.86,
    farol: 0.70,
    riesgo: 0.72,
    exhibicion: 0.58,
  },

  // TIMING — rápido en lo obvio; se clava SOLO en decisiones grandes; ritmo variable.
  timing: {
    velocidadBase: 0.80, // contesta rápido
    pensarEnDuro: 0.55,  // pero piensa de verdad cuando el bote es serio
    varianza: 0.38,      // sus tiempos no son un metrónomo
  },

  // VOZ — habla seguido, pincha; apodos tipo "handle" (Tortox, Shark_88…).
  voz: {
    locuacidad: 0.66,
    bancoVoz: 'tiburon',
    patronApodo: 'handle_filoso',
  },

  // VARIACIÓN — dos Tiburones se parecen pero no son clones (±0.09 por eje).
  variacion: { jitter: 0.09 },
};

// -----------------------------------------------------------------------------
// Banco de voz del Tiburón. Deterministas; la selección se siembra por mano/evento
// y por ánimo (gana/pierde/farol/saludo). Este es el "artefacto" que en el futuro
// un Pionero rellenaría desde el LLM (ver §10/§13 del doc) — el hueco ya existe.
// -----------------------------------------------------------------------------
export const TIBURON_VOZ: Record<string, string[]> = {
  saludo:  ['Bienvenido al matadero.', '¿Trajiste suficiente?', 'Siéntate, esto va a doler.'],
  apuesta: ['Subo. ¿Te alcanza?', 'Presión, amigo.', 'No vine a mirar.'],
  farol:   ['Págame y averigua.', 'Lo tengo, créeme.', '¿En serio quieres ver esto?'],
  gana:    ['Gracias por el aporte.', 'Te leí desde el principio.', 'Fácil.'],
  pierde:  ['Buena. La próxima es mía.', 'Anótala, te la cobro.', 'Suerte de principiante.'],
  pincha:  ['¿Vas a pensarlo toda la noche?', 'Huelo el miedo desde aquí.', 'Esa cara ya la vi.'],
};
