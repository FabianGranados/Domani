// =============================================================================
// PIONERO #4 — El Pollo (El Novato)
// -----------------------------------------------------------------------------
// Débil, impulsivo, cuelga piezas, paga de más. Pero es entusiasta y simpático:
// llena las mesas de abajo y hace sentir bien al que va aprendiendo. Rápido
// porque no piensa. El alimento del ecosistema.
// =============================================================================

import type { BrainSpec } from '../types';

export const POLLO: BrainSpec = {
  key: 'pollo',
  nombre: 'El Pollo',
  lema: '¡Esta sí la gano, ya verás!',
  tier: 'bajo',
  juegoFavorito: 'poker',
  gustos:      { jugar: 0.80, trabajar: 0.25, invertir: 0.25, social: 0.72 },
  fortalezas:  { cognicion: 0.30, finanzas: 0.25, percepcion: 0.30, disciplina: 0.25 },
  debilidades: { tilt: 0.45, codicia: 0.55, impaciencia: 0.80, fatiga: 0.25 },
  estilo:      { agresividad: 0.45, farol: 0.15, riesgo: 0.55, exhibicion: 0.35 },
  timing:      { velocidadBase: 0.85, pensarEnDuro: 0.15, varianza: 0.45 },
  voz:         { locuacidad: 0.72, bancoVoz: 'pollo', patronApodo: 'apodo_novato' },
  variacion:   { jitter: 0.10 },
};

export const POLLO_VOZ: Record<string, string[]> = {
  saludo:  ['¡Hola a todos! ¿Esto cómo era?', '¡Vengo a aprender!', '¿Por dónde empiezo?'],
  apuesta: ['Eh… ¿subo? ¡Subo!', 'Creo que esta es buena, ¿no?', '¡A todo o nada!'],
  farol:   ['¿Esto es farol? Yo qué sé.', '¡Me arriesgo!', 'Tú dirás…'],
  gana:    ['¡¿Gané?! ¡GANÉ!', '¡No me lo esperaba ni yo!', '¡Suerte de principiante!'],
  pierde:  ['Ay, otra vez no…', '¿Qué hice mal?', '¡La próxima la gano, ya verás!'],
  pincha:  ['¿Es mi turno? Perdón.', 'Esperen, esperen…', '¿Qué hago aquí?'],
};
