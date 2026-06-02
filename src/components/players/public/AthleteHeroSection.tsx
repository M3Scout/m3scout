import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/lib/imageUtils";

interface AthleteHeroSectionProps {
  player: {
    full_name: string;
    slug: string;
    position: string;
    age: number | null;
    height: number | null;
    dominant_foot: string | null;
    current_club: string | null;
    photo_url: string | null;
    primary_tactical_role: string | null;
    play_style: string | null;
  };
  contractStatus?: string | null;
}

export function AthleteHeroSection({ player }: AthleteHeroSectionProps) {
  const nameParts = (player.full_name ?? "").trim().split(/\s+/);
  const mid = Math.ceil(nameParts.length / 2);
  const firstName = nameParts.slice(0, mid).join(" ");
  const lastName  = nameParts.slice(mid).join(" ");

  const identItems = [
    player.age           ? { label: "Idade",  value: String(player.age),  unit: "anos" } : null,
    player.current_club  ? { label: "Clube",  value: player.current_club,  unit: null   } : null,
    player.height        ? { label: "Altura", value: String(player.height), unit: "cm"  } : null,
    player.dominant_foot ? { label: "Pé",     value: player.dominant_foot,  unit: null   } : null,
  ].filter(Boolean) as { label: string; value: string; unit: string | null }[];

  const cols = Math.min(identItems.length, 4);

  return (
    <section className="pt-6 pb-[60px] relative" id="identidade">

      {/*
        2-row grid on desktop:
          Row 1, col 1 → left content (kick + name + pos + ident strip)
          Row 1, col 2 → photo — fills row 1 height exactly, so its bottom
                         aligns with the ident strip bottom
          Row 2, col 1 → action buttons
        DOM order: left content, buttons, photo
        (buttons before photo keeps mobile stacking correct)
      */}
      <div className="grid md:grid-cols-[1fr,minmax(300px,400px)] gap-x-14 gap-y-8 md:gap-y-0">

        {/* ══════════════ LEFT — IDENTIDADE (row 1, col 1) ══════════════ */}
        <div className="hero-l min-w-0 md:row-start-1 md:col-start-1">

          <div className="rv font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">01</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Scouting Report · 2026
          </div>

          <h1
            className="rv font-display font-semibold leading-[0.92] tracking-[-0.04em] mt-[18px] mb-1.5 text-[#ededee]"
            style={{ fontSize: "clamp(44px,6.2vw,92px)" }}
            data-d="1"
            id="heroName"
          >
            {firstName}
            {lastName && (
              <>
                <br />
                <span className="text-[#9c9ba3]">{lastName}</span>
              </>
            )}
          </h1>

          <div
            className="rv font-editorial-mono text-[14px] tracking-[0.04em] text-[#9c9ba3] flex gap-3 flex-wrap items-center mb-[34px]"
            data-d="2"
            id="posLine"
          >
            <span className="text-[#ec4525] font-semibold">{player.position}</span>
            {player.primary_tactical_role && (
              <>
                <span className="text-[#62616a]">/</span>
                <span>{player.primary_tactical_role}</span>
              </>
            )}
            {player.play_style && (
              <>
                <span className="text-[#62616a]">·</span>
                <span>{player.play_style}</span>
              </>
            )}
          </div>

          {identItems.length > 0 && (
            <div
              className="rv border border-white/[0.075] rounded-[6px] overflow-hidden bg-[#141318]"
              style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              data-d="3"
              id="identStrip"
            >
              {identItems.map((item, i) => (
                <div
                  key={item.label}
                  className={cn(
                    "px-5 py-[18px] transition-colors duration-[250ms] hover:bg-[#191822]",
                    i < identItems.length - 1 && "border-r border-white/[0.075]"
                  )}
                >
                  <div className="font-editorial-mono text-[10px] tracking-[0.18em] uppercase text-[#62616a] mb-[10px] flex justify-between items-center">
                    <span>{item.label}</span>
                    <span className="text-[#ec4525]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="font-display text-[26px] font-semibold tracking-[-0.02em] leading-none text-[#ededee]">
                    {item.value}
                    {item.unit && (
                      <span className="font-editorial-mono text-[13px] text-[#9c9ba3] font-medium ml-[3px]">
                        {item.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ══════════════ ACTIONS (row 2, col 1) ══════════════ */}
        <div className="rv flex gap-3 mt-[26px] flex-wrap md:row-start-2 md:col-start-1" data-d="4">
          <Link to={`/contact?player=${player.slug}`}>
            <span className="font-editorial-mono text-[12px] tracking-[0.12em] uppercase font-semibold inline-flex items-center gap-[9px] rounded-[6px] px-5 py-[14px] bg-[#ec4525] text-[#160603] hover:bg-[#ff5a39] hover:-translate-y-0.5 transition-all duration-[220ms] cursor-pointer">
              Falar com a M3
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
          <button
            type="button"
            onClick={() => document.getElementById("tecnico")?.scrollIntoView({ behavior: "smooth" })}
            className="font-editorial-mono text-[12px] tracking-[0.12em] uppercase font-semibold inline-flex items-center gap-[9px] rounded-[6px] px-5 py-[14px] border border-white/15 text-[#9c9ba3] hover:text-[#ededee] hover:border-white transition-all duration-[220ms] cursor-pointer bg-transparent"
          >
            Perfil técnico
          </button>
        </div>

        {/* ══════════════ RIGHT — PHOTO (row 1, col 2) ══════════════ */}
        {/*
          Desktop: photo spans row 1 only, filling the height defined by the
          left content (kick → ident strip). The img is absolute so it doesn't
          contribute intrinsic height to the row — the left column drives the
          row height, and the photo stretches to match it.
          Mobile: falls back to normal aspect-[4/5] stacked below the buttons.
        */}
        <div
          className="rv hero-r md:row-start-1 md:col-start-2 md:h-full"
          data-d="2"
        >
          <div className="photo-wrap md:h-full">
            <div className="photo-frame relative aspect-[4/5] md:aspect-auto md:h-full min-h-[280px] border border-white/15 rounded-[8px] overflow-hidden bg-[#191822] group">

              <img
                src={getOptimizedImageUrl(player.photo_url, { width: 1500, quality: 85, format: "avif" }) || player.photo_url || ""}
                srcSet={getResponsiveSrcSet(player.photo_url, [750, 1500], 85) || undefined}
                sizes="(max-width: 768px) 100vw, 400px"
                alt={player.full_name}
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                onError={(e) => {
                  if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url;
                }}
              />

              {/* Bottom gradient fade */}
              <div
                className="absolute inset-0 pointer-events-none z-[2]"
                style={{ background: "linear-gradient(180deg, transparent 55%, rgba(12,11,13,0.78) 100%)" }}
              />

              {/* Corner ticks */}
              <span className="tick tl absolute top-[9px] left-[9px]  w-[11px] h-[11px] border-t-2 border-l-2 border-[#ec4525] z-[4]" />
              <span className="tick tr absolute top-[9px] right-[9px] w-[11px] h-[11px] border-t-2 border-r-2 border-[#ec4525] z-[4]" />
              <span className="tick bl absolute bottom-[9px] left-[9px]  w-[11px] h-[11px] border-b-2 border-l-2 border-[#ec4525] z-[4]" />
              <span className="tick br absolute bottom-[9px] right-[9px] w-[11px] h-[11px] border-b-2 border-r-2 border-[#ec4525] z-[4]" />

              {/* Position badge */}
              <div className="photo-meta absolute left-[14px] bottom-[14px] right-[14px] z-[5] flex justify-between items-end">
                <span
                  className="photo-badge font-editorial-mono text-[10px] tracking-[0.16em] uppercase font-semibold text-[#ec4525] border border-[#ec4525]/40 rounded-full px-[13px] py-[7px]"
                  style={{ background: "rgba(12,11,13,0.60)", backdropFilter: "blur(6px)" }}
                >
                  {player.position}
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
