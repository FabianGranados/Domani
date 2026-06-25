import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  getLedger,
  getWallet,
  getActiveLoan,
  bankCreditQuote,
  bankTakeLoan,
  bankRepay,
  type CreditQuote,
  type Loan,
} from '../lib/api';
import type { LedgerTransaction, Wallet } from '../lib/types';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

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
  loan_disburse: 'Crédito desembolsado',
  loan_repay: 'Abono a crédito',
};

export function DomanibankScreen() {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [quote, setQuote] = useState<CreditQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [w, l, ln, q] = await Promise.all([
      getWallet(user.id),
      getLedger(user.id, 12),
      getActiveLoan(user.id),
      bankCreditQuote(),
    ]);
    setWallet(w);
    setLedger(l);
    setLoan(ln);
    setQuote(q);
  }, [user]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const alias = profile?.alias ?? 'Ciudadano';
  const cupo = quote?.cupo ?? 0;

  async function takeLoan() {
    const n = Math.floor(Number(amount));
    if (!n || n <= 0) return setMsg({ kind: 'err', text: 'Escribe un monto válido.' });
    if (n > cupo) return setMsg({ kind: 'err', text: `Tu cupo es ⟡ ${fmt(cupo)}.` });
    setBusy(true);
    setMsg(null);
    try {
      const r = await bankTakeLoan(n);
      setAmount('');
      setMsg({ kind: 'ok', text: `Crédito aprobado. Debes ⟡ ${fmt(r.outstanding)} (vence ${r.due_date}).` });
      await refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'No se pudo procesar el crédito.' });
    } finally {
      setBusy(false);
    }
  }

  async function repay() {
    const n = Math.floor(Number(amount));
    if (!n || n <= 0) return setMsg({ kind: 'err', text: 'Escribe un monto válido.' });
    setBusy(true);
    setMsg(null);
    try {
      const r = await bankRepay(n);
      setAmount('');
      setMsg({
        kind: 'ok',
        text: r.status === 'paid' ? '¡Crédito saldado! Quedas libre de deuda.' : `Abonaste. Te falta ⟡ ${fmt(r.outstanding)}.`,
      });
      await refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'No se pudo abonar.' });
    } finally {
      setBusy(false);
    }
  }

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
          <div style={cardKicker}>Cuenta de</div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#2c2412', marginTop: 2 }}>{alias}</div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, marginTop: 18 }}>
          <div style={cardKicker}>Saldo disponible</div>
          <div style={{ fontFamily: 'Marcellus,serif', fontSize: 38, color: '#2c2412', lineHeight: 1.1 }}>
            ⟡ {loading ? '—' : fmt(wallet?.balance ?? 0)}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.5)', marginTop: 4 }}>Aurelios · moneda de fantasía</div>
        </div>
      </div>

      {/* ===== Desglose ===== */}
      <div style={breakdownGrid}>
        <div className="panel" style={miniPanel}>
          <span className="muted" style={{ fontSize: 12 }}>Ganados (mérito)</span>
          <div style={miniVal}>{fmt(wallet?.balance_earned ?? 0)}</div>
        </div>
        <div className="panel" style={miniPanel}>
          <span className="muted" style={{ fontSize: 12 }}>Promocionales</span>
          <div style={miniVal}>{fmt(wallet?.balance_promo ?? 0)}</div>
        </div>
        <div className="panel" style={miniPanel}>
          <span className="muted" style={{ fontSize: 12 }}>{loan ? 'Deuda activa' : 'Retenidos'}</span>
          <div style={{ ...miniVal, color: loan ? '#ff9a9a' : '#ecd9a5' }}>
            {loan ? fmt(loan.outstanding) : fmt(wallet?.balance_locked ?? 0)}
          </div>
        </div>
      </div>

      {/* ===== Crédito (real) ===== */}
      <div style={{ marginTop: 18 }}>
        {loan ? (
          <div style={creditPanel}>
            <div style={creditHead}>
              <div>
                <div style={creditEyebrow}>Crédito activo</div>
                <div style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd' }}>
                  Debes ⟡ {fmt(loan.outstanding)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 11.5 }}>Vence</div>
                <div style={{ fontSize: 14, color: '#ece6d6' }}>{loan.due_date}</div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12.5, margin: '2px 0 14px' }}>
              Pediste ⟡ {fmt(loan.principal)} · interés {(loan.interest_bps / 100).toFixed(0)}% · total ⟡ {fmt(loan.total_due)}
            </div>
            <div style={inputRow}>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Monto a abonar"
                style={moneyInput}
              />
              <button onClick={repay} disabled={busy} style={primaryBtn}>
                {busy ? '…' : 'Abonar'}
              </button>
              <button
                onClick={() => setAmount(String(Math.min(loan.outstanding, wallet?.balance ?? 0)))}
                style={ghostMini}
              >
                Máx
              </button>
            </div>
          </div>
        ) : (
          <div style={creditPanel}>
            <div style={creditEyebrow}>Línea de crédito</div>
            <div style={{ fontFamily: 'Marcellus,serif', fontSize: 24, color: '#f3eddd', marginTop: 2 }}>
              Cupo disponible: ⟡ {fmt(cupo)}
            </div>
            <div className="muted" style={{ fontSize: 12.5, margin: '4px 0 14px' }}>
              Calculado por tu saldo e Influencia. Devuelves el monto +15% en 30 días.
            </div>
            {cupo > 0 ? (
              <div style={inputRow}>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={`Hasta ${fmt(cupo)}`}
                  style={moneyInput}
                />
                <button onClick={takeLoan} disabled={busy} style={primaryBtn}>
                  {busy ? '…' : 'Solicitar'}
                </button>
                <button onClick={() => setAmount(String(cupo))} style={ghostMini}>Máx</button>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Tu cupo es 0 por ahora. Sube tu saldo o tu Influencia para habilitar crédito.
              </p>
            )}
          </div>
        )}

        {msg && (
          <div style={{ ...noticeBox, ...(msg.kind === 'ok' ? noticeOk : noticeErr) }}>{msg.text}</div>
        )}

        {/* Hipoteca — pendiente de propiedades */}
        <div style={{ ...actionCard, marginTop: 12 }}>
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
                <div style={{ fontSize: 15, fontWeight: 700, flex: '0 0 auto', color: tx.amount >= 0 ? '#8ae0a8' : '#ff8a8a' }}>
                  {tx.amount >= 0 ? '+' : ''}
                  {fmt(tx.amount)}
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
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  paddingTop: 'env(safe-area-inset-top)',
};
const backLink: React.CSSProperties = { width: 72, fontSize: 13.5, color: '#d8b96b', textDecoration: 'none', fontWeight: 600 };
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' };
const cardKicker: React.CSSProperties = { fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(0,0,0,.55)' };

const accountCard: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', marginTop: '1.4rem', borderRadius: 18, padding: 22,
  background: 'linear-gradient(135deg,#f7e7ad 0%,#dcb761 30%,#a8843f 60%,#f0d489 80%,#8a6730 100%)',
  border: '1px solid rgba(255,255,255,.4)', boxShadow: '0 22px 50px -22px rgba(0,0,0,.85)',
};
const breakdownGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 14,
};
const miniPanel: React.CSSProperties = { padding: '1rem 1.2rem' };
const miniVal: React.CSSProperties = { fontSize: 24, fontFamily: 'Marcellus,serif', color: '#ecd9a5', marginTop: 4 };

const creditPanel: React.CSSProperties = {
  padding: 18, borderRadius: 16, border: '1px solid rgba(201,163,91,.28)',
  background: 'linear-gradient(160deg,#1a1626,#13111b)',
};
const creditEyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#9c7a3e' };
const creditHead: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 };
const inputRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const moneyInput: React.CSSProperties = {
  flex: 1, minWidth: 120, padding: '11px 14px', borderRadius: 11, border: '1px solid var(--line)',
  background: 'var(--panel)', color: '#ece6d6', fontSize: 15, fontFamily: "'Hanken Grotesk',sans-serif",
};
const primaryBtn: React.CSSProperties = {
  padding: '11px 20px', borderRadius: 11, border: 'none', cursor: 'pointer',
  background: GOLD_GRAD, color: '#2c2415', fontWeight: 800, fontSize: 14,
};
const ghostMini: React.CSSProperties = {
  padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
  border: '1px solid rgba(201,163,91,.4)', background: 'transparent', color: '#d8b96b', fontWeight: 700, fontSize: 13,
};
const noticeBox: React.CSSProperties = { marginTop: 12, padding: '11px 14px', borderRadius: 11, fontSize: 13.5 };
const noticeOk: React.CSSProperties = { border: '1px solid rgba(126,224,166,.5)', background: 'rgba(126,224,166,.12)', color: '#9fddb8' };
const noticeErr: React.CSSProperties = { border: '1px solid rgba(255,138,138,.5)', background: 'rgba(255,138,138,.12)', color: '#ffb3b3' };

const actionCard: React.CSSProperties = {
  padding: 16, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--panel)', opacity: 0.85,
};
const actionTitle: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 17, color: '#f3eddd' };
const actionDesc: React.CSSProperties = { fontSize: 12.5, color: 'rgba(232,226,212,.6)', margin: '4px 0 12px', lineHeight: 1.4 };
const soonPill: React.CSSProperties = {
  display: 'inline-block', padding: '6px 14px', borderRadius: 999, fontSize: 11, letterSpacing: '.08em',
  textTransform: 'uppercase', fontWeight: 700, color: 'rgba(236,230,214,.75)',
  border: '1px solid rgba(201,163,91,.35)', background: 'rgba(8,8,10,.35)',
};
const movRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  padding: '11px 0', borderBottom: '1px solid var(--line)',
};
