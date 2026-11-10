import { useEffect, useRef } from "react";
import { KickTitle } from "@/components/site/KickTitle";
import { SoccerStrip } from "@/components/site/SoccerStrip";
import { PENALTY_HTML } from "./penaltyMarkup";
import { startPenalty } from "./penaltyEngine";

/** 02 · Sobre a M3 — pênalti interativo que desbloqueia os quatro pilares. */
export function HomePenalty() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pen = hostRef.current?.querySelector<HTMLElement>("[data-pen]");
    if (!pen) return;
    const stop = startPenalty(pen);
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { pen.classList.add("in"); io.unobserve(pen); } }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(pen);
    return () => { stop(); io.disconnect(); };
  }, []);

  return (
    <section className="pen-sec" id="sobre" aria-labelledby="ab-h">
      <div className="wrap">
        <SoccerStrip kind="match" />
        <div className="sh">
          <KickTitle text="Sobre a M3" id="ab-h" red={[2]} />
        </div>
        <div ref={hostRef} dangerouslySetInnerHTML={{ __html: PENALTY_HTML }} />
      </div>
    </section>
  );
}
