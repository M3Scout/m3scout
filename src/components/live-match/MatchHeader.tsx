import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Match, MatchStatus } from "@/hooks/useLiveMatch";
import { Radio, CheckCircle2, Pause, ArrowRight, Play, FileEdit } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MatchHeaderProps {
  match: Match;
  onStatusChange: (status: MatchStatus) => void;
  onStartGame?: () => void;
  onMinuteChange?: (minute: number) => void;
  isPending?: boolean;
  startersCount?: number;
}

const statusConfig: Record<MatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Pré-jogo", color: "bg-muted text-muted-foreground", icon: <FileEdit className="h-3 w-3" /> },
  live: { label: "Ao Vivo", color: "bg-red-500 text-white animate-pulse", icon: <Radio className="h-3 w-3" /> },
  finished: { label: "Finalizado", color: "bg-amber-500 text-white", icon: <Pause className="h-3 w-3" /> },
  applied: { label: "Aplicado", color: "bg-green-500 text-white", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export function MatchHeader({ 
  match, 
  onStatusChange, 
  onStartGame,
  onMinuteChange, 
  isPending,
  startersCount = 0,
}: MatchHeaderProps) {
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const { teamName, logoUrl } = useTeamSettings();
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";

  const handleStartGame = () => {
    setConfirmStartOpen(false);
    onStartGame?.();
  };

  const isDraft = match.status === "draft";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <>
      {/* Sticky header with safe-area padding for iOS */}
      <div 
        className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container py-2 sm:py-3">
          <div className="flex flex-col gap-2 sm:gap-3">
            {/* Row 1: Status + Starters + Actions - Responsive layout */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status badge - always visible */}
                <Badge className={cn(config.color, "h-7 sm:h-8 text-xs sm:text-sm")}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>

                {/* Starters count for draft */}
                {isDraft && startersCount > 0 && (
                  <Badge variant="outline" className="text-xs h-7 sm:h-8">
                    {startersCount} titular{startersCount !== 1 ? "es" : ""}
                  </Badge>
                )}

                {/* Half indicator for live/finished */}
                {(isLive || isFinished) && match.half && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs h-7 sm:h-8",
                      match.half === 1 && "bg-blue-600 text-white",
                      match.half === 2 && "bg-purple-600 text-white"
                    )}
                  >
                    {match.half === 1 ? "1º Tempo" : "2º Tempo"}
                  </Badge>
                )}
              </div>

              {/* Actions - 44px minimum touch targets */}
              <div className="flex items-center gap-2">
                {/* Draft: Start Game button */}
                {isDraft && (
                  <Button
                    size="sm"
                    onClick={() => setConfirmStartOpen(true)}
                    disabled={isPending || startersCount === 0}
                    className="h-10 sm:h-9 px-3 sm:px-4 bg-green-600 hover:bg-green-700 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Iniciar Jogo</span>
                    <span className="sm:hidden">Iniciar</span>
                  </Button>
                )}

                {/* Live/Finished: Review button - BLUE glow, not red */}
                {(isLive || isFinished) && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 sm:h-9 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    asChild
                  >
                    <Link to={`/app/live-match/${match.id}/review`}>
                      Revisar
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Row 2: Match info - Compact */}
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={logoUrl} 
                  alt={teamName} 
                  className="w-10 h-10 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold truncate">
                    {teamName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    vs {match.opponent_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {competitionName} • {match.season_year}
                    {match.venue && ` • ${match.venue}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Start Dialog */}
      <AlertDialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Jogo?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Deseja iniciar o jogo agora?</p>
              <p className="text-sm">
                • <strong>{startersCount}</strong> jogador{startersCount !== 1 ? "es" : ""} titular{startersCount !== 1 ? "es" : ""} entrará{startersCount !== 1 ? "ão" : ""} em campo
              </p>
              <p className="text-sm">
                • O cronômetro começará a contar
              </p>
              <p className="text-sm">
                • Você poderá registrar estatísticas e substituições
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStartGame}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar Jogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
