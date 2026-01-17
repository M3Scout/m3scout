import { useState, useCallback, useMemo } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { useIsMobile } from "@/hooks/use-mobile";
import { GameHeaderCard } from "@/components/live-match/GameHeaderCard";
import { GameScoreboard, TimerInfo } from "@/components/live-match/GameScoreboard";
import { AddPlayerModal } from "@/components/live-match/AddPlayerModal";
import { PremiumPlayerCard } from "@/components/live-match/PremiumPlayerCard";
import { MobilePlayerCard } from "@/components/live-match/MobilePlayerCard";
import { LiveStatsPanel } from "@/components/live-match/LiveStatsPanel";
import { EventTimeline } from "@/components/live-match/EventTimeline";
import { PendingEventsBadge } from "@/components/live-match/PendingEventsBadge";
import { SubstitutionModal } from "@/components/live-match/SubstitutionModal";
import { EventEffects, useEventEffects } from "@/components/live-match/EventEffects";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserPlus, Users, ArrowRightLeft, Filter, 
  LayoutGrid, LayoutList, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// Loading skeleton for player cards
function PlayerCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </motion.div>
  );
}

export default function LiveMatchGame() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentTimerInfo, setCurrentTimerInfo] = useState<TimerInfo | null>(null);
  const [showOnlyOnField, setShowOnlyOnField] = useState(false);
  const { lastEvent, triggerEvent, effectsEnabled } = useEventEffects();
  const {
    match,
    matchPlayers,
    matchEvents,
    filteredPlayers,
    playerEventCounts,
    pendingEventsCount,
    playerStatsMap,
    isLoading,
    matchError,
    onlyOnField,
    setOnlyOnField,
    addPlayer,
    addEvent,
    deleteEvent,
    voidEvent,
    editEventTime,
    undoLastEvent,
    updateMatchStatus,
    startGame,
    playerEnterField,
    playerExitField,
    substitutePlayer,
    removePlayer,
    updatePlayer,
    playPauseClock,
    resetClock,
    endFirstHalf,
    startSecondHalf,
    updateAddedTime,
    finishGame,
  } = useLiveMatch(matchId || "");

  const handleMinuteChange = useCallback((minute: number) => {
    setCurrentMinute(minute);
  }, []);

  const handleTimerInfoChange = useCallback((info: TimerInfo) => {
    setCurrentTimerInfo(info);
  }, []);

  const handleFinishGame = useCallback(() => {
    finishGame.mutate(undefined, {
      onSuccess: () => {
        navigate(`/app/live-match/${matchId}/review`);
      },
    });
  }, [finishGame, matchId, navigate]);

  const startersCount = useMemo(() => {
    return matchPlayers.filter((mp) => mp.started).length;
  }, [matchPlayers]);

  const playersOnField = useMemo(() => {
    return matchPlayers.filter((mp) => mp.is_on_field && !mp.is_removed);
  }, [matchPlayers]);

  const playersOffField = useMemo(() => {
    return matchPlayers.filter((mp) => !mp.is_on_field && !mp.is_removed && mp.exited_minute === null);
  }, [matchPlayers]);

  const displayedPlayers = useMemo(() => {
    if (showOnlyOnField && match?.status !== "draft") {
      return filteredPlayers.filter(mp => mp.is_on_field);
    }
    return filteredPlayers;
  }, [filteredPlayers, showOnlyOnField, match?.status]);

  if (!matchId) {
    return <Navigate to="/app/live-match/new" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/60 p-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="container py-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <PlayerCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-2">
          <Zap className="w-8 h-8 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100">Jogo não encontrado</h1>
        <p className="text-sm text-zinc-500">O jogo pode ter sido excluído ou você não tem acesso.</p>
        <Button asChild>
          <Link to="/app/live-match/new">Criar novo jogo</Link>
        </Button>
      </div>
    );
  }

  const handleAddEvent = (playerId: string, eventType: MatchEventType) => {
    // Trigger visual effects for important events
    triggerEvent(eventType);
    
    addEvent.mutate({ 
      playerId, 
      eventType, 
      minute: currentMinute || undefined,
      half: currentTimerInfo?.half,
      displayMinute: currentTimerInfo?.displayString,
    });
  };

  const handlePlayerEnter = (matchPlayerId: string) => {
    playerEnterField.mutate({ matchPlayerId });
  };

  const handlePlayerExit = (matchPlayerId: string) => {
    playerExitField.mutate({ matchPlayerId });
  };

  const handleRemoveFromMatch = (mp: typeof matchPlayers[0]) => {
    if (mp.is_on_field) {
      playerExitField.mutate({ matchPlayerId: mp.id });
    }
    updatePlayer.mutate({
      matchPlayerId: mp.id,
      updates: { is_removed: true, removed_at: new Date().toISOString() },
    });
  };

  const existingPlayerIds = matchPlayers.map((mp) => mp.player_id);
  const isDraft = match.status === "draft";
  const isLive = match.status === "live";
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Event Visual Effects */}
      <EventEffects lastEvent={lastEvent} enabled={effectsEnabled} />

      {/* Premium Header */}
      <GameHeaderCard
        match={match}
        onStartGame={() => startGame.mutate()}
        isPending={updateMatchStatus.isPending || startGame.isPending}
        startersCount={startersCount}
        playersOnField={playersOnField.length}
        pendingEventsCount={pendingEventsCount}
      />

      {/* Main container - optimized for tablet */}
      <div className={cn(
        "py-4 space-y-4",
        // Mobile: standard container padding
        "px-4",
        // Tablet (768-1024px): use more screen width, less horizontal padding
        "tablet:px-6 tablet:max-w-[95vw] tablet:mx-auto",
        // Desktop: back to normal container behavior
        "desktop:container desktop:px-4 desktop:max-w-none"
      )}>
        {/* Scoreboard - only visible after game starts */}
        {!isDraft && (
          <GameScoreboard
            matchId={matchId}
            opponentName={match.opponent_name}
            competitionName={competitionName}
            venue={match.venue}
            durationMinutes={match.duration_minutes}
            matchStatus={match.status}
            timerState={{
              half: (match.half || 1) as 1 | 2,
              clockStatus: (match.clock_status || "stopped") as "stopped" | "running" | "paused",
              halfStartTime: match.half_start_time,
              elapsedSecondsInHalf: match.elapsed_seconds_in_half || 0,
              addedTimeFirstHalf: match.added_time_first_half || 0,
              addedTimeSecondHalf: match.added_time_second_half || 0,
            }}
            onPlayPause={() => playPauseClock.mutate()}
            onReset={() => resetClock.mutate()}
            onEndHalf={() => endFirstHalf.mutate()}
            onStartSecondHalf={() => startSecondHalf.mutate()}
            onUpdateAddedTime={(half, minutes) => updateAddedTime.mutate({ half, minutes })}
            onFinishGame={handleFinishGame}
            onMinuteChange={handleMinuteChange}
            onTimerInfoChange={handleTimerInfoChange}
            isPending={playPauseClock.isPending || endFirstHalf.isPending || startSecondHalf.isPending || finishGame.isPending}
          />
        )}

        {/* Live Stats Panel */}
        {!isDraft && matchEvents.length > 0 && (
          <LiveStatsPanel events={matchEvents} />
        )}

        {/* Controls bar - optimized for tablet touch */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 tablet:gap-3 justify-between"
        >
          <div className="flex items-center gap-2 tablet:gap-3 flex-wrap">
            <Button 
              onClick={() => setAddPlayerOpen(true)} 
              size="sm"
              className={cn(
                "gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700",
                // Tablet: larger touch target
                "h-10 tablet:h-11 tablet:px-4 tablet:text-sm"
              )}
            >
              <UserPlus className="h-4 w-4 tablet:h-5 tablet:w-5" />
              {isDraft ? "Escalação" : "Jogador"}
            </Button>

            {isLive && (
              <Button 
                onClick={() => setSubstitutionOpen(true)} 
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800",
                  // Tablet: larger touch target
                  "h-10 tablet:h-11 tablet:px-4 tablet:text-sm"
                )}
                disabled={playersOnField.length === 0 || playersOffField.length === 0}
              >
                <ArrowRightLeft className="h-4 w-4 tablet:h-5 tablet:w-5" />
                <span className="hidden sm:inline">Substituir</span>
              </Button>
            )}

            {(isDraft || isLive) && (
              <EventTimeline
                events={matchEvents}
                players={matchPlayers}
                onDeleteEvent={(id) => deleteEvent.mutate(id)}
                onVoidEvent={async (id, reason) => { 
                  await voidEvent.mutateAsync({ eventId: id, reason }); 
                }}
                onEditEventTime={async (id, seconds) => {
                  await editEventTime.mutateAsync({ eventId: id, gameTimeSeconds: seconds });
                }}
                matchStatus={match.status}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isDraft && (
              <div className={cn(
                "flex items-center gap-2 bg-zinc-800/60 rounded-lg border border-zinc-700/40",
                // Tablet: larger filter control
                "px-3 py-1.5 tablet:px-4 tablet:py-2"
              )}>
                <Filter className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 text-zinc-500" />
                <Switch
                  id="only-on-field"
                  checked={showOnlyOnField}
                  onCheckedChange={setShowOnlyOnField}
                  className="data-[state=checked]:bg-green-600"
                />
                <Label htmlFor="only-on-field" className="text-xs tablet:text-sm text-zinc-400 cursor-pointer">
                  Em campo
                </Label>
              </div>
            )}
          </div>
        </motion.div>

        {/* Players count */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Users className="h-4 w-4" />
          {isDraft ? (
            <span>
              {matchPlayers.length} jogador{matchPlayers.length !== 1 ? "es" : ""}
              {startersCount > 0 && (
                <span className="ml-1 text-zinc-400">
                  ({startersCount} titular{startersCount !== 1 ? "es" : ""})
                </span>
              )}
            </span>
          ) : (
            <span>
              {displayedPlayers.length} exibido{displayedPlayers.length !== 1 ? "s" : ""}
              <span className="ml-1 text-zinc-400">
                ({playersOnField.length} ⚽ em campo / {playersOffField.length} 🪑 banco)
              </span>
            </span>
          )}
        </div>

        {/* Pre-game info */}
        {isDraft && matchPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4 text-center"
          >
            <p className="text-sm text-zinc-400">
              📋 <strong className="text-zinc-200">Pré-jogo:</strong> Monte a escalação e clique em "Iniciar Jogo" quando estiver pronto
            </p>
          </motion.div>
        )}

        {/* Player cards */}
        {displayedPlayers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1">
              Nenhum jogador adicionado
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-sm mb-4">
              {isDraft 
                ? "Adicione jogadores à escalação para começar"
                : showOnlyOnField 
                  ? "Nenhum jogador em campo no momento"
                  : "Adicione jogadores ao jogo"
              }
            </p>
            <Button 
              onClick={() => setAddPlayerOpen(true)}
              className="gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
            >
              <UserPlus className="w-4 h-4" />
              {isDraft ? "Montar Escalação" : "Adicionar Jogador"}
            </Button>
          </motion.div>
        ) : (
          <div className={cn(
            "grid",
            // Mobile: single column
            "grid-cols-1 gap-3",
            // Tablet: 1 column but with more gap for better card visibility
            // Cards expand to full width - better for horizontal stat layout
            "tablet:grid-cols-1 tablet:gap-4",
            // Desktop: 2 columns
            "desktop:grid-cols-2 desktop:gap-4",
            // Large desktop: still 2 cols
            isMobile ? "" : "md:grid-cols-2"
          )}>
            {displayedPlayers.map((mp, index) => (
              isMobile ? (
                <MobilePlayerCard
                  key={mp.id}
                  matchPlayer={mp}
                  matchStatus={match.status}
                  clockStatus={match.clock_status as "stopped" | "running" | "paused"}
                  currentMinute={currentMinute}
                  currentPeriod={match.half}
                  displayMinute={currentTimerInfo?.displayString}
                  eventCounts={playerEventCounts[mp.player_id] || ({} as Record<MatchEventType, number>)}
                  matchStats={playerStatsMap[mp.player_id]}
                  onAddEvent={(type) => handleAddEvent(mp.player_id, type)}
                  onUndo={() => undoLastEvent(mp.player_id)}
                  onPlayerEnter={(matchPlayerId) => handlePlayerEnter(matchPlayerId)}
                  onPlayerExit={(matchPlayerId) => handlePlayerExit(matchPlayerId)}
                  onRemoveFromMatch={() => handleRemoveFromMatch(mp)}
                  onSaveNotes={async (notes) => {
                    await updatePlayer.mutateAsync({ matchPlayerId: mp.id, updates: { notes } });
                  }}
                  disabled={match.status === "applied"}
                  index={index}
                />
              ) : (
                <PremiumPlayerCard
                  key={mp.id}
                  matchPlayer={mp}
                  matchStatus={match.status}
                  clockStatus={match.clock_status as "stopped" | "running" | "paused"}
                  currentMinute={currentMinute}
                  currentPeriod={match.half}
                  displayMinute={currentTimerInfo?.displayString}
                  eventCounts={playerEventCounts[mp.player_id] || ({} as Record<MatchEventType, number>)}
                  matchStats={playerStatsMap[mp.player_id]}
                  onAddEvent={(type) => handleAddEvent(mp.player_id, type)}
                  onUndo={() => undoLastEvent(mp.player_id)}
                  onPlayerEnter={(matchPlayerId) => handlePlayerEnter(matchPlayerId)}
                  onPlayerExit={(matchPlayerId) => handlePlayerExit(matchPlayerId)}
                  onRemoveFromMatch={() => handleRemoveFromMatch(mp)}
                  onSaveNotes={async (notes) => {
                    await updatePlayer.mutateAsync({ matchPlayerId: mp.id, updates: { notes } });
                  }}
                  disabled={match.status === "applied"}
                  index={index}
                />
              )
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPlayerModal
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        existingPlayerIds={existingPlayerIds}
        matchStatus={match.status}
        onAddPlayer={(params) => addPlayer.mutate(params)}
        isPending={addPlayer.isPending}
      />

      <SubstitutionModal
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        playersOnField={playersOnField}
        playersOffField={playersOffField}
        onSubstitute={(params) => substitutePlayer.mutate(params)}
        isPending={substitutePlayer.isPending}
        currentMinute={currentMinute}
        currentHalf={currentTimerInfo?.half}
        displayMinute={currentTimerInfo?.displayString}
      />
    </div>
  );
}
