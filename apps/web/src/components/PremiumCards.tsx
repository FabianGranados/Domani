import { Carousel } from './Carousel';
import type { House } from '../lib/types';

// ============================================================
// Tarjetas premium (estilo tarjeta de crédito): Tessera (oro),
// Billetera+Renta (plata) y Ascenso (obsidiana). Presentacional:
// recibe los datos y los handlers por props para reusarse en el
// Escritorio y en el Salón sin duplicar markup.
// ============================================================
const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
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
  rentaDone: boolean;      // ya reclamó hoy
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
      {/* GOLD — Tessera */}
      <div style={premiumCard('gold')}>
        <div style={sheen} />
        <div style={cardTop}>
          <span style={cardLabel('gold')}>DOMANI · Tessera</span>
          <img src="/assets/emblema-aurelio.webp" alt="" style={chipImg} />
        </div>
        <div style={cardMain('gold')}>{alias}</div>
        <div style={cardBottom}>
          <div>
            <div style={miniLabel('gold')}>Casa</div>
            <div style={miniVal('gold')}>{houseName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={miniLabel('gold')}>Rango</div>
            <div style={miniVal('gold')}>{RANKS[rankIdx].label}</div>
          </div>
        </div>
      </div>

      {/* SILVER — Billetera + Renta */}
      <div style={premiumCard('silver')}>
        <div style={sheen} />
        <div style={cardTop}>
          <span style={cardLabel('silver')}>Tu billetera</span>
          <img src="/assets/aurelio-coin.webp" alt="" style={coinChip} />
        </div>
        <div style={cardMain('silver')}>⟡ {fmt(balance)}</div>
        <div>
          <button onClick={onReclamar} disabled={rentaBusy || rentaDone} style={{ ...cardBtn, opacity: rentaDone ? 0.7 : 1 }}>
            {rentaDone ? 'Renta reclamada hoy ✓' : rentaBusy ? 'Reclamando…' : 'Reclamar Renta diaria'}
          </button>
          {rentaMsg && <div style={{ fontSize: 12, color: '#1d6b3f', marginTop: 6 }}>{rentaMsg}</div>}
        </div>
      </div>

      {/* OBSIDIAN — Ascenso */}
      <div style={premiumCard('obsidian')}>
        <div style={sheen} />
        <div style={cardTop}>
          <span style={cardLabel('obsidian')}>Tu ascenso</span>
          <span style={{ fontSize: 9.5, color: '#9c7a3e' }}>Infl · {influence}</span>
        </div>
        <div style={cardMain('obsidian')}>{RANKS[rankIdx].label}</div>
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            {RANKS.map((r, i) => (
              <span key={r.key} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= rankIdx ? GOLD_GRAD : 'rgba(255,255,255,.14)' }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(232,226,212,.6)' }}>
            {nextRank ? `Próximo: ${nextRank.label}` : 'Has llegado a la cima.'}
          </div>
        </div>
      </div>
    </Carousel>
  );
}

// ---- estilos (tarjeta de crédito) ----
type Metal = 'gold' | 'silver' | 'obsidian';
const METAL_BG: Record<Metal, string> = {
  gold: 'linear-gradient(135deg,#f7e7ad 0%,#dcb761 28%,#a8843f 52%,#f0d489 72%,#8a6730 100%)',
  silver: 'linear-gradient(135deg,#f4f6f8 0%,#cdd4da 28%,#9aa2a9 52%,#e9edf0 72%,#7c838a 100%)',
  obsidian: 'linear-gradient(135deg,#2a2536 0%,#1a1726 50%,#100e18 100%)',
};
const METAL_INK: Record<Metal, string> = { gold: '#2c2412', silver: '#23282e', obsidian: '#ece6d6' };

function premiumCard(metal: Metal): React.CSSProperties {
  return {
    position: 'relative', overflow: 'hidden', flex: '0 0 auto',
    width: 'clamp(196px, 56vw, 224px)', scrollSnapAlign: 'start', aspectRatio: '1.62 / 1',
    borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    color: METAL_INK[metal], background: METAL_BG[metal],
    border: metal === 'obsidian' ? '1px solid rgba(201,163,91,.4)' : '1px solid rgba(255,255,255,.4)',
    boxShadow: '0 16px 38px -20px rgba(0,0,0,.85)',
  };
}
const sheen: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)',
  transform: 'skewX(-16deg)', animation: 'domShimmer 6.5s ease-in-out infinite', pointerEvents: 'none',
};
const cardTop: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 };
const cardBottom: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 1 };
function cardLabel(metal: Metal): React.CSSProperties {
  return { fontSize: 8.5, letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 700, color: metal === 'obsidian' ? '#9c7a3e' : 'rgba(0,0,0,.55)' };
}
function cardMain(metal: Metal): React.CSSProperties {
  return { fontFamily: metal === 'obsidian' ? "'Cormorant Garamond',serif" : 'Marcellus, serif', fontSize: metal === 'obsidian' ? 21 : 18, position: 'relative', zIndex: 1, color: metal === 'obsidian' ? '#ecd9a5' : METAL_INK[metal] };
}
function miniLabel(metal: Metal): React.CSSProperties {
  return { fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: metal === 'obsidian' ? '#9c7a3e' : 'rgba(0,0,0,.5)' };
}
function miniVal(metal: Metal): React.CSSProperties {
  return { fontSize: 12, fontWeight: 600, color: metal === 'obsidian' ? '#ece6d6' : METAL_INK[metal] };
}
const chipImg: React.CSSProperties = { width: 27, height: 27, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' };
const coinChip: React.CSSProperties = { width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,.35)' };
const cardBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg,#2c2412,#1a1509)', color: '#ecd9a5', border: '1px solid rgba(0,0,0,.25)',
  padding: '6px 11px', borderRadius: 9, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif",
};
