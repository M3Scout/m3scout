import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Scale, Ruler, Zap, Timer, Heart, Calendar, Dumbbell, Percent, Target } from "lucide-react";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
}

interface PhysicalDataSectionProps {
  data: PhysicalData;
}

// Ideal ranges for athletes (min, ideal_low, ideal_high, max)
const METRIC_RANGES: Record<string, { min: number; idealLow: number; idealHigh: number; max: number; unit: string; inverse?: boolean }> = {
  height: { min: 160, idealLow: 170, idealHigh: 190, max: 200, unit: "cm" },
  weight: { min: 55, idealLow: 65, idealHigh: 85, max: 100, unit: "kg" },
  wingspan: { min: 160, idealLow: 175, idealHigh: 200, max: 215, unit: "cm" },
  body_fat_percentage: { min: 5, idealLow: 8, idealHigh: 15, max: 25, unit: "%", inverse: true },
  muscle_mass: { min: 30, idealLow: 40, idealHigh: 55, max: 65, unit: "kg" },
  bmi: { min: 18, idealLow: 20, idealHigh: 24, max: 28, unit: "" },
  max_speed: { min: 25, idealLow: 30, idealHigh: 35, max: 40, unit: "km/h" },
  sprint_30m: { min: 3.5, idealLow: 3.8, idealHigh: 4.3, max: 5.0, unit: "s", inverse: true },
  vo2_max: { min: 40, idealLow: 50, idealHigh: 65, max: 75, unit: "ml/kg/min" },
};

// Calculate BMI from weight (kg) and height (cm)
const calculateBMI = (weight: number | null | undefined, height: number | null | undefined): number | null => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

// Get status and percentage for a metric
const getMetricStatus = (value: number | null | undefined, metricKey: string): { 
  percentage: number; 
  status: "low" | "ideal" | "high" | "unknown";
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
  
  // Calculate percentage position (0-100)
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  // Determine status
  let status: "low" | "ideal" | "high";
  if (inverse) {
    // For inverse metrics (lower is better, like body fat, sprint time)
    if (value <= idealHigh) status = "ideal";
    else if (value <= max) status = "high";
    else status = "high";
    
    if (value < idealLow) status = "low"; // Too low can also be concerning
  } else {
    // For normal metrics (higher is generally better within range)
    if (value < idealLow) status = "low";
    else if (value <= idealHigh) status = "ideal";
    else status = "high";
  }

  // Color based on status
  const colors = {
    low: "bg-amber-500",
    ideal: "bg-emerald-500",
    high: "bg-amber-500",
  };

  return { percentage, status, color: colors[status] };
};

// Get status label
const getStatusLabel = (status: "low" | "ideal" | "high" | "unknown"): string => {
  const labels = {
    low: "Abaixo",
    ideal: "Ideal",
    high: "Acima",
    unknown: "",
  };
  return labels[status];
};

// Block title component
const BlockTitle = ({ 
  icon: Icon, 
  title 
}: { 
  icon: React.ElementType; 
  title: string;
}) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-1.5 rounded-md bg-primary/10">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h4>
  </div>
);

// Metric card component with progress indicator
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
    <div className="flex flex-col p-4 rounded-xl bg-secondary/40 border border-border/30 min-h-[120px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {hasValue && status !== "unknown" && (
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            status === "ideal" && "bg-emerald-500/20 text-emerald-400",
            status === "low" && "bg-amber-500/20 text-amber-400",
            status === "high" && "bg-amber-500/20 text-amber-400"
          )}>
            {getStatusLabel(status)}
          </span>
        )}
      </div>
      
      {/* Value */}
      <div className="flex-1 flex items-center justify-center">
        {hasValue ? (
          <div className="text-center">
            <span className="text-2xl font-bold text-foreground">
              {formatFixed(value, 1)}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/60 italic">Não informado</span>
        )}
      </div>

      {/* Progress bar */}
      {hasValue && (
        <div className="mt-3">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            {/* Background zones */}
            <div className="h-full w-full relative">
              {/* Full track */}
              <div className="absolute inset-0 bg-muted/50 rounded-full" />
              {/* Ideal zone indicator (subtle) */}
              <div 
                className="absolute h-full bg-emerald-500/20 rounded-full"
                style={{
                  left: `${((METRIC_RANGES[metricKey]?.idealLow ?? 0) - (METRIC_RANGES[metricKey]?.min ?? 0)) / ((METRIC_RANGES[metricKey]?.max ?? 100) - (METRIC_RANGES[metricKey]?.min ?? 0)) * 100}%`,
                  width: `${((METRIC_RANGES[metricKey]?.idealHigh ?? 100) - (METRIC_RANGES[metricKey]?.idealLow ?? 0)) / ((METRIC_RANGES[metricKey]?.max ?? 100) - (METRIC_RANGES[metricKey]?.min ?? 0)) * 100}%`
                }}
              />
              {/* Current value indicator */}
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

export const PhysicalDataSection = ({ data }: PhysicalDataSectionProps) => {
  const bmi = calculateBMI(data.weight, data.height);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Dados Físicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Block A - Medidas Corporais */}
        <div>
          <BlockTitle icon={Ruler} title="Medidas Corporais" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard icon={Ruler} label="Altura" value={data.height} unit="cm" metricKey="height" />
            <MetricCard icon={Scale} label="Peso" value={data.weight} unit="kg" metricKey="weight" />
            <MetricCard icon={Ruler} label="Envergadura" value={data.wingspan} unit="cm" metricKey="wingspan" />
          </div>
        </div>

        {/* Block B - Composição Corporal */}
        <div>
          <BlockTitle icon={Dumbbell} title="Composição Corporal" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard icon={Percent} label="% Gordura" value={data.body_fat_percentage} unit="%" metricKey="body_fat_percentage" />
            <MetricCard icon={Dumbbell} label="Massa Muscular" value={data.muscle_mass} unit="kg" metricKey="muscle_mass" />
            <MetricCard icon={Target} label="IMC" value={bmi} unit="" metricKey="bmi" />
          </div>
        </div>

        {/* Block C - Performance Física */}
        <div>
          <BlockTitle icon={Zap} title="Performance" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard icon={Zap} label="Velocidade Máx." value={data.max_speed} unit="km/h" metricKey="max_speed" />
            <MetricCard icon={Timer} label="Sprint 30m" value={data.sprint_30m} unit="s" metricKey="sprint_30m" />
            <MetricCard icon={Heart} label="VO2 Máx" value={data.vo2_max} unit="ml/kg/min" metricKey="vo2_max" />
          </div>
        </div>

        {/* Last evaluation footer */}
        {data.last_physical_evaluation && (
          <div className="pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Última avaliação:</span>
            <span className="font-medium text-foreground">
              {new Date(data.last_physical_evaluation).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
