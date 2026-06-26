import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAvatarMarket, setAvatar, type MarketAvatar, type SetAvatarResult } from '../lib/api';

// ============================================================
// Mercado de Avatares. El alias nombra al avatar: aquí NO hay nombre por
// avatar, solo CATEGORÍAS (el precio lo define la categoría). 10 avatares de
// bienvenida — el usuario escoge 1 gratis. Los que aún no tienen arte se
// muestran como "Próximamente".
// ============================================================
const fmt = (n: number) => n.toLocaleString('es-CO');

interface Props {
  alias: string;
  balance: number | null;
  onChanged: (r: SetAvatarResult) => void;
}

interface CatGroup {
  code: string;
  label: string;
  price: number;
  sort: number;
  items: MarketAvatar[];
}

export function AvatarMarket({ alias, balance, onChanged }: Props) {
  const [list, setList] = useState<MarketAvatar[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await getAvatarMarket());
    } catch {
      setErr('No pudimos cargar el mercado.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const freePick = list?.some((a) => a.free_pick_available) ?? false;
  const starters = useMemo(() => (list ?? []).filter((a) => a.is_starter), [list]);

  // Mercado pagado: agrupado por categoría (excluye los starters cuando aún
  // se está en el momento de bienvenida gratis).
  const groups = useMemo<CatGroup[]>(() => {
    const src = (list ?? []).filter((a) => !(freePick && a.is_starter));
    const map = new Map<string, CatGroup>();
    for (const a of src) {
      let g = map.get(a.category);
      if (!g) { g = { code: a.category, label: a.category_label, price: a.category_price, sort: a.category_sort, items: [] }; map.set(a.category, g); }
      g.items.push(a);
    }
    return [...map.values()].sort((x, y) => x.sort - y.sort);
  }, [list, freePick]);

  async function act(a: MarketAvatar) {
    if (busy || !a.image_ready || a.equipped) return;
    setBusy(a.code); setErr(null);
    try {
      const r = await setAvatar(a.code);
      onChanged(r);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setErr(/saldo/i.test(msg) ? 'Saldo insuficiente para este avatar.' : 'No se pudo cambiar el avatar.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={eyebrow}>Mercado de Avatares</div>
        <h3 style={title}>{alias}</h3>
        <p className="muted" style={{ margin: '2px auto 0', maxWidth: 360, fontSize: 12.5 }}>
          {freePick
            ? <>Escoge tu avatar de <strong style={{ color: '#7ee0a6' }}>bienvenida — gratis</strong>. Después puedes comprar otros por categoría.</>
            : <>Compra un nuevo rostro según su categoría. Los que ya posees, los equipas gratis.</>}
        </p>
        <div style={{ marginTop: 6, fontSize: 12, color: '#d8b96b' }}>Saldo: ⟡ {balance == null ? '—' : fmt(balance)}</div>
      </div>

      {err && <div style={errBox}>{err}</div>}

      {!list ? (
        <div style={grid}>{Array.from({ length: 8 }).map((_, i) => <div key={i} style={skeleton} />)}</div>
      ) : (
        <div style={{ maxHeight: '56vh', overflowY: 'auto', padding: 2 }}>
          {/* Bienvenida: los 10 starters, 1 gratis */}
          {freePick && (
            <section style={{ marginBottom: 18 }}>
              <Header label="Bienvenida" note="Elige 1 · gratis" accent="#7ee0a6" />
              <div style={grid}>
                {starters.map((a) => <AvatarCard key={a.code} a={a} busy={busy === a.code} onClick={() => act(a)} />)}
              </div>
            </section>
          )}

          {/* Mercado por categoría */}
          {groups.map((g) => (
            <section key={g.code} style={{ marginBottom: 18 }}>
              <Header label={g.label} note={`⟡ ${fmt(g.price)}`} />
              <div style={grid}>
                {g.items.map((a) => <AvatarCard key={a.code} a={a} busy={busy === a.code} onClick={() => act(a)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ label, note, accent }: { label: string; note: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 9px' }}>
      <span style={{ fontSize: 11, letterSpacing: '.28em', textTransform: 'uppercase', color: accent ?? '#bfa05a' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: accent ?? '#d8b96b' }}>{note}</span>
    </div>
  );
}

function AvatarCard({ a, busy, onClick }: { a: MarketAvatar; busy: boolean; onClick: () => void }) {
  const locked = !a.image_ready;
  let label: string;
  let tone: 'equip' | 'own' | 'buy' | 'free' | 'soon';
  if (a.equipped) { label = 'Equipado ✓'; tone = 'equip'; }
  else if (locked) { label = 'Pronto'; tone = 'soon'; }
  else if (a.owned) { label = 'Equipar'; tone = 'own'; }
  else if (a.effective_cost === 0) { label = 'Elegir'; tone = 'free'; }
  else { label = `⟡ ${fmt(a.effective_cost)}`; tone = 'buy'; }

  return (
    <div style={{ ...card, ...(a.equipped ? cardActive : null) }}>
      <div style={portraitWrap}>
        {locked
          ? <div style={silhouette}>?</div>
          : <img src={a.image_path} alt="" style={portrait} />}
        {a.owned && !a.equipped && <span style={ownedDot}>✓</span>}
      </div>
      <button onClick={onClick} disabled={a.equipped || locked || busy} style={btn(tone)}>
        {busy ? '…' : label}
      </button>
    </div>
  );
}

// ---- estilos ----
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#bfa05a' };
const title: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd', margin: '4px 0 0' };
const errBox: React.CSSProperties = {
  margin: '0 0 12px', padding: '8px 12px', borderRadius: 10, fontSize: 12.5, textAlign: 'center',
  background: 'rgba(255,138,138,.12)', border: '1px solid rgba(255,138,138,.3)', color: '#ffb4b4',
};
const grid: React.CSSProperties = {
  display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
};
const skeleton: React.CSSProperties = { aspectRatio: '0.82 / 1', borderRadius: 14, background: 'rgba(255,255,255,.04)' };
const card: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: 7,
  borderRadius: 14, border: '1px solid rgba(201,163,91,.18)', background: 'rgba(255,255,255,.02)',
};
const cardActive: React.CSSProperties = {
  border: '1px solid rgba(126,224,166,.6)', background: 'rgba(126,224,166,.07)',
  boxShadow: '0 0 0 1px rgba(126,224,166,.25), 0 12px 28px -16px rgba(0,0,0,.8)',
};
const portraitWrap: React.CSSProperties = {
  position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 11, overflow: 'hidden',
  // Fondo plano detrás de los avatares transparentes.
  background: 'radial-gradient(120% 120% at 50% 20%, #2a2438 0%, #14111d 75%)',
};
const portrait: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const silhouette: React.CSSProperties = {
  width: '100%', height: '100%', display: 'grid', placeItems: 'center',
  fontFamily: 'Marcellus,serif', fontSize: 28, color: 'rgba(201,163,91,.35)',
};
const ownedDot: React.CSSProperties = {
  position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: '50%',
  display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#0b1d12',
  background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)',
};

function btn(tone: 'equip' | 'own' | 'buy' | 'free' | 'soon'): React.CSSProperties {
  const base: React.CSSProperties = {
    width: '100%', padding: '6px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Hanken Grotesk',sans-serif", border: '1px solid transparent', lineHeight: 1,
  };
  switch (tone) {
    case 'equip': return { ...base, background: 'rgba(126,224,166,.14)', color: '#9ff0bf', border: '1px solid rgba(126,224,166,.4)', cursor: 'default' };
    case 'own':   return { ...base, background: 'rgba(255,255,255,.06)', color: '#ece6d6', border: '1px solid rgba(201,163,91,.35)' };
    case 'free':  return { ...base, background: 'linear-gradient(135deg,#9ff0bf,#4fbf83)', color: '#0b1d12' };
    case 'buy':   return { ...base, background: 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)', color: '#1a1509' };
    case 'soon':  return { ...base, background: 'rgba(255,255,255,.03)', color: 'rgba(232,226,212,.35)', border: '1px dashed rgba(201,163,91,.25)', cursor: 'not-allowed' };
  }
}
