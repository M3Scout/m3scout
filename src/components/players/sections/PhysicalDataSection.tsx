import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Scale, Ruler, Zap, Timer, Heart, Calendar, Dumbbell, Percent, Target } from "lucide-react";
import { formatFixed } from "@/lib/formatters";

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

// Calculate BMI from weight (kg) and height (cm)
const calculateBMI = (weight: number | null | undefined, height: number | null | undefined): number | null => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
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

// Metric card component
const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  unit 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | null | undefined; 
  unit: string;
}) => {
  const hasValue = value !== null && value !== undefined && Number.isFinite(value);
  
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-secondary/40 border border-border/30 min-h-[100px]">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
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
            <MetricCard icon={Ruler} label="Altura" value={data.height} unit="cm" />
            <MetricCard icon={Scale} label="Peso" value={data.weight} unit="kg" />
            <MetricCard icon={Ruler} label="Envergadura" value={data.wingspan} unit="cm" />
          </div>
        </div>

        {/* Block B - Composição Corporal */}
        <div>
          <BlockTitle icon={Dumbbell} title="Composição Corporal" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard icon={Percent} label="% Gordura" value={data.body_fat_percentage} unit="%" />
            <MetricCard icon={Dumbbell} label="Massa Muscular" value={data.muscle_mass} unit="kg" />
            <MetricCard icon={Target} label="IMC" value={bmi} unit="" />
          </div>
        </div>

        {/* Block C - Performance Física */}
        <div>
          <BlockTitle icon={Zap} title="Performance" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard icon={Zap} label="Velocidade Máx." value={data.max_speed} unit="km/h" />
            <MetricCard icon={Timer} label="Sprint 30m" value={data.sprint_30m} unit="s" />
            <MetricCard icon={Heart} label="VO2 Máx" value={data.vo2_max} unit="ml/kg/min" />
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
