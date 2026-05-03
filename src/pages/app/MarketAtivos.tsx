/**
 * Market Ativos M3 Page
 * 
 * Displays ranking of internal athletes by Market Score (ACTIVE)
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  User,
  Sparkles,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketScoreTrend } from "@/types/marketScore";
import { computeScoreForAthleteById } from "@/lib/marketScoreService";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { toast } from "sonner";

interface AthleteWithScore {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  birth_date: string | null;
  photo_url: string | null;
  current_club: string | null;
  score: {
    score_total: number;
    trend_30d: MarketScoreTrend;
    confidence_level: number;
    last_calculated_at: string;
  } | null;
}

// Score color helper
function getScoreColor(score: number) {
  if (score >= 85) return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50", label: "Elite" };
  if (score >= 70) return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50", label: "Alto" };
  if (score >= 50) return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50", label: "Médio" };
  return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50", label: "Baixo" };
}

function TrendIcon({ trend }: { trend: MarketScoreTrend }) {
  if (trend === "UP") return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (trend === "DOWN") return <TrendingDown className="w-3 h-3 text-red-400" />;
  // FLAT trend - no visual indicator needed (avoid showing a dash/line)
  return null;
}

const POSITIONS = [
  "Todos",
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meia",
  "Meia Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
  "Centroavante",
  "Atacante",
];

const AGE_RANGES = [
  { label: "Todas idades", min: 0, max: 100 },
  { label: "Sub-17 (≤16)", min: 0, max: 16 },
  { label: "Sub-20 (17-19)", min: 17, max: 19 },
  { label: "Sub-23 (20-22)", min: 20, max: 22 },
  { label: "Profissional (23-29)", min: 23, max: 29 },
  { label: "Veterano (30+)", min: 30, max: 100 },
];

export default function MarketAtivos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("Todos");
  const [ageRangeIndex, setAgeRangeIndex] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [trendFilter, setTrendFilter] = useState<"ALL" | MarketScoreTrend>("ALL");
  const [calculatingIds, setCalculatingIds] = useState<Set<string>>(new Set());

  // Fetch athletes with their market scores
  const { data: athletes = [], isLoading, refetch } = useQuery({
    queryKey: ["market-ativos"],
    queryFn: async () => {
      // Fetch all active athletes
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, full_name, position, age, birth_date, photo_url, current_club")
        .or("is_archived.is.null,is_archived.eq.false")
        .order("full_name");

      if (playersError) throw playersError;

      // Fetch all ACTIVE market scores
      const { data: scoresData, error: scoresError } = await supabase
        .from("market_scores")
        .select("athlete_id, score_total, trend_30d, confidence_level, last_calculated_at")
        .eq("type", "ACTIVE");

      if (scoresError) throw scoresError;

      // Map scores to athletes
      const scoreMap = new Map<string, typeof scoresData[0]>();
      scoresData?.forEach(s => {
        if (s.athlete_id) scoreMap.set(s.athlete_id, s);
      });

      const result: AthleteWithScore[] = (playersData || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        position: p.position,
        age: p.age,
        birth_date: p.birth_date,
        photo_url: p.photo_url,
        current_club: p.current_club,
        score: scoreMap.get(p.id) ? {
          score_total: scoreMap.get(p.id)!.score_total,
          trend_30d: scoreMap.get(p.id)!.trend_30d as MarketScoreTrend,
          confidence_level: scoreMap.get(p.id)!.confidence_level,
          last_calculated_at: scoreMap.get(p.id)!.last_calculated_at,
        } : null,
      }));

      return result;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Mutation for calculating score
  const calculateScoreMutation = useMutation({
    mutationFn: async (athlete: AthleteWithScore) => {
      return await computeScoreForAthleteById(athlete.id, {
        fullName: athlete.full_name,
        position: athlete.position,
        birthDate: athlete.birth_date ?? undefined,
        age: athlete.age ?? undefined,
      });
    },
    onSuccess: (_, athlete) => {
      setCalculatingIds(prev => {
        const next = new Set(prev);
        next.delete(athlete.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["market-ativos"] });
      toast.success("Score calculado com sucesso");
    },
    onError: (error, athlete) => {
      setCalculatingIds(prev => {
        const next = new Set(prev);
        next.delete(athlete.id);
        return next;
      });
      console.error("Error calculating score:", error);
      toast.error("Erro ao calcular score");
    },
  });

  const handleCalculateScore = (e: React.MouseEvent, athlete: AthleteWithScore) => {
    e.stopPropagation(); // Prevent card click
    setCalculatingIds(prev => new Set(prev).add(athlete.id));
    calculateScoreMutation.mutate(athlete);
  };

  // Filter and sort athletes
  const filteredAthletes = useMemo(() => {
    const ageRange = AGE_RANGES[ageRangeIndex];
    
    return athletes
      .filter(a => {
        // Search filter
        if (search && !a.full_name.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        // Position filter
        if (positionFilter !== "Todos" && a.position !== positionFilter) {
          return false;
        }
        // Age filter
        if (a.age !== null && (a.age < ageRange.min || a.age > ageRange.max)) {
          return false;
        }
        // Score filter
        const score = a.score?.score_total ?? 0;
        if (score < minScore) {
          return false;
        }
        // Trend filter
        if (trendFilter !== "ALL" && a.score?.trend_30d !== trendFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by score desc, then by name
        const scoreA = a.score?.score_total ?? 0;
        const scoreB = b.score?.score_total ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [athletes, search, positionFilter, ageRangeIndex, minScore, trendFilter]);

  // Count athletes without score for lazy calculation info
  const athletesWithoutScore = athletes.filter(a => !a.score).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Mercado → Ativos M3
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ranking interno dos atletas por Market Score
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Info banner for missing scores */}
      {athletesWithoutScore > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-sm text-yellow-400/90">
              {athletesWithoutScore} atleta(s) ainda sem score calculado. 
              Abra o perfil para calcular automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-zinc-900/80 border border-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atleta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-800/50 border-white/[0.06]"
              />
            </div>

            {/* Position */}
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                <SelectValue placeholder="Posição" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/[0.06]">
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Age Range */}
            <Select
              value={String(ageRangeIndex)}
              onValueChange={(v) => setAgeRangeIndex(Number(v))}
            >
              <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                <SelectValue placeholder="Idade" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/[0.06]">
                {AGE_RANGES.map((range, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Min Score */}
            <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
              <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                <SelectValue placeholder="Score mínimo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/[0.06]">
                <SelectItem value="0">Score ≥ 0</SelectItem>
                <SelectItem value="30">Score ≥ 30</SelectItem>
                <SelectItem value="50">Score ≥ 50</SelectItem>
                <SelectItem value="60">Score ≥ 60</SelectItem>
                <SelectItem value="70">Score ≥ 70</SelectItem>
                <SelectItem value="80">Score ≥ 80</SelectItem>
              </SelectContent>
            </Select>

            {/* Trend */}
            <Select value={trendFilter} onValueChange={(v) => setTrendFilter(v as typeof trendFilter)}>
              <SelectTrigger className="bg-zinc-800/50 border-white/[0.06]">
                <SelectValue placeholder="Tendência" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/[0.06]">
                <SelectItem value="ALL">Todas tendências</SelectItem>
                <SelectItem value="UP">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    Em alta
                  </span>
                </SelectItem>
                <SelectItem value="DOWN">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                    Em baixa
                  </span>
                </SelectItem>
                <SelectItem value="FLAT">
                  <span className="flex items-center gap-2">
                    <Minus className="w-3 h-3 text-muted-foreground" />
                    Estável
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Athletes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="w-14 h-14 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAthletes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum atleta encontrado com os filtros aplicados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAthletes.map((athlete, index) => {
            const score = athlete.score?.score_total ?? 0;
            const scoreColor = getScoreColor(score);
            const hasScore = athlete.score !== null;
            
            // Check if score is stale (older than 7 days)
            const isStale = hasScore && athlete.score?.last_calculated_at
              ? (Date.now() - new Date(athlete.score.last_calculated_at).getTime()) > 7 * 24 * 60 * 60 * 1000
              : false;

            return (
              <Card
                key={athlete.id}
                className={cn(
                  "bg-zinc-900/80 border border-white/[0.06] cursor-pointer",
                  "transition-all duration-150 ease-out",
                  "hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/30 hover:border-white/10"
                )}
                onClick={() => navigate(`/app/players/${athlete.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Rank + Photo */}
                    <div className="relative">
                      {index < 3 && hasScore && (
                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground z-10">
                          {index + 1}
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/50">
                        {athlete.photo_url ? (
                          <img
                            src={athlete.photo_url}
                            alt={athlete.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{athlete.full_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {athlete.position}
                        </Badge>
                        {athlete.age && <span>{athlete.age} anos</span>}
                      </div>
                      {athlete.current_club && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {athlete.current_club}
                        </p>
                      )}
                    </div>

                    {/* Score Badge - Shows when score exists in DB */}
                    {hasScore ? (
                      <div
                        className={cn(
                          "relative flex flex-col items-center justify-center min-w-[60px] px-3 py-2 rounded-lg border",
                          scoreColor.bg,
                          scoreColor.border
                        )}
                      >
                        {/* Score number - prominent */}
                        <span className={cn("text-xl font-bold leading-none", scoreColor.text)}>
                          {score.toFixed(0)}
                        </span>
                        {/* Label - smaller with reduced opacity */}
                        <span className={cn("text-[10px] font-medium mt-0.5 opacity-70", scoreColor.text)}>
                          {scoreColor.label}
                        </span>
                        {/* Trend indicator - subtle, positioned in corner */}
                        <div className="absolute -top-1 -right-1">
                          <TrendIcon trend={athlete.score!.trend_30d} />
                        </div>
                        {/* Stale indicator */}
                        {isStale && (
                          <div 
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500/80 flex items-center justify-center"
                            title="Score pode estar desatualizado"
                          >
                            <RefreshCw className="w-2.5 h-2.5 text-yellow-950" />
                          </div>
                        )}
                      </div>
                    ) : (
                      // No score in DB yet - show Calculate button
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-w-[70px] gap-1 text-xs border-dashed border-zinc-600 hover:border-primary hover:bg-primary/10"
                        onClick={(e) => handleCalculateScore(e, athlete)}
                        disabled={calculatingIds.has(athlete.id)}
                      >
                        {calculatingIds.has(athlete.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {calculatingIds.has(athlete.id) ? "..." : "Calcular"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground text-center">
          {filteredAthletes.length} atleta(s) encontrado(s)
        </p>
      )}
    </div>
  );
}
