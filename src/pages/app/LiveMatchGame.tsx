import { useState, useCallback, useMemo, useRef } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HookDebugErrorBoundary, getHookMask, isBlockEnabled, getHookDebugState, setHookDebugState } from "@/components/HookDebugErrorBoundary";
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
import { AddManualEventModal } from "@/components/live-match/AddManualEventModal";
import { LiveMatchDebugHud, LiveMatchRpcError } from "@/components/live-match/LiveMatchDebugHud";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  UserPlus, Users, ArrowRightLeft, Filter, 
  LayoutGrid, LayoutList, Zap, Edit3, Save, X, PlusCircle, Eye, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

// Inner content component that receives validated matchId
function LiveMatchGameInner({ matchId }: { matchId: string }) {
  if (import.meta.env.DEV) console.log("[MOUNT] LiveMatchGameInner", { matchId });

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { linkedPlayerId, isPlayer, isAdmin, isScout } = useAuth();
  const { isPlayerRole } = usePermissions();
  
  // Determine if user is in player-only mode (read-only)
  const isPlayerOnlyMode = (isPlayer || isPlayerRole) && !isAdmin && !isScout;

  // HookDebug (preview-only): helps isolate hook-order violations by mounting/unmounting blocks
  const hookDebugEnabled =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("id-preview--") || import.meta.env.DEV) &&
    new URLSearchParams(window.location.search).has("hookDebug");

  // Read hookMask from URL or storage for binary search
  const hookMask = hookDebugEnabled ? getHookMask() : 31;
  
  // Convert bitmask to individual flags (indices: 0=Header, 1=Timeline, 2=Summary, 3=StatsPanels, 4=Modals)
  const [hookDebugFlags, setHookDebugFlags] = useState(() => ({
    header: isBlockEnabled(0, hookMask),
    timeline: isBlockEnabled(1, hookMask),
    summary: isBlockEnabled(2, hookMask),
    statsPanels: isBlockEnabled(3, hookMask),
    modals: isBlockEnabled(4, hookMask),
  }));

  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [manualEventOpen, setManualEventOpen] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentTimerInfo, setCurrentTimerInfo] = useState<TimerInfo | null>(null);
  const [showOnlyOnField, setShowOnlyOnField] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showExitReviewDialog, setShowExitReviewDialog] = useState(false);
  const reviewModeEventsCount = useRef(0);
  const [lastActionAttempt, setLastActionAttempt] = useState<string | null>(null);
  const [lastRpcError, setLastRpcError] = useState<LiveMatchRpcError>(null);
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
    voidLastEventByType,
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
    regenerateSummary,
  } = useLiveMatch(matchId);

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

  // ========================================================================
  // CRITICAL: All useMemos that depend on match/matchPlayers MUST be declared
  // AFTER the loading/error guards below. Moving them here caused #310 on refresh.
  // ========================================================================

  // Guard #1: Show loading skeleton while data is being fetched
  // This MUST come before any useMemo that accesses match/matchPlayers/filteredPlayers
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

  // Guard #2: Show error state if match failed to load or doesn't exist
  if (matchError || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-2">
          <Zap className="w-8 h-8 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100">Jogo não encontrado</h1>
        <p className="text-sm text-zinc-500">O jogo pode ter sido excluído ou você não tem acesso.</p>
        {!isPlayerOnlyMode && (
          <Button asChild>
            <Link to="/app/live-match/new">Criar novo jogo</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link to="/app/live-match">Voltar</Link>
        </Button>
      </div>
    );
  }

  // ========================================================================
  // SAFE ZONE: match and matchPlayers are guaranteed to exist below this point
  // ========================================================================

  // Check if player is in lineup for this match (for PLAYER role access control)
  // Now safe to access matchPlayers since we've already verified loading is complete
  const playerIsInLineup = (() => {
    if (!isPlayerOnlyMode || !linkedPlayerId) return true;
    return matchPlayers.some(mp => mp.player_id === linkedPlayerId && !mp.is_removed);
  })();

  // PLAYER role: check if they're in the lineup
  if (isPlayerOnlyMode && !playerIsInLineup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100">Acesso Restrito</h1>
        <p className="text-sm text-zinc-500 text-center max-w-md">
          Você não está escalado nesta partida. <br />
          Apenas jogadores que participam do jogo podem visualizá-lo.
        </p>
        <Button variant="outline" asChild>
          <Link to="/app/live-match">Ver Meus Jogos</Link>
        </Button>
      </div>
    );
  }

  // ========================================================================
  // Derived data - NOW SAFE since guards above prevent access to undefined data
  // Using IIFE instead of useMemo to avoid hook order issues with early returns
  // ========================================================================
  const startersCount = matchPlayers.filter((mp) => mp.started).length;
  const playersOnField = matchPlayers.filter((mp) => mp.is_on_field && !mp.is_removed);
  const playersOffField = matchPlayers.filter((mp) => !mp.is_on_field && !mp.is_removed && mp.exited_minute === null);
  const displayedPlayers = (showOnlyOnField && match.status !== "draft")
    ? filteredPlayers.filter(mp => mp.is_on_field)
    : filteredPlayers;

  // For PLAYER role, always read-only (no event logging)
  const isReadOnlyPlayer = isPlayerOnlyMode;

  const handleAddEvent = (playerId: string, eventType: MatchEventType, forceMinute?: number) => {
    // Track for debug
    setLastActionAttempt(eventType);
    setLastRpcError(null);
    
    // Trigger visual effects for important events
    triggerEvent(eventType);
    
    // In review mode, use forced minute if provided
    const minuteToUse = forceMinute !== undefined ? forceMinute : currentMinute;
    
    // Track events added in review mode
    if (isReviewMode) {
      reviewModeEventsCount.current += 1;
    }
    
    addEvent.mutate({ 
      playerId, 
      eventType, 
      minute: minuteToUse || undefined,
      half: currentTimerInfo?.half,
      displayMinute: forceMinute !== undefined ? `${forceMinute}'` : currentTimerInfo?.displayString,
    }, {
      onError: (error: any) => {
        setLastRpcError({
          status: error?.status,
          message: error?.message || "Erro desconhecido",
        });
      },
    });
  };

  const handleAddManualEvent = (playerId: string, eventType: MatchEventType, minute: number, notes?: string) => {
    handleAddEvent(playerId, eventType, minute);
    // TODO: notes can be stored if needed in future
  };

  const handleToggleReviewMode = () => {
    if (isReviewMode) {
      // Exiting review mode - check for unsaved events
      if (reviewModeEventsCount.current > 0) {
        setShowExitReviewDialog(true);
        return;
      }
      toast.success("Modo revisão finalizado.");
    } else {
      reviewModeEventsCount.current = 0;
      toast.info("Modo revisão ativado. Você pode adicionar/editar eventos.");
    }
    setIsReviewMode(!isReviewMode);
  };

  const handleConfirmExitReview = (shouldRegenerate: boolean) => {
    if (shouldRegenerate) {
      regenerateSummary.mutate(undefined, {
        onSuccess: () => {
          toast.success("Resumo regenerado com sucesso!");
          reviewModeEventsCount.current = 0;
          setIsReviewMode(false);
          setShowExitReviewDialog(false);
        },
        onError: () => {
          toast.error("Erro ao regenerar resumo. Tente novamente.");
        }
      });
    } else {
      reviewModeEventsCount.current = 0;
      setIsReviewMode(false);
      setShowExitReviewDialog(false);
      toast.info("Modo revisão finalizado sem regenerar resumo.");
    }
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
  const isFinished = match.status === "finished";
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  
  // Unified gating logic
  const statusStr = String(match.status);
  const isFinal = ["finished", "applied", "completed"].includes(statusStr);
  const isLocked = statusStr === "locked" || Boolean((match as any).is_locked);
  
  // Can add events if: (live and clock running) OR (final and review mode and not locked) AND not player-only mode
  const canAddEvents = !isLocked && !isReadOnlyPlayer && ((isLive && match.clock_status === "running") || (isFinal && isReviewMode));
  
  // Can modify match (add players, substitute, etc.) - not for player-only mode
  const canModifyMatch = !isLocked && !isReadOnlyPlayer;

  // Determine UI read-only reason for Debug HUD
  // NOTE: this must NOT be a hook (e.g., useMemo) because this component has early returns above.
  // Having a hook after an early return causes "Rendered more hooks than during the previous render" on refresh.
  const uiReadOnlyReason = (() => {
    if (isReadOnlyPlayer) return "PLAYER_READONLY";
    if (isLocked) return "LOCKED";
    if (isDraft) return "DRAFT";
    if (isFinal && !isReviewMode) return "FINAL_NOT_REVIEW";
    if (isLive && match.clock_status !== "running") return "CLOCK_NOT_RUNNING";
    return "";
  })();

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Debug HUD - only for admins */}
      <LiveMatchDebugHud
        match={match}
        isReviewMode={isReviewMode}
        canAddEvents={canAddEvents}
        uiReadOnlyReason={uiReadOnlyReason}
        lastActionAttempt={lastActionAttempt}
        lastRpcError={lastRpcError}
      />

      {/* HookDebug controls (preview only): add ?hookDebug=1 to the URL */}
      {hookDebugEnabled && (
        <div className="mx-4 mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-zinc-200">HookDebug</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px] border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() =>
                  setHookDebugFlags({
                    header: true,
                    timeline: true,
                    summary: true,
                    statsPanels: true,
                    modals: true,
                  })
                }
              >
                Tudo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px] border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() =>
                  setHookDebugFlags({
                    header: false,
                    timeline: false,
                    summary: false,
                    statsPanels: false,
                    modals: false,
                  })
                }
              >
                Nada
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-zinc-400">A) Header / Scoreboard</Label>
              <Switch
                checked={hookDebugFlags.header}
                onCheckedChange={(v) => setHookDebugFlags((s) => ({ ...s, header: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-zinc-400">B) Timeline</Label>
              <Switch
                checked={hookDebugFlags.timeline}
                onCheckedChange={(v) => setHookDebugFlags((s) => ({ ...s, timeline: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-zinc-400">C) Summary</Label>
              <Switch
                checked={hookDebugFlags.summary}
                onCheckedChange={(v) => setHookDebugFlags((s) => ({ ...s, summary: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-zinc-400">D) Stats / Cards</Label>
              <Switch
                checked={hookDebugFlags.statsPanels}
                onCheckedChange={(v) => setHookDebugFlags((s) => ({ ...s, statsPanels: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-zinc-400">E) Modals / Portals</Label>
              <Switch
                checked={hookDebugFlags.modals}
                onCheckedChange={(v) => setHookDebugFlags((s) => ({ ...s, modals: v }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Event Visual Effects */}
      <EventEffects lastEvent={lastEvent} enabled={effectsEnabled} />

      {/* Read-only banner for player mode */}
      {isReadOnlyPlayer && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3"
        >
          <Eye className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-300">Modo Visualização</p>
            <p className="text-xs text-blue-400/70">Você está vendo este jogo como jogador escalado. Não é possível editar.</p>
          </div>
        </motion.div>
      )}

      {/* Premium Header - hide controls for player mode */}
      {hookDebugFlags.header && !isReadOnlyPlayer && (
        <GameHeaderCard
          match={match}
          onStartGame={() => startGame.mutate()}
          isPending={updateMatchStatus.isPending || startGame.isPending}
          startersCount={startersCount}
          totalPlayersCount={matchPlayers.filter(mp => !mp.is_removed).length}
          playersOnField={playersOnField.length}
          pendingEventsCount={pendingEventsCount}
          isReviewMode={isReviewMode}
          onToggleReviewMode={handleToggleReviewMode}
          onRegenerateSummary={() => regenerateSummary.mutate()}
          isRegenerating={regenerateSummary.isPending}
        />
      )}

      {/* Exit Review Mode Confirmation Dialog */}
      <AlertDialog open={showExitReviewDialog} onOpenChange={setShowExitReviewDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Sair do Modo Revisão?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Você adicionou <strong className="text-amber-400">{reviewModeEventsCount.current}</strong> evento(s) durante esta revisão. 
              Deseja regenerar o resumo da partida com as novas estatísticas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
              onClick={() => setShowExitReviewDialog(false)}
            >
              Continuar editando
            </AlertDialogCancel>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => handleConfirmExitReview(false)}
            >
              Sair sem regenerar
            </Button>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleConfirmExitReview(true)}
              disabled={regenerateSummary.isPending}
            >
              {regenerateSummary.isPending ? "Regenerando..." : "Regenerar e sair"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        {hookDebugFlags.header && !isDraft && (
          <GameScoreboard
            matchId={matchId}
            teamName={match.team_name_display}
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
            isPending={
              playPauseClock.isPending ||
              endFirstHalf.isPending ||
              startSecondHalf.isPending ||
              finishGame.isPending
            }
          />
        )}

        {/* Live Stats Panel (Summary) */}
        {hookDebugFlags.summary && !isDraft && matchEvents.length > 0 && (
          <LiveStatsPanel events={matchEvents} />
        )}

        {/* Controls bar - hide for player read-only mode */}
        {hookDebugFlags.statsPanels && !isReadOnlyPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 tablet:gap-3 justify-between"
          >
            <div className="flex items-center gap-2 tablet:gap-3 flex-wrap">
              <Button
                onClick={() => setAddPlayerOpen(true)}
                size="sm"
                variant="ghost"
                className={cn(
                  "gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 shadow-none",
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

              {/* Manual event button - only in review mode */}
              {isReviewMode && (
                <Button
                  onClick={() => setManualEventOpen(true)}
                  size="sm"
                  className={cn(
                    "gap-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300",
                    "h-10 tablet:h-11 tablet:px-4 tablet:text-sm"
                  )}
                >
                  <PlusCircle className="h-4 w-4 tablet:h-5 tablet:w-5" />
                  <span className="hidden sm:inline">Evento Manual</span>
                  <span className="sm:hidden">Evento</span>
                </Button>
              )}

              {hookDebugFlags.timeline && (isDraft || isLive || isReviewMode) && (
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
                  isReviewMode={isReviewMode}
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isDraft && (
                <div
                  className={cn(
                    "flex items-center gap-2 bg-zinc-800/60 rounded-lg border border-zinc-700/40",
                    // Tablet: larger filter control
                    "px-3 py-1.5 tablet:px-4 tablet:py-2"
                  )}
                >
                  <Filter className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 text-zinc-500" />
                  <Switch
                    id="only-on-field"
                    checked={showOnlyOnField}
                    onCheckedChange={setShowOnlyOnField}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <Label
                    htmlFor="only-on-field"
                    className="text-xs tablet:text-sm text-zinc-400 cursor-pointer"
                  >
                    Em campo
                  </Label>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Player mode: simplified filter only */}
        {isReadOnlyPlayer && !isDraft && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-end"
          >
            <div
              className={cn(
                "flex items-center gap-2 bg-zinc-800/60 rounded-lg border border-zinc-700/40",
                "px-3 py-1.5"
              )}
            >
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <Switch
                id="only-on-field-player"
                checked={showOnlyOnField}
                onCheckedChange={setShowOnlyOnField}
                className="data-[state=checked]:bg-green-600"
              />
              <Label
                htmlFor="only-on-field-player"
                className="text-xs text-zinc-400 cursor-pointer"
              >
                Em campo
              </Label>
            </div>
          </motion.div>
        )}

        {/* Players count - derived from displayedPlayers (source of truth for rendered cards) */}
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
            (() => {
              // Calculate breakdown from displayedPlayers (same list that renders cards)
              const exibidos = displayedPlayers.length;
              const emCampo = displayedPlayers.filter(p => p.is_on_field === true).length;
              // banco = everyone displayed who is NOT on field (fallback for undefined/null)
              const banco = exibidos - emCampo;
              
              return (
                <span>
                  {exibidos} exibido{exibidos !== 1 ? "s" : ""}
                  <span className="ml-1 text-zinc-400">
                    ({emCampo} ⚽ em campo / {banco} 🪑 banco)
                  </span>
                </span>
              );
            })()
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
        {hookDebugFlags.statsPanels ? (
          displayedPlayers.length === 0 ? (
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
                    : "Adicione jogadores ao jogo"}
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
            <div
              className={cn(
                "grid",
                // Mobile: single column
                "grid-cols-1 gap-3",
                // Tablet PORTRAIT: 1 column for horizontal card layout
                "tablet:grid-cols-1 tablet:gap-4",
                // Tablet LANDSCAPE (iPad rotated): 2 columns side by side
                "tablet-landscape:grid-cols-2 tablet-landscape:gap-5",
                // Desktop: 2 columns
                "desktop:grid-cols-2 desktop:gap-4",
                // Fallback for non-tablet breakpoints
                isMobile ? "" : "md:grid-cols-2"
              )}
            >
              {displayedPlayers.map((mp, index) => {
                // Use a key that includes isMobile to force complete remount when switching
                // between MobilePlayerCard and PremiumPlayerCard. This prevents React error #310
                // caused by different hook counts between the two components.
                const cardKey = `${mp.id}-${isMobile ? "mobile" : "desktop"}`;

                const commonProps = {
                  matchPlayer: mp,
                  matchStatus: match.status,
                  clockStatus: match.clock_status as "stopped" | "running" | "paused",
                  currentMinute: currentMinute,
                  currentPeriod: match.half,
                  displayMinute: currentTimerInfo?.displayString,
                  eventCounts:
                    playerEventCounts[mp.player_id] || ({} as Record<MatchEventType, number>),
                  matchStats: playerStatsMap[mp.player_id],
                  // PLAYER role: disable all event/edit actions
                  onAddEvent: isReadOnlyPlayer ? undefined : (type: MatchEventType) => handleAddEvent(mp.player_id, type),
                  onUndo: isReadOnlyPlayer ? undefined : () => undoLastEvent(mp.player_id),
                  onVoidLastEvent: isReadOnlyPlayer ? undefined : (type: MatchEventType) =>
                    voidLastEventByType.mutate({ playerId: mp.player_id, eventType: type }),
                  onPlayerEnter: isReadOnlyPlayer ? undefined : (matchPlayerId: string) => handlePlayerEnter(matchPlayerId),
                  onPlayerExit: isReadOnlyPlayer ? undefined : (matchPlayerId: string) => handlePlayerExit(matchPlayerId),
                  onRemoveFromMatch: isReadOnlyPlayer ? undefined : () => handleRemoveFromMatch(mp),
                  onSaveNotes: isReadOnlyPlayer ? undefined : async (notes: string) => {
                    await updatePlayer.mutateAsync({ matchPlayerId: mp.id, updates: { notes } });
                  },
                  onUpdateStarterStatus: isReadOnlyPlayer ? undefined : async (matchPlayerId: string, started: boolean) => {
                    await updatePlayer.mutateAsync({ matchPlayerId, updates: { started } });
                    toast.success(started ? "Definido como Titular" : "Definido como Reserva");
                  },
                  disabled: isLocked || isReadOnlyPlayer,
                  isReviewMode: isReviewMode && !isReadOnlyPlayer,
                  index: index,
                };

                return isMobile ? (
                  <MobilePlayerCard key={cardKey} {...commonProps} />
                ) : (
                  <PremiumPlayerCard key={cardKey} {...commonProps} />
                );
              })}
            </div>
          )
        ) : (
          <div className="py-10 text-center text-sm text-zinc-500">
            HookDebug: bloco D (Stats / Cards) desativado.
          </div>
        )}
      </div>

      {/* Modals - only for non-player modes */}
      {hookDebugFlags.modals && !isReadOnlyPlayer && (
        <>
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

          {/* Manual Event Modal - for review mode */}
          <AddManualEventModal
            open={manualEventOpen}
            onOpenChange={setManualEventOpen}
            players={matchPlayers}
            onAddEvent={handleAddManualEvent}
            isPending={addEvent.isPending}
          />
        </>
      )}
    </div>
  );
}

// Wrapper component that extracts matchId and handles missing ID case
// This ensures hooks are called in consistent order regardless of matchId availability
function LiveMatchGameContent() {
  const { matchId } = useParams<{ matchId: string }>();
  
  // Guard: if no matchId, redirect (this happens before any other hooks in Inner)
  if (!matchId) {
    return <Navigate to="/app/live-match/new" replace />;
  }
  
  // Render inner component with guaranteed matchId
  return <LiveMatchGameInner matchId={matchId} />;
}

// Wrap with appropriate ErrorBoundary based on hookDebug mode
export default function LiveMatchGame() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isHookDebug = params.has("hookDebug");

  // Use HookDebugErrorBoundary when in debug mode for detailed error capture
  if (isHookDebug) {
    return (
      <HookDebugErrorBoundary 
        fallbackMessage="Ocorreu um erro ao carregar a partida. Tente recarregar a página."
      >
        <LiveMatchGameContent />
      </HookDebugErrorBoundary>
    );
  }

  return (
    <ErrorBoundary 
      fallbackMessage="Ocorreu um erro ao carregar a partida. Tente recarregar a página."
    >
      <LiveMatchGameContent />
    </ErrorBoundary>
  );
}
