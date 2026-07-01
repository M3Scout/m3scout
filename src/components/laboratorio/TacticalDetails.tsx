import { Lightbulb } from "lucide-react";
import type { PlayInstructions } from "./types";

interface TacticalDetailsProps {
  subtype: { name: string; play: PlayInstructions };
  accent: string;
}

export function TacticalDetails({ subtype, accent }: TacticalDetailsProps) {
  return (
    <div
      className="rounded-[18px] px-6 py-6 md:px-7 transition-all duration-300"
      style={{
        background: `linear-gradient(165deg, ${accent}0e, #0f1311 60%)`,
        border: `1px solid ${accent}2a`,
      }}
    >
      <div className="flex items-center gap-[11px] mb-5">
        <span
          className="font-tactical-mono text-[10px] font-semibold tracking-[0.12em] px-[9px] py-1 rounded-md"
          style={{ color: accent, background: `${accent}1c`, border: `1px solid ${accent}40` }}
        >
          ATIVO
        </span>
        <h3 className="font-archivo font-extrabold text-[19px]" style={{ color: "#f1f4f0" }}>
          O que fazer &mdash; {subtype.name}
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-[15px]">
          <div className="w-1 rounded-[3px] shrink-0 self-stretch mt-0.5" style={{ background: accent }} />
          <div>
            <div className="font-tactical-mono text-[11px] tracking-[0.16em] mb-1.5" style={{ color: "#6f7a73" }}>
              COM A BOLA
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: "#dadfda" }}>
              {subtype.play.comBola}
            </p>
          </div>
        </div>

        <div className="flex gap-[15px]">
          <div className="w-1 rounded-[3px] shrink-0 self-stretch mt-0.5" style={{ background: accent }} />
          <div>
            <div className="font-tactical-mono text-[11px] tracking-[0.16em] mb-1.5" style={{ color: "#6f7a73" }}>
              SEM A BOLA
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: "#dadfda" }}>
              {subtype.play.semBola}
            </p>
          </div>
        </div>

        <div
          className="rounded-[13px] px-[17px] py-[15px] mt-0.5"
          style={{ background: `${accent}10`, border: `1px solid ${accent}33` }}
        >
          <div className="flex items-center gap-[9px] mb-1.5">
            <Lightbulb className="w-[15px] h-[15px]" style={{ color: accent }} strokeWidth={2} />
            <span className="font-tactical-mono text-[11px] tracking-[0.16em]" style={{ color: accent }}>
              DICA DO TREINADOR
            </span>
          </div>
          <p className="text-[15px] leading-relaxed" style={{ color: "#e6eae5" }}>
            {subtype.play.dica}
          </p>
        </div>
      </div>
    </div>
  );
}
