import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getLedger, getWallet } from '../lib/api';
import type { LedgerTransaction, Wallet } from '../lib/types';

const REASON_LABELS: Record<string, string> = {
  renta_ciudadana: 'Renta Ciudadana',
  academy_reward: 'La Academia',
  game_win: 'Ganancia de juego',
  game_loss: 'Pérdida de juego',
  game_buyin: 'Entrada a mesa',
  tournament_buyin: 'Entrada a torneo',
  tournament_prize: 'Premio de torneo',
  property_buy: 'Compra de propiedad',
  property_sell: 'Venta de propiedad',
  property_rent: 'Renta de propiedad',
  tax: 'Impuesto',
  maintenance: 'Mantenimiento',
  promo_grant: 'Bono',
  admin_adjust: 'Ajuste',
  transfer_in_game: 'Transferencia en juego',
};

export function DomanibankScreen() {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWallet(user.id), getLedger(user.id, 12)])
      .then(([w, l]) => {
        setWallet(w);
        setLedger(l);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const alias = profile?.alias ?? 'Ciudadano';

  return (
    <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={topRow}>
        <Link to="/" style={backLink}>← Volver</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={eyebrow}>Banco</div>
          <h1 className="page-title" style={{ margin: '2px 0 0' }}>Domanibank</h1>
        </div>
        <div style={{ width: 72 }} />
      </div>

      {/* ===== Tarjeta de cuenta ===== */}
      <div style={accountCard}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(0,0,0,.55)' }}>
            Cuenta de
          </div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#2c2412', marginTop: 2 }}>{alias}</div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, marginTop: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(0,0,0,.55)' }}>
            Saldo disponible
          </div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 38, color: '#2c2412', lineHeight: 1.1 }}>
            ⟡ {loading ? '—' : wallet?.balance ?? 0}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.5)', marginTop: 4 }}>Aurelios · moneda de fantasía</div>
        </div>
      </div>

      {/* ===== Desglose ===== */}
      <div style={breakdownGrid}>
        <div className="panel" style={miniPanel}>
          <span className="muted" style={{ fontSize: 12 }}>Ganados (mérito)</span>
          <div style={miniVal}>{wallet?.balance_earned ?? 0}</div>
        </div>
        <div className="panel" style={miniPanel}>
          <span className="muted" style={{ fontSize: 12 }}>Promocionales</span>
          <div style={miniVal}>{wallet?.balance_promo ?? 0}</div>
        </div>
        <div className="panel" style={miniPanel}>
          <span className="muted" style={{ fontSize: 12 }}>Retenidos</span>
          <div style={miniVal}>{wallet?.balance_locked ?? 0}</div>
        </div>
      </div>

      {/* ===== Acciones (placeholder) ===== */}
      <div style={actionsRow}>
        <div style={actionCard}>
          <div style={actionTitle}>Solicitar crédito</div>
          <div style={actionDesc}>Adelanta Aurelios contra tu Influencia.</div>
          <span style={soonPill}>Próximamente</span>
        </div>
        <div style={actionCard}>
          <div style={actionTitle}>Hipotecar una propiedad</div>
          <div style={actionDesc}>Pon a trabajar tus bienes en Domani.</div>
          <span style={soonPill}>Próximamente</span>
        </div>
      </div>

      {/* ===== Movimientos ===== */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h3 style={{ margin: '0 0 12px', fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#ece6d6' }}>
          Últimos movimientos
        </h3>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : ledger.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Aún no hay movimientos. Reclama tu Renta o juega para empezar a mover Aurelios.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ledger.map((tx) => (
              <div key={tx.id} style={movRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#ece6d6' }}>{REASON_LABELS[tx.reason] ?? tx.reason}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(232,226,212,.45)' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    flex: '0 0 auto',
                    color: tx.amount >= 0 ? '#8ae0a8' : '#ff8a8a',
                  }}
                >
                  {tx.amount >= 0 ? '+' : ''}
                  {tx.amount}
                </div>
              </div>
            ))}
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
const backLink: React.CSSProperties = { width: 72, fontSize: 13.5, color: '#d8b96b', textDecoration: 'none', fontWeight: 600 };
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' };

const accountCard: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  marginTop: '1.4rem',
  borderRadius: 18,
  padding: 22,
  background: 'linear-gradient(135deg,#f7e7ad 0%,#dcb761 30%,#a8843f 60%,#f0d489 80%,#8a6730 100%)',
  border: '1px solid rgba(255,255,255,.4)',
  boxShadow: '0 22px 50px -22px rgba(0,0,0,.85)',
};
const breakdownGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
  marginTop: 14,
};
const miniPanel: React.CSSProperties = { padding: '1rem 1.2rem' };
const miniVal: React.CSSProperties = { fontSize: 24, fontFamily: 'Marcellus,serif', color: '#ecd9a5', marginTop: 4 };

const actionsRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  marginTop: 14,
};
const actionCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 14,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  opacity: 0.85,
};
const actionTitle: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 17, color: '#f3eddd' };
const actionDesc: React.CSSProperties = { fontSize: 12.5, color: 'rgba(232,226,212,.6)', margin: '4px 0 12px', lineHeight: 1.4 };
const soonPill: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: 11,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'rgba(236,230,214,.75)',
  border: '1px solid rgba(201,163,91,.35)',
  background: 'rgba(8,8,10,.35)',
};
const movRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '11px 0',
  borderBottom: '1px solid var(--line)',
};
