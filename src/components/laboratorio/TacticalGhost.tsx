import type { TacticalPosition } from "./types";

interface TacticalGhostProps {
  position: TacticalPosition;
  positionIndex: number;
  totalPositions: number;
}

export function TacticalGhost({ position, positionIndex, totalPositions }: TacticalGhostProps) {
  const accent = position.color;

  return (
    <div
      className="relative overflow-hidden flex flex-col rounded-[20px] px-6 py-7 md:px-[30px] md:py-8 min-h-[280px]"
      style={{ background: "#0f1311", border: "1px solid #1c2120" }}
    >
      <div
        className="absolute pointer-events-none select-none font-archivo font-black leading-none"
        style={{
          top: -26,
          right: -8,
          fontSize: "min(190px, 26vw)",
          color: accent,
          opacity: 0.07,
          letterSpacing: "-0.04em",
          zIndex: 1,
        }}
      >
        {position.shortName}
      </div>

      <div className="relative z-[2]">
        <div className="font-tactical-mono text-[11px] tracking-[0.2em]" style={{ color: "#5c6660" }}>
          POSIÇÃO {String(positionIndex + 1).padStart(2, "0")} / {String(totalPositions).padStart(2, "0")}
        </div>
        <h2
          className="mt-2 font-archivo font-extrabold leading-[1.02]"
          style={{ fontSize: "clamp(30px, 4vw, 46px)", letterSpacing: "-0.025em", color: "#f4f6f3" }}
        >
          {position.name}
        </h2>
        <p className="mt-2.5 text-[15.5px] leading-relaxed max-w-[34ch]" style={{ color: "#9aa49d" }}>
          {position.description}
        </p>
      </div>

      <div className="relative z-[2] mt-auto pt-6">
        <div className="font-tactical-mono text-[11px] tracking-[0.16em] mb-3" style={{ color: "#5c6660" }}>
          RESPONSABILIDADES
        </div>
        <div className="flex flex-col">
          {position.mainFunctions.map((fn, i) => (
            <div
              key={fn}
              className="flex items-center gap-3.5 py-2.5"
              style={{ borderTop: "1px solid #1a1f1d" }}
            >
              <span className="font-tactical-mono text-xs font-semibold min-w-[22px]" style={{ color: accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] font-semibold" style={{ color: "#dfe3df" }}>
                {fn}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
