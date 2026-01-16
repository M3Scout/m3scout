import { Link, useNavigate } from "react-router-dom";
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
import { getPositionColor, getShortPosition } from "@/lib/positionColors";

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
  isFiltered?: boolean; // Whether this position is being filtered (false = dimmed)
}

// Trend indicator component
const TrendIndicator = ({ trend }: { trend: number | null }) => {
  if (trend === null || trend === undefined) return null;
  
  const threshold = 0.1; // Minimum change to show trend
  
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

// Score Técnico colors (0-5 scale, higher is better)
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

// Nota Global colors (0-100 scale, higher is better)
const getGlobalRatingColor = (rating: number): string => {
  if (rating >= 85) return "text-emerald-400";
  if (rating >= 75) return "text-green-400";
  if (rating >= 65) return "text-lime-400";
  if (rating >= 55) return "text-yellow-400";
  if (rating >= 45) return "text-orange-400";
  return "text-red-400";
};

// Position Badge Component
const PositionBadge = ({ position }: { position: string | null }) => {
  const colors = getPositionColor(position);
  const shortPos = getShortPosition(position);
  
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border ${colors.bgClass} ${colors.textClass} ${colors.borderClass}`}>
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
}: PlayerRowCardProps) {
  const navigate = useNavigate();
  const positionColors = getPositionColor(position);

  const handleRowClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on dropdown
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/app/players/${id}`);
  };

  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop";

  return (
    <div
      onClick={handleRowClick}
      className={`group relative flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all cursor-pointer rounded-lg overflow-hidden ${isFiltered === false ? 'opacity-40' : ''}`}
    >
      {/* Position Color Bar - Left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${positionColors.accentClass} opacity-60 group-hover:opacity-100 transition-opacity`} />

      {/* Player Photo */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-800 group-hover:border-zinc-700 transition-colors ml-2">
        <img
          src={photoUrl || defaultPhoto}
          alt={fullName}
          className="w-full h-full object-cover"
        />
        {/* Position dot indicator on photo */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${positionColors.accentClass} border-2 border-zinc-950`} />
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

      {/* Score Técnico - PROMINENT with Trend */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center justify-center min-w-[70px]">
              {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
                <div className="flex items-center gap-1">
                  <div className={`px-3 py-1.5 rounded-lg border ${getScoreBgColor(avgScore)}`}>
                    <span className={`text-lg font-bold tabular-nums ${getScoreColor(avgScore)}`}>
                      {formatFixed(avgScore, 1)}
                    </span>
                  </div>
                  <TrendIndicator trend={scoreTrend} />
                </div>
              ) : (
                <span className="text-zinc-600 text-sm">—</span>
              )}
              <span className="text-[9px] uppercase tracking-wider text-zinc-600 mt-0.5">Score</span>
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

      {/* Nota Global */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden md:flex flex-col items-center justify-center min-w-[50px]">
              {autoRating !== null && autoRating !== undefined ? (
                <span className={`text-base font-semibold tabular-nums ${getGlobalRatingColor(autoRating)}`}>
                  {formatFixed(autoRating, 1)}
                </span>
              ) : (
                <span className="text-zinc-600 text-sm">—</span>
              )}
              <span className="text-[9px] uppercase tracking-wider text-zinc-600">Global</span>
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
            <Link to={`/app/players/${id}`}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/app/players/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/app/reports/new?player=${id}`}>
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
}: PlayerRowCardProps) {
  const navigate = useNavigate();
  const positionColors = getPositionColor(position);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/app/players/${id}`);
  };

  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop";

  return (
    <div
      onClick={handleCardClick}
      className={`relative bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden cursor-pointer active:scale-[0.99] transition-transform ${isFiltered === false ? 'opacity-40' : ''}`}
    >
      {/* Position Color Underline */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${positionColors.accentClass} opacity-70`} />
      
      {/* Header with photo and main info */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-800">
          <img
            src={photoUrl || defaultPhoto}
            alt={fullName}
            className="w-full h-full object-cover"
          />
          {/* Position dot indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${positionColors.accentClass} border-2 border-zinc-950`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{fullName}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {/* Position Badge - Colored */}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${positionColors.bgClass} ${positionColors.textClass} ${positionColors.borderClass}`}>
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
              <Link to={`/app/players/${id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/app/players/${id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/app/reports/new?player=${id}`}>
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

      {/* Scores Row */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-t border-zinc-900">
        {/* Score Técnico with Trend */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Score</span>
          {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold tabular-nums ${getScoreColor(avgScore)}`}>
                {formatFixed(avgScore, 1)}
              </span>
              <TrendIndicator trend={scoreTrend} />
            </div>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </div>

        {/* Nota Global */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Global</span>
          {autoRating !== null && autoRating !== undefined ? (
            <span className={`text-base font-semibold tabular-nums ${getGlobalRatingColor(autoRating)}`}>
              {formatFixed(autoRating, 1)}
            </span>
          ) : (
            <span className="text-zinc-600">—</span>
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
    </div>
  );
}
