import { useEffect, useRef } from "react";
import { BALL_SVG, clamp } from "./shared";

export type StripKind = "cones" | "match" | "goal" | "passes";

interface Strip {
  el: HTMLElement;
  upd: (p: number) => void;
}

function zig(N: number) {
  let d = "M0 28";
  for (let i = 1; i <= 200; i++) {
    const p = i / 200;
    d += ` L${(p * 1000).toFixed(1)} ${(28 + Math.sin(p * Math.PI * N) * 16).toFixed(1)}`;
  }
  return d;
}

/** Monta a faixa (mesma marcação e lógica do HTML) e devolve a função de progresso. */
function build(kind: StripKind, el: HTMLElement): Strip {
  if (kind === "cones") {
    // Talentos: bola em zigue-zague entre cones de treino
    const N = 11;
    let h = `<svg viewBox="0 0 1000 56" preserveAspectRatio="none"><path class="base" d="M0 28H1000"/><path class="dash" d="${zig(N)}" style="clip-path:inset(0 calc((1 - var(--p,0)) * 100%) 0 0)"/></svg>`;
    for (let k = 0; k < N; k++) h += `<span class="cone" style="left:${(((k + 0.5) / N) * 100).toFixed(2)}%;--k:${k}"></span>`;
    el.innerHTML = h + `<span class="ball-ico">${BALL_SVG}</span>`;
    const items = [...el.querySelectorAll<HTMLElement>(".cone")];
    const ball = el.querySelector<HTMLElement>(".ball-ico")!;
    return {
      el,
      upd: (p) => {
        el.style.setProperty("--p", p.toFixed(4));
        const x = p * 100, y = Math.sin(p * Math.PI * N) * 16;
        ball.style.left = x + "%";
        ball.style.transform = `translateY(${y.toFixed(1)}px)`;
        items.forEach((c, k) => c.classList.toggle("on", (k + 0.5) / N < p));
      },
    };
  }
  if (kind === "match") {
    // Sobre: cronômetro da partida de 0' a 90'
    let h = '<div class="mtrack"><i></i></div>';
    for (let m = 0; m <= 90; m += 5) {
      const big = m % 15 === 0, lab = m === 45 ? "INT" : m === 90 ? "FIM" : big ? m + "'" : "";
      h += `<span class="tick ${big ? "big" : ""}" data-m="${m}" style="left:${((m / 90) * 100).toFixed(3)}%;--k:${m / 5}">${lab ? `<b>${lab}</b>` : ""}</span>`;
    }
    el.innerHTML = h + `<span class="mclock"><span data-min>0'</span></span>`;
    const items = [...el.querySelectorAll<HTMLElement>(".tick")];
    const min = el.querySelector<HTMLElement>("[data-min]")!;
    return {
      el,
      upd: (p) => {
        el.style.setProperty("--p", p.toFixed(4));
        const m = Math.round(p * 90);
        min.textContent = m + "'";
        items.forEach((t) => t.classList.toggle("on", +(t.dataset.m ?? 0) <= m));
      },
    };
  }
  if (kind === "goal") {
    // Imprensa: bola rolando até estufar a rede
    el.innerHTML = `<svg viewBox="0 0 1000 56" preserveAspectRatio="none"><path class="base" d="M0 28H955"/><path class="hot" d="M0 28H955" style="clip-path:inset(0 calc((1 - var(--p,0)) * 100%) 0 0)"/></svg><span class="gnet"></span><span class="gflash">GOL</span><span class="ball-ico">${BALL_SVG}</span>`;
    const ball = el.querySelector<HTMLElement>(".ball-ico")!;
    let wasHit = false;
    return {
      el,
      upd: (p) => {
        el.style.setProperty("--p", p.toFixed(4));
        ball.style.left = `calc(${(p * 100).toFixed(2)}% - ${(p * 30).toFixed(1)}px)`;
        const hit = p >= 0.985;
        if (hit && !wasHit) {
          el.classList.remove("scored");
          void el.offsetWidth;
          el.classList.add("scored");
        }
        if (!hit && p < 0.9) el.classList.remove("scored");
        wasHit = hit;
      },
    };
  }
  // Contato: passes num quadro tático
  const P: [number, number][] = [[0, 30], [14, 12], [28, 42], [44, 18], [58, 40], [74, 14], [88, 36], [100, 22]];
  const d = P.map(([x, y], i) => `${i ? "L" : "M"}${x * 10} ${y}`).join(" ");
  let h = `<svg viewBox="0 0 1000 56" preserveAspectRatio="none"><path class="base" d="${d}"/><path class="hot" d="${d}" style="clip-path:inset(0 calc((1 - var(--p,0)) * 100%) 0 0)"/></svg>`;
  P.forEach(([x, y], k) => (h += `<span class="pdot" style="left:${x}%;top:${y}px;--k:${k}"></span>`));
  el.innerHTML = h + `<span class="ball-ico">${BALL_SVG}</span>`;
  const items = [...el.querySelectorAll<HTMLElement>(".pdot")];
  const ball = el.querySelector<HTMLElement>(".ball-ico")!;
  return {
    el,
    upd: (p) => {
      el.style.setProperty("--p", p.toFixed(4));
      const x = p * 100;
      let k = 0;
      while (k < P.length - 2 && P[k + 1][0] < x) k++;
      const [x0, y0] = P[k], [x1, y1] = P[k + 1], u = clamp((x - x0) / (x1 - x0), 0, 1);
      ball.style.left = x + "%";
      ball.style.top = y0 + (y1 - y0) * u + "px";
      items.forEach((dd, j) => dd.classList.toggle("on", P[j][0] <= x + 0.5));
    },
  };
}

const COLORS: Record<StripKind, string> = {
  cones: "#FF3B30",
  match: "#30D158",
  goal: "#FFD60A",
  passes: "#64D2FF",
};

/** Faixa de transição temática entre seções, guiada pela rolagem. */
export function SoccerStrip({ kind, color }: { kind: StripKind; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const strip = build(kind, el);

    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
          }
        }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);

    let ticking = false;
    const run = () => {
      ticking = false;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > vh + 60) return;
      strip.upd(clamp((vh * 0.92 - r.top) / (vh * 0.55), 0, 1));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(run);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    run();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [kind]);

  return <div ref={ref} className="tr" data-tr={kind} style={{ ["--fc" as string]: color ?? COLORS[kind] }} aria-hidden="true" />;
}
