import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Match, MatchStatus } from "@/hooks/useLiveMatch";
import { 
  Radio, Play, ArrowLeft, Users, Trophy, 
  MapPin, Calendar, FileEdit, CheckCircle2, Pause
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  playersOnField?: number;
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
  playersOnField = 0,
}: GameHeaderCardProps) {
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const isDraft = match.status === "draft";
  const isLive = match.status === "live";

  const handleStartGame = () => {
    setConfirmStartOpen(false);
    onStartGame?.();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/60">
          <div className="container py-3">
            {/* Top row: Back + Status badges + Action */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <Link to="/app/live-match">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Status badge */}
                <Badge 
                  className={cn(
                    "h-7 gap-1.5 text-xs font-semibold",
                    config.bgClass, config.textClass
                  )}
                >
                  {config.icon}
                  {config.label}
                </Badge>

                {/* Half badge (live only) */}
                {(isLive || match.status === "finished") && match.half && (
                  <Badge 
                    className={cn(
                      "h-7 text-xs font-bold",
                      match.half === 1 ? "bg-blue-600/80 text-white" : "bg-purple-600/80 text-white"
                    )}
                  >
                    {match.half === 1 ? "1º Tempo" : "2º Tempo"}
                  </Badge>
                )}

                {/* Players count */}
                <Badge 
                  variant="outline" 
                  className="h-7 gap-1 text-xs border-zinc-700 text-zinc-400"
                >
                  <Users className="w-3 h-3" />
                  {isDraft ? (
                    <span>{startersCount} titular{startersCount !== 1 ? "es" : ""}</span>
                  ) : (
                    <span>{playersOnField} em campo</span>
                  )}
                </Badge>
              </div>

              {/* Start game button (draft only) */}
              {isDraft && (
                <Button
                  onClick={() => setConfirmStartOpen(true)}
                  disabled={isPending || startersCount === 0}
                  className="h-10 px-4 gap-2 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Iniciar Jogo</span>
                  <span className="sm:hidden">Iniciar</span>
                </Button>
              )}
            </div>

            {/* Bottom row: Match info */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-zinc-100">
                  vs {match.opponent_name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {competitionName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  {match.venue && (
                    <span className="flex items-center gap-1 hidden sm:flex">
                      <MapPin className="w-3 h-3" />
                      {match.venue}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirm Start Dialog */}
      <AlertDialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Jogo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 space-y-2">
              <p>Deseja iniciar o jogo agora?</p>
              <p className="text-sm">
                • <strong className="text-zinc-200">{startersCount}</strong> jogador{startersCount !== 1 ? "es" : ""} entrará{startersCount !== 1 ? "ão" : ""} em campo
              </p>
              <p className="text-sm">• O cronômetro começará a contar</p>
              <p className="text-sm">• Você poderá registrar estatísticas</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStartGame}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Jogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
