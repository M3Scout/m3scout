import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
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
  // Per 90 stats
  goals_per90: number;
  assists_per90: number;
  shots_per90: number;
  shots_on_target_per90: number;
  key_passes_per90: number;
  chances_created_per90: number;
  tackles_per90: number;
  interceptions_per90: number;
  recoveries_per90: number;
  saves_per90: number;
  goals_conceded_per90: number;
}

type StatOption = {
  value: string;
  label: string;
  color: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  secondaryColor?: string;
  per90Key?: string;
  secondaryPer90Key?: string;
};

// Premium desaturated colors
const OUTFIELD_STAT_OPTIONS: StatOption[] = [
  { 
    value: "goals", label: "Gols", color: "hsl(152, 50%, 42%)", 
    secondaryValue: "assists", secondaryLabel: "Assistências", secondaryColor: "hsl(217, 60%, 55%)",
    per90Key: "goals_per90", secondaryPer90Key: "assists_per90"
  },
  { 
    value: "shots", label: "Chutes", color: "hsl(217, 60%, 55%)", 
    secondaryValue: "shots_on_target", secondaryLabel: "No Gol", secondaryColor: "hsl(152, 50%, 42%)",
    per90Key: "shots_per90", secondaryPer90Key: "shots_on_target_per90"
  },
  { 
    value: "key_passes", label: "Passes Decisivos", color: "hsl(265, 50%, 55%)", 
    secondaryValue: "chances_created", secondaryLabel: "Chances Criadas", secondaryColor: "hsl(40, 70%, 50%)",
    per90Key: "key_passes_per90", secondaryPer90Key: "chances_created_per90"
  },
  { 
    value: "tackles", label: "Desarmes", color: "hsl(217, 60%, 55%)", 
    secondaryValue: "interceptions", secondaryLabel: "Interceptações", secondaryColor: "hsl(152, 50%, 42%)",
    per90Key: "tackles_per90", secondaryPer90Key: "interceptions_per90"
  },
  { 
    value: "recoveries", label: "Recuperações", color: "hsl(265, 50%, 55%)",
    per90Key: "recoveries_per90"
  },
  { value: "matches", label: "Jogos", color: "hsl(217, 60%, 55%)", secondaryValue: "minutes", secondaryLabel: "Minutos (÷10)", secondaryColor: "hsl(40, 70%, 50%)" },
  { value: "yellow_cards", label: "Amarelos", color: "hsl(40, 70%, 50%)", secondaryValue: "red_cards", secondaryLabel: "Vermelhos", secondaryColor: "hsl(0, 55%, 50%)" },
];

const GK_STAT_OPTIONS: StatOption[] = [
  { 
    value: "saves", label: "Defesas", color: "hsl(152, 50%, 42%)", 
    secondaryValue: "goals_conceded", secondaryLabel: "Gols Sofridos", secondaryColor: "hsl(0, 55%, 50%)",
    per90Key: "saves_per90", secondaryPer90Key: "goals_conceded_per90"
  },
  { value: "clean_sheets", label: "Clean Sheets", color: "hsl(217, 60%, 55%)" },
  { value: "penalties_saved", label: "Pênaltis Defendidos", color: "hsl(265, 50%, 55%)" },
  { value: "matches", label: "Jogos", color: "hsl(217, 60%, 55%)", secondaryValue: "minutes", secondaryLabel: "Minutos (÷10)", secondaryColor: "hsl(40, 70%, 50%)" },
];

// Helper to calculate per 90 stat
const calcPer90 = (value: number, minutes: number): number => {
  if (minutes === 0) return 0;
  return Math.round((value / minutes) * 90 * 100) / 100;
};

// Premium Tooltip Component
const PremiumTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="
        bg-zinc-950/95 backdrop-blur-sm 
        border border-zinc-800/60 
        rounded-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]
        p-4 min-w-[160px]
      ">
        {/* Season header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/50">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Temporada</span>
          <span className="text-sm font-bold text-white">{label}</span>
        </div>
        
        {/* Values */}
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-zinc-400">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold text-white tabular-nums">
                {entry.dataKey === 'minutesScaled' 
                  ? (entry.value * 10).toLocaleString()
                  : typeof entry.value === 'number' 
                    ? entry.value.toFixed(entry.dataKey.includes('per90') ? 2 : 0)
                    : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Premium Legend Component
const PremiumLegend = (props: any) => {
  const { payload } = props;
  
  return (
    <div className="flex items-center justify-center gap-5 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-zinc-500 font-medium">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function SeasonEvolutionChart({ stats, isGoalkeeper = false }: SeasonEvolutionChartProps) {
  const statOptions = isGoalkeeper ? GK_STAT_OPTIONS : OUTFIELD_STAT_OPTIONS;
  const [selectedStat, setSelectedStat] = useState<string>(statOptions[0].value);
  const [showPer90, setShowPer90] = useState(false);

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
          // Per 90 initialized later
          goals_per90: 0,
          assists_per90: 0,
          shots_per90: 0,
          shots_on_target_per90: 0,
          key_passes_per90: 0,
          chances_created_per90: 0,
          tackles_per90: 0,
          interceptions_per90: 0,
          recoveries_per90: 0,
          saves_per90: 0,
          goals_conceded_per90: 0,
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

    // Calculate per 90 stats and sort by season ascending
    return Object.values(seasonMap)
      .sort((a, b) => parseInt(a.season) - parseInt(b.season))
      .map(s => ({
        ...s,
        // Scale minutes for chart visualization
        minutesScaled: Math.round(s.minutes / 10),
        // Per 90 calculations
        goals_per90: calcPer90(s.goals, s.minutes),
        assists_per90: calcPer90(s.assists, s.minutes),
        shots_per90: calcPer90(s.shots, s.minutes),
        shots_on_target_per90: calcPer90(s.shots_on_target, s.minutes),
        key_passes_per90: calcPer90(s.key_passes, s.minutes),
        chances_created_per90: calcPer90(s.chances_created, s.minutes),
        tackles_per90: calcPer90(s.tackles, s.minutes),
        interceptions_per90: calcPer90(s.interceptions, s.minutes),
        recoveries_per90: calcPer90(s.recoveries, s.minutes),
        saves_per90: calcPer90(s.saves, s.minutes),
        goals_conceded_per90: calcPer90(s.goals_conceded, s.minutes),
      }));
  }, [stats]);

  const currentStatOption = statOptions.find(o => o.value === selectedStat) || statOptions[0];
  
  // Determine if per90 is available for this stat
  const hasPer90 = !!currentStatOption.per90Key;
  
  // Get the correct data keys based on per90 toggle
  const primaryDataKey = showPer90 && currentStatOption.per90Key 
    ? currentStatOption.per90Key 
    : currentStatOption.value;
  const secondaryDataKey = showPer90 && currentStatOption.secondaryPer90Key 
    ? currentStatOption.secondaryPer90Key 
    : currentStatOption.secondaryValue;

  if (chartData.length < 2) {
    return null; // Don't show chart with less than 2 seasons
  }

  return (
    <Card className="border-zinc-800/50 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </div>
            Evolução por Temporada
          </CardTitle>
          
          {/* Premium Controls */}
          <div className="flex items-center gap-3">
            {/* Per 90 Toggle - Premium Style */}
            {hasPer90 && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
                <Switch
                  id="per90-toggle"
                  checked={showPer90}
                  onCheckedChange={setShowPer90}
                  className="data-[state=checked]:bg-primary h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                />
                <Label 
                  htmlFor="per90-toggle" 
                  className="text-[10px] uppercase tracking-wider text-zinc-500 cursor-pointer font-medium"
                >
                  Por 90min
                </Label>
              </div>
            )}
            
            {/* Stat Selector - Premium Style */}
            <Select value={selectedStat} onValueChange={(v) => { setSelectedStat(v); setShowPer90(false); }}>
              <SelectTrigger className="
                w-[200px] h-9
                bg-zinc-900/60 border-zinc-800/50 
                text-xs font-medium text-zinc-300
                hover:bg-zinc-800/60 hover:border-zinc-700/50
                focus:ring-1 focus:ring-primary/30 focus:border-primary/30
              ">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                {statOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-white"
                  >
                    {option.label}
                    {option.secondaryLabel && (
                      <span className="text-zinc-500"> + {option.secondaryLabel}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        {/* Chart Container - Increased height for better proportions */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
              barCategoryGap="25%"
            >
              {/* Gradient definitions for premium bars */}
              <defs>
                <linearGradient id="primaryBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentStatOption.color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={currentStatOption.color} stopOpacity={0.5} />
                </linearGradient>
                {currentStatOption.secondaryColor && (
                  <linearGradient id="secondaryBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={currentStatOption.secondaryColor} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={currentStatOption.secondaryColor} stopOpacity={0.5} />
                  </linearGradient>
                )}
              </defs>
              
              {/* Grid - Much more subtle */}
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(240, 5%, 20%)"
                strokeOpacity={0.3}
                vertical={false}
              />
              
              {/* X Axis - Subtle */}
              <XAxis
                dataKey="season"
                tick={{ fontSize: 11, fill: 'hsl(240, 5%, 45%)' }}
                axisLine={{ stroke: 'hsl(240, 5%, 20%)', strokeOpacity: 0.5 }}
                tickLine={false}
                dy={8}
              />
              
              {/* Y Axis - Minimal */}
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(240, 5%, 40%)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={showPer90}
                domain={showPer90 ? [0, 'auto'] : undefined}
                width={35}
              />
              
              {/* Premium Tooltip */}
              <Tooltip 
                content={<PremiumTooltip />}
                cursor={{ fill: 'hsl(240, 5%, 15%)', fillOpacity: 0.5 }}
              />
              
              {/* Premium Legend */}
              <Legend content={<PremiumLegend />} />
              
              {/* Primary Bar - Premium gradient with rounded corners */}
              <Bar
                dataKey={primaryDataKey}
                name={showPer90 ? `${currentStatOption.label}/90` : currentStatOption.label}
                fill="url(#primaryBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
              
              {/* Secondary Bar/Line */}
              {secondaryDataKey && currentStatOption.secondaryLabel && (
                secondaryDataKey === 'minutes' || currentStatOption.secondaryValue === 'minutes' ? (
                  <Line
                    type="monotone"
                    dataKey="minutesScaled"
                    name={currentStatOption.secondaryLabel}
                    stroke={currentStatOption.secondaryColor}
                    strokeWidth={2.5}
                    dot={{ 
                      fill: currentStatOption.secondaryColor, 
                      strokeWidth: 0,
                      r: 4
                    }}
                    activeDot={{
                      fill: currentStatOption.secondaryColor,
                      strokeWidth: 2,
                      stroke: 'hsl(240, 5%, 10%)',
                      r: 6
                    }}
                  />
                ) : (
                  <Bar
                    dataKey={secondaryDataKey}
                    name={showPer90 && currentStatOption.secondaryPer90Key 
                      ? `${currentStatOption.secondaryLabel}/90` 
                      : currentStatOption.secondaryLabel
                    }
                    fill="url(#secondaryBarGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Per90 indicator - subtle */}
        {showPer90 && (
          <p className="text-[10px] text-zinc-600 text-center mt-3 uppercase tracking-wider">
            Valores calculados por 90 minutos jogados
          </p>
        )}
      </CardContent>
    </Card>
  );
}
