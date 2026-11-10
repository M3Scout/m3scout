import { useEffect, type DependencyList, type RefObject } from "react";
import { useInClass } from "./shared";

/** Título de seção que sobe palavra por palavra (data-split do HTML). */
export function SplitTitle({ text, id, as = "h2", className = "st" }: { text: string; id?: string; as?: "h2" | "h3"; className?: string }) {
  const [ref, inView] = useInClass<HTMLHeadingElement>();
  const Tag = as;
  return (
    <Tag ref={ref} id={id} className={`${className} ${inView ? "in" : ""}`} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className="w" aria-hidden="true">
            <span style={{ ["--wi" as string]: i }}>{w}</span>
          </span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Entradas (.rise / [data-in]) e inclinação dos cards (.tilt) dentro de `root`,
 * como na base comum das páginas internas do HTML. Elementos que aparecem depois
 * (dados carregados) são pegos automaticamente.
 */
export function usePageFx(root: RefObject<HTMLElement>, deps: DependencyList = []) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    const ac = new AbortController();
    const tilted = new WeakSet<Element>();

    const scan = () => {
      el.querySelectorAll(".rise:not(.in),[data-in]:not(.in)").forEach((n) => io.observe(n));
      el.querySelectorAll<HTMLElement>(".tilt").forEach((t) => {
        if (tilted.has(t)) return;
        tilted.add(t);
        t.addEventListener("pointermove", (e) => {
          if (e.pointerType !== "mouse") return;
          const r = t.getBoundingClientRect(), a = +(t.dataset.tilt || 6);
          t.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * a).toFixed(2) + "deg");
          t.style.setProperty("--rx", ((0.5 - (e.clientY - r.top) / r.height) * a * 0.7).toFixed(2) + "deg");
        }, { signal: ac.signal });
        t.addEventListener("pointerleave", () => { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); }, { signal: ac.signal });
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); ac.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
