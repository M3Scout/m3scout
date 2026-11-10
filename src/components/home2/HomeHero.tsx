import { useEffect, useRef } from "react";
import { clamp } from "@/components/site/shared";
import { startHero } from "./heroEngine";

interface HomeHeroProps {
  onAthlete: (id: string, name: string) => void;
}

/** Hero: jogada ensaiada em canvas com GOOOL ao final. */
export function HomeHero({ onAthlete }: HomeHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onAthlete);
  cb.current = onAthlete;

  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    const stop = startHero(hero, { onAthlete: (id, name) => cb.current(id, name) });

    // hero recua ao sair
    let ticking = false;
    const run = () => {
      ticking = false;
      const p = clamp(window.scrollY / window.innerHeight, 0, 1);
      hero.style.transform = p ? `scale(${(1 - p * 0.07).toFixed(4)})` : "";
      hero.style.borderRadius = (p * 40).toFixed(1) + "px";
      hero.style.opacity = (1 - p * 0.55).toFixed(3);
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(run); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    run();
    return () => {
      stop();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section className="hero" id="hero" ref={ref} aria-label="Jogada ensaiada com os atletas da M3">
      <span id="topo" />
      <canvas id="field" aria-hidden="true" />
      <div className="fx" aria-hidden="true">
        <div className="fx-word">
          {["G", "O", "O", "O", "L"].map((c, i) => (
            <span key={i} className={i === 4 ? "r" : undefined} style={{ ["--i" as string]: i }}>{c}</span>
          ))}
        </div>
        <div className="fx-sub">
          <span className="fx-name">Corona</span>
          <span className="fx-tag">Meio-atacante</span>
        </div>
      </div>
      <a
        className="cue"
        href="#talentos"
        aria-label="Rolar para os talentos"
        onClick={(e) => { e.preventDefault(); document.getElementById("talentos")?.scrollIntoView({ behavior: "smooth" }); }}
      />
    </section>
  );
}
