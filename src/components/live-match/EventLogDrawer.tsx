import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MatchEvent, MatchPlayer, MatchEventType } from "@/hooks/useLiveMatch";
import { List, Trash2, Edit2, X, Check, ArrowRightLeft } from "lucide-react";

// Event type labels
const EVENT_LABELS: Record<MatchEventType | "substitution", string> = {
  goal: "Gol",
  assist: "Assistência",
  shot: "Chute",
  shot_on_target: "Chute no Gol",
  key_pass: "Passe Decisivo",
  chance_created: "Chance Criada",
  dribble_success: "Drible Certo",
  dribble_attempt: "Drible Tentativa",
  tackle: "Desarme",
  interception: "Interceptação",
  recovery: "Recuperação",
  clearance: "Corte",
  duel_won: "Duelo Ganho",
  duel_total: "Duelo Total",
  aerial_duel_won: "Duelo Aéreo",
  yellow: "Amarelo",
  red: "Vermelho",
  foul_committed: "Falta Cometida",
  foul_suffered: "Falta Sofrida",
  pass_success: "Passe Certo",
  pass_total: "Passe Total",
  possession_lost: "Bola Perdida",
  save: "Defesa",
  goal_conceded: "Gol Sofrido",
  clean_sheet: "Clean Sheet",
  penalty_saved: "Pênalti Def.",
  error_led_to_goal: "Erro→Gol",
  box_save: "Def. Área",
  punch: "Soco",
  high_claim: "Bola Alta",
  sweeper_action: "Saída Gol",
  substitution: "Substituição",
};

interface EventLogDrawerProps {
  events: MatchEvent[];
  players: MatchPlayer[];
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent?: (eventId: string, minute: number) => void;
}

export function EventLogDrawer({
  events,
  players,
  onDeleteEvent,
}: EventLogDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinute, setEditMinute] = useState("");

  // Group and sort events by half
  const { firstHalfEvents, secondHalfEvents } = useMemo(() => {
    const first: MatchEvent[] = [];
    const second: MatchEvent[] = [];

    events.forEach((event) => {
      if (event.half === 2) {
        second.push(event);
      } else {
        // Default to 1st half if half is null or 1
        first.push(event);
      }
    });

    // Sort each by created_at descending (most recent first)
    const sortByCreatedAt = (a: MatchEvent, b: MatchEvent) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    return {
      firstHalfEvents: first.sort(sortByCreatedAt),
      secondHalfEvents: second.sort(sortByCreatedAt),
    };
  }, [events]);

  const getPlayerName = (playerId: string) => {
    const mp = players.find((p) => p.player_id === playerId);
    return mp?.player?.full_name || "Jogador";
  };

  const handleStartEdit = (event: MatchEvent) => {
    setEditingId(event.id);
    setEditMinute(event.minute?.toString() || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMinute("");
  };

  // Format display minute - use display_minute if available, otherwise fallback to minute
  const getDisplayMinute = (event: MatchEvent) => {
    if (event.display_minute) {
      return event.display_minute;
    }
    if (event.minute != null) {
      return `${event.minute}'`;
    }
    return "--'";
  };

  const renderEventItem = (event: MatchEvent) => {
    const isSubstitution = event.event_type === "substitution";
    
    return (
      <div
        key={event.id}
        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono">
              {getDisplayMinute(event)}
            </Badge>
            {isSubstitution ? (
              <span className="flex items-center gap-1 font-medium text-sm">
                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
                Substituição
              </span>
            ) : (
              <span className="font-medium text-sm truncate">
                {EVENT_LABELS[event.event_type]}
              </span>
            )}
          </div>
          {isSubstitution ? (
            <div className="text-xs mt-1 space-y-0.5">
              <p className="text-red-400">
                ⬇️ {getPlayerName(event.player_id)} <span className="text-muted-foreground">sai</span>
              </p>
              {event.player_in_id && (
                <p className="text-green-400">
                  ⬆️ {getPlayerName(event.player_in_id)} <span className="text-muted-foreground">entra</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {getPlayerName(event.player_id)}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(event.created_at), "HH:mm:ss", { locale: ptBR })}
          </p>
        </div>

      {editingId === event.id ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={120}
            value={editMinute}
            onChange={(e) => setEditMinute(e.target.value)}
            className="w-16 h-8"
            placeholder="Min"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCancelEdit}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600"
            onClick={() => {
              // TODO: Implement update
              handleCancelEdit();
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleStartEdit(event)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDeleteEvent(event.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <List className="h-4 w-4 mr-2" />
          Log ({events.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log do Jogo</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum evento registrado
            </p>
          ) : (
            <div className="space-y-4">
              {/* 2nd Half - Show first if there are events */}
              {secondHalfEvents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                    <Badge
                      variant="default"
                      className="bg-primary text-primary-foreground"
                    >
                      2º TEMPO
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {secondHalfEvents.length} evento
                      {secondHalfEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {secondHalfEvents.map(renderEventItem)}
                  </div>
                </div>
              )}

              {/* 1st Half */}
              {firstHalfEvents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                    <Badge variant="secondary">1º TEMPO</Badge>
                    <span className="text-xs text-muted-foreground">
                      {firstHalfEvents.length} evento
                      {firstHalfEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {firstHalfEvents.map(renderEventItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
