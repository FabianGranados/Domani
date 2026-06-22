import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { answerQuestion, getRandomQuestion, type AcademyAnswerResult } from '../lib/api';
import type { AcademyQuestion } from '../lib/types';

export function AcademyScreen() {
  const { refreshProfile } = useAuth();
  const [question, setQuestion] = useState<AcademyQuestion | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<AcademyAnswerResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setResult(null);
    setChosen(null);
    setQuestion(await getRandomQuestion());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function answer(i: number) {
    if (!question || result) return;
    setChosen(i);
    setBusy(true);
    try {
      const r = await answerQuestion(question.id, i);
      setResult(r);
      if (r.reward_aurelios > 0) await refreshProfile();
    } finally {
      setBusy(false);
    }
  }

  if (!question) {
    return (
      <div>
        <h1 className="page-title">La Academia</h1>
        <p className="muted">No hay preguntas disponibles.</p>
      </div>
    );
  }

  const options = (question.options as string[]) ?? [];

  return (
    <div>
      <h1 className="page-title">La Academia</h1>
      <p className="muted">
        El conocimiento es destreza. Responde y gana Aurelios e Influencia por mérito.
      </p>

      <div className="panel" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: '0.6rem' }}>
          <span className="pill">{question.category}</span>{' '}
          <span className="pill">{question.difficulty}</span>{' '}
          <span className="pill">
            ⟡ {question.reward_aurelios} · +{question.reward_influence} infl.
          </span>
        </div>
        <h3>{question.prompt}</h3>
        <div className="grid" style={{ marginTop: '1rem' }}>
          {options.map((opt, i) => {
            let cls = 'btn secondary';
            if (result) {
              if (i === result.correct_index) cls = 'btn';
              else if (i === chosen) cls = 'btn secondary';
            }
            return (
              <button
                key={i}
                className={cls}
                disabled={busy || !!result}
                onClick={() => answer(i)}
                style={{ marginTop: 0, textAlign: 'left' }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {result && (
          <div style={{ marginTop: '1rem' }}>
            {result.is_correct ? (
              <p className="ok">
                ¡Correcto!{' '}
                {result.reward_aurelios > 0
                  ? `+${result.reward_aurelios} Aurelios, +${result.reward_influence} Influencia.`
                  : 'Ya habías ganado la recompensa de esta pregunta.'}
              </p>
            ) : (
              <p className="error">Respuesta incorrecta. La correcta estaba marcada.</p>
            )}
            <button className="btn" onClick={load}>
              Siguiente pregunta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
