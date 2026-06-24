import { useEffect, useState } from 'react';

const STORAGE_KEY = 'domani:iosHintDismissed';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ se identifica como MacIntel pero tiene pantalla táctil.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  // Safari iOS expone navigator.standalone cuando la app está instalada.
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return mq || iosStandalone;
}

export function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isIos() || isStandalone()) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // localStorage no disponible (modo privado): mostramos igualmente.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignorar si no se puede persistir
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Instalar Domani"
      style={{
        position: 'fixed',
        left: '0.6rem',
        right: '0.6rem',
        bottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.7rem 0.9rem',
        borderRadius: '14px',
        border: '1px solid rgba(201, 162, 39, 0.45)',
        background: 'rgba(12, 11, 16, 0.86)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
        color: '#ece8f2',
        fontFamily: 'inherit',
        fontSize: '0.82rem',
        lineHeight: 1.35,
      }}
    >
      <span style={{ flex: 1 }}>
        <span aria-hidden="true">📲</span> Para pantalla completa, abre esto en Safari y toca{' '}
        Compartir → <span style={{ color: '#e3c75a', fontWeight: 600 }}>Añadir a pantalla de inicio</span>.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        style={{
          flex: '0 0 auto',
          width: '1.7rem',
          height: '1.7rem',
          borderRadius: '50%',
          border: '1px solid rgba(201, 162, 39, 0.45)',
          background: 'transparent',
          color: '#e3c75a',
          fontSize: '0.9rem',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}
