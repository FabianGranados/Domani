// =============================================================================
// PIONERO #9 — La Roca (La Tacaña)
// -----------------------------------------------------------------------------
// Ultra-conservadora. Se retira muchísimo, solo juega lo seguro, cuida cada
// ficha como si fuera la última. Aburrida de enfrentar, pero rentable y difícil
// de leer: cuando ELLA apuesta, todos huyen. El nit clásico.
// =============================================================================

import type { BrainSpec } from '../types';

export const ROCA: BrainSpec = {
  key: 'roca',
  nombre: 'La Roca',
  lema: 'Si apuesto, ya perdiste.',
  tier: 'medio',
  juegoFavorito: 'poker',
  gustos:      { jugar: 0.65, trabajar: 0.45, invertir: 0.55, social: 0.30 },
  fortalezas:  { cognicion: 0.60, finanzas: 0.58, percepcion: 0.60, disciplina: 0.95 },
  debilidades: { tilt: 0.12, codicia: 0.08, impaciencia: 0.18, fatiga: 0.25 },
  estilo:      { agresividad: 0.25, farol: 0.08, riesgo: 0.25, exhibicion: 0.12 },
  timing:      { velocidadBase: 0.55, pensarEnDuro: 0.50, varianza: 0.25 },
  voz:         { locuacidad: 0.25, bancoVoz: 'roca', patronApodo: 'apodo_seco' },
  variacion:   { jitter: 0.07 },
};

export const ROCA_VOZ: Record<string, string[]> = {
  saludo:  ['Buenas.', 'A lo seguro.', 'Sin prisas.'],
  apuesta: ['Subo. Y sabes lo que significa.', 'Esto no es farol.', 'Paga si te atreves.'],
  farol:   ['Yo no faroleo.', 'Piénsalo bien.', 'Tú sabrás.'],
  gana:    ['Como esperaba.', 'Paciencia paga.', 'Lo seguro, siempre.'],
  pierde:  ['Rara vez pasa.', 'Bien, te lo concedo.', 'No volverá a ocurrir.'],
  pincha:  ['Tómate tu tiempo.', 'Yo no me apuro.', 'Decide tú.'],
};
