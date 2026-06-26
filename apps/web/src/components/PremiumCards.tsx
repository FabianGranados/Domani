import { Carousel } from './Carousel';
import type { House } from '../lib/types';

// ============================================================
// Tarjetas premium (Tessera / Billetera / Ascenso) con el ARTE del
// usuario como fondo (oro / platino / obsidiana) + brillo animado (sheen)
// + la info encima. Presentacional: datos por props.
// ============================================================
const fmt = (n: number) => n.toLocaleString('es-CO');

const RANKS = [
  { key: 'ciudadano_nuevo', label: 'Ciudadano' },
  { key: 'ciudadano_activo', label: 'Activo' },
  { key: 'ciudadano_reconocido', label: 'Reconocido' },
  { key: 'ciudadano_patricio', label: 'Patricio' },
  { key: 'consigliere', label: 'Consigliere' },
  { key: 'don', label: 'Don' },
];

export interface PremiumCardsProps {
  alias: string;
  houses: House[];
  houseId: string | null;
  rank: string;
  influence: number;
  balance: number;
  onReclamar: () => void;
  rentaBusy: boolean;
  rentaDone: boolean;
  rentaMsg?: string | null;
}

export function PremiumCards({
  alias, houses, houseId, rank, influence, balance,
  onReclamar, rentaBusy, rentaDone, rentaMsg,
}: PremiumCardsProps) {
  const rankIdx = Math.max(0, RANKS.findIndex((r) => r.key === rank));
  const nextRank = RANKS[rankIdx + 1];
  const houseName = houses.find((h) => h.id === houseId)?.name.replace(/^Casa /, '') ?? 'Sin Casa';

  return (
    <Carousel>
      {/* ===== ORO · Tessera ===== */}
      <div style={card('/assets/card-tessera.webp', '#caa24f')}>
        <div style={sheen} />
        <div style={footGold}>
          <div style={aliasGold}>{alias}</div>
          <div style={rowGold}>
            <div>
              <div style={miniLabelDark}>Casa</div>
              <div style={miniValDark}>{houseName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={miniLabelDark}>Rango</div>
              <div style={miniValDark}>{RANKS[rankIdx].label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PLATINO · Billetera ===== */}
      <div style={card('/assets/card-billetera.webp', '#9aa1a8')}>
        <div style={sheen} />
        <div style={silverScrim} />
        <div style={contentSilver}>
          <div style={miniLabelDark}>Tu billetera</div>
          <div style={{ marginTop: 'auto' }}>
            <div style={balanceSilver}>⟡ {fmt(balance)}</div>
            <button onClick={onReclamar} disabled={rentaBusy || rentaDone} style={{ ...rentaBtn, opacity: rentaDone ? 0.7 : 1 }}>
              {rentaDone ? 'Renta reclamada ✓' : rentaBusy ? 'Reclamando…' : 'Reclamar Renta diaria'}
            </button>
            {rentaMsg && <div style={{ fontSize: 11, color: '#0f5c2e', marginTop: 4, fontWeight: 600 }}>{rentaMsg}</div>}
          </div>
        </div>
      </div>

      {/* ===== OBSIDIANA · Ascenso ===== */}
      <div style={card('/assets/card-ascenso.webp', '#1a1726')}>
        <div style={sheen} />
        <div style={contentObsidian}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={miniLabelGold}>Tu ascenso</div>
              <div style={rankObsidian}>{RANKS[rankIdx].label}</div>
            </div>
            <div style={{ fontSize: 10.5, color: '#d8b96b', textAlign: 'right' }}>Influencia<br /><b style={{ color: '#ece6d6', fontSize: 13 }}>{influence}</b></div>
          </div>
          <div style={nextObsidian}>{nextRank ? `Próximo: ${nextRank.label}` : 'Has llegado a la cima.'}</div>
        </div>
      </div>
    </Carousel>
  );
}

// ---- estilos ----
type CardBg = string;
function card(img: CardBg, fallback: string): React.CSSProperties {
  return {
    position: 'relative', overflow: 'hidden', flex: '0 0 auto',
    width: 'clamp(196px, 56vw, 224px)', scrollSnapAlign: 'start', aspectRatio: '1.62 / 1',
    borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: fallback,
    border: '1px solid rgba(255,255,255,.18)', boxShadow: '0 16px 38px -20px rgba(0,0,0,.85)',
  };
}
const sheen: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: '45%', height: '100%', zIndex: 1,
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)',
  transform: 'skewX(-16deg)', animation: 'domShimmer 6.5s ease-in-out infinite', pointerEvents: 'none',
};

// ORO
const footGold: React.CSSProperties = { position: 'relative', zIndex: 2 };
const aliasGold: React.CSSProperties = { fontFamily: 'Marcellus, serif', fontSize: 18, color: '#2c2412', textShadow: '0 1px 1px rgba(255,255,255,.3)' };
const rowGold: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 };
const miniLabelDark: React.CSSProperties = { fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,.55)' };
const miniValDark: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#23201a' };

// PLATINO
const silverScrim: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 1,
  background: 'linear-gradient(105deg, rgba(245,247,249,.55) 0%, rgba(245,247,249,0) 45%)',
};
const contentSilver: React.CSSProperties = { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' };
const balanceSilver: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 20, color: '#1f242a', textShadow: '0 1px 1px rgba(255,255,255,.4)' };
const rentaBtn: React.CSSProperties = {
  marginTop: 6, background: 'linear-gradient(135deg,#2c2412,#1a1509)', color: '#ecd9a5', border: '1px solid rgba(0,0,0,.25)',
  padding: '6px 11px', borderRadius: 9, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif",
};

// OBSIDIANA
const contentObsidian: React.CSSProperties = { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' };
const miniLabelGold: React.CSSProperties = { fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9c7a3e' };
const rankObsidian: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 21, color: '#ecd9a5', lineHeight: 1.1 };
const nextObsidian: React.CSSProperties = { fontSize: 10.5, color: 'rgba(232,226,212,.65)' };
