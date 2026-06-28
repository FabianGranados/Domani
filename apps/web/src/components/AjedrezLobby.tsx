import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ============================================================
// Lobby del Salón de Ajedrez — panel de gestión (estilo GTA):
// foto de fondo + tarjetas de vidrio. Izquierda: avatar + ficha (ELO,
// título, racha) + secciones. Contenido: LOS 5 NIVELES (examen, todos
// abiertos, con premio y trofeo), VITRINA de trofeos (visible a otros),
// MULTIMESA (5 a la vez, rush) y JUGAR CON AMIGOS (social, casual).
// Placeholders donde aún no hay lógica.
// ============================================================
const GOLD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

type Level = { idx: number; n: number; master: string; title: string; elo: number; img: string; prize: number; timeMs: number; time: string };
const LEVELS: Level[] = [
  { idx: 0, n: 1, master: 'Teo', title: 'Aprendiz', elo: 1180, img: '/assets/maestro-1.webp', prize: 5000, timeMs: 0, time: 'Sin reloj' },
  { idx: 1, n: 2, master: 'Vera', title: 'Estratega', elo: 1480, img: '/assets/maestro-2.webp', prize: 20000, timeMs: 600_000, time: 'Rápida · 10′' },
  { idx: 2, n: 3, master: 'Severo', title: 'Maestro', elo: 1820, img: '/assets/maestro-3.webp', prize: 80000, timeMs: 600_000, time: 'Rápida · 10′' },
  { idx: 3, n: 4, master: 'Don Aurelio', title: 'Gran Maestro', elo: 2200, img: '/assets/maestro-4.webp', prize: 300000, timeMs: 300_000, time: 'Blitz · 5′' },
  { idx: 4, n: 5, master: 'El Encapuchado', title: 'Campeón Mundial', elo: 2600, img: '/assets/maestro-5.webp', prize: 2_000_000, timeMs: 300_000, time: 'Blitz · 5′' },
];

const SECTIONS = [
  { id: 'niveles', label: 'Los 5 Niveles', sub: 'El examen' },
  { id: 'mesa', label: 'Mesa abierta', sub: 'Reta a un ciudadano' },
  { id: 'vitrina', label: 'Vitrina de Trofeos', sub: 'Tus logros' },
  { id: 'multimesa', label: 'Multimesa', sub: '5 a la vez · Rush' },
  { id: 'amigos', label: 'Jugar con amigos', sub: 'Invita y reta' },
];

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

export function AjedrezLobby({
  alias, avatarSrc, balance, houseName, bg = '/assets/ajedrez-bg.webp', onPlay, onChallengeCitizen, onExit,
}: {
  alias: string; avatarSrc: string; balance: number | null; houseName: string;
  bg?: string; onPlay: (stakeIndex: number, timeMs: number) => void; onChallengeCitizen?: () => void; onExit: () => void;
}) {
  const isMobile = useIsMobile();
  const [section, setSection] = useState('niveles');

  // Placeholders de la ficha del jugador (lógica real: siguiente fase)
  const elo = 800;
  const titulo = 'Aprendiz';
  const trofeos = 0;
  const stats = { partidas: 0, victorias: 0, racha: 0 };
  const earned: boolean[] = [false, false, false, false, false]; // trofeos por nivel

  return (
    <div style={shell}>
      <div style={{ ...bgLayer, backgroundImage: `url('${bg}')` }} />
      <div style={scrim} />
      <button onClick={onExit} style={exitBtn}>← Salir</button>

      <div style={{ ...grid, gridTemplateColumns: isMobile ? '1fr' : 'minmax(230px, 280px) 1fr' }}>
        {/* ===== Sidebar ===== */}
        <aside style={{ ...sidebar, position: isMobile ? 'static' : 'sticky' }}>
          <div style={playerCard}>
            <div style={avatarRing}><img src={avatarSrc} alt="" style={avatarImg} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={kicker}>Jugador</div>
              <div style={playerName}>{alias}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.6)' }}>{houseName}</div>
            </div>
          </div>

          <div style={eloRow}>
            <div style={eloBox}><div style={eloNum}>{elo}</div><div style={eloLbl}>ELO</div></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(232,226,212,.65)' }}>Título</div>
              <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#ecd9a5' }}>{titulo}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.55)', marginTop: 2 }}>🏆 {trofeos}/5 · Racha {stats.racha}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(232,226,212,.6)', padding: '0 2px' }}>
            Billetera <span style={{ color: '#ecd9a5', fontWeight: 700 }}>⟡ {balance != null ? fmt(balance) : '—'}</span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{ ...menuItem, ...(section === s.id ? menuItemActive : null) }}>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 14, color: '#f3eddd', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'rgba(232,226,212,.5)' }}>{s.sub}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ===== Contenido ===== */}
        <main style={content}>
          <div>
            <div style={kicker}>El Salón · Juegos de destreza</div>
            <h1 style={lobbyTitle}>Salón de Ajedrez</h1>
            <p style={{ color: 'rgba(232,226,212,.7)', fontStyle: 'italic', margin: '2px 0 0', fontSize: 14 }}>Un movimiento. Una consecuencia.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Link to="/palmares" style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.1)', color: '#ecd9a5', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>🏆 Mi palmarés</Link>
              <Link to="/ajedrez-online" style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(126,224,166,.45)', background: 'rgba(126,224,166,.12)', color: '#9ff0bf', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>🌐 Jugar con un humano</Link>
            </div>
          </div>

          {/* ----- LOS 5 NIVELES ----- */}
          {section === 'niveles' && (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Los 5 niveles · siempre abiertos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LEVELS.map((l) => {
                  const top = l.n === 5;
                  return (
                    <div key={l.idx} style={{ ...levelRow, ...(top ? levelRowTop : null) }}>
                      <div style={levelNum}>{l.n}</div>
                      <div style={{ ...masterPortrait, width: 56, height: 56, flex: '0 0 auto', overflow: 'hidden' }}>
                        <img src={l.img} alt={l.master} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Marcellus,serif', fontSize: 16, color: '#f3eddd' }}>
                          {l.master} <span style={{ fontSize: 11.5, color: '#9c7a3e' }}>· {l.title} · ELO {l.elo}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(232,226,212,.62)' }}>
                          {l.time} · Premio al vencer <b style={{ color: top ? '#7ee0a6' : '#ecd9a5' }}>⟡ {fmt(l.prize)}</b>
                        </div>
                        {top && <div style={{ fontSize: 11, color: '#e0b15a', marginTop: 2 }}>👑 Solo para campeones. El bot juega en serio.</div>}
                      </div>
                      <button onClick={() => onPlay(l.idx, l.timeMs)} style={challengeBtn}>Retar</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----- VITRINA ----- */}
          {section === 'vitrina' && (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Vitrina de trofeos · visible para todos</div>
              <div style={trophyGrid}>
                {LEVELS.map((l, i) => {
                  const won = earned[i];
                  return (
                    <div key={l.idx} style={trophyCard}>
                      <div style={{ ...medal, filter: won ? 'none' : 'grayscale(1) brightness(.6)', opacity: won ? 1 : 0.55 }}>
                        <span style={{ fontSize: 30 }}>🏅</span>
                        <span style={medalLvl}>{l.n}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: won ? '#ecd9a5' : 'rgba(232,226,212,.5)', marginTop: 6, fontWeight: 600 }}>Nivel {l.n}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(232,226,212,.45)' }}>{won ? 'Conquistado' : 'Por conquistar'}</div>
                    </div>
                  );
                })}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Cada nivel que venzas pinta su medalla a color. Otros jugadores podrán ver tu vitrina.</p>
            </div>
          )}

          {/* ----- MULTIMESA ----- */}
          {section === 'multimesa' && (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Multimesa · estilo Rush</div>
              <div style={featureCard}>
                <div style={{ fontSize: 40 }}>🏁</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd' }}>5 mesas a la vez</div>
                  <p style={{ fontSize: 13, color: 'rgba(232,226,212,.7)', margin: '4px 0 0', lineHeight: 1.45 }}>
                    Juega 5 partidas simultáneas contra reloj, como el Rush del póker. Gana <b style={{ color: '#ecd9a5' }}>al menos una</b> y te llevas el <b style={{ color: '#ecd9a5' }}>trofeo de Multimesa</b>.
                  </p>
                  <span style={soonPill}>Próximamente</span>
                </div>
              </div>
            </div>
          )}

          {/* ----- MESA ABIERTA · ciudadano al azar ----- */}
          {section === 'mesa' && (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Mesa abierta · te toca quien ande por ahí</div>
              <div style={featureCard}>
                <div style={{ fontSize: 40 }}>♟️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd' }}>Reta a un ciudadano</div>
                  <p style={{ fontSize: 13, color: 'rgba(232,226,212,.7)', margin: '4px 0 8px', lineHeight: 1.45 }}>
                    No eliges rival: te sientas y te toca un <b style={{ color: '#ecd9a5' }}>ciudadano al azar</b> de Domani.
                    Mientras más Influencia tenga, más fuerte juega. Apuesta baja, partida tranquila.
                  </p>
                  <button onClick={() => onChallengeCitizen?.()} style={challengeBtn}>Buscar contendor</button>
                </div>
              </div>
            </div>
          )}

          {/* ----- AMIGOS ----- */}
          {section === 'amigos' && (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Jugar con amigos · partidas tranquilas</div>
              <div style={featureCard}>
                <div style={{ fontSize: 40 }}>🤝</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd' }}>Tus amigos del Círculo</div>
                  <p style={{ fontSize: 13, color: 'rgba(232,226,212,.7)', margin: '4px 0 0', lineHeight: 1.45 }}>
                    Invita o llama a tus amigos de la red social de Domani y juega partidas <b style={{ color: '#ecd9a5' }}>sin apostar tantas fichas</b>, a tu ritmo.
                  </p>
                  <span style={soonPill}>Próximamente</span>
                </div>
              </div>
            </div>
          )}

          {/* ----- Estadísticas ----- */}
          <div style={statsBar}>
            <Stat label="Partidas" value={stats.partidas} />
            <Stat label="Victorias" value={stats.victorias} gold />
            <Stat label="Trofeos" value={trofeos} gold />
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
    <div style={{ flex: 1, textAlign: 'center', minWidth: 56 }}>
      <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: gold ? '#ecd9a5' : '#ece6d6' }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(232,226,212,.45)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ---- estilos ----
const shell: React.CSSProperties = { position: 'fixed', inset: 0, overflow: 'hidden' };
const bgLayer: React.CSSProperties = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(1.18) saturate(1.05)' };
const scrim: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(120% 90% at 50% 0%, rgba(10,9,14,.28), rgba(8,7,11,.62) 75%), linear-gradient(180deg, rgba(8,7,11,.22), rgba(8,7,11,.5))',
};
const exitBtn: React.CSSProperties = {
  position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: 14, zIndex: 5,
  background: 'rgba(8,8,10,.5)', border: '1px solid rgba(201,163,91,.4)', color: '#d8b96b',
  fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};
const grid: React.CSSProperties = {
  position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto',
  display: 'grid', gap: 16, padding: 'calc(env(safe-area-inset-top) + 56px) 18px calc(env(safe-area-inset-bottom) + 18px)',
  maxWidth: 1180, margin: '0 auto',
};
const glass: React.CSSProperties = {
  background: 'rgba(14,12,20,.62)', border: '1px solid rgba(201,163,91,.3)', borderRadius: 16,
  backdropFilter: 'blur(16px) saturate(120%)', WebkitBackdropFilter: 'blur(16px) saturate(120%)',
  boxShadow: '0 24px 60px -30px rgba(0,0,0,.9)',
};
const sidebar: React.CSSProperties = { ...glass, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'start', top: 0 };
const playerCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const avatarRing: React.CSSProperties = { flex: '0 0 auto', width: 58, height: 58, borderRadius: '50%', padding: 2, background: GOLD, overflow: 'hidden' };
const avatarImg: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center', background: 'radial-gradient(120% 100% at 50% 0%, #1e6f4a, #14111c 72%)' };
const kicker: React.CSSProperties = { fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#bfa05a' };
const playerName: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 20, color: '#f3eddd', lineHeight: 1.1 };
const eloRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)' };
const eloBox: React.CSSProperties = { flex: '0 0 auto', width: 70, height: 64, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(201,163,91,.12)', border: '1px solid rgba(201,163,91,.3)' };
const eloNum: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 26, color: '#ecd9a5', lineHeight: 1 };
const eloLbl: React.CSSProperties = { fontSize: 9, letterSpacing: '.2em', color: '#9c7a3e', marginTop: 2 };
const menuItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 11, border: '1px solid transparent', background: 'transparent', width: '100%', cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif" };
const menuItemActive: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(201,163,91,.18), rgba(201,163,91,.05))', border: '1px solid rgba(201,163,91,.4)' };

const content: React.CSSProperties = { ...glass, padding: 18, minWidth: 0 };
const lobbyTitle: React.CSSProperties = { fontFamily: "'Cormorant Garamond',serif", fontSize: 30, color: '#ece6d6', margin: '4px 0 0' };
const sectionLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: '.24em', textTransform: 'uppercase', color: '#bfa05a', margin: '0 0 10px' };

const levelRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(8,8,10,.5)' };
const levelRowTop: React.CSSProperties = { border: '1px solid rgba(201,163,91,.55)', background: 'linear-gradient(135deg, rgba(201,163,91,.12), rgba(8,8,10,.5))' };
const levelNum: React.CSSProperties = { flex: '0 0 auto', width: 26, fontFamily: 'Marcellus,serif', fontSize: 22, color: '#9c7a3e', textAlign: 'center' };
const masterPortrait: React.CSSProperties = { position: 'relative', width: 72, height: 72, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'radial-gradient(120% 100% at 50% 0%, #241606, #100e16 75%)', border: '1px solid rgba(201,163,91,.25)' };
const challengeBtn: React.CSSProperties = { flex: '0 0 auto', padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#2c2415', background: GOLD };

const trophyGrid: React.CSSProperties = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' };
const trophyCard: React.CSSProperties = { textAlign: 'center', padding: '14px 8px', borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(8,8,10,.45)' };
const medal: React.CSSProperties = { position: 'relative', width: 64, height: 64, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 40% 30%, rgba(201,163,91,.3), rgba(8,8,10,.6))', border: '1px solid rgba(201,163,91,.3)' };
const medalLvl: React.CSSProperties = { position: 'absolute', bottom: 4, right: 8, fontSize: 12, fontWeight: 800, color: '#2c2415', background: GOLD, borderRadius: 999, width: 18, height: 18, display: 'grid', placeItems: 'center' };

const featureCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, padding: 18, borderRadius: 16, border: '1px solid rgba(201,163,91,.28)', background: 'rgba(8,8,10,.45)' };
const soonPill: React.CSSProperties = { display: 'inline-block', marginTop: 12, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(236,230,214,.8)', border: '1px solid rgba(201,163,91,.4)', background: 'rgba(8,8,10,.4)', padding: '6px 13px', borderRadius: 999 };

const statsBar: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 18, padding: '14px 10px', borderRadius: 14, border: '1px solid rgba(201,163,91,.22)', background: 'rgba(8,8,10,.5)', flexWrap: 'wrap' };
