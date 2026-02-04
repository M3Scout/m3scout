import { motion } from "framer-motion";
import { 
  Zap, 
  Star, 
  Target, 
  Flame,
  Shield,
  Eye,
  Crosshair,
  Sparkles,
  TrendingUp,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface AthleteHighlightsSectionProps {
  strengths: string[] | null;
}

// Icon mapping for common strength keywords
const getStrengthIcon = (label: string, index: number) => {
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes("visão") || lowerLabel.includes("leitura")) return Eye;
  if (lowerLabel.includes("finaliza") || lowerLabel.includes("chute")) return Crosshair;
  if (lowerLabel.includes("bola parada") || lowerLabel.includes("falta")) return Target;
  if (lowerLabel.includes("velocidade") || lowerLabel.includes("explosão")) return Zap;
  if (lowerLabel.includes("defesa") || lowerLabel.includes("marcação")) return Shield;
  if (lowerLabel.includes("intensidade") || lowerLabel.includes("raça")) return Flame;
  if (lowerLabel.includes("passe") || lowerLabel.includes("distribuição")) return TrendingUp;
  if (lowerLabel.includes("drible") || lowerLabel.includes("1x1")) return Sparkles;
  
  // Rotate through icons for variety
  const fallbackIcons = [Zap, Target, Flame, Star, Sparkles, Award];
  return fallbackIcons[index % fallbackIcons.length];
};

// Premium strength card with refined design
function StrengthCard({ label, index }: { label: string; index: number }) {
  const Icon = getStrengthIcon(label, index);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        y: -6,
        scale: 1.02,
        transition: { duration: 0.25, ease: "easeOut" } 
      }}
      className={cn(
        "group relative cursor-default",
        "flex flex-col items-center justify-center",
        "p-5 md:p-6 rounded-2xl",
        "min-h-[120px] md:min-h-[130px]",
        // Premium glass morphism
        "bg-gradient-to-br from-emerald-950/50 via-emerald-900/30 to-zinc-900/50",
        "backdrop-blur-sm",
        // Refined border
        "border border-emerald-500/20",
        "hover:border-emerald-400/40",
        // Deep shadow with glow
        "shadow-[0_8px_32px_-8px_rgba(16,185,129,0.15)]",
        "hover:shadow-[0_16px_48px_-8px_rgba(16,185,129,0.35)]",
        "transition-all duration-400"
      )}
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Corner glow */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Ambient glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-400 -z-10" />
      
      {/* Icon container with glow ring */}
      <div className="relative mb-3">
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(16,185,129,0)",
              "0 0 0 8px rgba(16,185,129,0.1)",
              "0 0 0 0 rgba(16,185,129,0)"
            ]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10",
            "border border-emerald-500/25",
            "group-hover:from-emerald-500/30 group-hover:to-emerald-600/15",
            "group-hover:border-emerald-400/40",
            "transition-all duration-300"
          )}
        >
          <Icon className={cn(
            "w-5 h-5 text-emerald-400",
            "group-hover:text-emerald-300",
            "transition-colors duration-300"
          )} />
        </motion.div>
      </div>
      
      {/* Label */}
      <span className={cn(
        "text-sm md:text-base font-semibold text-center",
        "text-emerald-200/90 group-hover:text-emerald-100",
        "transition-colors duration-300",
        "leading-tight"
      )}>
        {label}
      </span>
      
      {/* Subtle indicator dot */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500/40 group-hover:bg-emerald-400/60 transition-colors" />
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
      className="mb-12 md:mb-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
    >
      {/* Premium Section Header */}
      <motion.div variants={staggerItem} className="mb-8">
        {/* Decorative label line */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-500/80">
            Qualidades
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
        </div>
        
        {/* Title block with icon */}
        <div className="flex items-start gap-4">
          {/* Premium icon container */}
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 3 }}
            className={cn(
              "relative p-3 rounded-xl",
              "bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent",
              "border border-emerald-500/25",
              "shadow-[0_4px_24px_-8px_rgba(16,185,129,0.25)]"
            )}
          >
            <Star className="w-5 h-5 text-emerald-400" />
            {/* Glow behind */}
            <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-xl -z-10" />
          </motion.div>
          
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Pontos Fortes
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-md">
              Características que definem a identidade técnica do atleta
            </p>
          </div>
        </div>
      </motion.div>

      {/* Strengths Grid - responsive cards */}
      <motion.div 
        variants={staggerItem}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {strengths!.map((strength, index) => (
          <StrengthCard key={strength} label={strength} index={index} />
        ))}
      </motion.div>
      
      {/* Bottom decorative element */}
      <motion.div 
        variants={staggerItem}
        className="flex justify-center mt-8"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-emerald-500/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
          <div className="w-8 h-px bg-gradient-to-r from-emerald-500/30 to-transparent" />
        </div>
      </motion.div>
    </motion.section>
  );
}
