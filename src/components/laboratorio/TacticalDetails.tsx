import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayInstructions } from "./types";

interface TacticalDetailsProps {
  subtype: { name: string; play: PlayInstructions };
  accent: string;
  className?: string;
}

export function TacticalDetails({ subtype, accent, className }: TacticalDetailsProps) {
  return (
    <div
      className={cn("rounded-[8px] px-6 py-6 md:px-7 transition-colors duration-300 flex flex-col", className)}
      style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}
    >
      <h3 className="font-archivo font-semibold text-[19px] mb-5" style={{ letterSpacing: "-0.01em", color: "#ededee" }}>
        O que fazer &mdash; {subtype.name}
      </h3>

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex gap-[15px]">
          <div className="w-1 rounded-[3px] shrink-0 self-stretch mt-0.5" style={{ background: accent }} />
          <div>
            <div className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase mb-1.5" style={{ color: "#62616a" }}>
              Com a bola
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: "#c8c7cc" }}>
              {subtype.play.comBola}
            </p>
          </div>
        </div>

        <div className="flex gap-[15px]">
          <div className="w-1 rounded-[3px] shrink-0 self-stretch mt-0.5" style={{ background: accent }} />
          <div>
            <div className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase mb-1.5" style={{ color: "#62616a" }}>
              Sem a bola
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: "#c8c7cc" }}>
              {subtype.play.semBola}
            </p>
          </div>
        </div>

        <div className="pl-3.5 mt-auto" style={{ borderLeft: `2px solid ${accent}` }}>
          <div className="flex items-center gap-[9px] mb-1.5">
            <Lightbulb className="w-[15px] h-[15px]" style={{ color: accent }} strokeWidth={2} />
            <span className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase" style={{ color: accent }}>
              Dica do treinador
            </span>
          </div>
          <p className="text-[15px] leading-relaxed" style={{ color: "#c8c7cc" }}>
            {subtype.play.dica}
          </p>
        </div>
      </div>
    </div>
  );
}
