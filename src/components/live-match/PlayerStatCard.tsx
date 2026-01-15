import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchPlayer, MatchEventType, PositionTemplate } from "@/hooks/useLiveMatch";
import { Plus, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Stat categories configuration
const OUTFIELD_STATS: { category: string; stats: { type: MatchEventType; label: string }[] }[] = [
  {
    category: "ATA",
    stats: [
      { type: "goal", label: "Gols" },
      { type: "assist", label: "Assist." },
      { type: "shot", label: "Chutes" },
      { type: "shot_on_target", label: "Chutes Gol" },
    ],
  },
  {
    category: "CRI",
    stats: [
      { type: "key_pass", label: "Passes Dec." },
      { type: "chance_created", label: "Chances" },
      { type: "dribble_success", label: "Dribles ✓" },
      { type: "dribble_attempt", label: "Dribles Tot." },
    ],
  },
  {
    category: "DEF",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interc." },
      { type: "recovery", label: "Recup." },
      { type: "duel_won", label: "Duelos ✓" },
      { type: "duel_total", label: "Duelos Tot." },
      { type: "aerial_duel_won", label: "Aéreos ✓" },
      { type: "clearance", label: "Cortes" },
    ],
  },
  {
    category: "TÁT",
    stats: [
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
      { type: "foul_committed", label: "Faltas Com." },
      { type: "foul_suffered", label: "Faltas Sof." },
      { type: "pass_success", label: "Passes ✓" },
      { type: "pass_total", label: "Passes Tot." },
      { type: "possession_lost", label: "Bolas Perd." },
    ],
  },
];

const GOALKEEPER_STATS: { category: string; stats: { type: MatchEventType; label: string }[] }[] = [
  {
    category: "GK",
    stats: [
      { type: "save", label: "Defesas" },
      { type: "goal_conceded", label: "Gols Sof." },
      { type: "clean_sheet", label: "Clean Sheet" },
      { type: "penalty_saved", label: "Pên. Def." },
      { type: "error_led_to_goal", label: "Erros→Gol" },
    ],
  },
  {
    category: "GK Avançado",
    stats: [
      { type: "box_save", label: "Def. Área" },
      { type: "punch", label: "Socos" },
      { type: "high_claim", label: "Bolas Altas" },
      { type: "sweeper_action", label: "Saídas Gol" },
    ],
  },
];

interface PlayerStatCardProps {
  matchPlayer: MatchPlayer;
  eventCounts: Record<MatchEventType, number>;
  onAddEvent: (eventType: MatchEventType) => void;
  onUndo: () => void;
  disabled?: boolean;
}

export function PlayerStatCard({
  matchPlayer,
  eventCounts,
  onAddEvent,
  onUndo,
  disabled,
}: PlayerStatCardProps) {
  const [expanded, setExpanded] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const isGK = matchPlayer.position_template === "goalkeeper";
  const stats = isGK ? GOALKEEPER_STATS : OUTFIELD_STATS;
  const player = matchPlayer.player;

  if (!player) return null;

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 80;

    if (deltaX > threshold) {
      // Swipe right: add default stat (tackle for outfield, save for GK)
      onAddEvent(isGK ? "save" : "tackle");
    } else if (deltaX < -threshold) {
      // Swipe left: undo
      onUndo();
    }

    touchStartX.current = null;
  };

  const getCount = (type: MatchEventType) => eventCounts[type] || 0;

  return (
    <Card
      className={cn(
        "transition-all",
        !matchPlayer.is_on_field && "opacity-60",
        disabled && "pointer-events-none"
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={player.photo_url || undefined} />
              <AvatarFallback className="font-bold">
                {player.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{player.full_name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {player.position}
                </Badge>
                {matchPlayer.started && (
                  <Badge variant="secondary" className="text-xs">
                    Titular
                  </Badge>
                )}
                {!matchPlayer.is_on_field && (
                  <Badge variant="destructive" className="text-xs">
                    Fora
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              title="Desfazer último"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {stats.map((category) => (
            <div key={category.category}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {category.category}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {category.stats.map((stat) => (
                  <StatButton
                    key={stat.type}
                    label={stat.label}
                    count={getCount(stat.type)}
                    onClick={() => onAddEvent(stat.type)}
                    disabled={disabled}
                    highlight={stat.type === "goal" || stat.type === "assist"}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

interface StatButtonProps {
  label: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

function StatButton({ label, count, onClick, disabled, highlight }: StatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
        "hover:bg-accent hover:border-primary/50 active:scale-95",
        "disabled:opacity-50 disabled:pointer-events-none",
        highlight && count > 0 && "border-green-500 bg-green-500/10"
      )}
    >
      <span className="text-lg font-bold">{count}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {label}
      </span>
      <Plus className="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />
    </button>
  );
}
