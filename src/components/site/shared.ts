import { useEffect, useRef, useState } from "react";

/** Bola de futebol usada em títulos, transições e faixas. */
export const BALL_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#F5F5F7"/><path fill="#111" d="m12 7.2 3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path fill="none" stroke="#111" stroke-width="1" d="M12 1.2v6M15.3 9.6l5.6-1.9M14 13.5l3.4 4.7M10 13.5l-3.4 4.7M8.7 9.6 3.1 7.7"/></svg>';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Adiciona a classe "in" quando o elemento entra na tela (uma única vez),
 * igual ao observer de entradas do HTML original.
 */
export function useInClass<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}
