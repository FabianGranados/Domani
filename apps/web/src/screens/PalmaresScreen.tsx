// =============================================================================
// Mi Palmarés — cuarto de trofeos de ajedrez
// -----------------------------------------------------------------------------
// Un trofeo por cada uno de los 5 retadores (Teo..El Encapuchado). Se desbloquea
// al ganarle por primera vez; debajo, victorias/intentos. Tres grados por número
// de victorias: 🥉 Bronce (1), 🥈 Plata (10), 🥇 Oro (25).
// =============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChessTrophies, type ChessTrophy } from '../lib/api';

type Challenger = { key: string; name: string; title: string; casa: string; level: number; img: string };

const CHALLENGERS: Challenger[] = [
  { key: 'teo', name: 'Teo', title: 'Aprendiz', casa: 'Bacatá', level: 1, img: '/assets/trofeo-teo.webp' },
  { key: 'vera', name: 'Vera', title: 'Estratega', casa: 'Imperia', level: 2, img: '/assets/trofeo-vera.webp' },
  { key: 'severo', name: 'Severo', title: 'Maestro', casa: 'Edoria', level: 3, img: '/assets/trofeo-severo.webp' },
  { key: 'aurelio', name: 'Don Aurelio', title: 'Gran Maestro', casa: 'Severia', level: 4, img: '/assets/trofeo-aurelio.webp' },
  { key: 'encapuchado', name: 'El Encapuchado', title: 'Campeón Mundial', casa: 'Severia', level: 5, img: '/assets/trofeo-encapuchado.webp' },
];

const GRADES = [
  { min: 25, label: 'Oro', color: '#e8c45a', glow: 'rgba(232,196,90,.55)' },
  { min: 10, label: 'Plata', color: '#cdd3da', glow: 'rgba(205,211,218,.45)' },
  { min: 1, label: 'Bronce', color: '#cd8a52', glow: 'rgba(205,138,82,.45)' },
];
function gradeFor(wins: number) { return GRADES.find((g) => wins >= g.min) ?? null; }
function nextGrade(wins: number) { return [...GRADES].reverse().find((g) => wins < g.min) ?? null; }

export function PalmaresScreen() {
  const [trophies, setTrophies] = useState<Record<string, ChessTrophy>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChessTrophies()
      .then((rows) => {
        const map: Record<string, ChessTrophy> = {};
        rows.forEach((r) => { map[r.challenger] = r; });
        setTrophies(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ganados = CHALLENGERS.filter((c) => (trophies[c.key]?.wins ?? 0) > 0).length;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 4px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Mi Palmarés</h1>
        <Link to="/ajedrez" style={{ color: '#c8a86a', fontSize: 13, textDecoration: 'none' }}>♟ Ir a jugar →</Link>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        Cuarto de trofeos · {ganados}/{CHALLENGERS.length} retadores vencidos.
        Gánale a cada uno para ganar su trofeo; 10 victorias suben a plata, 25 a oro.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 18 }}>
        {CHALLENGERS.map((c) => {
          const t = trophies[c.key];
          const wins = t?.wins ?? 0;
          const attempts = t?.attempts ?? 0;
          const unlocked = wins > 0;
          const grade = gradeFor(wins);
          const next = nextGrade(wins);
          return (
            <div key={c.key} style={{
              background: '#171410', border: `1px solid ${unlocked ? (grade?.color ?? '#3a3327') + '66' : '#2a261f'}`,
              borderRadius: 14, padding: 14, textAlign: 'center',
              boxShadow: unlocked && grade ? `0 0 22px ${grade.glow}` : 'none',
            }}>
              <div style={{ position: 'relative', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={c.img}
                  alt={`Trofeo ${c.name}`}
                  style={{
                    maxWidth: '100%', maxHeight: 150, objectFit: 'contain',
                    filter: unlocked ? 'none' : 'grayscale(1) brightness(.35)',
                    opacity: unlocked ? 1 : 0.5, transition: 'all .3s',
                  }}
                />
                {!unlocked && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 30 }}>🔒</span>
                  </div>
                )}
                {unlocked && grade && (
                  <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 11, fontWeight: 700, color: '#161310', background: grade.color, borderRadius: 999, padding: '2px 9px' }}>
                    {grade.label}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 8 }}>
                <strong style={{ color: '#e8dcc0', fontSize: 15 }}>{c.name}</strong>
                <div style={{ fontSize: 11, color: '#8a7f68' }}>Nivel {c.level} · {c.title} · {c.casa}</div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12 }}>
                {unlocked ? (
                  <>
                    <span style={{ color: '#c8a86a', fontWeight: 700 }}>{wins}</span>
                    <span style={{ color: '#8a7f68' }}> ganadas / {attempts} jugadas</span>
                  </>
                ) : (
                  <span style={{ color: '#8a7f68' }}>{attempts > 0 ? `${attempts} intentos · aún sin vencer` : 'Sin enfrentar'}</span>
                )}
              </div>

              {unlocked && next && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 5, background: '#2a2620', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round((wins / next.min) * 100))}%`, height: '100%', background: next.color }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#7a7160', marginTop: 3 }}>{next.min - wins} para {next.label}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loading && <p className="muted" style={{ marginTop: 16 }}>Cargando…</p>}
    </div>
  );
}
