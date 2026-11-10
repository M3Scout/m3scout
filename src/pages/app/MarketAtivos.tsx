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
import { Ic } from "@/components/dash/icons";
import { Av, Head, Ring, Seg, View, scoreColor, shortPos } from "@/components/dash/ui";
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
  const ranked = filteredAthletes.filter((a) => a.score).map((a) => a.id);
  const TREND_I: Record<string, string> = {
    UP: '<path d="M4 16 10 10l4 4 6-6M15 8h5v5"/>',
    DOWN: '<path d="m4 8 6 6 4-4 6 6M15 16h5v-5"/>',
  };
  return (
    <View>
      <Head title="Ativos M3">
        <button type="button" className="btn g" onClick={handleRecalculateAll} disabled={isRecalculatingAll}>
          <Ic n="refresh" />
          {isRecalculatingAll
            ? recalcProgress && recalcProgress.total > 0 ? `${recalcProgress.current}/${recalcProgress.total}` : "Recalculando…"
            : "Atualizar"}
        </button>
      </Head>

      {athletesWithoutScore > 0 && (
        <div className="info" style={{ ["--s" as string]: 1, background: "rgba(255,214,10,.1)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
          <span><b style={{ color: "var(--yellow)" }}>{athletesWithoutScore} {athletesWithoutScore === 1 ? "atleta sem score" : "atletas sem score"}</b> — use “Calcular” no card para gerar automaticamente.</span>
        </div>
      )}

      <div className="tools" style={{ ["--s" as string]: 1 }}>
        <label className="field">
          <Ic n="search" />
          <span className="sr">Buscar</span>
          <input type="search" placeholder="Buscar atleta" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Seg
          label="Tendência"
          value={trendFilter}
          onPick={(v) => setTrendFilter(v as typeof trendFilter)}
          items={[{ v: "ALL", label: "Todas tendências" }, { v: "UP", label: "Subindo" }, { v: "DOWN", label: "Caindo" }, { v: "FLAT", label: "Estáveis" }]}
        />
        <select className="sel" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} aria-label="Posição">
          {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos === "Todos" ? "Todas as posições" : pos}</option>)}
        </select>
        <select className="sel" value={String(ageRangeIndex)} onChange={(e) => setAgeRangeIndex(Number(e.target.value))} aria-label="Idade">
          {AGE_RANGES.map((r, i) => <option key={i} value={String(i)}>{r.label}</option>)}
        </select>
        <select className="sel" value={String(minScore)} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Score mínimo">
          {[0, 30, 50, 60, 70, 80].map((v) => <option key={v} value={String(v)}>Score ≥ {v}</option>)}
        </select>
      </div>

      {isLoading ? (
        <section className="as">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="asc" style={{ height: 114, opacity: 0.4 }} />)}</section>
      ) : filteredAthletes.length === 0 ? (
        <div className="empty">Nenhum atleta encontrado com os filtros aplicados.</div>
      ) : (
        <section className="as" style={{ ["--s" as string]: 2 }}>
          {filteredAthletes.map((athlete) => {
            const sc = athlete.score ? Math.round(athlete.score.score_total) : null;
            const rk = ranked.indexOf(athlete.id) + 1;
            const tr = athlete.score?.trend_30d;
            return (
              <div key={athlete.id} className="asc" role="button" tabIndex={0}
                onClick={() => setSelectedAthlete(athlete)}
                onKeyDown={(e) => { if (e.key === "Enter") setSelectedAthlete(athlete); }}>
                <span style={{ position: "relative" }}>
                  <Av name={athlete.full_name} photo={athlete.photo_url} size={68} />
                  {rk > 0 && rk <= 10 && <span className="rk">{rk}</span>}
                </span>
                <span className="who" style={{ flex: 1 }}>
                  <span>
                    <b>{athlete.full_name}</b>
                    <span>{[shortPos(athlete.position), athlete.age ? `${athlete.age}a` : null, athlete.current_club].filter(Boolean).join(" · ")}</span>
                    {tr && tr !== "FLAT" && (
                      <span className={`trend ${tr === "UP" ? "up" : "down"}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TREND_I[tr] }} />
                        {tr === "UP" ? "Subindo" : "Caindo"}
                      </span>
                    )}
                  </span>
                </span>
                {sc != null ? (
                  <Ring pct={sc} c={scoreColor(sc)} size={68} />
                ) : (
                  <button type="button" className="btn sm g" disabled={calculatingIds.has(athlete.id)} onClick={(e) => handleCalculateScore(e, athlete)}>
                    {calculatingIds.has(athlete.id) ? "Calculando…" : "Calcular"}
                  </button>
                )}
              </div>
            );
          })}
        </section>
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
    </View>
  );
}
