import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Plus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPositionColor, getShortPosition, getPositionCategory, type PositionCategory } from "@/lib/positionColors";
import { getPositionGroup, type PositionGroup } from "@/lib/positionUtils";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
  is_archived?: boolean | null;
  height?: number | null;
  dominant_foot?: string | null;
}

interface PlayerWithStats extends Player {
  stats?: Array<{
    goals?: number;
    assists?: number;
    tackles?: number;
    interceptions?: number;
    minutes?: number;
  }>;
  aggregatedStats?: {
    goals?: number;
    assists?: number;
    tackles?: number;
    interceptions?: number;
    recoveries?: number;
    minutes?: number;
  } | null;
}

interface SimilarPlayerSuggestionsProps {
  selectedPlayers: PlayerWithStats[];
  allPlayers: Player[];
  onSelectPlayer: (player: Player) => void;
  maxSuggestions?: number;
}

// Position compatibility mapping - which positions can be meaningfully compared
const COMPATIBLE_POSITION_GROUPS: Record<PositionGroup, PositionGroup[]> = {
  goalkeeper: ['goalkeeper'],
  center_back: ['center_back', 'defensive_mid'],
  defensive_mid: ['defensive_mid', 'center_back', 'midfielder'],
  midfielder: ['midfielder', 'defensive_mid', 'forward'],
  forward: ['forward', 'midfielder'],
};

// Position category compatibility for visual grouping
const COMPATIBLE_CATEGORIES: Record<PositionCategory, PositionCategory[]> = {
  goalkeeper: ['goalkeeper'],
  defender: ['defender', 'fullback'],
  fullback: ['fullback', 'defender', 'winger'],
  midfielder_defensive: ['midfielder_defensive', 'defender', 'midfielder'],
  midfielder: ['midfielder', 'midfielder_defensive', 'winger'],
  winger: ['winger', 'midfielder', 'forward'],
  forward: ['forward', 'winger'],
};

interface SimilarityScore {
  player: Player;
  score: number;
  reasons: string[];
}

function calculateSimilarity(
  referencePlayer: PlayerWithStats,
  candidate: Player,
  selectedIds: Set<string>
): SimilarityScore | null {
  // Skip already selected players
  if (selectedIds.has(candidate.id)) return null;
  
  let score = 0;
  const reasons: string[] = [];

  // 1. Position compatibility (0-40 points)
  const refGroup = getPositionGroup(referencePlayer.position);
  const candGroup = getPositionGroup(candidate.position);
  const refCategory = getPositionCategory(referencePlayer.position);
  const candCategory = getPositionCategory(candidate.position);

  if (refGroup === candGroup) {
    score += 40;
    reasons.push("Mesma posição");
  } else if (COMPATIBLE_POSITION_GROUPS[refGroup]?.includes(candGroup)) {
    score += 25;
    reasons.push("Posição similar");
  } else if (refCategory && candCategory && COMPATIBLE_CATEGORIES[refCategory]?.includes(candCategory)) {
    score += 15;
    reasons.push("Posição compatível");
  } else {
    // Different position groups - low compatibility
    score += 5;
  }

  // 2. Rating proximity (0-25 points)
  if (referencePlayer.auto_rating !== null && candidate.auto_rating !== null) {
    const ratingDiff = Math.abs(referencePlayer.auto_rating - candidate.auto_rating);
    if (ratingDiff <= 5) {
      score += 25;
      reasons.push("Nota muito similar");
    } else if (ratingDiff <= 10) {
      score += 18;
      reasons.push("Nota similar");
    } else if (ratingDiff <= 15) {
      score += 10;
    }
  }

  // 3. Age proximity (0-15 points)
  if (referencePlayer.age !== null && candidate.age !== null) {
    const ageDiff = Math.abs(referencePlayer.age - candidate.age);
    if (ageDiff <= 2) {
      score += 15;
      reasons.push("Idade similar");
    } else if (ageDiff <= 4) {
      score += 10;
    } else if (ageDiff <= 6) {
      score += 5;
    }
  }

  // 4. Physical profile (0-10 points)
  if (referencePlayer.height && candidate.height) {
    const heightDiff = Math.abs(referencePlayer.height - candidate.height);
    if (heightDiff <= 3) {
      score += 10;
      reasons.push("Perfil físico similar");
    } else if (heightDiff <= 6) {
      score += 5;
    }
  }

  // 5. Same nationality bonus (0-5 points)
  if (referencePlayer.nationality === candidate.nationality) {
    score += 5;
    reasons.push("Mesma nacionalidade");
  }

  // 6. Same club context (0-5 points) - comparing teammates
  if (referencePlayer.current_club && candidate.current_club && 
      referencePlayer.current_club === candidate.current_club) {
    score += 5;
    reasons.push("Mesmo clube");
  }

  return { player: candidate, score, reasons };
}

export function SimilarPlayerSuggestions({
  selectedPlayers,
  allPlayers,
  onSelectPlayer,
  maxSuggestions = 6,
}: SimilarPlayerSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (selectedPlayers.length === 0) return [];

    const selectedIds = new Set(selectedPlayers.map(p => p.id));
    
    // Get all similarity scores for each selected player
    const allScores: SimilarityScore[] = [];

    selectedPlayers.forEach(refPlayer => {
      allPlayers.forEach(candidate => {
        const similarity = calculateSimilarity(refPlayer, candidate, selectedIds);
        if (similarity && similarity.score >= 20) {
          // Check if already in allScores
          const existing = allScores.find(s => s.player.id === candidate.id);
          if (existing) {
            // Keep higher score
            if (similarity.score > existing.score) {
              existing.score = similarity.score;
              existing.reasons = similarity.reasons;
            }
          } else {
            allScores.push(similarity);
          }
        }
      });
    });

    // Sort by score and take top suggestions
    return allScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }, [selectedPlayers, allPlayers, maxSuggestions]);

  if (selectedPlayers.length === 0 || suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        // Desktop: original gradient style
        "sm:bg-gradient-to-br sm:from-zinc-900/80 sm:to-zinc-950 sm:border-zinc-800/50",
        // Mobile: cleaner, lighter background for better readability
        "bg-zinc-900 border-zinc-700/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="p-1.5 rounded-lg bg-orange-500/10">
          <Sparkles className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Atletas Similares</h3>
          <p className="text-[10px] text-zinc-500 sm:text-zinc-500">Sugestões baseadas no perfil selecionado</p>
        </div>
      </div>

      {/* Suggestions Grid */}
      <div className="p-3 sm:p-4">
        <div className="grid gap-3 sm:gap-2 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.player.id}
                suggestion={suggestion}
                index={index}
                onSelect={() => onSelectPlayer(suggestion.player)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface SuggestionCardProps {
  suggestion: SimilarityScore;
  index: number;
  onSelect: () => void;
}

function SuggestionCard({ suggestion, index, onSelect }: SuggestionCardProps) {
  const { player, score, reasons } = suggestion;
  const posColor = getPositionColor(player.position);
  const shortPos = getShortPosition(player.position);

  // Match score indicator
  const matchLevel = score >= 60 ? "high" : score >= 40 ? "medium" : "low";
  const matchColors = {
    high: {
      desktop: "text-emerald-400 bg-emerald-500/10",
      mobile: "text-emerald-300 bg-emerald-500/20 border border-emerald-500/30"
    },
    medium: {
      desktop: "text-amber-400 bg-amber-500/10",
      mobile: "text-amber-300 bg-amber-500/20 border border-amber-500/30"
    },
    low: {
      desktop: "text-zinc-400 bg-zinc-500/10",
      mobile: "text-zinc-300 bg-zinc-600/30 border border-zinc-500/30"
    },
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onSelect}
      className={cn(
        "relative group text-left transition-all focus:outline-none focus:ring-2",
        posColor.ringClass,
        // Desktop: compact vertical card
        "sm:rounded-lg sm:p-3 sm:bg-zinc-900/50 sm:border sm:border-zinc-800/50",
        "sm:hover:bg-zinc-800/50 sm:hover:border-zinc-700",
        // Mobile: horizontal card with better contrast and spacing
        "flex sm:block items-center gap-3 p-3 sm:p-3",
        "rounded-xl sm:rounded-lg",
        "bg-zinc-800 sm:bg-zinc-900/50",
        "border border-zinc-600/50 sm:border-zinc-800/50",
        "shadow-sm sm:shadow-none"
      )}
    >
      {/* Match score badge - Desktop: absolute top-right, Mobile: inside card right side */}
      <div className={cn(
        "px-2 py-1 rounded-md text-[10px] font-bold",
        // Desktop positioning
        "sm:absolute sm:-top-1.5 sm:-right-1.5 sm:px-1.5 sm:py-0.5 sm:rounded sm:text-[9px]",
        matchColors[matchLevel].desktop,
        // Mobile: positioned in flow, better visibility
        "sm:block absolute right-3 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:static",
        // Mobile-specific solid background
        "max-sm:bg-zinc-700 max-sm:text-zinc-100 max-sm:border max-sm:border-zinc-500/50"
      )}>
        {Math.round(score)}%
      </div>

      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0",
        // Desktop: stacked layout
        "sm:mb-2",
        // Mobile: side by side
        "flex items-center gap-3 sm:gap-2"
      )}>
        <div className={cn(
          "rounded-lg overflow-hidden ring-2 flex-shrink-0",
          posColor.ringClass,
          // Desktop: 40px
          "sm:w-10 sm:h-10",
          // Mobile: larger avatar
          "w-12 h-12"
        )}>
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.full_name}
              className="w-full h-full object-cover" width={48} height={48}
            />
          ) : (
            <div className="w-full h-full bg-zinc-700 sm:bg-zinc-800 flex items-center justify-center">
              <User className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 sm:text-zinc-600" />
            </div>
          )}
        </div>

        {/* Mobile: name and details next to avatar */}
        <div className="flex-1 min-w-0 sm:hidden">
          {/* Name */}
          <p className="text-sm font-semibold text-zinc-100 truncate leading-tight">
            {player.full_name.split(' ').slice(0, 2).join(' ')}
          </p>

          {/* Position badge and rating */}
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
              posColor.bgClass,
              posColor.textClass
            )}>
              {shortPos}
            </span>
            {player.auto_rating !== null && (
              <span className="text-xs font-semibold text-zinc-400">
                {formatFixed(player.auto_rating, 0)}
              </span>
            )}
          </div>

          {/* Top reason */}
          {reasons.length > 0 && (
            <p className="text-[11px] text-zinc-400 mt-1 truncate flex items-center gap-1">
              <Zap className="w-3 h-3 text-zinc-500" />
              {reasons[0]}
            </p>
          )}
        </div>

        {/* Desktop: Add icon on hover overlay */}
        <div className="hidden sm:flex absolute inset-0 items-center justify-center bg-zinc-900/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <div className={cn(
            "p-2 rounded-full",
            posColor.bgClass
          )}>
            <Plus className={cn("w-4 h-4", posColor.textClass)} />
          </div>
        </div>
      </div>

      {/* Desktop-only: Name, position, reason (hidden on mobile) */}
      <div className="hidden sm:block">
        {/* Name */}
        <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">
          {player.full_name.split(' ').slice(0, 2).join(' ')}
        </p>

        {/* Position badge */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn(
            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
            posColor.bgClass,
            posColor.textClass
          )}>
            {shortPos}
          </span>
          {player.auto_rating !== null && (
            <span className="text-[10px] font-semibold text-zinc-500">
              {formatFixed(player.auto_rating, 0)}
            </span>
          )}
        </div>

        {/* Top reason */}
        {reasons.length > 0 && (
          <p className="text-[9px] text-zinc-600 mt-1.5 truncate flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            {reasons[0]}
          </p>
        )}
      </div>

      {/* Mobile-only: subtle add indicator (bottom-right) */}
      <div className={cn(
        "sm:hidden absolute bottom-2 right-2 p-1.5 rounded-full",
        "bg-zinc-700/50 opacity-60"
      )}>
        <Plus className="w-3 h-3 text-zinc-400" />
      </div>
    </motion.button>
  );
}

// Compact version for inline suggestions
export function InlineSuggestion({
  player,
  score,
  onSelect,
}: {
  player: Player;
  score: number;
  onSelect: () => void;
}) {
  const posColor = getPositionColor(player.position);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
        "bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50",
        "group"
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded overflow-hidden ring-1",
        posColor.ringClass
      )}>
        {player.photo_url ? (
          <img src={player.photo_url} alt="" className="w-full h-full object-cover" width={48} height={48} />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <User className="w-3 h-3 text-zinc-600" />
          </div>
        )}
      </div>
      <span className="text-xs text-zinc-300 truncate max-w-[80px]">
        {player.full_name.split(' ')[0]}
      </span>
      <Plus className="w-3 h-3 text-zinc-500 group-hover:text-orange-400 transition-colors ml-auto" />
    </button>
  );
}
