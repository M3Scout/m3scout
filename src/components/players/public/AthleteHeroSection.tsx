import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Ruler, 
  User, 
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

// Info stat card component
function InfoStatCard({ 
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={cn(
        "relative p-3 md:p-4 transition-all duration-300 cursor-default group",
        "rounded-2xl",
        "bg-gradient-to-br from-zinc-800/50 via-zinc-900/40 to-transparent",
        "border border-zinc-700/20",
        "hover:border-zinc-600/30 hover:from-zinc-700/50",
        "shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]",
        "hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)]"
      )}
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div className="p-1.5 rounded-lg bg-zinc-800/60 w-fit mb-2">
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
        </div>
        <div className="text-lg md:text-xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  );
}

export function AthleteHeroSection({ player, contractStatus }: AthleteHeroSectionProps) {
  return (
    <motion.section 
      className="grid md:grid-cols-[280px,1fr] lg:grid-cols-[320px,1fr] gap-6 lg:gap-10 mb-10 md:mb-14"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Photo Column */}
      <motion.div variants={staggerItem} className="relative">
        <div className={cn(
          "relative aspect-[3/4] md:aspect-auto md:h-[420px] overflow-hidden group",
          "rounded-3xl"
        )}>
          {/* Image with premium styling */}
          <img
            src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
            alt={player.full_name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          
          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Position badge with glow */}
          <motion.div 
            className="absolute bottom-4 left-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <span className={cn(
              "relative px-4 py-2 text-xs font-bold uppercase tracking-widest",
              "bg-primary text-primary-foreground rounded-xl",
              "shadow-[0_4px_20px_-4px] shadow-primary/40"
            )}>
              {player.position}
              
              {/* Subtle glow effect */}
              <span className="absolute inset-0 rounded-xl bg-primary/30 blur-md -z-10" />
            </span>
          </motion.div>
          
          {/* Corner accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-3xl" />
        </div>
      </motion.div>

      {/* Info Column */}
      <motion.div variants={staggerItem} className="flex flex-col justify-center">
        {/* Name with gradient underline */}
        <div className="relative mb-3">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            {player.full_name}
          </h1>
          <motion.div 
            className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "3rem" }}
            transition={{ delay: 0.4, duration: 0.5 }}
          />
        </div>
        
        {/* Status Badge - positioned near the name */}
        <div className="mb-5 md:mb-6">
          <AthleteStatusBadge 
            contractStatus={contractStatus} 
            currentClub={player.current_club} 
          />
        </div>

        {/* Info Grid with stagger animation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3 mb-6 md:mb-8">
          {player.age && (
            <InfoStatCard 
              icon={Calendar} 
              value={player.age} 
              label="Anos"
              delay={0.1}
            />
          )}
          {player.height && (
            <InfoStatCard 
              icon={Ruler} 
              value={`${player.height}cm`} 
              label="Altura"
              delay={0.15}
            />
          )}
          {player.dominant_foot && (
            <InfoStatCard 
              icon={User} 
              value={player.dominant_foot} 
              label="Pé"
              delay={0.2}
            />
          )}
          {player.current_club && (
            <InfoStatCard 
              icon={MapPin} 
              value={player.current_club} 
              label="Clube"
              delay={0.25}
            />
          )}
        </div>

        {/* Premium CTA Button with enhanced effects */}
        <Link to={`/contact?player=${player.slug}`}>
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative inline-flex items-center gap-2",
              "px-6 md:px-8 py-3 md:py-4 rounded-2xl",
              "font-semibold text-primary-foreground text-sm md:text-base",
              "bg-gradient-to-r from-primary via-primary to-primary/90",
              "shadow-[0_8px_32px_-8px] shadow-primary/40",
              "hover:shadow-[0_12px_40px_-8px] hover:shadow-primary/50",
              "transition-all duration-300"
            )}
          >
            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Falar com a M3 sobre este atleta</span>
            <span className="sm:hidden">Falar sobre atleta</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            
            {/* Animated glow ring */}
            <motion.div 
              className="absolute inset-0 rounded-2xl border-2 border-primary/30"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Background glow */}
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </motion.button>
        </Link>
      </motion.div>
    </motion.section>
  );
}
