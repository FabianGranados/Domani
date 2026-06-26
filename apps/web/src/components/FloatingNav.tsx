import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ============================================================
// Lanzador de navegación global (espejo de la burbuja de Michat).
// Botón dorado abajo-izquierda: abre un menú rápido para moverse por
// el sitio desde cualquier pantalla. Siempre presente (menos en póker).
// ============================================================
const DESTINOS: { label: string; to: string; glyph: string }[] = [
  { label: 'Inicio', to: '/', glyph: '⌂' },
  { label: 'El Casino', to: '/casino', glyph: '♠' },
  { label: 'La Academia', to: '/millonaurelios', glyph: '🎓' },
  { label: 'Domanibank', to: '/banco', glyph: '⟡' },
];

function GridGlyph({ size = 24 }: { size?: number }) {
  const c = '#2c2415';
  const r = 2;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx={r} fill={c} />
      <rect x="14" y="3" width="7" height="7" rx={r} fill={c} />
      <rect x="3" y="14" width="7" height="7" rx={r} fill={c} />
      <rect x="14" y="14" width="7" height="7" rx={r} fill={c} />
    </svg>
  );
}

export function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (location.pathname.startsWith('/poker')) return null;
  const isHome = location.pathname === '/';

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <>
      {open && (
        <div style={panel}>
          <div style={panelTitle}>Ir a…</div>
          {DESTINOS.map((d) => {
            const active = d.to === '/' ? location.pathname === '/' : location.pathname.startsWith(d.to);
            return (
              <button key={d.to} onClick={() => go(d.to)} style={{ ...row, ...(active ? rowActive : null) }}>
                <span style={rowGlyph}>{d.glyph}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{d.label}</span>
                {active && <span style={{ fontSize: 11, color: '#d8b96b' }}>aquí</span>}
              </button>
            );
          })}
        </div>
      )}

      <div style={cluster}>
        {/* Flecha de volver (convive con el menú, mismo dorado) */}
        {!isHome && !open && (
          <button onClick={() => navigate(-1)} style={backBtn} aria-label="Volver atrás">←</button>
        )}
        <button onClick={() => setOpen((v) => !v)} style={bubble} aria-label="Navegar por Domani">
          <span style={specular} />
          {open ? <span style={{ fontSize: 26, color: '#2c2415', fontWeight: 300, lineHeight: 1 }}>×</span> : <GridGlyph />}
        </button>
      </div>
    </>
  );
}

// ---- estilos ----
const cluster: React.CSSProperties = {
  position: 'fixed', zIndex: 951,
  left: 'calc(env(safe-area-inset-left) + 18px)',
  bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
};
const bubble: React.CSSProperties = {
  position: 'relative', width: 58, height: 58, borderRadius: '50%', cursor: 'pointer',
  border: '1px solid rgba(255,240,200,.5)',
  background: 'radial-gradient(circle at 34% 28%, #f7e7ad, #d8b466 40%, #a8843f 78%, #7a5e2a 100%)',
  boxShadow: '0 12px 30px -8px rgba(120,90,30,.7), inset 0 3px 9px rgba(255,255,255,.5), inset 0 -7px 14px rgba(0,0,0,.35)',
  display: 'grid', placeItems: 'center',
};
const backBtn: React.CSSProperties = {
  width: 46, height: 46, borderRadius: '50%', cursor: 'pointer',
  border: '1px solid rgba(255,240,200,.5)',
  background: 'radial-gradient(circle at 34% 28%, #f7e7ad, #d8b466 42%, #a8843f 82%)',
  color: '#2c2415', fontSize: 21, fontWeight: 700, display: 'grid', placeItems: 'center',
  boxShadow: '0 8px 22px -8px rgba(120,90,30,.65), inset 0 2px 6px rgba(255,255,255,.45)',
};
const specular: React.CSSProperties = {
  position: 'absolute', top: 8, left: 13, width: 22, height: 13, borderRadius: '50%',
  background: 'radial-gradient(ellipse at center, rgba(255,255,255,.95), rgba(255,255,255,0) 70%)',
  filter: 'blur(0.5px)', pointerEvents: 'none',
};
const panel: React.CSSProperties = {
  position: 'fixed', zIndex: 950,
  left: 'calc(env(safe-area-inset-left) + 16px)',
  bottom: 'calc(env(safe-area-inset-bottom) + 86px)',
  width: 'min(240px, calc(100vw - 32px))',
  display: 'flex', flexDirection: 'column', gap: 2, padding: 8,
  borderRadius: 16, border: '1px solid rgba(201,163,91,.35)',
  background: 'linear-gradient(160deg,#1a1626,#100e16)',
  boxShadow: '0 26px 60px -22px rgba(0,0,0,.85)', animation: 'domSheetUp .2s ease-out',
};
const panelTitle: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9c7a3e', padding: '4px 10px 6px',
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 11,
  border: 'none', background: 'transparent', color: '#ece6d6', fontSize: 14.5, cursor: 'pointer',
  fontFamily: "'Hanken Grotesk',sans-serif", width: '100%',
};
const rowActive: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(201,163,91,.16), rgba(201,163,91,.05))',
};
const rowGlyph: React.CSSProperties = {
  flex: '0 0 auto', width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 15,
  background: 'rgba(201,163,91,.14)', color: '#ecd9a5', border: '1px solid rgba(201,163,91,.3)',
};
