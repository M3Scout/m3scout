import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Target,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatFixed } from "@/lib/formatters";

interface PublicStatsSectionProps {
  playerId: string;
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
}

const currentYear = new Date().getFullYear();

export function PublicStatsSection({ playerId }: PublicStatsSectionProps) {
  const [currentSeasonStats, setCurrentSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch all stats for the player
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .order("season_year", { ascending: false });

      if (error) {
        console.error("Error fetching stats:", error);
        setLoading(false);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        // Aggregate by season
        const statsBySeason = data.reduce((acc, stat) => {
          const year = stat.season_year;
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
            };
          }
          acc[year].matches += stat.matches || 0;
          acc[year].minutes += stat.minutes || 0;
          acc[year].goals += stat.goals || 0;
          acc[year].assists += stat.assists || 0;
          acc[year].yellow_cards += stat.yellow_cards || 0;
          acc[year].red_cards += stat.red_cards || 0;
          acc[year].tackles += stat.tackles || 0;
          acc[year].interceptions += stat.interceptions || 0;
          acc[year].recoveries += stat.recoveries || 0;
          return acc;
        }, {} as Record<number, SeasonStats>);

        const seasons = Object.values(statsBySeason).sort(
          (a, b) => b.season_year - a.season_year
        );

        setCareerStats(seasons);
        
        const current = seasons.find((s) => s.season_year === currentYear);
        if (current) {
          setCurrentSeasonStats(current);
        }
      }

      setLoading(false);
    };

    fetchStats();
  }, [playerId]);

  const calculatePer90 = (value: number, minutes: number): string => {
    if (minutes < 90) return "—";
    return formatFixed((value / minutes) * 90, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const safeCareerStats = Array.isArray(careerStats) ? careerStats : [];
  if (safeCareerStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Sem estatísticas disponíveis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Estatísticas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Temporada Atual</span>
              <span className="sm:hidden">{currentYear}</span>
            </TabsTrigger>
            <TabsTrigger value="per90" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Por 90 min</span>
              <span className="sm:hidden">P/90</span>
            </TabsTrigger>
            <TabsTrigger value="career" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Carreira</span>
              <span className="sm:hidden">Carreira</span>
            </TabsTrigger>
          </TabsList>

          {/* Current Season Tab */}
          <TabsContent value="current">
            {currentSeasonStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <StatBox
                    label="Jogos"
                    value={currentSeasonStats.matches}
                    icon={<Target className="w-4 h-4" />}
                  />
                  <StatBox
                    label="Minutos"
                    value={currentSeasonStats.minutes}
                    icon={<Clock className="w-4 h-4" />}
                  />
                  <StatBox
                    label="Gols"
                    value={currentSeasonStats.goals}
                    highlight
                  />
                  <StatBox
                    label="Assistências"
                    value={currentSeasonStats.assists}
                  />
                  <StatBox
                    label="G+A"
                    value={currentSeasonStats.goals + currentSeasonStats.assists}
                    highlight
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox
                    label="Desarmes"
                    value={currentSeasonStats.tackles}
                    icon={<Shield className="w-4 h-4" />}
                    small
                  />
                  <StatBox
                    label="Interceptações"
                    value={currentSeasonStats.interceptions}
                    small
                  />
                  <StatBox
                    label="Recuperações"
                    value={currentSeasonStats.recoveries}
                    small
                  />
                  <div className="flex gap-2">
                    <StatBox
                      label="Amarelos"
                      value={currentSeasonStats.yellow_cards}
                      variant="warning"
                      small
                    />
                    <StatBox
                      label="Vermelhos"
                      value={currentSeasonStats.red_cards}
                      variant="danger"
                      small
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Sem dados para {currentYear}
              </p>
            )}
          </TabsContent>

          {/* Per 90 Tab */}
          <TabsContent value="per90">
            {currentSeasonStats && currentSeasonStats.minutes >= 90 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox
                    label="Gols/90"
                    value={calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes)}
                    highlight
                  />
                  <StatBox
                    label="Assist./90"
                    value={calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes)}
                  />
                  <StatBox
                    label="G+A/90"
                    value={calculatePer90(
                      currentSeasonStats.goals + currentSeasonStats.assists,
                      currentSeasonStats.minutes
                    )}
                    highlight
                  />
                  <StatBox
                    label="Min/Gol"
                    value={
                      currentSeasonStats.goals > 0
                        ? Math.round(currentSeasonStats.minutes / currentSeasonStats.goals)
                        : "—"
                    }
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatBox
                    label="Desarmes/90"
                    value={calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes)}
                    icon={<Shield className="w-4 h-4" />}
                    small
                  />
                  <StatBox
                    label="Intercep./90"
                    value={calculatePer90(currentSeasonStats.interceptions, currentSeasonStats.minutes)}
                    small
                  />
                  <StatBox
                    label="Recup./90"
                    value={calculatePer90(currentSeasonStats.recoveries, currentSeasonStats.minutes)}
                    small
                  />
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Mínimo de 90 minutos necessário
              </p>
            )}
          </TabsContent>

          {/* Career Tab */}
          <TabsContent value="career">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Temporada</TableHead>
                    <TableHead className="text-center">J</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                    <TableHead className="text-center">G</TableHead>
                    <TableHead className="text-center">A</TableHead>
                    <TableHead className="text-center">G+A</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Cartões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {careerStats.map((season) => (
                    <TableRow key={season.season_year}>
                      <TableCell className="font-medium">
                        {season.season_year}
                        {season.season_year === currentYear && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Atual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{season.matches}</TableCell>
                      <TableCell className="text-center">{season.minutes}</TableCell>
                      <TableCell className="text-center font-medium text-primary">
                        {season.goals}
                      </TableCell>
                      <TableCell className="text-center">{season.assists}</TableCell>
                      <TableCell className="text-center font-medium">
                        {season.goals + season.assists}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className="text-amber-500">{season.yellow_cards}</span>
                        {" / "}
                        <span className="text-destructive">{season.red_cards}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Career Totals */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-4 gap-3">
                <StatBox
                  label="Total Jogos"
                  value={careerStats.reduce((sum, s) => sum + s.matches, 0)}
                  small
                />
                <StatBox
                  label="Total Gols"
                  value={careerStats.reduce((sum, s) => sum + s.goals, 0)}
                  highlight
                  small
                />
                <StatBox
                  label="Total Assist."
                  value={careerStats.reduce((sum, s) => sum + s.assists, 0)}
                  small
                />
                <StatBox
                  label="Total G+A"
                  value={careerStats.reduce((sum, s) => sum + s.goals + s.assists, 0)}
                  highlight
                  small
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface StatBoxProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  highlight?: boolean;
  variant?: "default" | "warning" | "danger";
  small?: boolean;
}

function StatBox({ label, value, icon, highlight, variant, small }: StatBoxProps) {
  const bgClass =
    variant === "warning"
      ? "bg-amber-500/10"
      : variant === "danger"
      ? "bg-destructive/10"
      : highlight
      ? "bg-primary/10"
      : "bg-secondary/30";

  const textClass =
    variant === "warning"
      ? "text-amber-500"
      : variant === "danger"
      ? "text-destructive"
      : highlight
      ? "text-primary"
      : "";

  return (
    <div className={`text-center p-3 rounded-lg ${bgClass}`}>
      {icon && (
        <div className="flex justify-center mb-1 text-muted-foreground">
          {icon}
        </div>
      )}
      <p className={`font-bold ${small ? "text-lg" : "text-2xl"} ${textClass}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
