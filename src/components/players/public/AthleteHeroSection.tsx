import { Link } from "react-router-dom";
import { ArrowRight, Share2, Check } from "lucide-react";
import { useState } from "react";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [copied, setCopied] = useState(false);
  const nameParts = (player.full_name ?? "").trim().split(/\s+/);
  const mid = Math.ceil(nameParts.length / 2);
  const firstName = nameParts.slice(0, mid).join(" ");
  const lastName  = nameParts.slice(mid).join(" ");

  const handleShare = async () => {
    const url = `https://m3scout.com/players/${player.slug}?v=${Date.now()}`;
    const shareData = { title: `${player.full_name} — M3 Agency`, url };
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // user cancelled share — ignore
    }
  };

    player.age           ? { label: "Idade",  value: String(player.age),  unit: "anos" } : null,
    player.current_club  ? { label: "Clube",  value: player.current_club,  unit: null   } : null,
    player.height        ? { label: "Altura", value: String(player.height), unit: "cm"  } : null,
    player.dominant_foot ? { label: "Pé",     value: player.dominant_foot,  unit: null   } : null,
  ].filter(Boolean) as { label: string; value: string; unit: string | null }[];

  const imgSrc = getOptimizedImageUrl(player.photo_url, { width: 1500, quality: 85, format: "avif" }) || player.photo_url || "";
  const imgSrcSet = getResponsiveSrcSet(player.photo_url, [750, 1500], 85) || undefined;

  const cornerTicks = (
    <>
      <span className="absolute top-[10px] left-[10px]  w-[11px] h-[11px] border-t-2 border-l-2 border-[#ec4525] z-[4]" />
      <span className="absolute top-[10px] right-[10px] w-[11px] h-[11px] border-t-2 border-r-2 border-[#ec4525] z-[4]" />
      <span className="absolute bottom-[10px] left-[10px]  w-[11px] h-[11px] border-b-2 border-l-2 border-[#ec4525] z-[4]" />
      <span className="absolute bottom-[10px] right-[10px] w-[11px] h-[11px] border-b-2 border-r-2 border-[#ec4525] z-[4]" />
    </>
  );

  const actionButtons = (
    <div className="flex gap-3 flex-wrap">
      <Link to={`/contact?player=${player.slug}`}>
        <span className="font-editorial-mono text-[11px] tracking-[0.12em] uppercase font-semibold inline-flex items-center gap-[9px] rounded-[8px] px-5 py-[13px] bg-[#ec4525] text-white hover:bg-[#ff5a39] hover:-translate-y-0.5 transition-all duration-[220ms] cursor-pointer">
          Falar com a M3
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
      <button
        type="button"
        onClick={() => document.getElementById("tecnico")?.scrollIntoView({ behavior: "smooth" })}
        className="font-editorial-mono text-[11px] tracking-[0.12em] uppercase font-semibold inline-flex items-center gap-[9px] rounded-[8px] px-5 py-[13px] border border-white/15 text-[#9c9ba3] hover:text-[#ededee] hover:border-white/40 transition-all duration-[220ms] cursor-pointer bg-transparent"
      >
        Perfil técnico
      </button>
    </div>
  );

  const identGrid = (cols: string) => (
    <div className={cn("grid gap-2", cols)}>
      {identItems.map((item, i) => (
        <div
          key={item.label}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 hover:bg-zinc-800/60 transition-colors duration-200"
        >
          <div className="font-editorial-mono text-[9.5px] tracking-[0.18em] uppercase text-zinc-500 mb-2 flex justify-between items-center">
            <span>{item.label}</span>
            <span className="font-mono text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
          </div>
          <div className="font-display font-semibold leading-none tracking-[-0.02em] text-[#ededee] text-[22px]">
            {item.value}
            {item.unit && (
              <span className="font-editorial-mono text-[11px] text-zinc-400 font-medium ml-[3px]">
                {item.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="pt-6 pb-12 mb-12 border-b border-zinc-800/50 relative" id="identidade">

      {/* ════════════════════════════════════════════════
          MOBILE ONLY — photo full-width, text overlaid inside
          ════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* Photo — full width, text overlaid */}
        <div className="relative aspect-[4/5] rounded-[12px] overflow-hidden border border-white/10 bg-[#191822] group">
          <img
            src={imgSrc} srcSet={imgSrcSet}
            sizes="100vw" alt={player.full_name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={(e) => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
          />
          <div className="absolute inset-0 pointer-events-none z-[1]"
            style={{ background: "linear-gradient(180deg, rgba(12,11,13,0.25) 0%, transparent 30%, transparent 42%, rgba(12,11,13,0.68) 70%, rgba(12,11,13,0.96) 100%)" }} />
          {cornerTicks}

          {/* Top: ghost age number (right) */}
          {player.age && (
            <div className="absolute top-4 right-4 z-[3] font-display font-bold leading-[0.82] tracking-[-0.04em] select-none pointer-events-none"
              style={{ fontSize: "80px", color: "transparent", WebkitTextStroke: "1.5px rgba(255,255,255,0.08)" }}>
              {player.age}
            </div>
          )}

          {/* Bottom: name + position line */}
          <div className="absolute bottom-5 left-5 right-5 z-[3]">
            <h1 className="font-display font-semibold leading-[0.92] tracking-[-0.04em] text-white"
              style={{ fontSize: "clamp(34px, 9vw, 52px)" }}>
              {firstName}
              {lastName && <><br /><span className="text-white/55">{lastName}</span></>}
            </h1>
            <div className="font-editorial-mono text-[12px] tracking-[0.04em] text-white/55 flex gap-3 flex-wrap items-center mt-3">
              <span className="text-[#ec4525] font-semibold">{player.position}</span>
              {player.primary_tactical_role && <><span className="text-white/30">/</span><span>{player.primary_tactical_role}</span></>}
              {player.play_style && <><span className="text-white/30">·</span><span>{player.play_style}</span></>}
            </div>
          </div>
        </div>

        {/* Identity cards 2×2 below photo */}
        {identItems.length > 0 && <div className="mt-3">{identGrid("grid-cols-2")}</div>}

        {/* Buttons */}
        <div className="mt-5">{actionButtons}</div>
      </div>

      {/* ════════════════════════════════════════════════
          DESKTOP ONLY — two-column: text left, photo right
          ════════════════════════════════════════════════ */}
      <div className="hidden md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-14">

        {/* Left column */}
        <div className="min-w-0 flex flex-col">

          {/* Kicker */}
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">01</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Scouting Report · 2026
          </div>

          {/* Name */}
          <h1 className="font-display font-semibold leading-[0.92] tracking-[-0.04em] mt-[18px] mb-2 text-[#ededee]"
            style={{ fontSize: "clamp(44px,6.2vw,92px)" }}>
            {firstName}
            {lastName && <><br /><span className="text-[#9c9ba3]">{lastName}</span></>}
          </h1>

          {/* Position line */}
          <div className="font-editorial-mono text-[14px] tracking-[0.04em] text-[#9c9ba3] flex gap-3 flex-wrap items-center mb-8">
            <span className="text-[#ec4525] font-semibold">{player.position}</span>
            {player.primary_tactical_role && <><span className="text-[#62616a]">/</span><span>{player.primary_tactical_role}</span></>}
            {player.play_style && <><span className="text-[#62616a]">·</span><span>{player.play_style}</span></>}
          </div>

          {/* Identity strip — 4 cols on desktop */}
          {identItems.length > 0 && (
            <div className="grid grid-cols-4 gap-[1px] bg-zinc-800 rounded-xl overflow-hidden border border-zinc-800 mb-6">
              {identItems.map((item, i) => (
                <div key={item.label} className="bg-[#141318] px-5 py-[18px] hover:bg-[#191822] transition-colors duration-200">
                  <div className="font-editorial-mono text-[9.5px] tracking-[0.18em] uppercase text-zinc-500 mb-[10px] flex justify-between items-center">
                    <span>{item.label}</span>
                    <span className="font-mono text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="font-display font-semibold leading-none tracking-[-0.02em] text-[#ededee] text-[26px]">
                    {item.value}
                    {item.unit && <span className="font-editorial-mono text-[13px] text-zinc-400 font-medium ml-[3px]">{item.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {actionButtons}
        </div>

        {/* Right column — photo with aspect-[4/5] */}
        <div className="relative">
          {/* Ghost number behind photo */}
          <div className="absolute -top-2 -right-4 z-0 font-display font-bold leading-[0.8] tracking-[-0.04em] select-none pointer-events-none"
            style={{ fontSize: "clamp(100px,14vw,180px)", color: "transparent", WebkitTextStroke: "1.2px rgba(255,255,255,0.07)" }}>
            01
          </div>

          <div className="relative aspect-[4/5] rounded-[10px] overflow-hidden border border-white/10 bg-[#191822] group z-[1]">
            <img
              src={imgSrc} srcSet={imgSrcSet}
              sizes="380px" alt={player.full_name}
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
              onError={(e) => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
            />
            <div className="absolute inset-0 pointer-events-none z-[2]"
              style={{ background: "linear-gradient(180deg, transparent 50%, rgba(12,11,13,0.82) 100%)" }} />
            {cornerTicks}
            <div className="absolute left-[14px] bottom-[14px] z-[5]">
              <span className="font-editorial-mono text-[10px] tracking-[0.16em] uppercase font-semibold text-[#ec4525] border border-[#ec4525]/40 rounded-full px-[13px] py-[7px]"
                style={{ background: "rgba(12,11,13,0.60)", backdropFilter: "blur(6px)" }}>
                {player.position}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
