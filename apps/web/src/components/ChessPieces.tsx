// =============================================================================
// Piezas de ajedrez en SVG (no Unicode). Los símbolos Unicode de ajedrez se
// renderizan como EMOJI en iOS Safari e ignoran el color CSS (las blancas salían
// negras). Con SVG el color es 100% determinista en cualquier dispositivo.
// Formas estilizadas pero claras; blancas = relleno claro, negras = oscuro.
// =============================================================================

import type { ReactNode } from 'react';

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const SHAPES: Record<PieceType, ReactNode> = {
  p: (
    <>
      <circle cx="22.5" cy="11" r="5.2" />
      <path d="M22.5 15.5 c-3.8 0 -5 3.6 -2.8 6.6 c-3.4 2.2 -5.7 6.4 -6.7 11.9 h19 c-1 -5.5 -3.3 -9.7 -6.7 -11.9 c2.2 -3 1 -6.6 -2.8 -6.6 z" />
      <rect x="12" y="34" width="21" height="5" rx="2.2" />
    </>
  ),
  r: (
    <>
      <path d="M13.5 14 h3.2 v2.8 h3.8 v-2.8 h4 v2.8 h3.8 v-2.8 h3.2 v6 l-2.8 2.6 v8.8 l2.8 2.6 v3.2 h-18 v-3.2 l2.8 -2.6 v-8.8 l-2.8 -2.6 z" />
    </>
  ),
  b: (
    <>
      <circle cx="22.5" cy="8.5" r="2.6" />
      <path d="M22.5 11 c-6.2 3.2 -7 12.4 0 17.4 c7 -5 6.2 -14.2 0 -17.4 z" />
      <path d="M13.5 33 h18 l-2.2 3.4 h-13.6 z" />
      <rect x="12" y="35.5" width="21" height="4" rx="2" />
    </>
  ),
  n: (
    <>
      <path d="M14 38 h18 c0.4 -8.5 -1.2 -13.6 -5.6 -17.4 c-0.6 -3 0.4 -5.2 -2.2 -7.4 c-1.2 1.4 -2.4 2.2 -3.4 4 c-2.4 1 -5 2.6 -6.8 5.6 c-1.8 3 -2.4 6 -1.4 8 l4.4 -3 c0.2 2.2 -2 4 -4.2 5 c-0.2 3 2.2 3.2 5.2 3.2 z" />
      <rect x="12" y="38" width="21" height="2.8" rx="1.4" />
    </>
  ),
  q: (
    <>
      <path d="M10 19 l3.2 14 h18.6 l3.2 -14 l-5.4 5.4 l-3.3 -9 l-3.3 9 l-3.3 -9 l-3.3 9 z" />
      <circle cx="10" cy="18" r="2.1" />
      <circle cx="22.5" cy="14.5" r="2.1" />
      <circle cx="35" cy="18" r="2.1" />
      <rect x="12" y="33" width="21" height="4.4" rx="1.8" />
      <rect x="10.5" y="37" width="24" height="2.8" rx="1.4" />
    </>
  ),
  k: (
    <>
      <rect x="21" y="6" width="3" height="9" rx="0.5" />
      <rect x="18.5" y="8.5" width="8" height="3" rx="0.5" />
      <path d="M11 21 l4 12 h15 l4 -12 l-6.2 4.4 l-4.3 -6.4 l-4.3 6.4 z" />
      <rect x="12" y="33" width="21" height="4.4" rx="1.8" />
      <rect x="10.5" y="37" width="24" height="2.8" rx="1.4" />
    </>
  ),
};

export function ChessPiece({ type, white, size = '82%' }: { type: string; white: boolean; size?: number | string }) {
  const shape = SHAPES[type as PieceType];
  if (!shape) return null;
  return (
    <svg viewBox="0 0 45 45" width={size} height={size} style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.45))' }} aria-hidden="true">
      <g fill={white ? '#f6efda' : '#171310'} stroke={white ? '#2a2118' : '#000'} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round">
        {shape}
      </g>
    </svg>
  );
}
