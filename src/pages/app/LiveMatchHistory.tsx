import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Radio,
  Plus,
  Calendar,
  Trophy,
  MapPin,
  Clock,
  CheckCircle2,
  Pause,
  FileText,
  Users,
} from "lucide-react";

type MatchStatus = "draft" | "live" | "finished" | "applied";

interface MatchWithCompetition {
  id: string;
  opponent_name: string;
  match_date: string;
  status: MatchStatus;
  venue: string | null;
  season_year: number;
  duration_minutes: number;
  created_at: string;
  competition: {
    id: string;
    name: string;
    display_name: string | null;
  } | null;
}

const statusConfig: Record<MatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: <FileText className="h-3 w-3" /> },
  live: { label: "Ao Vivo", color: "bg-red-500 text-white", icon: <Radio className="h-3 w-3" /> },
  finished: { label: "Finalizado", color: "bg-amber-500 text-white", icon: <Pause className="h-3 w-3" /> },
  applied: { label: "Aplicado", color: "bg-green-500 text-white", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export default function LiveMatchHistory() {
  const { user } = useAuth();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          opponent_name,
          match_date,
          status,
          venue,
          season_year,
          duration_minutes,
          created_at,
          competition:competitions(id, name, display_name)
        `)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MatchWithCompetition[];
    },
    enabled: !!user,
  });

  // Group by status
  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const appliedMatches = matches.filter((m) => m.status === "applied");
  const draftMatches = matches.filter((m) => m.status === "draft");

  const getMatchLink = (match: MatchWithCompetition) => {
    if (match.status === "applied") {
      return `/app/live-match/${match.id}/review`;
    }
    return `/app/live-match/${match.id}`;
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Radio className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Jogo Ao Vivo</h1>
            <p className="text-muted-foreground">
              Registre estatísticas em tempo real durante os jogos
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/app/live-match/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Jogo
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum jogo registrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece a registrar estatísticas criando um novo jogo
            </p>
            <Button asChild>
              <Link to="/app/live-match/new">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Jogo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Live matches (priority) */}
          {liveMatches.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Radio className="h-5 w-5 animate-pulse" />
                  Jogos Ao Vivo ({liveMatches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {liveMatches.map((match) => (
                    <MatchCard key={match.id} match={match} link={getMatchLink(match)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Finished matches waiting to apply */}
          {finishedMatches.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-400">
                  <Pause className="h-5 w-5" />
                  Aguardando Aplicar ({finishedMatches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {finishedMatches.map((match) => (
                    <MatchCard key={match.id} match={match} link={getMatchLink(match)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applied matches (history) */}
          {appliedMatches.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Histórico ({appliedMatches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {appliedMatches.map((match) => (
                      <MatchCard key={match.id} match={match} link={getMatchLink(match)} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Draft matches */}
          {draftMatches.length > 0 && (
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-5 w-5" />
                  Rascunhos ({draftMatches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {draftMatches.map((match) => (
                    <MatchCard key={match.id} match={match} link={getMatchLink(match)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, link }: { match: MatchWithCompetition; link: string }) {
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";

  return (
    <Link
      to={link}
      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={config.color} variant="secondary">
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <p className="font-semibold truncate">vs {match.opponent_name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            {competitionName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {match.season_year}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.venue}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {match.duration_minutes}'
          </span>
        </div>
      </div>
    </Link>
  );
}
