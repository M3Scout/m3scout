import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      onClick={handleRowClick}
      className={cn(
        "group relative flex items-center gap-4 py-3.5 px-5 cursor-pointer",
        "bg-zinc-900/40 hover:bg-zinc-900/70",
        "rounded-2xl transition-all duration-200",
        "hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]",
        isArchived && "opacity-50"
      )}
    >
      {/* Left Accent Rail */}
      <div 
        className={cn(
          "absolute left-0 top-4 bottom-4 w-[2px] rounded-full transition-all duration-300",
          posColor.accentClass,
          "opacity-40 group-hover:opacity-100"
        )}
      />

      {/* Avatar */}
      <div className={cn(
        "relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0",
        "ring-1 ring-zinc-800/60",
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
              <h3 className="text-[15px] font-bold text-white truncate leading-tight tracking-tight">
                {fullName}
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{fullName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
          {age && <span className="tabular-nums">{age}a</span>}
          {age && nationality && <span className="text-zinc-700">·</span>}
          <span className="truncate">{nationality}</span>
          {currentClub && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="truncate text-zinc-600">{currentClub}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Cluster: Position + OVR */}
      <div className="hidden sm:flex items-center gap-3">
        {/* Position Badge */}
        <span 
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            "px-2.5 py-1 rounded-full",
            "bg-zinc-800/60",
            posColor.textClass
          )}
        >
          {getShortPosition(position)}
        </span>

        {/* OVR */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/40">
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
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-dropdown-trigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-3.5 h-3.5" />
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2, ease: "easeOut" }}
      onClick={handleCardClick}
      className={cn(
        "relative bg-zinc-900/40 rounded-2xl overflow-hidden cursor-pointer",
        "active:scale-[0.99] transition-transform duration-100",
        isArchived && "opacity-50"
      )}
    >
      {/* Left Accent */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[2px]", posColor.accentClass, "opacity-60")} />

      {/* Content */}
      <div className="flex items-center gap-3 p-3.5 pl-4">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-zinc-800/60">
          <img
            src={photoUrl || defaultPhoto}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate tracking-tight">{fullName}</h3>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5 font-medium">
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-semibold",
              "bg-zinc-800/60",
              posColor.textClass
            )}>
              {getShortPosition(position)}
            </span>
            {age && <span>· {age}a</span>}
            {nationality && <span className="truncate">· {nationality}</span>}
          </div>
        </div>

        {/* OVR Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/40 mr-1">
          <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-medium">OVR</span>
          {autoRating !== null && autoRating !== undefined ? (
            <span className={cn("text-sm font-extrabold tabular-nums", getGlobalRatingColor(autoRating))}>
              {String(Math.round(autoRating)).padStart(2, '0')}
            </span>
          ) : (
            <span className="text-zinc-700 text-xs">—</span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild data-dropdown-trigger>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-3.5 h-3.5" />
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
    </motion.div>
  );
}
