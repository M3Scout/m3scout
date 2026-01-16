import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Footprints, 
  Compass, 
  ThumbsUp, 
  AlertTriangle,
  Zap,
  Users,
  Crosshair
} from "lucide-react";

interface TechnicalData {
  dominant_foot?: string | null;
  playing_height_preference?: string | null;
  play_style?: string | null;
  primary_tactical_role?: string | null;
  secondary_tactical_role?: string | null;
  strengths?: string[] | null;
  areas_to_develop?: string[] | null;
}

interface TechnicalProfileSectionProps {
  data: TechnicalData;
}

const InfoRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | null | undefined;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
      <Icon className="w-4 h-4 text-zinc-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">
        {value || <span className="text-muted-foreground font-normal">—</span>}
      </p>
    </div>
  </div>
);

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
  <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h4>
    </div>
    {children}
  </div>
);

export const TechnicalProfileSection = ({ data }: TechnicalProfileSectionProps) => {
  const hasStrengths = Array.isArray(data?.strengths) && data.strengths.length > 0;
  const hasAreasToImprove = Array.isArray(data?.areas_to_develop) && data.areas_to_develop.length > 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Perfil Técnico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top row: 3 cards on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Identidade Técnica */}
          <MiniCard title="Identidade Técnica" icon={Footprints}>
            <div className="space-y-4">
              <InfoRow 
                icon={Footprints} 
                label="Pé Dominante" 
                value={data.dominant_foot} 
              />
              <InfoRow 
                icon={Compass} 
                label="Altura de Jogo" 
                value={data.playing_height_preference} 
              />
            </div>
          </MiniCard>

          {/* Card 2: Função Tática */}
          <MiniCard title="Função Tática" icon={Users}>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Principal</p>
                <p className="text-sm font-semibold text-foreground">
                  {data.primary_tactical_role || <span className="text-muted-foreground font-normal">—</span>}
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-muted-foreground mb-1">Secundária</p>
                <p className="text-sm font-medium text-zinc-300">
                  {data.secondary_tactical_role || <span className="text-muted-foreground font-normal">—</span>}
                </p>
              </div>
            </div>
          </MiniCard>

          {/* Card 3: Estilo de Jogo */}
          <MiniCard title="Estilo de Jogo" icon={Zap} className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center min-h-[80px]">
              {data.play_style ? (
                <Badge 
                  variant="secondary" 
                  className="px-4 py-2 text-sm font-semibold bg-primary/10 text-primary border border-primary/20"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {data.play_style}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </MiniCard>
        </div>

        {/* Bottom row: Pontos Fortes & Pontos a Desenvolver */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 4: Pontos Fortes */}
          <MiniCard title="Pontos Fortes" icon={ThumbsUp}>
            {hasStrengths ? (
              <div className="flex flex-wrap gap-2">
                {data.strengths!.map((strength) => (
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

          {/* Card 5: Pontos a Desenvolver */}
          <MiniCard title="Pontos a Desenvolver" icon={AlertTriangle}>
            {hasAreasToImprove ? (
              <div className="flex flex-wrap gap-2">
                {data.areas_to_develop!.map((area) => (
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
};
