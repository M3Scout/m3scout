import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
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
// Score badge removed from public profile - only shown in admin area
import { formatFixed } from "@/lib/formatters";
import { isGoalkeeper } from "@/lib/positionUtils";

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

// =============== ANIMATION VARIANTS ===============

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } }
};

// =============== COMPONENTS ===============

// Highlight Card with gradient and glow
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
    red: "from-[#e52421]/20 to-[#e52421]/5 border-[#e52421]/30 hover:border-[#e52421]/50 hover:shadow-[#e52421]/10",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-500/50 hover:shadow-blue-500/10",
    green: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:border-purple-500/50 hover:shadow-purple-500/10",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:border-amber-500/50 hover:shadow-amber-500/10",
  };

  const iconColorMap = {
    red: "text-[#e52421]",
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
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "relative p-5 rounded-2xl border bg-gradient-to-br cursor-default",
        "transition-all duration-300 hover:shadow-xl",
        colorMap[color]
      )}
    >
      {Icon && (
        <Icon className={cn("w-5 h-5 mb-3", iconColorMap[color])} />
      )}
      <div className="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-zinc-500 mt-1">{subValue}</div>
      )}
      <div className="text-xs uppercase tracking-widest text-zinc-500 mt-2">{label}</div>
    </motion.div>
  );
}

// Chip component
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
    default: "bg-zinc-800/50 text-zinc-300 border-zinc-700/50",
    primary: "bg-[#e52421]/10 text-[#e52421] border-[#e52421]/30",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
      "hover:scale-105 cursor-default",
      variants[variant]
    )}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

// Stat KPI Card
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
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
        "focus:outline-none focus:ring-2 focus:ring-[#e52421]/50",
        active 
          ? "bg-[#e52421]/10 border-[#e52421]/40 shadow-lg shadow-[#e52421]/5" 
          : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700"
      )}
    >
      <span className={cn(
        "text-2xl md:text-3xl font-bold tabular-nums",
        active ? "text-white" : "text-zinc-300"
      )}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{label}</span>
    </motion.button>
  );
}

// Phase Panel
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
    orange: { bg: "from-orange-500/10", border: "border-orange-500/20", icon: "text-orange-400", bar: "bg-orange-500" },
    purple: { bg: "from-purple-500/10", border: "border-purple-500/20", icon: "text-purple-400", bar: "bg-purple-500" },
    green: { bg: "from-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400", bar: "bg-emerald-500" },
    blue: { bg: "from-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400", bar: "bg-blue-500" },
  };

  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-5 rounded-2xl border bg-gradient-to-br to-transparent",
        c.bg, c.border
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("w-5 h-5", c.icon)} />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="space-y-3">
        {stats.map((stat) => {
          const pct = stat.max ? Math.min(100, (stat.value / stat.max) * 100) : Math.min(100, stat.value);
          return (
            <div key={stat.label} className="group cursor-default">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  {stat.label}
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">{stat.value}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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

// Metric with animated bar
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
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-zinc-800/50">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <span className="text-xs uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      {hasValue ? (
        <>
          <div className="text-2xl font-bold text-white tabular-nums">
            {formatFixed(value, 1)}
            <span className="text-sm text-zinc-500 ml-1">{unit}</span>
          </div>
          {reference && (
            <span className="text-[10px] text-zinc-600 mt-1 block">Ref: {reference}</span>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-zinc-600">
          <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
            <X className="w-4 h-4" />
          </div>
          <span className="text-sm italic">Não informado</span>
        </div>
      )}
    </motion.div>
  );
}

// Tab Button
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
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e52421] rounded-full"
        />
      )}
    </button>
  );
}

// Video Thumbnail with real YouTube thumbnail
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
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 group cursor-pointer"
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
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}
      
      {/* Overlay - darkens on hover */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300 z-10" />
      
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <motion.div 
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300"
          animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0.4)", "0 0 0 20px rgba(255,255,255,0)", "0 0 0 0 rgba(255,255,255,0.4)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play className="w-7 h-7 md:w-8 md:h-8 text-[#e52421] ml-1" fill="#e52421" />
        </motion.div>
      </div>
      
      {/* Label - bottom left */}
      <div className="absolute bottom-4 left-4 z-20 text-left">
        <span className="text-[10px] uppercase tracking-widest text-zinc-300/80">Highlights</span>
        <p className="text-white font-medium text-sm">Assista ao vídeo completo</p>
      </div>
    </motion.button>
  );
}

// Sticky Mobile CTA
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" />
          
          <div className="relative px-4 py-4 pb-safe">
            <Link to={`/contact?player=${playerSlug}`}>
              <motion.button 
                className="w-full group relative flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-white
                  bg-gradient-to-r from-[#e52421] to-[#b51c1a] 
                  shadow-lg shadow-[#e52421]/30
                  active:scale-[0.98] transition-transform"
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Falar sobre {playerName.split(" ")[0]}</span>
                <ChevronRight className="w-4 h-4" />
                
                {/* Glow */}
                <div className="absolute inset-0 rounded-full bg-[#e52421]/20 blur-xl" />
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
  const [currentSeasonStats, setCurrentSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<SeasonStats[]>([]);
  const [competitionStats, setCompetitionStats] = useState<CompetitionStats[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("current");
  const [statsLoading, setStatsLoading] = useState(true);
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
        .maybeSingle();
      if (data) setPlayer(data);
      setLoading(false);
    };
    fetchPlayer();
  }, [slug]);

  // Fetch stats
  useEffect(() => {
    if (!player?.id) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      
      const { data } = await supabase
        .from("player_stats")
        .select(`*, competitions:competition_id (id, name, display_name, type)`)
        .eq("player_id", player.id)
        .order("season_year", { ascending: false });

      if (Array.isArray(data) && data.length > 0) {
        // Aggregate by season
        const statsBySeason = data.reduce((acc, stat) => {
          const year = stat.season_year;
          if (!acc[year]) {
            acc[year] = {
              season_year: year,
              matches: 0, minutes: 0, goals: 0, assists: 0,
              yellow_cards: 0, red_cards: 0, tackles: 0, interceptions: 0,
              recoveries: 0, shots: 0, shots_on_target: 0, key_passes: 0,
              chances_created: 0, successful_dribbles: 0, total_dribbles: 0,
              accurate_passes: 0, total_passes: 0, clearances: 0,
              saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
            };
          }
          const s = acc[year];
          s.matches += stat.matches || 0;
          s.minutes += stat.minutes || 0;
          s.goals += stat.goals || 0;
          s.assists += stat.assists || 0;
          s.yellow_cards += stat.yellow_cards || 0;
          s.red_cards += stat.red_cards || 0;
          s.tackles += stat.tackles || 0;
          s.interceptions += stat.interceptions || 0;
          s.recoveries += stat.recoveries || 0;
          s.shots += stat.shots || 0;
          s.shots_on_target += stat.shots_on_target || 0;
          s.key_passes += stat.key_passes || 0;
          s.chances_created += stat.chances_created || 0;
          s.successful_dribbles += stat.successful_dribbles || 0;
          s.total_dribbles += stat.total_dribbles || 0;
          s.accurate_passes += stat.accurate_passes || 0;
          s.total_passes += stat.total_passes || 0;
          s.clearances += stat.clearances || 0;
          s.saves += stat.saves || 0;
          s.goals_conceded += stat.goals_conceded || 0;
          s.clean_sheets += stat.clean_sheets || 0;
          s.penalties_saved += stat.penalties_saved || 0;
          return acc;
        }, {} as Record<number, SeasonStats>);

        const seasons = Object.values(statsBySeason).sort((a, b) => b.season_year - a.season_year);
        setCareerStats(seasons);
        
        const current = seasons.find((s) => s.season_year === currentYear) || seasons[0];
        if (current) setCurrentSeasonStats(current);

        // Aggregate by competition
        const statsByCompetition = data.reduce((acc, stat) => {
          const compId = stat.competition_id;
          if (!compId) return acc;
          const competition = stat.competitions as { id: string; name: string; display_name: string | null; type: string } | null;
          const key = `${compId}-${stat.season_year}`;
          if (!acc[key]) {
            acc[key] = {
              competition_id: compId,
              competition_name: competition?.display_name || competition?.name || "Competição",
              competition_type: competition?.type || "league",
              season_year: stat.season_year,
              matches: 0, minutes: 0, goals: 0, assists: 0,
            };
          }
          const c = acc[key];
          c.matches += stat.matches || 0;
          c.minutes += stat.minutes || 0;
          c.goals += stat.goals || 0;
          c.assists += stat.assists || 0;
          return acc;
        }, {} as Record<string, CompetitionStats>);

        setCompetitionStats(Object.values(statsByCompetition).sort((a, b) => b.season_year - a.season_year));
      }
      setStatsLoading(false);
    };

    fetchStats();
  }, [player?.id]);

  // Calculations
  const careerTotals = careerStats.reduce((acc, s) => ({
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
  }), {
    matches: 0, minutes: 0, goals: 0, assists: 0, shots: 0, key_passes: 0,
    tackles: 0, interceptions: 0, recoveries: 0, yellow_cards: 0, red_cards: 0,
  });

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
            variants={stagger}
          >
            {/* Photo Column */}
            <motion.div variants={fadeIn} className="relative">
              <div className="relative aspect-[3/4] md:aspect-auto md:h-[420px] rounded-3xl overflow-hidden group">
                <img
                  src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
                  alt={player.full_name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                {/* Clean gradient overlay - no red */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Position badge */}
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1.5 bg-[#e52421] text-white text-xs font-semibold uppercase tracking-widest rounded-full">
                    {player.position}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Info Column */}
            <motion.div variants={fadeIn} className="flex flex-col justify-center">
              {/* Name */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-2">
                {player.full_name}
              </h1>
              
              {/* Role line */}
              <p className="text-zinc-400 mb-6">
                {player.primary_tactical_role && <span>{player.primary_tactical_role}</span>}
                {player.play_style && <span className="text-zinc-600"> • {player.play_style}</span>}
              </p>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {player.age && (
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <Calendar className="w-4 h-4 text-zinc-600 mb-1" />
                    <div className="text-lg font-semibold text-white">{player.age}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">Anos</div>
                  </div>
                )}
                {player.height && (
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <Ruler className="w-4 h-4 text-zinc-600 mb-1" />
                    <div className="text-lg font-semibold text-white">{player.height}cm</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">Altura</div>
                  </div>
                )}
                {player.dominant_foot && (
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <User className="w-4 h-4 text-zinc-600 mb-1" />
                    <div className="text-lg font-semibold text-white capitalize">{player.dominant_foot}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">Pé</div>
                  </div>
                )}
                {player.current_club && (
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <MapPin className="w-4 h-4 text-zinc-600 mb-1" />
                    <div className="text-lg font-semibold text-white truncate">{player.current_club}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">Clube</div>
                  </div>
                )}
              </div>

              {/* Premium CTA Button */}
              <Link to={`/contact?player=${player.slug}`}>
                <motion.button 
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white text-sm
                    bg-gradient-to-r from-[#e52421] to-[#b51c1a] 
                    shadow-lg shadow-[#e52421]/20
                    hover:shadow-xl hover:shadow-[#e52421]/30
                    transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Falar com a M3 sobre este atleta</span>
                  <motion.span
                    className="inline-block"
                    initial={{ x: 0 }}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.span>
                  
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-full bg-[#e52421] opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.section>

          {/* ==================== HIGHLIGHT CARDS ==================== */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
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
          </section>

          {/* ==================== IDENTITY CHIPS ==================== */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
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
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#e52421]" />
                Estatísticas
              </h2>

              {/* KPIs Row */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                <KPICard label="Jogos" value={careerTotals.matches} />
                <KPICard label="Minutos" value={careerTotals.minutes} />
                <KPICard label="Gols" value={careerTotals.goals} active />
                <KPICard label="Assist." value={careerTotals.assists} />
                <KPICard label="G+A" value={careerTotals.goals + careerTotals.assists} active />
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-zinc-800 mb-6 overflow-x-auto">
                <TabButton active={activeTab === "current"} onClick={() => setActiveTab("current")}>
                  Temporada {currentYear}
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
                  className="rounded-2xl bg-zinc-900/30 border border-zinc-800/50 p-6"
                >
                  {activeTab === "current" && currentSeasonStats && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                      {[
                        { label: "Jogos", value: currentSeasonStats.matches },
                        { label: "Minutos", value: currentSeasonStats.minutes },
                        { label: "Gols", value: currentSeasonStats.goals },
                        { label: "Assist.", value: currentSeasonStats.assists },
                        { label: "Desarmes", value: currentSeasonStats.tackles },
                        { label: "Intercep.", value: currentSeasonStats.interceptions },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center">
                          <div className="text-2xl font-bold text-white tabular-nums">{stat.value}</div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "per90" && currentSeasonStats && currentSeasonStats.minutes >= 90 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Gols/90", value: calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes) },
                        { label: "Assist./90", value: calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes) },
                        { label: "G+A/90", value: calculatePer90(currentSeasonStats.goals + currentSeasonStats.assists, currentSeasonStats.minutes) },
                        { label: "Desarmes/90", value: calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes) },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center p-4 rounded-xl bg-zinc-800/30">
                          <div className="text-2xl font-bold text-white tabular-nums">{stat.value}</div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "competition" && competitionStats.length > 0 && (
                    <div className="space-y-3">
                      {competitionStats.slice(0, 5).map((comp, idx) => (
                        <motion.div 
                          key={`${comp.competition_id}-${comp.season_year}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{comp.competition_name}</div>
                            <div className="text-xs text-zinc-500">{comp.season_year}</div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-zinc-400">{comp.matches}J</span>
                            <span className="text-white font-semibold">{comp.goals}G</span>
                            <span className="text-zinc-400">{comp.assists}A</span>
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
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{season.season_year}</span>
                            {season.season_year === currentYear && (
                              <Badge variant="outline" className="text-[9px] border-[#e52421]/50 text-[#e52421]">Atual</Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm tabular-nums">
                            <span className="text-zinc-400">{season.matches}J</span>
                            <span className="text-white font-semibold">{season.goals}G</span>
                            <span className="text-zinc-400">{season.assists}A</span>
                            <span className="text-zinc-500">{season.minutes}'</span>
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
          {currentSeasonStats && (
            <motion.section 
              className="mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-xl font-bold text-white mb-6">Fases do Jogo</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </motion.section>
          )}

          {/* ==================== PHYSICAL DATA ==================== */}
          {(player.height || player.weight || player.wingspan || player.body_fat_percentage || player.max_speed) && (
            <motion.section 
              className="mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-xl font-bold text-white mb-6">Dados Físicos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <AnimatedMetric label="Altura" value={player.height} unit="cm" icon={Ruler} reference="175-185" />
                <AnimatedMetric label="Peso" value={player.weight} unit="kg" icon={Scale} reference="70-80" />
                <AnimatedMetric label="Envergadura" value={player.wingspan} unit="cm" icon={Ruler} />
                <AnimatedMetric label="% Gordura" value={player.body_fat_percentage} unit="%" icon={Percent} reference="8-12%" />
                <AnimatedMetric label="Massa Musc." value={player.muscle_mass} unit="kg" icon={Dumbbell} />
              </div>

              {(player.max_speed || player.sprint_30m || player.vo2_max) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
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
              className="mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Play className="w-5 h-5 text-[#e52421]" />
                Highlights
              </h2>
              
              <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
                <DialogTrigger asChild>
                  <div>
                    <VideoThumbnail videoUrl={embedUrl} thumbnailUrl={thumbnailUrl} onPlay={() => setVideoOpen(true)} />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 bg-black border-zinc-800">
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      title="Player Highlights"
                      className="w-full h-full"
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
            className="text-center py-12 mt-8 rounded-3xl bg-gradient-to-br from-zinc-900/50 to-zinc-900/20 border border-zinc-800/50"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-white mb-3">
              Interessado em <span className="text-[#e52421]">{player.full_name.split(" ")[0]}</span>?
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
              Entre em contato com a M3 Agency para mais informações.
            </p>
            <Link to={`/contact?player=${player.slug}`}>
              <motion.button 
                className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-medium text-white
                  bg-gradient-to-r from-[#e52421] to-[#b51c1a] 
                  shadow-lg shadow-[#e52421]/20
                  hover:shadow-xl hover:shadow-[#e52421]/30
                  transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle className="w-5 h-5" />
                <span>Falar com a M3 Agency</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-full bg-[#e52421] opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
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
