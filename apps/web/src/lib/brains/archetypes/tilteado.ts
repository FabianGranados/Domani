// =============================================================================
// PIONERO #5 — El Tilteado
// -----------------------------------------------------------------------------
// Juega decente… hasta que pierde una grande. Ahí se le va la cabeza: sube el
// tilt, persigue, se vuelve descuidado. Su tilt altísimo es el motor: lo verás
// pasar de sólido a kamikaze en cuestión de manos. Echa la culpa a la suerte.
// =============================================================================

import type { BrainSpec } from '../types';

export const TILTEADO: BrainSpec = {
  key: 'tilteado',
  nombre: 'El Tilteado',
  lema: 'Es que no me entra NADA, ¿viste eso?',
  tier: 'medio',
  juegoFavorito: 'poker',
  gustos:      { jugar: 0.82, trabajar: 0.25, invertir: 0.35, social: 0.58 },
  fortalezas:  { cognicion: 0.62, finanzas: 0.45, percepcion: 0.55, disciplina: 0.50 },
  debilidades: { tilt: 0.92, codicia: 0.60, impaciencia: 0.50, fatiga: 0.35 },
  estilo:      { agresividad: 0.62, farol: 0.45, riesgo: 0.60, exhibicion: 0.40 },
  timing:      { velocidadBase: 0.60, pensarEnDuro: 0.40, varianza: 0.50 },
  voz:         { locuacidad: 0.65, bancoVoz: 'tilteado', patronApodo: 'apodo_amargo' },
  variacion:   { jitter: 0.08 },
};

export const TILTEADO_VOZ: Record<string, string[]> = {
  saludo:  ['Hoy sí recupero lo de ayer.', 'Vengo concentrado, en serio.', 'Que no se repita lo de la otra vez.'],
  apuesta: ['Subo, y esta vez va en serio.', 'Ya me cansé de esperar.', 'A ver si ahora sí.'],
  farol:   ['¿Me vas a pagar? Págame pues.', 'Dale, atrévete.', 'No tengo nada que perder.'],
  gana:    ['¡POR FIN! Ya era hora.', 'Vieron, les dije.', 'Recuperando lo mío.'],
  pierde:  ['¡¿OTRA VEZ?! No puede ser.', 'Es que la suerte está en mi contra.', '¡Eso fue imposible, viste el río!'],
  pincha:  ['No me distraigas.', 'Sé lo que hago, ¿sí?', 'Cállate y juega.'],
};
