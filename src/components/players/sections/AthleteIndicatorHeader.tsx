import { 
  Star, 
  Gamepad2, 
  Clock, 
  Zap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AthleteIndicatorHeaderProps {
  playerId: string;
  playerPosition?: string; // Needed for GK detection in rating calc
  physicalStatus: string | null;
  playStyle: string | null;
  primaryTacticalRole?: string | null;
  secondaryTacticalRole?: string | null;
  seasonYear?: number;
}

// Physical status configuration
const PHYSICAL_STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  dotColor: string;
}> = {
  fit: { 
    label: "APTO", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/10", 
    borderColor: "border-emerald-500/20",
    dotColor: "bg-emerald-400"
  },
  attention: { 
    label: "EM TRANSIÇÃO", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/10", 
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-400"
  },
  recovering: { 
    label: "EM TRANSIÇÃO", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/10", 
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-400"
  },
  injured: { 
    label: "INAPTO", 
    color: "text-rose-400", 
    bgColor: "bg-rose-500/10", 
    borderColor: "border-rose-500/20",
    dotColor: "bg-rose-400"
  },
};

const DEFAULT_PHYSICAL_STATUS = {
  label: "N/I",
  color: "text-zinc-400",
  bgColor: "bg-zinc-800/50",
  borderColor: "border-zinc-700/30",
  dotColor: "bg-zinc-400"
};

// Format minutes for display
function formatMinutes(minutes: number): string {
  if (minutes >= 1000) {
    return `${(minutes / 1000).toFixed(1)}k`;
  }
  return minutes.toString();
}

// Format rating for display
function formatRating(rating: number): string {
  return rating.toFixed(1);
}

// Individual indicator card component
interface IndicatorCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tooltip?: string;
  variant?: "default" | "highlight";
  className?: string;
}

function IndicatorCard({ 
  label, 
  value, 
  icon: Icon, 
  tooltip,
  variant = "default",
  className 
}: IndicatorCardProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg",
        "bg-zinc-900/60 border border-zinc-800/50",
        "min-w-[64px] h-[64px]",
        "transition-all duration-200 animate-fade-in",
        "hover:border-zinc-700/60 hover:bg-zinc-900/80",
        variant === "highlight" && "border-zinc-700/40 bg-zinc-800/40",
        className
      )}
    >
      {/* Icon + Value row */}
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-base font-semibold text-zinc-200 leading-none">
          {value}
        </span>
      </div>
      {/* Label */}
      <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </span>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="bg-zinc-900 border-zinc-700 text-zinc-300 text-xs"
          >
            <p className="flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              {tooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Physical status pill component
interface PhysicalStatusPillProps {
  status: string | null;
}

function PhysicalStatusPill({ status }: PhysicalStatusPillProps) {
  const statusKey = status?.toLowerCase() || "";
  const config = PHYSICAL_STATUS_CONFIG[statusKey] || DEFAULT_PHYSICAL_STATUS;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg",
        "border animate-fade-in",
        "min-h-[64px]",
        "transition-all duration-200",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Status dot */}
      <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
      {/* Label */}
      <div className="flex flex-col">
        <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          FÍSICO
        </span>
        <span className={cn("text-sm font-semibold uppercase tracking-wide", config.color)}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

// Play style pill component
interface PlayStylePillProps {
  playStyle: string | null;
  primaryRole?: string | null;
  secondaryRole?: string | null;
}

function PlayStylePill({ playStyle, primaryRole, secondaryRole }: PlayStylePillProps) {
  const hasStyle = Boolean(playStyle);
  const roles = [primaryRole, secondaryRole].filter(Boolean).slice(0, 2);

  if (!hasStyle && roles.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg animate-fade-in",
          "bg-zinc-900/60 border border-zinc-800/50",
          "min-h-[64px]"
        )}
      >
        <Zap className="w-3.5 h-3.5 text-zinc-600" />
        <div className="flex flex-col">
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            ESTILO
          </span>
          <span className="text-sm text-zinc-600">—</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 rounded-lg animate-fade-in",
        "bg-zinc-900/60 border border-zinc-800/50",
        "min-h-[64px]",
        "transition-all duration-200",
        "hover:border-zinc-700/60"
      )}
    >
      <Zap className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          ESTILO
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Main style */}
          {playStyle && (
            <span className="text-xs font-medium text-zinc-200 px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/30">
              {playStyle}
            </span>
          )}
          {/* Sub-tags (roles) */}
          {roles.map((role, index) => (
            <span 
              key={index}
              className="text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800/40 border border-zinc-700/20"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * AthleteIndicatorHeader
 * 
 * Uses the same data source as MatchRatingEvolutionChart (usePlayerMatchRatings)
 * to ensure NOTA, JOGOS, and MINUTOS are perfectly synchronized.
 */
export function AthleteIndicatorHeader({
  playerId,
  playerPosition,
  physicalStatus,
  playStyle,
  primaryTacticalRole,
  secondaryTacticalRole,
  seasonYear = new Date().getFullYear(),
}: AthleteIndicatorHeaderProps) {
  // Use the SAME hook as MatchRatingEvolutionChart to ensure data consistency
  const {
    matches,
    averageRating,
    totals,
    isLoading,
  } = usePlayerMatchRatings({
    playerId,
    playerPosition,
    seasonYear,
  });

  // Count only matches with rating (same as chartData.length in MatchRatingEvolutionChart)
  const ratedMatchesCount = matches.filter((m) => m.rating.hasRating).length;
  
  // Total minutes from the period
  const minutes = totals?.minutes ?? 0;

  // Determine rating display: show averageRating if there are rated matches
  const showRating = ratedMatchesCount > 0 && averageRating !== null;
  const ratingDisplay = showRating ? formatRating(averageRating) : "—";

  // Debug log for validation (can be removed in production)
  if (import.meta.env.DEV) {
    console.log("[AthleteIndicatorHeader] Data sync check:", {
      seasonYear,
      averageRating,
      ratedMatchesCount,
      minutes,
      totalMatches: matches.length,
    });
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto scrollbar-hide",
        "-mx-1 px-1" // Slight padding for scroll shadow
      )}
    >
      <div className={cn(
        "flex items-stretch gap-2",
        "min-w-max py-1" // Ensures horizontal scroll on mobile
      )}>
        {/* 1. NOTA - Average rating from matches with rating */}
        <IndicatorCard
          label="NOTA"
          value={ratingDisplay}
          icon={Star}
          tooltip="Nota baseada apenas no período selecionado"
        />

        {/* 2. JOGOS - Count of matches with rating */}
        <IndicatorCard
          label="JOGOS"
          value={ratedMatchesCount}
          icon={Gamepad2}
        />

        {/* 3. MINUTOS - Total minutes in period */}
        <IndicatorCard
          label="MINUTOS"
          value={formatMinutes(minutes)}
          icon={Clock}
        />

        {/* 4. FÍSICO (highlighted) */}
        <PhysicalStatusPill status={physicalStatus} />

        {/* 5. ESTILO DE JOGO */}
        <PlayStylePill 
          playStyle={playStyle}
          primaryRole={primaryTacticalRole}
          secondaryRole={secondaryTacticalRole}
        />
      </div>
    </div>
  );
}
