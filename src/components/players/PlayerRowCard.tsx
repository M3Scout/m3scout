import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreVertical, Eye, Edit, FileText, Archive, ArchiveRestore, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFixed } from "@/lib/formatters";
import { getShortPosition, getPositionColor } from "@/lib/positionColors";
import { playerRankItemVariants, subtleHover, subtleTap } from "@/lib/animations";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface PlayerRowCardProps {
  id: string;
  fullName: string;
  position: string | null;
  age: number | null;
  nationality: string;
  currentClub: string | null;
  photoUrl: string | null;
  autoRating: number | null;
  avgScore: number | null;
  scoreTrend: number | null;
  contractEnd: string | null;
  isPublic: boolean;
  isArchived: boolean | null;
  isAdmin: boolean;
  onArchive: () => void;
  onDelete: () => void;
  isFiltered?: boolean;
  index?: number;
}

// Trend indicator component
const TrendIndicator = ({ trend }: { trend: number | null }) => {
  if (trend === null || trend === undefined) return null;
  
  const threshold = 0.1;
  
  if (Math.abs(trend) < threshold) {
    return (
      <span className="text-zinc-500" title="Estável">
        <Minus className="w-3 h-3" />
      </span>
    );
  }
  
  if (trend > 0) {
    return (
      <span className="text-emerald-400" title={`+${formatFixed(trend, 1)}`}>
        <TrendingUp className="w-3 h-3" />
      </span>
    );
  }
  
  return (
    <span className="text-red-400" title={formatFixed(trend, 1)}>
      <TrendingDown className="w-3 h-3" />
    </span>
  );
};

// Score colors (0-5 scale)
const getScoreColor = (score: number): string => {
  if (score >= 4.5) return "text-emerald-400";
  if (score >= 4.0) return "text-green-400";
  if (score >= 3.5) return "text-lime-400";
  if (score >= 3.0) return "text-yellow-400";
  if (score >= 2.5) return "text-orange-400";
  return "text-red-400";
};

const getScoreBgColor = (score: number): string => {
  if (score >= 4.5) return "bg-emerald-500/20 border-emerald-500/30";
  if (score >= 4.0) return "bg-green-500/20 border-green-500/30";
  if (score >= 3.5) return "bg-lime-500/20 border-lime-500/30";
  if (score >= 3.0) return "bg-yellow-500/20 border-yellow-500/30";
  if (score >= 2.5) return "bg-orange-500/20 border-orange-500/30";
  return "bg-red-500/20 border-red-500/30";
};

// Global rating colors (0-100 scale)
const getGlobalRatingColor = (rating: number): string => {
  if (rating >= 85) return "text-emerald-400";
  if (rating >= 75) return "text-green-400";
  if (rating >= 65) return "text-lime-400";
  if (rating >= 55) return "text-yellow-400";
  if (rating >= 45) return "text-orange-400";
  return "text-red-400";
};

// Position Badge with subtle color styling
const PositionBadge = ({ position }: { position: string | null }) => {
  const shortPos = getShortPosition(position);
  const posColor = getPositionColor(position);
  
  return (
    <span 
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border ${posColor.bgClass} ${posColor.textClass} ${posColor.borderClass}`}
    >
      {shortPos}
    </span>
  );
};

export function PlayerRowCard({
  id,
  fullName,
  position,
  age,
  nationality,
  currentClub,
  photoUrl,
  autoRating,
  avgScore,
  scoreTrend,
  contractEnd,
  isPublic,
  isArchived,
  isAdmin,
  onArchive,
  onDelete,
  isFiltered,
  index = 0,
}: PlayerRowCardProps) {
  const navigate = useNavigate();

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/dashboard/atletas/${id}`);
  };

  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=800&fit=crop&q=85&auto=format";

  const posColor = getPositionColor(position);

  return (
    <motion.div
      variants={playerRankItemVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={subtleHover}
      whileTap={subtleTap}
      onClick={handleRowClick}
      className={`group relative flex items-center gap-3 p-3 pl-5 bg-zinc-950 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors cursor-pointer rounded-lg overflow-hidden ${isFiltered === false ? 'opacity-40' : ''}`}
    >
      {/* Left Rail - Position Color Accent */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${posColor.accentClass} transition-all group-hover:shadow-[0_0_8px_0px] ${posColor.glowClass}`}
      />

      {/* Player Photo with Position Color Ring */}
      <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 bg-zinc-900 ${posColor.ringClass}`}>
        <img
          src={getOptimizedImageUrl(photoUrl, { width: 800, quality: 85, format: "avif" }) || defaultPhoto}
          alt={fullName}
          className="w-full h-full object-contain object-center"
        />
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        {/* Name - Primary */}
        <h3 className="text-white font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
          {fullName}
        </h3>
        {/* Secondary Info */}
        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
          {age && <span>{age} anos</span>}
          {age && nationality && <span>•</span>}
          <span className="truncate">{nationality}</span>
          {currentClub && (
            <>
              <span>•</span>
              <span className="truncate text-zinc-600">{currentClub}</span>
            </>
          )}
        </div>
      </div>

      {/* Position Badge - Colored */}
      <div className="hidden sm:flex items-center">
        <PositionBadge position={position} />
      </div>

      {/* Score Técnico - Compact Chip with Trend */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
                <>
                  <div className={`px-2.5 py-1 rounded-full border ${getScoreBgColor(avgScore)} flex items-center gap-1`}>
                    <span className={`text-sm font-semibold tabular-nums ${getScoreColor(avgScore)}`}>
                      {formatFixed(avgScore, 1)}
                    </span>
                    <TrendIndicator trend={scoreTrend} />
                  </div>
                </>
              ) : (
                <span className="text-zinc-600 text-xs">—</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Score Técnico (média dos relatórios de scouting)</p>
            {scoreTrend !== null && scoreTrend !== undefined && (
              <p className="text-xs text-muted-foreground">
                Variação: {scoreTrend > 0 ? "+" : ""}{formatFixed(scoreTrend, 1)} vs última avaliação
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Nota Global - Compact */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">Global</span>
              {autoRating !== null && autoRating !== undefined ? (
                <span className={`text-sm font-semibold tabular-nums ${getGlobalRatingColor(autoRating)}`}>
                  {formatFixed(autoRating, 1)}
                </span>
              ) : (
                <span className="text-zinc-600 text-xs">—</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Nota Global (calculada automaticamente)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Status Badges */}
      <div className="hidden lg:flex items-center gap-1.5">
        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
          isPublic ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
        }`}>
          {isPublic ? "Público" : "Privado"}
        </span>
        {isArchived && (
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
            Arquivado
          </span>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-dropdown-trigger>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-50 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/atletas/${id}`}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/atletas/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/relatorios/novo?player=${id}`}>
              <FileText className="w-4 h-4 mr-2" />
              Novo Relatório
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
            {isArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Restaurar
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </>
            )}
          </DropdownMenuItem>
          {isAdmin && isArchived && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Permanentemente
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// Mobile Card Version
export function PlayerMobileCard({
  id,
  fullName,
  position,
  age,
  nationality,
  currentClub,
  photoUrl,
  autoRating,
  avgScore,
  scoreTrend,
  isPublic,
  isArchived,
  isAdmin,
  onArchive,
  onDelete,
  isFiltered,
  index = 0,
}: PlayerRowCardProps) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/dashboard/atletas/${id}`);
  };

  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=800&fit=crop&q=85&auto=format";

  const posColor = getPositionColor(position);

  return (
    <motion.div
      variants={playerRankItemVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileTap={subtleTap}
      onClick={handleCardClick}
      className={`relative bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden cursor-pointer ${isFiltered === false ? 'opacity-40' : ''}`}
    >
      {/* Left Rail - Position Color Accent */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${posColor.accentClass}`}
      />

      {/* Header with photo and main info */}
      <div className="flex items-center gap-3 p-3 pl-4">
        <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 bg-zinc-900 ${posColor.ringClass}`}>
          <img
            src={getOptimizedImageUrl(photoUrl, { width: 800, quality: 85, format: "avif" }) || defaultPhoto}
            alt={fullName}
            className="w-full h-full object-contain object-center"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{fullName}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {/* Position Badge - Colored */}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${posColor.bgClass} ${posColor.textClass} ${posColor.borderClass}`}>
              {getShortPosition(position)}
            </span>
            {age && <span>{age} anos</span>}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild data-dropdown-trigger>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/atletas/${id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/atletas/${id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/relatorios/novo?player=${id}`}>
                <FileText className="w-4 h-4 mr-2" />
                Novo Relatório
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
              {isArchived ? (
                <>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Restaurar
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar
                </>
              )}
            </DropdownMenuItem>
            {isAdmin && isArchived && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Permanentemente
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scores Row - Compact */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/50 border-t border-zinc-900">
        {/* Score Técnico with Trend - Compact Chip */}
        <div className="flex items-center gap-1.5">
          {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
            <div className={`px-2.5 py-1 rounded-full border ${getScoreBgColor(avgScore)} flex items-center gap-1`}>
              <span className={`text-sm font-semibold tabular-nums ${getScoreColor(avgScore)}`}>
                {formatFixed(avgScore, 1)}
              </span>
              <TrendIndicator trend={scoreTrend} />
            </div>
          ) : (
            <span className="text-zinc-600 text-xs">—</span>
          )}
        </div>

        {/* Nota Global - Compact */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">Global</span>
          {autoRating !== null && autoRating !== undefined ? (
            <span className={`text-sm font-semibold tabular-nums ${getGlobalRatingColor(autoRating)}`}>
              {formatFixed(autoRating, 1)}
            </span>
          ) : (
            <span className="text-zinc-600 text-xs">—</span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1">
          <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
            isPublic ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
          }`}>
            {isPublic ? "Pub" : "Priv"}
          </span>
          {isArchived && (
            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
              Arq
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
