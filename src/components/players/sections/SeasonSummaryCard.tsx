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
  
  // Goalkeeper
  if (pos.includes("goleiro") || pos === "gk" || pos === "goalkeeper") {
    return "GK";
  }
  
  // Center Back
  if (pos.includes("zagueiro") || pos === "cb" || pos.includes("central defender")) {
    return "ZAGUEIRO";
  }
  
  // Fullback/Wingback
  if (pos.includes("lateral") || pos.includes("ala") || pos === "lb" || pos === "rb" || pos.includes("wingback")) {
    return "LATERAL";
  }
  
  // Defensive Midfielder
  if (pos.includes("volante") || pos === "cdm" || pos === "dm" || pos.includes("defensive mid")) {
    return "VOLANTE";
  }
  
  // Attacking positions (forward, winger)
  if (
    pos.includes("atacante") || 
    pos.includes("ponta") || 
    pos.includes("centroavante") ||
    pos === "st" || 
    pos === "cf" || 
    pos === "lw" || 
    pos === "rw" ||
    pos.includes("forward") ||
    pos.includes("striker") ||
    pos.includes("winger")
  ) {
    return "ATA";
  }
  
  // Midfielder (default for meia, meia atacante, etc)
  if (
    pos.includes("meia") || 
    pos === "cam" || 
    pos === "cm" || 
    pos === "am" ||
    pos.includes("midfielder")
  ) {
    return "MEIA";
  }
  
  // Default to attacking if unclear
  return "ATA";
}

// Metric variant types
type MetricVariant = "default" | "goals" | "assists" | "contribution" | "defensive" | "gk" | "negative";

// Standardized variant styles - only colors change, structure stays identical
const VARIANT_STYLES: Record<MetricVariant, { bg: string; text: string; iconBg: string; iconColor: string }> = {
  default: {
    bg: "bg-card/50 border-border/50",
    text: "text-foreground",
    iconBg: "bg-muted/50",
    iconColor: "text-muted-foreground",
  },
  goals: {
    bg: "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20",
    text: "text-red-400",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
  },
  assists: {
    bg: "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20",
    text: "text-blue-400",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
  },
  contribution: {
    bg: "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  defensive: {
    bg: "bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20",
    text: "text-cyan-400",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
  },
  gk: {
    bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20",
    text: "text-amber-400",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  negative: {
    bg: "bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20",
    text: "text-rose-400",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
  },
};

// Metric card component - FIXED STRUCTURE for all cards
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
        // Fixed structure: same height, padding, border-radius for ALL cards
        "relative h-[88px] rounded-xl border p-4 transition-all hover:scale-[1.02]",
        styles.bg
      )}
    >
      {/* Fixed internal grid layout - identical for all cards */}
      <div className="flex h-full items-start justify-between">
        {/* Left: Value + Label - always same position */}
        <div className="flex flex-col justify-between h-full min-w-0 flex-1">
          <p className={cn(
            "text-2xl sm:text-3xl font-bold tracking-tight leading-none truncate",
            styles.text
          )}>
            {value}
          </p>
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mt-auto">
            {label}
          </p>
        </div>
        
        {/* Right: Icon - ALWAYS same size, position, container */}
        <div className={cn(
          // Fixed icon container: 32x32px, same border-radius, same position
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ml-2",
          styles.iconBg
        )}>
          {/* Fixed icon size: always 16x16px (w-4 h-4) */}
          <Icon className={cn("w-4 h-4", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}

// Derived metric badge component
interface DerivedMetricProps {
  value: string;
  label: string;
}

function DerivedMetric({ value, label }: DerivedMetricProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
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
        { key: "duel_success", label: "Duelos Ganhos", icon: Swords, variant: "contribution",
          compute: (s) => s.duels_won },
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
  
  // Use the unified Stats Engine - single source of truth from match_player_stats
  const { totals, isLoading: loading } = usePlayerMatchStats({
    playerId,
    seasonYear: currentYear,
  });

  // Convert to the format expected by this component
  const stats: SeasonStats | null = totals.matches > 0 ? toSeasonSummaryFormat(totals) : null;

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.matches === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Resumo da Temporada {currentYear}</h3>
              <p className="text-xs text-muted-foreground">Performance do atleta</p>
            </div>
          </div>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
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
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Resumo da Temporada {currentYear}</h3>
            <p className="text-xs text-muted-foreground">Performance do atleta</p>
          </div>
        </div>

        {/* Main Metrics Grid - Base + Position-specific */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {/* Base metrics - always shown */}
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
        <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-border/30">
          {derivedMetrics.map((metric, index) => (
            <DerivedMetric key={index} value={metric.value} label={metric.label} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
