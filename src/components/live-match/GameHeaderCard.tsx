import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Match, MatchStatus } from "@/hooks/useLiveMatch";
import { 
  Radio, Play, ArrowLeft, Users, Trophy, 
  MapPin, Calendar, FileEdit, CheckCircle2, Pause, Clock, Edit3, X, Save, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface GameHeaderCardProps {
  match: Match;
  onStartGame?: () => void;
  isPending?: boolean;
  startersCount?: number;
  totalPlayersCount?: number; // Total escalados (titulares + reservas)
  playersOnField?: number;
  pendingEventsCount?: number;
  isReviewMode?: boolean;
  onToggleReviewMode?: () => void;
  onRegenerateSummary?: () => void;
  isRegenerating?: boolean;
}

const statusConfig: Record<MatchStatus, { 
  label: string; 
  bgClass: string; 
  textClass: string;
  icon: React.ReactNode;
}> = {
  draft: { 
    label: "Pré-jogo", 
    bgClass: "bg-zinc-700/60", 
    textClass: "text-zinc-300",
    icon: <FileEdit className="w-3 h-3" /> 
  },
  live: { 
    label: "Ao Vivo", 
    bgClass: "bg-red-500/20", 
    textClass: "text-red-400",
    icon: <Radio className="w-3 h-3 animate-pulse" /> 
  },
  finished: { 
    label: "Finalizado", 
    bgClass: "bg-amber-500/20", 
    textClass: "text-amber-400",
    icon: <Pause className="w-3 h-3" /> 
  },
  applied: { 
    label: "Aplicado", 
    bgClass: "bg-emerald-500/20", 
    textClass: "text-emerald-400",
    icon: <CheckCircle2 className="w-3 h-3" /> 
  },
};

export function GameHeaderCard({ 
  match, 
  onStartGame,
  isPending,
  startersCount = 0,
  totalPlayersCount = 0,
  playersOnField = 0,
  pendingEventsCount = 0,
  isReviewMode = false,
  onToggleReviewMode,
  onRegenerateSummary,
  isRegenerating = false,
}: GameHeaderCardProps) {
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const { teamName: globalTeamName, logoUrl: globalLogoUrl } = useTeamSettings();
  
  // Use match-specific team info with fallback to global settings
  const displayTeamName = match.team_name_display || globalTeamName;
  const displayLogoUrl = match.team_logo_url || globalLogoUrl;
  
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const isDraft = match.status === "draft";
  const isLive = match.status === "live";

  const statusValue = match.status as unknown as string;
  const isFinal = ["finished", "applied", "completed"].includes(statusValue);

  const handleStartGame = () => {
    setConfirmStartOpen(false);
    onStartGame?.();
  };

  return (
    <>
      {/* Removed framer-motion animation to prevent header disappearing during scroll/re-renders */}
      <div
        className="sticky top-0 z-20"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Clean mobile toolbar - no extra backgrounds or boxes */}
        <div className="bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/40">
          <div className="px-4 py-3">
            {/* Top row: Back + Status pills + Action */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Back button - pill shape */}
                <Link to="/dashboard/live-match">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Status pill - glass style, no square background */}
                <Badge 
                  variant={isDraft ? "draft" : isLive ? "live" : "glass"}
                  size="mobile"
                  className="gap-1.5"
                >
                  {config.icon}
                  {config.label}
                </Badge>

                {/* Half badge (live only) - pill style */}
                {(isLive || match.status === "finished") && match.half && (
                  <Badge 
                    size="mobile"
                    className={cn(
                      "font-bold",
                      match.half === 1 ? "bg-blue-600/80 text-white border-blue-500/30" : "bg-purple-600/80 text-white border-purple-500/30"
                    )}
                  >
                    {match.half === 1 ? "1º Tempo" : "2º Tempo"}
                  </Badge>
                )}

                {/* Players count - glass pill - always show total count */}
                <Badge 
                  variant="glass" 
                  size="mobile"
                  className="gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isDraft 
                      ? (totalPlayersCount > 0 
                          ? `${totalPlayersCount} jogador${totalPlayersCount !== 1 ? "es" : ""}${startersCount > 0 ? ` (${startersCount} titular${startersCount !== 1 ? "es" : ""})` : ""}`
                          : "0 jogadores")
                      : (playersOnField > 0 ? `${playersOnField} em campo` : "0 em campo")
                    }
                  </span>
                  <span className="sm:hidden">
                    {isDraft 
                      ? totalPlayersCount
                      : playersOnField
                    }
                  </span>
                </Badge>

                {/* Pending events badge - only when relevant */}
                {isDraft && pendingEventsCount > 0 && (
                  <Badge 
                    variant="warning"
                    size="mobile"
                    className="gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {pendingEventsCount}
                  </Badge>
                )}
              </div>

              {/* Start game button - GREEN glow, ALWAYS enabled (Agency Mode) */}
              {isDraft && (
                <Button
                  variant="success"
                  size="mobile"
                  onClick={() => setConfirmStartOpen(true)}
                  disabled={isPending}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Iniciar 1º Tempo</span>
                  <span className="sm:hidden">Iniciar</span>
                </Button>
              )}

              {/* Review mode button - when match is final (finished/applied/completed) */}
              {isFinal && onToggleReviewMode && (
                <Button
                  variant={isReviewMode ? "destructive" : "outline"}
                  size="mobile"
                  onClick={onToggleReviewMode}
                  disabled={isPending || isRegenerating}
                  className={cn(
                    "gap-2",
                    isReviewMode
                      ? "border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      : "border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  )}
                >
                  {isReviewMode ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span className="hidden sm:inline">Sair da Revisão</span>
                      <span className="sm:hidden">Sair</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar Pós-Jogo (Revisão)</span>
                      <span className="sm:hidden">Revisão</span>
                    </>
                  )}
                </Button>
              )}

              {/* Regenerate summary button - only in review mode */}
              {isReviewMode && onRegenerateSummary && (
                <Button
                  variant="outline"
                  size="mobile"
                  onClick={onRegenerateSummary}
                  disabled={isRegenerating}
                  className={cn(
                    "gap-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10",
                    isRegenerating && "animate-pulse"
                  )}
                >
                  <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
                  <span className="hidden sm:inline">{isRegenerating ? "Regenerando..." : "Regerar Resumo"}</span>
                  <span className="sm:hidden">{isRegenerating ? "..." : "Regerar"}</span>
                </Button>
              )}
            </div>

            {/* Bottom row: Match info - clean, no boxes */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={displayLogoUrl} 
                  alt={displayTeamName} 
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" width={48} height={48}
                />
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                    {displayTeamName} <span className="text-zinc-500 font-medium">×</span> {match.opponent_name || "Adversário"}
                  </h1>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{competitionName}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(match.match_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(match.match_date), "HH:mm")}
                    </span>
                    {match.venue && (
                      <span className="hidden sm:flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.venue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Start Dialog - Agency Mode */}
      <AlertDialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar 1º Tempo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 space-y-2">
              <p>O cronômetro começará a contar imediatamente.</p>
              {startersCount > 0 && (
                <p className="text-sm">
                  • <strong className="text-zinc-200">{startersCount}</strong> titular{startersCount !== 1 ? "es" : ""} entrará{startersCount !== 1 ? "ão" : ""} em campo automaticamente
                </p>
              )}
              {startersCount === 0 && (
                <p className="text-sm text-amber-400">
                  ⚠️ Nenhum titular marcado. Você pode adicionar atletas em campo a qualquer momento.
                </p>
              )}
              <p className="text-sm">• Você poderá pausar/retomar o cronômetro</p>
              <p className="text-sm">• Atletas podem entrar/sair a qualquer momento</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStartGame}
              className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar 1º Tempo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
