import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

type Bubble = {
  from: 'them' | 'me';
  text: string;
  time: string;
  action?: { label: string; to: string };
};

type Conversation = {
  id: string;
  name: string;
  avatar: string; // letra inicial
  accent: string;
  preview: string;
  time: string;
  unread?: number;
  messages: Bubble[];
};

// ============================================================
// Contenido SEMBRADO (estático). Editar aquí para cambiar los
// mensajes; v1 no tiene backend.
// ============================================================
const SEED: Conversation[] = [
  {
    id: 'bienvenida',
    name: 'Domani · Bienvenida',
    avatar: 'D',
    accent: 'linear-gradient(135deg,#c9a35b,#a8843f)',
    preview: 'Bienvenido al Círculo. Aquí empieza todo…',
    time: '09:12',
    unread: 1,
    messages: [
      { from: 'them', text: 'Bienvenido a Domani. Has cruzado la entrada del Círculo.', time: '09:10' },
      { from: 'them', text: 'Desde tu Escritorio puedes entrar a la Sala de Juegos, a Domanibank y a tu Casa. Todo lo importante está a un toque.', time: '09:11' },
      { from: 'them', text: 'Reclama tu Renta a diario y construye tu Influencia. La ciudad recompensa a los constantes.', time: '09:12' },
    ],
  },
  {
    id: 'hacienda',
    name: 'Hacienda',
    avatar: 'H',
    accent: 'linear-gradient(135deg,#5b7fc9,#3f5aa8)',
    preview: 'Recordatorio: la tesorería revisa los movimientos…',
    time: 'Ayer',
    messages: [
      { from: 'them', text: 'Le saluda la Hacienda de Domani.', time: '18:40' },
      { from: 'them', text: 'Recordatorio: la tesorería del Círculo revisa periódicamente los movimientos de Aurelios. Mantenga su billetera al día.', time: '18:41' },
      { from: 'them', text: 'No hay cargos pendientes en su cuenta. Buen juego.', time: '18:41' },
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
      { from: 'them', text: '¡Hola! Soy Lucía, de la mesa de Texas.', time: '21:03' },
      { from: 'them', text: 'Hay sillas libres y la noche está movida. ¿Te animas a una mano de Texas Hold’em?', time: '21:04' },
      { from: 'me', text: 'Puede que sí. Déjame ver mis fichas.', time: '21:05' },
      {
        from: 'them',
        text: 'Te guardo un asiento. Cuando quieras, entra a la mesa.',
        time: '21:05',
        action: { label: 'Ir a la mesa', to: '/casino' },
      },
    ],
  },
  {
    id: 'times',
    name: 'Domani Times',
    avatar: 'T',
    accent: 'linear-gradient(135deg,#4f9d6b,#2f6b48)',
    preview: 'La Casa del día reparte Aurelios a sus fieles',
    time: 'Hoy',
    messages: [
      { from: 'them', text: 'DOMANI TIMES — Edición de la noche', time: '20:00' },
      { from: 'them', text: 'Titular: La Casa del día reparte Aurelios a sus fieles. Los analistas señalan a las Casas más activas como favoritas de la semana.', time: '20:00' },
      { from: 'them', text: 'En breve: rumores sobre la apertura de El Mercado. El Círculo guarda silencio.', time: '20:01' },
    ],
  },
];

function useIsDesktop(): boolean {
  // Guardamos window por si el render ocurre fuera del navegador.
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
  const { profile } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = SEED.find((c) => c.id === openId) ?? null;
  const isDesktop = useIsDesktop();

  // En móvil mostramos UNA columna a la vez: lista -> (tap) -> conversación.
  const showList = isDesktop || !open;
  const showChat = open !== null;

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
        {/* ----- Lista de conversaciones ----- */}
        {showList && (
        <div style={listPane()}>
          {SEED.map((c) => (
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

        {/* ----- Conversación abierta ----- */}
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
              {open.messages.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}
                >
                  <div style={m.from === 'me' ? bubbleMe : bubbleThem}>
                    <div>{m.text}</div>
                    {m.action && (
                      <Link to={m.action.to} style={bubbleAction}>{m.action.label}</Link>
                    )}
                    <div style={bubbleTime}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={composer}>
              <div style={composerInput}>
                Escribe a {open.name.split(' ')[0]}…
              </div>
              <span style={composerHint}>v1 · solo lectura</span>
            </div>
          </div>
        )}

        {/* Estado vacío de escritorio cuando no hay chat abierto */}
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  paddingTop: 'env(safe-area-inset-top)',
};
const backLink: React.CSSProperties = {
  width: 72,
  fontSize: 13.5,
  color: '#d8b96b',
  textDecoration: 'none',
  fontWeight: 600,
};
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '.34em',
  textTransform: 'uppercase',
  color: '#9c7a3e',
  textAlign: 'center',
};
function twoPane(hasOpen: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: hasOpen ? 'minmax(0, 340px) 1fr' : '1fr',
    gap: 14,
    marginTop: '1.4rem',
    alignItems: 'stretch',
  };
}
function listPane(): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };
}
const convRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 10,
  borderRadius: 14,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  cursor: 'pointer',
  width: '100%',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const convRowActive: React.CSSProperties = {
  borderColor: 'rgba(201,163,91,.55)',
  background: 'linear-gradient(135deg, rgba(201,163,91,.10), rgba(255,255,255,.02))',
};
const convAvatar: React.CSSProperties = {
  flex: '0 0 auto',
  width: 46,
  height: 46,
  borderRadius: '50%',
  display: 'grid',
  placeContent: 'center',
  fontFamily: 'Marcellus, serif',
  fontSize: 19,
  color: '#1a1405',
  fontWeight: 700,
};
const convTopline: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' };
const convName: React.CSSProperties = { fontSize: 15, color: '#f3eddd', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const convTime: React.CSSProperties = { fontSize: 11, color: 'rgba(232,226,212,.4)', flex: '0 0 auto' };
const convPreviewRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 };
const convPreview: React.CSSProperties = { fontSize: 12.5, color: 'rgba(232,226,212,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 };
const unreadDot: React.CSSProperties = {
  flex: '0 0 auto',
  minWidth: 20,
  height: 20,
  padding: '0 6px',
  borderRadius: 999,
  background: GOLD_GRAD,
  color: '#2c2415',
  fontSize: 11.5,
  fontWeight: 800,
  display: 'grid',
  placeContent: 'center',
};
const chatPane: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 16,
  border: '1px solid var(--line)',
  background: 'linear-gradient(160deg,#15131c,#100e16)',
  overflow: 'hidden',
  minHeight: '60vh',
};
const chatHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 12,
  borderBottom: '1px solid var(--line)',
  background: 'rgba(8,8,10,.35)',
};
const chatBackBtn: React.CSSProperties = {
  flex: '0 0 auto',
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid rgba(201,163,91,.3)',
  background: 'transparent',
  color: '#d8b96b',
  fontSize: 18,
  cursor: 'pointer',
};
const bubbleScroll: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};
const bubbleBase: React.CSSProperties = {
  maxWidth: '78%',
  padding: '10px 13px',
  borderRadius: 16,
  fontSize: 14,
  lineHeight: 1.42,
  color: '#ece6d6',
};
const bubbleThem: React.CSSProperties = {
  ...bubbleBase,
  background: 'var(--panel-2)',
  border: '1px solid var(--line)',
  borderTopLeftRadius: 4,
};
const bubbleMe: React.CSSProperties = {
  ...bubbleBase,
  background: 'linear-gradient(135deg, rgba(201,163,91,.22), rgba(201,163,91,.12))',
  border: '1px solid rgba(201,163,91,.4)',
  borderTopRightRadius: 4,
};
const bubbleTime: React.CSSProperties = { fontSize: 10, color: 'rgba(232,226,212,.4)', marginTop: 5, textAlign: 'right' };
const bubbleAction: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 8,
  padding: '7px 14px',
  borderRadius: 9,
  background: GOLD_GRAD,
  color: '#2c2415',
  fontSize: 12.5,
  fontWeight: 700,
  textDecoration: 'none',
};
const composer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 12,
  borderTop: '1px solid var(--line)',
  background: 'rgba(8,8,10,.35)',
};
const composerInput: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: 999,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  color: 'rgba(232,226,212,.45)',
  fontSize: 13.5,
};
const composerHint: React.CSSProperties = { fontSize: 10.5, color: 'rgba(232,226,212,.35)', flex: '0 0 auto' };
const emptyPane: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  padding: 24,
  borderRadius: 16,
  border: '1px dashed var(--line)',
  // Solo se ve útil en escritorio; en móvil la lista ya ocupa el ancho.
};
