import { motion } from "framer-motion";
import { 
  Zap, 
  Star, 
  Target, 
  Shield, 
  Sparkles,
  Award,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardHover, pillHover, staggerContainer, staggerItem } from "@/lib/animations";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AthleteHighlightsSectionProps {
  strengths: string[] | null;
  playStyle: string | null;
  primaryTacticalRole: string | null;
  secondaryTacticalRole: string | null;
  contractStatus: string | null;
  currentClub: string | null;
  autoRating: number | null;
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

// Status indicator card
function StatusCard({ 
  contractStatus, 
  currentClub 
}: { 
  contractStatus: string | null; 
  currentClub: string | null;
}) {
  const isContracted = contractStatus === "contracted";
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      whileHover={cardHover}
      className={cn(
        "relative p-4 rounded-xl overflow-hidden",
        "border transition-all duration-300",
        isContracted 
          ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20"
          : "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20"
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }} 
      />
      
      <div className="relative flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isContracted ? "bg-emerald-500/15" : "bg-amber-500/15"
        )}>
          {isContracted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <TrendingUp className="w-5 h-5 text-amber-400" />
          )}
        </div>
        
        <div>
          <p className={cn(
            "text-sm font-semibold",
            isContracted ? "text-emerald-300" : "text-amber-300"
          )}>
            {isContracted ? "Atleta Contratado" : "Disponível no Mercado"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentClub || (isContracted ? "Clube atual" : "Sem clube")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Play style identity card
function PlayStyleCard({ 
  playStyle, 
  primaryRole, 
  secondaryRole 
}: { 
  playStyle: string | null;
  primaryRole: string | null;
  secondaryRole: string | null;
}) {
  if (!playStyle && !primaryRole) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      whileHover={cardHover}
      className={cn(
        "relative p-4 rounded-xl overflow-hidden",
        "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent",
        "border border-blue-500/20",
        "transition-all duration-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/15">
          <Target className="w-5 h-5 text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          {playStyle && (
            <p className="text-sm font-semibold text-blue-300 mb-1">
              {playStyle}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {primaryRole && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/10 text-[11px] font-medium text-blue-400">
                {primaryRole}
              </span>
            )}
            {secondaryRole && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-800/60 text-[11px] font-medium text-zinc-400">
                {secondaryRole}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Rating badge with star
function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return null;

  const displayRating = Math.min(100, Math.max(0, Math.round(rating)));
  
  // Color based on rating tier
  const getTierStyle = (r: number) => {
    if (r >= 85) return { 
      gradient: "from-amber-400/20 via-yellow-500/15 to-orange-500/10",
      border: "border-amber-500/30",
      text: "text-amber-300",
      glow: "shadow-[0_0_20px_-4px_rgba(251,191,36,0.3)]"
    };
    if (r >= 70) return { 
      gradient: "from-emerald-400/15 via-emerald-500/10 to-teal-500/5",
      border: "border-emerald-500/25",
      text: "text-emerald-300",
      glow: "shadow-[0_0_16px_-4px_rgba(16,185,129,0.25)]"
    };
    return { 
      gradient: "from-zinc-400/10 via-zinc-500/5 to-zinc-600/5",
      border: "border-zinc-600/30",
      text: "text-zinc-300",
      glow: ""
    };
  };

  const style = getTierStyle(displayRating);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3, type: "spring" }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-gradient-to-br",
        style.gradient,
        style.border,
        style.glow,
        "border transition-all duration-300"
      )}
    >
      <div className="p-1.5 rounded-lg bg-white/5">
        <Star className={cn("w-4 h-4", style.text)} fill="currentColor" />
      </div>
      <div>
        <p className={cn("text-lg font-bold tabular-nums", style.text)}>
          {displayRating}
        </p>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Rating
        </p>
      </div>
    </motion.div>
  );
}

export function AthleteHighlightsSection({
  strengths,
  playStyle,
  primaryTacticalRole,
  secondaryTacticalRole,
  contractStatus,
  currentClub,
  autoRating,
}: AthleteHighlightsSectionProps) {
  const hasStrengths = Array.isArray(strengths) && strengths.length > 0;
  const hasIdentity = playStyle || primaryTacticalRole;

  // If no data to show, return null
  if (!hasStrengths && !hasIdentity && !contractStatus && !autoRating) {
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
      {/* Section Header */}
      <motion.div 
        variants={staggerItem}
        className="flex items-center gap-2 mb-4 md:mb-5"
      >
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Award className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-base md:text-lg font-semibold text-foreground">
          Destaques do Atleta
        </h2>
      </motion.div>

      {/* Top Row: Status + Play Style + Rating */}
      <motion.div 
        variants={staggerItem}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5"
      >
        <StatusCard 
          contractStatus={contractStatus} 
          currentClub={currentClub} 
        />
        
        <PlayStyleCard 
          playStyle={playStyle}
          primaryRole={primaryTacticalRole}
          secondaryRole={secondaryTacticalRole}
        />
        
        {autoRating && (
          <div className="flex items-center justify-center sm:justify-start">
            <RatingBadge rating={autoRating} />
          </div>
        )}
      </motion.div>

      {/* Strengths Grid */}
      {hasStrengths && (
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">
              Pontos Fortes
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {strengths!.map((strength, index) => (
              <StrengthBadge key={strength} label={strength} index={index} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
