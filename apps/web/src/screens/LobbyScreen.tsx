import { useEffect, useState } from 'react';
import { getLobbyPlayers, listHouses, avatarSrc, type LobbyPlayer } from '../lib/api';
import type { House } from '../lib/types';

const RANK_LABELS: Record<string, string> = {
  ciudadano_nuevo: 'C. Nuevo',
  ciudadano_activo: 'C. Activo',
  ciudadano_reconocido: 'C. Reconocido',
  ciudadano_patricio: 'C. Patricio',
  consigliere: 'Consigliere',
  don: 'Don',
};

export function LobbyScreen() {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [houses, setHouses] = useState<Record<string, House>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLobbyPlayers(100), listHouses()]).then(([ps, hs]) => {
      setPlayers(ps);
      setHouses(Object.fromEntries(hs.map((h) => [h.id, h])));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">El Círculo</h1>
      <p className="muted">
        {loading ? 'Miembros de la sociedad, ordenados por Influencia.' : `${players.length} miembros visibles · ordenados por Influencia. El salón nunca duerme.`}
      </p>

      <div className="panel">
        {loading ? (
          <p className="muted">Cargando miembros…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Miembro</th>
                <th>Casa</th>
                <th>Rango</th>
                <th style={{ textAlign: 'right' }}>Influencia</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                      <img
                        src={avatarSrc(p.avatar_code)}
                        alt=""
                        width={30}
                        height={30}
                        loading="lazy"
                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', background: 'radial-gradient(120% 120% at 50% 20%, #2a2438, #14111d 75%)', border: '1px solid rgba(201,163,91,.3)', flex: '0 0 auto' }}
                      />
                      <span>{p.alias}</span>
                    </span>
                  </td>
                  <td className="muted">
                    {p.house_id ? houses[p.house_id]?.name ?? '—' : '—'}
                  </td>
                  <td>
                    <span className="pill">{RANK_LABELS[p.rank] ?? p.rank}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{p.influence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
