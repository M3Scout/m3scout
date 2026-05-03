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
import { cn } from "@/lib/utils";

interface PlayerListRowPremiumProps {
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
  index?: number;
}

// Trend indicator - minimal
const TrendIndicator = ({ trend }: { trend: number | null }) => {
  if (trend === null || trend === undefined) return null;
  
  const threshold = 0.1;
  
  if (Math.abs(trend) < threshold) {
    return (
      <span className="text-zinc-600">
        <Minus className="w-2.5 h-2.5" />
      </span>
    );
  }
  
  if (trend > 0) {
    return (
      <span className="text-emerald-500">
        <TrendingUp className="w-2.5 h-2.5" />
      </span>
    );
  }
  
  return (
    <span className="text-rose-500">
      <TrendingDown className="w-2.5 h-2.5" />
    </span>
  );
};

// Score colors (0-5 scale)
const getScoreColor = (score: number): string => {
  if (score >= 4.5) return "text-emerald-400";
  if (score >= 4.0) return "text-green-400";
  if (score >= 3.5) return "text-lime-400";
  if (score >= 3.0) return "text-amber-400";
  if (score >= 2.5) return "text-orange-400";
  return "text-rose-400";
};

// Global rating colors (0-100 scale)
const getGlobalRatingColor = (rating: number): string => {
  if (rating >= 85) return "text-emerald-400";
  if (rating >= 75) return "text-green-400";
  if (rating >= 65) return "text-lime-400";
  if (rating >= 55) return "text-amber-400";
  if (rating >= 45) return "text-orange-400";
  return "text-rose-400";
};

export function PlayerListRowPremium({
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
  index = 0,
}: PlayerListRowPremiumProps) {
  const navigate = useNavigate();
  const posColor = getPositionColor(position);
  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop";

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) return;
    navigate(`/app/players/${id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      onClick={handleRowClick}
      className={cn(
        "group relative flex items-center gap-4 py-3 px-4 cursor-pointer",
        "bg-zinc-950/60 hover:bg-zinc-900/80",
        "rounded-xl transition-all duration-200",
        "shadow-[0_1px_3px_0_rgba(0,0,0,0.2)] hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)]",
        isArchived && "opacity-50"
      )}
    >
      {/* Left Accent Rail */}
      <div 
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300",
          posColor.accentClass,
          "opacity-60 group-hover:opacity-100",
          "group-hover:shadow-[0_0_12px_2px] group-hover:" + posColor.glowClass
        )}
      />

      {/* Avatar */}
      <div className={cn(
        "relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0",
        "ring-2 ring-zinc-800/50 group-hover:ring-zinc-700/80",
        "transition-all duration-200"
      )}>
        <img
          src={photoUrl || defaultPhoto}
          alt={fullName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Identity Block */}
      <div className="flex-1 min-w-0 pr-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="text-[15px] font-extrabold text-zinc-100 truncate leading-tight group-hover:text-white transition-colors tracking-tight">
                {fullName}
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{fullName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 uppercase tracking-wide">
          {age && <span className="tabular-nums">{age}</span>}
          {age && nationality && <span className="text-zinc-700">•</span>}
          <span className="truncate">{nationality}</span>
          {currentClub && (
            <>
              <span className="text-zinc-700">•</span>
              <span className="truncate text-zinc-600">{currentClub}</span>
            </>
          )}
        </div>
      </div>

      {/* Badges Cluster */}
      <div className="hidden sm:flex items-center gap-2.5">
        {/* Position Badge */}
        <span 
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            "px-2 py-1 rounded-md",
            "bg-zinc-900/80",
            posColor.textClass
          )}
        >
          {getShortPosition(position)}
        </span>

        {/* Score Técnico */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
              {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900/80">
                    <span className={cn("text-sm font-extrabold tabular-nums", getScoreColor(avgScore))}>
                      {formatFixed(avgScore, 1)}
                    </span>
                    <TrendIndicator trend={scoreTrend} />
                  </div>
                ) : (
                  <span className="text-zinc-700 text-xs px-2">—</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Score Técnico (média scouting)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Global Rating */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60">
                <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium">OVR</span>
                {autoRating !== null && autoRating !== undefined ? (
                  <span className={cn("text-sm font-extrabold tabular-nums", getGlobalRatingColor(autoRating))}>
                    {String(Math.round(autoRating)).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-zinc-700 text-xs">—</span>
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
          <span className={cn(
            "text-[9px] uppercase tracking-wider font-medium px-2 py-0.5 rounded",
            isPublic 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-zinc-800/60 text-zinc-600"
          )}>
            {isPublic ? "Público" : "Privado"}
          </span>
          {isArchived && (
            <span className="text-[9px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
              Arquivado
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-dropdown-trigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
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
    </motion.div>
  );
}

// Mobile Version
export function PlayerListRowMobilePremium({
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
  index = 0,
}: PlayerListRowPremiumProps) {
  const navigate = useNavigate();
  const posColor = getPositionColor(position);
  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop";

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) return;
    navigate(`/app/players/${id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2, ease: "easeOut" }}
      onClick={handleCardClick}
      className={cn(
        "relative bg-zinc-950/70 rounded-xl overflow-hidden cursor-pointer",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]",
        "active:scale-[0.99] transition-transform duration-100",
        isArchived && "opacity-50"
      )}
    >
      {/* Left Accent */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", posColor.accentClass)} />

      {/* Top Row: Avatar + Name + Actions */}
      <div className="flex items-center gap-3 p-3 pl-4">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-zinc-800/50">
          <img
            src={photoUrl || defaultPhoto}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">{fullName}</h3>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
              "bg-zinc-900/80",
              posColor.textClass
            )}>
              {getShortPosition(position)}
            </span>
            {age && <span>• {age}</span>}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild data-dropdown-trigger>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom Row: Metrics */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/30">
        {/* Score */}
        <div className="flex items-center gap-1.5">
          {avgScore !== null && avgScore !== undefined && Number.isFinite(avgScore) ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900/60">
              <span className={cn("text-sm font-bold tabular-nums", getScoreColor(avgScore))}>
                {formatFixed(avgScore, 1)}
              </span>
              <TrendIndicator trend={scoreTrend} />
            </div>
          ) : (
            <span className="text-zinc-700 text-xs">—</span>
          )}
        </div>

        {/* Global */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900/40">
          <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium">OVR</span>
          {autoRating !== null && autoRating !== undefined ? (
            <span className={cn("text-sm font-bold tabular-nums", getGlobalRatingColor(autoRating))}>
              {formatFixed(autoRating, 0)}
            </span>
          ) : (
            <span className="text-zinc-700 text-xs">—</span>
          )}
        </div>

        {/* Status */}
        <span className={cn(
          "text-[9px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded",
          isPublic 
            ? "bg-emerald-500/10 text-emerald-500" 
            : "bg-zinc-800/60 text-zinc-600"
        )}>
          {isPublic ? "Pub" : "Priv"}
        </span>
      </div>
    </motion.div>
  );
}
