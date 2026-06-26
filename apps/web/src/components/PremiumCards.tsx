import { Carousel } from './Carousel';
import type { House } from '../lib/types';

// ============================================================
// Tarjetas premium (Tessera / Billetera / Ascenso) con el ARTE metálico del
// usuario como tarjeta flotante (marco propio + esquinas transparentes) y la
// info encima. Presentacional: datos por props.
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
  const cityName = houses.find((h) => h.id === houseId)?.name.replace(/^Casa /, '') ?? 'Sin ciudad';

  return (
    <Carousel>
      {/* ===== ORO · Tessera ===== */}
      <div style={cardBox(CARD_ASPECT)}>
        <img src="/assets/card-tessera.webp" alt="" style={art} />
        <div style={{ ...overlay, justifyContent: 'flex-end' }}>
          <div style={aliasGold}>{alias}</div>
          <div style={rowGold}>
            <div>
              <div style={miniLabelDark}>Ciudad</div>
              <div style={miniValDark}>{cityName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={miniLabelDark}>Rango</div>
              <div style={miniValDark}>{RANKS[rankIdx].label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PLATINO · Billetera ===== */}
      <div style={cardBox(CARD_ASPECT)}>
        <img src="/assets/card-billetera.webp" alt="" style={art} />
        <div style={overlay}>
          <div style={miniLabelDark}>Tu billetera</div>
          <div style={{ marginTop: 'auto' }}>
            <div style={balanceSilver}>⟡ {fmt(balance)}</div>
            <button onClick={onReclamar} disabled={rentaBusy || rentaDone} style={{ ...rentaBtn, opacity: rentaDone ? 0.7 : 1 }}>
              {rentaDone ? 'Renta reclamada ✓' : rentaBusy ? 'Reclamando…' : 'Reclamar Renta diaria'}
            </button>
            {rentaMsg && <div style={{ fontSize: 11, color: '#0f5c2e', marginTop: 4, fontWeight: 700, textShadow: '0 1px 1px rgba(255,255,255,.4)' }}>{rentaMsg}</div>}
          </div>
        </div>
      </div>

      {/* ===== OBSIDIANA · Ascenso ===== */}
      {/* El arte morado se reprocesó con padding transparente arriba/abajo para
          igualar el aspecto común (~1.585). El padding extra vertical del overlay
          mantiene el texto sobre el arte visible de la tarjeta. */}
      <div style={cardBox(CARD_ASPECT)}>
        <img src="/assets/card-ascenso.webp" alt="" style={art} />
        <div style={{ ...overlay, justifyContent: 'flex-start', padding: '21px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={miniLabelGold}>Tu ascenso</div>
              <div style={rankObsidian}>{RANKS[rankIdx].label}</div>
            </div>
            <div style={{ fontSize: 10.5, color: '#d8b96b', textAlign: 'right', textShadow: '0 1px 4px rgba(0,0,0,.7)' }}>Influencia<br /><b style={{ color: '#f3eddd', fontSize: 13 }}>{influence}</b></div>
          </div>
          <div style={{ ...nextObsidian, marginTop: 6 }}>{nextRank ? `Próximo: ${nextRank.label}` : 'Has llegado a la cima.'}</div>
        </div>
      </div>
    </Carousel>
  );
}

// ---- estilos ----
// Las 3 tarjetas usan el MISMO aspecto para verse simétricas (mismo ancho y alto).
// El arte morado (card-ascenso) se reprocesó con padding transparente vertical
// para igualar este aspecto sin recortar su marco; oro y plata ya estaban cerca.
const CARD_ASPECT = 1.585;
// La tarjeta es el arte (con su marco). Aspect común para fila uniforme.
function cardBox(aspect: number): React.CSSProperties {
  return {
    position: 'relative', flex: '0 0 auto',
    width: 'clamp(196px, 56vw, 224px)', aspectRatio: `${aspect} / 1`,
    scrollSnapAlign: 'start', filter: 'drop-shadow(0 14px 26px rgba(0,0,0,.7))',
  };
}
const art: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 0 };
const overlay: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', padding: '13px 15px' };

// ORO
const aliasGold: React.CSSProperties = { fontFamily: 'Marcellus, serif', fontSize: 18, color: '#2c2412', textShadow: '0 1px 1px rgba(255,255,255,.35)' };
const rowGold: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 };
const miniLabelDark: React.CSSProperties = { fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,.55)' };
const miniValDark: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#23201a' };

// PLATINO
const balanceSilver: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 20, color: '#1f242a', textShadow: '0 1px 1px rgba(255,255,255,.45)' };
const rentaBtn: React.CSSProperties = {
  marginTop: 6, background: 'linear-gradient(135deg,#2c2412,#1a1509)', color: '#ecd9a5', border: '1px solid rgba(0,0,0,.25)',
  padding: '6px 11px', borderRadius: 9, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif",
};

// OBSIDIANA
const miniLabelGold: React.CSSProperties = { fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: '#caa24f', textShadow: '0 1px 4px rgba(0,0,0,.6)' };
const rankObsidian: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 21, color: '#f3eddd', lineHeight: 1.1, textShadow: '0 1px 6px rgba(0,0,0,.7)' };
const nextObsidian: React.CSSProperties = { fontSize: 10.5, color: 'rgba(243,237,221,.7)', textShadow: '0 1px 4px rgba(0,0,0,.7)' };
