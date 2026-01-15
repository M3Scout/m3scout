import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Match, MatchStatus } from "@/hooks/useLiveMatch";
import { Radio, CheckCircle2, Pause, ArrowRight } from "lucide-react";

interface MatchHeaderProps {
  match: Match;
  onStatusChange: (status: MatchStatus) => void;
  isPending?: boolean;
}

const statusConfig: Record<MatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: null },
  live: { label: "Ao Vivo", color: "bg-red-500 text-white animate-pulse", icon: <Radio className="h-3 w-3" /> },
  finished: { label: "Finalizado", color: "bg-amber-500 text-white", icon: <Pause className="h-3 w-3" /> },
  applied: { label: "Aplicado", color: "bg-green-500 text-white", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export function MatchHeader({ match, onStatusChange, isPending }: MatchHeaderProps) {
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="container py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Match info */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={config.color}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
              <span className="text-sm text-muted-foreground">
                {competitionName} • {match.season_year}
              </span>
            </div>
            <h1 className="text-xl font-bold">
              vs {match.opponent_name}
            </h1>
            {match.venue && (
              <p className="text-sm text-muted-foreground">{match.venue}</p>
            )}
          </div>

          {/* Actions based on status */}
          <div className="flex items-center gap-2">
            {match.status === "live" && (
              <Button
                variant="outline"
                onClick={() => onStatusChange("finished")}
                disabled={isPending}
              >
                <Pause className="h-4 w-4 mr-2" />
                Finalizar Jogo
              </Button>
            )}
            {match.status === "finished" && (
              <Button
                variant="default"
                onClick={() => onStatusChange("live")}
                disabled={isPending}
              >
                <Radio className="h-4 w-4 mr-2" />
                Retomar Jogo
              </Button>
            )}
            {(match.status === "live" || match.status === "finished") && (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                asChild
              >
                <a href={`/app/live-match/${match.id}/review`}>
                  Revisar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
