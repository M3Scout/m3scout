import * as React from "react";
import { useMemo } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { safeArray } from "@/lib/utils";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface RecurrentInjuryAlertProps {
  injuries: Injury[];
  threshold?: number; // Minimum occurrences to show alert (default: 3)
}

interface RecurrenceData {
  type: string;
  count: number;
  lastDate: string;
  severities: string[];
}

// Normalize injury types to group similar ones
const normalizeInjuryType = (type: string): string => {
  const lower = type.toLowerCase().trim();
  
  // Group knee injuries
  if (lower.includes("joelho") || lower.includes("ligamento") || lower.includes("menisco")) {
    return "Joelho";
  }
  // Group ankle injuries
  if (lower.includes("tornozelo") || lower.includes("entorse")) {
    return "Tornozelo";
  }
  // Group muscle injuries
  if (lower.includes("muscular") || lower.includes("distensão") || lower.includes("estiramento")) {
    return "Muscular";
  }
  // Group shoulder injuries
  if (lower.includes("ombro")) {
    return "Ombro";
  }
  // Group back injuries
  if (lower.includes("lombar") || lower.includes("costas") || lower.includes("coluna")) {
    return "Coluna/Lombar";
  }
  // Group groin injuries
  if (lower.includes("pubalgia") || lower.includes("virilha") || lower.includes("adutor")) {
    return "Virilha/Pubis";
  }
  // Group thigh injuries
  if (lower.includes("coxa") || lower.includes("quadríceps") || lower.includes("posterior")) {
    return "Coxa";
  }
  
  return type;
};

export function RecurrentInjuryAlert({ injuries, threshold = 3 }: RecurrentInjuryAlertProps) {
  const recurrences = useMemo(() => {
    const safeInjuries = safeArray(injuries);
    if (safeInjuries.length < threshold) return [];

    // Group injuries by normalized type
    const grouped: Record<string, Injury[]> = {};
    safeInjuries.forEach((injury) => {
      const normalizedType = normalizeInjuryType(injury.injury_type);
      if (!grouped[normalizedType]) grouped[normalizedType] = [];
      grouped[normalizedType].push(injury);
    });

    // Find recurrent injuries (>= threshold)
    const recurrent: RecurrenceData[] = [];
    Object.entries(grouped).forEach(([type, typeInjuries]) => {
      if (typeInjuries.length >= threshold) {
        // Sort by date to get the most recent
        const sorted = [...typeInjuries].sort(
          (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        recurrent.push({
          type,
          count: typeInjuries.length,
          lastDate: sorted[0].start_date,
          severities: typeInjuries.map((i) => i.severity),
        });
      }
    });

    // Sort by count (most recurrent first)
    return recurrent.sort((a, b) => b.count - a.count);
  }, [injuries, threshold]);

  if (recurrences.length === 0) return null;

  const hasSevereRecurrence = recurrences.some((r) =>
    r.severities.some((s) => s.toLowerCase() === "grave" || s.toLowerCase() === "severe")
  );

  return (
    <Alert variant="destructive" className={`border-2 ${hasSevereRecurrence ? "border-red-500/50 bg-red-500/10" : "border-amber-500/50 bg-amber-500/10"}`}>
      <AlertTriangle className={`h-5 w-5 ${hasSevereRecurrence ? "text-red-500" : "text-amber-500"}`} />
      <AlertTitle className="flex items-center gap-2">
        <span>Alerta de Lesão Recorrente</span>
        <TrendingUp className="w-4 h-4" />
      </AlertTitle>
      <AlertDescription className="mt-3">
        <div className="space-y-3">
          <p className="text-sm text-foreground/80">
            O atleta apresenta padrão de lesões recorrentes que requer atenção especial:
          </p>
          <div className="flex flex-wrap gap-2">
            {recurrences.map((recurrence) => {
              const hasSevere = recurrence.severities.some(
                (s) => s.toLowerCase() === "grave" || s.toLowerCase() === "severe"
              );
              return (
                <Badge
                  key={recurrence.type}
                  variant="outline"
                  className={`text-sm py-1.5 px-3 ${
                    hasSevere
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                >
                  <span className="font-semibold">{recurrence.type}</span>
                  <span className="ml-2 opacity-80">
                    {recurrence.count}x ocorrências
                  </span>
                </Badge>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Recomenda-se avaliação preventiva e fortalecimento específico para as áreas afetadas.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
