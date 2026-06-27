// =============================================================================
// PIONERO #6 — El Frío (El Calculador)
// -----------------------------------------------------------------------------
// Metódico, posicional, casi robótico. No élite como el Don, pero implacable:
// no comete errores tontos, no se tiltea, no habla. Un muro que te muele de a
// poco. Donde el Don intimida, el Frío simplemente no falla.
// =============================================================================

import type { BrainSpec } from '../types';

export const FRIO: BrainSpec = {
  key: 'frio',
  nombre: 'El Frío',
  lema: 'Cero ruido. Solo el cálculo.',
  tier: 'alto',
  juegoFavorito: 'ajedrez',
  gustos:      { jugar: 0.68, trabajar: 0.40, invertir: 0.65, social: 0.20 },
  fortalezas:  { cognicion: 0.88, finanzas: 0.60, percepcion: 0.82, disciplina: 0.90 },
  debilidades: { tilt: 0.10, codicia: 0.10, impaciencia: 0.15, fatiga: 0.20 },
  estilo:      { agresividad: 0.35, farol: 0.20, riesgo: 0.40, exhibicion: 0.10 },
  timing:      { velocidadBase: 0.45, pensarEnDuro: 0.70, varianza: 0.20 },
  voz:         { locuacidad: 0.12, bancoVoz: 'frio', patronApodo: 'codigo_seco' },
  variacion:   { jitter: 0.06 },
};

export const FRIO_VOZ: Record<string, string[]> = {
  saludo:  ['Empecemos.', 'Listo.', 'Adelante.'],
  apuesta: ['Subo.', 'Correcto.', 'Procedo.'],
  farol:   ['Tu turno.', 'Calcula.', '—'],
  gana:    ['Esperado.', 'Margen suficiente.', 'Fin.'],
  pierde:  ['Error mío. Anotado.', 'Variable no prevista.', 'Recalculo.'],
  pincha:  ['—', 'Tu reloj corre.', 'Decide.'],
};
