import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Stethoscope, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity,
  Clock,
  FileText,
  HeartPulse,
  ShieldCheck,
  Pencil,
  Trash2
} from "lucide-react";
import { safeArray } from "@/lib/utils";
import { AddInjuryModal } from "./AddInjuryModal";
import { EditInjuryModal } from "./EditInjuryModal";
import { DeleteInjuryDialog } from "./DeleteInjuryDialog";
import { InjuryEvolutionChart } from "./InjuryEvolutionChart";
import { RecurrentInjuryAlert } from "./RecurrentInjuryAlert";

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
  playerId?: string;
  onInjuryAdded?: () => void;
}

type StatusKey = "fit" | "apto" | "recovering" | "em_recuperacao" | "injured" | "lesionado" | "transition" | "transicao" | "retorno_progressivo";

interface StatusConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  fit: {
    label: "Apto",
    description: "Liberado para treinos e jogos",
    icon: CheckCircle2,
    colorClass: "text-green-500",
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500/30",
  },
  apto: {
    label: "Apto",
    description: "Liberado para treinos e jogos",
    icon: CheckCircle2,
    colorClass: "text-green-500",
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500/30",
  },
  recovering: {
    label: "Em Recuperação",
    description: "Em tratamento médico",
    icon: Activity,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
  },
  em_recuperacao: {
    label: "Em Recuperação",
    description: "Em tratamento médico",
    icon: Activity,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
  },
  injured: {
    label: "Lesionado",
    description: "Afastado por lesão",
    icon: XCircle,
    colorClass: "text-red-500",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/30",
  },
  lesionado: {
    label: "Lesionado",
    description: "Afastado por lesão",
    icon: XCircle,
    colorClass: "text-red-500",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/30",
  },
  transition: {
    label: "Retorno Progressivo",
    description: "Em transição para atividades normais",
    icon: AlertTriangle,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
  },
  transicao: {
    label: "Retorno Progressivo",
    description: "Em transição para atividades normais",
    icon: AlertTriangle,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
  },
  retorno_progressivo: {
    label: "Retorno Progressivo",
    description: "Em transição para atividades normais",
    icon: AlertTriangle,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
  },
};

const DEFAULT_STATUS: StatusConfig = {
  label: "Apto",
  description: "Liberado para treinos e jogos",
  icon: CheckCircle2,
  colorClass: "text-green-500",
  bgClass: "bg-green-500/10",
  borderClass: "border-green-500/30",
};

const getSeverityConfig = (severity: string) => {
  const severityMap: Record<string, { label: string; colorClass: string; bgClass: string }> = {
    mild: { label: "Leve", colorClass: "text-green-600", bgClass: "bg-green-500/10" },
    leve: { label: "Leve", colorClass: "text-green-600", bgClass: "bg-green-500/10" },
    medium: { label: "Média", colorClass: "text-amber-600", bgClass: "bg-amber-500/10" },
    media: { label: "Média", colorClass: "text-amber-600", bgClass: "bg-amber-500/10" },
    média: { label: "Média", colorClass: "text-amber-600", bgClass: "bg-amber-500/10" },
    severe: { label: "Grave", colorClass: "text-red-600", bgClass: "bg-red-500/10" },
    grave: { label: "Grave", colorClass: "text-red-600", bgClass: "bg-red-500/10" },
  };
  
  return severityMap[severity.toLowerCase()] || { 
    label: severity.charAt(0).toUpperCase() + severity.slice(1), 
    colorClass: "text-muted-foreground", 
    bgClass: "bg-muted" 
  };
};

const calculateDaysAway = (startDate: string, returnDate: string | null): string => {
  const start = new Date(startDate);
  const end = returnDate ? new Date(returnDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return "1 dia";
  if (diffDays < 7) return `${diffDays} dias`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 semana" : `${weeks} semanas`;
  }
  const months = Math.floor(diffDays / 30);
  return months === 1 ? "1 mês" : `${months} meses`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Card 1: Status Físico Atual
const PhysicalStatusCard = ({ status }: { status: string | null | undefined }) => {
  const statusKey = (status?.toLowerCase() || "apto") as StatusKey;
  const config = STATUS_CONFIG[statusKey] || DEFAULT_STATUS;
  const StatusIcon = config.icon;

  return (
    <Card className={`border-2 ${config.borderClass} ${config.bgClass}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="w-5 h-5 text-primary" />
          Status Físico Atual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div className={`p-4 rounded-full ${config.bgClass}`}>
            <StatusIcon className={`w-12 h-12 ${config.colorClass}`} />
          </div>
          <Badge 
            variant="outline" 
            className={`text-lg px-6 py-2 font-semibold ${config.colorClass} ${config.bgClass} ${config.borderClass}`}
          >
            {config.label}
          </Badge>
          <p className="text-sm text-muted-foreground text-center">
            {config.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Card 2: Histórico de Lesões
interface InjuryHistoryCardProps {
  injuries: Injury[];
  playerId?: string;
  onInjuryAdded?: () => void;
}

const InjuryHistoryCard = ({ injuries, playerId, onInjuryAdded }: InjuryHistoryCardProps) => {
  const sortedInjuries = [...safeArray(injuries)].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-5 h-5 text-primary" />
            Histórico de Lesões
            {sortedInjuries.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {sortedInjuries.length} {sortedInjuries.length === 1 ? "registro" : "registros"}
              </Badge>
            )}
          </CardTitle>
          {playerId && onInjuryAdded && (
            <AddInjuryModal playerId={playerId} onInjuryAdded={onInjuryAdded} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedInjuries.length > 0 ? (
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
            
            {sortedInjuries.map((injury, index) => {
              const severityConfig = getSeverityConfig(injury.severity);
              const isOngoing = !injury.return_date;
              
              return (
                <div key={injury.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div 
                    className={`absolute left-0 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isOngoing 
                        ? "bg-red-500/20 border-red-500" 
                        : "bg-background border-muted-foreground/30"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isOngoing ? "bg-red-500" : "bg-muted-foreground/50"}`} />
                  </div>
                  
                  {/* Injury card */}
                  <div className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{injury.injury_type}</h4>
                        {isOngoing && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            Em tratamento
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${severityConfig.colorClass} ${severityConfig.bgClass} shrink-0`}
                        >
                          {severityConfig.label}
                        </Badge>
                        {/* Edit/Delete buttons - only show if we have callback */}
                        {onInjuryAdded && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditInjuryModal
                              injury={injury}
                              onInjuryUpdated={onInjuryAdded}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              }
                            />
                            <DeleteInjuryDialog
                              injuryId={injury.id}
                              injuryType={injury.injury_type}
                              onInjuryDeleted={onInjuryAdded}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Início: {formatDate(injury.start_date)}</span>
                      </div>
                      {injury.return_date ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span>Retorno: {formatDate(injury.return_date)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Aguardando retorno</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">
                        Tempo afastado: <span className="font-medium text-foreground">{calculateDaysAway(injury.start_date, injury.return_date)}</span>
                      </span>
                    </div>
                    
                    {injury.notes && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        "{injury.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-green-500/10 mb-4">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>
            <p className="font-medium text-foreground">Nenhuma lesão registrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Histórico clínico limpo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Card 3: Observações Médicas
const MedicalNotesCard = ({ notes }: { notes: string | null | undefined }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5 text-primary" />
          Observações Médicas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes ? (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {notes}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma observação registrada
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const InjuryHistorySection = ({ 
  injuries, 
  physicalStatus, 
  medicalNotes,
  playerId,
  onInjuryAdded 
}: InjuryHistorySectionProps) => {
  return (
    <div className="space-y-6">
      {/* Alerta de Lesões Recorrentes - aparece primeiro se houver */}
      <RecurrentInjuryAlert injuries={injuries} threshold={3} />
      
      {/* Card 1: Status Físico Atual - Maior destaque */}
      <PhysicalStatusCard status={physicalStatus} />
      
      {/* Card 2: Histórico de Lesões */}
      <InjuryHistoryCard 
        injuries={injuries} 
        playerId={playerId}
        onInjuryAdded={onInjuryAdded}
      />
      
      {/* Gráfico de Evolução - só aparece com 2+ lesões */}
      <InjuryEvolutionChart injuries={injuries} />
      
      {/* Card 3: Observações Médicas */}
      <MedicalNotesCard notes={medicalNotes} />
    </div>
  );
};
