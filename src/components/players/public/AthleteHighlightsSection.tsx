import { motion } from "framer-motion";
import { Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface AthleteHighlightsSectionProps {
  strengths: string[] | null;
}

// Premium strength chip with refined styling
function StrengthChip({ label, index }: { label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        scale: 1.04, 
        y: -3,
        transition: { duration: 0.2, ease: "easeOut" } 
      }}
      className={cn(
        "group relative cursor-default",
        "px-4 py-2.5 rounded-xl",
        // Refined gradient with depth
        "bg-gradient-to-br from-emerald-500/12 via-emerald-600/8 to-emerald-700/4",
        "border border-emerald-500/20",
        // Elevated shadow
        "shadow-[0_4px_16px_-6px_rgba(16,185,129,0.25)]",
        "hover:shadow-[0_8px_28px_-6px_rgba(16,185,129,0.4)]",
        "hover:border-emerald-400/35",
        "transition-all duration-300"
      )}
    >
      {/* Soft glow on hover */}
      <div className="absolute inset-0 rounded-xl bg-emerald-500/8 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
      
      {/* Inner highlight line */}
      <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-center gap-2.5">
        {/* Icon container with glow */}
        <div className={cn(
          "p-1.5 rounded-lg",
          "bg-emerald-500/15 group-hover:bg-emerald-500/25",
          "transition-colors duration-300"
        )}>
          <Zap className="w-3 h-3 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        </div>
        
        {/* Label */}
        <span className={cn(
          "text-sm font-semibold tracking-wide",
          "text-emerald-300/90 group-hover:text-emerald-200",
          "transition-colors duration-300"
        )}>
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export function AthleteHighlightsSection({ strengths }: AthleteHighlightsSectionProps) {
  const hasStrengths = Array.isArray(strengths) && strengths.length > 0;

  if (!hasStrengths) {
    return null;
  }

  return (
    <motion.section
      className="mb-10 md:mb-14"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
    >
      {/* Premium Section Header */}
      <motion.div variants={staggerItem} className="mb-6">
        {/* Label with decorative lines */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 max-w-8 bg-gradient-to-r from-transparent to-emerald-600/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500/70">
            Destaques
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-600/30 to-transparent" />
        </div>
        
        {/* Title with icon */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            "bg-gradient-to-br from-emerald-500/15 to-emerald-600/5",
            "border border-emerald-500/20",
            "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]"
          )}>
            <Star className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
              Pontos Fortes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Características de maior impacto no jogo
            </p>
          </div>
        </div>
      </motion.div>

      {/* Strengths Grid - Refined layout */}
      <motion.div 
        variants={staggerItem}
        className="flex flex-wrap gap-3"
      >
        {strengths!.map((strength, index) => (
          <StrengthChip key={strength} label={strength} index={index} />
        ))}
      </motion.div>
    </motion.section>
  );
}
