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
      className="relative overflow-hidden flex flex-col rounded-[8px] px-6 py-7 md:px-[30px] md:py-8 min-h-[280px]"
      style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}
    >
      <div
        className="absolute pointer-events-none select-none font-archivo font-bold leading-[0.8]"
        style={{
          top: -18,
          right: -10,
          fontSize: "min(190px, 26vw)",
          color: "transparent",
          WebkitTextStroke: `1.5px ${accent}26`,
          letterSpacing: "-0.04em",
          zIndex: 1,
        }}
      >
        {position.shortName}
      </div>

      <div className="relative z-[2]">
        <div className="font-tactical-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: "#62616a" }}>
          Posição {String(positionIndex + 1).padStart(2, "0")} / {String(totalPositions).padStart(2, "0")}
        </div>
        <h2
          className="mt-2 font-archivo font-semibold leading-[1.1]"
          style={{ fontSize: "clamp(21px, 2.1vw, 27px)", letterSpacing: "-0.015em", color: "#ededee" }}
        >
          {position.name}
        </h2>
        <p className="mt-2.5 text-[15.5px] leading-relaxed max-w-[34ch]" style={{ color: "#9c9ba3" }}>
          {position.description}
        </p>
      </div>

      <div className="relative z-[2] mt-auto pt-6">
        <div className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase mb-3" style={{ color: "#62616a" }}>
          Responsabilidades
        </div>
        <div className="flex flex-col">
          {position.mainFunctions.map((fn, i) => (
            <div
              key={fn}
              className="flex items-center gap-3.5 py-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.075)" }}
            >
              <span className="font-tactical-mono text-xs font-semibold min-w-[22px]" style={{ color: accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] font-medium" style={{ color: "#dfe3df" }}>
                {fn}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
