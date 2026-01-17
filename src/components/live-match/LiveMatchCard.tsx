import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Radio,
  Trophy,
  Play,
  MoreVertical,
  Trash2,
  Goal,
  HandHelping,
  CreditCard,
  Users,
  ChevronRight,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { 
  calculateElapsedSecondsInHalf, 
  formatClockTime, 
  getDisplayMinute 
} from "@/lib/matchClock";

interface MatchWithCompetition {
  id: string;
  opponent_name: string;
  match_date: string;
  status: "draft" | "live" | "finished" | "applied";
  venue: string | null;
  season_year: number;
  duration_minutes: number;
  created_at: string;
  half?: number | null;
  half_start_time?: string | null;
  elapsed_seconds_in_half?: number | null;
  clock_status?: string | null;
  added_time_first_half?: number | null;
  added_time_second_half?: number | null;
  competition: {
    id: string;
    name: string;
    display_name: string | null;
  } | null;
}

interface MatchPlayer {
  id: string;
  player_id: string;
  is_on_field: boolean;
  players: {
    id: string;
    full_name: string;
    position: string;
    photo_url: string | null;
  };
}

interface LiveMatchCardProps {
  match: MatchWithCompetition;
  link: string;
  onDelete: () => void;
  index: number;
}

// Real-time timer hook - uses centralized clock calculation
function useLiveTimer(match: MatchWithCompetition) {
  const half = (match.half ?? 1) as 1 | 2;
  const halfDuration = (match.duration_minutes ?? 90) / 2;
  const isRunning = match.status === "live" && match.clock_status === "running";
  
  // Calculate initial elapsed seconds using the same logic as LiveMatchBigTimer
  const getElapsedSeconds = useCallback(() => {
    return calculateElapsedSecondsInHalf({
      clock_status: match.clock_status ?? "stopped",
      half_start_time: match.half_start_time ?? null,
      elapsed_seconds_in_half: match.elapsed_seconds_in_half ?? 0,
      half: match.half ?? 1,
      duration_minutes: match.duration_minutes ?? 90,
      added_time_first_half: match.added_time_first_half ?? 0,
      added_time_second_half: match.added_time_second_half ?? 0,
    });
  }, [match.clock_status, match.half_start_time, match.elapsed_seconds_in_half, match.half, match.duration_minutes, match.added_time_first_half, match.added_time_second_half]);

  const [elapsedSeconds, setElapsedSeconds] = useState(getElapsedSeconds);

  useEffect(() => {
    // Reset elapsed seconds when match state changes
    setElapsedSeconds(getElapsedSeconds());
    
    if (!isRunning) {
      return;
    }

    // Tick every second when running
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, getElapsedSeconds]);

  // Sync with backend periodically when running (every 30 seconds)
  useEffect(() => {
    if (!isRunning) return;

    const syncInterval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isRunning, getElapsedSeconds]);

  const displayTime = formatClockTime(elapsedSeconds);
  const displayMinute = getDisplayMinute(elapsedSeconds, half, halfDuration);

  return { displayTime, displayMinute, half };
}

// Quick event types
type QuickEventType = "goal" | "assist" | "yellow" | "red";

const quickEventConfig: Record<QuickEventType, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
}> = {
  goal: { 
    label: "Gol", 
    icon: <Goal className="w-4 h-4" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 hover:bg-emerald-500/30",
  },
  assist: { 
    label: "Assistência", 
    icon: <HandHelping className="w-4 h-4" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 hover:bg-blue-500/30",
  },
  yellow: { 
    label: "Amarelo", 
    icon: <CreditCard className="w-4 h-4" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 hover:bg-yellow-500/30",
  },
  red: { 
    label: "Vermelho", 
    icon: <CreditCard className="w-4 h-4" />,
    color: "text-red-400",
    bgColor: "bg-red-500/20 hover:bg-red-500/30",
  },
};

export function LiveMatchCard({ match, link, onDelete, index }: LiveMatchCardProps) {
  const queryClient = useQueryClient();
  const { displayTime, displayMinute, half } = useLiveTimer(match);
  const [quickEventType, setQuickEventType] = useState<QuickEventType | null>(null);
  const { teamName, logoUrl } = useTeamSettings();
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";

  // Fetch players on field for quick actions
  const { data: matchPlayers = [] } = useQuery({
    queryKey: ["match-players-quick", match.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select(`
          id,
          player_id,
          is_on_field,
          players (id, full_name, position, photo_url)
        `)
        .eq("match_id", match.id)
        .eq("is_on_field", true);

      if (error) throw error;
      return (data || []) as MatchPlayer[];
    },
    enabled: match.status === "live",
    staleTime: 30000,
  });

  // Mutation to add quick event
  const addQuickEvent = useMutation({
    mutationFn: async ({ playerId, eventType }: { playerId: string; eventType: QuickEventType }) => {
      // Get current match state for accurate timing
      const { data: currentMatch } = await supabase
        .from("matches")
        .select("half, half_start_time, elapsed_seconds_in_half, duration_minutes, clock_status")
        .eq("id", match.id)
        .single();

      if (!currentMatch) throw new Error("Match not found");

      const halfDuration = (currentMatch.duration_minutes || 90) / 2;
      const baseElapsed = currentMatch.elapsed_seconds_in_half || 0;
      const halfStartTime = currentMatch.half_start_time 
        ? new Date(currentMatch.half_start_time).getTime() 
        : null;
      
      let totalSeconds = baseElapsed;
      if (currentMatch.clock_status === "running" && halfStartTime) {
        totalSeconds = baseElapsed + Math.floor((Date.now() - halfStartTime) / 1000);
      }
      
      const currentMinute = currentMatch.half === 1
        ? Math.floor(totalSeconds / 60)
        : halfDuration + Math.floor(totalSeconds / 60);

      // Calculate display minute
      const minsInHalf = Math.floor(totalSeconds / 60);
      let displayMin: string;
      if (minsInHalf > halfDuration) {
        const added = minsInHalf - halfDuration;
        displayMin = currentMatch.half === 1 ? `45+${added}'` : `90+${added}'`;
      } else {
        displayMin = `${Math.floor(currentMinute)}'`;
      }

      const { error } = await supabase
        .from("match_events")
        .insert({
          match_id: match.id,
          player_id: playerId,
          event_type: eventType,
          minute: Math.floor(currentMinute),
          value: 1,
          half: currentMatch.half || 1,
          display_minute: displayMin,
        });

      if (error) throw error;
    },
    onSuccess: (_, { eventType }) => {
      const config = quickEventConfig[eventType];
      toast.success(`${config.label} registrado!`);
      setQuickEventType(null);
      queryClient.invalidateQueries({ queryKey: ["match-events", match.id] });
    },
    onError: (error) => {
      console.error("Quick event error:", error);
      toast.error("Erro ao registrar evento");
    },
  });

  const handleQuickAction = (type: QuickEventType) => {
    if (matchPlayers.length === 0) {
      toast.error("Nenhum jogador em campo");
      return;
    }
    setQuickEventType(type);
  };

  const handlePlayerSelect = (playerId: string) => {
    if (!quickEventType) return;
    addQuickEvent.mutate({ playerId, eventType: quickEventType });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group"
      >
        <div className={cn(
          "relative rounded-2xl border bg-zinc-900/60 overflow-hidden transition-all duration-300",
          "hover:bg-zinc-900/80 hover:border-zinc-700/60 hover:shadow-xl hover:shadow-black/20",
          "border-red-500/30 shadow-lg shadow-red-500/10"
        )}>
          {/* Live glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-transparent to-red-600/5 pointer-events-none" />

          {/* Main content */}
          <div className="p-4">
            <div className="flex items-start gap-4">
              {/* Timer section */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-600/30 to-red-500/10 border border-red-500/30 flex flex-col items-center justify-center">
                  <Timer className="w-4 h-4 text-red-400 mb-1" />
                  <span className="text-xl font-mono font-bold text-red-400 tabular-nums">
                    {displayTime}
                  </span>
                  <span className="text-[10px] text-red-400/70">
                    {half === 1 ? "1º tempo" : "2º tempo"}
                  </span>
                </div>
                <Badge className="mt-2 bg-red-500/20 text-red-400 border-0 text-[10px] gap-1 animate-pulse">
                  <Radio className="w-2.5 h-2.5" />
                  {displayMinute}
                </Badge>
              </div>

              {/* Match info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src={logoUrl} 
                    alt={teamName} 
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <h4 className="font-bold text-lg text-zinc-100 truncate">
                      {teamName}
                    </h4>
                    <p className="text-sm text-zinc-400">
                      vs {match.opponent_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {competitionName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {matchPlayers.length} em campo
                  </span>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(Object.entries(quickEventConfig) as [QuickEventType, typeof quickEventConfig.goal][]).map(([type, config]) => (
                    <Button
                      key={type}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleQuickAction(type);
                      }}
                      className={cn(
                        "h-8 px-3 gap-1.5 rounded-lg transition-all",
                        config.bgColor,
                        config.color
                      )}
                    >
                      {config.icon}
                      <span className="text-xs font-medium">{config.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem asChild>
                      <Link to={link} className="flex items-center gap-2 cursor-pointer">
                        <Play className="w-3.5 h-3.5" />
                        Continuar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link to={link}>
                  <Button 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700 text-white gap-1 h-8"
                  >
                    Abrir
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Player selection dialog for quick events */}
      <Dialog open={!!quickEventType} onOpenChange={() => setQuickEventType(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {quickEventType && quickEventConfig[quickEventType].icon}
              Selecionar Jogador
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
            {matchPlayers.map((mp) => (
              <Button
                key={mp.id}
                variant="ghost"
                className="justify-start h-auto py-3 px-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50"
                onClick={() => handlePlayerSelect(mp.player_id)}
                disabled={addQuickEvent.isPending}
              >
                <div className="flex items-center gap-3 w-full">
                  {mp.players.photo_url ? (
                    <img 
                      src={mp.players.photo_url} 
                      alt={mp.players.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium">
                      {mp.players.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm text-zinc-100">{mp.players.full_name}</p>
                    <p className="text-xs text-zinc-500">{mp.players.position}</p>
                  </div>
                </div>
              </Button>
            ))}
            
            {matchPlayers.length === 0 && (
              <p className="text-center text-zinc-500 py-4 text-sm">
                Nenhum jogador em campo
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
