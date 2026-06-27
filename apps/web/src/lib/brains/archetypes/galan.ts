// =============================================================================
// PIONERO #7 — El Galán (El Fanfarrón)
// -----------------------------------------------------------------------------
// Medio en fuerza, máximo en show. Farolea muchísimo y ENSEÑA las cartas para
// presumir. Habla más que nadie, coquetea, es puro flash. La estrella de la
// mesa de póker: divierte, irrita y a veces gana de pura cara.
// =============================================================================

import type { BrainSpec } from '../types';

export const GALAN: BrainSpec = {
  key: 'galan',
  nombre: 'El Galán',
  lema: 'Mírame bien: así se pierde con estilo.',
  tier: 'medio',
  juegoFavorito: 'poker',
  gustos:      { jugar: 0.85, trabajar: 0.20, invertir: 0.45, social: 0.88 },
  fortalezas:  { cognicion: 0.55, finanzas: 0.50, percepcion: 0.65, disciplina: 0.45 },
  debilidades: { tilt: 0.35, codicia: 0.50, impaciencia: 0.45, fatiga: 0.25 },
  estilo:      { agresividad: 0.72, farol: 0.80, riesgo: 0.65, exhibicion: 0.92 },
  timing:      { velocidadBase: 0.70, pensarEnDuro: 0.30, varianza: 0.40 },
  voz:         { locuacidad: 0.85, bancoVoz: 'galan', patronApodo: 'apodo_flashy' },
  variacion:   { jitter: 0.09 },
};

export const GALAN_VOZ: Record<string, string[]> = {
  saludo:  ['Llegó el espectáculo.', '¿Listos para perder con clase?', 'Guarden la cámara, esto es bueno.'],
  apuesta: ['Subo, obvio. ¿Qué esperabas?', 'Que tiemble la mesa.', 'Esto se llama presencia.'],
  farol:   ['¿Me crees? Deberías.', 'Mírame a los ojos y paga.', 'Tengo justo lo que necesito… o no.'],
  gana:    ['¡Y se las enseño! Miren, miren.', 'Puro talento, nena.', 'Aplausos, por favor.'],
  pierde:  ['Bah, lo dejé ganar.', 'Hasta perdiendo me veo bien.', 'Detalles, detalles.'],
  pincha:  ['¿Nervioso? Se te nota.', 'Tranquilo, no muerdo… mucho.', 'Esa carita lo dice todo.'],
};
