import { useState, useCallback, useMemo } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { MatchHeader } from "@/components/live-match/MatchHeader";
import { AddPlayerModal } from "@/components/live-match/AddPlayerModal";
import { PlayerStatCard } from "@/components/live-match/PlayerStatCard";
import { EventLogDrawer } from "@/components/live-match/EventLogDrawer";
import { SubstitutionModal } from "@/components/live-match/SubstitutionModal";
import { LiveMatchBigTimer, TimerInfo } from "@/components/live-match/LiveMatchBigTimer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserPlus, Users, ArrowRightLeft } from "lucide-react";

export default function LiveMatchGame() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentTimerInfo, setCurrentTimerInfo] = useState<TimerInfo | null>(null);

  const {
    match,
    matchPlayers,
    matchEvents,
    filteredPlayers,
    playerEventCounts,
    isLoading,
    matchError,
    onlyOnField,
    setOnlyOnField,
    addPlayer,
    addEvent,
    deleteEvent,
    undoLastEvent,
    updateMatchStatus,
    startGame,
    playerEnterField,
    playerExitField,
    substitutePlayer,
    removePlayer,
    // Timer V2 mutations
    playPauseClock,
    resetClock,
    endFirstHalf,
    startSecondHalf,
    updateAddedTime,
    finishGame,
  } = useLiveMatch(matchId || "");

  // Handle minute change from timer
  const handleMinuteChange = useCallback((minute: number) => {
    setCurrentMinute(minute);
  }, []);

  // Handle timer info change (includes display string)
  const handleTimerInfoChange = useCallback((info: TimerInfo) => {
    setCurrentTimerInfo(info);
  }, []);

  // Handle finish game - navigate to review after finishing
  const handleFinishGame = useCallback(() => {
    finishGame.mutate(undefined, {
      onSuccess: () => {
        navigate(`/app/live-match/${matchId}/review`);
      },
    });
  }, [finishGame, matchId, navigate]);

  // Count starters for header display
  const startersCount = useMemo(() => {
    return matchPlayers.filter((mp) => mp.started).length;
  }, [matchPlayers]);

  if (!matchId) {
    return <Navigate to="/app/live-match/new" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Jogo não encontrado</h1>
        <Button asChild>
          <Link to="/app/live-match/new">Criar novo jogo</Link>
        </Button>
      </div>
    );
  }

  const handleAddEvent = (playerId: string, eventType: MatchEventType) => {
    addEvent.mutate({ 
      playerId, 
      eventType, 
      minute: currentMinute || undefined,
      half: currentTimerInfo?.half,
      displayMinute: currentTimerInfo?.displayString,
    });
  };

  const handlePlayerEnter = (matchPlayerId: string, minute: number) => {
    playerEnterField.mutate({ matchPlayerId, minute });
  };

  const handlePlayerExit = (matchPlayerId: string, minute: number) => {
    playerExitField.mutate({ matchPlayerId, minute });
  };

  const handleRemovePlayer = (matchPlayerId: string) => {
    removePlayer.mutate(matchPlayerId);
  };

  const existingPlayerIds = matchPlayers.map((mp) => mp.player_id);
  const playersOnField = matchPlayers.filter((mp) => mp.is_on_field);
  const playersOffField = matchPlayers.filter((mp) => !mp.is_on_field);

  const isDraft = match.status === "draft";
  const isLive = match.status === "live";

  return (
    <div className="min-h-screen pb-20">
      <MatchHeader
        match={match}
        onStatusChange={(status) => updateMatchStatus.mutate(status)}
        onStartGame={() => startGame.mutate()}
        onMinuteChange={handleMinuteChange}
        isPending={updateMatchStatus.isPending || startGame.isPending}
        startersCount={startersCount}
      />

      <div className="container py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Controls - Responsive with 44px touch targets */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setAddPlayerOpen(true)} 
              size="sm"
              className="h-10 sm:h-9"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {isDraft ? "Escalação" : "Jogador"}
            </Button>
            {/* Only show substitution button during live game */}
            {isLive && (
              <Button 
                onClick={() => setSubstitutionOpen(true)} 
                variant="outline"
                size="sm"
                className="h-10 sm:h-9"
                disabled={playersOnField.length === 0 || playersOffField.length === 0}
              >
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Substituir</span>
                <span className="sm:hidden">Sub</span>
              </Button>
            )}
            {/* Only show event log after game starts */}
            {!isDraft && (
              <EventLogDrawer
                events={matchEvents}
                players={matchPlayers}
                onDeleteEvent={(id) => deleteEvent.mutate(id)}
              />
            )}
          </div>

          {/* Only show on-field filter after game starts */}
          {!isDraft && (
            <div className="flex items-center gap-2">
              <Switch
                id="only-on-field"
                checked={onlyOnField}
                onCheckedChange={setOnlyOnField}
              />
              <Label htmlFor="only-on-field" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Só em campo</span>
                <span className="sm:hidden">Em campo</span>
              </Label>
            </div>
          )}
        </div>

        {/* Players count - Compact */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Users className="h-4 w-4 flex-shrink-0" />
          {isDraft ? (
            <span>
              {matchPlayers.length} jogador{matchPlayers.length !== 1 ? "es" : ""}
              {startersCount > 0 && (
                <span className="ml-1">
                  ({startersCount} titular{startersCount !== 1 ? "es" : ""})
                </span>
              )}
            </span>
          ) : (
            <span>
              {filteredPlayers.length} {onlyOnField ? "em campo" : "no jogo"}
              <span className="text-xs ml-1">
                ({playersOnField.length} ⚽ / {playersOffField.length} 🪑)
              </span>
            </span>
          )}
        </div>

        {/* Pre-game info */}
        {isDraft && matchPlayers.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm text-center">
            <p>📋 <strong>Pré-jogo:</strong> Monte a escalação e clique em "Iniciar Jogo" quando estiver pronto</p>
          </div>
        )}

        {/* Big Timer - visible during live and finished */}
        {!isDraft && match && (
          <LiveMatchBigTimer
            durationMinutes={match.duration_minutes}
            matchStatus={match.status}
            timerState={{
              half: (match.half || 1) as 1 | 2,
              clockStatus: match.clock_status || "stopped",
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

        {/* Player cards */}
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base">Nenhum jogador adicionado</p>
            <p className="text-xs sm:text-sm">
              Clique em "{isDraft ? "Escalação" : "Jogador"}" para começar
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {filteredPlayers.map((mp) => (
              <PlayerStatCard
                key={mp.id}
                matchPlayer={mp}
                matchStatus={match.status}
                currentMinute={currentMinute}
                eventCounts={playerEventCounts[mp.player_id] || ({} as Record<MatchEventType, number>)}
                onAddEvent={(type) => handleAddEvent(mp.player_id, type)}
                onUndo={() => undoLastEvent(mp.player_id)}
                onPlayerEnter={(minute) => handlePlayerEnter(mp.id, minute)}
                onPlayerExit={(minute) => handlePlayerExit(mp.id, minute)}
                onRemovePlayer={isDraft ? () => handleRemovePlayer(mp.id) : undefined}
                disabled={match.status === "applied"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add player modal */}
      <AddPlayerModal
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        existingPlayerIds={existingPlayerIds}
        matchStatus={match.status}
        onAddPlayer={(params) => addPlayer.mutate(params)}
        isPending={addPlayer.isPending}
      />

      {/* Substitution modal */}
      <SubstitutionModal
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        playersOnField={playersOnField}
        playersOffField={playersOffField}
        onSubstitute={(params) => substitutePlayer.mutate(params)}
        isPending={substitutePlayer.isPending}
        currentMinute={currentMinute}
      />
    </div>
  );
}
