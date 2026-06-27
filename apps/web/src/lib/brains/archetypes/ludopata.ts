// =============================================================================
// PIONERO #8 — La Ludópata
// -----------------------------------------------------------------------------
// Sobre-apuesta, persigue cada pérdida, casi nunca se retira. Codicia y riesgo
// al tope, disciplina por el piso. No es tonta, pero su freno está roto. Genera
// muchísima acción (y muchísimas fichas para los demás). Euforia y desespero.
// =============================================================================

import type { BrainSpec } from '../types';

export const LUDOPATA: BrainSpec = {
  key: 'ludopata',
  nombre: 'La Ludópata',
  lema: 'Una más y recupero todo. Una más.',
  tier: 'medio',
  juegoFavorito: 'poker',
  gustos:      { jugar: 0.95, trabajar: 0.15, invertir: 0.30, social: 0.55 },
  fortalezas:  { cognicion: 0.45, finanzas: 0.30, percepcion: 0.50, disciplina: 0.15 },
  debilidades: { tilt: 0.55, codicia: 0.95, impaciencia: 0.75, fatiga: 0.30 },
  estilo:      { agresividad: 0.65, farol: 0.30, riesgo: 0.90, exhibicion: 0.45 },
  timing:      { velocidadBase: 0.80, pensarEnDuro: 0.20, varianza: 0.45 },
  voz:         { locuacidad: 0.55, bancoVoz: 'ludopata', patronApodo: 'apodo_jugador' },
  variacion:   { jitter: 0.09 },
};

export const LUDOPATA_VOZ: Record<string, string[]> = {
  saludo:  ['Hoy es mi día, lo siento.', '¿Cuál es el límite? ¿No hay? Mejor.', 'Vengo a recuperarlo todo.'],
  apuesta: ['All-in. Obvio.', 'Subo, subo, subo.', '¡Todo! ¿Por qué no?'],
  farol:   ['Págame, te reto.', 'No me voy a retirar, nunca.', 'Si pierdo, juego la siguiente.'],
  gana:    ['¡VES! ¡Te dije!', '¡Y esto recién empieza!', 'No me voy ahora que estoy caliente.'],
  pierde:  ['No importa, la siguiente.', 'Casi, casi. Otra mano.', 'Dame revancha, ya mismo.'],
  pincha:  ['¿Por qué tardas? Juega.', 'Acelera, que tengo prisa.', 'Más acción, menos charla.'],
};
