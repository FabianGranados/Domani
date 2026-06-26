import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  getAppConfig, adminSetConfig, adminPostNews, adminRunBotTick, adminMetrics,
  type AppConfig, type AdminMetrics,
} from '../lib/api';

const GOLD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';
const fmt = (n: number) => n.toLocaleString('es-CO');

export function AdminScreen() {
  const { profile } = useAuth();
  const [cfg, setCfg] = useState<AppConfig>({});
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [news, setNews] = useState('');
  const [newsKind, setNewsKind] = useState('city');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, m] = await Promise.all([getAppConfig().catch(() => ({})), adminMetrics().catch(() => null)]);
    setCfg(c); setMetrics(m);
  }, []);
  useEffect(() => { load(); }, [load]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 1800); }

  async function saveNum(key: string, raw: string) {
    const v = Number(raw);
    if (Number.isNaN(v)) return;
    try { await adminSetConfig(key, v); setCfg((c) => ({ ...c, [key]: v })); flash(`✓ ${key} = ${v}`); }
    catch (e) { flash(e instanceof Error ? e.message : 'Error'); }
  }
  async function saveBool(key: string, v: boolean) {
    try { await adminSetConfig(key, v); setCfg((c) => ({ ...c, [key]: v })); flash(`✓ ${key} = ${v}`); }
    catch (e) { flash(e instanceof Error ? e.message : 'Error'); }
  }
  async function runTick() {
    setBusy(true);
    try { await adminRunBotTick(); await load(); flash('✓ Ronda de bots ejecutada'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); }
  }
  async function postNews() {
    if (!news.trim()) return;
    setBusy(true);
    try { await adminPostNews(news.trim(), newsKind); setNews(''); flash('✓ Noticia publicada en DDN'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); }
  }

  if (!profile?.is_admin) {
    return <div style={{ padding: 40, color: '#ece6d6' }}><h1 className="page-title">Sala de Control</h1><p className="muted">No tienes acceso.</p></div>;
  }

  const num = (k: string, def = 0) => (typeof cfg[k] === 'number' ? (cfg[k] as number) : def);
  const bool = (k: string) => cfg[k] === true;

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ fontSize: 11, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>Solo el dueño</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Sala de Control</h1>
      <p className="muted" style={{ marginTop: 4 }}>Administra Domani sin tocar código. Los cambios toman efecto en vivo.</p>

      {/* Métricas */}
      <div style={metricRow}>
        <Metric label="Humanos" value={metrics ? fmt(metrics.humanos) : '—'} />
        <Metric label="Ciudadanos-bot" value={metrics ? fmt(metrics.bots) : '—'} />
        <Metric label="⟡ en circulación" value={metrics ? '⟡ ' + fmt(metrics.circulante) : '—'} />
        <Metric label="Noticias 24h" value={metrics ? fmt(metrics.noticias_24h) : '—'} />
        <Metric label="Mudanzas" value={metrics ? fmt(metrics.mudanzas) : '—'} />
        <Metric label="Avatares" value={metrics ? fmt(metrics.avatares) : '—'} />
      </div>

      {/* Vida de los bots */}
      <Section title="Vida de los ciudadanos">
        <Toggle label="Motor de vida activo" on={bool('bot_enabled')} onChange={(v) => saveBool('bot_enabled', v)} />
        <NumField label="Manos por ronda" k="bot_tick_hands" val={num('bot_tick_hands', 8)} onSave={saveNum} hint="Cuántas partidas simula cada latido (cada 5 min)" />
        <NumField label="Rake de la casa (0–1)" k="bot_rake_pct" val={num('bot_rake_pct', 0.1)} step="0.01" onSave={saveNum} hint="Comisión que la casa retira (sumidero). 0.10 = 10%" />
        <button onClick={runTick} disabled={busy} style={goldBtn}>Correr una ronda ahora</button>
      </Section>

      {/* DDN News */}
      <Section title="Publicar en DDN News">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={news} onChange={(e) => setNews(e.target.value)} placeholder="📣 Titular del día…" style={{ ...input, flex: 1, minWidth: 220 }} />
          <select value={newsKind} onChange={(e) => setNewsKind(e.target.value)} style={input}>
            <option value="city">Evento de ciudad</option>
            <option value="big_win">Destacado</option>
            <option value="chatter">Comentario</option>
          </select>
          <button onClick={postNews} disabled={busy || !news.trim()} style={goldBtn}>Publicar</button>
        </div>
      </Section>

      {/* Economía */}
      <Section title="Economía">
        <NumField label="Mudanza · % base" k="mudanza_base_pct" val={num('mudanza_base_pct', 0.1)} step="0.01" onSave={saveNum} hint="Impuesto de mudanza inicial (0.10 = 10%)" />
        <NumField label="Mudanza · escalada por mudanza" k="mudanza_step_pct" val={num('mudanza_step_pct', 0.05)} step="0.01" onSave={saveNum} />
        <NumField label="Mudanza · tope %" k="mudanza_cap_pct" val={num('mudanza_cap_pct', 0.3)} step="0.01" onSave={saveNum} />
        <NumField label="Mudanza · mínimo ⟡" k="mudanza_min_fee" val={num('mudanza_min_fee', 5000)} onSave={saveNum} />
        <NumField label="Mudanza · enfriamiento (días)" k="mudanza_cooldown_days" val={num('mudanza_cooldown_days', 30)} onSave={saveNum} />
        <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '6px 0' }} />
        <NumField label="Renta diaria · mín %" k="renta_min_pct" val={num('renta_min_pct', 0.03)} step="0.01" onSave={saveNum} hint="Fase A (aún no activa en juego)" />
        <NumField label="Renta diaria · máx %" k="renta_max_pct" val={num('renta_max_pct', 0.06)} step="0.01" onSave={saveNum} hint="Fase A" />
        <NumField label="Tope de juego (% del patrimonio)" k="game_play_cap_pct" val={num('game_play_cap_pct', 0.1)} step="0.01" onSave={saveNum} hint="Regla del 10% · Fase A" />
      </Section>

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCard}>
      <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(232,226,212,.5)' }}>{label}</div>
      <div style={{ fontFamily: 'Marcellus,serif', fontSize: 22, color: '#f3eddd', marginTop: 3 }}>{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionCard}>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#ece6d6', margin: '0 0 12px' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}
function NumField({ label, k, val, step, hint, onSave }: { label: string; k: string; val: number; step?: string; hint?: string; onSave: (k: string, v: string) => void }) {
  const [v, setV] = useState(String(val));
  useEffect(() => { setV(String(val)); }, [val]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13.5, color: '#ece6d6' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'rgba(232,226,212,.45)' }}>{hint}</div>}
      </div>
      <input type="number" step={step ?? '1'} value={v} onChange={(e) => setV(e.target.value)} style={{ ...input, width: 110 }} />
      <button onClick={() => onSave(k, v)} disabled={v === String(val)} style={{ ...saveBtn, opacity: v === String(val) ? 0.4 : 1 }}>Guardar</button>
    </div>
  );
}
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 13.5, color: '#ece6d6' }}>{label}</div>
      <button onClick={() => onChange(!on)} style={{ width: 52, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'linear-gradient(135deg,#9ff0bf,#4fbf83)' : 'rgba(255,255,255,.14)', position: 'relative', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
      </button>
    </div>
  );
}

// ---- estilos ----
const metricRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, margin: '20px 0' };
const metricCard: React.CSSProperties = { padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(201,163,91,.2)', background: 'rgba(255,255,255,.025)' };
const sectionCard: React.CSSProperties = { marginTop: 16, padding: '20px 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.02)' };
const input: React.CSSProperties = { padding: '10px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, color: '#ece6d6', fontSize: 14, fontFamily: "'Hanken Grotesk',sans-serif", outline: 'none' };
const goldBtn: React.CSSProperties = { alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 10, border: 'none', background: GOLD, color: '#2c2415', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const saveBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.12)', color: '#ecd9a5', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' };
const toastStyle: React.CSSProperties = { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80, padding: '11px 18px', borderRadius: 12, background: 'rgba(20,17,28,.96)', border: '1px solid rgba(201,163,91,.4)', color: '#f3eddd', fontSize: 13.5, boxShadow: '0 18px 40px -16px rgba(0,0,0,.8)' };
