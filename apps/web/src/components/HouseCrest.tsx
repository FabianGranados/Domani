// HouseCrest — escudo heráldico de cada Casa (portado del diseño DOMANI).
// Props: initial, accent (color del campo), metal (borde), charge (símbolo),
// flag (bandera del jefe), rays, size.

import type { CSSProperties } from 'react';

export type Metal = 'gold' | 'copper' | 'silver' | 'ivory';
export type Charge =
  | 'initial'
  | 'torii'
  | 'christ'
  | 'skyline'
  | 'pyramid'
  | 'torch'
  | 'wolf'
  | 'obelisk'
  | 'poporo';
export type Flag = '' | 'usa' | 'colombia' | 'argentina' | 'brazil' | 'italy' | 'japan' | 'mexico';

const METALS: Record<Metal, [string, string, string]> = {
  gold: ['#f3d98f', '#c9a35b', '#8a6730'],
  copper: ['#e9ad78', '#bd7842', '#794723'],
  silver: ['#eef1f4', '#bcc3c9', '#7c838a'],
  ivory: ['#f6edd7', '#dccca2', '#9c8a63'],
};

function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  r = Math.round(r * f);
  g = Math.round(g * f);
  b = Math.round(b * f);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const CLIP = 'polygon(4% 0,96% 0,100% 14%,100% 50%,86% 78%,50% 100%,14% 78%,0 50%,0 14%)';

function FlagSvg({ flag }: { flag: Flag }) {
  const s: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  switch (flag) {
    case 'usa':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="100" height="35" fill="#b22234" />
          <rect y="5" width="100" height="5" fill="#f4f5f0" />
          <rect y="15" width="100" height="5" fill="#f4f5f0" />
          <rect y="25" width="100" height="5" fill="#f4f5f0" />
          <rect width="42" height="20" fill="#2a2f6e" />
        </svg>
      );
    case 'colombia':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="100" height="17.5" fill="#fcd116" />
          <rect y="17.5" width="100" height="8.75" fill="#0033a0" />
          <rect y="26.25" width="100" height="8.75" fill="#ce1126" />
        </svg>
      );
    case 'argentina':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="100" height="35" fill="#75aadb" />
          <rect y="11.67" width="100" height="11.66" fill="#f4f5f0" />
          <circle cx="50" cy="17.5" r="4" fill="#f6b40e" />
        </svg>
      );
    case 'brazil':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="100" height="35" fill="#009739" />
          <path d="M50,3 L92,17.5 L50,32 L8,17.5 Z" fill="#ffdf00" />
          <circle cx="50" cy="17.5" r="8" fill="#012169" />
        </svg>
      );
    case 'italy':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="33.4" height="35" fill="#008c45" />
          <rect x="33.4" width="33.3" height="35" fill="#f4f5f0" />
          <rect x="66.7" width="33.3" height="35" fill="#cd212a" />
        </svg>
      );
    case 'mexico':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="33.4" height="35" fill="#006847" />
          <rect x="33.4" width="33.3" height="35" fill="#f4f5f0" />
          <rect x="66.7" width="33.3" height="35" fill="#ce1126" />
          <ellipse cx="50" cy="18.5" rx="5.6" ry="4.4" fill="none" stroke="#3f6b2f" strokeWidth="1" />
        </svg>
      );
    case 'japan':
      return (
        <svg viewBox="0 0 100 35" preserveAspectRatio="none" style={s}>
          <rect width="100" height="35" fill="#f4f5f0" />
          <ellipse cx="50" cy="17.5" rx="11" ry="10.5" fill="#bc002d" />
        </svg>
      );
    default:
      return null;
  }
}

function ChargeSvg({ charge }: { charge: Charge }) {
  switch (charge) {
    case 'torii':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '60%', height: '60%' }} fill="currentColor">
          <path d="M8,29 Q50,16 92,29 L92,38 Q50,26 8,38 Z" />
          <rect x="24" y="43" width="52" height="7" />
          <rect x="46" y="33" width="8" height="11" />
          <rect x="30" y="30" width="8" height="56" />
          <rect x="62" y="30" width="8" height="56" />
        </svg>
      );
    case 'christ':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '66%', height: '66%' }} fill="currentColor">
          <path d="M16,84 L50,40 L84,84 Z" />
          <circle cx="50" cy="20" r="5" />
          <rect x="47.2" y="25" width="5.6" height="20" />
          <rect x="33" y="28" width="34" height="4.4" rx="1" />
        </svg>
      );
    case 'torch':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '50%', height: '74%' }} fill="currentColor">
          <path d="M50,8 C44,21 42,31 50,41 C58,31 56,21 50,8 Z" />
          <path d="M43,41 L57,41 L54,53 L46,53 Z" />
          <rect x="47" y="53" width="6" height="27" />
          <rect x="43.5" y="79" width="13" height="5" rx="1.5" />
        </svg>
      );
    case 'pyramid':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '76%', height: '76%' }} fill="currentColor">
          <path d="M10,80 L10,68 L23,68 L23,56 L36,56 L36,44 L44,44 L44,34 L56,34 L56,44 L64,44 L64,56 L77,56 L77,68 L90,68 L90,80 Z" />
          <rect x="44" y="25" width="12" height="9" />
        </svg>
      );
    case 'wolf':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '90%', height: '74%' }} fill="currentColor">
          <rect x="10" y="82" width="76" height="9" rx="3" />
          <path d="M6,45 L13,40 L14,32 L17.5,40 L21,31 L25,40 C31,36 36,35 42,35 L62,35 C70,35 78,38 80,47 L80,82 L74,82 L74,58 L68,59 L68,82 L62,82 L62,57 C50,60 40,60 33,58 L33,82 L27,82 L27,55 L21,55 L21,82 L15,82 L15,52 C10,50 7,48 6,45 Z" />
          <path d="M37,82 L37,73 C37,68.5 44,68.5 44,73 L44,82 Z" />
          <circle cx="40.5" cy="69" r="3.4" />
          <path d="M47,82 L47,74 C47,69.5 54,69.5 54,74 L54,82 Z" />
          <circle cx="50.5" cy="70" r="3.4" />
        </svg>
      );
    case 'obelisk':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '52%', height: '80%' }} fill="currentColor">
          <path d="M50,8 L54,17 L56.5,76 L43.5,76 L46,17 Z" />
          <rect x="40" y="76" width="20" height="6" />
          <rect x="36" y="82" width="28" height="5" />
        </svg>
      );
    case 'poporo':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '52%', height: '84%' }} fill="currentColor">
          <ellipse cx="50" cy="64" rx="20" ry="22" />
          <path d="M43,47 C41,41 39,35 36,31 L44,29 L56,29 L64,31 C61,35 59,41 57,47 Z" />
          <circle cx="50" cy="23" r="4.2" />
          <circle cx="42" cy="26" r="3.6" />
          <circle cx="58" cy="26" r="3.6" />
        </svg>
      );
    case 'skyline':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '72%', height: '72%' }} fill="currentColor">
          <rect x="13" y="55" width="12" height="31" />
          <rect x="27" y="46" width="11" height="40" />
          <rect x="42" y="32" width="15" height="54" />
          <path d="M42,32 L49.5,19 L57,32 Z" />
          <rect x="60" y="43" width="11" height="43" />
          <rect x="74" y="51" width="13" height="35" />
        </svg>
      );
    default:
      return null;
  }
}

export interface HouseCrestProps {
  initial?: string;
  accent?: string;
  metal?: Metal;
  charge?: Charge;
  flag?: Flag;
  rays?: boolean;
  size?: number;
}

export function HouseCrest({
  initial = 'D',
  accent = '#1f9a64',
  metal = 'gold',
  charge = 'initial',
  flag = '',
  rays = false,
  size = 96,
}: HouseCrestProps) {
  const m = METALS[metal] ?? METALS.gold;
  const metalGrad = `linear-gradient(150deg, ${m[0]}, ${m[1]} 55%, ${m[2]})`;
  const fieldGrad = `radial-gradient(120% 95% at 32% 60%, rgba(255,255,255,.16), rgba(255,255,255,0) 55%), linear-gradient(160deg, ${accent} 0%, ${darken(accent, 0.38)} 100%)`;
  const inset = Math.max(2, Math.round(size * 0.045));
  const iSize = Math.round(size * 0.36);
  const dividerH = Math.max(2, Math.round(size * 0.028));

  return (
    <div style={{ position: 'relative', width: size, height: size * 1.18, filter: 'drop-shadow(0 7px 12px rgba(0,0,0,.55))' }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: CLIP, background: metalGrad }} />
      <div
        style={{
          position: 'absolute',
          inset,
          clipPath: CLIP,
          background: fieldGrad,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.26), inset 0 -10px 18px rgba(0,0,0,.42), inset 0 7px 13px rgba(255,255,255,.06)',
          overflow: 'hidden',
        }}
      >
        {/* chief (banda superior con bandera) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%', overflow: 'hidden' }}>
          <FlagSvg flag={flag} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg, rgba(255,255,255,.34), rgba(255,255,255,.08) 40%, rgba(255,255,255,0) 62%)', pointerEvents: 'none' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: 0,
            right: 0,
            height: dividerH,
            transform: 'translateY(-50%)',
            background: metalGrad,
            boxShadow: '0 1px 2px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.5)',
            zIndex: 2,
          }}
        />
        {rays && (
          <div
            style={{
              position: 'absolute',
              top: '38%',
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'repeating-conic-gradient(from 0deg at 50% 58%, rgba(246,237,215,.30) 0deg 5deg, rgba(246,237,215,0) 5deg 12deg)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* charge (símbolo o inicial) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '42%',
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: m[0],
            filter: `drop-shadow(0 1px 1px ${m[2]}) drop-shadow(0 0 5px rgba(0,0,0,.22))`,
          }}
        >
          {charge === 'initial' ? (
            <span style={{ fontFamily: 'Marcellus,serif', lineHeight: 1, fontSize: iSize, color: m[0], textShadow: `0 1px 1px ${m[2]}, 0 -1px 0 rgba(255,255,255,.3)` }}>
              {initial}
            </span>
          ) : (
            <ChargeSvg charge={charge} />
          )}
        </div>
      </div>
    </div>
  );
}

// Mapa de cada Casa (por code) a su configuración de escudo.
export const HOUSE_CRESTS: Record<string, HouseCrestProps> = {
  bacata: { initial: 'B', accent: '#c89b3a', metal: 'gold', charge: 'poporo', flag: 'colombia' },
  empire: { initial: 'E', accent: '#6c7a88', metal: 'silver', charge: 'torch', flag: 'usa' },
  plata: { initial: 'P', accent: '#74acdf', metal: 'silver', charge: 'obelisk', flag: 'argentina' },
  morro: { initial: 'M', accent: '#1d7a52', metal: 'gold', charge: 'christ', flag: 'brazil' },
  roma: { initial: 'R', accent: '#a01f33', metal: 'gold', charge: 'wolf', flag: 'italy' },
  osaka: { initial: 'O', accent: '#b23a36', metal: 'ivory', charge: 'torii', flag: 'japan', rays: true },
  aztlan: { initial: 'A', accent: '#1c8a9a', metal: 'gold', charge: 'pyramid', flag: 'mexico' },
};
