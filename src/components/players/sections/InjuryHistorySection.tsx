import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Calendar, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { safeArray } from "@/lib/utils";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface InjuryHistorySectionProps {
  injuries: Injury[];
  physicalStatus?: string | null;
  medicalNotes?: string | null;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "mild":
    case "leve":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "medium":
    case "media":
    case "média":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "severe":
    case "grave":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: string | null | undefined) => {
  switch (status) {
    case "fit":
    case "apto":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "recovering":
    case "em_recuperacao":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "transition":
    case "transicao":
      return <AlertCircle className="w-4 h-4 text-blue-500" />;
    default:
      return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
};

const getStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case "fit":
    case "apto":
      return "Apto";
    case "recovering":
    case "em_recuperacao":
      return "Em Recuperação";
    case "transition":
    case "transicao":
      return "Transição";
    default:
      return "Apto";
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case "mild":
      return "Leve";
    case "medium":
      return "Média";
    case "severe":
      return "Grave";
    default:
      return severity.charAt(0).toUpperCase() + severity.slice(1);
  }
};

export const InjuryHistorySection = ({ injuries, physicalStatus, medicalNotes }: InjuryHistorySectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          Histórico Clínico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Physical Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
          {getStatusIcon(physicalStatus)}
          <div>
            <p className="text-xs text-muted-foreground">Status Físico Atual</p>
            <p className="font-medium">{getStatusLabel(physicalStatus)}</p>
          </div>
        </div>

        {/* Injuries List */}
        {(injuries?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Lesões Anteriores</h4>
            {safeArray(injuries).map((injury) => (
              <div key={injury.id} className="p-3 rounded-lg border border-border/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{injury.injury_type}</p>
                  <Badge variant="outline" className={getSeverityColor(injury.severity)}>
                    {getSeverityLabel(injury.severity)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Início: {new Date(injury.start_date).toLocaleDateString("pt-BR")}
                  </div>
                  {injury.return_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Retorno: {new Date(injury.return_date).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
                {injury.notes && (
                  <p className="text-sm text-muted-foreground">{injury.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma lesão registrada</p>
        )}

        {/* Medical Notes */}
        {medicalNotes && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Observações Médicas</p>
            <p className="text-sm">{medicalNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
