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
import { ExportClinicalPdfButton } from "./ExportClinicalPdfButton";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface PlayerInfo {
  full_name: string;
  position: string;
  age?: number | null;
  birth_date?: string | null;
  nationality?: string;
  current_club?: string | null;
  photo_url?: string | null;
}

interface InjuryHistorySectionProps {
  injuries: Injury[];
  physicalStatus?: string | null;
  medicalNotes?: string | null;
  playerId?: string;
  onInjuryAdded?: () => void;
  player?: PlayerInfo;
}

type StatusKey = "fit" | "apto" | "recovering" | "em_recuperacao" | "injured" | "lesionado" | "transition" | "transicao" | "retorno_progressivo";

interface StatusConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
}

// Premium desaturated status colors for clinical authority
const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  fit: {
    label: "Apto para Atividade",
    description: "Atleta liberado para treinos e competições",
    icon: CheckCircle2,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/8",
    borderClass: "border-emerald-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]",
  },
  apto: {
    label: "Apto para Atividade",
    description: "Atleta liberado para treinos e competições",
    icon: CheckCircle2,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/8",
    borderClass: "border-emerald-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]",
  },
  recovering: {
    label: "Em Recuperação",
    description: "Atleta em tratamento médico supervisionado",
    icon: Activity,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/8",
    borderClass: "border-amber-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]",
  },
  em_recuperacao: {
    label: "Em Recuperação",
    description: "Atleta em tratamento médico supervisionado",
    icon: Activity,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/8",
    borderClass: "border-amber-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]",
  },
  injured: {
    label: "Afastado por Lesão",
    description: "Atleta em período de recuperação completa",
    icon: XCircle,
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/8",
    borderClass: "border-rose-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(244,63,94,0.15)]",
  },
  lesionado: {
    label: "Afastado por Lesão",
    description: "Atleta em período de recuperação completa",
    icon: XCircle,
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/8",
    borderClass: "border-rose-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(244,63,94,0.15)]",
  },
  transition: {
    label: "Retorno Progressivo",
    description: "Atleta em transição para atividades normais",
    icon: AlertTriangle,
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/8",
    borderClass: "border-sky-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]",
  },
  transicao: {
    label: "Retorno Progressivo",
    description: "Atleta em transição para atividades normais",
    icon: AlertTriangle,
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/8",
    borderClass: "border-sky-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]",
  },
  retorno_progressivo: {
    label: "Retorno Progressivo",
    description: "Atleta em transição para atividades normais",
    icon: AlertTriangle,
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/8",
    borderClass: "border-sky-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]",
  },
};

const DEFAULT_STATUS: StatusConfig = {
  label: "Apto para Atividade",
  description: "Atleta liberado para treinos e competições",
  icon: CheckCircle2,
  colorClass: "text-emerald-400",
  bgClass: "bg-emerald-500/8",
  borderClass: "border-emerald-500/20",
  glowClass: "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]",
};

const getSeverityConfig = (severity: string) => {
  const severityMap: Record<string, { label: string; colorClass: string; bgClass: string; borderClass: string }> = {
    mild: { label: "Leve", colorClass: "text-emerald-400/90", bgClass: "bg-emerald-500/8", borderClass: "border-emerald-500/20" },
    leve: { label: "Leve", colorClass: "text-emerald-400/90", bgClass: "bg-emerald-500/8", borderClass: "border-emerald-500/20" },
    medium: { label: "Moderada", colorClass: "text-amber-400/90", bgClass: "bg-amber-500/8", borderClass: "border-amber-500/20" },
    media: { label: "Moderada", colorClass: "text-amber-400/90", bgClass: "bg-amber-500/8", borderClass: "border-amber-500/20" },
    média: { label: "Moderada", colorClass: "text-amber-400/90", bgClass: "bg-amber-500/8", borderClass: "border-amber-500/20" },
    severe: { label: "Grave", colorClass: "text-rose-400/90", bgClass: "bg-rose-500/8", borderClass: "border-rose-500/20" },
    grave: { label: "Grave", colorClass: "text-rose-400/90", bgClass: "bg-rose-500/8", borderClass: "border-rose-500/20" },
  };
  
  return severityMap[severity.toLowerCase()] || { 
    label: severity.charAt(0).toUpperCase() + severity.slice(1), 
    colorClass: "text-zinc-400", 
    bgClass: "bg-zinc-800/50",
    borderClass: "border-zinc-700/30"
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

// Premium Clinical Section Card
const ClinicalCard = ({
  title,
  icon: Icon,
  children,
  action,
  badge,
  className = ""
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}) => (
  <Card className={`
    border-zinc-800/50 
    bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95
    shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]
    ${className}
  `}>
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
          <span>{title}</span>
          {badge}
        </CardTitle>
        {action}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// Card 1: Status Físico Atual - Premium Medical Seal
const PhysicalStatusCard = ({ status }: { status: string | null | undefined }) => {
  const statusKey = (status?.toLowerCase() || "apto") as StatusKey;
  const config = STATUS_CONFIG[statusKey] || DEFAULT_STATUS;
  const StatusIcon = config.icon;

  return (
    <div className={`
      relative rounded-xl overflow-hidden
      bg-gradient-to-b from-zinc-900/80 via-zinc-900/60 to-zinc-950/80
      border ${config.borderClass}
      ${config.glowClass}
    `}>
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-zinc-400" />
          </div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Status Físico Atual
          </h3>
        </div>
        
        {/* Premium Medical Seal */}
        <div className="flex flex-col items-center justify-center py-6 space-y-5">
          {/* Icon with layered background */}
          <div className="relative">
            <div className={`absolute inset-0 rounded-full ${config.bgClass} blur-xl scale-150`} />
            <div className={`relative p-5 rounded-full ${config.bgClass} border ${config.borderClass}`}>
              <StatusIcon className={`w-10 h-10 ${config.colorClass}`} />
            </div>
          </div>
          
          {/* Status Label - Premium Seal Style */}
          <div className="text-center space-y-2">
            <div className={`
              inline-flex px-5 py-2 rounded-full
              ${config.bgClass} border ${config.borderClass}
            `}>
              <span className={`text-sm font-semibold tracking-wide ${config.colorClass}`}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-[200px]">
              {config.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Card 2: Histórico de Lesões - Clinical Timeline
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
    <ClinicalCard
      title="Histórico de Lesões"
      icon={Stethoscope}
      badge={
        sortedInjuries.length > 0 ? (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/30 text-[10px] font-medium text-zinc-400">
            {sortedInjuries.length} {sortedInjuries.length === 1 ? "registro" : "registros"}
          </span>
        ) : null
      }
      action={
        playerId && onInjuryAdded ? (
          <AddInjuryModal playerId={playerId} onInjuryAdded={onInjuryAdded} />
        ) : null
      }
    >
      {sortedInjuries.length > 0 ? (
        <div className="relative space-y-4">
          {/* Timeline line - subtle */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />
          
          {sortedInjuries.map((injury) => {
            const severityConfig = getSeverityConfig(injury.severity);
            const isOngoing = !injury.return_date;
            
            return (
              <div key={injury.id} className="relative pl-9">
                {/* Timeline dot */}
                <div 
                  className={`
                    absolute left-0 top-3 w-6 h-6 rounded-full 
                    border flex items-center justify-center
                    ${isOngoing 
                      ? "bg-rose-500/10 border-rose-500/30" 
                      : "bg-zinc-800/60 border-zinc-700/30"
                    }
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${isOngoing ? "bg-rose-400" : "bg-zinc-600"}`} />
                </div>
                
                {/* Injury card - premium style */}
                <div className="
                  p-4 rounded-xl 
                  bg-zinc-900/50 border border-zinc-800/50
                  hover:bg-zinc-900/70 hover:border-zinc-700/50
                  transition-all duration-200 group
                ">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{injury.injury_type}</h4>
                      {isOngoing && (
                        <span className="inline-flex mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Em tratamento
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`
                        px-2.5 py-1 rounded-md text-xs font-medium
                        ${severityConfig.bgClass} ${severityConfig.colorClass} 
                        border ${severityConfig.borderClass}
                      `}>
                        {severityConfig.label}
                      </span>
                      {/* Edit/Delete - ghost buttons */}
                      {onInjuryAdded && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <EditInjuryModal
                            injury={injury}
                            onInjuryUpdated={onInjuryAdded}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-300">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            }
                          />
                          <DeleteInjuryDialog
                            injuryId={injury.id}
                            injuryType={injury.injury_type}
                            onInjuryDeleted={onInjuryAdded}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-rose-400">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Date info - clean grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                      <div>
                        <span className="text-zinc-500 text-xs">Início</span>
                        <p className="text-zinc-300 text-sm font-medium">{formatDate(injury.start_date)}</p>
                      </div>
                    </div>
                    {injury.return_date ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                        <div>
                          <span className="text-zinc-500 text-xs">Retorno</span>
                          <p className="text-zinc-300 text-sm font-medium">{formatDate(injury.return_date)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500/70" />
                        <div>
                          <span className="text-zinc-500 text-xs">Retorno</span>
                          <p className="text-amber-400/80 text-sm font-medium">Pendente</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Duration - subtle footer */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Tempo de afastamento</span>
                      <span className="text-xs font-semibold text-zinc-400">
                        {calculateDaysAway(injury.start_date, injury.return_date)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Notes - clinical style */}
                  {injury.notes && (
                    <div className="mt-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/20">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {injury.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state - institutional style */
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl scale-150" />
            <div className="relative p-4 rounded-full bg-emerald-500/8 border border-emerald-500/20">
              <ShieldCheck className="w-8 h-8 text-emerald-400/80" />
            </div>
          </div>
          <p className="font-semibold text-white mb-1">Histórico Clínico Limpo</p>
          <p className="text-xs text-zinc-500 max-w-[220px]">
            Nenhuma lesão registrada no prontuário do atleta
          </p>
        </div>
      )}
    </ClinicalCard>
  );
};

// Card 3: Observações Médicas - Clinical Notes
const MedicalNotesCard = ({ notes }: { notes: string | null | undefined }) => {
  return (
    <ClinicalCard title="Observações Médicas" icon={FileText}>
      {notes ? (
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {notes}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center mb-3">
            <FileText className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500">Nenhuma observação clínica registrada</p>
        </div>
      )}
    </ClinicalCard>
  );
};

export const InjuryHistorySection = ({ 
  injuries, 
  physicalStatus, 
  medicalNotes,
  playerId,
  onInjuryAdded,
  player
}: InjuryHistorySectionProps) => {
  return (
    <div className="space-y-6">
      {/* Export PDF Button */}
      {player && (
        <div className="flex justify-end">
          <ExportClinicalPdfButton
            player={player}
            injuries={injuries}
            physicalStatus={physicalStatus}
            medicalNotes={medicalNotes}
          />
        </div>
      )}
      
      {/* Alerta de Lesões Recorrentes */}
      <RecurrentInjuryAlert injuries={injuries} threshold={3} />
      
      {/* Card 1: Status Físico Atual - Premium Medical Seal */}
      <PhysicalStatusCard status={physicalStatus} />
      
      {/* Card 2: Histórico de Lesões */}
      <InjuryHistoryCard 
        injuries={injuries} 
        playerId={playerId}
        onInjuryAdded={onInjuryAdded}
      />
      
      {/* Gráfico de Evolução */}
      <InjuryEvolutionChart injuries={injuries} />
      
      {/* Card 3: Observações Médicas */}
      <MedicalNotesCard notes={medicalNotes} />
    </div>
  );
};
