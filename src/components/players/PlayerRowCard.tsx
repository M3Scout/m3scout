import { Link, useNavigate } from "react-router-dom";
import { MoreVertical, Eye, Edit, FileText, Archive, ArchiveRestore, Trash2 } from "lucide-react";
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
  contractEnd: string | null;
  isPublic: boolean;
  isArchived: boolean | null;
  isAdmin: boolean;
  onArchive: () => void;
  onDelete: () => void;
}

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
  contractEnd,
  isPublic,
  isArchived,
  isAdmin,
  onArchive,
  onDelete,
}: PlayerRowCardProps) {
  const navigate = useNavigate();

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
      className="group relative flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all cursor-pointer rounded-lg"
    >
      {/* Player Photo */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-800 group-hover:border-zinc-700 transition-colors">
        <img
          src={photoUrl || defaultPhoto}
          alt={fullName}
          className="w-full h-full object-cover"
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

      {/* Position Badge - Compact */}
      <div className="hidden sm:flex items-center">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded">
          {position || "N/A"}
        </span>
      </div>

      {/* Score Técnico - PROMINENT */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center justify-center min-w-[60px]">
              {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
                <div className={`px-3 py-1.5 rounded-lg border ${getScoreBgColor(avgScore)}`}>
                  <span className={`text-lg font-bold tabular-nums ${getScoreColor(avgScore)}`}>
                    {formatFixed(avgScore, 1)}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-600 text-sm">—</span>
              )}
              <span className="text-[9px] uppercase tracking-wider text-zinc-600 mt-0.5">Score</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Score Técnico (média dos relatórios de scouting)</p>
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
                  {Math.round(autoRating)}
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
  isPublic,
  isArchived,
  isAdmin,
  onArchive,
  onDelete,
}: PlayerRowCardProps) {
  const navigate = useNavigate();

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
      className="relative bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* Header with photo and main info */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-800">
          <img
            src={photoUrl || defaultPhoto}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{fullName}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider text-zinc-400">
              {position || "N/A"}
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
        {/* Score Técnico */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Score</span>
          {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
            <span className={`text-lg font-bold tabular-nums ${getScoreColor(avgScore)}`}>
              {formatFixed(avgScore, 1)}
            </span>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </div>

        {/* Nota Global */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Global</span>
          {autoRating !== null && autoRating !== undefined ? (
            <span className={`text-base font-semibold tabular-nums ${getGlobalRatingColor(autoRating)}`}>
              {Math.round(autoRating)}
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
