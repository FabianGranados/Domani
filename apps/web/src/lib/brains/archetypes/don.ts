// =============================================================================
// PIONERO #2 — El Don (El Maestro)
// -----------------------------------------------------------------------------
// La élite. Solo aparece arriba. Cálculo casi perfecto, calma letal, pocas
// palabras. No farolea por necesidad: no le hace falta. Su silencio intimida.
// Opuesto del Tiburón: donde el Tiburón aprieta y habla, el Don espera y mata.
// =============================================================================

import type { BrainSpec } from '../types';

export const DON: BrainSpec = {
  key: 'don',
  nombre: 'El Don',
  lema: 'No alzo la voz. No me hace falta.',
  tier: 'alto',
  juegoFavorito: 'ajedrez',
  gustos:      { jugar: 0.70, trabajar: 0.30, invertir: 0.60, social: 0.25 },
  fortalezas:  { cognicion: 0.97, finanzas: 0.65, percepcion: 0.80, disciplina: 0.92 },
  debilidades: { tilt: 0.08, codicia: 0.12, impaciencia: 0.10, fatiga: 0.20 },
  estilo:      { agresividad: 0.55, farol: 0.30, riesgo: 0.45, exhibicion: 0.20 },
  timing:      { velocidadBase: 0.35, pensarEnDuro: 0.90, varianza: 0.25 },
  voz:         { locuacidad: 0.15, bancoVoz: 'don', patronApodo: 'titulo_sobrio' },
  variacion:   { jitter: 0.06 },
};

export const DON_VOZ: Record<string, string[]> = {
  saludo:  ['Siéntese.', 'Veamos qué trae.', '…'],
  apuesta: ['Subo.', 'Está hecho.', 'Continúe.'],
  farol:   ['Decida usted.', 'No tengo prisa.', '…'],
  gana:    ['Como debía ser.', 'Suficiente.', 'Buen intento.'],
  pierde:  ['Bien jugado.', 'Lo tendré en cuenta.', 'Hmm.'],
  pincha:  ['Tómese su tiempo.', 'Lo espero.', 'Piense con calma.'],
};
