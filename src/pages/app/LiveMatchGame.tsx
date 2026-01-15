import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useLiveMatch, MatchEventType } from "@/hooks/useLiveMatch";
import { MatchHeader } from "@/components/live-match/MatchHeader";
import { AddPlayerModal } from "@/components/live-match/AddPlayerModal";
import { PlayerStatCard } from "@/components/live-match/PlayerStatCard";
import { EventLogDrawer } from "@/components/live-match/EventLogDrawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserPlus, Users } from "lucide-react";

export default function LiveMatchGame() {
  const { matchId } = useParams<{ matchId: string }>();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

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
  } = useLiveMatch(matchId || "");

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
          <a href="/app/live-match/new">Criar novo jogo</a>
        </Button>
      </div>
    );
  }

  const handleAddEvent = (playerId: string, eventType: MatchEventType) => {
    addEvent.mutate({ playerId, eventType });
  };

  const existingPlayerIds = matchPlayers.map((mp) => mp.player_id);

  return (
    <div className="min-h-screen pb-20">
      <MatchHeader
        match={match}
        onStatusChange={(status) => updateMatchStatus.mutate(status)}
        isPending={updateMatchStatus.isPending}
      />

      <div className="container py-4 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => setAddPlayerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Jogador
            </Button>
            <EventLogDrawer
              events={matchEvents}
              players={matchPlayers}
              onDeleteEvent={(id) => deleteEvent.mutate(id)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="only-on-field"
              checked={onlyOnField}
              onCheckedChange={setOnlyOnField}
            />
            <Label htmlFor="only-on-field" className="text-sm">
              Só em campo
            </Label>
          </div>
        </div>

        {/* Players count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {filteredPlayers.length} jogador{filteredPlayers.length !== 1 ? "es" : ""}{" "}
          {onlyOnField ? "em campo" : "no jogo"}
        </div>

        {/* Player cards */}
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum jogador adicionado</p>
            <p className="text-sm">
              Clique em "Adicionar Jogador" para começar
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPlayers.map((mp) => (
              <PlayerStatCard
                key={mp.id}
                matchPlayer={mp}
                eventCounts={playerEventCounts[mp.player_id] || ({} as Record<MatchEventType, number>)}
                onAddEvent={(type) => handleAddEvent(mp.player_id, type)}
                onUndo={() => undoLastEvent(mp.player_id)}
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
        onAddPlayer={(params) => addPlayer.mutate(params)}
        isPending={addPlayer.isPending}
      />
    </div>
  );
}
