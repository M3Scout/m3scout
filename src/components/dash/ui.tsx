import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import "./m3views.css";

/* =====================================================================
   Peças das telas do painel (painel.html) em React
   ===================================================================== */

/* ---------- posições ---------- */
const SHORT: Record<string, string> = {
  goleiro: "GOL", zagueiro: "ZAG", "lateral direito": "LD", "lateral esquerdo": "LE",
  volante: "VOL", meia: "MEI", "meia atacante": "MEA", "meio-campo": "MC", "meio campo": "MC",
  "ponta direita": "PD", "ponta esquerda": "PE", centroavante: "CA", atacante: "ATA",
};
const POS_COLOR: Record<string, string> = {
  GOL: "#BF5AF2", ZAG: "#30D158", LD: "#64D2FF", LE: "#64D2FF", VOL: "#FF9F0A",
  MC: "#FFD60A", MEI: "#FFD60A", MEA: "#FFD60A", PD: "#FF375F", PE: "#FF375F", CA: "#FF3B30", ATA: "#FF3B30",
};
export const shortPos = (p: string | null | undefined) => {
  if (!p) return "—";
  const k = p.trim().toLowerCase();
  return SHORT[k] ?? (p.length <= 3 ? p.toUpperCase() : p.slice(0, 3).toUpperCase());
};
export const posColor = (p: string | null | undefined) => POS_COLOR[shortPos(p)] ?? "#8E8E93";
export const TIER_COLOR: Record<string, string> = { S: "#FFD60A", A: "#30D158", B: "#0A84FF", C: "#8E8E93", D: "#FF453A" };
export const scoreColor = (s: number | null | undefined) =>
  s == null ? "#8E8E93" : s >= 65 ? "#30D158" : s >= 55 ? "#FFD60A" : s >= 48 ? "#FF9F0A" : "#FF3B30";

export const fmt = (v: number | null | undefined, d = 0) =>
  v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const initials = (name: string) => {
  const p = name.split(" ").filter(Boolean);
  if (!p.length) return "?";
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
};

/* ---------- entra na tela ---------- */
export function useSeen<T extends Element>(threshold = 0.2) {
  const [el, setEl] = useState<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [el, seen, threshold]);
  return [setEl, seen] as const;
}

/* ---------- título com letras que caem ---------- */
export function Title({ text, count }: { text: string; count?: number | null }) {
  let i = 0;
  const words = text.split(" ");
  return (
    <h1 className="ttl" aria-label={count != null ? `${text}, ${count}` : text}>
      <span aria-hidden="true" style={{ display: "contents" }}>
        {words.map((w, wi) => (
          <span className="w" key={wi}>
            {[...w].map((ch) => <span className="l" key={i} style={{ ["--i" as string]: i++ }}>{ch}</span>)}
          </span>
        ))}
        {count != null && <span className="cnt" style={{ ["--cd" as string]: `${i * 40 + 500}ms` }}>{count}</span>}
      </span>
    </h1>
  );
}

/** cabeçalho de página: kicker, título grande e ações */
export function Head({ title, count, kicker, children }: { title: string; count?: number | null; kicker?: ReactNode; children?: ReactNode }) {
  return (
    <header className="ph" style={{ ["--s" as string]: 0 }}>
      <div>
        {kicker && <p className="ph-k">{kicker}</p>}
        <Title text={title} count={count} />
      </div>
      {children && <div className="ph-acts">{children}</div>}
    </header>
  );
}

/* ---------- odômetro ---------- */
export function Od({ value, delay = 0, className = "od", style }: { value: string | number; delay?: number; className?: string; style?: React.CSSProperties }) {
  const text = String(value);
  const [ref, seen] = useSeen<HTMLSpanElement>();
  const spanRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = spanRef.current;
    if (!el || !seen) return;
    const digits = text.replace(/\D/g, "");
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        el.querySelectorAll<HTMLElement>(".c > span").forEach((s, i) => { s.style.transform = `translateY(${-digits[i]}em)`; });
      });
    });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [text, seen]);
  if (!/\d/.test(text)) return <span className={className} style={style}>{text}</span>;
  let di = 0;
  return (
    <span className={className} style={style} aria-label={text} ref={(n) => { spanRef.current = n; ref(n); }}>
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="c" key={i}>
            <span style={{ ["--d" as string]: `${(delay + di++ * 0.05).toFixed(2)}s` }}>
              {"0123456789".split("").map((d) => <b key={d}>{d}</b>)}
            </span>
          </span>
        ) : <span key={i}>{ch}</span>
      )}
    </span>
  );
}

/* ---------- KPI ---------- */
export function Kpi({ label, value, note, hl, c = "var(--green)", spark, delay = 0 }: {
  label: string; value: number | string; note?: string; hl?: boolean; c?: string; spark?: string; delay?: number;
}) {
  return (
    <div className={`card kpi ${hl ? "hl" : ""}`} style={{ ["--c" as string]: c }}>
      <small>{label}</small>
      <Od value={value} delay={delay} />
      {note && <p>{note}</p>}
      {spark && <svg className="spark" viewBox="0 0 72 28"><path d={spark} /></svg>}
    </div>
  );
}

/* ---------- controle segmentado ---------- */
export function Seg<T extends string>({ items, value, onPick, label }: {
  items: { v: T; label: string; n?: number }[]; value: T; onPick: (v: T) => void; label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLElement>(null);
  const place = () => {
    const b = ref.current?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (b && pill.current) { pill.current.style.width = b.offsetWidth + "px"; pill.current.style.transform = `translateX(${b.offsetLeft - 4}px)`; }
  };
  useLayoutEffect(place);
  useEffect(() => {
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place);
    const t = window.setTimeout(place, 400);
    return () => { window.removeEventListener("resize", place); window.clearTimeout(t); };
  }, []);
  return (
    <div className="seg" ref={ref} role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.v} type="button" aria-pressed={it.v === value} onClick={() => onPick(it.v)}>
          {it.label}{it.n != null && <em>{it.n}</em>}
        </button>
      ))}
      <i ref={pill} />
    </div>
  );
}

/* ---------- barra que enche ao aparecer ---------- */
export function Bar({ w, c = "var(--red)", d = 0 }: { w: number; c?: string; d?: number }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  return (
    <span className={`bar ${seen ? "in" : ""}`} ref={ref}>
      <i style={{ ["--w" as string]: Math.max(0, Math.min(1, w)).toFixed(3), ["--c" as string]: c, ["--d" as string]: `${d}s` }} />
    </span>
  );
}

/* ---------- anel ---------- */
export function Ring({ pct, c, size = 64, label }: { pct: number; c: string; size?: number; label?: ReactNode }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  const r = 26, C = 2 * Math.PI * r;
  return (
    <span className="ring" ref={ref} style={{ ["--rs" as string]: `${size}px`, ["--c" as string]: c }}>
      <svg viewBox="0 0 64 64">
        <circle className="t" cx="32" cy="32" r={r} />
        <circle className="a" cx="32" cy="32" r={r} strokeDasharray={C.toFixed(1)} style={{ strokeDashoffset: (seen ? C * (1 - Math.max(0, Math.min(100, pct)) / 100) : C).toFixed(1) }} />
      </svg>
      <b>{label ?? Math.round(pct)}</b>
    </span>
  );
}

/* ---------- avatar ---------- */
export function Av({ name, photo, size = 48, round }: { name: string; photo?: string | null; size?: number; round?: boolean }) {
  const [bad, setBad] = useState(false);
  const src = photo && !bad ? getOptimizedImageUrl(photo, { width: Math.max(96, size * 2), quality: 80, format: "webp" }) || photo : null;
  return (
    <span className={`av ${round ? "round" : ""}`} style={{ ["--sz" as string]: `${size}px` }}>
      {src ? <img src={src} alt="" loading="lazy" onError={() => setBad(true)} /> : initials(name)}
    </span>
  );
}

export function PosPill({ pos }: { pos: string | null | undefined }) {
  return <span className="pill c" style={{ ["--c" as string]: posColor(pos) }}>{shortPos(pos)}</span>;
}

/** raiz de uma tela redesenhada */
export function View({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`m3v view ${className}`}>{children}</div>;
}
