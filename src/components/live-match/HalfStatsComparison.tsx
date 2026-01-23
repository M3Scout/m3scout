import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { MatchEvent, MatchPlayer, MatchEventType } from "@/hooks/useLiveMatch";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_CONFIG,
  CATEGORY_COLORS,
  COMPUTED_STATS,
  SUMMARY_EVENT_TYPES,
  EventCountsMap,
} from "@/lib/matchStatsDefinitions";

interface HalfStatsComparisonProps {
  events: MatchEvent[];
  matchPlayers: MatchPlayer[];
}

interface StatsRow {
  id: string;
  label: string;
  icon: string;
  category: string;
  order: number;
  first: number;
  second: number;
  total: number;
}

export function HalfStatsComparison({ events, matchPlayers }: HalfStatsComparisonProps) {
  const { statsRows, substitutions } = useMemo(() => {
    // Count all event types by half
    const eventCounts: EventCountsMap = {};
    
    // Note: We use Partial<Record> so we don't need to initialize all types upfront
    // Count events by half - only count official events (not voided)
    events.forEach((event) => {
      if (event.event_status === "voided" || !event.count_in_stats) return;
      
      const half = event.half === 2 ? "second" : "first";
      const eventType = event.event_type as MatchEventType;
      
      // Initialize if not exists, then increment
      if (!eventCounts[eventType]) {
        eventCounts[eventType] = { first: 0, second: 0 };
      }
      eventCounts[eventType]![half] += event.value || 1;
    });

    // Count substitutions from substitution events (player_on type)
    // This uses the correct period/half from the event itself
    let subsFirstHalf = 0;
    let subsSecondHalf = 0;

    events.forEach((event) => {
      if (event.event_type === "player_on" && event.event_status !== "voided") {
        if (event.half === 2 || event.period === 2) {
          subsSecondHalf++;
        } else {
          subsFirstHalf++;
        }
      }
    });

    // Build stats rows - include direct event types and computed stats
    const rows: StatsRow[] = [];
    
    // Add direct event type rows
    SUMMARY_EVENT_TYPES.forEach((type) => {
      const counts = eventCounts[type];
      if (!counts) return; // Skip if no events of this type
      
      const total = counts.first + counts.second;
      if (total > 0) {
        const config = EVENT_TYPE_CONFIG[type];
        rows.push({
          id: type,
          label: config.label,
          icon: config.icon,
          category: config.category,
          order: config.order,
          first: counts.first,
          second: counts.second,
          total,
        });
      }
    });

    // Add computed stats (e.g., Finalizações Total)
    COMPUTED_STATS.forEach((computedStat) => {
      const computed = computedStat.compute(eventCounts);
      const total = computed.first + computed.second;
      if (total > 0) {
        rows.push({
          id: computedStat.id,
          label: computedStat.label,
          icon: computedStat.icon,
          category: computedStat.category,
          order: computedStat.order,
          first: computed.first,
          second: computed.second,
          total,
        });
      }
    });

    // Sort by order defined in config
    rows.sort((a, b) => a.order - b.order);

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
    <div className="border border-zinc-800/40 rounded-xl overflow-hidden bg-zinc-900/40">
      {/* Header */}
      <div className="grid grid-cols-4 bg-zinc-900/60 text-center text-sm font-medium">
        <div className="p-3 sm:p-4 border-r border-zinc-800/40">
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            1º TEMPO
          </Badge>
        </div>
        <div className="p-3 sm:p-4 border-r border-zinc-800/40 text-muted-foreground text-[10px] sm:text-xs flex items-center justify-center">
          Estatística
        </div>
        <div className="p-3 sm:p-4 border-r border-zinc-800/40">
          <Badge variant="default" className="text-[10px] sm:text-xs bg-primary">
            2º TEMPO
          </Badge>
        </div>
        <div className="p-3 sm:p-4">
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            TOTAL
          </Badge>
        </div>
      </div>

      {/* Stats rows */}
      <div className="divide-y divide-zinc-800/40">
        {statsRows.map((row) => {
          const categoryColor = CATEGORY_COLORS[row.category];
          
          return (
            <StatRow
              key={row.id}
              label={`${row.icon} ${row.label}`}
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
      <div className="bg-zinc-900/60 p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground">
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
          "p-3 sm:p-4 text-base sm:text-lg lg:text-xl font-bold border-r border-zinc-800/40 transition-colors",
          isFirstHigher ? highlightColor || "text-foreground" : "text-muted-foreground"
        )}
      >
        {first}
      </div>
      <div className="p-3 sm:p-4 text-[10px] sm:text-xs lg:text-sm text-muted-foreground flex items-center justify-center border-r border-zinc-800/40 whitespace-nowrap overflow-hidden">
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "p-3 sm:p-4 text-base sm:text-lg lg:text-xl font-bold border-r border-zinc-800/40 transition-colors",
          isSecondHigher ? highlightColor || "text-foreground" : "text-muted-foreground"
        )}
      >
        {second}
      </div>
      <div className={cn("p-3 sm:p-4 text-base sm:text-lg lg:text-xl font-bold", highlightColor || "text-foreground")}>
        {total}
      </div>
    </div>
  );
}
