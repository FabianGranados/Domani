import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, getActiveLoan, listHouses, type Loan } from '../lib/api';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

type Bubble = {
  from: 'them' | 'me';
  text: string;
  time: string;
  action?: { label: string; to: string };
};

type QuickReply = {
  label: string;       // lo que el jugador ve en el chip
  reply: string;       // burbuja del jugador al tocarlo
  follow: string;      // respuesta del personaje
  action?: { label: string; to: string };
};

type Conversation = {
  id: string;
  name: string;
  avatar: string;
  accent: string;
  preview: string;
  time: string;
  unread?: number;
  messages: Bubble[];
  quickReplies?: QuickReply[];
};

type Ctx = {
  alias: string;
  balance: number;
  influence: number;
  houseName: string;
  loan: Loan | null;
};

// ============================================================
// Conversaciones DINÁMICAS: se arman con el estado real del
// ciudadano (saldo, Influencia, Casa, crédito activo). No es un
// backend de chat, pero el mundo "te conoce" y reacciona.
// ============================================================
function buildConversations(c: Ctx): Conversation[] {
  const haciendaMsgs: Bubble[] = [
    { from: 'them', text: `Le saluda la Hacienda de Domani, ${c.alias}.`, time: '18:40' },
  ];
  if (c.loan) {
    haciendaMsgs.push({
      from: 'them',
      text: `Registra un crédito activo por ⟡ ${fmt(c.loan.outstanding)}, con vencimiento el ${c.loan.due_date}. Le conviene abonar a tiempo.`,
      time: '18:41',
      action: { label: 'Ir a pagar', to: '/banco' },
    });
  } else {
    haciendaMsgs.push({
      from: 'them',
      text: `Su cuenta está al día: saldo de ⟡ ${fmt(c.balance)} y sin deudas. Si necesita liquidez, tiene línea de crédito en Domanibank.`,
      time: '18:41',
      action: { label: 'Ver Domanibank', to: '/banco' },
    });
  }

  return [
    {
      id: 'bienvenida',
      name: 'Domani · Bienvenida',
      avatar: 'D',
      accent: 'linear-gradient(135deg,#c9a35b,#a8843f)',
      preview: `Bienvenido, ${c.alias}. Aquí empieza todo…`,
      time: '09:12',
      unread: 1,
      messages: [
        { from: 'them', text: `Bienvenido a Domani, ${c.alias}. Has cruzado la entrada del Círculo.`, time: '09:10' },
        { from: 'them', text: 'Desde tu Escritorio entras a la Sala de Juegos, a Domanibank, al concurso Millonaurelios y a tu Casa. Todo a un toque.', time: '09:11' },
        { from: 'them', text: 'Reclama tu Renta a diario y construye tu Influencia. La ciudad recompensa a los constantes.', time: '09:12' },
      ],
      quickReplies: [
        {
          label: '¿Por dónde empiezo?',
          reply: '¿Por dónde empiezo?',
          follow: 'Juega una mano en la Sala de Juegos o intenta el concurso del día. Ambos te dejan Aurelios.',
          action: { label: 'Concursar', to: '/millonaurelios' },
        },
        {
          label: '¿Qué son los Aurelios?',
          reply: '¿Qué son los Aurelios?',
          follow: 'Son la moneda de fantasía de Domani. No tienen valor real ni se canjean por dinero: son para vivir el mundo.',
        },
      ],
    },
    {
      id: 'hacienda',
      name: 'Hacienda',
      avatar: 'H',
      accent: 'linear-gradient(135deg,#5b7fc9,#3f5aa8)',
      preview: c.loan ? `Tienes un crédito de ⟡ ${fmt(c.loan.outstanding)} por pagar…` : 'Su cuenta está al día. Buen juego.',
      time: 'Ayer',
      unread: c.loan ? 1 : undefined,
      messages: haciendaMsgs,
      quickReplies: [
        {
          label: '¿Cómo subo mi cupo?',
          reply: '¿Cómo subo mi cupo de crédito?',
          follow: 'Su cupo crece con su saldo y su Influencia. Gane manos, acierte en el concurso y suba de rango.',
        },
      ],
    },
    {
      id: 'lucia',
      name: 'Lucía',
      avatar: 'L',
      accent: 'linear-gradient(135deg,#c95b8e,#a83f6a)',
      preview: '¿Te animas a una mano de Texas esta noche?',
      time: '21:05',
      unread: 2,
      messages: [
        { from: 'them', text: `¡Hola, ${c.alias}! Soy Lucía, de la mesa de Texas.`, time: '21:03' },
        { from: 'them', text: 'Hay sillas libres y la noche está movida. ¿Te animas a una mano de Texas Hold’em?', time: '21:04', action: { label: 'Ir a la mesa', to: '/casino' } },
      ],
      quickReplies: [
        {
          label: 'Voy en camino',
          reply: 'Voy en camino, guárdame la silla.',
          follow: 'Hecho. Te espero en la mesa, no tardes que se llena.',
          action: { label: 'Entrar a la Sala', to: '/casino' },
        },
        {
          label: 'Hoy no, gracias',
          reply: 'Hoy no, gracias.',
          follow: 'Tranquilo. Cuando quieras revancha, ya sabes dónde encontrarme.',
        },
      ],
    },
    {
      id: 'concurso',
      name: 'Millonaurelios',
      avatar: 'M',
      accent: 'linear-gradient(135deg,#d8a93f,#a8843f)',
      preview: 'El atril está listo. ¿Juegas el concurso de hoy?',
      time: 'Hoy',
      unread: 1,
      messages: [
        { from: 'them', text: `${c.alias}, el concurso del día está abierto.`, time: '12:00' },
        { from: 'them', text: 'Doce escalones, dificultad creciente y pisos garantizados. Una partida por día.', time: '12:00', action: { label: 'Jugar ahora', to: '/millonaurelios' } },
      ],
      quickReplies: [
        {
          label: '¿Cuánto puedo ganar?',
          reply: '¿Cuánto puedo ganar?',
          follow: 'Hasta ⟡ 1.000.000 si llegas a la cima. Y aseguras ⟡ 5.000 en el escalón 4 y ⟡ 80.000 en el 8.',
          action: { label: 'Ir al concurso', to: '/millonaurelios' },
        },
      ],
    },
    {
      id: 'times',
      name: 'Domani Times',
      avatar: 'T',
      accent: 'linear-gradient(135deg,#4f9d6b,#2f6b48)',
      preview: `${c.houseName} en boca de todos esta semana`,
      time: 'Hoy',
      messages: [
        { from: 'them', text: 'DOMANI TIMES — Edición de la noche', time: '20:00' },
        { from: 'them', text: `Titular: ${c.houseName} suena fuerte entre las Casas activas de la semana. Los analistas siguen de cerca su Influencia.`, time: '20:00' },
        { from: 'them', text: 'En breve: rumores sobre la apertura de El Mercado. El Círculo guarda silencio.', time: '20:01' },
      ],
    },
  ];
}

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
  const [houseName, setHouseName] = useState('tu Casa');

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
      <div style={topRow}>
        <Link to="/" style={backLink}>← Volver</Link>
        <div>
          <div style={eyebrow}>Mensajería</div>
          <h1 className="page-title" style={{ margin: '2px 0 0' }}>Michat</h1>
        </div>
        <div style={{ width: 72 }} />
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
const topRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  paddingTop: 'env(safe-area-inset-top)',
};
const backLink: React.CSSProperties = { width: 72, fontSize: 13.5, color: '#d8b96b', textDecoration: 'none', fontWeight: 600 };
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
