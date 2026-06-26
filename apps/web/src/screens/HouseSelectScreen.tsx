import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { chooseHouse, listHouses } from '../lib/api';
import type { House } from '../lib/types';
import { HouseCrest, HOUSE_CRESTS } from '../components/HouseCrest';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

export function HouseSelectScreen() {
  const { refreshProfile, signOut } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listHouses()
      .then((hs) => {
        // ordena según el orden visual del diseño
        const order = ['bacata', 'empire', 'plata', 'morro', 'roma', 'osaka', 'aztlan'];
        hs.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
        setHouses(hs);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await chooseHouse(selected);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo elegir la ciudad');
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '60px 24px 120px',
        background: 'radial-gradient(120% 70% at 50% -10%, #181922 0%, #08080a 55%)',
        fontFamily: "'Hanken Grotesk',sans-serif",
        color: '#ece6d6',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 44px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.42em', textTransform: 'uppercase', color: '#9c7a3e' }}>
          Jura lealtad
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(38px,6vw,56px)', lineHeight: 1.05, margin: '12px 0 10px', color: '#f3eddd' }}>
          Elige tu ciudad
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(232,226,212,.6)' }}>
          Tu ciudad es tu bandera en el Círculo. Define tu identidad y tus rivales. Elige con cuidado.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 20,
          maxWidth: 1080,
          margin: '0 auto',
        }}
      >
        {houses.map((h) => {
          const crest = HOUSE_CRESTS[h.code] ?? { initial: h.name.charAt(5) || 'D' };
          const isSel = selected === h.code;
          return (
            <button
              key={h.id}
              onClick={() => setSelected(h.code)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 14,
                padding: '28px 20px 24px',
                borderRadius: 18,
                cursor: 'pointer',
                background: isSel
                  ? 'linear-gradient(180deg, rgba(201,163,91,.14), rgba(201,163,91,.04))'
                  : 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015))',
                border: isSel ? '1px solid rgba(201,163,91,.7)' : '1px solid rgba(255,255,255,.09)',
                boxShadow: isSel ? '0 18px 44px -20px rgba(201,163,91,.5)' : '0 14px 34px -24px rgba(0,0,0,.8)',
                transition: 'transform .15s ease, border-color .15s ease, box-shadow .15s ease',
                transform: isSel ? 'translateY(-3px)' : 'none',
                color: 'inherit',
                fontFamily: 'inherit',
              }}
            >
              <HouseCrest {...crest} size={92} />
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9c7a3e' }}>{h.city}</div>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#f3eddd', marginTop: 4 }}>
                  {h.name.replace(/^Casa /, '')}
                </div>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: 15, color: 'rgba(232,226,212,.7)', lineHeight: 1.35, minHeight: 40 }}>
                “{h.motto}”
              </div>
              <div style={{ fontSize: 11, color: 'rgba(232,226,212,.45)' }}>{h.specialty}</div>
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: '#ff8a8a', textAlign: 'center', marginTop: 20 }}>{error}</p>}

      {/* barra de confirmación fija */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '16px 24px',
          background: 'linear-gradient(180deg, transparent, rgba(8,8,10,.95) 40%)',
        }}
      >
        <span style={{ color: 'rgba(232,226,212,.7)', fontSize: 14 }}>
          {selected ? (
            <>
              Elegiste <strong style={{ color: '#ecd9a5' }}>{houses.find((h) => h.code === selected)?.name}</strong>
            </>
          ) : (
            'Selecciona una ciudad para continuar'
          )}
        </span>
        <button
          onClick={confirm}
          disabled={!selected || busy}
          style={{
            padding: '13px 32px',
            borderRadius: 12,
            border: 'none',
            background: GOLD_GRAD,
            color: '#2c2415',
            fontWeight: 700,
            fontSize: 15,
            cursor: !selected || busy ? 'default' : 'pointer',
            opacity: !selected || busy ? 0.45 : 1,
            boxShadow: '0 14px 34px -12px rgba(201,163,91,.55)',
          }}
        >
          {busy ? 'Uniéndote…' : 'Unirme a esta ciudad'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(232,226,212,.4)' }}>
          Salir
        </button>
      </div>
    </div>
  );
}
