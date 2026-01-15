import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { MatchEvent, MatchPlayer } from "@/hooks/useLiveMatch";

interface HalfStatsComparisonProps {
  events: MatchEvent[];
  matchPlayers: MatchPlayer[];
}

interface HalfStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  substitutionsIn: number;
  shots: number;
  saves: number;
}

export function HalfStatsComparison({ events, matchPlayers }: HalfStatsComparisonProps) {
  const { firstHalf, secondHalf, substitutions } = useMemo(() => {
    const first: HalfStats = {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      substitutionsIn: 0,
      shots: 0,
      saves: 0,
    };

    const second: HalfStats = {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      substitutionsIn: 0,
      shots: 0,
      saves: 0,
    };

    // Count events by half
    events.forEach((event) => {
      const stats = event.half === 2 ? second : first;

      switch (event.event_type) {
        case "goal":
          stats.goals += event.value;
          break;
        case "assist":
          stats.assists += event.value;
          break;
        case "yellow":
          stats.yellowCards += event.value;
          break;
        case "red":
          stats.redCards += event.value;
          break;
        case "shot":
        case "shot_on_target":
          stats.shots += event.value;
          break;
        case "save":
          stats.saves += event.value;
          break;
      }
    });

    // Count substitutions by analyzing entered_minute
    // First half: entered between 1 and 45
    // Second half: entered after 45
    let subsFirstHalf = 0;
    let subsSecondHalf = 0;

    matchPlayers.forEach((mp) => {
      // Only count players who entered as substitutes (not starters)
      if (!mp.started && mp.entered_minute !== null) {
        if (mp.entered_minute <= 45) {
          subsFirstHalf++;
        } else {
          subsSecondHalf++;
        }
      }
    });

    first.substitutionsIn = subsFirstHalf;
    second.substitutionsIn = subsSecondHalf;

    return {
      firstHalf: first,
      secondHalf: second,
      substitutions: { first: subsFirstHalf, second: subsSecondHalf },
    };
  }, [events, matchPlayers]);

  // Don't render if no events in either half
  const hasFirstHalfEvents = Object.values(firstHalf).some((v) => v > 0);
  const hasSecondHalfEvents = Object.values(secondHalf).some((v) => v > 0);

  if (!hasFirstHalfEvents && !hasSecondHalfEvents) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-3 bg-muted/50 text-center text-sm font-medium">
        <div className="p-2 border-r">
          <Badge variant="secondary" className="text-xs">
            1º TEMPO
          </Badge>
        </div>
        <div className="p-2 border-r text-muted-foreground text-xs">
          Estatística
        </div>
        <div className="p-2">
          <Badge variant="default" className="text-xs bg-primary">
            2º TEMPO
          </Badge>
        </div>
      </div>

      {/* Stats rows */}
      <div className="divide-y">
        <StatRow
          label="⚽ Gols"
          first={firstHalf.goals}
          second={secondHalf.goals}
          highlightColor="text-green-500"
        />
        <StatRow
          label="👟 Assistências"
          first={firstHalf.assists}
          second={secondHalf.assists}
          highlightColor="text-blue-500"
        />
        <StatRow
          label="🟨 Amarelos"
          first={firstHalf.yellowCards}
          second={secondHalf.yellowCards}
          highlightColor="text-yellow-500"
        />
        <StatRow
          label="🟥 Vermelhos"
          first={firstHalf.redCards}
          second={secondHalf.redCards}
          highlightColor="text-red-500"
        />
        <StatRow
          label="🔄 Substituições"
          first={substitutions.first}
          second={substitutions.second}
          highlightColor="text-primary"
        />
        <StatRow
          label="🎯 Chutes"
          first={firstHalf.shots}
          second={secondHalf.shots}
        />
        <StatRow
          label="🧤 Defesas"
          first={firstHalf.saves}
          second={secondHalf.saves}
        />
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  first: number;
  second: number;
  highlightColor?: string;
}

function StatRow({ label, first, second, highlightColor }: StatRowProps) {
  // Only show if at least one half has this stat
  if (first === 0 && second === 0) {
    return null;
  }

  const isFirstHigher = first > second;
  const isSecondHigher = second > first;

  return (
    <div className="grid grid-cols-3 text-center">
      <div
        className={`p-3 text-lg font-bold border-r ${
          isFirstHigher ? highlightColor || "text-foreground" : "text-muted-foreground"
        }`}
      >
        {first}
      </div>
      <div className="p-3 text-xs text-muted-foreground flex items-center justify-center border-r">
        {label}
      </div>
      <div
        className={`p-3 text-lg font-bold ${
          isSecondHigher ? highlightColor || "text-foreground" : "text-muted-foreground"
        }`}
      >
        {second}
      </div>
    </div>
  );
}
