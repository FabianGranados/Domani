// =============================================================================
// Salón de Ajedrez — el HUB simple. Tres caminos claros, sin menús enredados.
// =============================================================================

import { Link } from 'react-router-dom';

export function AjedrezSalonScreen() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '10px 12px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9c7a3e' }}>El Salón</div>
        <h1 className="page-title" style={{ margin: '4px 0 0' }}>Ajedrez</h1>
        <p className="muted" style={{ marginTop: 4 }}>Un movimiento. Una consecuencia.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link to="/ajedrez-online" style={{ ...card, background: 'linear-gradient(135deg,rgba(126,224,166,.14),rgba(126,224,166,.04))', borderColor: 'rgba(126,224,166,.4)' }}>
          <span style={{ fontSize: 34 }}>🤝</span>
          <div>
            <div style={cardTitle}>Jugar con un amigo</div>
            <div style={cardSub}>Invítalo por WhatsApp o reta a otra persona en vivo.</div>
          </div>
          <span style={arrow}>→</span>
        </Link>

        <Link to="/ajedrez/maquina" style={card}>
          <span style={{ fontSize: 34 }}>🤖</span>
          <div>
            <div style={cardTitle}>Jugar vs la máquina</div>
            <div style={cardSub}>5 niveles, del Aprendiz al Campeón Mundial.</div>
          </div>
          <span style={arrow}>→</span>
        </Link>

        <Link to="/palmares" style={card}>
          <span style={{ fontSize: 34 }}>🏆</span>
          <div>
            <div style={cardTitle}>Mi palmarés</div>
            <div style={cardSub}>Tus trofeos contra los 5 retadores.</div>
          </div>
          <span style={arrow}>→</span>
        </Link>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px', borderRadius: 16,
  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)',
  textDecoration: 'none', color: '#ece6d6',
};
const cardTitle: React.CSSProperties = { fontFamily: 'Marcellus,serif', fontSize: 19, color: '#ece6d6' };
const cardSub: React.CSSProperties = { fontSize: 12.5, color: 'rgba(232,226,212,.55)', marginTop: 2 };
const arrow: React.CSSProperties = { marginLeft: 'auto', color: '#c8a86a', fontSize: 20 };
