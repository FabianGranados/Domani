import { useState } from 'react';

// ============================================================
// Valente, el maestro de Domani. Burbuja de diálogo que explica el
// mundo y, al tocar el "?", abre preguntas frecuentes que él responde.
// Hoy las respuestas son guionadas; mañana se conecta al chat para que
// responda cualquier pregunta en vivo.
// ============================================================
const VALENTE_IMG = '/assets/valente-maestro.webp';

const WELCOME =
  '¡Bienvenido a Domani! Esto no es solo un casino: es una ciudad para vivir. Juegas, concursas, mueves tu dinero en Domanibank y te haces un nombre — todo con Aurelios, fichas de fantasía. Soy Valente; si algo no te cuadra, toca el “?” y te explico.';

const QA: { q: string; a: string }[] = [
  {
    q: '¿Cómo se juega el parqués?',
    a: 'El parqués es una carrera de 4 fichas. Sacas ficha de la cárcel con un 5, avanzas con los dados y, si caes donde hay un rival, te lo comes y vuelve al inicio. Gana quien lleva sus 4 fichas a la meta.',
  },
  {
    q: '¿Qué es una mano de poker?',
    a: 'Tu “mano” es la mejor jugada de 5 cartas, combinando tus 2 cartas con las 5 de la mesa. De menor a mayor: pareja, dobles, trío, escalera, color, full… Quien tenga la más alta —o haga retirar a todos— se lleva el pozo.',
  },
  {
    q: '¿Qué hago con mis Aurelios?',
    a: 'Son tu vida en Domani: éntrale a una mesa, concursa en La Academia, pide crédito en Domanibank o guárdalos para crecer. No valen dinero real: son para jugar el mundo.',
  },
];

export function ValenteCoach() {
  const [msg, setMsg] = useState(WELCOME);
  const [isAnswer, setIsAnswer] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  function ask(i: number) {
    setMsg(QA[i].a);
    setIsAnswer(true);
  }
  function back() {
    setMsg(WELCOME);
    setIsAnswer(false);
  }

  return (
    <div style={wrap}>
      <div style={chalk} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <div style={eyebrow}>Valente · tu maestro</div>

        {/* Burbuja de diálogo */}
        <div style={bubble}>
          <span style={tail} />
          <p style={{ margin: 0 }}>{msg}</p>
          {isAnswer && (
            <button onClick={back} style={backBtn}>← Volver</button>
          )}
        </div>

        {/* Control: "?" + preguntas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setHelpOpen((v) => !v)} style={qBtn(helpOpen)} aria-label="Preguntas para Valente">?</button>
          <span style={{ fontSize: 12.5, color: 'rgba(232,226,212,.6)' }}>
            {helpOpen ? 'Elige una duda…' : 'Pregúntale a Valente'}
          </span>
        </div>

        {helpOpen && (
          <div style={chipsRow}>
            {QA.map((item, i) => (
              <button key={i} onClick={() => ask(i)} style={chip}>{item.q}</button>
            ))}
          </div>
        )}
      </div>

      <div style={portraitWrap}>
        <img src={VALENTE_IMG} alt="Valente" style={portrait} />
      </div>
    </div>
  );
}

// ---- estilos ----
const wrap: React.CSSProperties = {
  position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'stretch', gap: 16,
  padding: 20, borderRadius: 18, border: '1px solid rgba(201,163,91,.3)',
  background: 'radial-gradient(90% 130% at 0% 0%, rgba(31,58,46,.55), transparent 55%), linear-gradient(120deg,#15181a,#100e12)',
  boxShadow: '0 20px 50px -28px rgba(0,0,0,.9)',
};
const chalk: React.CSSProperties = {
  position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none',
  background: 'repeating-linear-gradient(90deg, transparent 0 38px, rgba(255,255,255,.5) 38px 39px)',
};
const eyebrow: React.CSSProperties = { fontSize: 10.5, letterSpacing: '.28em', textTransform: 'uppercase', color: '#9c7a3e', marginBottom: 8 };
const bubble: React.CSSProperties = {
  position: 'relative', padding: '14px 16px', borderRadius: 14, borderTopLeftRadius: 4,
  background: 'rgba(20,24,22,.7)', border: '1px solid rgba(201,163,91,.28)',
  color: '#ece6d6', fontSize: 14.5, lineHeight: 1.5, maxWidth: 560,
};
const tail: React.CSSProperties = {
  position: 'absolute', top: 14, left: -7, width: 14, height: 14, transform: 'rotate(45deg)',
  background: 'rgba(20,24,22,.7)', borderLeft: '1px solid rgba(201,163,91,.28)', borderBottom: '1px solid rgba(201,163,91,.28)',
};
const backBtn: React.CSSProperties = {
  marginTop: 10, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  border: '1px solid rgba(201,163,91,.4)', background: 'transparent', color: '#d8b96b',
};
function qBtn(open: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 17, fontWeight: 800,
    border: 'none', color: '#2c2415',
    background: open ? 'linear-gradient(135deg,#3fe0a0,#1eb178)' : 'linear-gradient(135deg,#ecd28e,#c9a35b 55%,#a8843f)',
    boxShadow: '0 4px 12px -4px rgba(0,0,0,.5)',
  };
}
const chipsRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 };
const chip: React.CSSProperties = {
  padding: '8px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5,
  border: '1px solid rgba(201,163,91,.4)', background: 'rgba(201,163,91,.08)', color: '#ecd9a5',
  fontFamily: "'Hanken Grotesk',sans-serif",
};
const portraitWrap: React.CSSProperties = {
  position: 'relative', zIndex: 1, flex: '0 0 auto', width: 'clamp(104px, 26vw, 190px)',
  borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(201,163,91,.35)', alignSelf: 'stretch', minHeight: 150,
};
const portrait: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center',
};
