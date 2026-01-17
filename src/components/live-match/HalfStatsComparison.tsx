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
