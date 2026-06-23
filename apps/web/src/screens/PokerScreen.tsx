import { Link } from 'react-router-dom';

// Mesa de Texas Hold'em — Fase 1: recreación visual del diseño de la mesa
// (8 asientos, fieltro, bote, cartas comunitarias, dealer). El motor de
// juego + bots llega en la Fase 2. Solo Aurelios, nunca dinero real.

type Seat = {
  n: string; i: string; ring: string;
  x: string; y: string; bx?: string; by?: string;
  stack: string; bet?: string; st: string; stCol: string;
  op: number; cards: boolean; dealer: boolean;
};

const SEATS: Seat[] = [
  { n: 'Dunia', i: 'D', ring: '#b9c2cc', x: '15%', y: '82%', bx: '27%', by: '66%', stack: '4.200', bet: '800', st: 'Igualó', stCol: '#7fb89a', op: 1, cards: true, dealer: false },
  { n: 'Severo', i: 'S', ring: '#9aa3ad', x: '4%', y: '50%', stack: '7.600', st: 'Se retiró', stCol: 'rgba(232,226,212,.35)', op: 0.4, cards: false, dealer: false },
  { n: 'Mira', i: 'M', ring: '#e8e2d0', x: '12%', y: '18%', bx: '24%', by: '31%', stack: '15.300', bet: '800', st: 'Subió', stCol: '#ecd9a5', op: 1, cards: true, dealer: false },
  { n: 'Tobías', i: 'T', ring: '#2fa06a', x: '35%', y: '8%', bx: '40%', by: '23%', stack: '9.100', bet: '800', st: 'Igualó', stCol: '#7fb89a', op: 1, cards: true, dealer: false },
  { n: 'Kenji', i: 'K', ring: '#c4514c', x: '65%', y: '8%', stack: '5.400', st: 'Se retiró', stCol: 'rgba(232,226,212,.35)', op: 0.4, cards: false, dealer: false },
  { n: 'Vael', i: 'V', ring: '#c8814a', x: '88%', y: '18%', bx: '76%', by: '31%', stack: '11.050', bet: '800', st: 'Igualó', stCol: '#7fb89a', op: 1, cards: true, dealer: true },
  { n: 'Lucía', i: 'L', ring: '#3f9d8a', x: '96%', y: '50%', bx: '84%', by: '50%', stack: '8.300', bet: '800', st: 'Igualó', stCol: '#7fb89a', op: 1, cards: true, dealer: false },
  { n: 'Bruno', i: 'B', ring: '#9aa3ad', x: '85%', y: '82%', stack: '6.700', st: 'Se retiró', stCol: 'rgba(232,226,212,.35)', op: 0.4, cards: false, dealer: false },
];

// Cartas comunitarias de muestra (flop+turn). En la Fase 2 las reparte el motor.
const BOARD = [
  { r: 'A', s: '♠', red: false },
  { r: 'K', s: '♥', red: true },
  { r: '7', s: '♦', red: true },
  { r: '10', s: '♣', red: false },
  null, // river por venir
];

export function PokerScreen() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Casino · Mesa</div>
          <h1 className="page-title" style={{ margin: '6px 0 0' }}>Texas Hold’em</h1>
        </div>
        <Link to="/casino" style={{ textDecoration: 'none', color: '#d8b96b', fontSize: 14, border: '1px solid rgba(201,163,91,.45)', padding: '9px 16px', borderRadius: 11 }}>
          ← Volver al Casino
        </Link>
      </div>

      {/* ===== Mesa ===== */}
      <div style={tableArea}>
        {/* Óvalo (fieltro + riel) */}
        <div style={feltOval}>
          <div style={feltInner}>
            <div style={{ fontFamily: 'Marcellus,serif', letterSpacing: '.4em', fontSize: 'clamp(20px,3vw,34px)', color: 'rgba(201,163,91,.22)', paddingLeft: '.4em' }}>
              DOMANI
            </div>
            {/* bote */}
            <div style={{ marginTop: 10, fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(232,226,212,.6)' }}>
              Bote <span style={{ color: '#ecd9a5', fontWeight: 700 }}>⟡ 12.800</span>
            </div>
            {/* cartas comunitarias */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {BOARD.map((c, i) => (c ? <CardFace key={i} r={c.r} s={c.s} red={c.red} /> : <CardSlot key={i} />))}
            </div>
          </div>
        </div>

        {/* Asientos */}
        {SEATS.map((s) => (
          <div key={s.n} style={{ position: 'absolute', left: s.x, top: s.y, transform: 'translate(-50%,-50%)', opacity: s.op, zIndex: 2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              {/* cartas del jugador (dorso) */}
              {s.cards && (
                <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
                  <CardBack /><CardBack />
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <div style={{ ...avatar, boxShadow: `0 0 0 2px ${s.ring}, 0 8px 18px -8px rgba(0,0,0,.8)` }}>{s.i}</div>
                {s.dealer && <span style={dealerBtn}>D</span>}
              </div>
              <div style={{ background: 'rgba(8,8,10,.78)', border: '1px solid rgba(201,163,91,.25)', borderRadius: 9, padding: '4px 10px', textAlign: 'center', minWidth: 88 }}>
                <div style={{ fontSize: 12, color: '#f3eddd', fontWeight: 600 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#ecd9a5' }}>⟡ {s.stack}</div>
                <div style={{ fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', color: s.stCol, marginTop: 1 }}>{s.st}</div>
              </div>
            </div>
            {/* apuesta del jugador (fichas) */}
            {s.bet && s.bx && (
              <div style={{ position: 'absolute', left: `calc(${s.bx} - ${s.x})`, top: `calc(${s.by} - ${s.y})`, transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap' }}>
                <span style={betChip}>⟡ {s.bet}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== Barra de acciones (demo) ===== */}
      <div style={actionBar}>
        <button style={actBtnGhost} disabled>Retirarse</button>
        <button style={actBtnGhost} disabled>Igualar ⟡ 800</button>
        <button style={actBtnGold} disabled>Subir</button>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(232,226,212,.55)', marginTop: 12 }}>
        Mesa de demostración — el juego en vivo con jugadores y bots llega muy pronto. 🃏
      </p>
      <p style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(232,226,212,.38)', marginTop: 4 }}>
        Se juega solo con Aurelios (fichas de fantasía). Nunca dinero real. Solo +18.
      </p>
    </div>
  );
}

function CardFace({ r, s, red }: { r: string; s: string; red: boolean }) {
  return (
    <div style={cardBase}>
      <span style={{ color: red ? '#b3322f' : '#1a1a1a', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{r}</span>
      <span style={{ color: red ? '#b3322f' : '#1a1a1a', fontSize: 16, lineHeight: 1 }}>{s}</span>
    </div>
  );
}
function CardSlot() {
  return <div style={{ ...cardBase, background: 'rgba(255,255,255,.05)', border: '1px dashed rgba(255,255,255,.18)', boxShadow: 'none' }} />;
}
function CardBack() {
  return (
    <div style={{ width: 22, height: 31, borderRadius: 4, background: 'linear-gradient(155deg,#7b1e2b,#3a0f17 70%,#240a10)', border: '1px solid rgba(201,163,91,.5)', display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: 'Marcellus,serif', fontSize: 12, color: '#ecd9a5' }}>D</span>
    </div>
  );
}

// ---- estilos ----
const tableArea: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 920,
  margin: '0 auto',
  aspectRatio: '16 / 10',
};
const feltOval: React.CSSProperties = {
  position: 'absolute',
  inset: '14% 6%',
  borderRadius: '50% / 50%',
  background: 'linear-gradient(180deg,#caa24f,#7a5e2a)',
  padding: 12,
  boxShadow: '0 30px 70px -28px rgba(0,0,0,.9), inset 0 2px 6px rgba(255,255,255,.25)',
};
const feltInner: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50% / 50%',
  background:
    'radial-gradient(78% 56% at 50% 38%, rgba(201,163,91,.14), transparent 64%), radial-gradient(120% 95% at 50% 45%, #1f6f4a, #0f3b28 68%, #0a2a1c)',
  boxShadow: 'inset 0 0 60px rgba(0,0,0,.55), inset 0 0 0 2px rgba(0,0,0,.3)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};
const avatar: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  fontFamily: 'Marcellus,serif',
  fontSize: 20,
  color: '#f3eddd',
  background: 'linear-gradient(160deg,#2a2536,#15131c)',
};
const dealerBtn: React.CSSProperties = {
  position: 'absolute',
  bottom: -4,
  right: -8,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'linear-gradient(135deg,#ecd28e,#a8843f)',
  color: '#2c2415',
  fontSize: 11,
  fontWeight: 800,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid rgba(255,255,255,.4)',
};
const betChip: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#ecd9a5',
  background: 'rgba(8,8,10,.7)',
  border: '1px solid rgba(201,163,91,.4)',
  borderRadius: 999,
  padding: '3px 9px',
};
const cardBase: React.CSSProperties = {
  width: 34,
  height: 48,
  borderRadius: 5,
  background: '#f4f1e8',
  boxShadow: '0 4px 10px -4px rgba(0,0,0,.6)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};
const actionBar: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
  marginTop: 20,
  flexWrap: 'wrap',
};
const actBtnGhost: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 11,
  border: '1px solid rgba(201,163,91,.4)',
  background: 'rgba(8,8,10,.4)',
  color: 'rgba(232,226,212,.7)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'not-allowed',
};
const actBtnGold: React.CSSProperties = {
  padding: '12px 28px',
  borderRadius: 11,
  border: 'none',
  background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)',
  color: '#2c2415',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'not-allowed',
  opacity: 0.7,
};
