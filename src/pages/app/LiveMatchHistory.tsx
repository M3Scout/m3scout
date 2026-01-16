import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Radio,
  Plus,
  Calendar,
  Trophy,
  MapPin,
  Clock,
  CheckCircle2,
  Pause,
  FileText,
  Trash2,
  MoreVertical,
  Eye,
  Play,
  Wifi,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MatchStatus = "draft" | "live" | "finished" | "applied";

interface MatchWithCompetition {
  id: string;
  opponent_name: string;
  match_date: string;
  status: MatchStatus;
  venue: string | null;
  season_year: number;
  duration_minutes: number;
  created_at: string;
  competition: {
    id: string;
    name: string;
    display_name: string | null;
  } | null;
}

const statusConfig: Record<MatchStatus, { label: string; bgClass: string; textClass: string; icon: React.ReactNode }> = {
  draft: { 
    label: "Rascunho", 
    bgClass: "bg-zinc-700/60", 
    textClass: "text-zinc-400",
    icon: <FileText className="h-3 w-3" /> 
  },
  live: { 
    label: "Ao Vivo", 
    bgClass: "bg-red-500/20", 
    textClass: "text-red-400",
    icon: <Radio className="h-3 w-3 animate-pulse" /> 
  },
  finished: { 
    label: "Finalizado", 
    bgClass: "bg-amber-500/20", 
    textClass: "text-amber-400",
    icon: <Pause className="h-3 w-3" /> 
  },
  applied: { 
    label: "Aplicado", 
    bgClass: "bg-emerald-500/20", 
    textClass: "text-emerald-400",
    icon: <CheckCircle2 className="h-3 w-3" /> 
  },
};

// Skeleton for loading state
function MatchCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </motion.div>
  );
}

// Live Hub Empty State Card
function LiveHubEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Glow effect behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-red-600/5 rounded-3xl blur-xl" />
      
      <div className="relative rounded-3xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90 p-8 sm:p-12 shadow-2xl">
        {/* Broadcast icon with animation */}
        <div className="flex flex-col items-center text-center">
          {/* Animated broadcast icon */}
          <div className="relative mb-6">
            {/* Outer ring pulse */}
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            {/* Middle ring */}
            <div className="absolute inset-2 rounded-full bg-red-500/10 animate-pulse" style={{ animationDuration: '1.5s' }} />
            {/* Icon container */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-600/20 to-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Wifi className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3">
            Nenhum jogo ao vivo no momento
          </h3>

          {/* Description */}
          <p className="text-sm sm:text-base text-zinc-500 max-w-md mb-8 leading-relaxed">
            Crie um jogo para registrar eventos, estatísticas e desempenho em tempo real durante as partidas.
          </p>

          {/* CTA Button with pulse */}
          <Link to="/app/live-match/new">
            <Button 
              size="lg" 
              className="relative bg-red-600 hover:bg-red-700 text-white gap-2.5 px-8 h-12 text-base font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all hover:shadow-xl hover:shadow-red-600/30 hover:scale-[1.02]"
            >
              <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
              <Radio className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Criar primeiro jogo</span>
            </Button>
          </Link>

          {/* Features hint */}
          <div className="flex items-center gap-6 mt-8 pt-8 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Activity className="w-3.5 h-3.5 text-zinc-600" />
              Estatísticas em tempo real
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-600" />
              Cronômetro automático
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Trophy className="w-3.5 h-3.5 text-zinc-600" />
              Integração com competições
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Match Card Component
interface MatchCardProps {
  match: MatchWithCompetition;
  link: string;
  onDelete: () => void;
  index: number;
}

function MatchCard({ match, link, onDelete, index }: MatchCardProps) {
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const isLive = match.status === "live";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link
        to={link}
        className={cn(
          "block relative rounded-xl border bg-zinc-900/60 p-4 transition-all duration-300",
          "hover:bg-zinc-900/80 hover:border-zinc-700/60 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5",
          isLive && "border-red-500/30 shadow-lg shadow-red-500/10"
        )}
      >
        {/* Live glow effect */}
        {isLive && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600/5 via-transparent to-red-600/5 pointer-events-none" />
        )}

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={cn(
            "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            config.bgClass
          )}>
            <div className={cn("scale-125", config.textClass)}>
              {config.icon}
            </div>
          </div>

          {/* Match info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-zinc-100 truncate">
                vs {match.opponent_name}
              </h4>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-2 py-0 h-5 border-0",
                  config.bgClass, config.textClass
                )}
              >
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {competitionName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR })}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1 hidden sm:flex">
                  <MapPin className="h-3 w-3" />
                  {match.venue}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {match.duration_minutes}'
              </span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem asChild>
                <Link to={link} className="flex items-center gap-2 cursor-pointer">
                  {match.status === "live" ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Continuar
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Ver detalhes
                    </>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.preventDefault(); onDelete(); }}
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Link>
    </motion.div>
  );
}

// Section component for grouped matches
interface MatchSectionProps {
  title: string;
  icon: React.ReactNode;
  iconColorClass: string;
  borderColorClass?: string;
  matches: MatchWithCompetition[];
  getMatchLink: (match: MatchWithCompetition) => string;
  onDeleteClick: (match: MatchWithCompetition) => void;
}

function MatchSection({ 
  title, 
  icon, 
  iconColorClass, 
  borderColorClass = "border-zinc-800/60",
  matches, 
  getMatchLink, 
  onDeleteClick 
}: MatchSectionProps) {
  if (matches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-zinc-900/40 overflow-hidden",
        borderColorClass
      )}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/40">
        <div className={cn("text-lg", iconColorClass)}>
          {icon}
        </div>
        <h3 className={cn("font-semibold", iconColorClass)}>
          {title}
        </h3>
        <span className="text-xs text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
          {matches.length}
        </span>
      </div>

      {/* Matches list */}
      <div className="p-3 space-y-2">
        {matches.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            link={getMatchLink(match)}
            onDelete={() => onDeleteClick(match)}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function LiveMatchHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteMatch, setDeleteMatch] = useState<MatchWithCompetition | null>(null);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          opponent_name,
          match_date,
          status,
          venue,
          season_year,
          duration_minutes,
          created_at,
          competition:competitions(id, name, display_name)
        `)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MatchWithCompetition[];
    },
    enabled: !!user,
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches-history"] });
      toast.success("Jogo excluído com sucesso");
      setDeleteMatch(null);
    },
    onError: (error) => {
      console.error("Delete match error:", error);
      toast.error("Erro ao excluir jogo");
    },
  });

  // Group by status
  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const appliedMatches = matches.filter((m) => m.status === "applied");
  const draftMatches = matches.filter((m) => m.status === "draft");

  const hasLiveMatch = liveMatches.length > 0;

  const getMatchLink = (match: MatchWithCompetition) => {
    if (match.status === "applied") {
      return `/app/live-match/${match.id}/review`;
    }
    return `/app/live-match/${match.id}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Live indicator when there's an active match */}
          {hasLiveMatch && (
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
              <div className="relative w-3 h-3 rounded-full bg-red-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Jogo ao Vivo
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Registro de estatísticas em tempo real
            </p>
          </div>
        </div>

        <Link to="/app/live-match/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Novo Jogo
          </Button>
        </Link>
      </header>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <LiveHubEmptyState />
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {/* Live matches (priority with special styling) */}
            <MatchSection
              title="Ao Vivo"
              icon={<Radio className="w-5 h-5 animate-pulse" />}
              iconColorClass="text-red-400"
              borderColorClass="border-red-500/30"
              matches={liveMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
            />

            {/* Finished matches waiting to apply */}
            <MatchSection
              title="Aguardando Aplicar"
              icon={<Pause className="w-5 h-5" />}
              iconColorClass="text-amber-400"
              borderColorClass="border-amber-500/30"
              matches={finishedMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
            />

            {/* Applied matches (history) */}
            <MatchSection
              title="Histórico"
              icon={<CheckCircle2 className="w-5 h-5" />}
              iconColorClass="text-emerald-400"
              matches={appliedMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
            />

            {/* Draft matches */}
            <MatchSection
              title="Rascunhos"
              icon={<FileText className="w-5 h-5" />}
              iconColorClass="text-zinc-500"
              matches={draftMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMatch} onOpenChange={() => setDeleteMatch(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteMatch && (
                <>
                  Tem certeza que deseja excluir o jogo <strong className="text-zinc-200">vs {deleteMatch.opponent_name}</strong>?
                  {deleteMatch.status === "applied" && (
                    <span className="block mt-2 text-amber-400">
                      ⚠️ As estatísticas já aplicadas aos jogadores NÃO serão removidas.
                    </span>
                  )}
                  <span className="block mt-2">
                    Esta ação não pode ser desfeita.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMatch && deleteMatchMutation.mutate(deleteMatch.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMatchMutation.isPending}
            >
              {deleteMatchMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
