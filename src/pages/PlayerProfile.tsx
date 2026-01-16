import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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
  FileText,
  ChevronRight,
  TrendingUp,
  Trophy,
  Clock,
} from "lucide-react";
import { ScoreDisplay } from "@/components/players/ScoreDisplay";
import { formatFixed } from "@/lib/formatters";
import { isGoalkeeper } from "@/lib/positionUtils";

// Player interface with all fields
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
  // Physical data
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
  // GK
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
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
}

const currentYear = new Date().getFullYear();

type TabValue = "current" | "per90" | "competition" | "career";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// =============== COMPONENTS ===============

function StatCard({ 
  label, 
  value, 
  icon: Icon,
  highlight = false,
  subValue,
}: { 
  label: string; 
  value: number | string;
  icon?: React.ElementType;
  highlight?: boolean;
  subValue?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
      "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 hover:bg-zinc-900/70",
      highlight && "border-[#e52421]/30 bg-[#e52421]/5"
    )}>
      {Icon && <Icon className={cn("w-4 h-4 mb-2", highlight ? "text-[#e52421]" : "text-zinc-500")} />}
      <span className={cn(
        "text-2xl font-bold tabular-nums",
        highlight ? "text-white" : "text-zinc-200"
      )}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{label}</span>
      {subValue && <span className="text-xs text-zinc-600 mt-0.5">{subValue}</span>}
    </div>
  );
}

function StatRow({ 
  label, 
  value, 
  highlight = false, 
  variant,
  small = false,
}: { 
  label: string; 
  value: number | string;
  highlight?: boolean;
  variant?: "warning" | "danger";
  small?: boolean;
}) {
  return (
    <div>
      <p className={cn(
        "text-[10px] uppercase tracking-widest mb-1",
        variant === "warning" ? "text-amber-500/70" : 
        variant === "danger" ? "text-red-500/70" : 
        "text-zinc-600"
      )}>
        {label}
      </p>
      <p className={cn(
        "font-semibold tabular-nums",
        small ? "text-lg" : "text-2xl",
        highlight ? "text-white" : 
        variant === "warning" ? "text-amber-400" :
        variant === "danger" ? "text-red-400" :
        "text-zinc-300"
      )}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-zinc-600">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function SectionTitle({ 
  children, 
  icon: Icon,
  className 
}: { 
  children: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 mb-6", className)}>
      {Icon && (
        <div className="p-2 rounded-xl bg-[#e52421]/10">
          <Icon className="w-5 h-5 text-[#e52421]" />
        </div>
      )}
      <h2 className="text-xl font-bold text-white tracking-tight">{children}</h2>
    </div>
  );
}

function InfoCard({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5 hover:border-zinc-700/50 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-zinc-800/50">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetricBar({ 
  label, 
  value, 
  unit, 
  min = 0, 
  max = 100,
  idealMin,
  idealMax,
}: { 
  label: string;
  value: number | null;
  unit: string;
  min?: number;
  max?: number;
  idealMin?: number;
  idealMax?: number;
}) {
  if (value === null || value === undefined) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">{label}</span>
          <span className="text-sm text-zinc-600 italic">Não informado</span>
        </div>
      </div>
    );
  }

  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const idealStartPct = idealMin ? ((idealMin - min) / (max - min)) * 100 : null;
  const idealWidthPct = idealMin && idealMax ? ((idealMax - idealMin) / (max - min)) * 100 : null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-sm font-semibold text-white">
          {formatFixed(value, 1)} {unit}
        </span>
      </div>
      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative">
        {idealStartPct !== null && idealWidthPct !== null && (
          <div 
            className="absolute h-full bg-emerald-500/20 rounded-full"
            style={{ left: `${idealStartPct}%`, width: `${idealWidthPct}%` }}
          />
        )}
        <div 
          className="h-full bg-[#e52421] rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function BodyCompositionMetric({
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
    <div className="flex flex-col items-center p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
      <Icon className="w-5 h-5 text-zinc-500 mb-2" />
      <span className="text-2xl font-bold text-white tabular-nums">
        {hasValue ? formatFixed(value, 1) : "—"}
      </span>
      <span className="text-xs text-zinc-500">{unit}</span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">{label}</span>
      {reference && hasValue && (
        <span className="text-[10px] text-zinc-600 mt-1">Ref: {reference}</span>
      )}
    </div>
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

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (data) {
        setPlayer(data);
      }
      setLoading(false);
    };

    fetchPlayer();
  }, [slug]);

  useEffect(() => {
    if (!player?.id) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      
      const { data, error } = await supabase
        .from("player_stats")
        .select(`
          *,
          competitions:competition_id (
            id,
            name,
            display_name,
            type
          )
        `)
        .eq("player_id", player.id)
        .order("season_year", { ascending: false });

      if (error) {
        console.error("Error fetching stats:", error);
        setStatsLoading(false);
        return;
      }

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

        const seasons = Object.values(statsBySeason).sort(
          (a, b) => b.season_year - a.season_year
        );

        setCareerStats(seasons);
        
        const current = seasons.find((s) => s.season_year === currentYear);
        if (current) {
          setCurrentSeasonStats(current);
        } else if (seasons.length > 0) {
          setCurrentSeasonStats(seasons[0]);
        }

        // Aggregate by competition
        const statsByCompetition = data.reduce((acc, stat) => {
          const compId = stat.competition_id;
          if (!compId) return acc;
          
          const competition = stat.competitions as { id: string; name: string; display_name: string | null; type: string } | null;
          const compName = competition?.display_name || competition?.name || "Competição";
          const compType = competition?.type || "league";
          const key = `${compId}-${stat.season_year}`;
          
          if (!acc[key]) {
            acc[key] = {
              competition_id: compId,
              competition_name: compName,
              competition_type: compType,
              season_year: stat.season_year,
              matches: 0, minutes: 0, goals: 0, assists: 0,
              yellow_cards: 0, red_cards: 0, tackles: 0,
              interceptions: 0, recoveries: 0,
            };
          }
          const c = acc[key];
          c.matches += stat.matches || 0;
          c.minutes += stat.minutes || 0;
          c.goals += stat.goals || 0;
          c.assists += stat.assists || 0;
          c.yellow_cards += stat.yellow_cards || 0;
          c.red_cards += stat.red_cards || 0;
          c.tackles += stat.tackles || 0;
          c.interceptions += stat.interceptions || 0;
          c.recoveries += stat.recoveries || 0;
          return acc;
        }, {} as Record<string, CompetitionStats>);

        const competitions = Object.values(statsByCompetition).sort(
          (a, b) => b.season_year - a.season_year || (b.goals + b.assists) - (a.goals + a.assists)
        );
        setCompetitionStats(competitions);
      }

      setStatsLoading(false);
    };

    fetchStats();
  }, [player?.id]);

  const calculatePer90 = (value: number, minutes: number): string => {
    if (minutes < 90) return "—";
    return formatFixed((value / minutes) * 90, 2);
  };

  const getCompetitionTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      league: "Liga",
      cup: "Copa",
      state_league: "Estadual",
      continental: "Continental",
    };
    return typeMap[type] || type;
  };

  // Calculate career totals
  const careerTotals = careerStats.reduce((acc, s) => ({
    matches: acc.matches + s.matches,
    minutes: acc.minutes + s.minutes,
    goals: acc.goals + s.goals,
    assists: acc.assists + s.assists,
    yellow_cards: acc.yellow_cards + s.yellow_cards,
    red_cards: acc.red_cards + s.red_cards,
    tackles: acc.tackles + s.tackles,
    interceptions: acc.interceptions + s.interceptions,
    recoveries: acc.recoveries + s.recoveries,
    shots: acc.shots + s.shots,
    key_passes: acc.key_passes + s.key_passes,
  }), {
    matches: 0, minutes: 0, goals: 0, assists: 0,
    yellow_cards: 0, red_cards: 0, tackles: 0,
    interceptions: 0, recoveries: 0, shots: 0, key_passes: 0,
  });

  const isGK = player ? isGoalkeeper(player.position) : false;

  // Calculate BMI
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

  const tabs: { value: TabValue; label: string; shortLabel: string }[] = [
    { value: "current", label: "Temporada Atual", shortLabel: String(currentYear) },
    { value: "per90", label: "Por 90 min", shortLabel: "P/90" },
    { value: "competition", label: "Por Competição", shortLabel: "Comp." },
    { value: "career", label: "Carreira", shortLabel: "Carreira" },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black" />
        <div 
          className="absolute inset-0 opacity-[0.015]" 
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        />
      </div>

      <div className="relative pt-24 md:pt-28 lg:pt-32 pb-16 md:pb-20 lg:pb-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link 
              to="/players" 
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 md:mb-12"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm tracking-wide">Voltar para atletas</span>
            </Link>
          </motion.div>

          {/* ==================== HERO SECTION ==================== */}
          <motion.section 
            className="grid lg:grid-cols-[1fr,1.2fr] gap-8 lg:gap-16 mb-16 lg:mb-24"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Image Column */}
            <motion.div variants={fadeInUp} className="relative">
              <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-950 relative">
                <img
                  src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
                  alt={player.full_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Score Badge on image */}
                {player.auto_rating !== null && (
                  <div className="absolute bottom-6 left-6">
                    <ScoreDisplay score={player.auto_rating} size="lg" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Info Column */}
            <motion.div variants={fadeInUp} className="flex flex-col lg:py-4">
              {/* Position Tag */}
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#e52421] mb-3">
                {player.position}
              </span>
              
              {/* Name */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
                {player.full_name}
              </h1>

              {/* Secondary Positions */}
              {player.secondary_positions && player.secondary_positions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {player.secondary_positions.map((pos) => (
                    <Badge 
                      key={pos} 
                      variant="outline"
                      className="text-[10px] uppercase tracking-widest text-zinc-500 border-zinc-800 bg-transparent"
                    >
                      {pos}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 mb-8">
                {player.age && (
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-widest">Idade</span>
                    </div>
                    <p className="text-white text-lg font-semibold">{player.age} anos</p>
                  </div>
                )}
                
                {player.height && (
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                      <Ruler className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-widest">Altura</span>
                    </div>
                    <p className="text-white text-lg font-semibold">{player.height} cm</p>
                  </div>
                )}
                
                {player.dominant_foot && (
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-widest">Pé</span>
                    </div>
                    <p className="text-white text-lg font-semibold capitalize">{player.dominant_foot}</p>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                    <Flag className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-widest">País</span>
                  </div>
                  <p className="text-white text-lg font-semibold">{player.nationality}</p>
                </div>
                
                {player.current_club && (
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-widest">Clube</span>
                    </div>
                    <p className="text-white text-lg font-semibold">{player.current_club}</p>
                  </div>
                )}
              </div>

              {/* Tactical Profile Chips */}
              {(player.primary_tactical_role || player.play_style || (player.strengths && player.strengths.length > 0)) && (
                <div className="mb-8">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {player.primary_tactical_role && (
                      <Badge className="bg-zinc-800 text-zinc-200 border-0 text-xs px-3 py-1">
                        {player.primary_tactical_role}
                      </Badge>
                    )}
                    {player.secondary_tactical_role && (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs px-3 py-1">
                        {player.secondary_tactical_role}
                      </Badge>
                    )}
                    {player.play_style && (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs px-3 py-1">
                        {player.play_style}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Strengths */}
                  {player.strengths && player.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {player.strengths.slice(0, 5).map((s) => (
                        <span 
                          key={s} 
                          className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bio */}
              {player.bio_public && (
                <div className="mb-8">
                  <p className="text-zinc-400 text-sm leading-relaxed">{player.bio_public}</p>
                </div>
              )}

              {/* CTA */}
              <div className="mt-auto pt-4">
                <Link to={`/contact?player=${player.slug}`}>
                  <Button 
                    size="lg"
                    className="bg-[#e52421] hover:bg-[#c91f1c] text-white font-medium px-8 rounded-full border-0 shadow-lg shadow-[#e52421]/20"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar com a M3 sobre este atleta
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.section>

          {/* ==================== IDENTITY & PROFILE SECTION ==================== */}
          <motion.section 
            className="mb-16 lg:mb-24"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <SectionTitle icon={FileText}>Identidade & Perfil</SectionTitle>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Identity Card */}
              <InfoCard title="Identidade" icon={User}>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Nome</span>
                    <span className="text-white text-sm font-medium">{player.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Idade</span>
                    <span className="text-white text-sm font-medium">{player.age || "—"} anos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Altura</span>
                    <span className="text-white text-sm font-medium">{player.height || "—"} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Pé</span>
                    <span className="text-white text-sm font-medium capitalize">{player.dominant_foot || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Nacionalidade</span>
                    <span className="text-white text-sm font-medium">{player.nationality}</span>
                  </div>
                </div>
              </InfoCard>

              {/* Contract Card */}
              <InfoCard title="Contrato" icon={FileText}>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Status</span>
                    <Badge 
                      variant={player.contract_status === "contracted" ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        player.contract_status === "contracted" 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {player.contract_status === "contracted" ? "Contratado" : "Livre"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Clube</span>
                    <span className="text-white text-sm font-medium">{player.current_club || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">País</span>
                    <span className="text-white text-sm font-medium">{player.country || player.nationality}</span>
                  </div>
                </div>
              </InfoCard>

              {/* Tactical Profile Card */}
              <InfoCard title="Perfil Tático" icon={Target}>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Posição</span>
                    <span className="text-white text-sm font-medium">{player.position}</span>
                  </div>
                  {player.secondary_positions && player.secondary_positions.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-sm block mb-1">Posições Secundárias</span>
                      <div className="flex flex-wrap gap-1">
                        {player.secondary_positions.map((pos) => (
                          <Badge key={pos} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                            {pos}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {player.primary_tactical_role && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500 text-sm">Função</span>
                      <span className="text-white text-sm font-medium">{player.primary_tactical_role}</span>
                    </div>
                  )}
                  {player.play_style && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500 text-sm">Estilo</span>
                      <span className="text-white text-sm font-medium">{player.play_style}</span>
                    </div>
                  )}
                </div>
              </InfoCard>
            </div>

            {/* Strengths & Areas to Develop */}
            {((player.strengths && player.strengths.length > 0) || (player.areas_to_develop && player.areas_to_develop.length > 0)) && (
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                {player.strengths && player.strengths.length > 0 && (
                  <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10">
                        <Zap className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500">Pontos Fortes</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {player.strengths.map((s) => (
                        <span 
                          key={s} 
                          className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {player.areas_to_develop && player.areas_to_develop.length > 0 && (
                  <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                      </div>
                      <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500">A Desenvolver</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {player.areas_to_develop.map((a) => (
                        <span 
                          key={a} 
                          className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* ==================== STATISTICS SECTION ==================== */}
          <motion.section 
            className="mb-16 lg:mb-24"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <SectionTitle icon={Activity}>Estatísticas do Atleta</SectionTitle>

            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : careerStats.length === 0 ? (
              <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-12 text-center">
                <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500">Sem estatísticas disponíveis para este atleta.</p>
              </div>
            ) : (
              <>
                {/* Career Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
                  <StatCard label="Jogos" value={careerTotals.matches} icon={Trophy} highlight />
                  <StatCard label="Minutos" value={careerTotals.minutes} icon={Clock} />
                  <StatCard label="Gols" value={careerTotals.goals} icon={Target} highlight />
                  <StatCard label="Assistências" value={careerTotals.assists} />
                  <StatCard label="Chutes" value={careerTotals.shots} />
                  <StatCard label="Passes Dec." value={careerTotals.key_passes} />
                  <StatCard label="Desarmes" value={careerTotals.tackles} icon={Shield} />
                  <StatCard 
                    label="Cartões" 
                    value={`${careerTotals.yellow_cards}/${careerTotals.red_cards}`} 
                    subValue="Am/Vm"
                  />
                </div>

                {/* Tabs */}
                <div className="flex gap-4 sm:gap-6 mb-8 border-b border-zinc-800 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                        activeTab === tab.value ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                      )}
                    >
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                      {activeTab === tab.value && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e52421] rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/50 p-6">
                  {activeTab === "current" && (
                    <>
                      {currentSeasonStats ? (
                        <div className="space-y-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                              {currentSeasonStats.season_year}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 sm:gap-6">
                            <StatRow label="Jogos" value={currentSeasonStats.matches} />
                            <StatRow label="Minutos" value={currentSeasonStats.minutes} />
                            <StatRow label="Gols" value={currentSeasonStats.goals} highlight />
                            <StatRow label="Assistências" value={currentSeasonStats.assists} />
                            <StatRow label="G+A" value={currentSeasonStats.goals + currentSeasonStats.assists} highlight />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-zinc-800">
                            <StatRow label="Desarmes" value={currentSeasonStats.tackles} small />
                            <StatRow label="Interceptações" value={currentSeasonStats.interceptions} small />
                            <StatRow label="Recuperações" value={currentSeasonStats.recoveries} small />
                            <div className="flex gap-6">
                              <StatRow label="Amarelos" value={currentSeasonStats.yellow_cards} variant="warning" small />
                              <StatRow label="Vermelhos" value={currentSeasonStats.red_cards} variant="danger" small />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <EmptyState message={`Sem dados para ${currentYear}`} />
                      )}
                    </>
                  )}

                  {activeTab === "per90" && (
                    <>
                      {currentSeasonStats && currentSeasonStats.minutes >= 90 ? (
                        <div className="space-y-8">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                            <StatRow label="Gols/90" value={calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes)} highlight />
                            <StatRow label="Assist./90" value={calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes)} />
                            <StatRow label="G+A/90" value={calculatePer90(currentSeasonStats.goals + currentSeasonStats.assists, currentSeasonStats.minutes)} highlight />
                            <StatRow 
                              label="Min/Gol" 
                              value={currentSeasonStats.goals > 0 ? Math.round(currentSeasonStats.minutes / currentSeasonStats.goals) : "—"} 
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-zinc-800">
                            <StatRow label="Desarmes/90" value={calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes)} small />
                            <StatRow label="Intercep./90" value={calculatePer90(currentSeasonStats.interceptions, currentSeasonStats.minutes)} small />
                            <StatRow label="Recup./90" value={calculatePer90(currentSeasonStats.recoveries, currentSeasonStats.minutes)} small />
                          </div>
                        </div>
                      ) : (
                        <EmptyState message="Mínimo de 90 minutos necessário" />
                      )}
                    </>
                  )}

                  {activeTab === "competition" && (
                    <>
                      {competitionStats.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-zinc-800">
                                <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                                  Competição
                                </th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                                  Temp.
                                </th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                                  J
                                </th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium hidden sm:table-cell">
                                  Min
                                </th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                                  G
                                </th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                                  A
                                </th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                                  G+A
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {competitionStats.map((comp, idx) => (
                                <tr key={`${comp.competition_id}-${comp.season_year}-${idx}`} className="border-b border-zinc-800/50">
                                  <td className="py-3 pr-4">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-white text-sm font-medium truncate max-w-[180px] sm:max-w-none">
                                        {comp.competition_name}
                                      </span>
                                      <span className="text-[9px] uppercase tracking-widest text-zinc-600">
                                        {getCompetitionTypeLabel(comp.competition_type)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 text-center text-zinc-500 text-sm">{comp.season_year}</td>
                                  <td className="py-3 text-center text-zinc-400 text-sm">{comp.matches}</td>
                                  <td className="py-3 text-center text-zinc-400 text-sm hidden sm:table-cell">{comp.minutes}</td>
                                  <td className="py-3 text-center text-white text-sm font-medium">{comp.goals}</td>
                                  <td className="py-3 text-center text-zinc-400 text-sm">{comp.assists}</td>
                                  <td className="py-3 text-center text-white text-sm font-medium">{comp.goals + comp.assists}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <EmptyState message="Sem dados de competições" />
                      )}
                    </>
                  )}

                  {activeTab === "career" && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                              Temporada
                            </th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                              J
                            </th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                              Min
                            </th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                              G
                            </th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                              A
                            </th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                              G+A
                            </th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium hidden sm:table-cell">
                              Cartões
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {careerStats.map((season) => (
                            <tr key={season.season_year} className="border-b border-zinc-800/50">
                              <td className="py-3 text-white text-sm font-medium">
                                {season.season_year}
                                {season.season_year === currentYear && (
                                  <Badge variant="outline" className="ml-2 text-[9px] border-zinc-700 text-zinc-500">
                                    Atual
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 text-center text-zinc-400 text-sm">{season.matches}</td>
                              <td className="py-3 text-center text-zinc-400 text-sm">{season.minutes}</td>
                              <td className="py-3 text-center text-white text-sm font-medium">{season.goals}</td>
                              <td className="py-3 text-center text-zinc-400 text-sm">{season.assists}</td>
                              <td className="py-3 text-center text-white text-sm font-medium">{season.goals + season.assists}</td>
                              <td className="py-3 text-center text-sm hidden sm:table-cell">
                                <span className="text-amber-400">{season.yellow_cards}</span>
                                <span className="text-zinc-600 mx-1">/</span>
                                <span className="text-red-400">{season.red_cards}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-700 bg-zinc-800/30">
                            <td className="py-3 text-white text-sm font-semibold">Total</td>
                            <td className="py-3 text-center text-white text-sm font-semibold">{careerTotals.matches}</td>
                            <td className="py-3 text-center text-white text-sm font-semibold">{careerTotals.minutes}</td>
                            <td className="py-3 text-center text-white text-sm font-semibold">{careerTotals.goals}</td>
                            <td className="py-3 text-center text-white text-sm font-semibold">{careerTotals.assists}</td>
                            <td className="py-3 text-center text-white text-sm font-semibold">{careerTotals.goals + careerTotals.assists}</td>
                            <td className="py-3 text-center text-sm font-semibold hidden sm:table-cell">
                              <span className="text-amber-400">{careerTotals.yellow_cards}</span>
                              <span className="text-zinc-600 mx-1">/</span>
                              <span className="text-red-400">{careerTotals.red_cards}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.section>

          {/* ==================== PHYSICAL DATA SECTION ==================== */}
          {(player.height || player.weight || player.wingspan) && (
            <motion.section 
              className="mb-16 lg:mb-24"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionTitle icon={Ruler}>Medidas Corporais</SectionTitle>
              
              <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-6">
                <div className="space-y-6">
                  <MetricBar 
                    label="Altura" 
                    value={player.height} 
                    unit="cm" 
                    min={160} 
                    max={200}
                    idealMin={175}
                    idealMax={190}
                  />
                  <MetricBar 
                    label="Peso" 
                    value={player.weight} 
                    unit="kg" 
                    min={55} 
                    max={95}
                    idealMin={70}
                    idealMax={85}
                  />
                  <MetricBar 
                    label="Envergadura" 
                    value={player.wingspan} 
                    unit="cm" 
                    min={160} 
                    max={210}
                    idealMin={180}
                    idealMax={200}
                  />
                </div>
              </div>
            </motion.section>
          )}

          {/* ==================== BODY COMPOSITION SECTION ==================== */}
          {(player.body_fat_percentage || player.muscle_mass || bmi) && (
            <motion.section 
              className="mb-16 lg:mb-24"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionTitle icon={Scale}>Composição Corporal</SectionTitle>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <BodyCompositionMetric
                  label="Gordura Corporal"
                  value={player.body_fat_percentage}
                  unit="%"
                  icon={Percent}
                  reference="8-12%"
                />
                <BodyCompositionMetric
                  label="Massa Muscular"
                  value={player.muscle_mass}
                  unit="kg"
                  icon={Dumbbell}
                  reference="45-55 kg"
                />
                <BodyCompositionMetric
                  label="IMC"
                  value={bmi}
                  unit=""
                  icon={Scale}
                  reference="22-24"
                />
              </div>
            </motion.section>
          )}

          {/* ==================== PHYSICAL PERFORMANCE SECTION ==================== */}
          {(player.max_speed || player.sprint_30m || player.vo2_max) && (
            <motion.section 
              className="mb-16 lg:mb-24"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <SectionTitle icon={Zap}>Performance Física</SectionTitle>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <BodyCompositionMetric
                  label="Velocidade Máxima"
                  value={player.max_speed}
                  unit="km/h"
                  icon={Zap}
                  reference="32+ km/h"
                />
                <BodyCompositionMetric
                  label="Sprint 30m"
                  value={player.sprint_30m}
                  unit="s"
                  icon={Timer}
                  reference="< 4.0s"
                />
                <BodyCompositionMetric
                  label="VO2 Máx"
                  value={player.vo2_max}
                  unit="ml/kg/min"
                  icon={Heart}
                  reference="55+ ml"
                />
              </div>
            </motion.section>
          )}

          {/* ==================== VIDEO SECTION ==================== */}
          {player.highlight_video_url && (() => {
            const embedUrl = getYouTubeEmbedUrl(player.highlight_video_url);
            if (!embedUrl) return null;
            return (
              <motion.section 
                className="mb-16 lg:mb-24"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <SectionTitle icon={Play}>Highlights & Análise em Vídeo</SectionTitle>
                
                <div className="overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/50">
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      title="Player Highlights"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </motion.section>
            );
          })()}

          {/* ==================== FINAL CTA ==================== */}
          <motion.section
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Interessado em {player.full_name.split(" ")[0]}?
            </h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Entre em contato com a M3 Agency para mais informações sobre representação e oportunidades.
            </p>
            <Link to={`/contact?player=${player.slug}`}>
              <Button 
                size="lg"
                className="bg-[#e52421] hover:bg-[#c91f1c] text-white font-medium px-10 rounded-full border-0 shadow-lg shadow-[#e52421]/20"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar com a M3 Agency
              </Button>
            </Link>
          </motion.section>

        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
