import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { PlayerStats } from "@/lib/playerStats";

interface SeasonEvolutionChartProps {
  stats: PlayerStats[];
  isGoalkeeper?: boolean;
}

interface SeasonAggregate {
  season: string;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  yellow_cards: number;
  red_cards: number;
  // GK stats
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
}

type StatOption = {
  value: string;
  label: string;
  color: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  secondaryColor?: string;
};

const OUTFIELD_STAT_OPTIONS: StatOption[] = [
  { value: "goals", label: "Gols", color: "hsl(142, 76%, 36%)", secondaryValue: "assists", secondaryLabel: "Assistências", secondaryColor: "hsl(221, 83%, 53%)" },
  { value: "shots", label: "Chutes", color: "hsl(221, 83%, 53%)", secondaryValue: "shots_on_target", secondaryLabel: "No Gol", secondaryColor: "hsl(142, 76%, 36%)" },
  { value: "key_passes", label: "Passes Decisivos", color: "hsl(262, 83%, 58%)", secondaryValue: "chances_created", secondaryLabel: "Chances Criadas", secondaryColor: "hsl(45, 93%, 47%)" },
  { value: "tackles", label: "Desarmes", color: "hsl(221, 83%, 53%)", secondaryValue: "interceptions", secondaryLabel: "Interceptações", secondaryColor: "hsl(142, 76%, 36%)" },
  { value: "recoveries", label: "Recuperações", color: "hsl(262, 83%, 58%)" },
  { value: "matches", label: "Jogos", color: "hsl(221, 83%, 53%)", secondaryValue: "minutes", secondaryLabel: "Minutos (÷10)", secondaryColor: "hsl(45, 93%, 47%)" },
  { value: "yellow_cards", label: "Amarelos", color: "hsl(45, 93%, 47%)", secondaryValue: "red_cards", secondaryLabel: "Vermelhos", secondaryColor: "hsl(0, 72%, 51%)" },
];

const GK_STAT_OPTIONS: StatOption[] = [
  { value: "saves", label: "Defesas", color: "hsl(142, 76%, 36%)", secondaryValue: "goals_conceded", secondaryLabel: "Gols Sofridos", secondaryColor: "hsl(0, 72%, 51%)" },
  { value: "clean_sheets", label: "Clean Sheets", color: "hsl(221, 83%, 53%)" },
  { value: "penalties_saved", label: "Pênaltis Defendidos", color: "hsl(262, 83%, 58%)" },
  { value: "matches", label: "Jogos", color: "hsl(221, 83%, 53%)", secondaryValue: "minutes", secondaryLabel: "Minutos (÷10)", secondaryColor: "hsl(45, 93%, 47%)" },
];

export function SeasonEvolutionChart({ stats, isGoalkeeper = false }: SeasonEvolutionChartProps) {
  const statOptions = isGoalkeeper ? GK_STAT_OPTIONS : OUTFIELD_STAT_OPTIONS;
  const [selectedStat, setSelectedStat] = useState<string>(statOptions[0].value);

  // Aggregate stats by season
  const chartData = useMemo(() => {
    const seasonMap: Record<number, SeasonAggregate> = {};

    stats.forEach((stat) => {
      const year = stat.season_year;
      if (!seasonMap[year]) {
        seasonMap[year] = {
          season: year.toString(),
          matches: 0,
          minutes: 0,
          goals: 0,
          assists: 0,
          shots: 0,
          shots_on_target: 0,
          key_passes: 0,
          chances_created: 0,
          tackles: 0,
          interceptions: 0,
          recoveries: 0,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          goals_conceded: 0,
          clean_sheets: 0,
          penalties_saved: 0,
        };
      }

      seasonMap[year].matches += stat.matches || 0;
      seasonMap[year].minutes += stat.minutes || 0;
      seasonMap[year].goals += stat.goals || 0;
      seasonMap[year].assists += stat.assists || 0;
      seasonMap[year].shots += stat.shots || 0;
      seasonMap[year].shots_on_target += stat.shots_on_target || 0;
      seasonMap[year].key_passes += stat.key_passes || 0;
      seasonMap[year].chances_created += stat.chances_created || 0;
      seasonMap[year].tackles += stat.tackles || 0;
      seasonMap[year].interceptions += stat.interceptions || 0;
      seasonMap[year].recoveries += stat.recoveries || 0;
      seasonMap[year].yellow_cards += stat.yellow_cards || 0;
      seasonMap[year].red_cards += stat.red_cards || 0;
      seasonMap[year].saves += stat.saves || 0;
      seasonMap[year].goals_conceded += stat.goals_conceded || 0;
      seasonMap[year].clean_sheets += stat.clean_sheets || 0;
      seasonMap[year].penalties_saved += stat.penalties_saved || 0;
    });

    // Sort by season ascending for chronological view
    return Object.values(seasonMap)
      .sort((a, b) => parseInt(a.season) - parseInt(b.season))
      .map(s => ({
        ...s,
        // Scale minutes for chart visualization
        minutesScaled: Math.round(s.minutes / 10),
      }));
  }, [stats]);

  const currentStatOption = statOptions.find(o => o.value === selectedStat) || statOptions[0];

  if (chartData.length < 2) {
    return null; // Don't show chart with less than 2 seasons
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">Temporada {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.dataKey === 'minutesScaled' ? entry.value * 10 : entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Evolução por Temporada
          </CardTitle>
          <Select value={selectedStat} onValueChange={setSelectedStat}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                  {option.secondaryLabel && ` + ${option.secondaryLabel}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="season"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
              <Bar
                dataKey={selectedStat === 'matches' && currentStatOption.secondaryValue === 'minutes' ? selectedStat : selectedStat}
                name={currentStatOption.label}
                fill={currentStatOption.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              {currentStatOption.secondaryValue && (
                currentStatOption.secondaryValue === 'minutes' ? (
                  <Line
                    type="monotone"
                    dataKey="minutesScaled"
                    name={currentStatOption.secondaryLabel}
                    stroke={currentStatOption.secondaryColor}
                    strokeWidth={2}
                    dot={{ fill: currentStatOption.secondaryColor, strokeWidth: 2 }}
                  />
                ) : (
                  <Bar
                    dataKey={currentStatOption.secondaryValue}
                    name={currentStatOption.secondaryLabel}
                    fill={currentStatOption.secondaryColor}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
