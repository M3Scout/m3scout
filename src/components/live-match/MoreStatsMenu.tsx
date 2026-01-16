import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchEventType, MatchStatus } from "@/hooks/useLiveMatch";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Target, Zap, Shield, AlertTriangle,
  Goal, X, Crosshair, ArrowRight, Footprints, Hand,
  UserX, Flag, Square, CircleX, ArrowUpRight,
  ShieldCheck, RotateCcw, Ban, Users, Clock,
  HandHelping, CircleOff, TriangleAlert
} from "lucide-react";

// Stat event configuration - easily extendable
export interface StatEvent {
  type: MatchEventType;
  label: string;
  category: "attack" | "passing" | "defense" | "discipline" | "goalkeeper";
  icon: React.ReactNode;
  description?: string;
  requiresGoalkeeper?: boolean;
  aliases?: string[]; // for search
}

export const STAT_EVENTS: StatEvent[] = [
  // Attack
  { type: "goal", label: "Gol", category: "attack", icon: <Goal className="w-4 h-4" />, aliases: ["gol", "goal", "marcar"] },
  { type: "assist", label: "Assistência", category: "attack", icon: <HandHelping className="w-4 h-4" />, aliases: ["assist", "passe gol"] },
  { type: "shot_on_target", label: "Finalização no gol", category: "attack", icon: <Target className="w-4 h-4" />, description: "Chute ao gol", aliases: ["chute", "finalizacao"] },
  { type: "shot", label: "Finalização para fora", category: "attack", icon: <Crosshair className="w-4 h-4" />, description: "Chute que não foi no gol", aliases: ["chute fora"] },
  { type: "chance_created", label: "Chance criada", category: "attack", icon: <Zap className="w-4 h-4" />, description: "Criou oportunidade clara", aliases: ["chance", "oportunidade"] },
  { type: "dribble_success", label: "Drible certo", category: "attack", icon: <Footprints className="w-4 h-4" />, aliases: ["drible", "finta"] },
  { type: "dribble_attempt", label: "Tentativa de drible", category: "attack", icon: <Footprints className="w-4 h-4" />, description: "Drible tentado (perdido)", aliases: ["drible errado"] },
  { type: "foul_suffered", label: "Falta sofrida", category: "attack", icon: <UserX className="w-4 h-4" />, aliases: ["sofreu falta"] },
  
  // Passing / Creation
  { type: "pass_success", label: "Passe certo", category: "passing", icon: <ArrowRight className="w-4 h-4" />, aliases: ["passe", "acerto"] },
  { type: "pass_total", label: "Passe tentado", category: "passing", icon: <ArrowRight className="w-4 h-4" />, description: "Qualquer tentativa de passe", aliases: ["passe errado", "tentativa"] },
  { type: "key_pass", label: "Passe decisivo", category: "passing", icon: <ArrowUpRight className="w-4 h-4" />, description: "Passe que gerou finalização", aliases: ["passe chave", "key pass"] },
  
  // Defense
  { type: "tackle", label: "Desarme", category: "defense", icon: <Shield className="w-4 h-4" />, aliases: ["tackle", "roubo"] },
  { type: "interception", label: "Interceptação", category: "defense", icon: <ShieldCheck className="w-4 h-4" />, aliases: ["intercept", "corte passe"] },
  { type: "recovery", label: "Recuperação", category: "defense", icon: <RotateCcw className="w-4 h-4" />, description: "Recuperou a posse", aliases: ["recover", "recupera"] },
  { type: "clearance", label: "Corte/Afastamento", category: "defense", icon: <Ban className="w-4 h-4" />, aliases: ["clear", "afasta"] },
  { type: "duel_won", label: "Duelo ganho", category: "defense", icon: <Users className="w-4 h-4" />, aliases: ["duelo", "1x1 ganho"] },
  { type: "duel_total", label: "Duelo perdido", category: "defense", icon: <Users className="w-4 h-4" />, description: "Perdeu disputa individual", aliases: ["duelo perdido"] },
  { type: "aerial_duel_won", label: "Duelo aéreo ganho", category: "defense", icon: <ArrowUpRight className="w-4 h-4" />, aliases: ["aereo", "cabeca"] },
  { type: "foul_committed", label: "Falta cometida", category: "defense", icon: <AlertTriangle className="w-4 h-4" />, aliases: ["falta", "infração"] },
  { type: "possession_lost", label: "Posse perdida", category: "defense", icon: <CircleOff className="w-4 h-4" />, aliases: ["perda", "entrega"] },
  
  // Discipline
  { type: "yellow", label: "Cartão amarelo", category: "discipline", icon: <Square className="w-4 h-4 fill-yellow-400 text-yellow-400" />, aliases: ["amarelo", "advertencia"] },
  { type: "red", label: "Cartão vermelho", category: "discipline", icon: <Square className="w-4 h-4 fill-red-500 text-red-500" />, aliases: ["vermelho", "expulsao"] },
  
  // Goalkeeper
  { type: "save", label: "Defesa", category: "goalkeeper", icon: <Hand className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["defesa", "pegou"] },
  { type: "box_save", label: "Defesa difícil", category: "goalkeeper", icon: <Hand className="w-4 h-4" />, requiresGoalkeeper: true, description: "Defesa de alta dificuldade", aliases: ["defesaça", "milagre"] },
  { type: "goal_conceded", label: "Gol sofrido", category: "goalkeeper", icon: <CircleX className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["tomou gol", "sofreu gol"] },
  { type: "high_claim", label: "Saída de gol (alta)", category: "goalkeeper", icon: <ArrowUpRight className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["cruzamento", "bola alta"] },
  { type: "sweeper_action", label: "Saída do gol", category: "goalkeeper", icon: <Footprints className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["saida", "libero"] },
  { type: "punch", label: "Soco/Defesa de punho", category: "goalkeeper", icon: <Hand className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["soco", "punho"] },
  { type: "penalty_saved", label: "Pênalti defendido", category: "goalkeeper", icon: <Shield className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["penalti", "penalty"] },
  { type: "error_led_to_goal", label: "Erro levou a gol", category: "goalkeeper", icon: <TriangleAlert className="w-4 h-4" />, requiresGoalkeeper: true, aliases: ["erro", "falha"] },
];

const CATEGORY_CONFIG = {
  attack: { label: "Ataque", icon: <Target className="w-4 h-4" />, color: "text-emerald-400" },
  passing: { label: "Passe", icon: <ArrowRight className="w-4 h-4" />, color: "text-blue-400" },
  defense: { label: "Defesa", icon: <Shield className="w-4 h-4" />, color: "text-cyan-400" },
  discipline: { label: "Disciplina", icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-400" },
  goalkeeper: { label: "Goleiro", icon: <Hand className="w-4 h-4" />, color: "text-purple-400" },
} as const;

interface MoreStatsMenuProps {
  matchStatus: MatchStatus;
  clockStatus: "stopped" | "running" | "paused";
  isGoalkeeper: boolean;
  isOnField: boolean;
  eventCounts: Record<MatchEventType, number>;
  onAddEvent: (eventType: MatchEventType) => void;
  onVoidLastEvent?: () => void;
  disabled?: boolean;
}

export function MoreStatsMenu({
  matchStatus,
  clockStatus,
  isGoalkeeper,
  isOnField,
  eventCounts,
  onAddEvent,
  disabled,
}: MoreStatsMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("attack");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAddedEventId, setLastAddedEventId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isPaused = clockStatus === "paused";
  const canAddEvents = (isLive && clockStatus === "running" && isOnField) || isDraft;

  // Filter events based on search and goalkeeper status
  const filteredEvents = useMemo(() => {
    let events = STAT_EVENTS;
    
    // Filter goalkeeper-specific events
    if (!isGoalkeeper) {
      events = events.filter(e => !e.requiresGoalkeeper);
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      events = events.filter(e => 
        e.label.toLowerCase().includes(searchLower) ||
        e.type.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.aliases?.some(a => a.toLowerCase().includes(searchLower))
      );
    }
    
    return events;
  }, [search, isGoalkeeper]);

  // Group by category
  const groupedEvents = useMemo(() => {
    const groups: Record<string, StatEvent[]> = {};
    for (const event of filteredEvents) {
      if (!groups[event.category]) {
        groups[event.category] = [];
      }
      groups[event.category].push(event);
    }
    return groups;
  }, [filteredEvents]);

  // Handle event click with debounce
  const handleEventClick = useCallback(async (event: StatEvent) => {
    if (isSubmitting || disabled) return;
    
    // Check if player is on field (only for live matches)
    if (isLive && !isOnField) {
      toast.error("Atleta fora de campo", {
        description: "Este jogador não está em campo para registrar eventos.",
      });
      return;
    }

    // Check if paused
    if (isLive && isPaused) {
      toast.warning("Jogo pausado", {
        description: "Retome o jogo para registrar eventos.",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      onAddEvent(event.type);
      
      const eventId = `${event.type}-${Date.now()}`;
      setLastAddedEventId(eventId);
      
      // Success toast with undo option
      toast.success(`${event.label} registrado`, {
        description: isDraft ? "Evento pendente (será contado ao iniciar)" : undefined,
        action: {
          label: "Desfazer",
          onClick: () => {
            // The undo is handled by the parent via onUndo
            toast.info("Use o menu do jogador para desfazer");
          },
        },
        duration: 5000,
      });
      
      // Close menu on mobile after selection
      if (isMobile) {
        setOpen(false);
      }
    } finally {
      // Debounce: wait 300ms before allowing another click
      setTimeout(() => {
        setIsSubmitting(false);
      }, 300);
    }
  }, [isSubmitting, disabled, isLive, isOnField, isPaused, isDraft, onAddEvent, isMobile]);

  const getCount = (type: MatchEventType) => eventCounts[type] || 0;

  const renderContent = () => (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar estatística..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700 focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Status message */}
      {!canAddEvents && (
        <div className={cn(
          "mx-3 mt-3 p-2 rounded-lg text-xs text-center",
          isPaused && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          isDraft && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
          !isOnField && isLive && "bg-red-500/10 text-red-400 border border-red-500/20"
        )}>
          {isPaused && "⏸️ Jogo pausado — retome para registrar"}
          {isDraft && "📋 Eventos serão pendentes até iniciar"}
          {!isOnField && isLive && "⚠️ Jogador fora de campo"}
        </div>
      )}

      {/* Tabs for categories */}
      {search ? (
        // Show all search results
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">
                Nenhuma estatística encontrada
              </p>
            ) : (
              filteredEvents.map((event) => (
                <EventButton
                  key={event.type}
                  event={event}
                  count={getCount(event.type)}
                  onClick={() => handleEventClick(event)}
                  disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-3 mt-3 bg-zinc-800/50 p-1 h-auto flex-wrap">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              // Hide goalkeeper tab if not a goalkeeper
              if (key === "goalkeeper" && !isGoalkeeper) return null;
              
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={cn(
                    "flex-1 min-w-[60px] gap-1 text-xs py-1.5 data-[state=active]:bg-zinc-700",
                    config.color
                  )}
                >
                  {config.icon}
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            if (key === "goalkeeper" && !isGoalkeeper) return null;
            
            return (
              <TabsContent key={key} value={key} className="flex-1 m-0">
                <ScrollArea className="h-[300px] p-3">
                  <div className="space-y-2">
                    {groupedEvents[key]?.map((event) => (
                      <EventButton
                        key={event.type}
                        event={event}
                        count={getCount(event.type)}
                        onClick={() => handleEventClick(event)}
                        disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                      />
                    ))}
                    {(!groupedEvents[key] || groupedEvents[key].length === 0) && (
                      <p className="text-center text-zinc-500 py-8">
                        Nenhuma estatística nesta categoria
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 px-3 gap-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      disabled={disabled}
    >
      <Plus className="w-4 h-4" />
      <span className="text-xs">Mais</span>
    </Button>
  );

  // Use Drawer for mobile, Popover for desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="bg-zinc-900 border-zinc-800 max-h-[85vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="flex items-center gap-2 text-zinc-100">
              <Zap className="w-5 h-5 text-emerald-400" />
              Registrar Estatística
            </DrawerTitle>
          </DrawerHeader>
          {renderContent()}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent 
        className="w-[360px] p-0 bg-zinc-900 border-zinc-800"
        align="start"
        side="bottom"
      >
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-zinc-100">Registrar Estatística</h3>
        </div>
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
}

// Individual event button component
interface EventButtonProps {
  event: StatEvent;
  count: number;
  onClick: () => void;
  disabled?: boolean;
}

function EventButton({ event, count, onClick, disabled }: EventButtonProps) {
  const categoryConfig = CATEGORY_CONFIG[event.category];
  
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-800/50",
        "group"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center",
        "bg-zinc-700/50 group-hover:bg-zinc-700 transition-colors",
        categoryConfig.color
      )}>
        {event.icon}
      </div>
      
      <div className="flex-1 text-left">
        <p className="font-medium text-sm text-zinc-200">{event.label}</p>
        {event.description && (
          <p className="text-[11px] text-zinc-500">{event.description}</p>
        )}
      </div>
      
      {count > 0 && (
        <Badge className="bg-zinc-700 text-zinc-200 text-xs">
          {count}
        </Badge>
      )}
    </motion.button>
  );
}
