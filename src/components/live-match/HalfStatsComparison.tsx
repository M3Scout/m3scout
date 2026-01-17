import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { MatchEvent, MatchPlayer, MatchEventType } from "@/hooks/useLiveMatch";
import { cn } from "@/lib/utils";

interface HalfStatsComparisonProps {
  events: MatchEvent[];
  matchPlayers: MatchPlayer[];
}

// Complete mapping of all event types to their display labels
const EVENT_TYPE_CONFIG: Record<MatchEventType, { label: string; icon: string; category: string; order: number }> = {
  // Attack
  goal: { label: "Gols", icon: "⚽", category: "attack", order: 1 },
  assist: { label: "Assistências", icon: "👟", category: "attack", order: 2 },
  shot: { label: "Finalizações Fora", icon: "🎯", category: "attack", order: 3 },
  shot_on_target: { label: "Finalizações no Gol", icon: "🥅", category: "attack", order: 4 },
  
  // Creativity
  key_pass: { label: "Passes Decisivos", icon: "🎯", category: "creativity", order: 10 },
  chance_created: { label: "Chances Criadas", icon: "💡", category: "creativity", order: 11 },
  dribble_success: { label: "Dribles Certos", icon: "✓", category: "creativity", order: 12 },
  dribble_attempt: { label: "Dribles Errados", icon: "✗", category: "creativity", order: 13 },
  
  // Passing
  pass_success: { label: "Passes Certos", icon: "📤", category: "passing", order: 20 },
  pass_total: { label: "Passes Totais", icon: "📤", category: "passing", order: 21 },
  possession_lost: { label: "Perdas de Posse", icon: "❌", category: "passing", order: 22 },
  
  // Defense
  tackle: { label: "Desarmes", icon: "🦶", category: "defense", order: 30 },
  interception: { label: "Interceptações", icon: "🛡️", category: "defense", order: 31 },
  recovery: { label: "Recuperações", icon: "↩️", category: "defense", order: 32 },
  clearance: { label: "Cortes", icon: "🧹", category: "defense", order: 33 },
  duel_won: { label: "Duelos Ganhos", icon: "💪", category: "defense", order: 34 },
  duel_total: { label: "Duelos Totais", icon: "⚔️", category: "defense", order: 35 },
  aerial_duel_won: { label: "Duelos Aéreos", icon: "🦅", category: "defense", order: 36 },
  
  // Discipline
  yellow: { label: "Cartões Amarelos", icon: "🟨", category: "discipline", order: 40 },
  red: { label: "Cartões Vermelhos", icon: "🟥", category: "discipline", order: 41 },
  foul_committed: { label: "Faltas Cometidas", icon: "⚠️", category: "discipline", order: 42 },
  foul_suffered: { label: "Faltas Sofridas", icon: "🤕", category: "discipline", order: 43 },
  
  // Goalkeeper
  save: { label: "Defesas", icon: "🧤", category: "goalkeeper", order: 50 },
  goal_conceded: { label: "Gols Sofridos", icon: "😢", category: "goalkeeper", order: 51 },
  clean_sheet: { label: "Clean Sheet", icon: "🛡️", category: "goalkeeper", order: 52 },
  penalty_saved: { label: "Pênaltis Defendidos", icon: "🦸", category: "goalkeeper", order: 53 },
  error_led_to_goal: { label: "Erros para Gol", icon: "💥", category: "goalkeeper", order: 54 },
  box_save: { label: "Defesas na Área", icon: "📦", category: "goalkeeper", order: 55 },
  punch: { label: "Socos", icon: "👊", category: "goalkeeper", order: 56 },
  high_claim: { label: "Bolas Altas", icon: "🙌", category: "goalkeeper", order: 57 },
  sweeper_action: { label: "Saídas do Gol", icon: "🏃", category: "goalkeeper", order: 58 },
  
  // Player presence events (usually not shown in summary but included for completeness)
  player_on: { label: "Entrou", icon: "➡️", category: "meta", order: 91 },
  player_off: { label: "Saiu", icon: "⬅️", category: "meta", order: 92 },
};

// Category colors for visual grouping
const CATEGORY_COLORS: Record<string, string> = {
  attack: "text-red-400",
  creativity: "text-amber-400",
  passing: "text-cyan-400",
  defense: "text-blue-400",
  discipline: "text-purple-400",
  goalkeeper: "text-green-400",
  meta: "text-muted-foreground",
};

export function HalfStatsComparison({ events, matchPlayers }: HalfStatsComparisonProps) {
  const { statsRows, substitutions } = useMemo(() => {
    // Count all event types by half
    const eventCounts: Record<MatchEventType, { first: number; second: number }> = {} as any;
    
    // Initialize all event types
    (Object.keys(EVENT_TYPE_CONFIG) as MatchEventType[]).forEach((type) => {
      eventCounts[type] = { first: 0, second: 0 };
    });

    // Count events by half - only count official events (not voided)
    events.forEach((event) => {
      if (event.event_status === "voided" || !event.count_in_stats) return;
      
      const half = event.half === 2 ? "second" : "first";
      const eventType = event.event_type as MatchEventType;
      
      if (eventCounts[eventType]) {
        eventCounts[eventType][half] += event.value || 1;
      }
    });

    // Count substitutions from match players
    let subsFirstHalf = 0;
    let subsSecondHalf = 0;

    matchPlayers.forEach((mp) => {
      if (!mp.started && mp.entered_minute !== null) {
        if (mp.entered_minute <= 45) {
          subsFirstHalf++;
        } else {
          subsSecondHalf++;
        }
      }
    });

    // Build stats rows - only include event types that have at least 1 occurrence
    const rows: { type: MatchEventType; first: number; second: number; total: number }[] = [];
    
    (Object.keys(EVENT_TYPE_CONFIG) as MatchEventType[])
      .filter((type) => !["player_on", "player_off"].includes(type)) // Exclude meta events
      .forEach((type) => {
        const counts = eventCounts[type];
        const total = counts.first + counts.second;
        if (total > 0) {
          rows.push({
            type,
            first: counts.first,
            second: counts.second,
            total,
          });
        }
      });

    // Sort by order defined in config
    rows.sort((a, b) => EVENT_TYPE_CONFIG[a.type].order - EVENT_TYPE_CONFIG[b.type].order);

    return {
      statsRows: rows,
      substitutions: { first: subsFirstHalf, second: subsSecondHalf },
    };
  }, [events, matchPlayers]);

  // Don't render if no stats
  if (statsRows.length === 0 && substitutions.first === 0 && substitutions.second === 0) {
    return (
      <div className="border rounded-lg p-4 text-center text-muted-foreground">
        Nenhuma estatística registrada
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 bg-muted/50 text-center text-sm font-medium">
        <div className="p-2 border-r">
          <Badge variant="secondary" className="text-xs">
            1º TEMPO
          </Badge>
        </div>
        <div className="p-2 border-r text-muted-foreground text-xs">
          Estatística
        </div>
        <div className="p-2 border-r">
          <Badge variant="default" className="text-xs bg-primary">
            2º TEMPO
          </Badge>
        </div>
        <div className="p-2">
          <Badge variant="outline" className="text-xs">
            TOTAL
          </Badge>
        </div>
      </div>

      {/* Stats rows */}
      <div className="divide-y">
        {statsRows.map((row) => {
          const config = EVENT_TYPE_CONFIG[row.type];
          const categoryColor = CATEGORY_COLORS[config.category];
          
          return (
            <StatRow
              key={row.type}
              label={`${config.icon} ${config.label}`}
              first={row.first}
              second={row.second}
              total={row.total}
              highlightColor={categoryColor}
            />
          );
        })}
        
        {/* Always show substitutions if any occurred */}
        {(substitutions.first > 0 || substitutions.second > 0) && (
          <StatRow
            label="🔄 Substituições"
            first={substitutions.first}
            second={substitutions.second}
            total={substitutions.first + substitutions.second}
            highlightColor="text-primary"
          />
        )}
      </div>
      
      {/* Summary footer */}
      <div className="bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        Total de tipos de estatística: {statsRows.length + (substitutions.first + substitutions.second > 0 ? 1 : 0)}
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  first: number;
  second: number;
  total: number;
  highlightColor?: string;
}

function StatRow({ label, first, second, total, highlightColor }: StatRowProps) {
  const isFirstHigher = first > second;
  const isSecondHigher = second > first;

  return (
    <div className="grid grid-cols-4 text-center">
      <div
        className={cn(
          "p-3 text-lg font-bold border-r transition-colors",
          isFirstHigher ? highlightColor || "text-foreground" : "text-muted-foreground"
        )}
      >
        {first}
      </div>
      <div className="p-3 text-xs text-muted-foreground flex items-center justify-center border-r whitespace-nowrap overflow-hidden">
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "p-3 text-lg font-bold border-r transition-colors",
          isSecondHigher ? highlightColor || "text-foreground" : "text-muted-foreground"
        )}
      >
        {second}
      </div>
      <div className={cn("p-3 text-lg font-bold", highlightColor || "text-foreground")}>
        {total}
      </div>
    </div>
  );
}
