import { useRef, type ReactNode } from 'react';

// Carrusel horizontal con flechas (escritorio). En móvil se desliza con el dedo
// y las flechas se ocultan vía CSS.
export function Carousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="carousel-wrap">
      <button className="carousel-arrow left" onClick={() => scroll(-1)} aria-label="Anterior">
        ‹
      </button>
      <div className="carousel-track" ref={ref}>
        {children}
      </div>
      <button className="carousel-arrow right" onClick={() => scroll(1)} aria-label="Siguiente">
        ›
      </button>
    </div>
  );
}
