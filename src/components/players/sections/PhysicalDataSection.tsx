import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Scale, Ruler, Zap, Timer, Heart, Calendar } from "lucide-react";
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

const DataItem = ({ 
  icon: Icon, 
  label, 
  value, 
  unit 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string | null | undefined; 
  unit?: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">
        {value !== null && value !== undefined ? (
          <>
            {typeof value === "number" ? formatFixed(value, 1) : value}
            {unit && <span className="text-muted-foreground text-sm ml-1">{unit}</span>}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
    </div>
  </div>
);

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
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DataItem icon={Scale} label="Peso" value={data.weight} unit="kg" />
          <DataItem icon={Ruler} label="Altura" value={data.height} unit="cm" />
          <DataItem icon={Scale} label="IMC" value={bmi} />
          <DataItem icon={Activity} label="% Gordura Corporal" value={data.body_fat_percentage} unit="%" />
          <DataItem icon={Activity} label="Massa Muscular" value={data.muscle_mass} unit="kg" />
          <DataItem icon={Ruler} label="Envergadura" value={data.wingspan} unit="cm" />
          <DataItem icon={Zap} label="Velocidade Máxima" value={data.max_speed} unit="km/h" />
          <DataItem icon={Timer} label="Sprint 30m" value={data.sprint_30m} unit="s" />
          <DataItem icon={Heart} label="VO2 Máx" value={data.vo2_max} unit="ml/kg/min" />
        </div>
        {data.last_physical_evaluation && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Última avaliação: {new Date(data.last_physical_evaluation).toLocaleDateString("pt-BR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
