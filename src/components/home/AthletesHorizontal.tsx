import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl, getResponsiveSrcSet, ATHLETE_CAROUSEL_SIZES } from "@/lib/imageUtils";
import "./AthletesHorizontal.css";

const MARQUEE_ITEMS = [
  "Talentos M3",
  "Inteligência em Futebol",
  "Mercado",
  "Data Driven",
];

const FALLBACK_GRADIENTS = ["blue", "gold", "red", "purple"] as const;

interface AthletePlayer {
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  current_club: string | null;
  photo_url: string | null;
}

function MarqueeRow() {
  // Duplicate items to enable seamless loop (translateX(-50%))
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {items.map((label, idx) => (
          <span className="marquee__item" key={`${label}-${idx}`}>
            {label}
            <span className="marquee__item-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function AthletesHorizontal() {
  const [players, setPlayers] = useState<AthletePlayer[]>([]);
  const [progress, setProgress] = useState(20);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".athlete-h-card");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * dir, behavior: "smooth" });
  };

  // Drag-to-scroll (desktop)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.classList.add("is-dragging");
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      isDown = false;
      el.classList.remove("is-dragging");
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [players.length]);

  useEffect(() => {
    let cancelled = false;
    const currentYear = new Date().getFullYear();

    (async () => {
      // Tenta o ano atual, depois o anterior (caso os dados sejam da temporada passada)
      for (const year of [currentYear, currentYear - 1]) {
        if (cancelled) return;

        const { data: rankData } = await ((supabase as any)
          .rpc("get_public_player_minutes_ranking", { p_season_year: year }));

        const rows = (rankData as any[] ?? []).slice(0, 8);
        if (rows.length === 0) continue;

        const topIds = rows.map((r: any) => r.player_id as string);

        const { data } = await (supabase
          .from("public_players_safe" as any)
          .select("id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating, created_at")
          .in("id", topIds) as any);

        if (!cancelled && data) {
          const byId = new Map((data as AthletePlayer[]).map((p) => [p.id, p]));
          const ordered = topIds.map((id) => byId.get(id)).filter((p): p is AthletePlayer => !!p);
          setPlayers(ordered);
        }
        return;
      }

      // Fallback: sem dados de minutos — ordena por auto_rating
      if (!cancelled) {
        const { data } = await (supabase
          .from("public_players_safe" as any)
          .select("id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating, created_at")
          .order("auto_rating", { ascending: false, nullsFirst: false })
          .limit(8) as any);
        if (!cancelled && data) setPlayers(data as AthletePlayer[]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      const pct = max > 0 ? (el.scrollLeft / max) * 100 : 0;
      setProgress(Math.max(8, Math.min(100, pct || 20)));
      setCanPrev(el.scrollLeft > 4);
      setCanNext(el.scrollLeft < max - 4);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [players.length]);

  return (
    <section className="lp-section">
      <MarqueeRow />

      <div className="athletes-h">
        <header className="athletes-h__head">
          <div>
            <h2 className="athletes-h__title">
              Talentos<br />monitorados.
            </h2>
          </div>
          <div className="athletes-h__head-actions">
            <button
              type="button"
              className="athletes-h__nav"
              onClick={() => scrollByCards(-1)}
              disabled={!canPrev}
              aria-label="Anterior"
            >
              ←
            </button>
            <button
              type="button"
              className="athletes-h__nav"
              onClick={() => scrollByCards(1)}
              disabled={!canNext}
              aria-label="Próximo"
            >
              →
            </button>
            <Link to="/players" className="athletes-h__cta">
              Ver todos
            </Link>
          </div>
        </header>

        <div className="athletes-h__track" ref={trackRef}>
          {players.map((p, i) => {
            const gradient = FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length];
            const num = `/${String(i + 1).padStart(2, "0")}`;
            return (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className={`athlete-h-card athlete-h-card--${gradient}`}
              >
                {p.photo_url && (
                  <>
                    <img
                      src={getOptimizedImageUrl(p.photo_url, { width: 1200, quality: 85, format: "avif" })}
                      srcSet={getResponsiveSrcSet(p.photo_url, [400, 800, 1200, 1600], 85) || undefined}
                      sizes={ATHLETE_CAROUSEL_SIZES}
                      alt={p.full_name}
                      className="athlete-h-card__media"
                      loading={i < 2 ? "eager" : "lazy"}
                      decoding="async"
                      width={1200}
                      height={1600}
                      onError={(e) => { if (p.photo_url) (e.target as HTMLImageElement).src = p.photo_url; }}
                    />
                    <div className="athlete-h-card__media-overlay" />
                  </>
                )}

                {p.position && (
                  <span className="athlete-h-card__chip">
                    <span className="athlete-h-card__chip-dot" />
                    {p.position}
                  </span>
                )}
                <span className="athlete-h-card__num">{num}</span>

                <div className="athlete-h-card__body">
                  <h3 className="athlete-h-card__name">{p.full_name}</h3>
                  <div className="athlete-h-card__meta">
                    {p.age != null && <span>{p.age} anos</span>}
                    {p.nationality && <span>· {p.nationality}</span>}
                  </div>
                  {p.current_club && (
                    <div className="athlete-h-card__club">{p.current_club}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="athletes-h__progress" aria-hidden="true">
          <div
            className="athletes-h__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
