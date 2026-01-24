import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Trophy, 
  Loader2, 
  Star,
  Target,
  Users,
  Clock,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { fadeInUp } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_tier: string;
  unlocked_at: string;
  season_year: number;
  metadata: Record<string, unknown> | null;
}

interface AthleteAchievementsCardProps {
  athleteId: string;
}

// Storage key for seen achievements
const getSeenAchievementsKey = (athleteId: string, year: number) => 
  `achievements_seen_${athleteId}_${year}`;

// Confetti celebration for new achievements
function fireAchievementConfetti(tier: string) {
  const tierColors: Record<string, string[]> = {
    bronze: ["#CD7F32", "#B8860B", "#D2691E", "#ffffff"],
    silver: ["#C0C0C0", "#A8A8A8", "#D3D3D3", "#ffffff"],
    gold: ["#FFD700", "#FFA500", "#FFEC8B", "#ffffff", "#facc15"],
    platinum: ["#00CED1", "#00BFFF", "#87CEEB", "#ffffff", "#E5E4E2"],
  };

  const colors = tierColors[tier] || tierColors.gold;
  
  // Multi-burst celebration
  const defaults = {
    particleCount: 100,
    spread: 80,
    startVelocity: 40,
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
  };

  // Left burst
  confetti({ ...defaults, origin: { x: 0.25, y: 0.6 }, angle: 60 });
  
  // Right burst
  confetti({ ...defaults, origin: { x: 0.75, y: 0.6 }, angle: 120 });
  
  // Center burst with delay
  setTimeout(() => {
    confetti({ 
      ...defaults, 
      origin: { x: 0.5, y: 0.5 }, 
      angle: 90,
      particleCount: 80,
      spread: 100,
    });
  }, 200);

  // Extra sparkle for gold/platinum
  if (tier === "gold" || tier === "platinum") {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 120,
        startVelocity: 25,
        colors,
        origin: { x: 0.5, y: 0.4 },
        zIndex: 9999,
        scalar: 0.8,
      });
    }, 400);
  }
}

const ACHIEVEMENT_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  description: Record<string, string>;
  thresholds: Record<string, number>;
}> = {
  scorer: {
    label: "Artilheiro",
    icon: Target,
    description: {
      bronze: "Marque 5 gols na temporada",
      silver: "Marque 15 gols na temporada",
      gold: "Marque 25 gols na temporada",
    },
    thresholds: { bronze: 5, silver: 15, gold: 25 },
  },
  playmaker: {
    label: "Garçom",
    icon: Users,
    description: {
      bronze: "Dê 5 assistências na temporada",
      silver: "Dê 12 assistências na temporada",
      gold: "Dê 20 assistências na temporada",
    },
    thresholds: { bronze: 5, silver: 12, gold: 20 },
  },
  veteran: {
    label: "Veterano",
    icon: Star,
    description: {
      bronze: "Jogue 10 partidas na temporada",
      silver: "Jogue 25 partidas na temporada",
      gold: "Jogue 40 partidas na temporada",
    },
    thresholds: { bronze: 10, silver: 25, gold: 40 },
  },
  ironman: {
    label: "Incansável",
    icon: Clock,
    description: {
      bronze: "Acumule 1.000 minutos em campo",
      silver: "Acumule 2.500 minutos em campo",
      gold: "Acumule 4.000 minutos em campo",
    },
    thresholds: { bronze: 1000, silver: 2500, gold: 4000 },
  },
  wall: {
    label: "Muralha",
    icon: Shield,
    description: {
      bronze: "5 jogos sem sofrer gols",
      silver: "12 jogos sem sofrer gols",
      gold: "20 jogos sem sofrer gols",
    },
    thresholds: { bronze: 5, silver: 12, gold: 20 },
  },
};

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze: { 
    bg: "bg-gradient-to-br from-amber-700/30 to-orange-800/20",
    border: "border-amber-600/40",
    text: "text-amber-400",
    glow: "shadow-amber-500/20"
  },
  silver: { 
    bg: "bg-gradient-to-br from-zinc-400/30 to-slate-500/20",
    border: "border-zinc-400/40",
    text: "text-zinc-300",
    glow: "shadow-zinc-400/20"
  },
  gold: { 
    bg: "bg-gradient-to-br from-yellow-500/30 to-amber-500/20",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    glow: "shadow-yellow-500/30"
  },
  platinum: { 
    bg: "bg-gradient-to-br from-cyan-400/30 to-blue-500/20",
    border: "border-cyan-400/40",
    text: "text-cyan-300",
    glow: "shadow-cyan-400/30"
  },
};

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  platinum: "Platina",
};

export function AthleteAchievementsCard({ athleteId }: AthleteAchievementsCardProps) {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());
  const hasCheckedNewRef = useRef(false);
  const currentYear = new Date().getFullYear();

  // Check for new achievements and trigger celebration
  const checkForNewAchievements = useCallback((fetchedAchievements: Achievement[]) => {
    if (hasCheckedNewRef.current || fetchedAchievements.length === 0) return;
    hasCheckedNewRef.current = true;

    const storageKey = getSeenAchievementsKey(athleteId, currentYear);
    const seenIds = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    
    const newAchievements = fetchedAchievements.filter(a => !seenIds.has(a.id));
    
    if (newAchievements.length > 0) {
      // Mark as newly unlocked for animation
      setNewlyUnlocked(new Set(newAchievements.map(a => a.id)));
      
      // Fire confetti for the highest tier new achievement
      const tierPriority: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
      const highestTier = newAchievements.reduce((best, curr) => 
        (tierPriority[curr.achievement_tier] || 0) > (tierPriority[best.achievement_tier] || 0) ? curr : best
      );
      
      // Delay confetti slightly for dramatic effect
      setTimeout(() => {
        fireAchievementConfetti(highestTier.achievement_tier);
      }, 500);
      
      // Update localStorage with all seen achievements
      const allIds = fetchedAchievements.map(a => a.id);
      localStorage.setItem(storageKey, JSON.stringify(allIds));
      
      // Clear newly unlocked highlight after animation
      setTimeout(() => setNewlyUnlocked(new Set()), 3000);
    }
  }, [athleteId, currentYear]);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const { data, error } = await supabase
          .from("player_achievements")
          .select("*")
          .eq("player_id", athleteId)
          .eq("season_year", currentYear)
          .order("unlocked_at", { ascending: false });

        if (error) throw error;
        
        const mapped = (data || []).map(d => ({
          ...d,
          metadata: (typeof d.metadata === 'object' && d.metadata !== null) ? d.metadata as Record<string, unknown> : null
        }));
        
        setAchievements(mapped);
        checkForNewAchievements(mapped);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [athleteId, currentYear, checkForNewAchievements]);

  // Group achievements by type and get highest tier
  const achievementsByType = achievements.reduce((acc, ach) => {
    if (!acc[ach.achievement_type] || 
        getTierPriority(ach.achievement_tier) > getTierPriority(acc[ach.achievement_type].achievement_tier)) {
      acc[ach.achievement_type] = ach;
    }
    return acc;
  }, {} as Record<string, Achievement>);

  function getTierPriority(tier: string): number {
    const priorities: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    return priorities[tier] || 0;
  }

  if (loading) {
    return (
      <motion.div 
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex items-center justify-center min-h-[160px]"
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </motion.div>
    );
  }

  const unlockedCount = Object.keys(achievementsByType).length;
  const totalPossible = Object.keys(ACHIEVEMENT_CONFIG).length;

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.55 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-yellow-500/20 to-amber-600/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Conquistas</h2>
            <p className="text-[10px] text-muted-foreground">Temporada {currentYear}</p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] border-zinc-700">
          {unlockedCount}/{totalPossible} desbloqueadas
        </Badge>
      </div>

      {/* Achievements Grid */}
      <div className="p-4">
        {unlockedCount > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(achievementsByType).map(([type, achievement], index) => {
              const config = ACHIEVEMENT_CONFIG[type];
              if (!config) return null;

              const tierColors = TIER_COLORS[achievement.achievement_tier] || TIER_COLORS.bronze;
              const Icon = config.icon;

              return (
                <Tooltip key={achievement.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: newlyUnlocked.has(achievement.id) ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ 
                        delay: 0.1 * index,
                        scale: newlyUnlocked.has(achievement.id) ? { 
                          duration: 0.6, 
                          repeat: 2, 
                          repeatType: "reverse" 
                        } : undefined
                      }}
                      className={`relative p-3 rounded-xl ${tierColors.bg} border ${tierColors.border} cursor-pointer hover:shadow-lg ${tierColors.glow} transition-all group ${newlyUnlocked.has(achievement.id) ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-yellow-400/70 shadow-lg shadow-yellow-500/20' : ''}`}
                    >
                      {/* NEW badge for newly unlocked */}
                      {newlyUnlocked.has(achievement.id) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-yellow-500 text-yellow-950 text-[8px] font-bold uppercase shadow-md"
                        >
                          NOVO!
                        </motion.div>
                      )}
                      
                      {/* Tier badge */}
                      <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${tierColors.bg} ${tierColors.text} border ${tierColors.border}`}>
                        {TIER_LABELS[achievement.achievement_tier]}
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full ${tierColors.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-5 h-5 ${tierColors.text}`} />
                        </div>
                        <p className={`text-xs font-semibold ${tierColors.text}`}>
                          {config.label}
                        </p>
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs font-medium">{config.label} - {TIER_LABELS[achievement.achievement_tier]}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {config.description[achievement.achievement_tier]}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Locked achievements preview */}
            {Object.entries(ACHIEVEMENT_CONFIG)
              .filter(([type]) => !achievementsByType[type])
              .slice(0, 3)
              .map(([type, config], index) => {
                const Icon = config.icon;
                return (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ delay: 0.2 + 0.1 * index }}
                        className="relative p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 cursor-pointer hover:opacity-60 transition-opacity"
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center mb-2">
                            <Icon className="w-5 h-5 text-zinc-600" />
                          </div>
                          <p className="text-xs font-medium text-zinc-600">
                            {config.label}
                          </p>
                          <p className="text-[9px] text-zinc-700">Bloqueada</p>
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="text-xs font-medium">{config.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {config.description.bronze}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Nenhuma conquista ainda</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Continue jogando para desbloquear conquistas!
            </p>

            {/* Show some locked achievements */}
            <div className="flex justify-center gap-2 mt-4">
              {Object.entries(ACHIEVEMENT_CONFIG).slice(0, 4).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center opacity-40 cursor-pointer hover:opacity-60 transition-opacity">
                        <Icon className="w-5 h-5 text-zinc-600" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{config.label}: {config.description.bronze}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
