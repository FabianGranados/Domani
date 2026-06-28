// =============================================================================
// Mensajes — chat directo entre HUMANOS (estilo WhatsApp).
// Buscas a alguien por correo / alias / código y le escribes en tiempo real.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  findUser, dmHistory, dmSend, dmThreads, subscribeDM,
  avatarSrc, type FoundUser, type DM, type DMThread,
} from '../lib/api';

type Partner = { id: string; alias: string; avatar_code: string | null };

export function MensajesScreen() {
  const { session } = useAuth();
  const myId = session?.user?.id ?? '';

  const [threads, setThreads] = useState<DMThread[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [input, setInput] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<Partner | null>(null);
  partnerRef.current = partner;

  useEffect(() => { dmThreads().then(setThreads).catch(() => {}); }, []);

  // Tiempo real: mensajes entrantes.
  useEffect(() => {
    if (!myId) return;
    return subscribeDM(myId, (m) => {
      if (partnerRef.current && m.sender_id === partnerRef.current.id) {
        setMessages((ms) => [...ms, m]);
      }
      dmThreads().then(setThreads).catch(() => {});
    });
  }, [myId]);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true); setErr(null);
    try {
      const r = await findUser(q);
      setResults(r);
      if (r.length === 0) setErr('No encontré a nadie con ese correo/alias/código.');
    } catch { setErr('Error buscando.'); }
    finally { setSearching(false); }
  }

  async function openChat(p: Partner) {
    setPartner(p); setResults([]); setQuery(''); setMessages([]);
    try { setMessages(await dmHistory(p.id)); } catch { /* noop */ }
  }

  async function send() {
    const body = input.trim();
    if (!body || !partner) return;
    setInput('');
    try {
      const m = await dmSend(partner.id, body);
      setMessages((ms) => [...ms, m]);
      dmThreads().then(setThreads).catch(() => {});
    } catch { setErr('No se pudo enviar.'); }
  }

  // ---- Vista de conversación ----
  if (partner) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 4px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100svh - 90px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <button onClick={() => setPartner(null)} style={{ background: 'none', border: 'none', color: '#c8a86a', fontSize: 22, cursor: 'pointer' }}>‹</button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: '#2b2c34' }}>
            <img src={avatarSrc(partner.avatar_code)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <strong style={{ color: '#ece6d6', fontSize: 16 }}>{partner.alias}</strong>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 6px' }}>
          {messages.length === 0 && <div style={{ color: 'rgba(232,226,212,.4)', textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>Escríbele para empezar la conversación.</div>}
          {messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                <div style={{ padding: '8px 12px', borderRadius: 14, fontSize: 14, lineHeight: 1.35, color: mine ? '#16241c' : '#e8e2d0', background: mine ? 'linear-gradient(135deg,#9ff0bf,#4fbf83)' : 'rgba(255,255,255,.06)', border: mine ? 'none' : '1px solid rgba(255,255,255,.08)' }}>{m.body}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '8px 6px' }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder={`Mensaje para ${partner.alias}…`}
            style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#ece6d6', fontSize: 14, outline: 'none' }} />
          <button onClick={send} disabled={!input.trim()} style={{ padding: '11px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, color: '#16241c', background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', opacity: input.trim() ? 1 : 0.5 }}>Enviar</button>
        </div>
      </div>
    );
  }

  // ---- Lista + búsqueda ----
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 8px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Mensajes</h1>
        <Link to="/" style={{ color: '#a89a7e', fontSize: 13, textDecoration: 'none' }}>← volver</Link>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>Escríbele a otro humano. Búscalo por su correo, alias o código.</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
          placeholder="correo@ejemplo.com / alias / código"
          style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#ece6d6', fontSize: 14, outline: 'none' }} />
        <button onClick={doSearch} disabled={searching} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.12)', color: '#ecd9a5', fontWeight: 700, cursor: 'pointer' }}>Buscar</button>
      </div>
      {err && <div style={{ color: '#e0894f', fontSize: 13, marginTop: 8 }}>{err}</div>}

      {results.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e', marginBottom: 6 }}>Resultados</div>
          {results.map((u) => (
            <button key={u.id} onClick={() => openChat(u)} style={rowBtn}>
              <img src={avatarSrc(u.avatar_code)} alt="" style={rowAvatar} />
              <span style={{ color: '#ece6d6', fontWeight: 600 }}>{u.alias}</span>
              <span style={{ marginLeft: 'auto', color: '#c8a86a', fontSize: 13 }}>Escribir →</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e', margin: '18px 0 6px' }}>Conversaciones</div>
      {threads.length === 0 && <div style={{ color: 'rgba(232,226,212,.4)', fontStyle: 'italic' }}>Aún no tienes conversaciones. Busca a alguien arriba.</div>}
      {threads.map((t) => (
        <button key={t.partner_id} onClick={() => openChat({ id: t.partner_id, alias: t.alias, avatar_code: t.avatar_code })} style={rowBtn}>
          <img src={avatarSrc(t.avatar_code)} alt="" style={rowAvatar} />
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ color: '#ece6d6', fontWeight: 600 }}>{t.alias}</div>
            <div style={{ color: 'rgba(232,226,212,.5)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.last_body}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

const rowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', marginBottom: 6,
  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, cursor: 'pointer',
};
const rowAvatar: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#2b2c34', flexShrink: 0 };
