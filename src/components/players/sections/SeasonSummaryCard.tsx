import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  Target, 
  Clock, 
  Trophy, 
  Users, 
  Loader2,
  Shield,
  Crosshair,
  Sparkles,
  Hand,
  Goal,
  ArrowRightLeft,
  Footprints,
  Swords
} from "lucide-react";
import { usePlayerMatchStats, toSeasonSummaryFormat } from "@/hooks/usePlayerMatchStats";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface SeasonSummaryCardProps {
  playerId: string;
  playerPosition?: string;
}

interface SeasonStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  chances_created: number;
  key_passes: number;
  tackles: number;
  interceptions: number;
  accurate_passes: number;
  total_passes: number;
  clearances: number;
  duels_won: number;
  total_duels: number;
  recoveries: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  aerial_duels_won: number;
}

const currentYear = new Date().getFullYear();

// Position category mapping
type PositionCategory = "ATA" | "MEIA" | "VOLANTE" | "LATERAL" | "ZAGUEIRO" | "GK";

function getPositionCategory(position: string): PositionCategory {
  const pos = position.toLowerCase().trim();
  
  if (pos.includes("goleiro") || pos === "gk" || pos === "goalkeeper") return "GK";
  if (pos.includes("zagueiro") || pos === "cb" || pos.includes("central defender")) return "ZAGUEIRO";
  if (pos.includes("lateral") || pos.includes("ala") || pos === "lb" || pos === "rb" || pos.includes("wingback")) return "LATERAL";
  if (pos.includes("volante") || pos === "cdm" || pos === "dm" || pos.includes("defensive mid")) return "VOLANTE";
  if (pos.includes("atacante") || pos.includes("ponta") || pos.includes("centroavante") || pos === "st" || pos === "cf" || pos === "lw" || pos === "rw" || pos.includes("forward") || pos.includes("striker") || pos.includes("winger")) return "ATA";
  if (pos.includes("meia") || pos === "cam" || pos === "cm" || pos === "am" || pos.includes("midfielder")) return "MEIA";
  
  return "ATA";
}

// Metric variant types
type MetricVariant = "default" | "goals" | "assists" | "contribution" | "defensive" | "gk" | "negative";

// Premium variant styles - desaturated, elegant
const VARIANT_STYLES: Record<MetricVariant, { 
  container: string; 
  value: string; 
  iconBg: string; 
  iconColor: string;
  glow?: string;
}> = {
  default: {
    container: "from-zinc-900/80 to-zinc-950/80 border-white/[0.04]",
    value: "text-zinc-300",
    iconBg: "bg-zinc-800/60",
    iconColor: "text-zinc-500",
  },
  goals: {
    container: "from-rose-500/[0.06] via-zinc-900/80 to-zinc-950/80 border-rose-500/15",
    value: "text-rose-400/90",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400/80",
    glow: "shadow-[0_0_20px_-4px_rgba(244,63,94,0.15)]",
  },
  assists: {
    container: "from-blue-500/[0.06] via-zinc-900/80 to-zinc-950/80 border-blue-500/15",
    value: "text-blue-400/90",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400/80",
    glow: "shadow-[0_0_20px_-4px_rgba(59,130,246,0.15)]",
  },
  contribution: {
    container: "from-emerald-500/[0.06] via-zinc-900/80 to-zinc-950/80 border-emerald-500/15",
    value: "text-emerald-400/90",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400/80",
    glow: "shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)]",
  },
  defensive: {
    container: "from-cyan-500/[0.06] via-zinc-900/80 to-zinc-950/80 border-cyan-500/15",
    value: "text-cyan-400/90",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400/80",
  },
  gk: {
    container: "from-amber-500/[0.06] via-zinc-900/80 to-zinc-950/80 border-amber-500/15",
    value: "text-amber-400/90",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400/80",
  },
  negative: {
    container: "from-rose-500/[0.04] via-zinc-900/80 to-zinc-950/80 border-rose-500/10",
    value: "text-rose-400/80",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400/70",
  },
};

// Premium Metric Card - hierarchy: number > label > icon
interface MetricCardProps {
  value: number | string;
  label: string;
  icon: React.ElementType;
  variant?: MetricVariant;
}

function MetricCard({ value, label, icon: Icon, variant = "default" }: MetricCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        // Premium glass card
        "group relative rounded-xl p-4 h-[96px]",
        "bg-gradient-to-br border backdrop-blur-sm",
        "transition-all duration-200",
        "hover:border-white/[0.08] hover:translate-y-[-1px]",
        styles.container,
        styles.glow
      )}
    >
      <div className="flex h-full items-start justify-between">
        {/* Left: Value (primary) + Label (secondary) */}
        <div className="flex flex-col justify-between h-full min-w-0 flex-1">
          {/* Value - maximum emphasis */}
          <p className={cn(
            "text-3xl sm:text-4xl font-bold tracking-tight leading-none",
            styles.value
          )}>
            {value}
          </p>
          {/* Label - refined secondary */}
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.1em] mt-auto">
            {label}
          </p>
        </div>
        
        {/* Right: Icon - tertiary, subtle */}
        <div className={cn(
          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ml-3",
          "transition-all duration-200",
          "group-hover:scale-105",
          styles.iconBg
        )}>
          <Icon className={cn("w-4 h-4", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}

// Premium Derived Metric Chip
interface DerivedMetricProps {
  value: string;
  label: string;
}

function DerivedMetric({ value, label }: DerivedMetricProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full",
      "bg-zinc-900/60 border border-white/[0.04]",
      "backdrop-blur-sm",
      "transition-all duration-200",
      "hover:border-white/[0.08] hover:bg-zinc-800/40"
    )}>
      <span className="text-sm font-semibold text-zinc-200">{value}</span>
      <span className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// Position-specific metrics configuration
interface PositionMetric {
  key: keyof SeasonStats | "goal_participation" | "pass_accuracy" | "duel_success";
  label: string;
  icon: React.ElementType;
  variant: MetricVariant;
  compute?: (stats: SeasonStats) => number | string;
}

function getPositionMetrics(category: PositionCategory): PositionMetric[] {
  switch (category) {
    case "ATA":
      return [
        { key: "goals", label: "Gols", icon: Target, variant: "goals" },
        { key: "assists", label: "Assistências", icon: Trophy, variant: "assists" },
        { key: "goal_participation", label: "G+A", icon: BarChart3, variant: "contribution", compute: (s) => s.goals + s.assists },
      ];
    case "MEIA":
      return [
        { key: "assists", label: "Assistências", icon: Trophy, variant: "assists" },
        { key: "chances_created", label: "Chances Criadas", icon: Sparkles, variant: "contribution" },
        { key: "key_passes", label: "Passes Decisivos", icon: ArrowRightLeft, variant: "defensive" },
      ];
    case "VOLANTE":
      return [
        { key: "tackles", label: "Desarmes", icon: Shield, variant: "defensive" },
        { key: "interceptions", label: "Interceptações", icon: Crosshair, variant: "defensive" },
        { key: "pass_accuracy", label: "Passes Certos %", icon: Target, variant: "contribution", 
          compute: (s) => s.total_passes > 0 ? `${formatFixed((s.accurate_passes / s.total_passes) * 100, 0, "0")}%` : "0%" },
      ];
    case "LATERAL":
      return [
        { key: "assists", label: "Assistências", icon: Trophy, variant: "assists" },
        { key: "recoveries", label: "Recuperações", icon: Footprints, variant: "defensive" },
        { key: "duel_success", label: "Duelos Ganhos", icon: Swords, variant: "contribution", compute: (s) => s.duels_won },
      ];
    case "ZAGUEIRO":
      return [
        { key: "clearances", label: "Cortes", icon: Shield, variant: "defensive" },
        { key: "tackles", label: "Desarmes", icon: Crosshair, variant: "defensive" },
        { key: "interceptions", label: "Interceptações", icon: Target, variant: "contribution" },
      ];
    case "GK":
      return [
        { key: "saves", label: "Defesas", icon: Hand, variant: "gk" },
        { key: "goals_conceded", label: "Gols Sofridos", icon: Goal, variant: "negative" },
        { key: "clean_sheets", label: "Clean Sheets", icon: Shield, variant: "contribution" },
      ];
    default:
      return [
        { key: "goals", label: "Gols", icon: Target, variant: "goals" },
        { key: "assists", label: "Assistências", icon: Trophy, variant: "assists" },
        { key: "goal_participation", label: "G+A", icon: BarChart3, variant: "contribution", compute: (s) => s.goals + s.assists },
      ];
  }
}

// Get derived metrics based on position
function getDerivedMetrics(category: PositionCategory, stats: SeasonStats): { value: string; label: string }[] {
  const matches = stats.matches || 1;
  
  switch (category) {
    case "ATA":
      return [
        { value: formatFixed(stats.goals / matches, 2, "0.00"), label: "gols/jogo" },
        { value: formatFixed((stats.goals + stats.assists) / matches, 2, "0.00"), label: "G+A/jogo" },
      ];
    case "MEIA":
      return [
        { value: formatFixed(stats.assists / matches, 2, "0.00"), label: "assists/jogo" },
        { value: formatFixed(stats.chances_created / matches, 2, "0.00"), label: "chances/jogo" },
      ];
    case "VOLANTE":
      return [
        { value: formatFixed((stats.tackles + stats.interceptions) / matches, 2, "0.00"), label: "ações def./jogo" },
        { value: formatFixed(stats.recoveries / matches, 2, "0.00"), label: "recup./jogo" },
      ];
    case "LATERAL":
      return [
        { value: formatFixed(stats.duels_won / matches, 2, "0.00"), label: "duelos/jogo" },
        { value: formatFixed(stats.recoveries / matches, 2, "0.00"), label: "recup./jogo" },
      ];
    case "ZAGUEIRO":
      return [
        { value: formatFixed((stats.clearances + stats.tackles) / matches, 2, "0.00"), label: "ações def./jogo" },
        { value: formatFixed(stats.aerial_duels_won / matches, 2, "0.00"), label: "duelos aéreos/jogo" },
      ];
    case "GK":
      return [
        { value: formatFixed(stats.saves / matches, 2, "0.00"), label: "defesas/jogo" },
        { value: formatFixed(stats.goals_conceded / matches, 2, "0.00"), label: "gols sofridos/jogo" },
      ];
    default:
      return [
        { value: formatFixed(stats.goals / matches, 2, "0.00"), label: "gols/jogo" },
        { value: formatFixed((stats.goals + stats.assists) / matches, 2, "0.00"), label: "G+A/jogo" },
      ];
  }
}

export function SeasonSummaryCard({ playerId, playerPosition = "" }: SeasonSummaryCardProps) {
  const positionCategory = getPositionCategory(playerPosition);
  
  const { totals, isLoading: loading } = usePlayerMatchStats({
    playerId,
    seasonYear: currentYear,
  });

  const stats: SeasonStats | null = totals.matches > 0 ? toSeasonSummaryFormat(totals) : null;

  if (loading) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.matches === 0) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardContent className="py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Resumo da Temporada {currentYear}
              </h3>
              <p className="text-xs text-zinc-600">Performance do atleta</p>
            </div>
          </div>
          <div className="text-center py-6">
            <p className="text-sm text-zinc-600">
              Sem dados registrados para a temporada atual
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const positionMetrics = getPositionMetrics(positionCategory);
  const derivedMetrics = getDerivedMetrics(positionCategory, stats);

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Resumo da Temporada {currentYear}
            </h3>
            <p className="text-xs text-zinc-600">Performance do atleta</p>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {/* Base metrics */}
          <MetricCard
            value={stats.matches}
            label="Jogos"
            icon={Users}
            variant="default"
          />
          <MetricCard
            value={stats.minutes}
            label="Minutos"
            icon={Clock}
            variant="default"
          />
          
          {/* Position-specific metrics */}
          {positionMetrics.map((metric) => {
            const value = metric.compute 
              ? metric.compute(stats) 
              : stats[metric.key as keyof SeasonStats] ?? 0;
            
            return (
              <MetricCard
                key={metric.key}
                value={value}
                label={metric.label}
                icon={metric.icon}
                variant={metric.variant}
              />
            );
          })}
        </div>

        {/* Derived Metrics */}
        <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-zinc-800/40">
          {derivedMetrics.map((metric, index) => (
            <DerivedMetric key={index} value={metric.value} label={metric.label} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
