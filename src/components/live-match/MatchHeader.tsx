import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Match, MatchStatus } from "@/hooks/useLiveMatch";
import { MatchTimer } from "./MatchTimer";
import { Radio, CheckCircle2, Pause, ArrowRight, Play, FileEdit } from "lucide-react";
import { Link } from "react-router-dom";
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
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";

  const handleStartGame = () => {
    setConfirmStartOpen(false);
    onStartGame?.();
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container py-3">
          <div className="flex flex-col gap-3">
            {/* Top row: Status + Timer + Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Badge className={config.color}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
                
                {/* Timer - only for live or finished */}
                {(match.status === "live" || match.status === "finished") && (
                  <MatchTimer 
                    durationMinutes={match.duration_minutes} 
                    onMinuteChange={onMinuteChange}
                  />
                )}

                {/* Starters count for draft */}
                {match.status === "draft" && startersCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {startersCount} titular{startersCount !== 1 ? "es" : ""}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Draft: Start Game button */}
                {match.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => setConfirmStartOpen(true)}
                    disabled={isPending || startersCount === 0}
                    className="bg-green-600 hover:bg-green-700 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Iniciar Jogo
                  </Button>
                )}

                {/* Live: Finish button */}
                {match.status === "live" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange("finished")}
                    disabled={isPending}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Finalizar
                  </Button>
                )}

                {/* Finished: Resume button */}
                {match.status === "finished" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange("live")}
                    disabled={isPending}
                  >
                    <Radio className="h-4 w-4 mr-1" />
                    Retomar
                  </Button>
                )}

                {/* Live/Finished: Review button */}
                {(match.status === "live" || match.status === "finished") && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
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

            {/* Bottom row: Match info */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">
                  vs {match.opponent_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {competitionName} • {match.season_year}
                  {match.venue && ` • ${match.venue}`}
                </p>
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
