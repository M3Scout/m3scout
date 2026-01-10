import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Footprints, Compass, ThumbsUp, AlertTriangle } from "lucide-react";

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

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
  </div>
);

export const TechnicalProfileSection = ({ data }: TechnicalProfileSectionProps) => {
  const hasStrengths = Array.isArray(data?.strengths) && data.strengths.length > 0;
  const hasAreasToImprove = Array.isArray(data?.areas_to_develop) && data.areas_to_develop.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Perfil Técnico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Footprints className="w-4 h-4 text-primary" />
            </div>
            <InfoItem label="Pé Dominante" value={data.dominant_foot} />
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Compass className="w-4 h-4 text-primary" />
            </div>
            <InfoItem label="Altura de Jogo" value={data.playing_height_preference} />
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <InfoItem label="Estilo de Jogo" value={data.play_style} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem label="Função Tática Principal" value={data.primary_tactical_role} />
          <InfoItem label="Função Tática Secundária" value={data.secondary_tactical_role} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ThumbsUp className="w-4 h-4 text-green-500" />
              <span className="font-medium">Pontos Fortes</span>
            </div>
            {hasStrengths ? (
              <div className="flex flex-wrap gap-2">
                {data.strengths!.map((strength) => (
                  <Badge key={strength} variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                    {strength}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ponto forte cadastrado</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Pontos a Desenvolver</span>
            </div>
            {hasAreasToImprove ? (
              <div className="flex flex-wrap gap-2">
                {data.areas_to_develop!.map((area) => (
                  <Badge key={area} variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma área cadastrada</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
