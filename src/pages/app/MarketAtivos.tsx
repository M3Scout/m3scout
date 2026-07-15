import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { computeScoreForAthleteById, recalculateAllActiveMarketScores } from "@/lib/marketScoreService";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { MarketScoreDetailModal } from "@/components/players/MarketScoreDetailModal";
import { toast } from "sonner";

// ── TYPES ──────────────────────────────────────────────────────────────────────

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

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────

const ACCENT      = "#ec4525";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";

// ── HELPERS ────────────────────────────────────────────────────────────────────

function getScoreColor(score: number): { hex: string; label: string } {
  if (score >= 85) return { hex: "#2DCE8A", label: "Elite"  };
  if (score >= 70) return { hex: "#4ade80", label: "Alto"   };
  if (score >= 50) return { hex: "#E8C84A", label: "Médio"  };
  return               { hex: "#e5173f",   label: "Baixo"  };
}

function TrendIcon({ trend }: { trend: MarketScoreTrend }) {
  if (trend === "UP")   return <TrendingUp   className="w-3 h-3 text-emerald-400" />;
  if (trend === "DOWN") return <TrendingDown className="w-3 h-3 text-red-400"     />;
  return null;
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────

const POSITIONS = [
  "Todos", "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia", "Meia Atacante", "Ponta Direita", "Ponta Esquerda",
  "Centroavante", "Atacante",
];

const AGE_RANGES = [
  { label: "Todas idades",         min: 0,  max: 100 },
  { label: "Sub-17 (≤16)",         min: 0,  max: 16  },
  { label: "Sub-20 (17-19)",       min: 17, max: 19  },
  { label: "Sub-23 (20-22)",       min: 20, max: 22  },
  { label: "Profissional (23-29)", min: 23, max: 29  },
  { label: "Veterano (30+)",       min: 30, max: 100 },
];

// ── COMPONENT ──────────────────────────────────────────────────────────────────

export default function MarketAtivos() {
  const queryClient   = useQueryClient();
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteWithScore | null>(null);
  const [search,           setSearch]           = useState("");
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [positionFilter,   setPositionFilter]   = useState("Todos");
  const [ageRangeIndex,    setAgeRangeIndex]    = useState(0);
  const [minScore,         setMinScore]         = useState(0);
  const [trendFilter,      setTrendFilter]      = useState<"ALL" | MarketScoreTrend>("ALL");
  const [calculatingIds,   setCalculatingIds]   = useState<Set<string>>(new Set());
  const [isRecalculatingAll,  setIsRecalculatingAll]  = useState(false);
  const [recalcProgress,   setRecalcProgress]   = useState<{ current: number; total: number } | null>(null);

  const handleRecalculateAll = async () => {
    if (isRecalculatingAll) return;
    setIsRecalculatingAll(true);
    setRecalcProgress({ current: 0, total: 0 });
    const toastId = toast.loading("Recalculando scores...");
    try {
      const result = await recalculateAllActiveMarketScores(
        (current, total) => setRecalcProgress({ current, total }),
        "Recálculo manual via botão Atualizar"
      );
      toast.success(
        `Recálculo concluído: ${result.success}/${result.total} atualizados${result.failed ? ` (${result.failed} falhas)` : ""}`,
        { id: toastId }
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["market-ativos"] }),
        queryClient.invalidateQueries({ queryKey: ["market-score"] }),
        queryClient.invalidateQueries({ queryKey: ["market-score-history"] }),
      ]);
    } catch (err) {
      toast.error("Erro ao recalcular scores", { id: toastId });
    } finally {
      setIsRecalculatingAll(false);
      setRecalcProgress(null);
    }
  };

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["market-ativos"],
    queryFn: async () => {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, full_name, position, age, birth_date, photo_url, current_club")
        .or("is_archived.is.null,is_archived.eq.false")
        .order("full_name");
      if (playersError) throw playersError;

      const { data: scoresData, error: scoresError } = await supabase
        .from("market_scores")
        .select("athlete_id, score_total, trend_30d, confidence_level, last_calculated_at")
        .eq("type", "ACTIVE");
      if (scoresError) throw scoresError;

      const scoreMap = new Map<string, typeof scoresData[0]>();
      scoresData?.forEach(s => { if (s.athlete_id) scoreMap.set(s.athlete_id, s); });

      return (playersData || []).map(p => ({
        id:           p.id,
        full_name:    p.full_name,
        position:     p.position,
        age:          p.age,
        birth_date:   p.birth_date,
        photo_url:    p.photo_url,
        current_club: p.current_club,
        score: scoreMap.get(p.id) ? {
          score_total:          scoreMap.get(p.id)!.score_total,
          trend_30d:            scoreMap.get(p.id)!.trend_30d as MarketScoreTrend,
          confidence_level:     scoreMap.get(p.id)!.confidence_level,
          last_calculated_at:   scoreMap.get(p.id)!.last_calculated_at,
        } : null,
      })) as AthleteWithScore[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const calculateScoreMutation = useMutation({
    mutationFn: async (athlete: AthleteWithScore) =>
      computeScoreForAthleteById(athlete.id, {
        fullName:  athlete.full_name,
        position:  athlete.position,
        birthDate: athlete.birth_date ?? undefined,
        age:       athlete.age ?? undefined,
      }),
    onSuccess: (_, athlete) => {
      setCalculatingIds(prev => { const n = new Set(prev); n.delete(athlete.id); return n; });
      queryClient.invalidateQueries({ queryKey: ["market-ativos"] });
      queryClient.invalidateQueries({ queryKey: ["market-score", athlete.id] });
      queryClient.invalidateQueries({ queryKey: ["market-score-history"] });
      toast.success("Score calculado com sucesso");
    },
    onError: (_, athlete) => {
      setCalculatingIds(prev => { const n = new Set(prev); n.delete(athlete.id); return n; });
      toast.error("Erro ao calcular score");
    },
  });

  const handleCalculateScore = (e: React.MouseEvent, athlete: AthleteWithScore) => {
    e.stopPropagation();
    setCalculatingIds(prev => new Set(prev).add(athlete.id));
    calculateScoreMutation.mutate(athlete);
  };

  const filteredAthletes = useMemo(() => {
    const ageRange = AGE_RANGES[ageRangeIndex];
    return athletes
      .filter(a => {
        if (search && !a.full_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (positionFilter !== "Todos" && a.position !== positionFilter) return false;
        if (a.age !== null && (a.age < ageRange.min || a.age > ageRange.max)) return false;
        if ((a.score?.score_total ?? 0) < minScore) return false;
        if (trendFilter !== "ALL" && a.score?.trend_30d !== trendFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = (b.score?.score_total ?? 0) - (a.score?.score_total ?? 0);
        return diff !== 0 ? diff : a.full_name.localeCompare(b.full_name);
      });
  }, [athletes, search, positionFilter, ageRangeIndex, minScore, trendFilter]);

  const athletesWithoutScore = athletes.filter(a => !a.score).length;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="m3-page-title">Ativos</h1>
          <span
            className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full font-editorial-mono text-[10px] font-bold text-white"
            style={{ background: ACCENT }}
          >
            {filteredAthletes.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="sm:hidden p-1 transition-colors"
            onClick={() => setSearchOpen(v => !v)}
            aria-label="Buscar"
            style={{ color: MUTED }}
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
          <button
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full font-editorial-mono text-[11px] tracking-[0.1em] uppercase transition-colors duration-150"
            onClick={handleRecalculateAll}
            disabled={isRecalculatingAll}
            style={{
              background: "transparent",
              border: `1px solid ${CARD_BORDER}`,
              color: isRecalculatingAll ? MUTED : TEXT,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = CARD_BORDER)}
          >
            {isRecalculatingAll ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />
                {recalcProgress && recalcProgress.total > 0
                  ? `${recalcProgress.current}/${recalcProgress.total}`
                  : "Recalculando..."}</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /> Atualizar</>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE SEARCH */}
      {searchOpen && (
        <div className="sm:hidden">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar atleta..."
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              color: TEXT,
            }}
          />
        </div>
      )}

      {/* INFO BANNER */}
      {athletesWithoutScore > 0 && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(232,200,74,0.05)", borderColor: "rgba(232,200,74,0.2)" }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(232,200,74,0.12)" }}>
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <p className="font-editorial-mono text-[11px]" style={{ color: "#c9a83a" }}>
            {athletesWithoutScore} atleta(s) sem score — abra o perfil para calcular automaticamente.
          </p>
        </div>
      )}

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <Input
            placeholder="Buscar atleta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-lg h-9 text-[12px] border-0 outline-none focus-visible:ring-0"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}
          />
        </div>

        <div className="hidden sm:block">
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="rounded-lg h-9 text-[12px] border-0 focus:ring-0" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}>
              <SelectValue placeholder="Posição" />
            </SelectTrigger>
            <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
              {POSITIONS.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:block">
          <Select value={String(ageRangeIndex)} onValueChange={v => setAgeRangeIndex(Number(v))}>
            <SelectTrigger className="rounded-lg h-9 text-[12px] border-0 focus:ring-0" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}>
              <SelectValue placeholder="Idade" />
            </SelectTrigger>
            <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
              {AGE_RANGES.map((r, i) => <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Select value={String(minScore)} onValueChange={v => setMinScore(Number(v))}>
          <SelectTrigger className="rounded-lg h-9 text-[12px] border-0 focus:ring-0" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}>
            <SelectValue placeholder="Score mínimo" />
          </SelectTrigger>
          <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
            {[0,30,50,60,70,80].map(v => <SelectItem key={v} value={String(v)}>Score ≥ {v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={trendFilter} onValueChange={v => setTrendFilter(v as typeof trendFilter)}>
          <SelectTrigger className="rounded-lg h-9 text-[12px] border-0 focus:ring-0" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}>
            <SelectValue placeholder="Tendência" />
          </SelectTrigger>
          <SelectContent style={{ background: "#111113", borderColor: CARD_BORDER }}>
            <SelectItem value="ALL">Todas tendências</SelectItem>
            <SelectItem value="UP"><span className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-emerald-400" />Em alta</span></SelectItem>
            <SelectItem value="DOWN"><span className="flex items-center gap-2"><TrendingDown className="w-3 h-3 text-red-400" />Em baixa</span></SelectItem>
            <SelectItem value="FLAT"><span className="flex items-center gap-2"><Minus className="w-3 h-3 text-zinc-500" />Estável</span></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-xl border p-3.5" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-lg" />
                </div>
                <Skeleton className="w-10 h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="rounded-xl border py-12 text-center" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <User className="w-10 h-10 mx-auto mb-3" style={{ color: MUTED }} />
          <p className="font-editorial-mono text-[11px] uppercase" style={{ color: MUTED }}>
            Nenhum atleta encontrado com os filtros aplicados
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAthletes.map((athlete, index) => {
            const score     = athlete.score?.score_total ?? 0;
            const scoreCol  = getScoreColor(score);
            const hasScore  = athlete.score !== null;
            const posColor  = getPositionColor(athlete.position);
            const shortPos  = getShortPosition(athlete.position);

            return (
              <div
                key={athlete.id}
                className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-[250ms] hover:bg-zinc-800/30"
                style={{ background: CARD_BG, borderColor: CARD_BORDER }}
                onClick={() => setSelectedAthlete(athlete)}
              >
                {/* Rank + Photo */}
                <div className="relative shrink-0">
                  {index < 10 && hasScore && (
                    <div
                      className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white z-10 font-editorial-mono"
                      style={{ background: ACCENT }}
                    >
                      {index + 1}
                    </div>
                  )}
                  <div className="w-14 rounded-xl overflow-hidden flex-shrink-0" style={{ height: 72, background: "#111113" }}>
                    {athlete.photo_url ? (
                      <img
                        src={getOptimizedImageUrl(athlete.photo_url, { width: 400, quality: 85, format: "avif" }) || athlete.photo_url}
                        alt={athlete.full_name}
                        className="w-full h-full object-cover object-[center_5%]"
                        loading="lazy"
                        decoding="async"
                        onError={e => { if (athlete.photo_url) (e.target as HTMLImageElement).src = athlete.photo_url; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6" style={{ color: MUTED }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>
                      {athlete.full_name}
                    </h3>
                    {hasScore && <TrendIcon trend={athlete.score!.trend_30d} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-editorial-mono text-[10px] font-semibold uppercase tracking-wider", posColor.textClass)}>
                      {shortPos}
                    </span>
                    {athlete.age && (
                      <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                        {athlete.age}a
                      </span>
                    )}
                  </div>
                  {athlete.current_club && (
                    <p className="font-editorial-mono text-[10px] truncate mt-0.5" style={{ color: MUTED }}>
                      {athlete.current_club}
                    </p>
                  )}
                </div>

                {/* Score */}
                {hasScore ? (
                  <div className="flex flex-col items-center shrink-0 min-w-[40px]">
                    <span className="font-display font-bold text-[22px] leading-none tabular-nums" style={{ color: scoreCol.hex }}>
                      {score.toFixed(0)}
                    </span>
                    <span className="font-editorial-mono text-[8px] uppercase tracking-wider mt-1" style={{ color: scoreCol.hex, opacity: 0.6 }}>
                      {scoreCol.label}
                    </span>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-editorial-mono text-[10px] uppercase tracking-wider shrink-0 transition-colors duration-150"
                    style={{
                      border: `1px dashed ${CARD_BORDER}`,
                      color: MUTED,
                      background: "transparent",
                    }}
                    onClick={e => handleCalculateScore(e, athlete)}
                    disabled={calculatingIds.has(athlete.id)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = CARD_BORDER; e.currentTarget.style.color = MUTED; }}
                  >
                    {calculatingIds.has(athlete.id)
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />}
                    {calculatingIds.has(athlete.id) ? "..." : "Calcular"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COUNT */}
      {!isLoading && (
        <p className="font-editorial-mono text-[10px] uppercase text-center tabular-nums" style={{ color: "rgba(255,255,255,0.18)" }}>
          {filteredAthletes.length} atleta(s) encontrado(s)
        </p>
      )}

      {selectedAthlete && (
        <MarketScoreDetailModal
          open={!!selectedAthlete}
          onOpenChange={(o) => { if (!o) setSelectedAthlete(null); }}
          athleteId={selectedAthlete.id}
          athleteName={selectedAthlete.full_name}
          position={selectedAthlete.position}
          age={selectedAthlete.age}
          birthDate={selectedAthlete.birth_date}
          photoUrl={selectedAthlete.photo_url}
          currentClub={selectedAthlete.current_club}
        />
      )}
    </div>
  );
}
