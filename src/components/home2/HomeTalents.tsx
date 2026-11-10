import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { KickTitle } from "@/components/site/KickTitle";
import { SoccerStrip } from "@/components/site/SoccerStrip";
import { BALL_SVG, clamp, useInClass } from "@/components/site/shared";
import type { HomePlayer } from "./useHomePlayers";

const subline = (p: HomePlayer) =>
  [p.age != null && `${p.age} anos`, p.current_club].filter(Boolean).join(" · ") || p.position || "";

const Chevron = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** 01 · Talentos — carrossel de cartas com inclinação, arrastar e pontos. */
export function HomeTalents({ players }: { players: HomePlayer[] }) {
  const [secRef, secIn] = useInClass<HTMLElement>();
  const carRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const cards = () => [...(carRef.current?.children ?? [])] as HTMLElement[];
  const step = () => {
    const c = cards();
    return c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : 1;
  };
  const curCard = () => Math.round((carRef.current?.scrollLeft ?? 0) / step());
  const goCard = (i: number) => {
    const c = cards();
    if (!c.length || !carRef.current) return;
    carRef.current.scrollTo({ left: c[clamp(i, 0, c.length - 1)].offsetLeft - c[0].offsetLeft, behavior: "smooth" });
  };

  // estado do carrossel + arrastar com o mouse
  useEffect(() => {
    const car = carRef.current;
    if (!car) return;
    const upd = () => {
      const max = car.scrollWidth - car.clientWidth - 2;
      setCanPrev(car.scrollLeft >= 2);
      setCanNext(car.scrollLeft < max);
    };
    const onScroll = () => requestAnimationFrame(upd);
    let down = false, dragX = 0, dragS = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      down = true; movedRef.current = false; dragX = e.clientX; dragS = car.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - dragX;
      if (!movedRef.current && Math.abs(dx) > 6) { movedRef.current = true; car.classList.add("drag"); }
      if (movedRef.current) car.scrollLeft = dragS - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (movedRef.current) {
        car.classList.remove("drag");
        goCard(curCard());
        window.setTimeout(() => (movedRef.current = false), 50);
      }
    };
    car.addEventListener("scroll", onScroll, { passive: true });
    car.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", upd);
    upd();
    return () => {
      car.removeEventListener("scroll", onScroll);
      car.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", upd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  // talentos recua quando sai pelo topo
  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    let ticking = false;
    const run = () => {
      ticking = false;
      const vh = window.innerHeight;
      const r = sec.getBoundingClientRect();
      const p = clamp((vh * 0.35 - r.bottom) / (vh * 0.35), 0, 1);
      sec.style.transform = p ? `translateY(${(p * 60).toFixed(1)}px) scale(${(1 - p * 0.05).toFixed(4)})` : "";
      sec.style.opacity = p ? (1 - p * 0.7).toFixed(3) : "";
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [secRef]);

  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || carRef.current?.classList.contains("drag")) return;
    const art = e.currentTarget, r = art.getBoundingClientRect();
    art.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2) + "deg");
    art.style.setProperty("--rx", ((0.5 - (e.clientY - r.top) / r.height) * 6).toFixed(2) + "deg");
  };
  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  return (
    <section className={`tal2 ${secIn ? "in" : ""}`} id="talentos" aria-labelledby="tal-h" ref={secRef}>
      <div className="wrap">
        <SoccerStrip kind="cones" />
        <div className="sh sh-row">
          <div>
            <KickTitle text="Talentos" id="tal-h" />
          </div>
          <div className="cnav">
            <button className="rbtn" type="button" aria-label="Atletas anteriores" disabled={!canPrev} onClick={() => goCard(curCard() - 1)}>
              <Chevron d="m15 6-6 6 6 6" />
            </button>
            <button className="rbtn" type="button" aria-label="Próximos atletas" disabled={!canNext} onClick={() => goCard(curCard() + 1)}>
              <Chevron d="m9 6 6 6-6 6" />
            </button>
          </div>
        </div>
      </div>
      <div
        className="car"
        ref={carRef}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Atletas"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); goCard(curCard() + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); goCard(curCard() - 1); }
        }}
      >
        {players.map((p, i) => (
          <article
            key={p.id}
            className="tc"
            style={{ ["--i" as string]: i }}
            aria-label={[p.full_name, p.position].filter(Boolean).join(", ")}
            onPointerMove={tilt}
            onPointerLeave={untilt}
          >
            <div className="tc-ph">
              {p.photo_url ? (
                <img
                  src={getOptimizedImageUrl(p.photo_url, { width: 800, quality: 85, format: "webp" })}
                  alt=""
                  draggable={false}
                  loading={i < 3 ? "eager" : "lazy"}
                  decoding="async"
                  onError={(e) => { if (p.photo_url) (e.target as HTMLImageElement).src = p.photo_url; }}
                />
              ) : (
                <div className="tc-none">
                  <span dangerouslySetInnerHTML={{ __html: BALL_SVG.replace("<svg", '<svg class="bg"') }} />
                  <small>Foto em breve</small>
                </div>
              )}
            </div>
            <div className="tc-top">
              <span>{p.position}</span>
              <b>{String(i + 1).padStart(2, "0")}</b>
            </div>
            <div className="tc-bottom">
              <div>
                <h3 className="tc-name">{p.full_name}</h3>
                <p className="tc-sub">{subline(p)}</p>
              </div>
              <span className="plus2" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </div>
            <Link
              className="tc-open"
              to={`/atleta/${p.slug}`}
              aria-label={`Ver perfil de ${p.full_name}`}
              draggable={false}
              onClick={(e) => { if (movedRef.current) { e.preventDefault(); e.stopPropagation(); } }}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
