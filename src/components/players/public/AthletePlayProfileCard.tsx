import { motion } from "framer-motion";
import { Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerItem } from "@/lib/animations";

interface AthletePlayProfileCardProps {
  playStyle: string | null;
  primaryTacticalRole: string | null;
  secondaryTacticalRole: string | null;
  position: string;
}

export function AthletePlayProfileCard({ 
  playStyle, 
  primaryTacticalRole, 
  secondaryTacticalRole,
  position,
}: AthletePlayProfileCardProps) {
  // Only render if we have play style or tactical role
  if (!playStyle && !primaryTacticalRole) return null;

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        "relative p-5 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-zinc-800/40 via-zinc-900/30 to-transparent",
        "border border-zinc-700/30",
        "shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)]"
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }} 
      />
      
      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-500/15">
          <Target className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Perfil de Jogo</h3>
          <p className="text-[10px] text-muted-foreground">Como o atleta atua em campo</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative space-y-3">
        {/* Play Style - Main identity */}
        {playStyle && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-base font-semibold text-foreground">{playStyle}</span>
          </div>
        )}

        {/* Tactical roles */}
        <div className="flex flex-wrap gap-2">
          {/* Position */}
          <span className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-lg",
            "bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide"
          )}>
            {position}
          </span>
          
          {/* Primary Role */}
          {primaryTacticalRole && (
            <span className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-lg",
              "bg-blue-500/10 text-blue-400 text-xs font-medium"
            )}>
              {primaryTacticalRole}
            </span>
          )}
          
          {/* Secondary Role */}
          {secondaryTacticalRole && (
            <span className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-lg",
              "bg-zinc-800/60 text-zinc-400 text-xs font-medium"
            )}>
              {secondaryTacticalRole}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
