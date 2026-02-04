import { motion } from "framer-motion";
import { Target, Zap, ArrowRight } from "lucide-react";
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
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerItem}
      className="mb-10 md:mb-14"
    >
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 max-w-8 bg-gradient-to-r from-transparent to-zinc-700/50" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Perfil de Jogo
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/50 to-transparent" />
      </div>

      {/* Main Content Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-950/90",
          "border border-zinc-800/60",
          "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Decorative top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        {/* Content Grid */}
        <div className="p-5 md:p-6">
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-5 md:gap-8 items-center">
            
            {/* Left: Play Style Identity */}
            {playStyle && (
              <div className="text-center md:text-left">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-2">
                  Estilo de Jogo
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                    {playStyle}
                  </span>
                </div>
              </div>
            )}
            
            {/* Center Divider (desktop only) */}
            {playStyle && primaryTacticalRole && (
              <div className="hidden md:flex flex-col items-center gap-1 self-stretch py-2">
                <div className="w-px flex-1 bg-gradient-to-b from-transparent via-zinc-700/50 to-transparent" />
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 rotate-90 md:rotate-0" />
                <div className="w-px flex-1 bg-gradient-to-b from-transparent via-zinc-700/50 to-transparent" />
              </div>
            )}
            
            {/* Right: Tactical Function */}
            <div className="text-center md:text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500 mb-3">
                Função Tática
              </p>
              
              {/* Position Chips Flow */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {/* Primary Position - Highlighted */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl",
                  "bg-gradient-to-br from-primary/15 to-primary/5",
                  "border border-primary/25",
                  "text-xs font-bold uppercase tracking-wider text-primary",
                  "shadow-[0_2px_12px_-4px_rgba(var(--primary-rgb),0.3)]"
                )}>
                  <Target className="w-3.5 h-3.5" />
                  {position}
                </span>
                
                {/* Primary Role */}
                {primaryTacticalRole && (
                  <span className={cn(
                    "inline-flex items-center px-3 py-2 rounded-xl",
                    "bg-zinc-800/60 border border-zinc-700/40",
                    "text-xs font-semibold text-zinc-300"
                  )}>
                    {primaryTacticalRole}
                  </span>
                )}
                
                {/* Secondary Role - Subtle */}
                {secondaryTacticalRole && (
                  <span className={cn(
                    "inline-flex items-center px-3 py-2 rounded-xl",
                    "bg-zinc-900/60 border border-zinc-800/40",
                    "text-xs font-medium text-zinc-500"
                  )}>
                    {secondaryTacticalRole}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent" />
      </motion.div>
    </motion.section>
  );
}
