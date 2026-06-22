import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getWallet, listHouses } from '../lib/api';
import type { House } from '../lib/types';
import { HouseCrest, HOUSE_CRESTS } from '../components/HouseCrest';

const RANK_LABELS: Record<string, string> = {
  ciudadano_nuevo: 'Ciudadano Nuevo',
  ciudadano_activo: 'Ciudadano Activo',
  ciudadano_reconocido: 'Ciudadano Reconocido',
  ciudadano_patricio: 'Ciudadano Patricio',
  consigliere: 'Consigliere',
  don: 'Don',
};

export function TesseraScreen() {
  const { profile, user } = useAuth();
  const [house, setHouse] = useState<House | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) getWallet(user.id).then((w) => setBalance(w?.balance ?? 0));
    listHouses().then((hs) => setHouse(hs.find((h) => h.id === profile?.house_id) ?? null));
  }, [user, profile?.house_id]);

  if (!profile) return null;
  const crest = house ? HOUSE_CRESTS[house.code] : undefined;

  return (
    <div>
      <h1 className="page-title">Tu Tessera</h1>
      <p className="muted" style={{ marginTop: '-0.6rem', marginBottom: '1.6rem' }}>
        Tu credencial en el Círculo. Llévala con honor.
      </p>

      <div
        style={{
          position: 'relative',
          maxWidth: 460,
          borderRadius: 20,
          padding: 2,
          background: 'conic-gradient(from 140deg,#6f5226,#f4e0a0 68deg,#c9a35b 140deg,#8c6a32 208deg,#f7e7ad 290deg,#7a5a26)',
          boxShadow: '0 26px 60px -26px rgba(0,0,0,.85)',
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 18,
            overflow: 'hidden',
            background: 'linear-gradient(160deg, #211b2e, #14111c)',
            padding: '26px 26px 22px',
          }}
        >
          {/* sheen */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent)',
              animation: 'domShimmer 6s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {crest ? (
              <HouseCrest {...crest} size={76} />
            ) : (
              <div style={{ width: 76, height: 90 }} />
            )}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9c7a3e' }}>
                Miembro del Círculo
              </div>
              <div style={{ fontFamily: 'Marcellus,serif', fontSize: 28, color: '#f3eddd', marginTop: 2 }}>
                {profile.alias}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(232,226,212,.6)', marginTop: 2 }}>
                {house ? `${house.name} · ${house.city}` : '—'}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(201,163,91,.25)', margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
            <TesseraRow label="Rango" value={RANK_LABELS[profile.rank] ?? profile.rank} />
            <TesseraRow label="Influencia" value={String(profile.influence)} />
            <TesseraRow label="Aurelios" value={`⟡ ${balance ?? '—'}`} gold />
            <TesseraRow label="Membresía" value={profile.membership} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TesseraRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9c7a3e' }}>{label}</div>
      <div style={{ fontSize: 17, color: gold ? '#ecd9a5' : '#ece6d6', marginTop: 3, fontWeight: gold ? 700 : 500 }}>
        {value}
      </div>
    </div>
  );
}
