import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  getMillonQuestions,
  startMillon,
  answerMillon,
  retireMillon,
  type MillonQuestion,
  type MillonAnswerResult,
} from '../lib/api';

const GOLD_GRAD = 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)';

// Escalera de premios (solo para mostrar; el servidor es la autoridad).
const LADDER = [500, 1000, 2000, 5000, 10000, 20000, 40000, 80000, 150000, 300000, 600000, 1000000];
const FLOOR_STEPS = new Set([4, 8, 12]); // escalones con piso garantizado

const fmt = (n: number) => n.toLocaleString('es-CO');
const LETTERS = ['A', 'B', 'C', 'D'];

function useIsDesktop(): boolean {
  const query = '(min-width: 860px)';
  const [v, setV] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const on = () => setV(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return v;
}

type Phase = 'loading' | 'error' | 'playing' | 'revealed' | 'ended' | 'already';

export function MillonaureliosScreen() {
  const { profile } = useAuth();
  const isDesktop = useIsDesktop();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [playId, setPlayId] = useState<string | null>(null);

  // Una pregunta elegida por escalón para esta sesión.
  const [byStep, setByStep] = useState<Record<number, MillonQuestion>>({});
  const [step, setStep] = useState(1); // escalón en curso (1..12)
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState<MillonAnswerResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Resultado final (al terminar / al entrar ya jugado).
  const [endPrize, setEndPrize] = useState(0);
  const [endReached, setEndReached] = useState(0);
  const [endOutcome, setEndOutcome] = useState<'won' | 'busted' | 'retired'>('retired');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [qs, play] = await Promise.all([getMillonQuestions(), startMillon()]);
        if (!alive) return;

        // Elige una pregunta aleatoria por escalón.
        const grouped: Record<number, MillonQuestion[]> = {};
        for (const q of qs) (grouped[q.step] ??= []).push(q);
        const pick: Record<number, MillonQuestion> = {};
        for (let s = 1; s <= 12; s++) {
          const pool = grouped[s] ?? [];
          if (pool.length) pick[s] = pool[Math.floor(Math.random() * pool.length)];
        }
        setByStep(pick);

        if (play.status !== 'in_progress') {
          setEndPrize(play.prize);
          setEndReached(play.correct_count);
          setEndOutcome(play.status as 'won' | 'busted' | 'retired');
          setPhase('already');
          return;
        }
        setPlayId(play.play_id);
        setStep(play.correct_count + 1);
        setPhase('playing');
      } catch (e) {
        if (!alive) return;
        setErrMsg(e instanceof Error ? e.message : 'No se pudo abrir el concurso.');
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = byStep[step];
  const securedNow = step > 1 ? LADDER[step - 2] : 0; // asegurado al estar en este escalón
  const playingFor = LADDER[step - 1];

  async function confirmAnswer() {
    if (selected == null || !current || !playId || busy) return;
    setBusy(true);
    try {
      const res = await answerMillon(playId, current.id, selected);
      setReveal(res);
      setPhase('revealed');
      if (res.status === 'won' || res.status === 'busted') {
        setEndPrize(res.prize_awarded);
        setEndReached(res.status === 'won' ? 12 : step - 1);
        setEndOutcome(res.status);
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Error al responder.');
      setPhase('error');
    } finally {
      setBusy(false);
    }
  }

  function nextStep() {
    setReveal(null);
    setSelected(null);
    setStep((s) => s + 1);
    setPhase('playing');
  }

  async function doRetire() {
    if (!playId || busy) return;
    setBusy(true);
    try {
      const res = await retireMillon(playId);
      setEndPrize(res.prize);
      setEndReached(res.correct_count);
      setEndOutcome('retired');
      setPhase('ended');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Error al plantarse.');
      setPhase('error');
    } finally {
      setBusy(false);
    }
  }

  // ---------- Render ----------
  return (
    <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={topRow}>
        <Link to="/" style={backLink}>← Volver</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={eyebrow}>Concurso</div>
          <h1 className="page-title" style={{ margin: '2px 0 0' }}>Millonaurelios</h1>
        </div>
        <div style={{ width: 72 }} />
      </div>

      {phase === 'loading' && <p className="muted" style={{ marginTop: 24 }}>Preparando el atril…</p>}
      {phase === 'error' && (
        <div className="panel" style={{ marginTop: 20, padding: 20 }}>
          <p style={{ margin: 0, color: '#ff9a9a' }}>{errMsg}</p>
          <Link to="/" style={{ ...enterBtn, marginTop: 14, display: 'inline-block' }}>Volver al Escritorio</Link>
        </div>
      )}

      {(phase === 'already' || phase === 'ended') && (
        <EndCard
          outcome={endOutcome}
          prize={endPrize}
          reached={endReached}
          alreadyToday={phase === 'already'}
          alias={profile?.alias ?? 'Ciudadano'}
        />
      )}

      {(phase === 'playing' || phase === 'revealed') && current && (
        <div style={playGrid(isDesktop)}>
          {/* ----- Zona de juego ----- */}
          <div>
            <div style={statusBanner}>
              <span style={stepPill}>Escalón {step}/12</span>
              <span style={bannerItem}>Asegurado <strong style={{ color: '#ecd9a5' }}>⟡ {fmt(securedNow)}</strong></span>
              <span style={bannerItem}>Juegas por <strong style={{ color: '#7ee0a6' }}>⟡ {fmt(playingFor)}</strong></span>
            </div>

            <div style={questionCard}>
              <div style={catTag}>{current.category}</div>
              <div style={questionText}>{current.prompt}</div>
            </div>

            <div style={optionsGrid(isDesktop)}>
              {current.options.map((opt, i) => {
                const isSel = selected === i;
                const revealed = phase === 'revealed' && reveal;
                const isCorrect = revealed && reveal!.correct_index === i;
                const isWrongPick = revealed && isSel && !reveal!.is_correct;
                return (
                  <button
                    key={i}
                    disabled={phase === 'revealed' || busy}
                    onClick={() => setSelected(i)}
                    style={optionBtn(isSel, !!isCorrect, !!isWrongPick)}
                  >
                    <span style={optLetter(isSel, !!isCorrect, !!isWrongPick)}>{LETTERS[i]}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* ----- Acciones ----- */}
            {phase === 'playing' && (
              <div style={actionsRow}>
                <button
                  onClick={confirmAnswer}
                  disabled={selected == null || busy}
                  style={{ ...finalBtn, opacity: selected == null ? 0.5 : 1 }}
                >
                  {busy ? 'Confirmando…' : 'Respuesta final'}
                </button>
                {step > 1 && (
                  <button onClick={doRetire} disabled={busy} style={retireBtn}>
                    Plantarme · cobrar ⟡ {fmt(securedNow)}
                  </button>
                )}
              </div>
            )}

            {phase === 'revealed' && reveal && (
              <div style={{ marginTop: 16 }}>
                {reveal.is_correct && reveal.status === 'in_progress' && (
                  <div>
                    <div style={revealOk}>¡Correcto! Aseguras ⟡ {fmt(LADDER[step - 1])}.</div>
                    <button onClick={nextStep} style={finalBtn}>Siguiente escalón →</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ----- Escalera de premios ----- */}
          <Ladder step={step} isDesktop={isDesktop} />
        </div>
      )}
    </div>
  );
}

// ============================================================
function Ladder({ step, isDesktop }: { step: number; isDesktop: boolean }) {
  const rows = useMemo(() => [...Array(12).keys()].map((i) => 12 - i), []); // 12..1
  return (
    <div style={ladderWrap(isDesktop)}>
      <div style={ladderTitle}>Escalera</div>
      {rows.map((s) => {
        const active = s === step;
        const passed = s < step;
        const isFloor = FLOOR_STEPS.has(s);
        return (
          <div key={s} style={ladderRow(active, passed, isFloor)}>
            <span style={ladderNum}>{s}</span>
            <span style={{ flex: 1 }}>⟡ {fmt(LADDER[s - 1])}</span>
            {isFloor && <span style={floorMark} title="Piso garantizado">★</span>}
          </div>
        );
      })}
    </div>
  );
}

function EndCard({
  outcome,
  prize,
  reached,
  alreadyToday,
  alias,
}: {
  outcome: 'won' | 'busted' | 'retired';
  prize: number;
  reached: number;
  alreadyToday: boolean;
  alias: string;
}) {
  const title =
    outcome === 'won' ? '¡El Millonaurelio!' : outcome === 'retired' ? 'Te plantaste' : 'Se acabó';
  const sub =
    outcome === 'won'
      ? `${alias}, llegaste a la cima.`
      : outcome === 'busted'
        ? `Fallaste en el escalón ${reached + 1}.`
        : `Cobraste en el escalón ${reached}.`;
  return (
    <div style={endCard}>
      <div style={endGlow(outcome)} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, letterSpacing: '.3em', textTransform: 'uppercase', color: '#9c7a3e' }}>
          {alreadyToday ? 'Ya jugaste hoy' : 'Resultado'}
        </div>
        <h2 style={{ fontFamily: 'Marcellus,serif', fontSize: 32, color: '#f3eddd', margin: '8px 0 2px' }}>
          {title}
        </h2>
        <p className="muted" style={{ margin: '0 0 18px' }}>{sub}</p>

        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(232,226,212,.5)' }}>
          Premio
        </div>
        <div style={{ fontFamily: 'Marcellus,serif', fontSize: 46, color: '#ecd9a5', lineHeight: 1.1 }}>
          ⟡ {fmt(prize)}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <Link to="/" style={enterBtn}>Volver al Escritorio</Link>
          <Link to="/banco" style={ghostBtn}>Ver en Domanibank</Link>
        </div>
        {alreadyToday && (
          <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
            El concurso se renueva mañana. Vuelve por el siguiente Millonaurelio.
          </p>
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

function playGrid(isDesktop: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: isDesktop ? 'minmax(0,1fr) 240px' : '1fr',
    gap: 18,
    marginTop: '1.4rem',
    alignItems: 'start',
  };
}
const statusBanner: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)',
  background: 'rgba(8,8,10,.3)', marginBottom: 14,
};
const stepPill: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 999, background: GOLD_GRAD, color: '#2c2415',
  fontSize: 12.5, fontWeight: 800,
};
const bannerItem: React.CSSProperties = { fontSize: 13, color: 'rgba(232,226,212,.7)' };

const questionCard: React.CSSProperties = {
  position: 'relative', padding: '22px 20px', borderRadius: 16,
  border: '1px solid rgba(201,163,91,.28)',
  background: 'linear-gradient(160deg,#1a1626,#13111b)',
  boxShadow: '0 18px 44px -26px rgba(0,0,0,.9)',
};
const catTag: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9c7a3e', marginBottom: 8,
};
const questionText: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond',serif", fontSize: 25, lineHeight: 1.3, color: '#f3eddd',
};
function optionsGrid(isDesktop: boolean): React.CSSProperties {
  return {
    display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 10, marginTop: 14,
  };
}
function optionBtn(sel: boolean, correct: boolean, wrong: boolean): React.CSSProperties {
  let border = '1px solid var(--line)';
  let bg = 'var(--panel)';
  if (correct) { border = '1px solid rgba(126,224,166,.7)'; bg = 'rgba(126,224,166,.14)'; }
  else if (wrong) { border = '1px solid rgba(255,138,138,.7)'; bg = 'rgba(255,138,138,.14)'; }
  else if (sel) { border = '1px solid rgba(201,163,91,.7)'; bg = 'rgba(201,163,91,.12)'; }
  return {
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12,
    border, background: bg, color: '#ece6d6', fontSize: 15, cursor: 'pointer',
    fontFamily: "'Hanken Grotesk',sans-serif", textAlign: 'left', width: '100%',
    transition: 'background .15s, border-color .15s',
  };
}
function optLetter(sel: boolean, correct: boolean, wrong: boolean): React.CSSProperties {
  let bg = 'rgba(201,163,91,.18)';
  let color = '#d8b96b';
  if (correct) { bg = 'rgba(126,224,166,.25)'; color = '#7ee0a6'; }
  else if (wrong) { bg = 'rgba(255,138,138,.25)'; color = '#ff9a9a'; }
  else if (sel) { bg = GOLD_GRAD; color = '#2c2415'; }
  return {
    flex: '0 0 auto', width: 30, height: 30, borderRadius: 8, display: 'grid', placeContent: 'center',
    fontFamily: 'Marcellus,serif', fontSize: 15, fontWeight: 700, background: bg, color,
  };
}
const actionsRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 };
const finalBtn: React.CSSProperties = {
  padding: '12px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: GOLD_GRAD, color: '#2c2415', fontWeight: 800, fontSize: 14.5,
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const retireBtn: React.CSSProperties = {
  padding: '12px 18px', borderRadius: 12, cursor: 'pointer',
  border: '1px solid rgba(201,163,91,.4)', background: 'transparent', color: '#d8b96b',
  fontWeight: 700, fontSize: 13.5,
};
const revealOk: React.CSSProperties = { color: '#7ee0a6', fontSize: 14.5, marginBottom: 12, fontWeight: 600 };

function ladderWrap(isDesktop: boolean): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', gap: 4, padding: 12, borderRadius: 14,
    border: '1px solid var(--line)', background: 'rgba(8,8,10,.3)',
    ...(isDesktop ? { position: 'sticky', top: 12 } : {}),
  };
}
const ladderTitle: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#9c7a3e',
  marginBottom: 6, paddingLeft: 4,
};
function ladderRow(active: boolean, passed: boolean, floor: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
    fontSize: 13, fontFamily: "'Hanken Grotesk',sans-serif",
    background: active ? GOLD_GRAD : passed ? 'rgba(126,224,166,.10)' : 'transparent',
    color: active ? '#2c2415' : passed ? '#9fddb8' : floor ? '#ecd9a5' : 'rgba(232,226,212,.6)',
    fontWeight: active || floor ? 700 : 500,
    border: active ? 'none' : '1px solid transparent',
  };
}
const ladderNum: React.CSSProperties = { width: 20, textAlign: 'right', opacity: 0.8, fontSize: 12 };
const floorMark: React.CSSProperties = { fontSize: 12 };

const endCard: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', marginTop: 24, padding: 28, borderRadius: 20,
  border: '1px solid rgba(201,163,91,.3)', background: 'linear-gradient(160deg,#181425,#100e17)',
  boxShadow: '0 24px 60px -30px rgba(0,0,0,.9)',
};
function endGlow(outcome: 'won' | 'busted' | 'retired'): React.CSSProperties {
  const c = outcome === 'won' ? 'rgba(236,210,142,.4)' : outcome === 'busted' ? 'rgba(255,138,138,.22)' : 'rgba(126,224,166,.22)';
  return { position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${c}, transparent 70%)` };
}
const enterBtn: React.CSSProperties = {
  display: 'inline-block', padding: '11px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700,
  background: GOLD_GRAD, color: '#2c2415', textDecoration: 'none', fontFamily: "'Hanken Grotesk',sans-serif",
};
const ghostBtn: React.CSSProperties = {
  display: 'inline-block', padding: '11px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700,
  border: '1px solid rgba(201,163,91,.4)', color: '#d8b96b', textDecoration: 'none',
};
