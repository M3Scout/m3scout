import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Scale, Ruler, Zap, Timer, Heart, Calendar, Dumbbell, Percent, Target, TrendingUp } from "lucide-react";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Tooltip } from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { PhysicalEvolutionChart } from "./PhysicalEvolutionChart";

interface PhysicalData {
  weight?: number | null;
  body_fat_percentage?: number | null;
  muscle_mass?: number | null;
  wingspan?: number | null;
  height?: number | null;
  max_speed?: number | null;
  sprint_30m?: number | null;
  vo2_max?: number | null;
  last_physical_evaluation?: string | null;
  position?: string | null;
}

interface PhysicalDataSectionProps {
  data: PhysicalData;
  playerId?: string;
  playerName?: string;
}

// Position-based ideal ranges for body fat percentage
const BODY_FAT_BY_POSITION: Record<string, { min: number; max: number; label: string }> = {
  // Attackers / Wingers
  "atacante": { min: 7, max: 9, label: "Atacante" },
  "ponta": { min: 7, max: 9, label: "Ponta" },
  "ponta esquerda": { min: 7, max: 9, label: "Ponta Esquerda" },
  "ponta direita": { min: 7, max: 9, label: "Ponta Direita" },
  "centroavante": { min: 7, max: 9, label: "Centroavante" },
  "segundo atacante": { min: 7, max: 9, label: "Segundo Atacante" },
  // Midfielders
  "meia": { min: 8, max: 10, label: "Meia" },
  "meia atacante": { min: 8, max: 10, label: "Meia Atacante" },
  "meia central": { min: 8, max: 10, label: "Meia Central" },
  "meia armador": { min: 8, max: 10, label: "Meia Armador" },
  // Fullbacks
  "lateral": { min: 8, max: 10, label: "Lateral" },
  "lateral esquerdo": { min: 8, max: 10, label: "Lateral Esquerdo" },
  "lateral direito": { min: 8, max: 10, label: "Lateral Direito" },
  "ala": { min: 8, max: 10, label: "Ala" },
  // Defensive Midfielders
  "volante": { min: 9, max: 11, label: "Volante" },
  "primeiro volante": { min: 9, max: 11, label: "Primeiro Volante" },
  "segundo volante": { min: 9, max: 11, label: "Segundo Volante" },
  // Center Backs
  "zagueiro": { min: 9, max: 12, label: "Zagueiro" },
  "zagueiro central": { min: 9, max: 12, label: "Zagueiro Central" },
  "defensor central": { min: 9, max: 12, label: "Defensor Central" },
  // Goalkeepers
  "goleiro": { min: 10, max: 13, label: "Goleiro" },
  "gk": { min: 10, max: 13, label: "Goleiro" },
  "goalkeeper": { min: 10, max: 13, label: "Goleiro" },
};

// Position-based ideal ranges for muscle mass percentage
const MUSCLE_MASS_BY_POSITION: Record<string, { min: number; max: number; label: string }> = {
  // Wingers / Attackers
  "ponta": { min: 44, max: 47, label: "Ponta" },
  "ponta esquerda": { min: 44, max: 47, label: "Ponta Esquerda" },
  "ponta direita": { min: 44, max: 47, label: "Ponta Direita" },
  "atacante": { min: 44, max: 47, label: "Atacante" },
  "centroavante": { min: 44, max: 47, label: "Centroavante" },
  "segundo atacante": { min: 44, max: 47, label: "Segundo Atacante" },
  // Midfielders
  "meia": { min: 45, max: 48, label: "Meia" },
  "meia atacante": { min: 45, max: 48, label: "Meia Atacante" },
  "meia central": { min: 45, max: 48, label: "Meia Central" },
  "meia armador": { min: 45, max: 48, label: "Meia Armador" },
  // Fullbacks
  "lateral": { min: 46, max: 49, label: "Lateral" },
  "lateral esquerdo": { min: 46, max: 49, label: "Lateral Esquerdo" },
  "lateral direito": { min: 46, max: 49, label: "Lateral Direito" },
  "ala": { min: 46, max: 49, label: "Ala" },
  // Defensive Midfielders
  "volante": { min: 48, max: 51, label: "Volante" },
  "primeiro volante": { min: 48, max: 51, label: "Primeiro Volante" },
  "segundo volante": { min: 48, max: 51, label: "Segundo Volante" },
  // Center Backs
  "zagueiro": { min: 50, max: 54, label: "Zagueiro" },
  "zagueiro central": { min: 50, max: 54, label: "Zagueiro Central" },
  "defensor central": { min: 50, max: 54, label: "Defensor Central" },
  // Goalkeepers
  "goleiro": { min: 50, max: 55, label: "Goleiro" },
  "gk": { min: 50, max: 55, label: "Goleiro" },
  "goalkeeper": { min: 50, max: 55, label: "Goleiro" },
};

// Get position range for body fat
const getBodyFatRange = (position: string | null | undefined): { min: number; max: number; label: string } | null => {
  if (!position) return null;
  const normalizedPosition = position.toLowerCase().trim();
  return BODY_FAT_BY_POSITION[normalizedPosition] || null;
};

// Get position range for muscle mass
const getMuscleMassRange = (position: string | null | undefined): { min: number; max: number; label: string } | null => {
  if (!position) return null;
  const normalizedPosition = position.toLowerCase().trim();
  return MUSCLE_MASS_BY_POSITION[normalizedPosition] || null;
};

// Calculate lean mass: peso_magro = peso × (1 − gordura_percentual/100)
const calculateLeanMass = (weight: number | null | undefined, bodyFatPercentage: number | null | undefined): number | null => {
  if (!weight || bodyFatPercentage === null || bodyFatPercentage === undefined) return null;
  return weight * (1 - bodyFatPercentage / 100);
};

// Calculate estimated muscle mass: massa_muscular = peso_magro × 0.50
const calculateEstimatedMuscleMass = (leanMass: number | null): number | null => {
  if (leanMass === null) return null;
  return leanMass * 0.50;
};

// Calculate muscle mass percentage: massa_muscular_percent = (massa_muscular / peso) × 100
const calculateMuscleMassPercentage = (muscleMass: number | null, weight: number | null | undefined): number | null => {
  if (muscleMass === null || !weight) return null;
  return (muscleMass / weight) * 100;
};

// Ideal ranges for athletes (min, ideal_low, ideal_high, max)
const METRIC_RANGES: Record<string, { min: number; idealLow: number; idealHigh: number; max: number; unit: string; inverse?: boolean }> = {
  height: { min: 160, idealLow: 170, idealHigh: 190, max: 200, unit: "cm" },
  weight: { min: 55, idealLow: 65, idealHigh: 85, max: 100, unit: "kg" },
  wingspan: { min: 160, idealLow: 175, idealHigh: 200, max: 215, unit: "cm" },
  body_fat_percentage: { min: 5, idealLow: 8, idealHigh: 15, max: 25, unit: "%", inverse: true },
  muscle_mass: { min: 30, idealLow: 40, idealHigh: 55, max: 65, unit: "kg" },
  muscle_mass_percentage: { min: 40, idealLow: 44, idealHigh: 55, max: 60, unit: "%", inverse: false },
  bmi: { min: 18, idealLow: 20, idealHigh: 24, max: 28, unit: "" },
  max_speed: { min: 25, idealLow: 30, idealHigh: 35, max: 40, unit: "km/h" },
  sprint_30m: { min: 3.5, idealLow: 3.8, idealHigh: 4.3, max: 5.0, unit: "s", inverse: true },
  vo2_max: { min: 40, idealLow: 50, idealHigh: 65, max: 75, unit: "ml/kg/min" },
};

// Elite benchmarks (values that represent elite performance - 100%)
const ELITE_BENCHMARKS: Record<string, { value: number; label: string }> = {
  max_speed: { value: 36, label: "Velocidade" },
  sprint_30m: { value: 3.9, label: "Sprint" },
  vo2_max: { value: 65, label: "VO2 Máx" },
  body_fat_percentage: { value: 10, label: "% Gordura" },
  muscle_mass: { value: 45, label: "Massa Musc." },
};

// Calculate BMI from weight (kg) and height (cm)
const calculateBMI = (weight: number | null | undefined, height: number | null | undefined): number | null => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

// Normalize value to 0-100 scale for radar chart
const normalizeValue = (value: number | null | undefined, metricKey: string): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  
  const benchmark = ELITE_BENCHMARKS[metricKey];
  if (!benchmark) return null;

  const range = METRIC_RANGES[metricKey];
  if (!range) return null;

  if (range.inverse) {
    // For inverse metrics (lower is better)
    const normalizedValue = ((range.max - value) / (range.max - benchmark.value)) * 100;
    return Math.max(0, Math.min(100, normalizedValue));
  } else {
    // For normal metrics (higher is better)
    const normalizedValue = (value / benchmark.value) * 100;
    return Math.max(0, Math.min(120, normalizedValue));
  }
};

// Get status based on position-specific ranges
type MetricStatus = "low" | "ideal" | "high" | "unknown";

const getPositionBasedStatus = (
  value: number | null | undefined, 
  range: { min: number; max: number } | null,
  inverse: boolean = false
): { status: MetricStatus; color: string } => {
  if (value === null || value === undefined || !Number.isFinite(value) || !range) {
    return { status: "unknown", color: "bg-muted" };
  }

  let status: MetricStatus;
  if (inverse) {
    // For inverse metrics (lower is better, like body fat)
    if (value < range.min) status = "low"; // Too low (could be unhealthy)
    else if (value <= range.max) status = "ideal";
    else status = "high";
  } else {
    // For normal metrics (higher in range is better)
    if (value < range.min) status = "low";
    else if (value <= range.max) status = "ideal";
    else status = "high";
  }

  const colors: Record<MetricStatus, string> = {
    low: "bg-amber-500",
    ideal: "bg-emerald-500",
    high: "bg-red-500",
    unknown: "bg-muted",
  };

  return { status, color: colors[status] };
};

// Get status and percentage for a metric
const getMetricStatus = (value: number | null | undefined, metricKey: string): { 
  percentage: number; 
  status: MetricStatus;
  color: string;
} => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return { percentage: 0, status: "unknown", color: "bg-muted" };
  }

  const range = METRIC_RANGES[metricKey];
  if (!range) {
    return { percentage: 50, status: "ideal", color: "bg-primary" };
  }

  const { min, idealLow, idealHigh, max, inverse } = range;
  
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  let status: MetricStatus;
  if (inverse) {
    if (value <= idealHigh) status = "ideal";
    else if (value <= max) status = "high";
    else status = "high";
    if (value < idealLow) status = "low";
  } else {
    if (value < idealLow) status = "low";
    else if (value <= idealHigh) status = "ideal";
    else status = "high";
  }

  const colors: Record<MetricStatus, string> = {
    low: "bg-amber-500",
    ideal: "bg-emerald-500",
    high: "bg-red-500",
    unknown: "bg-muted",
  };

  return { percentage, status, color: colors[status] };
};

const getStatusLabel = (status: MetricStatus): string => {
  const labels: Record<MetricStatus, string> = {
    low: "Abaixo",
    ideal: "Ideal",
    high: "Acima",
    unknown: "",
  };
  return labels[status];
};

const getStatusBadgeClasses = (status: MetricStatus): string => {
  switch (status) {
    case "ideal": return "bg-emerald-500/20 text-emerald-400";
    case "low": return "bg-amber-500/20 text-amber-400";
    case "high": return "bg-red-500/20 text-red-400";
    default: return "bg-muted/20 text-muted-foreground";
  }
};

// Premium Block Title
const BlockTitle = ({ 
  icon: Icon, 
  title 
}: { 
  icon: React.ElementType; 
  title: string;
}) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
    </div>
    <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
      {title}
    </h4>
  </div>
);

// Premium Metric Card with hierarchy: number > context > detail
const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  unit,
  metricKey
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | null | undefined; 
  unit: string;
  metricKey: string;
}) => {
  const hasValue = value !== null && value !== undefined && Number.isFinite(value);
  const { percentage, status, color } = getMetricStatus(value, metricKey);
  
  return (
    <div className={cn(
      "relative flex flex-col p-4 rounded-xl min-h-[120px]",
      "bg-gradient-to-br from-zinc-900/80 to-zinc-950/80",
      "border border-zinc-800/40",
      "transition-all duration-200 hover:border-zinc-700/50"
    )}>
      {/* Icon - Secondary position */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-lg bg-zinc-800/50 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-zinc-600" />
        </div>
        {hasValue && status !== "unknown" && (
          <span className={cn(
            "text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
            getStatusBadgeClasses(status)
          )}>
            {getStatusLabel(status)}
          </span>
        )}
      </div>
      
      {/* Value - Primary hierarchy */}
      <div className="flex-1 flex flex-col justify-center">
        {hasValue ? (
          <div>
            <span className="text-3xl font-bold text-white tabular-nums">
              {formatFixed(value, 1)}
            </span>
            <span className="text-sm text-zinc-600 ml-1">{unit}</span>
          </div>
        ) : (
          <div className="flex flex-col items-start">
            <span className="text-sm text-zinc-700">Dado não coletado</span>
          </div>
        )}
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-1">{label}</p>
      </div>

      {/* Progress bar - Thinner and more elegant */}
      {hasValue && (
        <div className="mt-3">
          <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full w-full relative">
              {/* Ideal zone - subtle */}
              <div 
                className="absolute h-full bg-emerald-500/10 rounded-full"
                style={{
                  left: `${((METRIC_RANGES[metricKey]?.idealLow ?? 0) - (METRIC_RANGES[metricKey]?.min ?? 0)) / ((METRIC_RANGES[metricKey]?.max ?? 100) - (METRIC_RANGES[metricKey]?.min ?? 0)) * 100}%`,
                  width: `${((METRIC_RANGES[metricKey]?.idealHigh ?? 100) - (METRIC_RANGES[metricKey]?.idealLow ?? 0)) / ((METRIC_RANGES[metricKey]?.max ?? 100) - (METRIC_RANGES[metricKey]?.min ?? 0)) * 100}%`
                }}
              />
              <div 
                className={cn("absolute h-full rounded-full transition-all duration-500", color)}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Premium Position-based body composition card with tooltip
const BodyCompositionCard = ({ 
  icon: Icon, 
  label, 
  value, 
  unit,
  position,
  metricType
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | null | undefined; 
  unit: string;
  position: string | null | undefined;
  metricType: "body_fat" | "muscle_mass";
}) => {
  const hasValue = value !== null && value !== undefined && Number.isFinite(value);
  
  const range = metricType === "body_fat" 
    ? getBodyFatRange(position)
    : getMuscleMassRange(position);
  
  const { status, color } = getPositionBasedStatus(
    value, 
    range, 
    metricType === "body_fat"
  );

  // Calculate percentage for progress bar based on position range
  let percentage = 50;
  if (hasValue && range) {
    const rangeSpan = range.max - range.min;
    const buffer = rangeSpan * 0.5;
    const displayMin = range.min - buffer;
    const displayMax = range.max + buffer;
    percentage = ((value! - displayMin) / (displayMax - displayMin)) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
  }

  const idealZoneStart = range ? 25 : 0;
  const idealZoneWidth = range ? 50 : 0;
  const positionLabel = range?.label || (position ? position : "Posição não definida");
  
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "relative flex flex-col p-4 rounded-xl min-h-[140px] cursor-help",
            "bg-gradient-to-br from-zinc-900/80 to-zinc-950/80",
            "border border-zinc-800/40",
            "transition-all duration-200 hover:border-zinc-700/50"
          )}>
            {/* Icon - Secondary */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-zinc-600" />
              </div>
              {hasValue && status !== "unknown" && (
                <span className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  getStatusBadgeClasses(status)
                )}>
                  {getStatusLabel(status)}
                </span>
              )}
            </div>
            
            {/* Value - Primary */}
            <div className="flex-1 flex flex-col justify-center">
              {hasValue ? (
                <div>
                  <span className="text-3xl font-bold text-white tabular-nums">
                    {formatFixed(value, 1)}
                  </span>
                  <span className="text-sm text-zinc-600 ml-1">{unit}</span>
                </div>
              ) : (
                <span className="text-sm text-zinc-700">Dado não coletado</span>
              )}
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-1">{label}</p>
            </div>

            {/* Position reference - Discrete */}
            {range && (
              <div className="text-[9px] text-zinc-700 mt-2">
                Ref: {range.min}–{range.max}% <span className="text-zinc-800">({positionLabel})</span>
              </div>
            )}

            {/* Progress bar - Thinner */}
            {hasValue && range && (
              <div className="mt-2">
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden relative">
                  {/* Ideal zone indicator */}
                  <div 
                    className="absolute h-full bg-emerald-500/15 rounded-full"
                    style={{
                      left: `${idealZoneStart}%`,
                      width: `${idealZoneWidth}%`
                    }}
                  />
                  {/* Current value indicator */}
                  <div 
                    className={cn(
                      "absolute h-full w-1.5 rounded-full transition-all duration-500 -translate-x-1/2",
                      color
                    )}
                    style={{ left: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-zinc-900/95 border-zinc-800 shadow-2xl">
          <div className="space-y-1.5 text-xs p-1">
            <p className="font-semibold text-zinc-200">
              {metricType === "body_fat" ? "% Gordura Corporal" : "% Massa Muscular"}
            </p>
            {range ? (
              <>
                <p className="text-zinc-500">
                  Faixa ideal para <span className="text-zinc-300">{positionLabel}</span>:{" "}
                  <span className="text-emerald-400 font-semibold">{range.min}–{range.max}%</span>
                </p>
                {hasValue && (
                  <p className="text-zinc-500">
                    Valor atual:{" "}
                    <span className={cn(
                      "font-semibold",
                      status === "ideal" && "text-emerald-400",
                      status === "low" && "text-amber-400",
                      status === "high" && "text-rose-400"
                    )}>
                      {formatFixed(value, 1)}%
                    </span>
                    {status !== "unknown" && (
                      <span className={cn(
                        "ml-1",
                        status === "ideal" && "text-emerald-400",
                        status === "low" && "text-amber-400",
                        status === "high" && "text-rose-400"
                      )}>
                        ({getStatusLabel(status)})
                      </span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-zinc-600">
                Defina a posição do atleta para ver a faixa ideal.
              </p>
            )}
          </div>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
};

// Premium Physical Radar Chart
const PhysicalRadarChart = ({ data }: { data: PhysicalData }) => {
  // Calculate muscle mass percentage for radar
  const leanMass = calculateLeanMass(data.weight, data.body_fat_percentage);
  const estimatedMuscleMass = calculateEstimatedMuscleMass(leanMass);
  const muscleMassPercentage = calculateMuscleMassPercentage(estimatedMuscleMass, data.weight);

  const radarData = Object.entries(ELITE_BENCHMARKS).map(([key, benchmark]) => {
    let value: number | null | undefined;
    
    switch (key) {
      case "max_speed": value = data.max_speed; break;
      case "sprint_30m": value = data.sprint_30m; break;
      case "vo2_max": value = data.vo2_max; break;
      case "body_fat_percentage": value = data.body_fat_percentage; break;
      case "muscle_mass_percentage": value = muscleMassPercentage; break;
      default: value = null;
    }

    const normalizedValue = normalizeValue(value, key);

    return {
      metric: benchmark.label,
      atleta: normalizedValue ?? 0,
      elite: 100,
      hasData: normalizedValue !== null,
    };
  });

  // Check if we have any data to show
  const hasAnyData = radarData.some(d => d.hasData);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-center">
        <div className="relative mb-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-800/30 border border-zinc-800/40" />
          <div className="relative z-10 w-12 h-12 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-zinc-800/50">
            <TrendingUp className="w-6 h-6 text-zinc-700" />
          </div>
        </div>
        <p className="text-sm text-zinc-600">Dados insuficientes para gerar radar</p>
        <p className="text-[10px] text-zinc-700 uppercase tracking-wider mt-1">
          Adicione métricas de performance
        </p>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid 
            stroke="hsl(240,5%,20%)" 
            strokeOpacity={0.4}
          />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ 
              fill: "hsl(240,5%,50%)", 
              fontSize: 10,
              fontWeight: 500
            }}
          />
          {/* Elite benchmark - subtle dashed reference */}
          <Radar
            name="Elite"
            dataKey="elite"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.05}
            strokeWidth={1}
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
          {/* Athlete values - stronger and focused */}
          <Radar
            name="Atleta"
            dataKey="atleta"
            stroke="hsl(142, 70%, 45%)"
            fill="hsl(142, 70%, 45%)"
            fillOpacity={0.2}
            strokeWidth={2.5}
          />
          <Legend 
            wrapperStyle={{ 
              paddingTop: 10,
              fontSize: 10
            }}
            formatter={(value) => (
              <span className="text-zinc-500">
                {value === "Elite" ? "Benchmark Elite" : "Atleta"}
              </span>
            )}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(240,6%,10%)",
              border: "1px solid hsl(240,5%,20%)",
              borderRadius: 12,
              fontSize: 11,
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
            }}
            formatter={(value: number, name: string) => [
              <span key={name} className="font-bold">{value.toFixed(0)}%</span>,
              name === "elite" ? "Benchmark Elite" : "Atleta"
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PhysicalDataSection = ({ data, playerId, playerName }: PhysicalDataSectionProps) => {
  // Fetch the latest physical evaluation from history for real-time updates
  const { data: latestEvaluation } = useQuery({
    queryKey: ["latest-physical-evaluation", playerId],
    queryFn: async () => {
      if (!playerId) return null;
      const { data: records, error } = await supabase
        .from("player_physical_history")
        .select("*")
        .eq("player_id", playerId)
        .order("recorded_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return Array.isArray(records) && records.length > 0 ? records[0] : null;
    },
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
  });

  // Merge: use latest evaluation data if available, otherwise fallback to player static data
  // Priority: latestEvaluation > data (player static fields)
  const mergedData: PhysicalData = {
    height: data.height, // Height and wingspan are static, not in evaluations
    wingspan: data.wingspan,
    position: data.position,
    // For evaluation fields: use latest if exists and has value, else fallback
    weight: latestEvaluation?.weight ?? data.weight,
    body_fat_percentage: latestEvaluation?.body_fat_percentage ?? data.body_fat_percentage,
    muscle_mass: latestEvaluation?.muscle_mass ?? data.muscle_mass,
    max_speed: latestEvaluation?.max_speed ?? data.max_speed,
    sprint_30m: latestEvaluation?.sprint_30m ?? data.sprint_30m,
    vo2_max: latestEvaluation?.vo2_max ?? data.vo2_max,
    last_physical_evaluation: latestEvaluation?.recorded_at ?? data.last_physical_evaluation,
  };

  const bmi = calculateBMI(mergedData.weight, mergedData.height);


  return (
    <div className="space-y-6">
      {/* Evolution Chart - Only show if playerId is provided */}
      {playerId && (
        <PhysicalEvolutionChart 
          playerId={playerId}
          playerName={playerName}
          currentData={{
            weight: mergedData.weight,
            body_fat_percentage: mergedData.body_fat_percentage,
            muscle_mass: mergedData.muscle_mass,
            max_speed: mergedData.max_speed,
            sprint_30m: mergedData.sprint_30m,
            vo2_max: mergedData.vo2_max,
          }}
        />
      )}

      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Dados Físicos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Radar Chart - Performance vs Elite */}
          <div>
            <BlockTitle icon={TrendingUp} title="Performance vs Elite" />
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/40 p-4">
              <PhysicalRadarChart data={mergedData} />
              <p className="text-[10px] text-zinc-700 text-center mt-2 uppercase tracking-wider">
                Comparação com benchmarks elite (100% = nível elite)
              </p>
            </div>
          </div>

          {/* Block A - Medidas Corporais */}
          <div>
            <BlockTitle icon={Ruler} title="Medidas Corporais" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard icon={Ruler} label="Altura" value={mergedData.height} unit="cm" metricKey="height" />
              <MetricCard icon={Scale} label="Peso" value={mergedData.weight} unit="kg" metricKey="weight" />
              <MetricCard icon={Ruler} label="Envergadura" value={mergedData.wingspan} unit="cm" metricKey="wingspan" />
            </div>
          </div>

          {/* Block B - Composição Corporal (Position-based) */}
          <div>
            <BlockTitle icon={Dumbbell} title="Composição Corporal" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <BodyCompositionCard 
                icon={Percent} 
                label="% Gordura" 
                value={mergedData.body_fat_percentage} 
                unit="%" 
                position={mergedData.position}
                metricType="body_fat"
              />
              <MetricCard
                icon={Dumbbell}
                label="Massa Muscular"
                value={mergedData.muscle_mass}
                unit="kg"
                metricKey="muscle_mass"
              />
              <MetricCard icon={Target} label="IMC" value={bmi} unit="" metricKey="bmi" />
            </div>
          </div>

          {/* Block C - Performance Física */}
          <div>
            <BlockTitle icon={Zap} title="Performance" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard icon={Zap} label="Velocidade Máx." value={mergedData.max_speed} unit="km/h" metricKey="max_speed" />
              <MetricCard icon={Timer} label="Sprint 30m" value={mergedData.sprint_30m} unit="s" metricKey="sprint_30m" />
              <MetricCard icon={Heart} label="VO2 Máx" value={mergedData.vo2_max} unit="ml/kg/min" metricKey="vo2_max" />
            </div>
          </div>

          {/* Last evaluation footer - Discrete */}
          {mergedData.last_physical_evaluation && (
            <div className="pt-4 border-t border-zinc-800/40 flex items-center gap-2 text-xs text-zinc-600">
              <Calendar className="w-3.5 h-3.5" />
              <span>Última avaliação:</span>
              <span className="font-medium text-zinc-400">
                {new Date(mergedData.last_physical_evaluation).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
