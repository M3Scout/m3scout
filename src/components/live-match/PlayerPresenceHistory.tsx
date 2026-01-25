import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogIn, LogOut, User, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGameMinute, formatPresenceInterval } from "@/lib/formatters";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { useState } from "react";

interface PresenceRecord {
  id: string;
  match_id: string;
  match_player_id: string;
  player_id: string;
  period: number;
  entered_at_seconds: number;
  exited_at_seconds: number | null;
  role: string;
  player?: {
    id: string;
    full_name: string;
    photo_url: string | null;
    position: string;
  };
}

interface PlayerPresenceHistoryProps {
  matchId: string;
  className?: string;
}

export function PlayerPresenceHistory({ matchId, className }: PlayerPresenceHistoryProps) {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  const { data: presenceRecords = [], isLoading } = useQuery({
    queryKey: ["player-field-presence", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_field_presence")
        .select(`
          *,
          player:players(id, full_name, photo_url, position)
        `)
        .eq("match_id", matchId)
        .order("period", { ascending: true })
        .order("entered_at_seconds", { ascending: true });

      if (error) throw error;
      return data as PresenceRecord[];
    },
  });

  // Group records by player
  const playerGroups = presenceRecords.reduce((acc, record) => {
    const playerId = record.player_id;
    if (!acc[playerId]) {
      acc[playerId] = {
        player: record.player,
        records: [],
        totalMinutes: 0,
        // Determine game role ONCE for the entire match:
        // Player is "starter" if ANY of their stints has role === "starter"
        gameRole: "substitute" as "starter" | "substitute",
      };
    }
    
    // Update game role if this record shows player as starter
    if (record.role === "starter" && acc[playerId].gameRole === "substitute") {
      acc[playerId].gameRole = "starter";
    }
    
    acc[playerId].records.push(record);
    
    // Calculate total minutes
    if (record.exited_at_seconds !== null) {
      acc[playerId].totalMinutes += Math.floor((record.exited_at_seconds - record.entered_at_seconds) / 60);
    }
    
    return acc;
  }, {} as Record<string, { player: PresenceRecord["player"]; records: PresenceRecord[]; totalMinutes: number; gameRole: "starter" | "substitute" }>);

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3 animate-pulse", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-zinc-800/50 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (presenceRecords.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        "bg-zinc-900/60 rounded-2xl border border-white/5",
        className
      )}>
        <Clock className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500">Nenhum registro de presença</p>
        <p className="text-xs text-zinc-600 mt-1">
          Os intervalos em campo serão exibidos aqui
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-zinc-200">Histórico de Presença</h3>
        <Badge variant="glass" size="sm" className="ml-auto">
          {Object.keys(playerGroups).length} atleta(s)
        </Badge>
      </div>

      {Object.entries(playerGroups).map(([playerId, group]) => {
        const player = group.player;
        if (!player) return null;

        const positionColors = getPositionColor(player.position);
        const shortPosition = getShortPosition(player.position);
        const isExpanded = expandedPlayers.has(playerId);
        const isOnField = group.records.some(r => r.exited_at_seconds === null);

        return (
          <motion.div
            key={playerId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl overflow-hidden",
              "bg-zinc-900/60 border border-white/5",
              "transition-all duration-200"
            )}
          >
            {/* Player Header */}
            <button
              onClick={() => togglePlayer(playerId)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
            >
              <Avatar className={cn("h-10 w-10 border-2 shrink-0", positionColors.borderClass)}>
                <AvatarImage src={player.photo_url || undefined} />
                <AvatarFallback className={cn("font-bold text-sm", positionColors.bgClass, positionColors.textClass)}>
                  {player.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-zinc-100 truncate text-sm">
                  {player.full_name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge size="sm" className={cn(positionColors.bgClass, positionColors.textClass)}>
                    {shortPosition}
                  </Badge>
                  {isOnField && (
                    <Badge size="sm" variant="success">
                      Em campo
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-zinc-100 tabular-nums">
                  {group.totalMinutes} min
                </p>
                <p className="text-[10px] text-zinc-500 uppercase">
                  {group.records.length} intervalo(s)
                </p>
              </div>

              <div className="shrink-0 ml-1">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                )}
              </div>
            </button>

            {/* Expanded Intervals */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-zinc-800/50"
                >
                  <div className="p-3 space-y-2 bg-zinc-800/20">
                    {group.records.map((record, idx) => (
                      <div
                        key={record.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-xl",
                          "bg-zinc-800/40 border border-zinc-700/30"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                          record.period === 1 ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                        )}>
                          <span className="text-xs font-bold">{record.period}T</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-zinc-300">
                              {formatGameMinute(record.entered_at_seconds, record.period)}
                            </span>
                            {record.exited_at_seconds !== null ? (
                              <>
                                <span className="text-zinc-600">→</span>
                                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-zinc-300">
                                  {formatGameMinute(record.exited_at_seconds, record.period)}
                                </span>
                              </>
                            ) : (
                              <Badge size="sm" variant="success" className="ml-1">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {group.gameRole === "starter" ? "Titular" : "Reserva"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {record.exited_at_seconds !== null ? (
                            <span className="text-xs font-medium text-zinc-400 tabular-nums">
                              {Math.floor((record.exited_at_seconds - record.entered_at_seconds) / 60)} min
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400">
                              em andamento
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}