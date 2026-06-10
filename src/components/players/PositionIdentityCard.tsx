import { Link, useNavigate } from "react-router-dom";
import { MoreVertical, Eye, Edit, FileText, Archive, ArchiveRestore, Trash2, Star, ArrowRight, Ruler, Footprints, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFixed } from "@/lib/formatters";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface PositionIdentityCardProps {
  id: string;
  fullName: string;
  position: string | null;
  age: number | null;
  nationality: string;
  currentClub: string | null;
  photoUrl: string | null;
  autoRating: number | null;
  autoPotential?: number | null;
  height?: number | null;
  weight?: number | null;
  dominantFoot?: string | null;
  contractEnd: string | null;
  isPublic: boolean;
  isArchived: boolean | null;
  isAdmin: boolean;
  onArchive: () => void;
  onDelete: () => void;
  isFiltered?: boolean;
}

// Global rating color (0-100 scale)
const getRatingColor = (rating: number): string => {
  if (rating >= 85) return "text-emerald-400";
  if (rating >= 75) return "text-green-400";
  if (rating >= 65) return "text-lime-400";
  if (rating >= 55) return "text-yellow-400";
  if (rating >= 45) return "text-orange-400";
  return "text-red-400";
};

const formatContractEnd = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const month = date.toLocaleDateString("pt-BR", { month: "short" });
  const year = date.getFullYear();
  return `${month} ${year}`;
};

export function PositionIdentityCard({
  id,
  fullName,
  position,
  age,
  nationality,
  currentClub,
  photoUrl,
  autoRating,
  height,
  weight,
  dominantFoot,
  contractEnd,
  autoPotential,
  isPublic,
  isArchived,
  isAdmin,
  onArchive,
  onDelete,
  isFiltered,
}: PositionIdentityCardProps) {
  const navigate = useNavigate();
  const positionColors = getPositionColor(position);
  const shortPosition = getShortPosition(position);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/dashboard/atletas/${id}`);
  };

  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=800&fit=crop&q=85&auto=format";

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group relative bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden cursor-pointer",
        "transition-all duration-200 ease-out",
        "hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg",
        "[&_*]:no-underline [&:hover_*]:no-underline",
        positionColors.glowClass,
        isFiltered === false && "opacity-40"
      )}
    >
      {/* Position Rail - Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-all duration-200",
        positionColors.accentClass,
        "opacity-60 group-hover:opacity-100"
      )} />

      <div className="flex">
        {/* Photo Column - Smaller, editorial */}
        <div className="relative w-20 sm:w-24 flex-shrink-0 ml-2">
          <div className="aspect-square overflow-hidden rounded-lg m-2 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
            <img
              src={getOptimizedImageUrl(photoUrl, { width: 800, quality: 85, format: "avif" }) || defaultPhoto}
              alt={fullName}
              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 p-3 pr-2 flex flex-col justify-between min-w-0">
          {/* Header: Name */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Name - Primary - No underline on hover */}
              <h3 className="text-white font-semibold text-sm sm:text-base leading-tight truncate group-hover:text-primary transition-colors no-underline decoration-transparent">
                {fullName}
              </h3>
              
              {/* Position • Age • Club */}
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                {/* Position Badge */}
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                  positionColors.bgClass,
                  positionColors.textClass,
                  positionColors.borderClass
                )}>
                  {shortPosition}
                </span>
                {age && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{age} anos</span>
                  </>
                )}
                {currentClub && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500 truncate max-w-[80px] sm:max-w-[120px]">{currentClub}</span>
                  </>
                )}
              </div>
            </div>

            {/* Rating Chip - Top right */}
            {autoRating !== null && autoRating !== undefined && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-xs font-semibold text-zinc-300 tabular-nums">
                  {formatFixed(autoRating, 1)}
                </span>
              </div>
            )}
          </div>

          {/* Secondary Info Row */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
            {nationality && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[60px]">{nationality}</span>
              </span>
            )}
            {height && (
              <span className="flex items-center gap-1">
                <Ruler className="w-3 h-3" />
                {height}cm
              </span>
            )}
            {dominantFoot && (
              <span className="flex items-center gap-1">
                <Footprints className="w-3 h-3" />
                <span className="capitalize">{dominantFoot}</span>
              </span>
            )}
            {contractEnd && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatContractEnd(contractEnd)}
              </span>
            )}
          </div>
        </div>

        {/* Actions Menu - Positioned right */}
        <div className="flex items-start p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-dropdown-trigger>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity"
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
      </div>

      {/* Footer: Metrics Chips */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/30 border-t border-zinc-900">
        <div className="flex items-center gap-2">
          {/* OVR Chip */}
          {overallRating && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/50",
              "group-hover:border-current transition-colors",
              positionColors.borderClass
            )}>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">OVR</span>
              <span className={cn("text-xs font-semibold tabular-nums", getRatingColor(overallRating))}>
                {overallRating}
              </span>
            </div>
          )}

          {/* POT Chip */}
          {potentialRating && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/50">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">POT</span>
              <span className={cn("text-xs font-semibold tabular-nums", getRatingColor(potentialRating))}>
                {potentialRating}
              </span>
            </div>
          )}

          {/* Status badges */}
          <span className={cn(
            "text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border",
            isPublic 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
              : "bg-zinc-800 text-zinc-500 border-zinc-700"
          )}>
            {isPublic ? "Público" : "Restrito"}
          </span>
          {isArchived && (
            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Arquivado
            </span>
          )}
        </div>

        {/* View Profile Link - appears on hover */}
        <span className="flex items-center gap-1 text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Ver perfil
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </article>
  );
}

// Mobile Card - Compact row layout
export function PositionIdentityCardMobile({
  id,
  fullName,
  position,
  age,
  nationality,
  currentClub,
  photoUrl,
  autoRating,
  overallRating,
  potentialRating,
  isPublic,
  isArchived,
  isAdmin,
  onArchive,
  onDelete,
  isFiltered,
}: PositionIdentityCardProps) {
  const navigate = useNavigate();
  const positionColors = getPositionColor(position);
  const shortPosition = getShortPosition(position);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    navigate(`/dashboard/atletas/${id}`);
  };

  const defaultPhoto = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=800&fit=crop&q=85&auto=format";

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group relative bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden cursor-pointer",
        "active:scale-[0.99] transition-transform",
        "[&_*]:no-underline [&:hover_*]:no-underline",
        isFiltered === false && "opacity-40"
      )}
    >
      {/* Position Rail - Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        positionColors.accentClass,
        "opacity-70"
      )} />

      <div className="flex items-center gap-3 p-3 ml-1">
        {/* Photo - Small */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800">
          <img
            src={getOptimizedImageUrl(photoUrl, { width: 800, quality: 85, format: "avif" }) || defaultPhoto}
            alt={fullName}
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{fullName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs">
            {/* Position Badge */}
            <span className={cn(
              "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
              positionColors.bgClass,
              positionColors.textClass,
              positionColors.borderClass
            )}>
              {shortPosition}
            </span>
            {age && <span className="text-zinc-500">{age} anos</span>}
          </div>
        </div>

        {/* Rating Chip */}
        {autoRating !== null && autoRating !== undefined && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold text-zinc-300 tabular-nums">
              {formatFixed(autoRating, 1)}
            </span>
          </div>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild data-dropdown-trigger>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
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

      {/* Metrics Row - Horizontal scroll */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/30 border-t border-zinc-900 overflow-x-auto scrollbar-hide">
        {overallRating && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/50 flex-shrink-0",
            positionColors.borderClass
          )}>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">OVR</span>
            <span className="text-xs font-semibold tabular-nums text-zinc-300">{overallRating}</span>
          </div>
        )}
        {potentialRating && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/50 flex-shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">POT</span>
            <span className="text-xs font-semibold tabular-nums text-zinc-300">{potentialRating}</span>
          </div>
        )}
        <span className={cn(
          "text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border flex-shrink-0",
          isPublic 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
            : "bg-zinc-800 text-zinc-500 border-zinc-700"
        )}>
          {isPublic ? "Pub" : "Priv"}
        </span>
        {isArchived && (
          <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex-shrink-0">
            Arq
          </span>
        )}
      </div>
    </article>
  );
}
