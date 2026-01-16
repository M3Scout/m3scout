import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Building2, 
  Calendar, 
  User, 
  Globe, 
  DollarSign, 
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractData {
  current_club?: string | null;
  country?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  agent_name?: string | null;
  agent_contact?: string | null;
  release_clause?: string | null;
  contract_status?: string | null;
  passports?: string[] | null;
  contract_notes?: string | null;
  salary_info?: string | null;
}

interface ContractSectionProps {
  data: ContractData;
}

type ContractStatus = "contracted" | "contratado" | "free" | "livre" | "loan" | "emprestimo" | "negotiation" | "negociacao";

const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ElementType;
}> = {
  contracted: { 
    label: "Contratado", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/15", 
    borderColor: "border-emerald-500/30",
    icon: CheckCircle 
  },
  contratado: { 
    label: "Contratado", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/15", 
    borderColor: "border-emerald-500/30",
    icon: CheckCircle 
  },
  free: { 
    label: "Livre", 
    color: "text-slate-400", 
    bgColor: "bg-slate-500/15", 
    borderColor: "border-slate-500/30",
    icon: AlertCircle 
  },
  livre: { 
    label: "Livre", 
    color: "text-slate-400", 
    bgColor: "bg-slate-500/15", 
    borderColor: "border-slate-500/30",
    icon: AlertCircle 
  },
  loan: { 
    label: "Emprestado", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/15", 
    borderColor: "border-blue-500/30",
    icon: ArrowRightLeft 
  },
  emprestimo: { 
    label: "Emprestado", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/15", 
    borderColor: "border-blue-500/30",
    icon: ArrowRightLeft 
  },
  negotiation: { 
    label: "Em Negociação", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/15", 
    borderColor: "border-amber-500/30",
    icon: MessageSquare 
  },
  negociacao: { 
    label: "Em Negociação", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/15", 
    borderColor: "border-amber-500/30",
    icon: MessageSquare 
  },
};

const getStatusConfig = (status: string | null | undefined) => {
  if (!status) return STATUS_CONFIG.livre;
  const normalizedStatus = status.toLowerCase().trim();
  return STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.livre;
};

const formatDate = (date: string | null | undefined): string => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Card wrapper component
const InfoCard = ({ 
  title, 
  icon: Icon, 
  children,
  className
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn("border-border/30 bg-secondary/40", className)}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      </div>
      {children}
    </CardContent>
  </Card>
);

// Empty value display
const EmptyValue = () => (
  <span className="text-sm text-muted-foreground/60 italic">Não informado</span>
);

export const ContractSection = ({ data }: ContractSectionProps) => {
  const statusConfig = getStatusConfig(data.contract_status);
  const StatusIcon = statusConfig.icon;
  const hasPassports = Array.isArray(data?.passports) && data.passports.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Situação Contratual</h3>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1 - Status Contratual (Primary highlight) */}
        <InfoCard title="Status Contratual" icon={Briefcase} className="md:col-span-2">
          <div className={cn(
            "inline-flex items-center gap-3 px-4 py-3 rounded-xl border",
            statusConfig.bgColor,
            statusConfig.borderColor
          )}>
            <StatusIcon className={cn("w-6 h-6", statusConfig.color)} />
            <span className={cn("text-xl font-bold", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </InfoCard>

        {/* Card 2 - Clube Atual */}
        <InfoCard title="Clube Atual" icon={Building2}>
          <div className="space-y-1">
            {data.current_club ? (
              <>
                <p className="text-lg font-semibold text-foreground">{data.current_club}</p>
                {data.country && (
                  <p className="text-sm text-muted-foreground">{data.country}</p>
                )}
              </>
            ) : (
              <EmptyValue />
            )}
          </div>
        </InfoCard>

        {/* Card 3 - Vigência */}
        <InfoCard title="Vigência" icon={Calendar}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Início</p>
              {data.contract_start ? (
                <p className="text-sm font-medium text-foreground">{formatDate(data.contract_start)}</p>
              ) : (
                <EmptyValue />
              )}
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Término</p>
              {data.contract_end ? (
                <p className="text-sm font-medium text-foreground">{formatDate(data.contract_end)}</p>
              ) : (
                <span className="text-sm text-muted-foreground/60 italic">Indeterminado</span>
              )}
            </div>
          </div>
          
          {/* Contract duration indicator */}
          {data.contract_start && data.contract_end && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {calculateContractDuration(data.contract_start, data.contract_end)}
                </span>
              </div>
            </div>
          )}
        </InfoCard>

        {/* Card 4 - Representação */}
        <InfoCard title="Representação" icon={User}>
          <div className="space-y-2">
            {data.agent_name ? (
              <>
                <p className="text-sm font-medium text-foreground">{data.agent_name}</p>
                {data.agent_contact && (
                  <p className="text-xs text-muted-foreground">{data.agent_contact}</p>
                )}
              </>
            ) : (
              <EmptyValue />
            )}
          </div>
        </InfoCard>

        {/* Card 5 - Cláusulas Financeiras */}
        <InfoCard title="Cláusulas" icon={DollarSign}>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Multa Rescisória</p>
              {data.release_clause ? (
                <p className="text-lg font-bold text-foreground">{data.release_clause}</p>
              ) : (
                <EmptyValue />
              )}
            </div>
            {data.salary_info && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Info. Salarial</p>
                <p className="text-sm text-foreground">{data.salary_info}</p>
              </div>
            )}
          </div>
        </InfoCard>
      </div>

      {/* Additional Info Section */}
      {(hasPassports || data.contract_notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Passports */}
          {hasPassports && (
            <InfoCard title="Passaportes" icon={Globe}>
              <div className="flex flex-wrap gap-2">
                {data.passports!.map((passport) => (
                  <Badge 
                    key={passport} 
                    variant="secondary"
                    className="bg-secondary border border-border/50"
                  >
                    {passport}
                  </Badge>
                ))}
              </div>
            </InfoCard>
          )}

          {/* Contract Notes */}
          {data.contract_notes && (
            <InfoCard title="Observações" icon={FileText} className={!hasPassports ? "md:col-span-2" : ""}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.contract_notes}
              </p>
            </InfoCard>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to calculate contract duration
function calculateContractDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();
  
  const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  const remainingMonths = (endDate.getFullYear() - now.getFullYear()) * 12 
    + (endDate.getMonth() - now.getMonth());
  
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  let durationText = "";
  if (years > 0) durationText += `${years} ano${years > 1 ? "s" : ""}`;
  if (months > 0) durationText += `${years > 0 ? " e " : ""}${months} ${months > 1 ? "meses" : "mês"}`;
  
  if (remainingMonths > 0) {
    const remainingYears = Math.floor(remainingMonths / 12);
    const remainingMos = remainingMonths % 12;
    let remainingText = "";
    if (remainingYears > 0) remainingText += `${remainingYears} ano${remainingYears > 1 ? "s" : ""}`;
    if (remainingMos > 0) remainingText += `${remainingYears > 0 ? " e " : ""}${remainingMos} ${remainingMos > 1 ? "meses" : "mês"}`;
    return `Duração: ${durationText} • Restam: ${remainingText}`;
  } else if (remainingMonths < 0) {
    return `Duração: ${durationText} • Contrato encerrado`;
  }
  
  return `Duração: ${durationText}`;
}
