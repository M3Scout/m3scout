import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerMatchStats } from "@/hooks/usePlayerMatchStats";
import { fetchUnifiedPlayerStats, type UnifiedStats } from "@/hooks/useUnifiedPlayerStats";
import {
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Ruler, 
  User, 
  Flag,
  Play,
  MessageCircle,
  Loader2,
  Target,
  Zap,
  Shield,
  Activity,
  Scale,
  Dumbbell,
  Percent,
  Timer,
  Heart,
  ChevronRight,
  TrendingUp,
  Trophy,
  Clock,
  Crosshair,
  Sparkles,
  Footprints,
  X,
} from "lucide-react";
import { formatFixed } from "@/lib/formatters";
import { isGoalkeeper } from "@/lib/positionUtils";
import { 
  staggerContainer, 
  staggerItem, 
  cardHover, 
  cardTap,
  pillHover,
  fadeInUp,
  scaleIn,
} from "@/lib/animations";

// =============== INTERFACES ===============

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[] | null;
  age: number | null;
  birth_date: string | null;
  nationality: string;
  current_club: string | null;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  bio_public: string | null;
  highlight_video_url: string | null;
  auto_rating: number | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
  play_style: string | null;
  strengths: string[] | null;
  areas_to_develop: string[] | null;
  contract_status: string | null;
  country: string | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
}

interface SeasonStats {
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  successful_dribbles: number;
  total_dribbles: number;
  accurate_passes: number;
  total_passes: number;
  clearances: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
}

interface CompetitionStats {
  competition_id: string;
  competition_name: string;
  competition_type: string;
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
}

const currentYear = new Date().getFullYear();
type TabValue = "current" | "per90" | "competition" | "career";

// =============== COMPONENTS ===============

// Highlight Card with gradient and glow - uses design system tokens
function HighlightCard({ 
  label, 
  value, 
  subValue,
  color = "red",
  icon: Icon,
  delay = 0,
}: { 
  label: string;
  value: string | number;
  subValue?: string;
  color?: "red" | "blue" | "green" | "purple" | "amber";
  icon?: React.ElementType;
  delay?: number;
}) {
  const colorMap = {
    red: "from-primary/20 to-primary/5",
    blue: "from-blue-500/20 to-blue-500/5",
    green: "from-emerald-500/20 to-emerald-500/5",
    purple: "from-purple-500/20 to-purple-500/5",
    amber: "from-amber-500/20 to-amber-500/5",
  };

  const iconColorMap = {
    red: "text-primary",
    blue: "text-blue-400",
    green: "text-emerald-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={cardHover}
      whileTap={cardTap}
      className={cn(
        "relative p-4 md:p-5 rounded-[--radius-card] bg-gradient-to-br cursor-default",
        "transition-all duration-300 shadow-[--shadow-soft]",
        colorMap[color]
      )}
    >
      {Icon && (
        <Icon className={cn("w-4 h-4 md:w-5 md:h-5 mb-2 md:mb-3", iconColorMap[color])} />
      )}
      <div className="text-2xl md:text-4xl font-bold text-foreground tabular-nums tracking-tight">
        {value}
      </div>
      {subValue && (
        <div className="text-[10px] md:text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
      <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mt-2">{label}</div>
    </motion.div>
  );
}

// Chip component - uses design system pill tokens
function Chip({ 
  children, 
  variant = "default",
  icon: Icon,
}: { 
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "info";
  icon?: React.ElementType;
}) {
  const variants = {
    default: "bg-[--bg-glass] text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-400",
    warning: "bg-amber-500/10 text-amber-400",
    info: "bg-blue-500/10 text-blue-400",
  };

  return (
    <motion.span 
      whileHover={pillHover}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5",
        "rounded-[--radius-pill] text-xs font-medium",
        "min-h-[36px] cursor-default transition-all",
        variants[variant]
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </motion.span>
  );
}

// Stat KPI Card - uses design system tokens
function KPICard({ 
  label, 
  value, 
  active = false,
  onClick,
}: { 
  label: string;
  value: number | string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={cardHover}
      whileTap={cardTap}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-3 md:p-4",
        "rounded-[--radius-button] transition-all",
        "focus:outline-none focus-visible:ring-[--focus-ring]",
        "min-h-[--tap-target]",
        active 
          ? "bg-primary/10 shadow-[--shadow-soft]" 
          : "bg-[--bg-glass] hover:bg-[--bg-glass-hover]"
      )}
    >
      <span className={cn(
        "text-xl md:text-3xl font-bold tabular-nums",
        active ? "text-foreground" : "text-muted-foreground"
      )}>
        {value}
      </span>
      <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</span>
    </motion.button>
  );
}

// Phase Panel - uses design system tokens
function PhasePanel({ 
  title, 
  icon: Icon, 
  color,
  stats,
}: { 
  title: string;
  icon: React.ElementType;
  color: "orange" | "purple" | "green" | "blue";
  stats: { label: string; value: number; max?: number }[];
}) {
  const colorMap = {
    orange: { bg: "from-orange-500/10", icon: "text-orange-400", bar: "bg-orange-500" },
    purple: { bg: "from-purple-500/10", icon: "text-purple-400", bar: "bg-purple-500" },
    green: { bg: "from-emerald-500/10", icon: "text-emerald-400", bar: "bg-emerald-500" },
    blue: { bg: "from-blue-500/10", icon: "text-blue-400", bar: "bg-blue-500" },
  };

  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={cardHover}
      className={cn(
        "p-4 md:p-5 rounded-[--radius-card] bg-gradient-to-br to-transparent",
        c.bg
      )}
    >
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <Icon className={cn("w-4 h-4 md:w-5 md:h-5", c.icon)} />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="space-y-2.5 md:space-y-3">
        {stats.map((stat) => {
          const pct = stat.max ? Math.min(100, (stat.value / stat.max) * 100) : Math.min(100, stat.value);
          return (
            <div key={stat.label} className="group cursor-default">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] md:text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.label}
                </span>
                <span className="text-xs md:text-sm font-semibold text-foreground tabular-nums">{stat.value}</span>
              </div>
              <div className="h-1 md:h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", c.bar)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Metric with animated bar - uses design system tokens
function AnimatedMetric({ 
  label, 
  value, 
  unit, 
  icon: Icon,
  reference,
}: { 
  label: string;
  value: number | null;
  unit: string;
  icon: React.ElementType;
  reference?: string;
}) {
  const hasValue = value !== null && value !== undefined;

  return (
    <motion.div
      whileHover={cardHover}
      className={cn(
        "p-3 md:p-4 rounded-[--radius-button] transition-all",
        "bg-[--bg-glass]",
        "hover:bg-[--bg-glass-hover]"
      )}
    >
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        <div className="p-1 md:p-1.5 rounded-lg bg-muted/50">
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
        </div>
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      {hasValue ? (
        <>
          <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
            {formatFixed(value, 1)}
            <span className="text-xs md:text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
          {reference && (
            <span className="text-[9px] md:text-[10px] text-muted-foreground/60 mt-1 block">Ref: {reference}</span>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
          <span className="text-xs md:text-sm italic">Não informado</span>
        </div>
      )}
    </motion.div>
  );
}

// Tab Button - uses design system tokens
function TabButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={pillHover}
      whileTap={cardTap}
      className={cn(
        "relative px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
        "min-h-[--tap-target] rounded-[--radius-pill]",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
        />
      )}
    </motion.button>
  );
}

// Video Thumbnail with real YouTube thumbnail - uses design system tokens
function VideoThumbnail({ 
  videoUrl, 
  thumbnailUrl,
  onPlay 
}: { 
  videoUrl: string;
  thumbnailUrl: string | null;
  onPlay: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  
  return (
    <motion.button
      onClick={onPlay}
      whileHover={cardHover}
      whileTap={cardTap}
      className={cn(
        "relative w-full aspect-video overflow-hidden group cursor-pointer",
        "rounded-[--radius-card] bg-muted"
      )}
    >
      {/* Real thumbnail image */}
      {thumbnailUrl && !imgError && (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}
      
      {/* Fallback gradient if no thumbnail */}
      {(!thumbnailUrl || imgError) && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
      )}
      
      {/* Overlay - darkens on hover */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300 z-10" />
      
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <motion.div 
          className={cn(
            "w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center",
            "bg-white/90 backdrop-blur-sm shadow-2xl",
            "group-hover:scale-110 transition-transform duration-300"
          )}
          animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0.4)", "0 0 0 20px rgba(255,255,255,0)", "0 0 0 0 rgba(255,255,255,0.4)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play className="w-6 h-6 md:w-8 md:h-8 text-primary ml-1" fill="hsl(var(--primary))" />
        </motion.div>
      </div>
      
      {/* Label - bottom left */}
      <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 z-20 text-left">
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/80">Highlights</span>
        <p className="text-white font-medium text-xs md:text-sm">Assista ao vídeo completo</p>
      </div>
    </motion.button>
  );
}

// Sticky Mobile CTA - uses design system tokens
function StickyMobileCTA({ 
  playerSlug, 
  playerName,
  visible 
}: { 
  playerSlug: string;
  playerName: string;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" />
          
          <div className="relative px-[--padding-mobile] py-4 pb-safe">
            <Link to={`/contact?player=${playerSlug}`}>
              <motion.button 
                whileTap={cardTap}
                className={cn(
                  "w-full group relative flex items-center justify-center gap-2",
                  "px-6 min-h-[--tap-target] rounded-[--radius-pill]",
                  "font-medium text-primary-foreground",
                  "bg-gradient-to-r from-primary to-primary/80",
                  "shadow-lg shadow-primary/30",
                  "active:scale-[0.98] transition-transform"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Falar sobre {playerName.split(" ")[0]}</span>
                <ChevronRight className="w-4 h-4" />
                
                {/* Glow */}
                <div className="absolute inset-0 rounded-[--radius-pill] bg-primary/20 blur-xl" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============== MAIN COMPONENT ===============

const PlayerProfile = () => {
  const { slug } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("current");
  const [videoOpen, setVideoOpen] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Track scroll for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      setShowStickyCTA(window.scrollY > 300);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch player
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .limit(1);
      const playerRow = Array.isArray(data) ? data[0] ?? null : null;
      if (playerRow) setPlayer(playerRow);
      setLoading(false);
    };
    fetchPlayer();
  }, [slug]);

  // ==================== MATCH-DERIVED STATS (Single Source of Truth for Live Match) ====================
  const {
    matches: matchDerivedMatches,
    totals: matchTotals,
    bySeason,
    isLoading: statsLoading,
  } = usePlayerMatchStats({
    playerId: player?.id ?? "",
    enabled: !!player?.id,
  });

  // ==================== UNIFIED STATS (For "Por Competição" tab - Live + Manual) ====================
  const { data: unifiedStatsData } = useQuery({
    queryKey: ["unified-player-stats-public", player?.id],
    queryFn: () => fetchUnifiedPlayerStats(player?.id ?? ""),
    enabled: !!player?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ==================== CAREER STATS (Uses Unified Data - Live + Manual) ====================
  // This ensures "Carreira" tab shows ALL seasons, not just Live Match ones
  const careerStats: SeasonStats[] = useMemo(() => {
    const stats = unifiedStatsData || [];
    
    // Group by season_year (aggregate all competitions per season)
    const acc: Record<number, SeasonStats> = {};
    
    for (const s of stats) {
      const year = s.season_year;
      if (!acc[year]) {
        acc[year] = {
          season_year: year,
          matches: 0,
          minutes: 0,
          goals: 0,
          assists: 0,
          yellow_cards: 0,
          red_cards: 0,
          tackles: 0,
          interceptions: 0,
          recoveries: 0,
          shots: 0,
          shots_on_target: 0,
          key_passes: 0,
          chances_created: 0,
          successful_dribbles: 0,
          total_dribbles: 0,
          accurate_passes: 0,
          total_passes: 0,
          clearances: 0,
          saves: 0,
          goals_conceded: 0,
          clean_sheets: 0,
          penalties_saved: 0,
        };
      }
      
      const c = acc[year];
      c.matches += s.matches;
      c.minutes += s.minutes;
      c.goals += s.goals;
      c.assists += s.assists;
      c.yellow_cards += s.yellow_cards;
      c.red_cards += s.red_cards;
      c.tackles += s.tackles;
      c.interceptions += s.interceptions;
      c.recoveries += s.recoveries;
      c.shots += s.shots;
      c.shots_on_target += s.shots_on_target;
      c.key_passes += s.key_passes;
      c.chances_created += s.chances_created;
      c.successful_dribbles += s.successful_dribbles;
      c.total_dribbles += s.total_dribbles;
      c.accurate_passes += s.accurate_passes;
      c.total_passes += s.total_passes;
      c.saves += s.saves;
      c.goals_conceded += s.goals_conceded;
      c.clean_sheets += s.clean_sheets;
      c.penalties_saved += s.penalties_saved;
    }
    
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [unifiedStatsData]);

  // Derive the latest season year with actual data (for default display)
  const latestAvailableSeasonYear: number | null = useMemo(() => {
    if (careerStats.length === 0) return null;
    return careerStats[0].season_year; // careerStats is sorted descending by season_year
  }, [careerStats]);

  const currentSeasonStats: SeasonStats | null = useMemo(() => {
    if (careerStats.length === 0) return null;
    // Default to the latest available season (not the calendar year)
    return careerStats[0] || null;
  }, [careerStats]);

  // ==================== COMPETITION STATS (Uses Unified Data - Live + Manual) ====================
  // This ensures "Por Competição" tab shows ALL competitions, not just Live Match ones
  const competitionStats: CompetitionStats[] = useMemo(() => {
    const stats = unifiedStatsData || [];
    
    // Group by competition_id + season_year
    const acc: Record<string, CompetitionStats> = {};
    
    for (const s of stats) {
      if (!s.competition_id) continue;
      
      const key = `${s.competition_id}-${s.season_year}`;
      if (!acc[key]) {
        acc[key] = {
          competition_id: s.competition_id,
          competition_name: s.competition_name || "Competição",
          competition_type: "league",
          season_year: s.season_year,
          matches: 0,
          minutes: 0,
          goals: 0,
          assists: 0,
        };
      }
      
      const c = acc[key];
      c.matches += s.matches;
      c.minutes += s.minutes;
      c.goals += s.goals;
      c.assists += s.assists;
    }
    
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [unifiedStatsData]);

  // ==================== CAREER TOTALS (Uses Unified Data - Live + Manual) ====================
  // This is used for the top stats cards - must match the tabs data
  const careerTotals = useMemo(() => {
    const stats = unifiedStatsData || [];
    
    // Sum all unified stats (already respects Live > Manual priority per context)
    return stats.reduce(
      (acc, s) => ({
        matches: acc.matches + s.matches,
        minutes: acc.minutes + s.minutes,
        goals: acc.goals + s.goals,
        assists: acc.assists + s.assists,
        shots: acc.shots + s.shots,
        key_passes: acc.key_passes + s.key_passes,
        tackles: acc.tackles + s.tackles,
        interceptions: acc.interceptions + s.interceptions,
        recoveries: acc.recoveries + s.recoveries,
        yellow_cards: acc.yellow_cards + s.yellow_cards,
        red_cards: acc.red_cards + s.red_cards,
      }),
      {
        matches: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        key_passes: 0,
        tackles: 0,
        interceptions: 0,
        recoveries: 0,
        yellow_cards: 0,
        red_cards: 0,
      }
    );
  }, [unifiedStatsData]);

  // DEV-only debug logs (remove after validation)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!player?.id) return;

    const matchIds = matchDerivedMatches.map((m) => m.match_id);
    const minutesByMatch = matchDerivedMatches.map((m) => ({ match_id: m.match_id, minutes: m.minutes_played }));
    const counts = matchIds.reduce((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // eslint-disable-next-line no-console
    console.log("[PUBLIC_STATS_DEBUG]", {
      playerId: player.id,
      seasonYear: currentYear,
      competitionFilter: null,
      matchesLength: matchDerivedMatches.length,
      matchIds,
      minutesByMatch,
      matchIdCounts: counts,
    });
  }, [player?.id, matchDerivedMatches]);

  const calculatePer90 = (value: number, minutes: number): string => {
    if (minutes < 90) return "—";
    return formatFixed((value / minutes) * 90, 2);
  };

  const bmi = player?.weight && player?.height 
    ? player.weight / Math.pow(player.height / 100, 2) 
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-[#e52421]" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Atleta não encontrado</h1>
          <Link to="/players">
            <Button variant="outline">Voltar para atletas</Button>
          </Link>
        </div>
      </div>
    );
  }

  const embedUrl = player.highlight_video_url ? getYouTubeEmbedUrl(player.highlight_video_url) : null;
  const thumbnailUrl = player.highlight_video_url ? getYouTubeThumbnailUrl(player.highlight_video_url, "maxres") : null;

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/30 via-black to-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#e52421]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative pt-24 sm:pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button - positioned above hero with proper spacing */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10 mb-6"
          >
            <Link 
              to="/players" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group py-2"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-medium">Voltar</span>
            </Link>
          </motion.div>

          {/* ==================== HERO COMPACTO ==================== */}
          <motion.section 
            className="grid md:grid-cols-[280px,1fr] lg:grid-cols-[320px,1fr] gap-6 lg:gap-10 mb-12"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Photo Column */}
            <motion.div variants={staggerItem} className="relative">
              <div className={cn(
                "relative aspect-[3/4] md:aspect-auto md:h-[420px] overflow-hidden group",
                "rounded-[--radius-card]"
              )}>
                <img
                  src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
                  alt={player.full_name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                {/* Clean gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                {/* Position badge */}
                <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
                  <span className={cn(
                    "px-3 py-1.5 text-xs font-semibold uppercase tracking-widest",
                    "bg-primary text-primary-foreground rounded-[--radius-pill]"
                  )}>
                    {player.position}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Info Column */}
            <motion.div variants={staggerItem} className="flex flex-col justify-center">
              {/* Name */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-2">
                {player.full_name}
              </h1>
              
              {/* Role line */}
              <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">
                {player.primary_tactical_role && <span>{player.primary_tactical_role}</span>}
                {player.play_style && <span className="text-muted-foreground/60"> • {player.play_style}</span>}
              </p>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
                {player.age && (
                  <motion.div 
                    whileHover={cardHover}
                    className={cn(
                      "p-2.5 md:p-3 transition-all",
                      "rounded-[--radius-button] bg-[--bg-glass]",
                      "hover:bg-[--bg-glass-hover]"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground mb-1" />
                    <div className="text-base md:text-lg font-semibold text-foreground">{player.age}</div>
                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Anos</div>
                  </motion.div>
                )}
                {player.height && (
                  <motion.div 
                    whileHover={cardHover}
                    className={cn(
                      "p-2.5 md:p-3 transition-all",
                      "rounded-[--radius-button] bg-[--bg-glass]",
                      "hover:bg-[--bg-glass-hover]"
                    )}
                  >
                    <Ruler className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground mb-1" />
                    <div className="text-base md:text-lg font-semibold text-foreground">{player.height}cm</div>
                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Altura</div>
                  </motion.div>
                )}
                {player.dominant_foot && (
                  <motion.div 
                    whileHover={cardHover}
                    className={cn(
                      "p-2.5 md:p-3 transition-all",
                      "rounded-[--radius-button] bg-[--bg-glass]",
                      "hover:bg-[--bg-glass-hover]"
                    )}
                  >
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground mb-1" />
                    <div className="text-base md:text-lg font-semibold text-foreground capitalize">{player.dominant_foot}</div>
                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Pé</div>
                  </motion.div>
                )}
                {player.current_club && (
                  <motion.div 
                    whileHover={cardHover}
                    className={cn(
                      "p-2.5 md:p-3 transition-all",
                      "rounded-[--radius-button] bg-[--bg-glass]",
                      "hover:bg-[--bg-glass-hover]"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground mb-1" />
                    <div className="text-base md:text-lg font-semibold text-foreground truncate">{player.current_club}</div>
                    <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">Clube</div>
                  </motion.div>
                )}
              </div>

              {/* Premium CTA Button */}
              <Link to={`/contact?player=${player.slug}`}>
                <motion.button 
                  whileHover={cardHover}
                  whileTap={cardTap}
                  className={cn(
                    "group relative inline-flex items-center gap-2",
                    "px-5 md:px-6 min-h-[--tap-target] rounded-[--radius-pill]",
                    "font-medium text-primary-foreground text-sm",
                    "bg-gradient-to-r from-primary to-primary/80",
                    "shadow-lg shadow-primary/20",
                    "hover:shadow-xl hover:shadow-primary/30",
                    "transition-all duration-300"
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Falar com a M3 sobre este atleta</span>
                  <span className="sm:hidden">Falar sobre atleta</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-[--radius-pill] bg-primary opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.section>

          {/* ==================== HIGHLIGHT CARDS ==================== */}
          <motion.section 
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <HighlightCard 
              label="G+A na Temporada" 
              value={currentSeasonStats ? currentSeasonStats.goals + currentSeasonStats.assists : 0}
              subValue={currentSeasonStats ? `${currentSeasonStats.goals}G + ${currentSeasonStats.assists}A` : undefined}
              color="green"
              icon={Target}
              delay={0}
            />
            <HighlightCard 
              label="Minutos Jogados" 
              value={currentSeasonStats?.minutes || 0}
              subValue={currentSeasonStats ? `${currentSeasonStats.matches} jogos` : undefined}
              color="blue"
              icon={Clock}
              delay={0.1}
            />
            <HighlightCard 
              label="Pontos Fortes" 
              value={player.strengths?.length || 0}
              subValue={player.strengths?.[0] || "—"}
              color="purple"
              icon={Zap}
              delay={0.2}
            />
            <HighlightCard 
              label="Status" 
              value={player.contract_status === "contracted" ? "Contratado" : "Livre"}
              subValue={player.current_club || "Sem clube"}
              color={player.contract_status === "contracted" ? "green" : "amber"}
              icon={Shield}
              delay={0.3}
            />
          </motion.section>

          {/* ==================== IDENTITY CHIPS ==================== */}
          <motion.section 
            className="mb-8 md:mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
              <Chip icon={Flag}>{player.nationality}</Chip>
              {player.secondary_positions?.map((pos) => (
                <Chip key={pos} variant="default">{pos}</Chip>
              ))}
              {player.primary_tactical_role && (
                <Chip variant="info" icon={Target}>{player.primary_tactical_role}</Chip>
              )}
              {player.play_style && (
                <Chip variant="info">{player.play_style}</Chip>
              )}
            </div>
            
            {/* Strengths & Areas */}
            <div className="flex flex-wrap gap-2">
              {player.strengths?.map((s) => (
                <Chip key={s} variant="success" icon={Zap}>{s}</Chip>
              ))}
              {player.areas_to_develop?.map((a) => (
                <Chip key={a} variant="warning" icon={TrendingUp}>{a}</Chip>
              ))}
            </div>
          </motion.section>

          {/* ==================== STATISTICS DASHBOARD ==================== */}
          {!statsLoading && careerStats.length > 0 && (
            <motion.section 
              className="mb-8 md:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Estatísticas
              </h2>

              {/* KPIs Row */}
              <div className="grid grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-6">
                <KPICard label="Jogos" value={careerTotals.matches} />
                <KPICard label="Minutos" value={careerTotals.minutes} />
                <KPICard label="Gols" value={careerTotals.goals} active />
                <KPICard label="Assist." value={careerTotals.assists} />
                <KPICard label="G+A" value={careerTotals.goals + careerTotals.assists} active />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 md:gap-2 border-b border-border mb-4 md:mb-6 overflow-x-auto pb-px -mx-[--padding-mobile] px-[--padding-mobile] md:mx-0 md:px-0">
                <TabButton active={activeTab === "current"} onClick={() => setActiveTab("current")}>
                  Temporada {latestAvailableSeasonYear ?? currentYear}
                </TabButton>
                <TabButton active={activeTab === "per90"} onClick={() => setActiveTab("per90")}>
                  Por 90 min
                </TabButton>
                <TabButton active={activeTab === "competition"} onClick={() => setActiveTab("competition")}>
                  Por Competição
                </TabButton>
                <TabButton active={activeTab === "career"} onClick={() => setActiveTab("career")}>
                  Carreira
                </TabButton>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "p-4 md:p-6",
                    "rounded-[--radius-card] bg-[--bg-glass]"
                  )}
                >
                  {activeTab === "current" && currentSeasonStats && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
                      {[
                        { label: "Jogos", value: currentSeasonStats.matches },
                        { label: "Minutos", value: currentSeasonStats.minutes },
                        { label: "Gols", value: currentSeasonStats.goals },
                        { label: "Assist.", value: currentSeasonStats.assists },
                        { label: "Desarmes", value: currentSeasonStats.tackles },
                        { label: "Intercep.", value: currentSeasonStats.interceptions },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center">
                          <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">{stat.value}</div>
                          <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "current" && !currentSeasonStats && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Sem estatísticas disponíveis ainda.
                    </div>
                  )}

                  {activeTab === "per90" && currentSeasonStats && currentSeasonStats.minutes >= 90 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                      {[
                        { label: "Gols/90", value: calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes) },
                        { label: "Assist./90", value: calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes) },
                        { label: "G+A/90", value: calculatePer90(currentSeasonStats.goals + currentSeasonStats.assists, currentSeasonStats.minutes) },
                        { label: "Desarmes/90", value: calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes) },
                      ].map((stat) => (
                        <div key={stat.label} className={cn(
                          "text-center p-3 md:p-4",
                          "rounded-[--radius-button] bg-muted/30"
                        )}>
                          <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">{stat.value}</div>
                          <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "competition" && competitionStats.length > 0 && (
                    <div className="space-y-2 md:space-y-3">
                      {competitionStats.slice(0, 5).map((comp, idx) => (
                        <motion.div 
                          key={`${comp.competition_id}-${comp.season_year}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "flex items-center justify-between p-3",
                            "rounded-[--radius-button] bg-muted/30 hover:bg-muted/50 transition-colors"
                          )}
                        >
                          <div>
                            <div className="text-xs md:text-sm font-medium text-foreground">{comp.competition_name}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground">{comp.season_year}</div>
                          </div>
                          <div className="flex gap-3 md:gap-4 text-xs md:text-sm">
                            <span className="text-muted-foreground">{comp.matches}J</span>
                            <span className="text-foreground font-semibold">{comp.goals}G</span>
                            <span className="text-muted-foreground">{comp.assists}A</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {activeTab === "career" && (
                    <div className="space-y-2">
                      {careerStats.map((season, idx) => (
                        <motion.div 
                          key={season.season_year}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "flex items-center justify-between p-3",
                            "rounded-[--radius-button] bg-muted/30 hover:bg-muted/50 transition-colors"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm font-medium text-foreground">{season.season_year}</span>
                            {season.season_year === currentYear && (
                              <Badge variant="outline" className="text-[8px] md:text-[9px] border-primary/50 text-primary">Atual</Badge>
                            )}
                          </div>
                          <div className="flex gap-3 md:gap-4 text-xs md:text-sm tabular-nums">
                            <span className="text-muted-foreground">{season.matches}J</span>
                            <span className="text-foreground font-semibold">{season.goals}G</span>
                            <span className="text-muted-foreground">{season.assists}A</span>
                            <span className="text-muted-foreground/60 hidden sm:inline">{season.minutes}'</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}

          {/* ==================== GAME PHASES ==================== */}
          <motion.section 
            className="mb-8 md:mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 md:mb-6">
              Fases do Jogo
              {latestAvailableSeasonYear && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({latestAvailableSeasonYear})
                </span>
              )}
            </h2>
            {currentSeasonStats ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <PhasePanel 
                  title="Ataque" 
                  icon={Crosshair} 
                  color="orange"
                  stats={[
                    { label: "Gols", value: currentSeasonStats.goals, max: 20 },
                    { label: "Chutes", value: currentSeasonStats.shots, max: 50 },
                    { label: "Chutes no Gol", value: currentSeasonStats.shots_on_target, max: 30 },
                  ]}
                />
                <PhasePanel 
                  title="Criatividade" 
                  icon={Sparkles} 
                  color="purple"
                  stats={[
                    { label: "Assistências", value: currentSeasonStats.assists, max: 15 },
                    { label: "Passes Decisivos", value: currentSeasonStats.key_passes, max: 40 },
                    { label: "Chances Criadas", value: currentSeasonStats.chances_created, max: 30 },
                  ]}
                />
                <PhasePanel 
                  title="Passe" 
                  icon={Footprints} 
                  color="green"
                  stats={[
                    { label: "Passes Certos", value: currentSeasonStats.accurate_passes, max: 500 },
                    { label: "Dribles Certos", value: currentSeasonStats.successful_dribbles, max: 30 },
                  ]}
                />
                <PhasePanel 
                  title="Defesa" 
                  icon={Shield} 
                  color="blue"
                  stats={[
                    { label: "Desarmes", value: currentSeasonStats.tackles, max: 40 },
                    { label: "Interceptações", value: currentSeasonStats.interceptions, max: 30 },
                    { label: "Recuperações", value: currentSeasonStats.recoveries, max: 50 },
                  ]}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm rounded-[--radius-card] bg-[--bg-glass]">
                Sem estatísticas disponíveis ainda.
              </div>
            )}
          </motion.section>

          {/* ==================== PHYSICAL DATA ==================== */}
          {(player.height || player.weight || player.wingspan || player.body_fat_percentage || player.max_speed) && (
            <motion.section 
              className="mb-8 md:mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 md:mb-6">Dados Físicos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <AnimatedMetric label="Altura" value={player.height} unit="cm" icon={Ruler} reference="175-185" />
                <AnimatedMetric label="Peso" value={player.weight} unit="kg" icon={Scale} reference="70-80" />
                <AnimatedMetric label="Envergadura" value={player.wingspan} unit="cm" icon={Ruler} />
                <AnimatedMetric label="% Gordura" value={player.body_fat_percentage} unit="%" icon={Percent} reference="8-12%" />
                <AnimatedMetric label="Massa Musc." value={player.muscle_mass} unit="kg" icon={Dumbbell} />
              </div>

              {(player.max_speed || player.sprint_30m || player.vo2_max) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                  <AnimatedMetric label="Vel. Máx" value={player.max_speed} unit="km/h" icon={Zap} reference="32+" />
                  <AnimatedMetric label="Sprint 30m" value={player.sprint_30m} unit="s" icon={Timer} reference="< 4.0" />
                  <AnimatedMetric label="VO2 Máx" value={player.vo2_max} unit="ml/kg" icon={Heart} reference="55+" />
                </div>
              )}
            </motion.section>
          )}

          {/* ==================== VIDEO ==================== */}
          {embedUrl && (
            <motion.section 
              className="mb-8 md:mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                <Play className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Highlights
              </h2>
              
              <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
                <DialogTrigger asChild>
                  <div>
                    <VideoThumbnail videoUrl={embedUrl} thumbnailUrl={thumbnailUrl} onPlay={() => setVideoOpen(true)} />
                  </div>
                </DialogTrigger>
                <DialogContent className={cn(
                  "max-w-4xl p-0 bg-background border-border",
                  "rounded-[--radius-card]"
                )}>
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      title="Player Highlights"
                      className="w-full h-full rounded-[--radius-card]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </motion.section>
          )}

          {/* ==================== FINAL CTA ==================== */}
          <motion.section
            className={cn(
              "text-center py-8 md:py-12 mt-6 md:mt-8 px-4",
              "rounded-[--radius-card] bg-gradient-to-br from-muted/50 to-muted/20"
            )}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 md:mb-3">
              Interessado em <span className="text-primary">{player.full_name.split(" ")[0]}</span>?
            </h3>
            <p className="text-muted-foreground mb-4 md:mb-6 max-w-md mx-auto text-xs md:text-sm">
              Entre em contato com a M3 Agency para mais informações.
            </p>
            <Link to={`/contact?player=${player.slug}`}>
              <motion.button 
                whileHover={cardHover}
                whileTap={cardTap}
                className={cn(
                  "group relative inline-flex items-center gap-2",
                  "px-6 md:px-8 min-h-[--tap-target] rounded-[--radius-pill]",
                  "font-medium text-primary-foreground",
                  "bg-gradient-to-r from-primary to-primary/80",
                  "shadow-lg shadow-primary/20",
                  "hover:shadow-xl hover:shadow-primary/30",
                  "transition-all duration-300"
                )}
              >
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Falar com a M3 Agency</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-[--radius-pill] bg-primary opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
              </motion.button>
            </Link>
          </motion.section>

          {/* Spacer for sticky CTA on mobile */}
          <div className="h-20 md:hidden" />
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      {player && (
        <StickyMobileCTA 
          playerSlug={player.slug} 
          playerName={player.full_name}
          visible={showStickyCTA}
        />
      )}
    </div>
  );
};

export default PlayerProfile;
