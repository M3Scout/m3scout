import { useRef, useState } from "react";
import { BALL_SVG, useInClass } from "./shared";

interface KickTitleProps {
  text: string;
  id?: string;
  /** índices (0-based) das palavras em vermelho */
  red?: number[];
  className?: string;
  /** "h1" usa o tamanho grande do topo das páginas internas */
  as?: "h1" | "h2";
}

/** Título com letras que quicam e uma bola como ponto final (embaixadinhas). */
export function KickTitle({ text, id, red = [], className = "", as = "h2" }: KickTitleProps) {
  const Tag = as;
  const [ref, inView] = useInClass<HTMLHeadingElement>();
  const [ready, setReady] = useState<Set<number>>(() => new Set());
  const [hop, setHop] = useState<Set<number>>(() => new Set());
  const [ballReady, setBallReady] = useState(false);
  const [kick, setKick] = useState(0);
  const [count, setCount] = useState(0);
  const ballRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>();

  const words = text.split(" ");
  let i = 0;
  const totalLetters = words.join("").length;

  const onKick = () => {
    if (!ballReady) return;
    const b = ballRef.current;
    if (b) {
      b.classList.remove("kick");
      void b.offsetWidth;
      b.classList.add("kick");
    }
    setKick((k) => k + 1);
    setCount((n) => n + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCount(0), 2200);
  };

  return (
    <Tag
      ref={ref}
      id={id}
      className={`kt ${as === "h2" ? "kt-h" : ""} ${className} ${inView ? "in" : ""}`}
      data-view=""
      aria-label={text}
    >
      {words.map((w, wi) => (
        <span className="kt-w" aria-hidden="true" key={wi}>
          {[...w].map((ch) => {
            const idx = i++;
            const cls = ["kt-l", red.includes(wi) ? "red" : "", ready.has(idx) ? "ready" : "", hop.has(idx) ? "hop" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <span
                key={idx}
                className={cls}
                style={{ ["--i" as string]: idx }}
                onAnimationEnd={() => {
                  setReady((s) => new Set(s).add(idx));
                  setHop((s) => {
                    const n = new Set(s);
                    n.delete(idx);
                    return n;
                  });
                }}
                onPointerEnter={() => {
                  if (ready.has(idx)) setHop((s) => new Set(s).add(idx));
                }}
              >
                {ch}
              </span>
            );
          })}
          {wi === words.length - 1 && (
            <button
              ref={ballRef}
              type="button"
              className={`kt-ball ${ballReady ? "ready" : ""}`}
              aria-label="Fazer embaixadinha"
              style={{ ["--bd" as string]: `${0.35 + totalLetters * 0.055}s` }}
              onAnimationEnd={(e) => {
                setBallReady(true);
                e.currentTarget.classList.remove("kick");
              }}
              onClick={onKick}
              data-kick={kick}
              dangerouslySetInnerHTML={{ __html: BALL_SVG }}
            />
          )}
        </span>
      ))}
      <span className={`kt-count ${count > 0 ? "on" : ""}`} aria-live="polite">
        {count === 0 ? "" : count === 1 ? "1 embaixadinha" : `${count} embaixadinhas`}
      </span>
    </Tag>
  );
}
