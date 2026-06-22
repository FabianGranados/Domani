// Isologo "D" de DOMANI — emblema de marca en CSS puro (sin imagen).
// Anillo dorado cónico + esfera roja radial + letra "D" en Marcellus.
// Tamaños usados: 38px (nav), 70–76px (hero/login).

export function Isologo({ size = 76, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {glow && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 1.7,
            height: size * 1.7,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,163,91,.4), transparent 66%)',
            transform: 'translate(-50%,-50%)',
            animation: 'domGlow 4.5s ease-in-out infinite',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          padding: Math.max(5, size * 0.09),
          boxSizing: 'border-box',
          background:
            'conic-gradient(from 140deg,#6f5226 0deg,#f4e0a0 68deg,#c9a35b 140deg,#8c6a32 208deg,#f7e7ad 290deg,#7a5a26 360deg)',
          boxShadow:
            '0 0 34px rgba(201,163,91,.22),0 12px 28px -8px rgba(0,0,0,.65),inset 0 1px 1px rgba(255,255,255,.55),inset 0 -2px 3px rgba(0,0,0,.35)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'radial-gradient(circle at 36% 30%, rgba(230,96,116,.72), rgba(150,28,46,.84) 56%, rgba(70,12,26,.96) 100%)',
            boxShadow:
              'inset 0 2px 9px rgba(255,255,255,.22),inset 0 -7px 15px rgba(0,0,0,.55),inset 0 0 0 1.5px rgba(255,222,184,.35)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: size * 0.1,
              left: size * 0.17,
              width: size * 0.32,
              height: size * 0.21,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,.55), transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
          <span
            style={{
              position: 'relative',
              fontFamily: 'Marcellus, serif',
              fontSize: size * 0.45,
              color: '#f1d896',
              textShadow: '0 1px 2px rgba(0,0,0,.5),0 0 12px rgba(201,163,91,.45)',
            }}
          >
            D
          </span>
        </div>
      </div>
    </div>
  );
}
