import type { SquadPlayer } from "./types";

interface PlayerBadgeProps {
  player: SquadPlayer;
  accent: string;
}

export function PlayerBadge({ player, accent }: PlayerBadgeProps) {
  const initials = player.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="relative overflow-hidden flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: "#0f1311", border: "1px solid #1c2120" }}
    >
      <div
        className="absolute pointer-events-none select-none font-archivo font-black leading-none"
        style={{
          right: -6,
          top: -18,
          fontSize: 72,
          color: accent,
          opacity: 0.08,
          letterSpacing: "-0.03em",
        }}
      >
        {initials}
      </div>

      <div
        className="relative z-[2] w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}45` }}
      >
        {player.photo_url ? (
          <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-tactical-mono text-[11px] font-semibold" style={{ color: accent }}>
            {initials}
          </span>
        )}
      </div>

      <div className="relative z-[2] min-w-0 flex-1">
        <div className="text-[13px] font-semibold truncate" style={{ color: "#e9ece9" }}>
          {player.full_name}
        </div>
        {player.position && (
          <div className="font-tactical-mono text-[10px] tracking-wider truncate" style={{ color: "#6f7a73" }}>
            {player.position}
          </div>
        )}
      </div>
    </div>
  );
}
