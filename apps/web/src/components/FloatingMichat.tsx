import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, getActiveLoan, listHouses, type Loan } from '../lib/api';
import { buildConversations, totalUnread, type Bubble, type QuickReply } from '../lib/michat';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

// Ícono de chat (dos burbujas + puntos), redibujado como SVG nítido y
// recoloreable. Versión provisional hasta el arte definitivo.
function ChatGlyph({ size = 28 }: { size?: number }) {
  const w = '#f3fff9';      // burbujas (marfil sobre la esmeralda)
  const dot = '#0c5e3c';    // puntos (verde profundo)
  return (
    <svg width={size} height={size * (40 / 48)} viewBox="0 0 48 40" fill="none" aria-hidden>
      {/* burbuja trasera */}
      <rect x="2" y="2" width="28" height="18" rx="5" fill={w} />
      <path d="M8 20 L8 28 L15 20 Z" fill={w} />
      {/* burbuja delantera */}
      <rect x="20" y="14" width="26" height="17" rx="5" fill={w} />
      <path d="M38 31 L38 39 L31 31 Z" fill={w} />
      {/* puntos */}
      <circle cx="27" cy="22.5" r="2.2" fill={dot} />
      <circle cx="33" cy="22.5" r="2.2" fill={dot} />
      <circle cx="39" cy="22.5" r="2.2" fill={dot} />
    </svg>
  );
}

export function FloatingMichat() {
  const { profile, user } = useAuth();
  const location = useLocation();

  const [balance, setBalance] = useState(0);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [houseName, setHouseName] = useState('tu ciudad');

  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, Bubble[]>>({});
  const [used, setUsed] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (!user) return;
    getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    getActiveLoan(user.id).then(setLoan).catch(() => setLoan(null));
  }, [user]);

  useEffect(() => {
    if (!profile?.house_id) return;
    listHouses().then((hs) => {
      const h = hs.find((x) => x.id === profile.house_id);
      if (h) setHouseName(h.name);
    });
  }, [profile?.house_id]);

  const conversations = useMemo(
    () =>
      buildConversations({
        alias: profile?.alias ?? 'Ciudadano',
        balance,
        influence: profile?.influence ?? 0,
        houseName,
        loan,
      }),
    [profile?.alias, profile?.influence, balance, houseName, loan]
  );

  const unread = totalUnread(conversations);
  const conv = conversations.find((c) => c.id === convId) ?? null;

  // Oculta en pantallas inmersivas (póker, ajedrez).
  if (location.pathname.startsWith('/poker') || location.pathname.startsWith('/ajedrez')) return null;

  function tapQuick(id: string, idx: number, qr: QuickReply) {
    setExtra((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] ?? []),
        { from: 'me', text: qr.reply, time: 'ahora' },
        { from: 'them', text: qr.follow, time: 'ahora', action: qr.action },
      ],
    }));
    setUsed((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), idx] }));
  }

  return (
    <>
      {/* ===== Panel emergente ===== */}
      {open && (
        <div style={panel}>
          <div style={panelHeader}>
            {conv ? (
              <>
                <button onClick={() => setConvId(null)} style={hdrBtn} aria-label="Volver">←</button>
                <div style={{ ...avatar, background: conv.accent, width: 32, height: 32, fontSize: 14 }}>{conv.avatar}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={hdrName}>{conv.name}</div>
                  <div style={hdrSub}>en línea</div>
                </div>
              </>
            ) : (
              <>
                <span style={glassDot} />
                <div style={{ flex: 1 }}>
                  <div style={hdrName}>Michat</div>
                  <div style={hdrSub}>{unread > 0 ? `${unread} sin leer` : 'Al día'}</div>
                </div>
              </>
            )}
            <button onClick={() => setOpen(false)} style={hdrBtn} aria-label="Cerrar">×</button>
          </div>

          <div style={panelBody}>
            {!conv ? (
              conversations.map((c) => (
                <button key={c.id} onClick={() => setConvId(c.id)} style={listRow}>
                  <div style={{ ...avatar, background: c.accent }}>{c.avatar}</div>
                  <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <div style={listTop}>
                      <span style={listName}>{c.name}</span>
                      <span style={listTime}>{c.time}</span>
                    </div>
                    <div style={listPreviewRow}>
                      <span style={listPreview}>{c.preview}</span>
                      {c.unread ? <span style={unreadDot}>{c.unread}</span> : null}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div style={chatScroll}>
                {[...conv.messages, ...(extra[conv.id] ?? [])].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                    <div style={m.from === 'me' ? bubbleMe : bubbleThem}>
                      <div>{m.text}</div>
                      {m.action && (
                        <Link to={m.action.to} onClick={() => setOpen(false)} style={bubbleAction}>{m.action.label}</Link>
                      )}
                      <div style={bubbleTime}>{m.time}</div>
                    </div>
                  </div>
                ))}
                {conv.quickReplies && (
                  <div style={quickRow}>
                    {conv.quickReplies.map((qr, i) =>
                      (used[conv.id] ?? []).includes(i) ? null : (
                        <button key={i} onClick={() => tapQuick(conv.id, i, qr)} style={quickChip}>
                          {qr.label}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link to="/michat" onClick={() => setOpen(false)} style={seeAll}>
            Ver todo en Michat →
          </Link>
        </div>
      )}

      {/* ===== Burbuja esmeralda ===== */}
      <div style={fixedWrap}>
        {unread > 0 && !open && <span style={ring} />}
        <button onClick={() => setOpen((v) => !v)} style={bubble} aria-label="Abrir Michat">
          <span style={specular} />
          {open ? <span style={{ fontSize: 26, color: '#f3fff9', fontWeight: 300, lineHeight: 1 }}>×</span> : <ChatGlyph />}
          {unread > 0 && !open && <span style={badge}>{unread}</span>}
        </button>
      </div>
    </>
  );
}

// ---- estilos ----
const fixedWrap: React.CSSProperties = {
  position: 'fixed', zIndex: 951,
  right: 'calc(env(safe-area-inset-right) + 18px)',
  bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
  width: 62, height: 62,
};
const ring: React.CSSProperties = {
  position: 'absolute', inset: -2, borderRadius: '50%',
  border: '2px solid rgba(46,200,130,.55)', animation: 'domEmeraldRing 2.6s ease-out infinite', pointerEvents: 'none',
};
const bubble: React.CSSProperties = {
  position: 'relative', width: '100%', height: '100%', borderRadius: '50%', cursor: 'pointer',
  border: '1px solid rgba(140,255,200,.45)',
  background: 'radial-gradient(circle at 34% 28%, #6dffba 0%, #1eb178 34%, #0d7a4e 64%, #084d31 100%)',
  boxShadow: '0 12px 30px -8px rgba(15,150,95,.75), inset 0 3px 10px rgba(255,255,255,.45), inset 0 -8px 16px rgba(0,0,0,.45)',
  display: 'grid', placeItems: 'center',
};
const specular: React.CSSProperties = {
  position: 'absolute', top: 8, left: 13, width: 24, height: 15, borderRadius: '50%',
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,.9), rgba(255,255,255,0) 70%)',
  filter: 'blur(0.5px)', pointerEvents: 'none',
};
const badge: React.CSSProperties = {
  position: 'absolute', top: -3, right: -3, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999,
  background: GOLD_GRAD, color: '#2c2415', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center',
  border: '2px solid #0a3d27', boxShadow: '0 2px 6px rgba(0,0,0,.5)',
};

const panel: React.CSSProperties = {
  position: 'fixed', zIndex: 950,
  right: 'calc(env(safe-area-inset-right) + 16px)',
  bottom: 'calc(env(safe-area-inset-bottom) + 90px)',
  width: 'min(360px, calc(100vw - 28px))',
  maxHeight: 'min(560px, calc(100vh - 150px))',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  borderRadius: 18, border: '1px solid rgba(46,160,110,.35)',
  background: 'linear-gradient(160deg,#15131c,#100e16)',
  boxShadow: '0 26px 60px -22px rgba(0,0,0,.85), 0 0 0 1px rgba(0,0,0,.3)',
  animation: 'domSheetUp .22s ease-out',
};
const panelHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: 12, flex: '0 0 auto',
  borderBottom: '1px solid var(--line)',
  background: 'linear-gradient(120deg, rgba(30,177,120,.18), rgba(8,8,10,.35))',
};
const glassDot: React.CSSProperties = {
  width: 30, height: 30, borderRadius: '50%', flex: '0 0 auto',
  background: 'radial-gradient(circle at 34% 28%, #6dffba, #1eb178 45%, #0d7a4e 80%)',
  boxShadow: 'inset 0 2px 5px rgba(255,255,255,.4)',
};
const hdrName: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 16, color: '#f3eddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const hdrSub: React.CSSProperties = { fontSize: 11, color: 'rgba(232,226,212,.5)' };
const hdrBtn: React.CSSProperties = {
  flex: '0 0 auto', width: 30, height: 30, borderRadius: 9, border: '1px solid rgba(201,163,91,.3)',
  background: 'transparent', color: '#d8b96b', fontSize: 17, cursor: 'pointer', display: 'grid', placeItems: 'center',
};
const panelBody: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' };

const avatar: React.CSSProperties = {
  flex: '0 0 auto', width: 42, height: 42, borderRadius: '50%', display: 'grid', placeContent: 'center',
  fontFamily: 'Marcellus, serif', fontSize: 17, color: '#1a1405', fontWeight: 700,
};
const listRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', border: 'none',
  borderBottom: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', width: '100%',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const listTop: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' };
const listName: React.CSSProperties = { fontSize: 14.5, color: '#f3eddd', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const listTime: React.CSSProperties = { fontSize: 10.5, color: 'rgba(232,226,212,.4)', flex: '0 0 auto' };
const listPreviewRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 };
const listPreview: React.CSSProperties = { fontSize: 12, color: 'rgba(232,226,212,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 };
const unreadDot: React.CSSProperties = {
  flex: '0 0 auto', minWidth: 19, height: 19, padding: '0 6px', borderRadius: 999,
  background: 'linear-gradient(135deg,#3fe0a0,#1eb178)', color: '#063',
  fontSize: 11, fontWeight: 800, display: 'grid', placeContent: 'center',
};

const chatScroll: React.CSSProperties = { padding: 14, display: 'flex', flexDirection: 'column', gap: 9 };
const bubbleBase: React.CSSProperties = { maxWidth: '82%', padding: '9px 12px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.4, color: '#ece6d6' };
const bubbleThem: React.CSSProperties = { ...bubbleBase, background: 'var(--panel-2)', border: '1px solid var(--line)', borderTopLeftRadius: 4 };
const bubbleMe: React.CSSProperties = { ...bubbleBase, background: 'linear-gradient(135deg, rgba(46,160,110,.22), rgba(46,160,110,.1))', border: '1px solid rgba(46,160,110,.4)', borderTopRightRadius: 4 };
const bubbleTime: React.CSSProperties = { fontSize: 9.5, color: 'rgba(232,226,212,.4)', marginTop: 4, textAlign: 'right' };
const bubbleAction: React.CSSProperties = {
  display: 'inline-block', marginTop: 7, padding: '6px 13px', borderRadius: 8,
  background: 'linear-gradient(135deg,#3fe0a0,#1eb178)', color: '#06351f', fontSize: 12, fontWeight: 700, textDecoration: 'none',
};
const quickRow: React.CSSProperties = { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 };
const quickChip: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(46,160,110,.5)',
  background: 'rgba(46,160,110,.1)', color: '#a7e9c8', fontSize: 12.5, cursor: 'pointer',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const seeAll: React.CSSProperties = {
  flex: '0 0 auto', textAlign: 'center', padding: '11px 12px', borderTop: '1px solid var(--line)',
  color: '#7ee0a6', fontSize: 13, fontWeight: 700, textDecoration: 'none', background: 'rgba(8,8,10,.3)',
};
