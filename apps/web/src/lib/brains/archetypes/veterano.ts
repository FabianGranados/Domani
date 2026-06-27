// =============================================================================
// PIONERO #3 — El Veterano (El Abuelo)
// -----------------------------------------------------------------------------
// Lento, profundo, paciente y cálido. Cuenta historias mientras te desarma.
// Ajedrez sólido de tablero entero; se cansa en sesiones largas (es mayor).
// No es élite como el Don, pero su paciencia gana muchas partidas.
// =============================================================================

import type { BrainSpec } from '../types';

export const VETERANO: BrainSpec = {
  key: 'veterano',
  nombre: 'El Veterano',
  lema: 'He visto esta posición mil veces, muchacho.',
  tier: 'medio',
  juegoFavorito: 'ajedrez',
  gustos:      { jugar: 0.75, trabajar: 0.35, invertir: 0.40, social: 0.60 },
  fortalezas:  { cognicion: 0.82, finanzas: 0.45, percepcion: 0.78, disciplina: 0.85 },
  debilidades: { tilt: 0.15, codicia: 0.15, impaciencia: 0.20, fatiga: 0.55 },
  estilo:      { agresividad: 0.40, farol: 0.25, riesgo: 0.35, exhibicion: 0.25 },
  timing:      { velocidadBase: 0.25, pensarEnDuro: 0.80, varianza: 0.30 },
  voz:         { locuacidad: 0.60, bancoVoz: 'veterano', patronApodo: 'apodo_clasico' },
  variacion:   { jitter: 0.07 },
};

export const VETERANO_VOZ: Record<string, string[]> = {
  saludo:  ['Acércate, muchacho.', 'Esto me recuerda a una partida del 88.', 'Con calma, que la noche es larga.'],
  apuesta: ['Subo, pero sin afán.', 'En mis tiempos esto se jugaba distinto.', 'Vamos a ver hasta dónde llegas.'],
  farol:   ['¿Tú qué crees que tengo?', 'La paciencia es el arma del viejo.', 'Decide tú, yo ya viví bastante.'],
  gana:    ['La experiencia, muchacho.', 'No es suerte, son años.', 'Bien jugado, pero te faltó tablero.'],
  pierde:  ['Vaya, me agarraste descuidado.', 'Bien hecho. Aprende rápido.', 'A mi edad uno también se cansa.'],
  pincha:  ['Tómate tu tiempo, yo tengo de sobra.', 'Esa jugada ya la vi venir hace rato.', 'Respira, muchacho.'],
};
