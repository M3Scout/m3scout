import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MatchPlayer, MatchEventType, MatchStatus } from "@/hooks/useLiveMatch";
import { Plus, Undo2, ChevronDown, ChevronUp, LogIn, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound, getSoundForEvent } from "@/lib/sounds";
import { PlayerNotesModal } from "./PlayerNotesModal";
import { PlayerHistoryComparison } from "./PlayerHistoryComparison";

// Stat categories configuration with colors
const OUTFIELD_STATS: { category: string; color: string; bgColor: string; stats: { type: MatchEventType; label: string }[] }[] = [
  {
    category: "ATA",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    stats: [
      { type: "goal", label: "Gols" },
      { type: "assist", label: "Assist." },
      { type: "shot", label: "Chutes" },
      { type: "shot_on_target", label: "Chutes Gol" },
    ],
  },
  {
    category: "CRI",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { type: "key_pass", label: "Passes Dec." },
      { type: "chance_created", label: "Chances" },
      { type: "dribble_success", label: "Dribles ✓" },
      { type: "dribble_attempt", label: "Dribles Tot." },
    ],
  },
  {
    category: "DEF",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interc." },
      { type: "recovery", label: "Recup." },
      { type: "duel_won", label: "Duelos ✓" },
      { type: "duel_total", label: "Duelos Tot." },
      { type: "aerial_duel_won", label: "Aéreos ✓" },
      { type: "clearance", label: "Cortes" },
    ],
  },
  {
    category: "TÁT",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    stats: [
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
      { type: "foul_committed", label: "Faltas Com." },
      { type: "foul_suffered", label: "Faltas Sof." },
      { type: "pass_success", label: "Passes ✓" },
      { type: "pass_total", label: "Passes Tot." },
      { type: "possession_lost", label: "Bolas Perd." },
    ],
  },
];

const GOALKEEPER_STATS: { category: string; color: string; bgColor: string; stats: { type: MatchEventType; label: string }[] }[] = [
  {
    category: "GK",
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    stats: [
      { type: "save", label: "Defesas" },
      { type: "goal_conceded", label: "Gols Sof." },
      { type: "clean_sheet", label: "Clean Sheet" },
      { type: "penalty_saved", label: "Pên. Def." },
      { type: "error_led_to_goal", label: "Erros→Gol" },
    ],
  },
  {
    category: "GK Avançado",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { type: "box_save", label: "Def. Área" },
      { type: "punch", label: "Socos" },
      { type: "high_claim", label: "Bolas Altas" },
      { type: "sweeper_action", label: "Saídas Gol" },
    ],
  },
];

interface PlayerStatCardProps {
  matchPlayer: MatchPlayer;
  eventCounts: Record<MatchEventType, number>;
  matchStatus: MatchStatus;
  currentMinute?: number;
  currentMatchId?: string;
  onAddEvent: (eventType: MatchEventType) => void;
  onUndo: () => void;
  onPlayerEnter?: (minute: number) => void;
  onPlayerExit?: (minute: number) => void;
  onRemovePlayer?: () => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  disabled?: boolean;
  soundEnabled?: boolean;
}

export function PlayerStatCard({
  matchPlayer,
  eventCounts,
  matchStatus,
  currentMinute = 0,
  currentMatchId,
  onAddEvent,
  onUndo,
  onPlayerEnter,
  onPlayerExit,
  onRemovePlayer,
  onSaveNotes,
  disabled,
  soundEnabled = true,
}: PlayerStatCardProps) {
  const [expanded, setExpanded] = useState(true);
  const touchStartX = useRef<number | null>(null);

  // Wrapper to play sound on event
  const handleAddEventWithSound = (eventType: MatchEventType) => {
    if (soundEnabled) {
      playSound(getSoundForEvent(eventType));
    }
    onAddEvent(eventType);
  };

  const isGK = matchPlayer.position_template === "goalkeeper";
  const stats = isGK ? GOALKEEPER_STATS : OUTFIELD_STATS;
  const player = matchPlayer.player;
  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";

  if (!player) return null;

  // Swipe handling - only works during live game
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLive) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isLive || touchStartX.current === null) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 80;

    if (deltaX > threshold) {
      // Swipe right: add default stat (tackle for outfield, save for GK)
      handleAddEventWithSound(isGK ? "save" : "tackle");
    } else if (deltaX < -threshold) {
      // Swipe left: undo
      onUndo();
    }

    touchStartX.current = null;
  };

  const getCount = (type: MatchEventType) => eventCounts[type] || 0;

  // Calculate totals for header
  const totalGoals = getCount("goal");
  const totalAssists = getCount("assist");

  // Handle player entry/exit with sounds
  const handleEnterField = () => {
    if (soundEnabled) {
      playSound('enter');
    }
    onPlayerEnter?.(currentMinute);
  };

  const handleExitField = () => {
    if (soundEnabled) {
      playSound('exit');
    }
    onPlayerExit?.(currentMinute);
  };

  return (
    <Card
      className={cn(
        "transition-all overflow-hidden",
        !matchPlayer.is_on_field && !isDraft && "opacity-60",
        disabled && "pointer-events-none"
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader className="pb-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={player.photo_url || undefined} />
              <AvatarFallback className="font-bold text-sm">
                {player.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{player.full_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {player.position}
                </Badge>
                {matchPlayer.started && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Titular
                  </Badge>
                )}
                {/* Show on-field status only during/after live */}
                {!isDraft && (
                  matchPlayer.is_on_field ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">
                      Em Campo
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {matchPlayer.exited_minute !== null 
                        ? `Saiu ${matchPlayer.exited_minute}' (${matchPlayer.exited_minute <= 45 ? '1ºT' : '2ºT'})`
                        : "Banco"}
                    </Badge>
                  )
                )}
                {/* Show entered minute with half indicator if substitute entered */}
                {!isDraft && !matchPlayer.started && matchPlayer.entered_minute !== null && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-500">
                    Entrou {matchPlayer.entered_minute}' ({matchPlayer.entered_minute <= 45 ? '1ºT' : '2ºT'})
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Quick stats */}
            {!isGK && (totalGoals > 0 || totalAssists > 0) && (
              <div className="flex items-center gap-1 mr-2">
                {totalGoals > 0 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    ⚽ {totalGoals}
                  </Badge>
                )}
                {totalAssists > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    🅰️ {totalAssists}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Entry/Exit buttons - only during live game */}
            {isLive && (
              <>
                {!matchPlayer.is_on_field && matchPlayer.exited_minute === null && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 px-2 bg-green-600 hover:bg-green-700"
                    onClick={handleEnterField}
                    title="Entrou em campo"
                  >
                    <LogIn className="h-3 w-3 mr-1" />
                    Entrar
                  </Button>
                )}
                {matchPlayer.is_on_field && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                    onClick={handleExitField}
                    title="Saiu de campo"
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Sair
                  </Button>
                )}
              </>
            )}

            {/* Remove player button - only during draft (pre-game) with confirmation */}
            {isDraft && onRemovePlayer && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Remover da escalação"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover jogador?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover <strong>{player.full_name}</strong> da escalação?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onRemovePlayer}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Notes button */}
            {onSaveNotes && (
              <PlayerNotesModal
                matchPlayer={matchPlayer}
                onSaveNotes={onSaveNotes}
                disabled={disabled}
              />
            )}

            {/* History comparison button */}
            <PlayerHistoryComparison
              playerId={matchPlayer.player_id}
              playerName={player.full_name}
              currentMatchId={currentMatchId}
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onUndo}
              title="Desfazer último"
              disabled={isDraft}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-3 space-y-3">
          {/* Pre-game message */}
          {isDraft && (
            <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-2">
              📋 Inicie o jogo para registrar estatísticas
            </p>
          )}

          {/* Stats - disabled during draft */}
          <div className={cn(isDraft && "opacity-50 pointer-events-none")}>
            {stats.map((category) => (
              <div 
                key={category.category}
                className={cn(
                  "rounded-lg border p-2 mb-2",
                  category.bgColor
                )}
              >
                <p className={cn(
                  "text-xs font-semibold mb-2 uppercase tracking-wide",
                  category.color
                )}>
                  {category.category}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                    {category.stats.map((stat) => (
                      <StatButton
                        key={stat.type}
                        label={stat.label}
                        count={getCount(stat.type)}
                        onClick={() => handleAddEventWithSound(stat.type)}
                        disabled={disabled || isDraft || !matchPlayer.is_on_field}
                        highlight={stat.type === "goal" || stat.type === "assist" || stat.type === "save"}
                        categoryColor={category.color}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface StatButtonProps {
  label: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
  categoryColor?: string;
}

function StatButton({ label, count, onClick, disabled, highlight, categoryColor }: StatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center p-2 rounded-md border border-border/50 transition-all bg-background/50",
        "hover:bg-background hover:border-primary/50 active:scale-95",
        "disabled:opacity-50 disabled:pointer-events-none",
        highlight && count > 0 && "border-green-500/50 bg-green-500/10"
      )}
    >
      <span className={cn(
        "text-lg font-bold",
        count > 0 && categoryColor
      )}>
        {count}
      </span>
      <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-1">
        {label}
      </span>
      <Plus className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-muted-foreground/50" />
    </button>
  );
}
