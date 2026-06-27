// =============================================================================
// PIONERO #10 — El Errático (El Loco)
// -----------------------------------------------------------------------------
// Impredecible por diseño: su VARIANZA de tiempo y de juego está al tope. A
// veces brillante, a veces absurdo; nunca sabes qué viene. Imposible de leer
// porque ni él se lee. El comodín del ecosistema: rompe los patrones.
// =============================================================================

import type { BrainSpec } from '../types';

export const ERRATICO: BrainSpec = {
  key: 'erratico',
  nombre: 'El Errático',
  lema: 'Ni yo sé qué voy a hacer.',
  tier: 'medio',
  juegoFavorito: 'poker',
  gustos:      { jugar: 0.78, trabajar: 0.25, invertir: 0.40, social: 0.55 },
  fortalezas:  { cognicion: 0.50, finanzas: 0.40, percepcion: 0.45, disciplina: 0.30 },
  debilidades: { tilt: 0.50, codicia: 0.55, impaciencia: 0.85, fatiga: 0.35 },
  estilo:      { agresividad: 0.58, farol: 0.55, riesgo: 0.70, exhibicion: 0.50 },
  timing:      { velocidadBase: 0.55, pensarEnDuro: 0.35, varianza: 0.90 },
  voz:         { locuacidad: 0.60, bancoVoz: 'erratico', patronApodo: 'apodo_raro' },
  variacion:   { jitter: 0.10 },
};

export const ERRATICO_VOZ: Record<string, string[]> = {
  saludo:  ['¿Hoy es martes? Da igual.', 'Hueles a lluvia. Subo.', 'El pez nada de noche.'],
  apuesta: ['Subo porque sí.', 'Mi intuición dice… esto.', '¿Por qué no?'],
  farol:   ['O tengo todo, o nada. Decide.', 'Las nubes me dijeron que pagues.', 'Sorpresa.'],
  gana:    ['¿Ves? Tenía sentido.', 'No preguntes cómo.', 'El caos me ama.'],
  pierde:  ['Lo presentí. O no.', 'Tenía que pasar. O no.', 'Bah, así es la danza.'],
  pincha:  ['¿En qué pensabas? Yo en peces.', 'El tiempo es una espiral.', 'Juega o no, lo mismo da.'],
};
