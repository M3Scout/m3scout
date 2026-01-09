import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

      if (data && data.length > 0) {
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
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.matches === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            Resumo da Temporada {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados para a temporada atual
          </p>
        </CardContent>
      </Card>
    );
  }

  const goalParticipation = stats.goals + stats.assists;
  const goalsPerMatch = stats.matches > 0 ? (stats.goals / stats.matches).toFixed(2) : "0.00";
  const participationPerMatch = stats.matches > 0 ? (goalParticipation / stats.matches).toFixed(2) : "0.00";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          Resumo da Temporada {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-2xl font-bold">{stats.matches}</p>
            <p className="text-xs text-muted-foreground">Jogos</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-2xl font-bold">{stats.minutes}</p>
            <p className="text-xs text-muted-foreground">Minutos</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <p className="text-2xl font-bold text-primary">{stats.goals}</p>
            <p className="text-xs text-muted-foreground">Gols</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-2xl font-bold">{stats.assists}</p>
            <p className="text-xs text-muted-foreground">Assistências</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-emerald-500/10">
            <p className="text-2xl font-bold text-emerald-400">{goalParticipation}</p>
            <p className="text-xs text-muted-foreground">G+A</p>
          </div>
        </div>

        {/* Per match stats */}
        <div className="flex gap-2 mt-3 justify-center">
          <Badge variant="secondary" className="text-xs">
            {goalsPerMatch} gols/jogo
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {participationPerMatch} G+A/jogo
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
