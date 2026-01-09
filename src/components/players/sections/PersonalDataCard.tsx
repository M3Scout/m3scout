import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Ruler, Flag } from "lucide-react";

interface PersonalDataCardProps {
  fullName: string;
  age: number | null;
  birthDate: string | null;
  height: number | null;
  dominantFoot: string | null;
  nationality: string;
}

export function PersonalDataCard({
  fullName,
  age,
  birthDate,
  height,
  dominantFoot,
  nationality,
}: PersonalDataCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="w-5 h-5 text-primary" />
          Dados Pessoais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Nome Completo</p>
            <p className="font-medium text-sm">{fullName}</p>
          </div>
          
          {age !== null && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Idade
              </p>
              <p className="font-medium text-sm">{age} anos</p>
            </div>
          )}
          
          {birthDate && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Data de Nascimento</p>
              <p className="font-medium text-sm">{formatDate(birthDate)}</p>
            </div>
          )}
          
          {height !== null && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Ruler className="w-3 h-3" />
                Altura
              </p>
              <p className="font-medium text-sm">{height} cm</p>
            </div>
          )}
          
          {dominantFoot && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pé Dominante</p>
              <Badge variant="secondary" className="text-xs">
                {dominantFoot}
              </Badge>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Flag className="w-3 h-3" />
              Nacionalidade
            </p>
            <p className="font-medium text-sm">{nationality}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
