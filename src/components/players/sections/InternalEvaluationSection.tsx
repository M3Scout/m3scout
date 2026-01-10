import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Star, TrendingUp, CheckCircle, XCircle, Trophy } from "lucide-react";
import { formatFixed } from "@/lib/formatters";

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

const RatingDisplay = ({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: number | null | undefined; 
  icon: React.ElementType;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        {value !== null && value !== undefined ? (
          <>
            <span className="text-xl font-bold">{formatFixed(value, 1)}</span>
            <span className="text-muted-foreground">/10</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  </div>
);

const getLevelColor = (level: string | null | undefined) => {
  switch (level?.toLowerCase()) {
    case "internacional":
    case "international":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "serie_a":
    case "série a":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "serie_b":
    case "série b":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "serie_c":
    case "série c":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "serie_d":
    case "série d":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const InternalEvaluationSection = ({ data }: InternalEvaluationSectionProps) => {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-500" />
          Avaliação Interna
          <Badge variant="outline" className="ml-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
            Privado
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <RatingDisplay icon={Star} label="Nota Geral" value={data.overall_rating} />
          <RatingDisplay icon={TrendingUp} label="Potencial" value={data.potential_rating} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Ready to Compete */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            {data.ready_to_compete ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : data.ready_to_compete === false ? (
              <XCircle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Pronto para Competir?</p>
              <p className="font-medium">
                {data.ready_to_compete === true ? "Sim" : data.ready_to_compete === false ? "Não" : "—"}
              </p>
            </div>
          </div>

          {/* Estimated Level */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Nível Estimado</p>
              {data.estimated_level ? (
                <Badge variant="outline" className={getLevelColor(data.estimated_level)}>
                  {data.estimated_level}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        {(data.internal_evaluation_notes || data.internal_notes) && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Observações Internas</p>
            <p className="text-sm whitespace-pre-wrap">
              {data.internal_evaluation_notes || data.internal_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
