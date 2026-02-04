import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Ruler, 
  Footprints, 
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { AthleteStatusBadge } from "./AthleteStatusBadge";

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

// Premium info stat with refined hierarchy
function InfoStat({ 
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.02 }}
      className={cn(
        "relative p-4 transition-all duration-300 cursor-default group",
        "rounded-xl",
        // Refined glass effect
        "bg-gradient-to-br from-zinc-800/60 via-zinc-900/50 to-zinc-950/40",
        "border border-zinc-700/30",
        "hover:border-zinc-600/40",
        // Premium shadow
        "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]",
        "hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
      )}
    >
      {/* Top highlight */}
      <div className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        {/* Icon */}
        <div className="p-1.5 rounded-lg bg-zinc-800/80 w-fit mb-2.5 group-hover:bg-zinc-700/80 transition-colors">
          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
        </div>
        
        {/* Value - prominent */}
        <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums tracking-tight mb-0.5">
          {value}
        </div>
        
        {/* Label - subtle */}
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

export function AthleteHeroSection({ player, contractStatus }: AthleteHeroSectionProps) {
  return (
    <motion.section 
      className="grid md:grid-cols-[300px,1fr] lg:grid-cols-[340px,1fr] gap-8 lg:gap-12 mb-10 md:mb-14"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Photo Column - Premium frame */}
      <motion.div variants={staggerItem} className="relative">
        <div className={cn(
          "relative aspect-[3/4] md:aspect-auto md:h-[440px] overflow-hidden group",
          "rounded-2xl",
          // Frame effect
          "ring-1 ring-zinc-800/50"
        )}>
          {/* Image */}
          <img
            src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
            alt={player.full_name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Position badge - bottom left */}
          <motion.div 
            className="absolute bottom-5 left-5"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
          >
            <span className={cn(
              "relative px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em]",
              "bg-primary text-primary-foreground rounded-lg",
              "shadow-[0_4px_24px_-4px] shadow-primary/50"
            )}>
              {player.position}
              {/* Glow */}
              <span className="absolute inset-0 rounded-lg bg-primary/40 blur-lg -z-10" />
            </span>
          </motion.div>
          
          {/* Corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-2xl" />
        </div>
      </motion.div>

      {/* Info Column */}
      <motion.div variants={staggerItem} className="flex flex-col justify-center">
        {/* Name block */}
        <div className="mb-4">
          <motion.h1 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {player.full_name}
          </motion.h1>
          
          {/* Animated underline */}
          <motion.div 
            className="h-1 mt-2 bg-gradient-to-r from-primary via-primary/70 to-transparent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "4rem" }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        
        {/* Status Badge */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AthleteStatusBadge 
            contractStatus={contractStatus} 
            currentClub={player.current_club} 
          />
        </motion.div>

        {/* Info Grid - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {player.age && (
            <InfoStat 
              icon={Calendar} 
              value={player.age} 
              label="Idade"
              delay={0.15}
            />
          )}
          {player.height && (
            <InfoStat 
              icon={Ruler} 
              value={`${player.height}cm`} 
              label="Altura"
              delay={0.2}
            />
          )}
          {player.dominant_foot && (
            <InfoStat 
              icon={Footprints} 
              value={player.dominant_foot} 
              label="Pé Dominante"
              delay={0.25}
            />
          )}
          {player.current_club && (
            <InfoStat 
              icon={MapPin} 
              value={player.current_club} 
              label="Clube Atual"
              delay={0.3}
            />
          )}
        </div>

        {/* CTA Button - Premium treatment */}
        <Link to={`/contact?player=${player.slug}`}>
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative inline-flex items-center gap-2.5",
              "px-7 py-4 rounded-xl",
              "font-semibold text-primary-foreground text-sm",
              // Gradient background
              "bg-gradient-to-r from-primary to-primary/85",
              // Premium shadow
              "shadow-[0_8px_32px_-8px] shadow-primary/45",
              "hover:shadow-[0_12px_40px_-8px] hover:shadow-primary/55",
              "transition-all duration-300"
            )}
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">Falar com a M3 sobre este atleta</span>
            <span className="sm:hidden">Falar sobre atleta</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            
            {/* Pulsing ring effect */}
            <motion.div 
              className="absolute inset-0 rounded-xl border-2 border-primary/20"
              animate={{ 
                scale: [1, 1.06, 1],
                opacity: [0.4, 0, 0.4]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Glow on hover */}
            <div className="absolute inset-0 rounded-xl bg-primary/25 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          </motion.button>
        </Link>
      </motion.div>
    </motion.section>
  );
}
