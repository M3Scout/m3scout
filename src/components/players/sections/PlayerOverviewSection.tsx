import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Building, 
  Target, 
  ThumbsUp, 
  AlertTriangle,
  Zap,
  Flag,
  Ruler,
  Calendar,
  Footprints,
  Shield,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerOverviewSectionProps {
  // Identity
  fullName: string;
  age: number | null;
  height: number | null;
  dominantFoot: string | null;
  nationality: string;
  // Contract
  currentClub: string | null;
  country: string | null;
  contractStatus: string | null;
  // Tactical
  position: string;
  secondaryPositions: string[] | null;
  primaryTacticalRole: string | null;
  secondaryTacticalRole: string | null;
  playStyle: string | null;
  strengths: string[] | null;
  areasToDevelope: string[] | null;
}

// Premium Mini Card Component with glass effect
const MiniCard = ({
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
  variant?: "default" | "primary";
}) => (
  <div 
    className={cn(
      // Base structure
      "group relative rounded-xl p-5 h-full",
      "transition-all duration-200 ease-out",
      // Gradient background for depth
      "bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-950/80",
      // Subtle luminous border
      "border border-white/[0.04]",
      "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]",
      // Hover: subtle lift
      "hover:border-white/[0.08]",
      "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_4px_20px_-4px_rgba(0,0,0,0.3)]",
      // Primary variant - more prominent
      variant === "primary" && [
        "from-zinc-900/90 via-zinc-800/70 to-zinc-900/90",
        "border-white/[0.06]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_2px_12px_-2px_rgba(0,0,0,0.2)]",
      ],
      className
    )}
  >
    {/* Header */}
    <div className="flex items-center gap-2.5 mb-5">
      <div 
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          "transition-all duration-200",
          variant === "primary" 
            ? "bg-primary/15 shadow-[0_0_12px_2px_rgba(220,38,38,0.1)]" 
            : "bg-zinc-800/80"
        )}
      >
        <Icon 
          className={cn(
            "w-4 h-4",
            variant === "primary" ? "text-primary" : "text-zinc-500"
          )} 
        />
      </div>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </h4>
    </div>
    {children}
  </div>
);

// Premium Badge Component
const PremiumBadge = ({
  children,
  variant = "default",
  className = ""
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "primary";
  className?: string;
}) => {
  const variantStyles = {
    default: "bg-zinc-800/60 text-zinc-300 border-zinc-700/50",
    success: "bg-emerald-500/[0.08] text-emerald-400/90 border-emerald-500/20 hover:bg-emerald-500/[0.12]",
    warning: "bg-amber-500/[0.08] text-amber-400/90 border-amber-500/20 hover:bg-amber-500/[0.12]",
    primary: "bg-primary/[0.08] text-primary/90 border-primary/20",
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "px-3 py-1.5 text-xs font-medium",
        "border backdrop-blur-sm",
        "transition-all duration-150",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </Badge>
  );
};

// Status color helper - more desaturated
function getStatusColor(status: string | null): string {
  switch (status?.toLowerCase()) {
    case "free":
    case "livre":
      return "bg-emerald-500/[0.08] text-emerald-400/90 border-emerald-500/20";
    case "contracted":
    case "contratado":
      return "bg-primary/[0.08] text-primary/90 border-primary/20";
    case "loan":
    case "emprestado":
      return "bg-amber-500/[0.08] text-amber-400/90 border-amber-500/20";
    default:
      return "bg-zinc-800/60 text-zinc-400 border-zinc-700/50";
  }
}

function getStatusLabel(status: string | null): string {
  switch (status?.toLowerCase()) {
    case "free":
    case "livre":
      return "Livre";
    case "contracted":
    case "contratado":
      return "Contratado";
    case "loan":
    case "emprestado":
      return "Emprestado";
    default:
      return status || "—";
  }
}

export function PlayerOverviewSection({
  fullName,
  age,
  height,
  dominantFoot,
  nationality,
  currentClub,
  country,
  contractStatus,
  position,
  secondaryPositions,
  primaryTacticalRole,
  secondaryTacticalRole,
  playStyle,
  strengths,
  areasToDevelope,
}: PlayerOverviewSectionProps) {
  const hasStrengths = Array.isArray(strengths) && strengths.length > 0;
  const hasAreasToImprove = Array.isArray(areasToDevelope) && areasToDevelope.length > 0;

  return (
    <Card className="border-zinc-800/50 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-sm">
      <CardHeader className="pb-5">
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Resumo Executivo
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Row 1: Identity (primary) + Contract */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Identity - PRIMARY FOCUS */}
          <MiniCard title="Identidade" icon={User} variant="primary">
            <div className="space-y-4">
              {/* Name - maximum emphasis */}
              <h3 className="text-2xl font-bold text-white leading-tight tracking-tight">
                {fullName}
              </h3>
              
              {/* Quick info line - refined hierarchy */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                {age !== null && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-400">{age} anos</span>
                  </span>
                )}
                {height !== null && (
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-400">{height} cm</span>
                  </span>
                )}
                {dominantFoot && (
                  <span className="flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-400">Pé {dominantFoot}</span>
                  </span>
                )}
              </div>
              
              {/* Nationality badge - refined */}
              <div>
                <Badge 
                  variant="secondary" 
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 backdrop-blur-sm"
                >
                  <Flag className="w-3 h-3 mr-1.5 text-zinc-500" />
                  {nationality}
                </Badge>
              </div>
            </div>
          </MiniCard>

          {/* Card 2: Contract */}
          <MiniCard title="Contrato" icon={Building}>
            <div className="space-y-4">
              {/* Status badge - refined */}
              {contractStatus && (
                <div>
                  <Badge className={cn(
                    "px-4 py-2 text-sm font-semibold border backdrop-blur-sm",
                    getStatusColor(contractStatus)
                  )}>
                    {getStatusLabel(contractStatus)}
                  </Badge>
                </div>
              )}
              
              {/* Club info - better hierarchy */}
              <div className="space-y-2">
                {currentClub ? (
                  <p className="text-lg font-semibold text-zinc-200">
                    {currentClub}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-600">Sem clube</p>
                )}
                
                {country && (
                  <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                    {country}
                  </p>
                )}
              </div>
            </div>
          </MiniCard>
        </div>

        {/* Row 2: Tactical Profile + Play Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 3: Tactical Profile */}
          <MiniCard title="Perfil Tático" icon={Target}>
            <div className="space-y-4">
              {/* Position - prominent but refined */}
              <div className="space-y-3">
                <Badge 
                  className="px-4 py-2 text-sm font-bold bg-primary/[0.08] text-primary/90 border border-primary/20 backdrop-blur-sm"
                >
                  {position}
                </Badge>
                
                {/* Secondary positions */}
                {Array.isArray(secondaryPositions) && secondaryPositions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {secondaryPositions.map((pos) => (
                      <Badge 
                        key={pos} 
                        variant="secondary" 
                        className="text-xs px-2.5 py-1 bg-zinc-800/50 text-zinc-400 border-zinc-700/50 backdrop-blur-sm"
                      >
                        {pos}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Tactical roles */}
              {(primaryTacticalRole || secondaryTacticalRole) && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-600 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Funções
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryTacticalRole && (
                      <Badge 
                        variant="outline" 
                        className="text-xs border-zinc-700/50 text-zinc-400 bg-zinc-800/30"
                      >
                        {primaryTacticalRole}
                      </Badge>
                    )}
                    {secondaryTacticalRole && (
                      <Badge 
                        variant="outline" 
                        className="text-xs border-zinc-800/50 text-zinc-500 bg-transparent"
                      >
                        {secondaryTacticalRole}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </MiniCard>

          {/* Card 4: Play Style */}
          <MiniCard title="Estilo de Jogo" icon={Zap}>
            <div className="flex items-center justify-center min-h-[100px]">
              {playStyle ? (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "px-5 py-3 text-base font-semibold",
                    "bg-gradient-to-r from-primary/[0.08] via-primary/[0.06] to-primary/[0.08]",
                    "text-primary/90 border border-primary/15",
                    "backdrop-blur-sm",
                    "shadow-[0_0_20px_-4px_rgba(220,38,38,0.15)]"
                  )}
                >
                  <Zap className="w-4 h-4 mr-2 text-primary/70" />
                  {playStyle}
                </Badge>
              ) : (
                <span className="text-sm text-zinc-600">—</span>
              )}
            </div>
          </MiniCard>
        </div>

        {/* Row 3: Strengths + Areas to Develop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 5: Strengths */}
          <MiniCard title="Pontos Fortes" icon={ThumbsUp}>
            {hasStrengths ? (
              <div className="flex flex-wrap gap-2">
                {strengths!.map((strength) => (
                  <PremiumBadge key={strength} variant="success">
                    {strength}
                  </PremiumBadge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 py-2">
                Nenhum ponto forte cadastrado
              </p>
            )}
          </MiniCard>

          {/* Card 6: Areas to Develop */}
          <MiniCard title="A Desenvolver" icon={AlertTriangle}>
            {hasAreasToImprove ? (
              <div className="flex flex-wrap gap-2">
                {areasToDevelope!.map((area) => (
                  <PremiumBadge key={area} variant="warning">
                    {area}
                  </PremiumBadge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 py-2">
                Nenhuma área cadastrada
              </p>
            )}
          </MiniCard>
        </div>
      </CardContent>
    </Card>
  );
}
