import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatchEvent, MatchPlayer, MatchEventType } from "@/hooks/useLiveMatch";
import { 
  List, Trash2, Goal, HandHelping, Shield, Target, 
  CreditCard, Footprints, ArrowRightLeft, AlertTriangle,
  Clock, MoreVertical, Pencil, XCircle, ArrowUp, ArrowDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditEventTimeModal } from "./EditEventTimeModal";
import { VoidEventDialog } from "./VoidEventDialog";
import { formatGameMinute } from "@/lib/formatters";

// Event icon and color mapping
const eventConfig: Record<MatchEventType | "substitution", {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  goal: { icon: <Goal className="w-3.5 h-3.5" />, label: "Gol", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  assist: { icon: <HandHelping className="w-3.5 h-3.5" />, label: "Assistência", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  shot: { icon: <Target className="w-3.5 h-3.5" />, label: "Chute", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  shot_on_target: { icon: <Target className="w-3.5 h-3.5" />, label: "Chute no Gol", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  key_pass: { icon: <Footprints className="w-3.5 h-3.5" />, label: "Passe Decisivo", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  chance_created: { icon: <Target className="w-3.5 h-3.5" />, label: "Chance Criada", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  dribble_success: { icon: <Footprints className="w-3.5 h-3.5" />, label: "Drible Certo", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  dribble_attempt: { icon: <Footprints className="w-3.5 h-3.5" />, label: "Drible", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  tackle: { icon: <Shield className="w-3.5 h-3.5" />, label: "Desarme", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  interception: { icon: <Shield className="w-3.5 h-3.5" />, label: "Interceptação", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  recovery: { icon: <Shield className="w-3.5 h-3.5" />, label: "Recuperação", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  clearance: { icon: <Shield className="w-3.5 h-3.5" />, label: "Corte", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  duel_won: { icon: <Shield className="w-3.5 h-3.5" />, label: "Duelo Ganho", color: "text-green-400", bgColor: "bg-green-500/20" },
  duel_total: { icon: <Shield className="w-3.5 h-3.5" />, label: "Duelo", color: "text-zinc-400", bgColor: "bg-zinc-500/20" },
  aerial_duel_won: { icon: <Shield className="w-3.5 h-3.5" />, label: "Duelo Aéreo", color: "text-green-400", bgColor: "bg-green-500/20" },
  yellow: { icon: <CreditCard className="w-3.5 h-3.5" />, label: "Cartão Amarelo", color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  red: { icon: <CreditCard className="w-3.5 h-3.5" />, label: "Cartão Vermelho", color: "text-red-400", bgColor: "bg-red-500/20" },
  foul_committed: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Falta Cometida", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  foul_suffered: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Falta Sofrida", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  pass_success: { icon: <Footprints className="w-3.5 h-3.5" />, label: "Passe Certo", color: "text-zinc-400", bgColor: "bg-zinc-500/20" },
  pass_total: { icon: <Footprints className="w-3.5 h-3.5" />, label: "Passe", color: "text-zinc-400", bgColor: "bg-zinc-500/20" },
  possession_lost: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Bola Perdida", color: "text-red-400", bgColor: "bg-red-500/20" },
  save: { icon: <Shield className="w-3.5 h-3.5" />, label: "Defesa", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  goal_conceded: { icon: <Goal className="w-3.5 h-3.5" />, label: "Gol Sofrido", color: "text-red-400", bgColor: "bg-red-500/20" },
  clean_sheet: { icon: <Shield className="w-3.5 h-3.5" />, label: "Clean Sheet", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  penalty_saved: { icon: <Shield className="w-3.5 h-3.5" />, label: "Pênalti Defendido", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  error_led_to_goal: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Erro → Gol", color: "text-red-400", bgColor: "bg-red-500/20" },
  box_save: { icon: <Shield className="w-3.5 h-3.5" />, label: "Defesa na Área", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  punch: { icon: <Shield className="w-3.5 h-3.5" />, label: "Soco", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  high_claim: { icon: <Shield className="w-3.5 h-3.5" />, label: "Bola Alta", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  sweeper_action: { icon: <Footprints className="w-3.5 h-3.5" />, label: "Saída do Gol", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  substitution: { icon: <ArrowRightLeft className="w-3.5 h-3.5" />, label: "Substituição", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  // Player presence events
  player_on: { icon: <ArrowUp className="w-3.5 h-3.5" />, label: "Entrou em Campo", color: "text-green-400", bgColor: "bg-green-500/20" },
  player_off: { icon: <ArrowDown className="w-3.5 h-3.5" />, label: "Saiu de Campo", color: "text-orange-400", bgColor: "bg-orange-500/20" },
};

interface EventTimelineProps {
  events: MatchEvent[];
  players: MatchPlayer[];
  onDeleteEvent: (eventId: string) => void;
  onVoidEvent?: (eventId: string, reason?: string) => Promise<void>;
  onEditEventTime?: (eventId: string, gameTimeSeconds: number) => Promise<void>;
  matchStatus?: "draft" | "live" | "finished" | "applied";
  maxGameTimeSeconds?: number;
}

export function EventTimeline({
  events,
  players,
  onDeleteEvent,
  onVoidEvent,
  onEditEventTime,
  matchStatus = "draft",
  maxGameTimeSeconds,
}: EventTimelineProps) {
  const [editTimeModalOpen, setEditTimeModalOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
  // Filter out voided events from the main view, but still show them with different style
  const { firstHalfEvents, secondHalfEvents, draftEvents, voidedEvents } = useMemo(() => {
    const first: MatchEvent[] = [];
    const second: MatchEvent[] = [];
    const draft: MatchEvent[] = [];
    const voided: MatchEvent[] = [];

    events.forEach((event) => {
      // Separate voided events
      if (event.event_status === "voided") {
        voided.push(event);
        return;
      }
      
      // Separate draft (pending) events
      if (event.event_status === "draft") {
        draft.push(event);
        return;
      }
      
      // Official events by half
      if (event.half === 2) {
        second.push(event);
      } else {
        first.push(event);
      }
    });

    const sortByCreatedAt = (a: MatchEvent, b: MatchEvent) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    return {
      firstHalfEvents: first.sort(sortByCreatedAt),
      secondHalfEvents: second.sort(sortByCreatedAt),
      draftEvents: draft.sort(sortByCreatedAt),
      voidedEvents: voided.sort(sortByCreatedAt),
    };
  }, [events]);

  const getPlayerName = (playerId: string) => {
    const mp = players.find((p) => p.player_id === playerId);
    return mp?.player?.full_name || "Jogador";
  };

  const getDisplayMinute = (event: MatchEvent) => {
    // Priority: display_minute from RPC, then compute from game_time_seconds
    if (event.display_minute) return event.display_minute;
    if (event.game_time_seconds != null && event.period) {
      return formatGameMinute(event.game_time_seconds, event.period);
    }
    if (event.game_time_seconds != null) {
      const mins = Math.floor(event.game_time_seconds / 60);
      return `${mins}'`;
    }
    if (event.minute != null) return `${event.minute}'`;
    return "—";
  };

  const openEditTimeModal = (event: MatchEvent) => {
    setSelectedEvent(event);
    setEditTimeModalOpen(true);
  };

  const openVoidDialog = (event: MatchEvent) => {
    setSelectedEvent(event);
    setVoidDialogOpen(true);
  };

  const handleEditTime = async (eventId: string, newGameTimeSeconds: number) => {
    await onEditEventTime?.(eventId, newGameTimeSeconds);
    setEditTimeModalOpen(false);
    setSelectedEvent(null);
  };

  const handleVoidEvent = async (eventId: string, reason?: string) => {
    await onVoidEvent?.(eventId, reason);
    setVoidDialogOpen(false);
    setSelectedEvent(null);
  };

  const renderEventItem = (event: MatchEvent, index: number, section?: "draft" | "voided") => {
    const config = eventConfig[event.event_type] || eventConfig.pass_total;
    const isSubstitution = event.event_type === "substitution";
    const isHighlight = ["goal", "assist", "save", "yellow", "red"].includes(event.event_type);
    const isDraft = event.event_status === "draft" || section === "draft";
    const isVoided = event.event_status === "voided" || section === "voided";

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          "relative flex items-start gap-3 py-3",
          index !== 0 && "border-t border-zinc-800/40",
          isDraft && "opacity-60 bg-amber-500/5 -mx-2 px-2 rounded-lg",
          isVoided && "opacity-40"
        )}
      >
        {/* Timeline dot */}
        <div className={cn(
          "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          config.bgColor
        )}>
          <span className={config.color}>{config.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge 
              variant="outline" 
              className={cn(
                "h-5 px-1.5 text-[10px] font-mono border-zinc-700 text-zinc-400",
                isDraft && "border-amber-500/50 text-amber-400"
              )}
            >
              {isDraft ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Pendente
                </span>
              ) : isVoided ? (
                <span className="line-through">Anulado</span>
              ) : (
                getDisplayMinute(event)
              )}
            </Badge>
            <span className={cn(
              "text-sm font-medium", 
              isHighlight && config.color,
              isVoided && "line-through text-zinc-600"
            )}>
              {config.label}
            </span>
            {isVoided && event.void_reason && (
              <span className="text-[10px] text-zinc-600 italic">
                ({event.void_reason})
              </span>
            )}
          </div>

          {isSubstitution ? (
            <div className={cn("text-xs space-y-0.5", isVoided && "line-through")}>
              <p className="text-red-400">
                ⬇️ {getPlayerName(event.player_id)} <span className="text-zinc-500">sai</span>
              </p>
              {event.player_in_id && (
                <p className="text-green-400">
                  ⬆️ {getPlayerName(event.player_in_id)} <span className="text-zinc-500">entra</span>
                </p>
              )}
            </div>
          ) : (
            <p className={cn("text-xs text-zinc-400 truncate", isVoided && "line-through text-zinc-600")}>
              {getPlayerName(event.player_id)}
            </p>
          )}

          <p className="text-[10px] text-zinc-600 mt-1">
            {format(new Date(event.created_at), "HH:mm:ss", { locale: ptBR })}
          </p>
        </div>

        {/* Action buttons */}
        {!isVoided && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              {/* Edit time - only for official events in live/finished status */}
              {event.event_status === "official" && onEditEventTime && (matchStatus === "live" || matchStatus === "finished") && (
                <DropdownMenuItem 
                  onClick={() => openEditTimeModal(event)}
                  className="gap-2 text-blue-400 focus:text-blue-400 focus:bg-blue-500/10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar tempo
                </DropdownMenuItem>
              )}
              
              {/* Void event - only for official events */}
              {event.event_status === "official" && onVoidEvent && (
                <DropdownMenuItem 
                  onClick={() => openVoidDialog(event)}
                  className="gap-2 text-amber-400 focus:text-amber-400 focus:bg-amber-500/10"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Anular evento
                </DropdownMenuItem>
              )}
              
              {/* Delete - only for draft events */}
              {event.event_status === "draft" && (
                <DropdownMenuItem 
                  onClick={() => onDeleteEvent(event.id)}
                  className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>
    );
  };

  const renderHalfSection = (halfEvents: MatchEvent[], halfNumber: 1 | 2) => {
    if (halfEvents.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 sticky top-0 bg-zinc-900 py-2 z-10">
          <Badge
            className={cn(
              "text-xs font-bold",
              halfNumber === 1 ? "bg-blue-600/80" : "bg-purple-600/80"
            )}
          >
            {halfNumber === 1 ? "1º Tempo" : "2º Tempo"}
          </Badge>
          <span className="text-xs text-zinc-500">
            {halfEvents.length} evento{halfEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div>
          {halfEvents.map((event, i) => renderEventItem(event, i))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Timeline</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-zinc-700">
              {events.length}
            </Badge>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md bg-zinc-900 border-zinc-800">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-zinc-100">
              <Clock className="w-5 h-5 text-zinc-400" />
              Timeline de Eventos
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3">
                  <List className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-400">Nenhum evento registrado</p>
                <p className="text-xs text-zinc-600 mt-1">Os eventos aparecerão aqui</p>
              </div>
            ) : (
              <>
                {/* Pending events section (pre-game) */}
                {draftEvents.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 sticky top-0 bg-zinc-900 py-2 z-10">
                      <Badge className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendentes
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        {draftEvents.length} evento{draftEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      {draftEvents.map((event, i) => renderEventItem(event, i, "draft"))}
                    </div>
                  </div>
                )}
                
                {renderHalfSection(secondHalfEvents, 2)}
                {renderHalfSection(firstHalfEvents, 1)}
                
                {/* Voided events section */}
                {voidedEvents.length > 0 && (
                  <div className="mb-6 mt-8 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="text-xs font-bold bg-zinc-700/60 text-zinc-500">
                        Anulados
                      </Badge>
                      <span className="text-xs text-zinc-600">
                        {voidedEvents.length} evento{voidedEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      {voidedEvents.map((event, i) => renderEventItem(event, i, "voided"))}
                    </div>
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit event time modal */}
      {selectedEvent && (
        <EditEventTimeModal
          isOpen={editTimeModalOpen}
          onClose={() => {
            setEditTimeModalOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventType={eventConfig[selectedEvent.event_type]?.label || selectedEvent.event_type}
          currentGameTimeSeconds={selectedEvent.game_time_seconds}
          maxGameTimeSeconds={maxGameTimeSeconds}
          onSave={handleEditTime}
        />
      )}

      {/* Void event dialog */}
      {selectedEvent && (
        <VoidEventDialog
          isOpen={voidDialogOpen}
          onClose={() => {
            setVoidDialogOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventType={eventConfig[selectedEvent.event_type]?.label || selectedEvent.event_type}
          playerName={getPlayerName(selectedEvent.player_id)}
          onConfirm={handleVoidEvent}
        />
      )}
    </>
  );
}
