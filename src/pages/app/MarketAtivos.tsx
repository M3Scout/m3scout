/**
 * Market Ativos M3 Page
 * 
 * Displays ranking of internal athletes by Market Score (ACTIVE)
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketScoreTrend } from "@/types/marketScore";
import { computeScoreForAthleteById } from "@/lib/marketScoreService";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
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
  const [searchOpen, setSearchOpen] = useState(false);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="m3-page-title">Ativos</h1>
          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">{filteredAthletes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="sm:hidden p-1 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setSearchOpen(v => !v)}
            aria-label="Buscar"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="hidden sm:flex rounded-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Mobile search input */}
      {searchOpen && (
        <div className="sm:hidden">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar atleta..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>
      )}

      {/* Info banner for missing scores */}
      {athletesWithoutScore > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xs text-amber-400/90">
            {athletesWithoutScore} atleta(s) ainda sem score calculado. 
            Abra o perfil para calcular automaticamente.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar atleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-zinc-900 border-zinc-800 text-sm h-9"
          />
        </div>

        {/* Position - hidden on mobile */}
        <div className="hidden sm:block">
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="rounded-full bg-zinc-900 border-zinc-800 h-9 text-sm w-full">
              <SelectValue placeholder="Posição" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age Range - hidden on mobile */}
        <div className="hidden sm:block">
          <Select value={String(ageRangeIndex)} onValueChange={(v) => setAgeRangeIndex(Number(v))}>
            <SelectTrigger className="rounded-full bg-zinc-900 border-zinc-800 h-9 text-sm w-full">
              <SelectValue placeholder="Idade" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {AGE_RANGES.map((range, idx) => (
                <SelectItem key={idx} value={String(idx)}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Min Score */}
        <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
          <SelectTrigger className="rounded-full bg-zinc-900 border-zinc-800 h-9 text-sm">
            <SelectValue placeholder="Score mínimo" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
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
          <SelectTrigger className="rounded-full bg-zinc-900 border-zinc-800 h-9 text-sm">
            <SelectValue placeholder="Tendência" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
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
                <Minus className="w-3 h-3 text-zinc-500" />
                Estável
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Athletes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl bg-zinc-900/50 border border-zinc-800/40 p-3.5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="w-10 h-10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 py-12 text-center">
          <User className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Nenhum atleta encontrado com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAthletes.map((athlete, index) => {
            const score = athlete.score?.score_total ?? 0;
            const scoreColor = getScoreColor(score);
            const hasScore = athlete.score !== null;
            const posColor = getPositionColor(athlete.position);
            const shortPos = getShortPosition(athlete.position);
            
            const isStale = hasScore && athlete.score?.last_calculated_at
              ? (Date.now() - new Date(athlete.score.last_calculated_at).getTime()) > 7 * 24 * 60 * 60 * 1000
              : false;

            return (
              <div
                key={athlete.id}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl cursor-pointer",
                  "bg-zinc-900/50 border border-zinc-800/40",
                  "hover:border-zinc-700/50 hover:bg-zinc-900/70",
                  "transition-all duration-200"
                )}
                onClick={() => navigate(`/app/players/${athlete.id}`)}
              >
                {/* Rank + Photo */}
                <div className="relative shrink-0">
                  {index < 10 && hasScore && (
                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#e63946] text-[10px] font-bold flex items-center justify-center text-white z-10">
                      {index + 1}
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-zinc-800/50">
                    {athlete.photo_url ? (
                      <img src={getOptimizedImageUrl(athlete.photo_url, { width: 400, quality: 85, format: "avif" }) || athlete.photo_url || ""} alt={athlete.full_name} className="w-full h-full object-cover object-center" loading="lazy" decoding="async" width={400} height={400} onError={e => { if (athlete.photo_url) (e.target as HTMLImageElement).src = athlete.photo_url; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-zinc-100 truncate">{athlete.full_name}</h3>
                    {hasScore && <TrendIcon trend={athlete.score!.trend_30d} />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", posColor.textClass)}>
                      {shortPos}
                    </span>
                    {athlete.age && <span className="text-[10px] text-zinc-600">{athlete.age}a</span>}
                  </div>
                  {athlete.current_club && (
                    <p className="text-[10px] text-zinc-600 truncate mt-0.5">{athlete.current_club}</p>
                  )}
                </div>

                {/* Score */}
                {hasScore ? (
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className={cn("text-xl font-black tabular-nums leading-none", scoreColor.text)}>
                      {score.toFixed(0)}
                    </span>
                    <span className={cn("text-[9px] font-medium opacity-60 mt-1", scoreColor.text)}>
                      {scoreColor.label}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[65px] gap-1 text-[10px] rounded-full border-dashed border-zinc-700 hover:border-[#e63946] hover:bg-[#e63946]/10"
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
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-zinc-600 text-center tabular-nums">
          {filteredAthletes.length} atleta(s) encontrado(s)
        </p>
      )}
    </div>
  );
}
