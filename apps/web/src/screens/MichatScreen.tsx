import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, getActiveLoan, listHouses, type Loan } from '../lib/api';
import { buildConversations, type Bubble, type QuickReply } from '../lib/michat';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

function useIsDesktop(): boolean {
  const query = '(min-width: 760px)';
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

export function MichatScreen() {
  const { profile, user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [houseName, setHouseName] = useState('tu ciudad');

  const [openId, setOpenId] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, Bubble[]>>({});
  const [used, setUsed] = useState<Record<string, number[]>>({});
  const isDesktop = useIsDesktop();

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

  const open = conversations.find((c) => c.id === openId) ?? null;
  const showList = isDesktop || !open;
  const showChat = open !== null;

  function tapQuick(convId: string, idx: number, qr: QuickReply) {
    setExtra((prev) => ({
      ...prev,
      [convId]: [
        ...(prev[convId] ?? []),
        { from: 'me', text: qr.reply, time: 'ahora' },
        { from: 'them', text: qr.follow, time: 'ahora', action: qr.action },
      ],
    }));
    setUsed((prev) => ({ ...prev, [convId]: [...(prev[convId] ?? []), idx] }));
  }

  return (
    <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ textAlign: 'center', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={eyebrow}>Mensajería</div>
        <h1 className="page-title" style={{ margin: '2px 0 0' }}>Michat</h1>
      </div>

      <div style={twoPane(isDesktop && showChat)}>
        {showList && (
          <div style={listPane()}>
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpenId(c.id)}
                style={{ ...convRow, ...(openId === c.id ? convRowActive : null) }}
              >
                <div style={{ ...convAvatar, background: c.accent }}>{c.avatar}</div>
                <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <div style={convTopline}>
                    <span style={convName}>{c.name}</span>
                    <span style={convTime}>{c.time}</span>
                  </div>
                  <div style={convPreviewRow}>
                    <span style={convPreview}>{c.preview}</span>
                    {c.unread ? <span style={unreadDot}>{c.unread}</span> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showChat && open && (
          <div style={chatPane}>
            <div style={chatHeader}>
              <button onClick={() => setOpenId(null)} style={chatBackBtn} aria-label="Volver a la lista">←</button>
              <div style={{ ...convAvatar, background: open.accent, width: 38, height: 38, fontSize: 16 }}>{open.avatar}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 17, color: '#f3eddd' }}>{open.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,226,212,.5)' }}>en línea</div>
              </div>
            </div>

            <div style={bubbleScroll}>
              {[...open.messages, ...(extra[open.id] ?? [])].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                  <div style={m.from === 'me' ? bubbleMe : bubbleThem}>
                    <div>{m.text}</div>
                    {m.action && <Link to={m.action.to} style={bubbleAction}>{m.action.label}</Link>}
                    <div style={bubbleTime}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Respuestas rápidas (lo que aún no has tocado) */}
            {open.quickReplies && (
              <div style={quickRow}>
                {open.quickReplies.map((qr, i) =>
                  (used[open.id] ?? []).includes(i) ? null : (
                    <button key={i} onClick={() => tapQuick(open.id, i, qr)} style={quickChip}>
                      {qr.label}
                    </button>
                  )
                )}
              </div>
            )}

            <div style={composer}>
              <div style={composerInput}>Escribe a {open.name.split(' ')[0]}…</div>
              <span style={composerHint}>responde con los botones</span>
            </div>
          </div>
        )}

        {isDesktop && !open && (
          <div style={emptyPane}>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#ece6d6' }}>Michat</div>
            <p className="muted" style={{ maxWidth: 320, textAlign: 'center', marginTop: 8 }}>
              {profile?.alias ? `${profile.alias}, elige` : 'Elige'} una conversación para leer tus mensajes y avisos del Círculo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- estilos ----
const eyebrow: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e', textAlign: 'center',
};
function twoPane(hasOpen: boolean): React.CSSProperties {
  return {
    display: 'grid', gridTemplateColumns: hasOpen ? 'minmax(0, 340px) 1fr' : '1fr',
    gap: 14, marginTop: '1.4rem', alignItems: 'stretch',
  };
}
function listPane(): React.CSSProperties {
  return { display: 'flex', flexDirection: 'column', gap: 6 };
}
const convRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14,
  border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', width: '100%',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const convRowActive: React.CSSProperties = {
  borderColor: 'rgba(201,163,91,.55)',
  background: 'linear-gradient(135deg, rgba(201,163,91,.10), rgba(255,255,255,.02))',
};
const convAvatar: React.CSSProperties = {
  flex: '0 0 auto', width: 46, height: 46, borderRadius: '50%', display: 'grid', placeContent: 'center',
  fontFamily: 'Marcellus, serif', fontSize: 19, color: '#1a1405', fontWeight: 700,
};
const convTopline: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' };
const convName: React.CSSProperties = { fontSize: 15, color: '#f3eddd', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const convTime: React.CSSProperties = { fontSize: 11, color: 'rgba(232,226,212,.4)', flex: '0 0 auto' };
const convPreviewRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 };
const convPreview: React.CSSProperties = { fontSize: 12.5, color: 'rgba(232,226,212,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 };
const unreadDot: React.CSSProperties = {
  flex: '0 0 auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: GOLD_GRAD,
  color: '#2c2415', fontSize: 11.5, fontWeight: 800, display: 'grid', placeContent: 'center',
};
const chatPane: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', borderRadius: 16, border: '1px solid var(--line)',
  background: 'linear-gradient(160deg,#15131c,#100e16)', overflow: 'hidden', minHeight: '60vh',
};
const chatHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: '1px solid var(--line)',
  background: 'rgba(8,8,10,.35)',
};
const chatBackBtn: React.CSSProperties = {
  flex: '0 0 auto', width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(201,163,91,.3)',
  background: 'transparent', color: '#d8b96b', fontSize: 18, cursor: 'pointer',
};
const bubbleScroll: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
};
const bubbleBase: React.CSSProperties = { maxWidth: '78%', padding: '10px 13px', borderRadius: 16, fontSize: 14, lineHeight: 1.42, color: '#ece6d6' };
const bubbleThem: React.CSSProperties = { ...bubbleBase, background: 'var(--panel-2)', border: '1px solid var(--line)', borderTopLeftRadius: 4 };
const bubbleMe: React.CSSProperties = { ...bubbleBase, background: 'linear-gradient(135deg, rgba(201,163,91,.22), rgba(201,163,91,.12))', border: '1px solid rgba(201,163,91,.4)', borderTopRightRadius: 4 };
const bubbleTime: React.CSSProperties = { fontSize: 10, color: 'rgba(232,226,212,.4)', marginTop: 5, textAlign: 'right' };
const bubbleAction: React.CSSProperties = {
  display: 'inline-block', marginTop: 8, padding: '7px 14px', borderRadius: 9, background: GOLD_GRAD,
  color: '#2c2415', fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
};
const quickRow: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderTop: '1px solid var(--line)',
  background: 'rgba(8,8,10,.2)',
};
const quickChip: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(201,163,91,.45)',
  background: 'rgba(201,163,91,.08)', color: '#ecd9a5', fontSize: 13, cursor: 'pointer',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const composer: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderTop: '1px solid var(--line)',
  background: 'rgba(8,8,10,.35)',
};
const composerInput: React.CSSProperties = {
  flex: 1, padding: '10px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--panel)',
  color: 'rgba(232,226,212,.45)', fontSize: 13.5,
};
const composerHint: React.CSSProperties = { fontSize: 10.5, color: 'rgba(232,226,212,.35)', flex: '0 0 auto' };
const emptyPane: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 200, padding: 24, borderRadius: 16, border: '1px dashed var(--line)',
};
