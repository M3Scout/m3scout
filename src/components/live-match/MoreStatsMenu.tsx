import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchEventType, MatchStatus } from "@/hooks/useLiveMatch";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Search, Zap, X } from "lucide-react";
import {
  LIVE_EVENT_ACTIONS,
  EVENT_GROUPS,
  GROUP_ORDER,
  filterEventsByPlayerType,
  groupEventsByCategory,
  searchEvents,
  type LiveEventAction,
  type EventGroup,
} from "@/lib/liveEventActions";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isPaused = clockStatus === "paused";
  const canAddEvents = (isLive && clockStatus === "running" && isOnField) || isDraft;

  // Filter events based on player type (goalkeeper or outfield)
  const playerEvents = useMemo(
    () => filterEventsByPlayerType(isGoalkeeper),
    [isGoalkeeper]
  );

  // Search within filtered events
  const filteredEvents = useMemo(
    () => searchEvents(playerEvents, search),
    [playerEvents, search]
  );

  // Group by category
  const groupedEvents = useMemo(
    () => groupEventsByCategory(filteredEvents),
    [filteredEvents]
  );

  // Handle event click with debounce
  const handleEventClick = useCallback(
    async (event: LiveEventAction) => {
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
        onAddEvent(event.type as MatchEventType);

        // Success toast with undo option
        toast.success(`${event.label} registrado`, {
          description: isDraft ? "Evento pendente (será contado ao iniciar)" : undefined,
          action: {
            label: "Desfazer",
            onClick: () => {
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
    },
    [isSubmitting, disabled, isLive, isOnField, isPaused, isDraft, onAddEvent, isMobile]
  );

  const getCount = (type: string) => eventCounts[type as MatchEventType] || 0;

  // Render individual event button
  const renderEventButton = (event: LiveEventAction) => {
    const count = getCount(event.type);
    const groupConfig = EVENT_GROUPS[event.group];
    const IconComponent = event.icon;

    return (
      <motion.button
        key={event.key}
        whileHover={{ scale: disabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={() => handleEventClick(event)}
        disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
          "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-800/50",
          "group min-h-[52px]"
        )}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            "bg-zinc-700/50 group-hover:bg-zinc-700 transition-colors",
            groupConfig.color
          )}
        >
          <IconComponent className={cn("w-4 h-4", event.iconClassName)} />
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="font-medium text-sm text-zinc-200 truncate">{event.label}</p>
          {event.description && (
            <p className="text-[11px] text-zinc-500 truncate">{event.description}</p>
          )}
        </div>

        {count > 0 && (
          <Badge className="bg-zinc-700 text-zinc-200 text-xs shrink-0">{count}</Badge>
        )}
      </motion.button>
    );
  };

  // Render category section with header
  const renderCategorySection = (group: EventGroup) => {
    const events = groupedEvents[group];
    if (!events || events.length === 0) return null;

    const config = EVENT_GROUPS[group];

    return (
      <div key={group} className="mb-4 last:mb-0">
        {/* Category header */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", config.color)}>
            {config.label}
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Events grid */}
        <div className={cn(
          "grid gap-2",
          // 2 cols mobile, 2 cols tablet, 1 col on search results
          isMobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}>
          {events.map(renderEventButton)}
        </div>
      </div>
    );
  };

  const renderContent = () => (
    <div className="flex flex-col h-full max-h-[75vh]">
      {/* Search */}
      <div className="p-3 border-b border-zinc-800 shrink-0">
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
        <div
          className={cn(
            "mx-3 mt-3 p-2 rounded-lg text-xs text-center shrink-0",
            isPaused && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
            isDraft && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            !isOnField && isLive && "bg-red-500/10 text-red-400 border border-red-500/20"
          )}
        >
          {isPaused && "⏸️ Jogo pausado — retome para registrar"}
          {isDraft && "📋 Eventos serão pendentes até iniciar"}
          {!isOnField && isLive && "⚠️ Jogador fora de campo"}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 p-3">
        {search.trim() ? (
          // Search results - flat list
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">Nenhuma estatística encontrada</p>
            ) : (
              filteredEvents.map(renderEventButton)
            )}
          </div>
        ) : (
          // Categorized view
          <div>
            {GROUP_ORDER.map((group) => {
              // Skip goalkeeper group if not goalkeeper
              if (group === "goalkeeper" && !isGoalkeeper) return null;
              return renderCategorySection(group);
            })}
          </div>
        )}
      </ScrollArea>
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
          <DrawerHeader className="pb-0 flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2 text-zinc-100">
              <Zap className="w-5 h-5 text-emerald-400" />
              Adicionar estatística
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <X className="w-4 h-4 text-zinc-400" />
              </Button>
            </DrawerClose>
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
        className="w-[380px] p-0 bg-zinc-900 border-zinc-800"
        align="start"
        side="bottom"
      >
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-zinc-100">Adicionar estatística</h3>
        </div>
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
}

// Re-export for backwards compatibility
export { LIVE_EVENT_ACTIONS, EVENT_GROUPS } from "@/lib/liveEventActions";
