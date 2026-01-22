import { Card, CardContent } from "@/components/ui/card";
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
  MessageSquare,
  AlertTriangle,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractHistoryTimeline } from "./ContractHistoryTimeline";

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
  playerId?: string;
}

// Check if contract expires within X months
const getExpirationAlert = (contractEnd: string | null | undefined): { 
  isExpiring: boolean; 
  monthsRemaining: number;
  message: string;
  severity: "critical" | "warning" | "none";
} => {
  if (!contractEnd) {
    return { isExpiring: false, monthsRemaining: -1, message: "", severity: "none" };
  }

  const endDate = new Date(contractEnd);
  const now = new Date();
  
  const monthsRemaining = (endDate.getFullYear() - now.getFullYear()) * 12 
    + (endDate.getMonth() - now.getMonth());

  if (monthsRemaining < 0) {
    return { 
      isExpiring: true, 
      monthsRemaining: 0, 
      message: "Contrato encerrado",
      severity: "critical"
    };
  }
  
  if (monthsRemaining <= 3) {
    return { 
      isExpiring: true, 
      monthsRemaining, 
      message: `Expira em ${monthsRemaining} ${monthsRemaining === 1 ? "mês" : "meses"}`,
      severity: "critical"
    };
  }
  
  if (monthsRemaining <= 6) {
    return { 
      isExpiring: true, 
      monthsRemaining, 
      message: `Expira em ${monthsRemaining} meses`,
      severity: "warning"
    };
  }

  return { isExpiring: false, monthsRemaining, message: "", severity: "none" };
};

type ContractStatus = "contracted" | "contratado" | "free" | "livre" | "loan" | "emprestimo" | "negotiation" | "negociacao";

// Premium desaturated status configuration
const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  glowClass: string;
  icon: React.ElementType;
}> = {
  contracted: { 
    label: "Contratado", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/8", 
    borderColor: "border-emerald-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]",
    icon: CheckCircle 
  },
  contratado: { 
    label: "Contratado", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/8", 
    borderColor: "border-emerald-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]",
    icon: CheckCircle 
  },
  free: { 
    label: "Livre no Mercado", 
    color: "text-zinc-400", 
    bgColor: "bg-zinc-500/8", 
    borderColor: "border-zinc-500/20",
    glowClass: "",
    icon: AlertCircle 
  },
  livre: { 
    label: "Livre no Mercado", 
    color: "text-zinc-400", 
    bgColor: "bg-zinc-500/8", 
    borderColor: "border-zinc-500/20",
    glowClass: "",
    icon: AlertCircle 
  },
  loan: { 
    label: "Emprestado", 
    color: "text-sky-400", 
    bgColor: "bg-sky-500/8", 
    borderColor: "border-sky-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]",
    icon: ArrowRightLeft 
  },
  emprestimo: { 
    label: "Emprestado", 
    color: "text-sky-400", 
    bgColor: "bg-sky-500/8", 
    borderColor: "border-sky-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]",
    icon: ArrowRightLeft 
  },
  negotiation: { 
    label: "Em Negociação", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/8", 
    borderColor: "border-amber-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]",
    icon: MessageSquare 
  },
  negociacao: { 
    label: "Em Negociação", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/8", 
    borderColor: "border-amber-500/20",
    glowClass: "shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]",
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

// Premium Section Card
const SectionCard = ({ 
  title, 
  icon: Icon, 
  children,
  className = "",
  variant = "default"
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "highlight" | "financial";
}) => (
  <div className={cn(
    "relative rounded-xl overflow-hidden",
    "bg-gradient-to-b from-zinc-900/80 via-zinc-900/60 to-zinc-950/80",
    "border border-zinc-800/50",
    "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]",
    variant === "highlight" && "ring-1 ring-primary/10",
    variant === "financial" && "ring-1 ring-amber-500/10",
    className
  )}>
    {/* Top glow line */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />
    
    <div className="p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-500" />
        </div>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {title}
        </h4>
      </div>
      {children}
    </div>
  </div>
);

// Empty value display - professional style
const EmptyValue = () => (
  <span className="text-sm text-zinc-600">Não informado</span>
);

// Premium Expiration Alert Banner
const ExpirationAlertBanner = ({ contractEnd }: { contractEnd: string | null | undefined }) => {
  const alert = getExpirationAlert(contractEnd);
  
  if (!alert.isExpiring) return null;

  const isCritical = alert.severity === "critical";

  return (
    <div className={cn(
      "relative flex items-start gap-4 p-4 rounded-xl border overflow-hidden",
      isCritical 
        ? "bg-rose-500/5 border-rose-500/20" 
        : "bg-amber-500/5 border-amber-500/20"
    )}>
      {/* Subtle glow */}
      <div className={cn(
        "absolute inset-0 opacity-30",
        isCritical 
          ? "bg-gradient-to-r from-rose-500/10 via-transparent to-transparent"
          : "bg-gradient-to-r from-amber-500/10 via-transparent to-transparent"
      )} />
      
      <div className={cn(
        "relative flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        isCritical ? "bg-rose-500/10" : "bg-amber-500/10"
      )}>
        <AlertTriangle className={cn(
          "w-5 h-5",
          isCritical ? "text-rose-400" : "text-amber-400"
        )} />
      </div>
      
      <div className="relative flex-1">
        <p className={cn(
          "text-sm font-semibold mb-0.5",
          isCritical ? "text-rose-400" : "text-amber-400"
        )}>
          {isCritical ? "Atenção Urgente" : "Atenção"}
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {alert.message}. {alert.monthsRemaining <= 3 && alert.monthsRemaining > 0 
            ? "Recomenda-se iniciar negociações imediatamente." 
            : alert.monthsRemaining === 0 
              ? "O vínculo contratual já expirou."
              : "Recomenda-se iniciar conversas sobre renovação."}
        </p>
      </div>
    </div>
  );
};

// Contract Duration Visual Timeline
const ContractDurationTimeline = ({ 
  start, 
  end,
  severity
}: { 
  start: string | null; 
  end: string | null;
  severity: "critical" | "warning" | "none";
}) => {
  if (!start) return null;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const now = new Date();
  
  // Calculate progress
  let progress = 100;
  if (endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  // Calculate remaining time
  const remainingMonths = endDate 
    ? (endDate.getFullYear() - now.getFullYear()) * 12 + (endDate.getMonth() - now.getMonth())
    : null;

  let remainingText = "";
  if (remainingMonths !== null) {
    if (remainingMonths <= 0) {
      remainingText = "Encerrado";
    } else {
      const years = Math.floor(remainingMonths / 12);
      const months = remainingMonths % 12;
      if (years > 0) remainingText += `${years}a`;
      if (months > 0) remainingText += `${years > 0 ? " " : ""}${months}m`;
      remainingText += " restantes";
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800/50">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-zinc-800/80 rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            severity === "critical" ? "bg-rose-500/60" :
            severity === "warning" ? "bg-amber-500/60" : "bg-primary/60"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Duration info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Clock className="w-3 h-3" />
          <span>
            {calculateContractDurationText(start, end)}
          </span>
        </div>
        {remainingText && (
          <span className={cn(
            "font-medium",
            severity === "critical" ? "text-rose-400" :
            severity === "warning" ? "text-amber-400" : "text-zinc-400"
          )}>
            {remainingText}
          </span>
        )}
      </div>
    </div>
  );
};

export const ContractSection = ({ data, playerId }: ContractSectionProps) => {
  const statusConfig = getStatusConfig(data.contract_status);
  const StatusIcon = statusConfig.icon;
  const hasPassports = Array.isArray(data?.passports) && data.passports.length > 0;
  const expirationAlert = getExpirationAlert(data.contract_end);

  return (
    <div className="space-y-6">
      {/* Main Contract Panel */}
      <Card className="border-zinc-800/50 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Situação Contratual</h3>
              <p className="text-xs text-zinc-500">Informações jurídicas e contratuais do atleta</p>
            </div>
          </div>

          {/* Expiration Alert Banner */}
          <ExpirationAlertBanner contractEnd={data.contract_end} />

          {/* Status Contratual - Premium Legal Seal */}
          <div className={cn(
            "relative rounded-xl overflow-hidden p-6",
            "bg-gradient-to-b from-zinc-900/80 via-zinc-900/60 to-zinc-950/80",
            "border",
            statusConfig.borderColor,
            statusConfig.glowClass
          )}>
            {/* Top glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Status Contratual</p>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    statusConfig.bgColor,
                    "border",
                    statusConfig.borderColor
                  )}>
                    <StatusIcon className={cn("w-6 h-6", statusConfig.color)} />
                  </div>
                  <span className={cn("text-2xl font-bold tracking-tight", statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
              
              {/* Expiration badge inline - discrete */}
              {expirationAlert.isExpiring && (
                <span className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border",
                  expirationAlert.severity === "critical"
                    ? "bg-rose-500/8 text-rose-400 border-rose-500/20"
                    : "bg-amber-500/8 text-amber-400 border-amber-500/20"
                )}>
                  <AlertTriangle className="w-3 h-3 inline mr-1.5" />
                  {expirationAlert.message}
                </span>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clube Atual */}
            <SectionCard title="Clube Atual" icon={Building2}>
              <div className="space-y-1">
                {data.current_club ? (
                  <>
                    <p className="text-xl font-bold text-white">{data.current_club}</p>
                    {data.country && (
                      <p className="text-sm text-zinc-500">{data.country}</p>
                    )}
                  </>
                ) : (
                  <EmptyValue />
                )}
              </div>
            </SectionCard>

            {/* Vigência - Contract Timeline */}
            <SectionCard title="Vigência" icon={Calendar}>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Início</p>
                  {data.contract_start ? (
                    <p className="text-base font-semibold text-white">{formatDate(data.contract_start)}</p>
                  ) : (
                    <EmptyValue />
                  )}
                </div>
                <div className="h-10 w-px bg-zinc-800" />
                <div className="flex-1">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Término</p>
                  {data.contract_end ? (
                    <p className={cn(
                      "text-base font-semibold",
                      expirationAlert.severity === "critical" ? "text-rose-400" :
                      expirationAlert.severity === "warning" ? "text-amber-400" : "text-white"
                    )}>
                      {formatDate(data.contract_end)}
                    </p>
                  ) : (
                    <span className="text-sm text-zinc-500">Indeterminado</span>
                  )}
                </div>
              </div>
              
              {/* Duration Timeline Visual */}
              <ContractDurationTimeline 
                start={data.contract_start} 
                end={data.contract_end}
                severity={expirationAlert.severity}
              />
            </SectionCard>

            {/* Representação */}
            <SectionCard title="Representação" icon={User}>
              <div className="space-y-3">
                {data.agent_name ? (
                  <>
                    <p className="text-base font-semibold text-white">{data.agent_name}</p>
                    {data.agent_contact && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Phone className="w-3.5 h-3.5 text-zinc-600" />
                        <span>{data.agent_contact}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyValue />
                )}
              </div>
            </SectionCard>

            {/* Cláusulas Financeiras - Premium Financial Highlight */}
            <SectionCard title="Cláusulas Financeiras" icon={DollarSign} variant="financial">
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Multa Rescisória</p>
                  {data.release_clause ? (
                    <p className="text-2xl font-bold text-amber-400 tabular-nums">{data.release_clause}</p>
                  ) : (
                    <EmptyValue />
                  )}
                </div>
                {data.salary_info && (
                  <div className="pt-3 border-t border-zinc-800/50">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Informação Salarial</p>
                    <p className="text-sm font-medium text-zinc-300">{data.salary_info}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Additional Info Section */}
          {(hasPassports || data.contract_notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Passports */}
              {hasPassports && (
                <SectionCard title="Passaportes" icon={Globe}>
                  <div className="flex flex-wrap gap-2">
                    {data.passports!.map((passport) => (
                      <span 
                        key={passport}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800/60 text-zinc-300 border border-zinc-700/30"
                      >
                        {passport}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Contract Notes */}
              {data.contract_notes && (
                <SectionCard 
                  title="Observações Contratuais" 
                  icon={FileText} 
                  className={!hasPassports ? "md:col-span-2" : ""}
                >
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {data.contract_notes}
                  </p>
                </SectionCard>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract History Timeline */}
      {playerId && (
        <ContractHistoryTimeline playerId={playerId} />
      )}
    </div>
  );
};

// Helper function to calculate contract duration text
function calculateContractDurationText(start: string | null, end: string | null): string {
  if (!start) return "";
  
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  
  const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  let durationText = "Duração: ";
  if (years > 0) durationText += `${years} ano${years > 1 ? "s" : ""}`;
  if (months > 0) durationText += `${years > 0 ? " e " : ""}${months} ${months > 1 ? "meses" : "mês"}`;
  
  return durationText || "Duração: < 1 mês";
}
