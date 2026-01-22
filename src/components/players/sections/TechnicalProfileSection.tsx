import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Footprints, 
  Compass, 
  ThumbsUp, 
  AlertTriangle,
  Zap,
  Users
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

// Premium attribute display with value-first hierarchy
const AttributeDisplay = ({ 
  label, 
  value,
  icon: Icon
}: { 
  label: string; 
  value: string | null | undefined;
  icon: React.ElementType;
}) => (
  <div className="flex items-center gap-4 py-3">
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
      <Icon className="w-4 h-4 text-zinc-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-base font-semibold text-white truncate">
        {value || <span className="text-zinc-600 font-normal">Não informado</span>}
      </p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  </div>
);

// Premium section card with depth and polish
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
  variant?: "default" | "highlight";
}) => (
  <div className={`
    relative rounded-xl overflow-hidden
    bg-gradient-to-b from-zinc-900/80 via-zinc-900/60 to-zinc-950/80
    border border-zinc-800/50
    shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]
    ${variant === "highlight" ? "ring-1 ring-primary/10" : ""}
    ${className}
  `}>
    {/* Subtle top glow */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />
    
    <div className="p-5">
      {/* Header with minimal icon */}
      <div className="flex items-center gap-2.5 mb-5">
        <Icon className="w-4 h-4 text-zinc-500" />
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {title}
        </h4>
      </div>
      {children}
    </div>
  </div>
);

// Premium identity pill for Play Style
const IdentityPill = ({ value }: { value: string | null | undefined }) => {
  if (!value) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="text-sm text-zinc-600">Não definido</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div className="
        relative px-6 py-3 rounded-full
        bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15
        border border-primary/25
        shadow-[0_0_20px_-4px_rgba(var(--primary),0.2)]
      ">
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-primary/5" />
        
        <div className="relative flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-semibold text-primary tracking-wide">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};

// Premium chip for strengths/weaknesses
const AttributeChip = ({ 
  label, 
  variant 
}: { 
  label: string; 
  variant: "strength" | "development";
}) => {
  const styles = variant === "strength" 
    ? "bg-emerald-500/8 text-emerald-400/90 border-emerald-500/15 hover:bg-emerald-500/12"
    : "bg-amber-500/8 text-amber-400/90 border-amber-500/15 hover:bg-amber-500/12";

  return (
    <span className={`
      inline-flex px-3 py-1.5 rounded-md text-xs font-medium
      border transition-colors cursor-default
      ${styles}
    `}>
      {label}
    </span>
  );
};

export const TechnicalProfileSection = ({ data }: TechnicalProfileSectionProps) => {
  const hasStrengths = Array.isArray(data?.strengths) && data.strengths.length > 0;
  const hasAreasToImprove = Array.isArray(data?.areas_to_develop) && data.areas_to_develop.length > 0;

  return (
    <Card className="border-zinc-800/50 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          Perfil Técnico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* Top row: 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Technical Identity */}
          <SectionCard title="Identidade Técnica" icon={Footprints}>
            <div className="space-y-1 divide-y divide-zinc-800/50">
              <AttributeDisplay 
                icon={Footprints} 
                label="Pé Dominante" 
                value={data.dominant_foot} 
              />
              <AttributeDisplay 
                icon={Compass} 
                label="Altura de Jogo" 
                value={data.playing_height_preference} 
              />
            </div>
          </SectionCard>

          {/* Tactical Role */}
          <SectionCard title="Função Tática" icon={Users}>
            <div className="space-y-4">
              {/* Primary - Highlighted */}
              <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/20">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Principal</p>
                <p className="text-lg font-bold text-white">
                  {data.primary_tactical_role || <span className="text-zinc-600 font-normal text-base">—</span>}
                </p>
              </div>
              
              {/* Secondary - Subtle */}
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Secundária</p>
                <p className="text-sm font-medium text-zinc-400">
                  {data.secondary_tactical_role || <span className="text-zinc-600">—</span>}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Play Style - Premium Identity */}
          <SectionCard 
            title="Estilo de Jogo" 
            icon={Zap} 
            className="sm:col-span-2 lg:col-span-1"
            variant="highlight"
          >
            <IdentityPill value={data.play_style} />
          </SectionCard>
        </div>

        {/* Bottom row: Strengths & Development Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <SectionCard title="Pontos Fortes" icon={ThumbsUp}>
            {hasStrengths ? (
              <div className="flex flex-wrap gap-2">
                {data.strengths!.map((strength) => (
                  <AttributeChip key={strength} label={strength} variant="strength" />
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-zinc-600">Nenhum ponto forte cadastrado</p>
              </div>
            )}
          </SectionCard>

          {/* Areas to Develop */}
          <SectionCard title="Pontos a Desenvolver" icon={AlertTriangle}>
            {hasAreasToImprove ? (
              <div className="flex flex-wrap gap-2">
                {data.areas_to_develop!.map((area) => (
                  <AttributeChip key={area} label={area} variant="development" />
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-zinc-600">Nenhuma área cadastrada</p>
              </div>
            )}
          </SectionCard>
        </div>
      </CardContent>
    </Card>
  );
};
