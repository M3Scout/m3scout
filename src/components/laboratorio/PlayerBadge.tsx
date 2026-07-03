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
      className="relative overflow-hidden flex items-center gap-3 rounded-[8px] px-3.5 py-3 transition-colors duration-200 hover:bg-white/[0.03]"
      style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}
    >
      <div
        className="absolute pointer-events-none select-none font-archivo font-bold leading-none"
        style={{
          right: -4,
          top: -14,
          fontSize: 72,
          color: "transparent",
          WebkitTextStroke: `1px ${accent}30`,
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
        <div className="text-[13px] font-semibold truncate" style={{ color: "#ededee" }}>
          {player.full_name}
        </div>
        {(player.position || player.secondary_positions?.length) && (
          <div className="font-tactical-mono text-[10px] tracking-wider truncate" style={{ color: "#62616a" }}>
            {player.position}
            {player.secondary_positions?.length ? ` · ${player.secondary_positions.join(", ")}` : ""}
          </div>
        )}
        {player.play_style && (
          <div className="text-[10px] truncate mt-0.5" style={{ color: accent }}>
            {player.play_style}
          </div>
        )}
      </div>
    </div>
  );
}
