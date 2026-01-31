import * as React from "react";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Clock } from "lucide-react";
import { parseDateSafe, daysBetween } from "@/lib/dateUtils";
import { safeArray } from "@/lib/utils";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface InjuryEvolutionChartProps {
  injuries: Injury[];
}

interface YearlyStats {
  year: string;
  total: number;
  leve: number;
  media: number;
  grave: number;
  avgRecoveryDays: number;
  totalDaysAway: number;
}

// Use timezone-safe daysBetween utility
const calculateRecoveryDays = (startDate: string, returnDate: string | null): number => {
  return daysBetween(startDate, returnDate);
};

const normalizeSeverity = (severity: string): "leve" | "media" | "grave" => {
  const s = severity.toLowerCase();
  if (s === "mild" || s === "leve") return "leve";
  if (s === "medium" || s === "media" || s === "média") return "media";
  if (s === "severe" || s === "grave") return "grave";
  return "leve";
};

export function InjuryEvolutionChart({ injuries }: InjuryEvolutionChartProps) {
  const safeInjuries = safeArray(injuries);

  const { yearlyData, totalStats } = useMemo(() => {
    if (safeInjuries.length === 0) {
      return { yearlyData: [], totalStats: null };
    }

    // Group injuries by year using timezone-safe parsing
    const byYear: Record<string, Injury[]> = {};
    
    safeInjuries.forEach((injury) => {
      const year = parseDateSafe(injury.start_date).getFullYear().toString();
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(injury);
    });

    // Get year range
    const years = Object.keys(byYear).sort();
    const minYear = parseInt(years[0]);
    const maxYear = Math.max(parseInt(years[years.length - 1]), new Date().getFullYear());

    // Fill in missing years
    const yearlyStats: YearlyStats[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      const yearStr = y.toString();
      const yearInjuries = byYear[yearStr] || [];
      
      let leve = 0, media = 0, grave = 0;
      let totalDays = 0;
      
      yearInjuries.forEach((inj) => {
        const sev = normalizeSeverity(inj.severity);
        if (sev === "leve") leve++;
        else if (sev === "media") media++;
        else if (sev === "grave") grave++;
        
        totalDays += calculateRecoveryDays(inj.start_date, inj.return_date);
      });

      yearlyStats.push({
        year: yearStr,
        total: yearInjuries.length,
        leve,
        media,
        grave,
        avgRecoveryDays: yearInjuries.length > 0 ? Math.round(totalDays / yearInjuries.length) : 0,
        totalDaysAway: totalDays,
      });
    }

    // Calculate totals
    const totalInjuries = safeInjuries.length;
    const totalDaysAway = safeInjuries.reduce(
      (acc, inj) => acc + calculateRecoveryDays(inj.start_date, inj.return_date),
      0
    );
    const avgRecovery = totalInjuries > 0 ? Math.round(totalDaysAway / totalInjuries) : 0;

    return {
      yearlyData: yearlyStats,
      totalStats: {
        totalInjuries,
        totalDaysAway,
        avgRecovery,
      },
    };
  }, [safeInjuries]);

  if (safeInjuries.length < 2) {
    return null; // Don't show chart with less than 2 injuries
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução do Histórico Clínico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {totalStats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
              <Activity className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{totalStats.totalInjuries}</p>
              <p className="text-xs text-muted-foreground">Total de Lesões</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{totalStats.avgRecovery}</p>
              <p className="text-xs text-muted-foreground">Média de Dias</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{totalStats.totalDaysAway}</p>
              <p className="text-xs text-muted-foreground">Total Afastado</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    leve: "Leve",
                    media: "Média",
                    grave: "Grave",
                    avgRecoveryDays: "Média Recuperação",
                  };
                  const suffix = name === "avgRecoveryDays" ? " dias" : "";
                  return [`${value}${suffix}`, labels[name] || name];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    leve: "Leve",
                    media: "Média",
                    grave: "Grave",
                    avgRecoveryDays: "Dias Recuperação",
                  };
                  return labels[value] || value;
                }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="leve" 
                stackId="injuries" 
                fill="hsl(142, 76%, 36%)" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                yAxisId="left" 
                dataKey="media" 
                stackId="injuries" 
                fill="hsl(45, 93%, 47%)" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                yAxisId="left" 
                dataKey="grave" 
                stackId="injuries" 
                fill="hsl(0, 84%, 60%)" 
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgRecoveryDays"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend explanation */}
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500" />
            <span>Leve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            <span>Média</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" />
            <span>Grave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-blue-500" />
            <span>Dias de Recuperação (média)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
