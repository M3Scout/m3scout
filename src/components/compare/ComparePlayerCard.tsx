import { motion } from "framer-motion";
import { X, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ComparePlayerCardProps {
  player: {
    id: string;
    full_name: string;
    position: string;
    age: number | null;
    nationality: string;
    current_club: string | null;
    photo_url: string | null;
    auto_rating: number | null;
  };
  onRemove: () => void;
  index: number;
}

export function ComparePlayerCard({ player, onRemove, index }: ComparePlayerCardProps) {
  const posColor = getPositionColor(player.position);
  const shortPos = getShortPosition(player.position);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "relative group rounded-xl overflow-hidden",
        "bg-zinc-900 border-2 transition-all duration-300",
        posColor.borderClass,
        "hover:shadow-lg",
        posColor.glowClass
      )}
    >
      {/* Position accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", posColor.accentClass)} />

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 z-10 opacity-60 hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
        onClick={onRemove}
      >
        <X className="w-3.5 h-3.5" />
      </Button>

      {/* Content */}
      <div className="p-4 pl-5">
        {/* Avatar + Info */}
        <div className="flex items-start gap-3">
          {/* Avatar with position ring */}
          <div className={cn(
            "relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0",
            "ring-2",
            posColor.ringClass
          )}>
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <User className="w-6 h-6 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-white text-sm truncate leading-tight">
              {player.full_name}
            </h3>
            
            {/* Position Badge */}
            <span className={cn(
              "inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
              posColor.bgClass,
              posColor.textClass,
              posColor.borderClass,
              "border"
            )}>
              {shortPos}
            </span>

            {/* Club */}
            {player.current_club && (
              <p className="text-[11px] text-zinc-500 truncate mt-1">
                {player.current_club}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800">
          {/* Age */}
          {player.age && (
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-300">{player.age}</p>
              <p className="text-[9px] text-zinc-600 uppercase">anos</p>
            </div>
          )}

          {/* Divider */}
          {player.age && player.auto_rating !== null && (
            <div className="w-px h-6 bg-zinc-800" />
          )}

          {/* Rating */}
          {player.auto_rating !== null && (
            <div className="text-center flex-1">
              <p className={cn(
                "text-lg font-bold",
                player.auto_rating >= 75 ? "text-emerald-400" :
                player.auto_rating >= 60 ? "text-lime-400" :
                player.auto_rating >= 45 ? "text-amber-400" :
                "text-red-400"
              )}>
                {formatFixed(player.auto_rating, 1)}
              </p>
              <p className="text-[9px] text-zinc-600 uppercase">Global</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Empty slot for adding players
interface CompareEmptySlotProps {
  index: number;
  required?: boolean;
  onClick?: () => void;
}

export function CompareEmptySlot({ index, required = false, onClick }: CompareEmptySlotProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl overflow-hidden p-4 transition-all duration-300",
        "bg-zinc-900/50 border-2 border-dashed",
        required ? "border-orange-500/40 hover:border-orange-500/60" : "border-zinc-800 hover:border-zinc-700",
        "hover:bg-zinc-900 cursor-pointer group",
        "flex flex-col items-center justify-center min-h-[140px]"
      )}
    >
      {/* Icon */}
      <motion.div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
          "bg-zinc-800 group-hover:bg-zinc-700 transition-colors",
          required && "ring-2 ring-orange-500/30"
        )}
        whileHover={{ scale: 1.05 }}
      >
        <svg 
          className={cn(
            "w-5 h-5 transition-colors",
            required ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-400"
          )} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </motion.div>

      <p className={cn(
        "text-sm font-medium",
        required ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-400"
      )}>
        {required ? "Adicionar atleta" : "Adicionar mais"}
      </p>
      
      {required && (
        <p className="text-[10px] text-zinc-600 mt-1">
          Obrigatório
        </p>
      )}
    </motion.button>
  );
}

// Loading state
export function ComparePlayerCardLoading() {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-center min-h-[140px]">
      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
    </div>
  );
}
