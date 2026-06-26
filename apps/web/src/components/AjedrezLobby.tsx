import { useEffect, useState } from 'react';

function useIsMobile(): boolean {
  const q = '(max-width: 820px)';
  const [v, setV] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(q);
    const on = () => setV(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return v;
}

// ============================================================
// Lobby del Salón de Ajedrez — estilo "panel de gestión" (GTA / GALAXY):
// foto de fondo + tarjetas de vidrio (glass). Izquierda: avatar del jugador
// y su ficha (ELO, título, racha) + menú de formas de jugar. Arriba: los
// niveles/maestros a vencer (escalafón). Centro: formas de jugar. Abajo:
// estadísticas. TODO con placeholders por ahora.
// ============================================================
const GOLD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

type Master = {
  name: string; title: string; casa: string; elo: number; glyph: string;
  state: 'beaten' | 'open' | 'locked'; stakeIndex: number | null;
};
// Escalafón (placeholders). Los primeros 3 son jugables (mapean a los stakes
// del juego); los demás se desbloquean al vencer al anterior.
const MASTERS: Master[] = [
  { name: 'Dunia', title: 'Centinela', casa: 'Bacatá', elo: 1180, glyph: '♟', state: 'open', stakeIndex: 0 },
  { name: 'Severo', title: 'Estratega', casa: 'Roma', elo: 1480, glyph: '♞', state: 'open', stakeIndex: 1 },
  { name: 'Kenji', title: 'Maestro', casa: 'Osaka', elo: 1820, glyph: '♛', state: 'open', stakeIndex: 2 },
  { name: '???', title: 'Maestro Internacional', casa: '—', elo: 2100, glyph: '♜', state: 'locked', stakeIndex: null },
  { name: '???', title: 'Gran Maestro', casa: '—', elo: 2300, glyph: '♝', state: 'locked', stakeIndex: null },
  { name: '???', title: 'El Maestro Mayor', casa: 'El Círculo', elo: 2500, glyph: '♚', state: 'locked', stakeIndex: null },
];

const MENU = [
  { id: 'escalafon', label: 'El Escalafón', sub: 'Sube de título' },
  { id: 'rapida', label: 'Partida Rápida', sub: 'Sin clasificar' },
  { id: 'apuestas', label: 'Apuestas', sub: 'El bote es tuyo' },
  { id: 'torneos', label: 'Torneos', sub: 'Próximamente', locked: true },
  { id: 'desafios', label: 'Desafíos del día', sub: 'Próximamente', locked: true },
];

const MODES = [
  { id: 'clasif', label: 'Clasificatoria', sub: 'Afecta tu ELO y el escalafón', icon: '⟡', locked: false },
  { id: 'amistosa', label: 'Amistosa', sub: 'Practica sin arriesgar rating', icon: '☖', locked: false },
  { id: 'blitz', label: 'Blitz · 5 min', sub: 'Rápido y a sangre fría', icon: '⏱', locked: false },
  { id: 'rapida', label: 'Rápida · 10 min', sub: 'Equilibrio y nervio', icon: '⏱', locked: false },
  { id: 'clasica', label: 'Clásica · 20 min', sub: 'Para los pacientes', icon: '⏱', locked: false },
  { id: 'odds', label: 'Partida con ventaja', sub: 'El maestro te da un peón', icon: '♙', locked: true },
];

export function AjedrezLobby({
  alias, avatarSrc, balance, houseName, bg = '/assets/ajedrez-bg.webp', onPlay, onExit,
}: {
  alias: string; avatarSrc: string; balance: number | null; houseName: string;
  bg?: string; onPlay: (stakeIndex: number, timeMs: number) => void; onExit: () => void;
}) {
  const isMobile = useIsMobile();
  const [menu, setMenu] = useState('escalafon');
  const [sel, setSel] = useState(0); // maestro seleccionado
  const [mode, setMode] = useState('clasif');

  // Placeholders de ficha del jugador
  const elo = 800;
  const titulo = 'Aprendiz';
  const stats = { partidas: 0, victorias: 0, derrotas: 0, racha: 0 };

  const master = MASTERS[sel];

  return (
    <div style={shell}>
      <div style={{ ...bgLayer, backgroundImage: `url('${bg}')` }} />
      <div style={scrim} />

      <button onClick={onExit} style={exitBtn}>← Salir</button>

      <div style={{ ...grid, gridTemplateColumns: isMobile ? '1fr' : 'minmax(230px, 280px) 1fr' }}>
        {/* ===== Sidebar: jugador + menú ===== */}
        <aside style={{ ...sidebar, position: isMobile ? 'static' : 'sticky' }}>
          <div style={playerCard}>
            <div style={avatarRing}>
              <img src={avatarSrc} alt="" style={avatarImg} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={kicker}>Jugador</div>
              <div style={playerName}>{alias}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.55)' }}>
                {houseName !== 'Sin Casa' ? `Casa ${houseName}` : 'Sin Casa'}
              </div>
            </div>
          </div>

          <div style={eloRow}>
            <div style={eloBox}>
              <div style={eloNum}>{elo}</div>
              <div style={eloLbl}>ELO</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(232,226,212,.6)' }}>Título</div>
              <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#ecd9a5' }}>{titulo}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.5)', marginTop: 2 }}>Racha {stats.racha} · Billetera ⟡ {balance != null ? fmt(balance) : '—'}</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {MENU.map((m) => (
              <button
                key={m.id}
                onClick={() => !m.locked && setMenu(m.id)}
                style={{ ...menuItem, ...(menu === m.id ? menuItemActive : null), opacity: m.locked ? 0.5 : 1, cursor: m.locked ? 'default' : 'pointer' }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 14, color: '#f3eddd', fontWeight: 600 }}>{m.label}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'rgba(232,226,212,.5)' }}>{m.sub}</span>
                </span>
                {m.locked && <span style={{ fontSize: 12 }}>🔒</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* ===== Contenido ===== */}
        <main style={content}>
          <div style={{ textAlign: 'left' }}>
            <div style={kicker}>El Salón · Juegos de destreza</div>
            <h1 style={lobbyTitle}>Salón de Ajedrez</h1>
            <p style={{ color: 'rgba(232,226,212,.6)', fontStyle: 'italic', margin: '2px 0 0', fontSize: 14 }}>Un movimiento. Una consecuencia.</p>
          </div>

          {/* Niveles a vencer (escalafón) */}
          <div style={{ marginTop: 16 }}>
            <div style={sectionLabel}>Niveles a vencer</div>
            <div style={mastersRow}>
              {MASTERS.map((m, i) => {
                const locked = m.state === 'locked';
                return (
                  <button key={i} onClick={() => !locked && setSel(i)} style={{ ...masterCard, ...(sel === i ? masterCardActive : null), opacity: locked ? 0.55 : 1, cursor: locked ? 'default' : 'pointer' }}>
                    <div style={masterPortrait}>
                      <span style={{ fontSize: 30, color: locked ? 'rgba(232,226,212,.35)' : '#ecd9a5' }}>{m.glyph}</span>
                      {locked && <span style={lockBadge}>🔒</span>}
                      {m.state === 'beaten' && <span style={beatBadge}>✓</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#f3eddd', fontWeight: 600, marginTop: 6 }}>{m.name}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(232,226,212,.5)' }}>ELO {m.elo}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle del maestro + formas de jugar */}
          <div style={detailWrap}>
            <div style={detailHead}>
              <div style={{ ...masterPortrait, width: 56, height: 56, flex: '0 0 auto' }}>
                <span style={{ fontSize: 30, color: '#ecd9a5' }}>{master.glyph}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd' }}>
                  {master.name} <span style={{ fontSize: 12, color: '#9c7a3e' }}>· ELO {master.elo}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(232,226,212,.6)' }}>{master.title} · Casa {master.casa}</div>
              </div>
              {master.stakeIndex != null ? (
                <button
                  onClick={() => onPlay(master.stakeIndex as number, mode === 'blitz' ? 300_000 : mode === 'rapida' ? 600_000 : mode === 'clasica' ? 1_200_000 : 0)}
                  style={challengeBtn}
                >
                  Retar
                </button>
              ) : (
                <span style={{ ...challengeBtn, background: 'rgba(8,8,10,.5)', color: 'rgba(232,226,212,.5)', cursor: 'default', border: '1px solid rgba(201,163,91,.25)' }}>Bloqueado</span>
              )}
            </div>

            <div style={sectionLabel}>Formas de jugar</div>
            <div style={modesGrid}>
              {MODES.map((m) => (
                <button key={m.id} onClick={() => !m.locked && setMode(m.id)} style={{ ...modeCard, ...(mode === m.id ? modeCardActive : null), opacity: m.locked ? 0.5 : 1, cursor: m.locked ? 'default' : 'pointer' }}>
                  <span style={modeIcon}>{m.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13.5, color: '#f3eddd', fontWeight: 600 }}>{m.label}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'rgba(232,226,212,.55)' }}>{m.sub}</span>
                  </span>
                  {m.locked && <span style={{ fontSize: 12 }}>🔒</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Estadísticas */}
          <div style={statsBar}>
            <Stat label="Partidas" value={stats.partidas} />
            <Stat label="Victorias" value={stats.victorias} gold />
            <Stat label="Derrotas" value={stats.derrotas} />
            <Stat label="Racha" value={stats.racha} />
            <Stat label="ELO" value={elo} gold />
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,226,212,.32)', margin: '14px 0 0' }}>
            Solo Aurelios (fichas de fantasía). Nunca dinero real. +18.
          </p>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 64 }}>
      <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: gold ? '#ecd9a5' : '#ece6d6' }}>{value}</div>
      <div style={{ fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(232,226,212,.45)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ---- estilos ----
const shell: React.CSSProperties = { position: 'fixed', inset: 0, overflow: 'hidden' };
const bgLayer: React.CSSProperties = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' };
const scrim: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(120% 90% at 50% 0%, rgba(10,9,14,.62), rgba(8,7,11,.9) 70%), linear-gradient(180deg, rgba(8,7,11,.55), rgba(8,7,11,.82))',
};
const exitBtn: React.CSSProperties = {
  position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: 14, zIndex: 5,
  background: 'rgba(8,8,10,.5)', border: '1px solid rgba(201,163,91,.4)', color: '#d8b96b',
  fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};
const grid: React.CSSProperties = {
  position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto',
  display: 'grid', gridTemplateColumns: 'minmax(230px, 280px) 1fr', gap: 16,
  padding: 'calc(env(safe-area-inset-top) + 56px) 18px calc(env(safe-area-inset-bottom) + 18px)',
  maxWidth: 1180, margin: '0 auto',
};
const glass: React.CSSProperties = {
  background: 'rgba(16,14,22,.55)', border: '1px solid rgba(201,163,91,.28)', borderRadius: 16,
  backdropFilter: 'blur(14px) saturate(120%)', WebkitBackdropFilter: 'blur(14px) saturate(120%)',
  boxShadow: '0 24px 60px -30px rgba(0,0,0,.9)',
};
const sidebar: React.CSSProperties = { ...glass, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'start', position: 'sticky', top: 0 };
const playerCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const avatarRing: React.CSSProperties = {
  flex: '0 0 auto', width: 58, height: 58, borderRadius: '50%', padding: 2, background: GOLD, overflow: 'hidden',
};
const avatarImg: React.CSSProperties = {
  width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center',
  background: 'radial-gradient(120% 100% at 50% 0%, #1e6f4a, #14111c 72%)',
};
const kicker: React.CSSProperties = { fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#9c7a3e' };
const playerName: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd', lineHeight: 1.1 };
const eloRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.07)', borderBottom: '1px solid rgba(255,255,255,.07)' };
const eloBox: React.CSSProperties = { flex: '0 0 auto', width: 70, height: 64, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(201,163,91,.1)', border: '1px solid rgba(201,163,91,.3)' };
const eloNum: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 26, color: '#ecd9a5', lineHeight: 1 };
const eloLbl: React.CSSProperties = { fontSize: 9, letterSpacing: '.2em', color: '#9c7a3e', marginTop: 2 };
const menuItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 11, border: '1px solid transparent', background: 'transparent', width: '100%', fontFamily: "'Hanken Grotesk',sans-serif" };
const menuItemActive: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(201,163,91,.16), rgba(201,163,91,.05))', border: '1px solid rgba(201,163,91,.4)' };

const content: React.CSSProperties = { ...glass, padding: 18, minWidth: 0 };
const lobbyTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 30, color: '#ece6d6', margin: '4px 0 0' };
const sectionLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: '.24em', textTransform: 'uppercase', color: '#9c7a3e', margin: '0 0 8px' };
const mastersRow: React.CSSProperties = { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 };
const masterCard: React.CSSProperties = {
  flex: '0 0 auto', width: 96, padding: '10px 8px', borderRadius: 14, textAlign: 'center',
  border: '1px solid rgba(255,255,255,.08)', background: 'rgba(8,8,10,.45)',
};
const masterCardActive: React.CSSProperties = { border: '1px solid rgba(201,163,91,.6)', background: 'rgba(201,163,91,.1)' };
const masterPortrait: React.CSSProperties = {
  position: 'relative', width: 72, height: 72, margin: '0 auto', borderRadius: 12, display: 'grid', placeItems: 'center',
  background: 'radial-gradient(120% 100% at 50% 0%, #241606, #100e16 75%)', border: '1px solid rgba(201,163,91,.25)',
};
const lockBadge: React.CSSProperties = { position: 'absolute', bottom: 2, right: 2, fontSize: 12 };
const beatBadge: React.CSSProperties = { position: 'absolute', top: 2, right: 4, fontSize: 12, color: '#7ee0a6' };

const detailWrap: React.CSSProperties = { marginTop: 16, padding: 14, borderRadius: 14, border: '1px solid rgba(201,163,91,.2)', background: 'rgba(8,8,10,.35)' };
const detailHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 };
const challengeBtn: React.CSSProperties = { flex: '0 0 auto', padding: '10px 22px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#2c2415', background: GOLD };
const modesGrid: React.CSSProperties = { display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' };
const modeCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(8,8,10,.4)', width: '100%' };
const modeCardActive: React.CSSProperties = { border: '1px solid rgba(201,163,91,.55)', background: 'rgba(201,163,91,.1)' };
const modeIcon: React.CSSProperties = { flex: '0 0 auto', width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 16, color: '#ecd9a5', background: 'rgba(201,163,91,.14)', border: '1px solid rgba(201,163,91,.3)' };

const statsBar: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 16, padding: '14px 10px', borderRadius: 14, border: '1px solid rgba(201,163,91,.2)', background: 'rgba(8,8,10,.45)', flexWrap: 'wrap' };
