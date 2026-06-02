import { useState } from "react";
import { Play } from "lucide-react";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/utils";

interface AthleteVideoSectionProps { videoUrl: string | null; }

export function AthleteVideoSection({ videoUrl }: AthleteVideoSectionProps) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  const embedUrl     = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const thumbnailUrl = videoUrl ? getYouTubeThumbnailUrl(videoUrl, "maxres") : null;

  if (!embedUrl) return null;

  return (
    <section className="py-24 relative" id="video">

      {/* .sec-head */}
      <div className="flex items-end justify-between gap-6 mb-11 flex-wrap">
        <div>
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">07</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Highlights
          </div>
          <h2
            className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
            style={{ fontSize: "clamp(28px,3.4vw,44px)" }}
          >
            Vídeo do atleta
          </h2>
        </div>
        <p className="font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[280px] text-right">
          Melhores momentos registrados em campo.
        </p>
      </div>

      {/* Inline player — thumbnail swaps to iframe on click */}
      <div className="relative w-full aspect-video overflow-hidden border border-white/[0.075] rounded-[8px] bg-[#141318]">

        {playing ? (
          <iframe
            src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
            title="Player Highlights"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group cursor-pointer"
            aria-label="Reproduzir vídeo"
          >
            {/* Thumbnail */}
            {thumbnailUrl && !imgError ? (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-[#191822]" />
            )}

            {/* Bottom gradient */}
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{ background: "linear-gradient(180deg, transparent 40%, rgba(12,11,13,0.72) 100%)" }}
            />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center z-[2]">
              <div className="w-[60px] h-[60px] rounded-full bg-[#ec4525] group-hover:bg-[#ff5a39] flex items-center justify-center transition-colors duration-[220ms] shadow-[0_0_32px_rgba(236,69,37,0.35)]">
                <Play className="w-5 h-5 text-white ml-[3px]" fill="white" />
              </div>
            </div>

            {/* Bottom label */}
            <div className="absolute bottom-[18px] left-[20px] right-[20px] z-[3] flex items-end justify-between">
              <div>
                <div className="font-editorial-mono text-[10px] tracking-[0.18em] uppercase text-white/50 mb-[4px]">
                  Highlights
                </div>
                <div className="font-display text-[18px] font-semibold tracking-[-0.01em] text-[#ededee]">
                  Assista ao vídeo completo
                </div>
              </div>
              <span
                className="font-editorial-mono text-[11px] text-[#ec4525] tracking-[0.1em] uppercase border border-[#ec4525]/40 rounded-full px-[10px] py-[4px]"
                style={{ background: "rgba(12,11,13,0.60)", backdropFilter: "blur(6px)" }}
              >
                Play
              </span>
            </div>
          </button>
        )}

      </div>
    </section>
  );
}
