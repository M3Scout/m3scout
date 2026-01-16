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

// Mini Card Component
const MiniCard = ({
  title,
  icon: Icon,
  children,
  className = ""
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 h-full ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h4>
    </div>
    {children}
  </div>
);

// Status color helper
function getStatusColor(status: string | null): string {
  switch (status?.toLowerCase()) {
    case "free":
    case "livre":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "contracted":
    case "contratado":
      return "bg-primary/15 text-primary border-primary/25";
    case "loan":
    case "emprestado":
      return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
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
    <Card className="border-zinc-800 bg-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-primary" />
          Resumo Executivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Identity + Contract */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Identity */}
          <MiniCard title="Identidade" icon={User}>
            <div className="space-y-3">
              {/* Name - max emphasis */}
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {fullName}
              </h3>
              
              {/* Quick info line */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                {age !== null && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {age} anos
                  </span>
                )}
                {height !== null && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" />
                      {height} cm
                    </span>
                  </>
                )}
                {dominantFoot && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3.5 h-3.5" />
                      Pé {dominantFoot}
                    </span>
                  </>
                )}
              </div>
              
              {/* Nationality badge */}
              <div>
                <Badge 
                  variant="secondary" 
                  className="px-3 py-1 text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700"
                >
                  <Flag className="w-3 h-3 mr-1.5" />
                  {nationality}
                </Badge>
              </div>
            </div>
          </MiniCard>

          {/* Card 2: Contract */}
          <MiniCard title="Contrato" icon={Building}>
            <div className="space-y-4">
              {/* Status badge - prominent */}
              {contractStatus && (
                <div>
                  <Badge className={`px-3 py-1.5 text-sm font-semibold ${getStatusColor(contractStatus)}`}>
                    {getStatusLabel(contractStatus)}
                  </Badge>
                </div>
              )}
              
              {/* Club info */}
              <div className="space-y-2">
                {currentClub ? (
                  <p className="text-base font-semibold text-foreground">
                    {currentClub}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem clube</p>
                )}
                
                {country && (
                  <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
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
              {/* Position - prominent badge */}
              <div className="space-y-2">
                <Badge 
                  className="px-4 py-2 text-sm font-bold bg-primary/15 text-primary border border-primary/25"
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
                        className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 border-zinc-700"
                      >
                        {pos}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Tactical roles */}
              {(primaryTacticalRole || secondaryTacticalRole) && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Funções
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryTacticalRole && (
                      <Badge 
                        variant="outline" 
                        className="text-xs border-zinc-700 text-zinc-300"
                      >
                        {primaryTacticalRole}
                      </Badge>
                    )}
                    {secondaryTacticalRole && (
                      <Badge 
                        variant="outline" 
                        className="text-xs border-zinc-800 text-zinc-500"
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
                  className="px-5 py-3 text-base font-semibold bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {playStyle}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
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
                  <Badge 
                    key={strength} 
                    variant="secondary" 
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    {strength}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum ponto forte cadastrado
              </p>
            )}
          </MiniCard>

          {/* Card 6: Areas to Develop */}
          <MiniCard title="A Desenvolver" icon={AlertTriangle}>
            {hasAreasToImprove ? (
              <div className="flex flex-wrap gap-2">
                {areasToDevelope!.map((area) => (
                  <Badge 
                    key={area} 
                    variant="secondary" 
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma área cadastrada
              </p>
            )}
          </MiniCard>
        </div>
      </CardContent>
    </Card>
  );
}
