import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeArray } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useAuth } from "@/hooks/authContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { usePlayerMatchStats } from "@/hooks/usePlayerMatchStats";
import { useManualPlayerStats } from "@/hooks/useManualPlayerStats";
import { useMarketScore } from "@/hooks/useMarketScore";
import { AtributoRadar } from "@/components/players/detail/AtributoRadar";
import { MarketValueMiniChart } from "@/components/players/detail/MarketValueMiniChart";
import { NoteEvolutionMiniChart } from "@/components/players/detail/NoteEvolutionMiniChart";
import { StatsTab } from "@/components/players/detail/StatsTab";
import { MarketValueTab } from "@/components/players/detail/MarketValueTab";
import { PhysicalTab } from "@/components/players/detail/PhysicalTab";
import { MedicalTab } from "@/components/players/detail/MedicalTab";
import { TechnicalTab } from "@/components/players/detail/TechnicalTab";
import { ContractTab } from "@/components/players/detail/ContractTab";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  User,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[] | null;
  age: number | null;
  birth_date: string | null;
  nationality: string;
  current_club: string | null;
  country: string | null;
  height: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  bio_public: string | null;
  highlight_video_url: string | null;
  is_public: boolean | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_notes: string | null;
  salary_info: string | null;
  release_clause: string | null;
  contract_status: string | null;
  passports: string[] | null;
  agent_name: string | null;
  agent_contact: string | null;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  wingspan: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
  last_physical_evaluation: string | null;
  playing_height_preference: string | null;
  play_style: string | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
  strengths: string[] | null;
  areas_to_develop: string[] | null;
  physical_status: string | null;
  medical_notes: string | null;
  overall_rating: number | null;
  potential_rating: number | null;
  ready_to_compete: boolean | null;
  estimated_level: string | null;
  internal_evaluation_notes: string | null;
  internal_notes: string | null;
  auto_rating: number | null;
  rating_updated_at: string | null;
  auto_rating_details: Record<string, unknown> | null;
  market_value: number | null;
  market_value_currency: string | null;
  market_value_trend: string | null;
  created_at: string;
  updated_at: string;
}

interface ScoutingReport {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  competition: { name: string } | null;
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const T = {
  bg: "bg-[#0A0A0A]",
  text: "text-[#F2EDE4]",
  accent: "#E5173F",
  border: "border-[#1C1C1C]",
  muted: "text-[#6B6560]",
  green: "#22C55E",
  amber: "#F59E0B",
} as const;

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "stats", label: "Estatísticas" },
  { id: "market", label: "Valor de mercado" },
  { id: "physical", label: "Físico" },
  { id: "technical", label: "Técnico" },
  { id: "medical", label: "Médico" },
  { id: "contract", label: "Contrato" },
] as const;

// ─── Small atoms ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className={`block text-[10px] tracking-[0.18em] uppercase ${T.muted} font-barlow font-bold mb-1`}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className={`text-[10px] tracking-[0.18em] uppercase ${T.muted} font-barlow font-bold mb-3`}>
      {children}
    </p>
  );
}

function Placeholder() {
  return (
    <div className="py-16 text-center">
      <span className="font-barlow font-extrabold text-lg tracking-[0.3em] text-[#6B6560] uppercase">
        — Seção em desenvolvimento —
      </span>
    </div>
  );
}

function formatMarketValue(value: number | null, currency: string | null) {
  if (value === null || value === undefined) return "—";
  const symbol = currency === "BRL" ? "R$" : "€";
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K`;
  return `${symbol}${value}`;
}

function getMarketScoreTier(score: number): { label: string; color: string } {
  if (score >= 86) return { label: "ELITE",      color: "#22C55E" };
  if (score >= 71) return { label: "ALTO",       color: "#22C55E" };
  if (score >= 51) return { label: "MÉDIO",      color: "#F59E0B" };
  if (score >= 31) return { label: "BAIXO",      color: "#E5173F" };
  return              { label: "MUITO BAIXO", color: "#E5173F" };
}

const PLAY_STYLE_DESC: Record<string, string> = {
  // Meio-campo
  "BOX-TO-BOX":           "Meio-campista incansável que atua em ambas as áreas, contribuindo na recuperação de bola e na chegada ao ataque com alta intensidade.",
  "VOLANTE DE CONTENÇÃO": "Jogador focado na marcação e proteção à frente da zaga, especialista em interceptações e combate direto para anular o adversário.",
  "ARMADOR RECUADO":      "Atua à frente da defesa para ditar o ritmo do jogo, distribuindo passes curtos e longos com precisão para iniciar a organização ofensiva.",
  "MEIA-ARMADOR":         "Especialista no último passe e criação de chances, utiliza visão de jogo privilegiada para servir os atacantes em zonas de finalização.",
  "MEZZALA":              "Meio-campista que flutua do centro para os lados, oferecendo amplitude ofensiva e infiltração constante na área adversária.",
  "FALSO TREQUARTISTA":   "Armador que recua para organizar a posse de bola, mas mantém liberdade total para criar jogadas no terço final do campo.",
  // Ataque e pontas
  "FALSO PONTA":          "Atua partindo do lado para o centro para atrair a marcação, liberando o corredor lateral para a subida dos companheiros.",
  "PONTA INVERTIDO":      "Joga no lado oposto ao pé preferencial, focando em cortes para o centro para buscar o chute ou passes decisivos por dentro.",
  "FALSO 9":              "Centroavante que recua para o meio-campo para atrair zagueiros, priorizando a armação de jogadas e a abertura de espaços na defesa.",
  "OPORTUNISTA":          "Atacante de referência física, focado em posicionamento dentro da área para finalizar rapidamente as jogadas de ataque.",
  // Defesa e gol
  "ZAGUEIRO CONSTRUTOR":  "Defensor com técnica apurada que inicia a saída de bola com passes verticais e qualidade na transição ofensiva.",
  "GOLEIRO-LINHA":        "Goleiro que joga adiantado e participa ativamente da posse de bola, atuando como um líbero para antecipar lançamentos adversários.",
  // Legacy entries kept for backward compatibility
  "BOX-TO-BOX (legacy)":  "Meio-campista incansável que atua em ambas as áreas, contribuindo tanto na recuperação de bola quanto na chegada ao ataque.",
  "ARMADOR":              "Jogador criativo com visão de jogo privilegiada, responsável por ditar o ritmo da equipe e servir os companheiros com passes decisivos.",
  "CONSTRUTOR":           "Jogador que inicia a organização ofensiva, conectando a defesa ao meio-campo com passes precisos e mantendo a posse de bola.",
  "FINALIZADOR":          "Atacante de área com alto instinto de posicionamento, focado em concluir as jogadas e converter chances em gols com precisão.",
  "PIVÔ":                 "Atacante que utiliza o porte físico para sustentar a marcação de costas, servindo de referência para a aproximação dos companheiros.",
  "VELOCISTA":            "Jogador de explosão que utiliza a velocidade para vencer duelos individuais e explorar as costas da defesa adversária.",
  "DRIBLADOR":            "Utiliza o drible como arma para criar desequilíbrio e espaços no ataque.",
  "ORGANIZADOR":          "Organiza o jogo com visão ampla e passes filtrados na medida.",
  "DEFENSIVO":            "Comprometido com marcação intensa e recuperação de bola.",
  "ARTICULADOR":          "Liga as linhas do time com qualidade técnica e inteligência tática.",
  "LIVRE":                "Movimenta-se com liberdade entre linhas para criar vantagem numérica.",
};

function getPlayStyleDesc(style: string): string {
  return PLAY_STYLE_DESC[style.toUpperCase()] ?? "Perfil de jogo definido pelo staff técnico.";
}

function getMarketScoreExplanation(score: number, confidence: number, sample: number): string {
  if (sample < 2)
    return "Amostra de observações insuficiente. O score reflete dados preliminares e pode divergir do valor real de mercado.";
  if (confidence < 60)
    return "Confiabilidade baixa devido à amostra reduzida. Score ajustado para refletir a incerteza dos dados disponíveis.";
  if (score < 50)
    return "Score abaixo da média de mercado. Pode indicar baixa regularidade, nível competitivo reduzido ou janela de idade desfavorável.";
  if (score < 70)
    return "Score na faixa intermediária. O atleta apresenta potencial de valorização com mais dados de observação.";
  return "Score consistente com perfil de mercado. Dados suficientes para avaliação confiável do valor do atleta.";
}

// ─── Module-level constants ───────────────────────────────────────────────────
// Shared between the query .limit(), reliability math, and the list render so
// they can never drift out of sync with each other.
const RECENT_REPORTS_LIMIT = 5;
// Computed once at module load — avoids a per-render Date allocation and the
// edge-case glitch if the app is open across midnight on New Year's Eve.
const CURRENT_YEAR = new Date().getFullYear();

// ─── Main component ───────────────────────────────────────────────────────────

const PlayerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isScout, isPlayer, linkedPlayerId } = useAuth();
  const { can, isPlayerRole } = usePermissions();

  const [player, setPlayer] = useState<Player | null>(null);
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Permissions
  const hasViewPermission = can("players", "view");
  const isOwnAthlete = (isPlayer || isPlayerRole) && linkedPlayerId === id;
  const isPlayerRoleOnly = (isPlayer || isPlayerRole) && !isAdmin && !isScout;
  const canAccessAthlete = isPlayerRoleOnly ? isOwnAthlete : hasViewPermission;
  const canEditPlayer = can("players", "edit");
  const canEdit = canEditPlayer;
  const canCreateReport = can("reports", "create");

  // Live match stats for current season (by competition too, for correction logic)
  const { totals: liveTotals, byCompetition: liveByCompetition, isLoading: liveStatsLoading } = usePlayerMatchStats({
    playerId: id ?? "",
    seasonYear: CURRENT_YEAR,
    enabled: !!id,
  });

  // Manual stats (manual_player_stats table — external games not in live match system)
  const { manualStats, isLoading: manualLoading } = useManualPlayerStats({
    playerId: id ?? "",
    enabled: !!id,
  });

  // Player_stats table (entries via PlayerStatsForm) — includes is_live_correction flag
  const { data: playerStatsRows = [], isLoading: psLoading } = useQuery({
    queryKey: ["player-stats-overview", id, CURRENT_YEAR],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select("matches, minutes, goals, assists, is_live_correction, competition_id")
        .eq("player_id", id!)
        .eq("season_year", CURRENT_YEAR);
      if (error) throw error;
      return (data ?? []) as {
        matches: number;
        minutes: number;
        goals: number;
        assists: number;
        is_live_correction: boolean | null;
        competition_id: string | null;
      }[];
    },
    enabled: !!id,
  });

  // Merged totals applying is_live_correction override semantics:
  //   • Correction row exists for competition → use ONLY that row, subtract raw LIVE for that comp.
  //   • No correction → sum LIVE + additive player_stats rows.
  //   • manual_player_stats → always additive.
  const seasonTotals = useMemo(() => {
    // Competitions that have a correction row (override semantics)
    const correctedCompIds = new Set(
      playerStatsRows
        .filter(ps => ps.is_live_correction)
        .map(ps => ps.competition_id)
        .filter((c): c is string => !!c),
    );

    // Start from live totals, then subtract corrected-competition contributions
    let matches = liveTotals?.matches ?? 0;
    let minutes = liveTotals?.minutes ?? 0;
    let goals   = liveTotals?.goals   ?? 0;
    let assists = liveTotals?.assists  ?? 0;

    for (const compId of correctedCompIds) {
      const live = liveByCompetition[compId];
      if (live) {
        matches -= live.stats.matches;
        minutes -= live.stats.minutes;
        goals   -= live.stats.goals;
        assists -= live.stats.assists;
      }
    }

    // manual_player_stats: always additive
    manualStats
      .filter(ms => ms.season_year === CURRENT_YEAR)
      .forEach(ms => {
        matches += ms.games;
        minutes += ms.minutes;
        goals   += ms.goals   ?? 0;
        assists += ms.assists ?? 0;
      });

    // player_stats: correction rows always count; non-correction rows only count
    // when their competition has no correction (avoids double-counting stale rows)
    playerStatsRows.forEach(ps => {
      const isCorrected = !ps.is_live_correction && correctedCompIds.has(ps.competition_id ?? "___none");
      if (!isCorrected) {
        matches += ps.matches ?? 0;
        minutes += ps.minutes ?? 0;
        goals   += ps.goals   ?? 0;
        assists += ps.assists ?? 0;
      }
    });

    return {
      matches: Math.max(0, matches),
      minutes: Math.max(0, minutes),
      goals:   Math.max(0, goals),
      assists: Math.max(0, assists),
    };
  }, [liveTotals, liveByCompetition, manualStats, playerStatsRows, CURRENT_YEAR]);

  const statsLoading = liveStatsLoading || manualLoading || psLoading;

  // Market score hook
  const { displayScore: marketScore, scoreLoading: marketScoreLoading, dataConfidence, hasEnoughData: marketHasData } = useMarketScore({
    playerId: id ?? "",
    playerName: player?.full_name ?? "",
    position: player?.position ?? "",
    secondaryPositions: player?.secondary_positions ?? [],
    birthDate: player?.birth_date,
    age: player?.age,
    enabled: !!id && !!player,
  });

  const refetchPlayer = async () => {
    if (!id) return;
    const { data } = await supabase.from("players").select("*").eq("id", id).limit(1);
    const row = Array.isArray(data) ? data[0] ?? null : null;
    if (row) setPlayer(row as Player);
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [playerRes, reportsRes] = await Promise.all([
        supabase.from("players").select("*").eq("id", id).limit(1),
        supabase
          .from("scouting_reports")
          .select("id, match_date, final_score, rating, competition:competitions(name)")
          .eq("player_id", id)
          .order("match_date", { ascending: false })
          .limit(RECENT_REPORTS_LIMIT),
      ]);
      const row = Array.isArray(playerRes.data) ? playerRes.data[0] ?? null : null;
      if (row) setPlayer(row as Player);
      if (reportsRes.data) setReports(reportsRes.data as ScoutingReport[]);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // KPI: average scout note — only valid (non-null) scores count
  const avgScoutNote = useMemo(() => {
    const valid = reports.filter(r => r.final_score !== null && r.final_score !== undefined);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + r.final_score!, 0) / valid.length;
  }, [reports]);

  // Season computed
  const ga = (seasonTotals?.goals ?? 0) + (seasonTotals?.assists ?? 0);
  const tierCfg = marketScore !== null ? getMarketScoreTier(Math.round(marketScore)) : { label: "", color: "#E5173F" };

  // Rating history for Note Evolution delta
  const { data: ratingHistory = [] } = useQuery({
    queryKey: ["player-rating-history-overview", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_rating_history")
        .select("rating")
        .eq("player_id", id!)
        .order("recorded_at", { ascending: true })
        .limit(20);
      return (data ?? []) as { rating: number }[];
    },
    enabled: !!id,
  });
  const initialRating: number | null = ratingHistory.length > 0 ? ratingHistory[0].rating : null;
  const ratingDelta: number | null =
    initialRating !== null && player !== null && player.auto_rating !== null
      ? player.auto_rating - initialRating
      : null;

  // Reliability
  const reliabilityPct = Math.min(100, Math.round((reports.length / RECENT_REPORTS_LIMIT) * 100));
  const reliabilityColor = reliabilityPct > 70 ? T.green : reliabilityPct >= 50 ? T.amber : T.accent;
  const reliabilityLabel = reliabilityPct > 70 ? "ALTA" : reliabilityPct >= 50 ? "MÉDIA" : "BAIXA";

  const handleDeleteSuccess = () => navigate("/dashboard/atletas");

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessAthlete && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="p-4 rounded-full bg-destructive/10">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Acesso Negado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você só pode visualizar o perfil do seu próprio atleta.
        </p>
        <button
          onClick={() => navigate("/dashboard/my-profile")}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm"
        >
          Ir para Meu Perfil
        </button>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Atleta não encontrado</h2>
        <button
          onClick={() => navigate("/dashboard/atletas")}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm"
        >
          Voltar
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`${T.bg} ${T.text} -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 pb-24 md:pb-8`}
      style={{ fontFamily: "'Basis Grotesque Pro', sans-serif" }}
    >

      {/* ── Top accent line ─────────────────────────────────────────────── */}
      <div style={{ height: 2, background: T.accent }} />

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <div className="hidden md:block"><div
        className={`flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b ${T.border}`}
      >
        <button
          onClick={() => navigate("/dashboard/atletas")}
          className="flex items-center gap-1.5 font-jetbrains text-[11px] tracking-[0.14em] text-[#6B6560] hover:text-[#F2EDE4] transition-colors uppercase"
        >
          <ArrowLeft className="w-3 h-3" />
          ATLETAS / {player.full_name.toUpperCase()}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {canCreateReport && (
            <Link
              to={`/dashboard/relatorios/novo?player=${player.id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 border ${T.border} font-jetbrains text-[11px] tracking-wider uppercase text-[#F2EDE4] hover:border-[#E5173F] transition-colors`}
            >
              <FileText className="w-3 h-3" />
              + NOVO RELATÓRIO
            </Link>
          )}
          {canEdit && (
            <Link
              to={`/dashboard/atletas/${player.id}/editar`}
              className={`flex items-center gap-1.5 px-3 py-1.5 border ${T.border} font-jetbrains text-[11px] tracking-wider uppercase text-[#F2EDE4] hover:border-[#F2EDE4] transition-colors`}
            >
              <Edit className="w-3 h-3" />
              EDITAR
            </Link>
          )}
          {isAdmin && (
            <PermissionGate module="players" action="delete">
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-jetbrains text-[11px] tracking-wider uppercase text-white hover:opacity-80 transition-opacity"
                style={{ background: T.accent }}
              >
                <Trash2 className="w-3 h-3" />
                EXCLUIR
              </button>
            </PermissionGate>
          )}
        </div>
      </div></div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`px-4 md:px-6 py-[22px] border-b ${T.border}`}>
        <div className="flex gap-4 items-start">

          {/* Photo */}
          <div
            className={`w-20 h-20 shrink-0 border ${T.border} overflow-hidden bg-[#111] hidden md:flex items-center justify-center`}
          >
            {player.photo_url ? (
              <img
                src={getOptimizedImageUrl(player.photo_url, { width: 400, quality: 85, format: "avif" }) || player.photo_url || ""}
                alt={player.full_name}
                className="w-full h-full object-cover object-center"
                onError={e => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
              />
            ) : (
              <User className="w-8 h-8 text-[#6B6560]" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1
              className="font-barlow font-extrabold text-[34px] leading-none tracking-tight"
              style={{ lineHeight: 1.05 }}
            >
              {player.full_name}
            </h1>

            {/* Meta-row */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5 font-jetbrains text-[12px] text-[#6B6560]">
              <span style={{ color: T.accent }} className="font-bold">
                {player.position}
              </span>
              {safeArray(player.secondary_positions).length > 0 && (
                <>
                  <span>·</span>
                  <span>{safeArray(player.secondary_positions).slice(0, 2).join(" / ")}</span>
                </>
              )}
              {player.age && <><span>·</span><span>{player.age} anos</span></>}
              {player.height && <><span>·</span><span>{player.height}cm</span></>}
              {player.dominant_foot && <><span>·</span><span>{player.dominant_foot}</span></>}
              {player.nationality && <><span>·</span><span>{player.nationality}</span></>}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {/* Public/Private */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 border ${T.border} font-jetbrains text-[10px] tracking-wider uppercase text-[#6B6560]`}>
                {player.is_public
                  ? <><Eye className="w-2.5 h-2.5" />PÚBLICO</>
                  : <><EyeOff className="w-2.5 h-2.5" />PRIVADO</>
                }
              </span>

              {/* Contract status */}
              {player.contract_status && (
                <span className={`inline-flex items-center px-2 py-0.5 border ${T.border} font-jetbrains text-[10px] tracking-wider uppercase text-[#6B6560]`}>
                  {player.contract_status === "contracted" ? "CONTRATADO" : player.contract_status.toUpperCase()}
                </span>
              )}

              {/* Auto rating */}
              {player.auto_rating !== null && player.auto_rating !== undefined && (
                <span className={`inline-flex items-center px-2 py-0.5 border ${T.border} font-jetbrains text-[10px] tracking-wider uppercase text-[#F2EDE4]`}>
                  ★ {player.auto_rating.toFixed(1)}/10
                </span>
              )}

              {/* Club */}
              {player.current_club && (
                <span className={`inline-flex items-center px-2 py-0.5 border ${T.border} font-jetbrains text-[10px] tracking-wider uppercase text-[#6B6560]`}>
                  {player.current_club}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className={`border-b ${T.border} overflow-x-auto scrollbar-hide`}>
        <div className="flex px-4 md:px-6">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pr-4 md:pr-5 py-3 font-jetbrains text-[11px] tracking-[0.15em] uppercase shrink-0 transition-colors flex flex-col items-start ${
                  active ? "text-[#F2EDE4]" : "text-[#6B6560] hover:text-[#F2EDE4]"
                }`}
              >
                <span
                  className="border-b-2 pb-px"
                  style={{ borderColor: active ? T.accent : "transparent" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-6">
        {activeTab === "stats" ? (
          <StatsTab playerId={player.id} playerPosition={player.position} />
        ) : activeTab === "market" ? (
          <MarketValueTab
            playerId={player.id}
            marketValue={player.market_value}
            marketValueCurrency={player.market_value_currency}
            marketValueTrend={player.market_value_trend}
            onValueChange={refetchPlayer}
          />
        ) : activeTab === "physical" ? (
          <PhysicalTab
            playerId={player.id}
            playerPosition={player.position}
            playerHeight={player.height}
            playerWingspan={player.wingspan}
            playerWeight={player.weight}
            playerBodyFat={player.body_fat_percentage}
            playerMuscle={player.muscle_mass}
            playerMaxSpeed={player.max_speed}
            playerSprint30m={player.sprint_30m}
            playerVo2Max={player.vo2_max}
          />
        ) : activeTab === "medical" ? (
          <MedicalTab
            playerId={player.id}
            playerPhysicalStatus={player.physical_status}
            playerMedicalNotes={player.medical_notes}
            onDataChange={refetchPlayer}
            canEdit={canEdit}
          />
        ) : activeTab === "technical" ? (
          <TechnicalTab playerId={player.id} />
        ) : activeTab === "contract" ? (
          <ContractTab
            playerId={player.id}
            currentClub={player.current_club}
            country={player.country}
            contractStart={player.contract_start}
            contractEnd={player.contract_end}
            contractStatus={player.contract_status}
            salaryInfo={player.salary_info}
            releaseClause={player.release_clause}
            agentName={player.agent_name}
            agentContact={player.agent_contact}
            contractNotes={player.contract_notes}
          />
        ) : activeTab !== "overview" ? (
          <Placeholder />
        ) : (
          /* ── Overview ──────────────────────────────────────────────── */
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">

            {/* ── Left column ─────────────────────────────────────────── */}
            <div className={`lg:border-r ${T.border} lg:pr-6 space-y-0`}>

              {/* Season Stats */}
              <section className={`border ${T.border} mb-5`}>
                <div className={`grid grid-cols-5 divide-x divide-[#1C1C1C]`}>
                  {[
                    { label: "JOGOS", value: statsLoading ? "…" : (seasonTotals?.matches ?? "—"), color: undefined },
                    { label: "MIN", value: statsLoading ? "…" : (seasonTotals?.minutes ?? "—"), color: undefined },
                    { label: "GOLS", value: statsLoading ? "…" : (seasonTotals?.goals ?? "—"), color: T.accent },
                    { label: "ASSIST", value: statsLoading ? "…" : (seasonTotals?.assists ?? "—"), color: undefined },
                    { label: "G+A", value: statsLoading ? "…" : ga, color: T.amber },
                  ].map((s) => (
                    <div key={s.label} className="px-1 sm:px-3 py-4 text-center min-w-0">
                      <span className={`block text-[9px] tracking-[0.15em] sm:tracking-[0.2em] uppercase ${T.muted} font-jetbrains mb-1 whitespace-nowrap`}>
                        {s.label}
                      </span>
                      <span
                        className="font-jetbrains text-[16px] sm:text-[22px] md:text-[28px] font-bold leading-none whitespace-nowrap block"
                        style={{ color: s.color ?? "#F2EDE4" }}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={`border-t ${T.border} px-4 py-2`}>
                  <span className="font-jetbrains text-[10px] tracking-wider uppercase text-[#6B6560]">
                    TEMPORADA {new Date().getFullYear()}
                  </span>
                </div>
              </section>

              {/* Info Cards Grid */}
              <section className={`border ${T.border} mb-5`}>
                <div className={`grid grid-cols-1 md:grid-cols-2`} style={{ gap: 1, background: "#1C1C1C" }}>

                  {/* Identity */}
                  <div className={`${T.bg} p-4`}>
                    <SectionTitle>IDENTIDADE</SectionTitle>
                    <dl className="space-y-1.5">
                      {[
                        { k: "Posição", v: player.position },
                        { k: "Idade", v: player.age ? `${player.age} anos` : null },
                        { k: "Altura", v: player.height ? `${player.height} cm` : null },
                        { k: "Pé dominante", v: player.dominant_foot },
                        { k: "País", v: player.nationality },
                        { k: "Clube", v: player.current_club },
                      ].filter((x) => x.v).map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="font-jetbrains text-[10px] text-[#6B6560] uppercase tracking-wider shrink-0">{k}</dt>
                          <dd className="font-jetbrains text-[11px] text-[#F2EDE4] text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Contract */}
                  <div className={`${T.bg} p-4`}>
                    <SectionTitle>CONTRATO</SectionTitle>
                    <dl className="space-y-1.5">
                      {[
                        { k: "Status", v: player.contract_status },
                        { k: "Início", v: player.contract_start ? format(new Date(player.contract_start), "MMM yyyy", { locale: ptBR }) : null },
                        { k: "Término", v: player.contract_end ? format(new Date(player.contract_end), "MMM yyyy", { locale: ptBR }) : null },
                        { k: "Agente", v: player.agent_name },
                        { k: "Salário", v: player.salary_info },
                      ].filter((x) => x.v).map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="font-jetbrains text-[10px] text-[#6B6560] uppercase tracking-wider shrink-0">{k}</dt>
                          <dd className="font-jetbrains text-[11px] text-[#F2EDE4] text-right">{v}</dd>
                        </div>
                      ))}
                      {!player.contract_status && !player.contract_start && (
                        <p className="font-jetbrains text-[11px] text-[#6B6560]">Sem informações de contrato.</p>
                      )}
                    </dl>
                  </div>

                  {/* Tactical */}
                  <div className={`${T.bg} p-4`}>
                    <SectionTitle>PERFIL TÁTICO</SectionTitle>
                    <dl className="space-y-1.5">
                      {[
                        { k: "Função principal", v: player.primary_tactical_role },
                        { k: "Função secundária", v: player.secondary_tactical_role },
                        { k: "Preferência", v: player.playing_height_preference },
                      ].filter((x) => x.v).map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="font-jetbrains text-[10px] text-[#6B6560] uppercase tracking-wider shrink-0">{k}</dt>
                          <dd className="font-jetbrains text-[11px] text-[#F2EDE4] text-right">{v}</dd>
                        </div>
                      ))}
                      {!player.primary_tactical_role && (
                        <p className="font-jetbrains text-[11px] text-[#6B6560]">Sem perfil tático definido.</p>
                      )}
                    </dl>
                  </div>

                  {/* Style */}
                  <div className={`${T.bg} p-4`}>
                    <SectionTitle>ESTILO DE JOGO</SectionTitle>
                    {player.play_style ? (
                      <>
                        <p
                          className="font-barlow font-extrabold text-[22px] uppercase leading-tight"
                          style={{ color: T.accent }}
                        >
                          {player.play_style}
                        </p>
                        <p className="font-barlow text-[12px] mt-1" style={{ color: "#6B6560" }}>
                          {getPlayStyleDesc(player.play_style)}
                        </p>
                      </>
                    ) : (
                      <p className="font-barlow text-[11px] text-[#6B6560]">Não definido.</p>
                    )}
                  </div>

                  {/* Strengths */}
                  <div className={`${T.bg} p-4`}>
                    <SectionTitle>PONTOS FORTES</SectionTitle>
                    {safeArray(player.strengths).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {safeArray(player.strengths).map((s, i) => (
                          <span
                            key={i}
                            className="font-barlow font-bold text-[11px] uppercase tracking-wide px-[10px] py-[3px]"
                            style={{ border: `1px solid ${T.green}`, color: T.green }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-barlow text-[11px] text-[#6B6560]">Nenhum ponto forte cadastrado.</p>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div className={`${T.bg} p-4`}>
                    <SectionTitle>ÁREAS DE DESENVOLVIMENTO</SectionTitle>
                    {safeArray(player.areas_to_develop).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {safeArray(player.areas_to_develop).map((s, i) => (
                          <span
                            key={i}
                            className="font-barlow font-bold text-[11px] uppercase tracking-wide px-[10px] py-[3px]"
                            style={{ border: `1px solid ${T.amber}`, color: T.amber }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-barlow text-[11px] text-[#6B6560]">Nenhuma área registrada.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Internal Evaluation (private section, same access rules as before) */}
              <section className={`border ${T.border} mb-5`}>
                <div className={`px-4 py-3 border-b ${T.border} flex items-center gap-2`}>
                  <SectionTitle>AVALIAÇÃO INTERNA</SectionTitle>
                  <Lock className="w-3 h-3 text-[#6B6560] mb-3" />
                </div>
                <div
                  className="grid grid-cols-2"
                  style={{ gap: 1, background: "#1C1C1C" }}
                >
                  {/* Nota Geral */}
                  <div className={`${T.bg} p-5`}>
                    <Label>NOTA GERAL</Label>
                    <span className="font-jetbrains text-[32px] font-bold text-[#F2EDE4] leading-none">
                      {player.overall_rating !== null && player.overall_rating !== undefined
                        ? player.overall_rating.toFixed(1)
                        : "—"}
                    </span>
                    <span className="font-jetbrains text-[12px] text-[#6B6560] ml-1">/10</span>
                  </div>

                  {/* Potencial */}
                  <div className={`${T.bg} p-5`}>
                    <Label>POTENCIAL</Label>
                    <span
                      className="font-jetbrains text-[32px] font-bold leading-none"
                      style={{ color: T.green }}
                    >
                      {player.potential_rating !== null && player.potential_rating !== undefined
                        ? player.potential_rating.toFixed(1)
                        : "—"}
                    </span>
                    <span className="font-jetbrains text-[12px] text-[#6B6560] ml-1">/10</span>
                  </div>

                  {/* Ready to compete */}
                  <div className={`${T.bg} p-5`}>
                    <Label>PRONTO PARA COMPETIR?</Label>
                    {player.ready_to_compete !== null && player.ready_to_compete !== undefined ? (
                      <span
                        className="font-barlow font-extrabold text-[18px] uppercase"
                        style={{ color: player.ready_to_compete ? T.green : T.amber }}
                      >
                        {player.ready_to_compete ? "SIM" : "NÃO"}
                      </span>
                    ) : (
                      <span className="font-jetbrains text-[20px] font-bold text-[#6B6560]">—</span>
                    )}
                  </div>

                  {/* Estimated Level */}
                  <div className={`${T.bg} p-5`}>
                    <Label>NÍVEL ESTIMADO</Label>
                    {player.estimated_level ? (
                      <span
                        className="font-barlow font-bold text-[13px] uppercase tracking-wide px-[10px] py-[3px] inline-block"
                        style={{ border: `1px solid ${T.amber}`, color: T.amber }}
                      >
                        {player.estimated_level}
                      </span>
                    ) : (
                      <span className="font-jetbrains text-[20px] font-bold text-[#6B6560]">—</span>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Sidebar ────────────────────────────────────────── */}
            <div className="lg:pl-6 space-y-5 mt-5 lg:mt-0">

              {/* M3 Market Score */}
              <section className={`border ${T.border} p-5`}>
                <SectionTitle>M3 MARKET SCORE</SectionTitle>

                {/* Score number + tier label */}
                <div className="flex items-baseline gap-3 mb-2">
                  <span
                    className="font-jetbrains font-bold leading-none"
                    style={{ fontSize: 76, color: "#F2EDE4", lineHeight: 1 }}
                  >
                    {marketScoreLoading ? "…" : marketScore !== null ? Math.round(marketScore) : "—"}
                  </span>
                  <span className="font-jetbrains text-[12px] text-[#6B6560]">/100</span>
                  {!marketScoreLoading && marketScore !== null && (
                    <span
                      className="font-barlow font-extrabold text-[12px] uppercase tracking-wider"
                      style={{ color: tierCfg.color }}
                    >
                      {tierCfg.label}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div
                  className="w-full mb-3 overflow-hidden"
                  style={{ height: 2, background: "#1C1C1C" }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${marketScore ?? 0}%`,
                      background: tierCfg.color,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>

                {/* Meta lines + explanation — only when score exists */}
                {!marketScoreLoading && marketScore !== null ? (
                  <>
                    <p className="font-jetbrains text-[11px] mb-1" style={{ color: "#6B6560" }}>
                      Base: {player.auto_rating !== null ? Math.round(player.auto_rating * 10) : "—"} → Ajustado: {Math.round(marketScore)}
                    </p>
                    <p className="font-jetbrains text-[11px] mb-3" style={{ color: T.amber }}>
                      {dataConfidence < 75 ? "↓" : "→"} Confiança {Math.round(dataConfidence)}%{(!marketHasData || reports.length < 3) ? " · Amostra reduzida" : ""}
                    </p>
                    <div
                      className="font-jetbrains text-[11px] leading-relaxed"
                      style={{
                        background: "#0D0D0D",
                        borderLeft: "2px solid #F59E0B",
                        padding: "9px 12px",
                        color: "#6B6560",
                      }}
                    >
                      {getMarketScoreExplanation(Math.round(marketScore), Math.round(dataConfidence), reports.length)}
                    </div>
                  </>
                ) : !marketScoreLoading && (
                  <ul className="space-y-1.5">
                    {[
                      player.age && player.age <= 23 ? "Atleta em janela de valorização" : null,
                      (seasonTotals?.goals ?? 0) > 5 ? "Alto volume ofensivo na temporada" : null,
                      player.contract_status === "contracted" ? "Contrato ativo" : null,
                    ].filter(Boolean).slice(0, 3).map((insight, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-[3px] h-[3px] shrink-0" style={{ background: T.accent }} />
                        <span className="font-jetbrains text-[11px] text-[#6B6560]">{insight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Attributes Radar */}
              <section className={`border ${T.border} p-5`}>
                <SectionTitle>ATRIBUTOS</SectionTitle>
                <AtributoRadar playerId={player.id} />
              </section>

              {/* Market Value chart */}
              <section className={`border ${T.border} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] tracking-[0.18em] uppercase font-barlow font-bold" style={{ color: "#6B6560" }}>
                    VALOR DE MERCADO
                  </p>
                  {player.market_value_trend && (() => {
                    const t = player.market_value_trend.toLowerCase();
                    const cfg = t === "up"
                      ? { icon: "↗", label: "EM ALTA",  color: T.green  }
                      : t === "down"
                      ? { icon: "↘", label: "EM BAIXA", color: T.accent }
                      : { icon: "→", label: "ESTÁVEL",  color: "#6B6560" };
                    return (
                      <span className="font-barlow font-bold text-[11px] uppercase tracking-wide" style={{ color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-jetbrains text-[18px] font-bold" style={{ color: T.green }}>
                    {formatMarketValue(player.market_value, player.market_value_currency)}
                  </span>
                </div>
                <MarketValueMiniChart playerId={player.id} currentValue={player.market_value} />
              </section>

              {/* Note Evolution chart */}
              <section className={`border ${T.border} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] tracking-[0.18em] uppercase font-barlow font-bold" style={{ color: "#6B6560" }}>
                    EVOLUÇÃO DA NOTA
                  </p>
                  {ratingDelta !== null && (
                    <span
                      className="font-jetbrains text-[13px]"
                      style={{ color: ratingDelta >= 0 ? T.green : T.accent }}
                    >
                      {ratingDelta >= 0 ? "+" : "−"}{Math.abs(ratingDelta).toFixed(1)}
                    </span>
                  )}
                </div>
                <NoteEvolutionMiniChart playerId={player.id} currentRating={player.auto_rating} />
                {initialRating !== null && player.auto_rating !== null && (
                  <div className="flex items-start justify-between mt-3">
                    <div>
                      <p className="font-barlow font-bold text-[10px] uppercase mb-0.5" style={{ color: "#6B6560", letterSpacing: "0.12em" }}>
                        INICIAL
                      </p>
                      <p className="font-jetbrains text-[22px] font-bold" style={{ color: "#6B6560" }}>
                        {initialRating.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-barlow font-bold text-[10px] uppercase mb-0.5" style={{ color: "#6B6560", letterSpacing: "0.12em" }}>
                        ATUAL
                      </p>
                      <p className="font-jetbrains text-[22px] font-bold" style={{ color: ratingDelta !== null && ratingDelta >= 0 ? T.green : T.accent }}>
                        {player.auto_rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Reliability */}
              <section className={`border ${T.border} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] tracking-[0.18em] uppercase font-barlow font-bold" style={{ color: "#6B6560" }}>
                    CONFIABILIDADE
                  </p>
                  <span
                    className="font-jetbrains text-[22px] font-bold"
                    style={{ color: reliabilityColor }}
                  >
                    {reliabilityPct}%
                  </span>
                </div>
                <span
                  className="font-barlow font-bold text-[11px] uppercase tracking-wide px-[10px] py-[3px] inline-block mb-3"
                  style={{ border: `1px solid ${reliabilityColor}`, color: reliabilityColor }}
                >
                  {reliabilityLabel}
                </span>
                <div className="w-full overflow-hidden" style={{ height: 2, background: "#1C1C1C" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${reliabilityPct}%`,
                      background: reliabilityColor,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <p className="font-jetbrains text-[10px] text-[#6B6560] mt-2 tracking-wider uppercase">
                  Baseado em {reports.length} relatório{reports.length !== 1 ? "s" : ""}
                </p>
              </section>

              {/* Recent Reports */}
              <section className={`border ${T.border} p-5`}>
                <div className="flex items-start justify-between">
                  <SectionTitle>RELATÓRIOS RECENTES</SectionTitle>
                  {avgScoutNote !== null && (
                    <div className="text-right">
                      <p className="font-jetbrains font-bold text-[18px]" style={{ color: avgScoutNote > 70 ? T.green : avgScoutNote >= 50 ? T.amber : T.accent }}>
                        {avgScoutNote.toFixed(1)}
                      </p>
                      <p className="font-jetbrains text-[9px] tracking-wider uppercase" style={{ color: "#6B6560" }}>
                        Média (últimos 5 jogos)
                      </p>
                    </div>
                  )}
                </div>
                {reports.length === 0 ? (
                  <p className="font-barlow text-[11px] text-[#6B6560]">Nenhum relatório encontrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {reports.slice(0, RECENT_REPORTS_LIMIT).map((r) => {
                      const score = r.final_score ?? 0;
                      const scoreColor = score > 70 ? T.green : score >= 50 ? T.amber : "#F2EDE4";
                      return (
                        <li
                          key={r.id}
                          className={`flex items-center justify-between pb-2 border-b ${T.border} last:border-0 last:pb-0`}
                        >
                          <div>
                            <p className="font-barlow font-bold text-[12px] uppercase tracking-wide" style={{ color: "#F2EDE4" }}>
                              {r.competition?.name ?? "—"}
                            </p>
                            <p className="font-jetbrains text-[10px] text-[#6B6560]">
                              {format(new Date(r.match_date), "dd MMM yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Link to={`/dashboard/relatorios/${r.id}`}>
                            <span
                              className="font-jetbrains font-bold text-[15px]"
                              style={{ color: scoreColor }}
                            >
                              {r.final_score?.toFixed(1) ?? "—"}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={player ? { id: player.id, full_name: player.full_name } : null}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default PlayerDetail;
