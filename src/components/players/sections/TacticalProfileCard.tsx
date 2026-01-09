import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Zap, Shield } from "lucide-react";

interface TacticalProfileCardProps {
  position: string;
  secondaryPositions: string[] | null;
  primaryTacticalRole: string | null;
  secondaryTacticalRole: string | null;
  playStyle: string | null;
  strengths: string[] | null;
  areasToDevelope: string[] | null;
}

export function TacticalProfileCard({
  position,
  secondaryPositions,
  primaryTacticalRole,
  secondaryTacticalRole,
  playStyle,
  strengths,
  areasToDevelope,
}: TacticalProfileCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-5 h-5 text-primary" />
          Perfil Tático
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Positions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Posições</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {position}
            </Badge>
            {secondaryPositions?.map((pos) => (
              <Badge key={pos} variant="secondary" className="text-xs">
                {pos}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tactical Roles */}
        {(primaryTacticalRole || secondaryTacticalRole) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Funções Táticas
            </p>
            <div className="flex flex-wrap gap-2">
              {primaryTacticalRole && (
                <Badge variant="outline" className="border-primary/50">
                  {primaryTacticalRole}
                </Badge>
              )}
              {secondaryTacticalRole && (
                <Badge variant="outline" className="text-muted-foreground">
                  {secondaryTacticalRole}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Play Style */}
        {playStyle && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Estilo de Jogo
            </p>
            <p className="text-sm font-medium">{playStyle}</p>
          </div>
        )}

        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Pontos Fortes</p>
            <div className="flex flex-wrap gap-1.5">
              {strengths.map((strength) => (
                <Badge
                  key={strength}
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"
                >
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Areas to Develop */}
        {areasToDevelope && areasToDevelope.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">A Desenvolver</p>
            <div className="flex flex-wrap gap-1.5">
              {areasToDevelope.map((area) => (
                <Badge
                  key={area}
                  className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
