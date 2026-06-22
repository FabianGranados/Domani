import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getLedger, getWallet } from '../lib/api';
import type { LedgerTransaction, Wallet } from '../lib/types';

const REASON_LABELS: Record<string, string> = {
  renta_ciudadana: 'Renta Ciudadana',
  academy_reward: 'La Academia',
  game_win: 'Ganancia de juego',
  game_loss: 'Pérdida de juego',
  game_buyin: 'Entrada a mesa',
  promo_grant: 'Bono',
  admin_adjust: 'Ajuste',
};

export function WalletScreen() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWallet(user.id), getLedger(user.id)]).then(([w, l]) => {
      setWallet(w);
      setLedger(l);
      setLoading(false);
    });
  }, [user]);

  return (
    <div>
      <h1 className="page-title">Billetera de Aurelios</h1>

      <div className="grid cols-3" style={{ marginBottom: '1.5rem' }}>
        <div className="panel">
          <span className="muted">Saldo total</span>
          <div className="aurelios" style={{ fontSize: '2rem' }}>
            ⟡ {wallet?.balance ?? 0}
          </div>
        </div>
        <div className="panel">
          <span className="muted">Ganados (mérito)</span>
          <div style={{ fontSize: '1.6rem' }}>{wallet?.balance_earned ?? 0}</div>
        </div>
        <div className="panel">
          <span className="muted">Promocionales (Renta)</span>
          <div style={{ fontSize: '1.6rem' }}>{wallet?.balance_promo ?? 0}</div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Historial de movimientos</h3>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : ledger.length === 0 ? (
          <p className="muted">Aún no hay movimientos. Reclama tu Renta o juega para empezar.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th style={{ textAlign: 'right' }}>Aurelios</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((tx) => (
                <tr key={tx.id}>
                  <td className="muted">{new Date(tx.created_at).toLocaleString()}</td>
                  <td>{REASON_LABELS[tx.reason] ?? tx.reason}</td>
                  <td
                    style={{ textAlign: 'right' }}
                    className={tx.amount >= 0 ? 'amount-pos' : 'amount-neg'}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
