import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Ruler, 
  Footprints, 
  MessageCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPositionColor } from "@/lib/positionColors";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/lib/imageUtils";

interface AthleteHeroSectionProps {
  player: {
    full_name: string;
    slug: string;
    position: string;
    age: number | null;
    height: number | null;
    dominant_foot: string | null;
    current_club: string | null;
    photo_url: string | null;
    primary_tactical_role: string | null;
    play_style: string | null;
  };
  contractStatus?: string | null;
}

// Mini info card component
function InfoMiniCard({ 
  icon: Icon, 
  value, 
  label,
  delay = 0,
}: { 
  icon: React.ElementType;
  value: string | number;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative flex items-center gap-3 p-3 transition-all duration-300 cursor-default group",
        "rounded-[14px]",
        // Glassmorphism
        "bg-white/[0.04]",
        "border border-white/[0.06]",
        "hover:bg-white/[0.06]",
        "hover:border-white/[0.1]"
      )}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-[14px] bg-white/[0.02] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10" />
      
      {/* Icon */}
      <div className="p-2 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.08] transition-colors">
        <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
      </div>
      
      {/* Content */}
      <div>
        <div className="text-base md:text-lg font-bold text-white tabular-nums leading-none mb-0.5">
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-medium">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

export function AthleteHeroSection({ player, contractStatus }: AthleteHeroSectionProps) {
  const positionColor = getPositionColor(player.position);
  
  return (
    <motion.section 
      className="grid md:grid-cols-[320px,1fr] lg:grid-cols-[360px,1fr] gap-6 lg:gap-10 mb-10 md:mb-14"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ============ COLUNA ESQUERDA - FOTO ============ */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className={cn(
          "relative aspect-[3/4] overflow-hidden group",
          // Premium card styling
          "rounded-3xl",
          "bg-white/[0.03]",
          "border border-white/[0.06]",
          // Elevated shadow
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
        )}>
          {/* Image */}
          <img
            src={getOptimizedImageUrl(player.photo_url, { width: 1500, quality: 85, format: "avif" }) || player.photo_url || ""}
            srcSet={getResponsiveSrcSet(player.photo_url, [750, 1500], 85) || undefined}
            sizes="100vw"
            alt={player.full_name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            onError={(e) => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
          />
          
          {/* Gradient overlay - bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Left accent line */}
          <div className={cn("absolute top-0 left-0 w-1 h-full", positionColor.accentClass)} />

          {/* Position badge - on photo */}
          <motion.div 
            className="absolute bottom-5 left-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <span className={cn(
              "inline-flex items-center gap-1.5",
              "px-4 py-2 rounded-full",
              "text-[11px] font-bold uppercase tracking-[0.15em]",
              positionColor.bgClass,
              positionColor.textClass,
              positionColor.borderClass,
              "border backdrop-blur-sm",
              // Glow effect
              "shadow-[0_4px_20px_-4px]",
              positionColor.glowClass
            )}>
              {player.position}
            </span>
          </motion.div>
          
          {/* Top right corner accent */}
          <div className={cn(
            "absolute top-0 right-0 w-28 h-28 rounded-bl-[60px]",
            "bg-gradient-to-bl from-white/[0.04] to-transparent"
          )} />
        </div>
      </motion.div>

      {/* ============ COLUNA DIREITA - INFO ============ */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col justify-center py-2"
      >
        {/* Name */}
        <motion.h1 
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {player.full_name}
        </motion.h1>
        
        {/* Badges row - Posição + Perfil de Jogo */}
        <motion.div 
          className="flex flex-wrap items-center gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Primary tactical role badge */}
          {player.primary_tactical_role && (
            <span className={cn(
              "inline-flex items-center gap-1.5",
              "px-3 py-1.5 rounded-full",
              "text-xs font-semibold",
              positionColor.bgClass,
              positionColor.textClass,
              positionColor.borderClass,
              "border"
            )}>
              {player.primary_tactical_role}
            </span>
          )}
          
          {/* Play style badge - neutral */}
          {player.play_style && (
            <span className={cn(
              "inline-flex items-center gap-1.5",
              "px-3 py-1.5 rounded-full",
              "text-xs font-medium",
              "bg-white/[0.06] text-zinc-300",
              "border border-white/[0.08]"
            )}>
              <Sparkles className="w-3 h-3 text-zinc-400" />
              {player.play_style}
            </span>
          )}
        </motion.div>

        {/* Info Grid - Mini cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-8">
          {player.age && (
            <InfoMiniCard 
              icon={Calendar} 
              value={player.age} 
              label="Anos"
              delay={0.35}
            />
          )}
          {player.height && (
            <InfoMiniCard 
              icon={Ruler} 
              value={`${player.height}cm`} 
              label="Altura"
              delay={0.4}
            />
          )}
          {player.dominant_foot && (
            <InfoMiniCard 
              icon={Footprints} 
              value={player.dominant_foot} 
              label="Pé"
              delay={0.45}
            />
          )}
          {player.current_club && (
            <InfoMiniCard 
              icon={MapPin} 
              value={player.current_club} 
              label="Clube"
              delay={0.5}
            />
          )}
        </div>

        {/* CTA Button - Premium gradient */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Link to={`/contact?player=${player.slug}`}>
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative inline-flex items-center justify-center gap-2.5",
                "w-full sm:w-auto",
                "px-8 h-[52px] rounded-[14px]",
                "font-semibold text-white text-sm",
                // Gradient: vermelho → vinho
                "bg-gradient-to-r from-red-600 via-red-700 to-rose-900",
                // Premium shadow
                "shadow-[0_8px_32px_-8px_rgba(220,38,38,0.4)]",
                "hover:shadow-[0_12px_40px_-8px_rgba(220,38,38,0.5)]",
                "transition-all duration-300",
                "overflow-hidden"
              )}
            >
              {/* Shine sweep effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              
              <MessageCircle className="w-4.5 h-4.5 relative z-10" />
              <span className="relative z-10 hidden sm:inline">Falar com a M3 sobre este atleta</span>
              <span className="relative z-10 sm:hidden">Falar sobre atleta</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
