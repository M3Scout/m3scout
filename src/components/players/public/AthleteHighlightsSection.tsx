import { motion } from "framer-motion";
import { Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AthleteHighlightsSectionProps {
  strengths: string[] | null;
}

// Premium strength badge with glow effect
function StrengthBadge({ label, index }: { label: string; index: number }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            whileHover={{ 
              scale: 1.05, 
              y: -2,
              transition: { duration: 0.2 } 
            }}
            className={cn(
              "group relative cursor-default",
              "px-4 py-2.5 rounded-xl",
              "bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-emerald-600/5",
              "border border-emerald-500/25",
              "shadow-[0_2px_12px_-4px_rgba(16,185,129,0.2)]",
              "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.35)]",
              "hover:border-emerald-500/40",
              "transition-all duration-300"
            )}
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
            
            <div className="relative flex items-center gap-2">
              <div className="p-1 rounded-md bg-emerald-500/20">
                <Zap className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">
                {label}
              </span>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-zinc-900 border-zinc-800 text-zinc-200"
        >
          <p className="text-xs">Ponto forte destacado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AthleteHighlightsSection({ strengths }: AthleteHighlightsSectionProps) {
  const hasStrengths = Array.isArray(strengths) && strengths.length > 0;

  // If no strengths to show, return null
  if (!hasStrengths) {
    return null;
  }

  return (
    <motion.section
      className="mb-8 md:mb-12"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
    >
      {/* Section Header - Clean and focused */}
      <motion.div variants={staggerItem} className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/15">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">
            Pontos Fortes
          </h2>
        </div>
        <p className="text-xs text-muted-foreground ml-9">
          Características de maior impacto no jogo
        </p>
      </motion.div>

      {/* Strengths Grid - Clean chips layout */}
      <motion.div 
        variants={staggerItem}
        className="flex flex-wrap gap-2.5"
      >
        {strengths!.map((strength, index) => (
          <StrengthBadge key={strength} label={strength} index={index} />
        ))}
      </motion.div>
    </motion.section>
  );
}
