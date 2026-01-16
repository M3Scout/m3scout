import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Target, Clock, Trophy, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatFixed } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface SeasonSummaryCardProps {
  playerId: string;
}

interface SeasonStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
}

const currentYear = new Date().getFullYear();

// Metric card component for main stats
interface MetricCardProps {
  value: number;
  label: string;
  icon: React.ElementType;
  variant?: "default" | "goals" | "assists" | "contribution";
}

function MetricCard({ value, label, icon: Icon, variant = "default" }: MetricCardProps) {
  const variantStyles = {
    default: {
      bg: "bg-card/50",
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
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all hover:scale-[1.02]",
        styles.bg
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn("text-3xl font-bold tracking-tight", styles.text)}>
            {value}
          </p>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
        </div>
        <div className={cn("rounded-lg p-2", styles.iconBg)}>
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

export function SeasonSummaryCard({ playerId }: SeasonSummaryCardProps) {
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("player_stats")
        .select("matches, minutes, goals, assists")
        .eq("player_id", playerId)
        .eq("season_year", currentYear);

      if (Array.isArray(data) && data.length > 0) {
        const aggregated = data.reduce(
          (acc, s) => ({
            matches: acc.matches + (s.matches || 0),
            minutes: acc.minutes + (s.minutes || 0),
            goals: acc.goals + (s.goals || 0),
            assists: acc.assists + (s.assists || 0),
          }),
          { matches: 0, minutes: 0, goals: 0, assists: 0 }
        );
        setStats(aggregated);
      }
      setLoading(false);
    };

    fetchStats();
  }, [playerId]);

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

  const goalParticipation = stats.goals + stats.assists;
  const goalsPerMatch = stats.matches > 0 
    ? formatFixed(stats.goals / stats.matches, 2, "0.00") 
    : "0.00";
  const participationPerMatch = stats.matches > 0 
    ? formatFixed(goalParticipation / stats.matches, 2, "0.00") 
    : "0.00";

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

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
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
          <MetricCard
            value={stats.goals}
            label="Gols"
            icon={Target}
            variant="goals"
          />
          <MetricCard
            value={stats.assists}
            label="Assistências"
            icon={Trophy}
            variant="assists"
          />
          <MetricCard
            value={goalParticipation}
            label="G+A"
            icon={BarChart3}
            variant="contribution"
          />
        </div>

        {/* Derived Metrics */}
        <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-border/30">
          <DerivedMetric value={goalsPerMatch} label="gols/jogo" />
          <DerivedMetric value={participationPerMatch} label="G+A/jogo" />
        </div>
      </CardContent>
    </Card>
  );
}
