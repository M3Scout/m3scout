import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Star, TrendingUp, CheckCircle, XCircle, Trophy, Lock } from "lucide-react";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface EvaluationData {
  overall_rating?: number | null;
  potential_rating?: number | null;
  ready_to_compete?: boolean | null;
  estimated_level?: string | null;
  internal_evaluation_notes?: string | null;
  internal_notes?: string | null;
}

interface InternalEvaluationSectionProps {
  data: EvaluationData;
}

// Premium Rating Display with emphasis on value
const RatingDisplay = ({ 
  label, 
  value, 
  icon: Icon,
  variant = "default"
}: { 
  label: string; 
  value: number | null | undefined; 
  icon: React.ElementType;
  variant?: "default" | "primary" | "accent";
}) => {
  const variantStyles = {
    default: {
      container: "from-zinc-900/80 to-zinc-950/80 border-white/[0.04]",
      iconBg: "bg-zinc-800/80",
      iconColor: "text-zinc-500",
      valueColor: "text-white",
    },
    primary: {
      container: "from-primary/[0.06] via-zinc-900/80 to-zinc-950/80 border-primary/10",
      iconBg: "bg-primary/10 shadow-[0_0_12px_2px_rgba(220,38,38,0.08)]",
      iconColor: "text-primary",
      valueColor: "text-white",
    },
    accent: {
      container: "from-amber-500/[0.04] via-zinc-900/80 to-zinc-950/80 border-amber-500/10",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      valueColor: "text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "group relative p-5 rounded-xl",
      "bg-gradient-to-br border backdrop-blur-sm",
      "transition-all duration-200",
      "hover:border-white/[0.08] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]",
      styles.container
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          "transition-all duration-200",
          styles.iconBg
        )}>
          <Icon className={cn("w-5 h-5", styles.iconColor)} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-1.5">
            {value !== null && value !== undefined ? (
              <>
                <span className={cn("text-3xl font-bold tracking-tight", styles.valueColor)}>
                  {formatFixed(value, 1)}
                </span>
                <span className="text-sm text-zinc-600 font-medium">/10</span>
              </>
            ) : (
              <span className="text-xl text-zinc-600">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium Status Card
const StatusCard = ({
  icon: Icon,
  iconColor,
  label,
  children
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div className={cn(
    "group relative p-4 rounded-xl",
    "bg-gradient-to-br from-zinc-900/80 to-zinc-950/80",
    "border border-white/[0.04] backdrop-blur-sm",
    "transition-all duration-200",
    "hover:border-white/[0.08]"
  )}>
    <div className="flex items-center gap-3">
      <Icon className={cn("w-5 h-5 shrink-0", iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-1">{label}</p>
        {children}
      </div>
    </div>
  </div>
);

const getLevelColor = (level: string | null | undefined) => {
  switch (level?.toLowerCase()) {
    case "internacional":
    case "international":
      return "bg-purple-500/[0.08] text-purple-400/90 border-purple-500/20";
    case "serie_a":
    case "série a":
      return "bg-emerald-500/[0.08] text-emerald-400/90 border-emerald-500/20";
    case "serie_b":
    case "série b":
      return "bg-blue-500/[0.08] text-blue-400/90 border-blue-500/20";
    case "serie_c":
    case "série c":
      return "bg-amber-500/[0.08] text-amber-400/90 border-amber-500/20";
    case "serie_d":
    case "série d":
      return "bg-orange-500/[0.08] text-orange-400/90 border-orange-500/20";
    default:
      return "bg-zinc-800/50 text-zinc-400 border-zinc-700/50";
  }
};

export const InternalEvaluationSection = ({ data }: InternalEvaluationSectionProps) => {
  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      {/* Confidential header stripe */}
      <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Avaliação Interna
          </span>
          <Badge 
            variant="outline" 
            className={cn(
              "ml-auto text-[10px] uppercase tracking-wider",
              "bg-zinc-900/80 text-amber-500/80 border-amber-500/20",
              "backdrop-blur-sm"
            )}
          >
            <Lock className="w-3 h-3 mr-1" />
            Privado
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Ratings - Primary focus */}
        <div className="grid gap-4 sm:grid-cols-2">
          <RatingDisplay 
            icon={Star} 
            label="Nota Geral" 
            value={data.overall_rating} 
            variant="primary"
          />
          <RatingDisplay 
            icon={TrendingUp} 
            label="Potencial" 
            value={data.potential_rating} 
            variant="accent"
          />
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Ready to Compete */}
          <StatusCard
            icon={data.ready_to_compete ? CheckCircle : data.ready_to_compete === false ? XCircle : CheckCircle}
            iconColor={
              data.ready_to_compete ? "text-emerald-400/90" : 
              data.ready_to_compete === false ? "text-rose-400/90" : 
              "text-zinc-600"
            }
            label="Pronto para Competir?"
          >
            <p className={cn(
              "font-semibold",
              data.ready_to_compete ? "text-emerald-400/90" :
              data.ready_to_compete === false ? "text-rose-400/90" :
              "text-zinc-500"
            )}>
              {data.ready_to_compete === true ? "Sim" : data.ready_to_compete === false ? "Não" : "—"}
            </p>
          </StatusCard>

          {/* Estimated Level */}
          <StatusCard
            icon={Trophy}
            iconColor="text-primary/80"
            label="Nível Estimado"
          >
            {data.estimated_level ? (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-medium backdrop-blur-sm border",
                  getLevelColor(data.estimated_level)
                )}
              >
                {data.estimated_level}
              </Badge>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </StatusCard>
        </div>

        {/* Internal Notes */}
        {(data.internal_evaluation_notes || data.internal_notes) && (
          <div className="pt-4 border-t border-zinc-800/50">
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-3">
              Observações Internas
            </p>
            <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {data.internal_evaluation_notes || data.internal_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
