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
  auto_potential: number | null;
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

const ACCENT  = "#ec4525";
const MUTED   = "#62616a";
const FG      = "#ededee";
const GREEN   = "#22c55e";
const AMBER   = "#f59e0b";
const CARD    = "rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-800/60 transition-colors duration-200";
const DIVIDER = "border-zinc-800/60";

// ─── Atoms ───────────────────────────────────────────────────────────────────

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase mb-[14px]" style={{ color: MUTED }}>
      <span style={{ color: ACCENT }} className="font-semibold">{n}</span>
      <span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" />
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-editorial-mono text-[9.5px] tracking-[0.22em] uppercase mb-[10px]" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function Placeholder() {
  return (
    <div className="py-16 text-center">
      <span className="font-editorial-mono text-sm tracking-[0.3em] uppercase" style={{ color: MUTED }}>
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
  if (score >= 86) return { label: "ELITE",      color: GREEN };
  if (score >= 71) return { label: "ALTO",       color: GREEN };
  if (score >= 51) return { label: "MÉDIO",      color: AMBER };
  if (score >= 31) return { label: "BAIXO",      color: ACCENT };
  return              { label: "MUITO BAIXO", color: ACCENT };
}

const PLAY_STYLE_DESC: Record<string, string> = {
  "BOX-TO-BOX":           "Meio-campista incansável que atua em ambas as áreas, contribuindo na recuperação de bola e na chegada ao ataque com alta intensidade.",
  "VOLANTE DE CONTENÇÃO": "Jogador focado na marcação e proteção à frente da zaga, especialista em interceptações e combate direto para anular o adversário.",
  "ARMADOR RECUADO":      "Atua à frente da defesa para ditar o ritmo do jogo, distribuindo passes curtos e longos com precisão para iniciar a organização ofensiva.",
  "MEIA-ARMADOR":         "Especialista no último passe e criação de chances, utiliza visão de jogo privilegiada para servir os atacantes em zonas de finalização.",
  "MEZZALA":              "Meio-campista que flutua do centro para os lados, oferecendo amplitude ofensiva e infiltração constante na área adversária.",
  "FALSO TREQUARTISTA":   "Armador que recua para organizar a posse de bola, mas mantém liberdade total para criar jogadas no terço final do campo.",
  "FALSO PONTA":          "Atua partindo do lado para o centro para atrair a marcação, liberando o corredor lateral para a subida dos companheiros.",
  "PONTA INVERTIDO":      "Joga no lado oposto ao pé preferencial, focando em cortes para o centro para buscar o chute ou passes decisivos por dentro.",
  "FALSO 9":              "Centroavante que recua para o meio-campo para atrair zagueiros, priorizando a armação de jogadas e a abertura de espaços na defesa.",
  "OPORTUNISTA":          "Atacante de referência física, focado em posicionamento dentro da área para finalizar rapidamente as jogadas de ataque.",
  "ZAGUEIRO CONSTRUTOR":  "Defensor com técnica apurada que inicia a saída de bola com passes verticais e qualidade na transição ofensiva.",
  "GOLEIRO-LINHA":        "Goleiro que joga adiantado e participa ativamente da posse de bola, atuando como um líbero para antecipar lançamentos adversários.",
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

const RECENT_REPORTS_LIMIT = 5;
const CURRENT_YEAR = new Date().getFullYear();

const TABS = [
  { id: "overview",  label: "Visão geral" },
  { id: "stats",     label: "Estatísticas" },
  { id: "market",    label: "Valor de mercado" },
  { id: "physical",  label: "Físico" },
  { id: "technical", label: "Técnico" },
  { id: "medical",   label: "Médico" },
  { id: "contract",  label: "Contrato" },
] as const;

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

  const hasViewPermission = can("players", "view");
  const isOwnAthlete = (isPlayer || isPlayerRole) && linkedPlayerId === id;
  const isPlayerRoleOnly = (isPlayer || isPlayerRole) && !isAdmin && !isScout;
  const canAccessAthlete = isPlayerRoleOnly ? isOwnAthlete : hasViewPermission;
  const canEditPlayer = can("players", "edit");
  const canEdit = canEditPlayer;
  const canCreateReport = can("reports", "create");

  const { totals: liveTotals, byCompetition: liveByCompetition, isLoading: liveStatsLoading } = usePlayerMatchStats({
    playerId: id ?? "",
    seasonYear: CURRENT_YEAR,
    enabled: !!id,
  });

  const { manualStats, isLoading: manualLoading } = useManualPlayerStats({
    playerId: id ?? "",
    enabled: !!id,
  });

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

  const seasonTotals = useMemo(() => {
    const correctedCompIds = new Set(
      playerStatsRows
        .filter(ps => ps.is_live_correction)
        .map(ps => ps.competition_id)
        .filter((c): c is string => !!c),
    );
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
    manualStats
      .filter(ms => ms.season_year === CURRENT_YEAR)
      .forEach(ms => {
        matches += ms.games;
        minutes += ms.minutes;
        goals   += ms.goals   ?? 0;
        assists += ms.assists ?? 0;
      });
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
  }, [liveTotals, liveByCompetition, manualStats, playerStatsRows]);

  const statsLoading = liveStatsLoading || manualLoading || psLoading;

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

  const avgScoutNote = useMemo(() => {
    const valid = reports.filter(r => r.final_score !== null && r.final_score !== undefined);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + r.final_score!, 0) / valid.length;
  }, [reports]);

  const ga = (seasonTotals?.goals ?? 0) + (seasonTotals?.assists ?? 0);
  const tierCfg = marketScore !== null ? getMarketScoreTier(Math.round(marketScore)) : { label: "", color: ACCENT };

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

  const reliabilityPct = Math.min(100, Math.round((reports.length / RECENT_REPORTS_LIMIT) * 100));
  const reliabilityColor = reliabilityPct > 70 ? GREEN : reliabilityPct >= 50 ? AMBER : ACCENT;
  const reliabilityLabel = reliabilityPct > 70 ? "ALTA" : reliabilityPct >= 50 ? "MÉDIA" : "BAIXA";

  const handleDeleteSuccess = () => navigate("/dashboard/atletas");

  // ── Loading ───────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  const imgSrc = player.photo_url
    ? getOptimizedImageUrl(player.photo_url, { width: 600, quality: 85, format: "avif" }) || player.photo_url
    : null;

  return (
    <div
      className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 pb-24 md:pb-8"
      style={{ background: "#0c0b0d", color: FG, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: ACCENT }} />

      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className={`flex items-center justify-between gap-4 px-6 py-3 border-b ${DIVIDER}`}>
          <button
            onClick={() => navigate("/dashboard/atletas")}
            className="flex items-center gap-1.5 font-editorial-mono text-[11px] tracking-[0.14em] uppercase transition-colors"
            style={{ color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            <ArrowLeft className="w-3 h-3" />
            ATLETAS / {player.full_name.toUpperCase()}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {canCreateReport && (
              <Link
                to={`/dashboard/relatorios/novo?player=${player.id}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase transition-colors hover:border-zinc-600`}
                style={{ color: FG }}
              >
                <FileText className="w-3 h-3" />
                + NOVO RELATÓRIO
              </Link>
            )}
            {canEdit && (
              <Link
                to={`/dashboard/atletas/${player.id}/editar`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase transition-colors hover:border-zinc-600"
                style={{ color: FG }}
              >
                <Edit className="w-3 h-3" />
                EDITAR
              </Link>
            )}
            {isAdmin && (
              <PermissionGate module="players" action="delete">
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-editorial-mono text-[10px] tracking-wider uppercase text-white hover:opacity-80 transition-opacity"
                  style={{ background: ACCENT }}
                >
                  <Trash2 className="w-3 h-3" />
                  EXCLUIR
                </button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className={`px-4 md:px-6 py-8 border-b ${DIVIDER}`}>
        <div className="flex gap-6 items-start">

          {/* Photo */}
          {imgSrc && (
            <div className="relative w-[90px] h-[90px] md:w-[110px] md:h-[110px] shrink-0 rounded-xl overflow-hidden border border-zinc-800 hidden md:block">
              <img
                src={imgSrc}
                alt={player.full_name}
                className="w-full h-full object-cover object-center"
                onError={e => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
              />
              {/* Corner ticks */}
              <span className="absolute top-[6px] left-[6px]  w-[9px] h-[9px] border-t-[2px] border-l-[2px] z-10" style={{ borderColor: ACCENT }} />
              <span className="absolute top-[6px] right-[6px] w-[9px] h-[9px] border-t-[2px] border-r-[2px] z-10" style={{ borderColor: ACCENT }} />
              <span className="absolute bottom-[6px] left-[6px]  w-[9px] h-[9px] border-b-[2px] border-l-[2px] z-10" style={{ borderColor: ACCENT }} />
              <span className="absolute bottom-[6px] right-[6px] w-[9px] h-[9px] border-b-[2px] border-r-[2px] z-10" style={{ borderColor: ACCENT }} />
            </div>
          )}
          {!imgSrc && (
            <div className="w-[90px] h-[90px] md:w-[110px] md:h-[110px] shrink-0 rounded-xl border border-zinc-800 hidden md:flex items-center justify-center bg-zinc-900">
              <User className="w-8 h-8" style={{ color: MUTED }} />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Position pill */}
            <div className="font-editorial-mono text-[11px] tracking-[0.2em] uppercase font-semibold mb-2" style={{ color: ACCENT }}>
              {player.position}
              {safeArray(player.secondary_positions).length > 0 && (
                <span style={{ color: MUTED }} className="font-normal">
                  {" "}· {safeArray(player.secondary_positions).slice(0, 2).join(" / ")}
                </span>
              )}
            </div>

            {/* Name */}
            <h1
              className="font-display font-bold leading-[0.95] tracking-[-0.03em] mb-3"
              style={{ fontSize: "clamp(28px, 4vw, 52px)", color: FG }}
            >
              {player.full_name}
            </h1>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-1.5">
              {/* Public/Private */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                {player.is_public
                  ? <><Eye className="w-2.5 h-2.5" />PÚBLICO</>
                  : <><EyeOff className="w-2.5 h-2.5" />PRIVADO</>}
              </span>

              {player.age && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                  {player.age} anos
                </span>
              )}
              {player.height && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                  {player.height} cm
                </span>
              )}
              {player.dominant_foot && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                  {player.dominant_foot}
                </span>
              )}
              {player.current_club && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                  {player.current_club}
                </span>
              )}
              {player.contract_status && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                  {player.contract_status === "contracted" ? "CONTRATADO" : player.contract_status.toUpperCase()}
                </span>
              )}
              {player.auto_rating !== null && player.auto_rating !== undefined && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-800 font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: FG }}>
                  ★ {player.auto_rating.toFixed(1)}/10
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className={`border-b ${DIVIDER} overflow-x-auto scrollbar-hide`}>
        <div className="flex px-4 md:px-6">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="pr-5 py-3 font-editorial-mono text-[11px] tracking-[0.15em] uppercase shrink-0 transition-colors"
                style={{ color: active ? FG : MUTED }}
              >
                <span
                  className="pb-px border-b-2"
                  style={{ borderColor: active ? ACCENT : "transparent" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-8">
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

          /* ── Overview ────────────────────────────────────────────────── */
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">

            {/* ── Left column ─────────────────────────────────────────── */}
            <div className="space-y-8">

              {/* Season KPIs */}
              <section>
                <SectionLabel n="01">TEMPORADA {CURRENT_YEAR}</SectionLabel>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "G+A",    value: statsLoading ? "…" : ga,                               highlight: true  },
                    { label: "GOLS",   value: statsLoading ? "…" : (seasonTotals?.goals   ?? "—"),   highlight: true  },
                    { label: "ASSIST", value: statsLoading ? "…" : (seasonTotals?.assists  ?? "—"),  highlight: false },
                    { label: "JOGOS",  value: statsLoading ? "…" : (seasonTotals?.matches ?? "—"),   highlight: false },
                    { label: "MIN",    value: statsLoading ? "…" : (seasonTotals?.minutes ?? "—"),   highlight: false },
                  ].map((s, i) => (
                    <div
                      key={s.label}
                      className="relative rounded-xl border transition-colors duration-[250ms] hover:bg-zinc-800/50 py-5 px-4"
                      style={s.highlight
                        ? { background: "linear-gradient(165deg, rgba(236,69,37,0.14), rgba(20,19,24,1) 70%)", borderColor: "rgba(236,69,37,0.25)" }
                        : { background: "#141318", borderColor: "rgba(255,255,255,0.07)" }
                      }
                    >
                      <span className="absolute top-3 right-3 font-editorial-mono text-[10px] text-zinc-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div
                        className="font-display font-bold leading-[0.9] tracking-[-0.03em] tabular-nums mb-3"
                        style={{ fontSize: "clamp(24px,3vw,40px)", color: s.highlight ? ACCENT : FG }}
                      >
                        {typeof s.value === "number" ? s.value.toLocaleString("pt-BR") : s.value}
                      </div>
                      <div className="font-editorial-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: MUTED }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Info Grid */}
              <section>
                <SectionLabel n="02">PERFIL DO ATLETA</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  {/* Identity */}
                  <div className={`${CARD} p-5`}>
                    <CardLabel>IDENTIDADE</CardLabel>
                    <dl className="space-y-2">
                      {[
                        { k: "Posição",       v: player.position },
                        { k: "Idade",         v: player.age ? `${player.age} anos` : null },
                        { k: "Altura",        v: player.height ? `${player.height} cm` : null },
                        { k: "Pé dominante",  v: player.dominant_foot },
                        { k: "País",          v: player.nationality },
                        { k: "Clube",         v: player.current_club },
                      ].filter(x => x.v).map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>{k}</dt>
                          <dd className="font-editorial-mono text-[11px]" style={{ color: FG }}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Contract */}
                  <div className={`${CARD} p-5`}>
                    <CardLabel>CONTRATO</CardLabel>
                    <dl className="space-y-2">
                      {[
                        { k: "Status",  v: player.contract_status },
                        { k: "Início",  v: player.contract_start ? format(new Date(player.contract_start), "MMM yyyy", { locale: ptBR }) : null },
                        { k: "Término", v: player.contract_end   ? format(new Date(player.contract_end),   "MMM yyyy", { locale: ptBR }) : null },
                        { k: "Agente",  v: player.agent_name },
                        { k: "Salário", v: player.salary_info },
                      ].filter(x => x.v).map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>{k}</dt>
                          <dd className="font-editorial-mono text-[11px]" style={{ color: FG }}>{v}</dd>
                        </div>
                      ))}
                      {!player.contract_status && !player.contract_start && (
                        <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>Sem informações de contrato.</p>
                      )}
                    </dl>
                  </div>

                  {/* Tactical */}
                  <div className={`${CARD} p-5`}>
                    <CardLabel>PERFIL TÁTICO</CardLabel>
                    <dl className="space-y-2">
                      {[
                        { k: "Função principal",   v: player.primary_tactical_role },
                        { k: "Função secundária",  v: player.secondary_tactical_role },
                        { k: "Preferência",        v: player.playing_height_preference },
                      ].filter(x => x.v).map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>{k}</dt>
                          <dd className="font-editorial-mono text-[11px]" style={{ color: FG }}>{v}</dd>
                        </div>
                      ))}
                      {!player.primary_tactical_role && (
                        <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>Sem perfil tático definido.</p>
                      )}
                    </dl>
                  </div>

                  {/* Play style */}
                  <div className={`${CARD} p-5`}>
                    <CardLabel>ESTILO DE JOGO</CardLabel>
                    {player.play_style ? (
                      <>
                        <p className="font-display font-bold text-[20px] uppercase leading-tight mb-1" style={{ color: ACCENT }}>
                          {player.play_style}
                        </p>
                        <p className="font-editorial-mono text-[11px] leading-relaxed" style={{ color: MUTED }}>
                          {getPlayStyleDesc(player.play_style)}
                        </p>
                      </>
                    ) : (
                      <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>Não definido.</p>
                    )}
                  </div>

                  {/* Strengths */}
                  <div className={`${CARD} p-5`}>
                    <CardLabel>PONTOS FORTES</CardLabel>
                    {safeArray(player.strengths).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {safeArray(player.strengths).map((s, i) => (
                          <span
                            key={i}
                            className="font-editorial-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-lg border"
                            style={{ borderColor: GREEN, color: GREEN }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>Nenhum ponto forte cadastrado.</p>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div className={`${CARD} p-5`}>
                    <CardLabel>ÁREAS DE DESENVOLVIMENTO</CardLabel>
                    {safeArray(player.areas_to_develop).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {safeArray(player.areas_to_develop).map((s, i) => (
                          <span
                            key={i}
                            className="font-editorial-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-lg border"
                            style={{ borderColor: AMBER, color: AMBER }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>Nenhuma área registrada.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Internal Evaluation */}
              <section>
                <SectionLabel n="03">
                  <span className="inline-flex items-center gap-1.5">
                    AVALIAÇÃO INTERNA <Lock className="w-3 h-3 inline" style={{ color: MUTED }} />
                  </span>
                </SectionLabel>
                <div className="grid grid-cols-2 gap-3">

                  <div className={`${CARD} p-5`}>
                    <CardLabel>NOTA GERAL</CardLabel>
                    <p className="font-display font-bold leading-none" style={{ fontSize: 40, color: FG }}>
                      {player.auto_rating !== null && player.auto_rating !== undefined
                        ? Math.round(player.auto_rating)
                        : "—"}
                      <span className="font-editorial-mono text-[13px] ml-1" style={{ color: MUTED }}>/99</span>
                    </p>
                  </div>

                  <div className={`${CARD} p-5`}>
                    <CardLabel>POTENCIAL</CardLabel>
                    <p className="font-display font-bold leading-none" style={{ fontSize: 40, color: GREEN }}>
                      {player.auto_potential !== null && player.auto_potential !== undefined && player.auto_potential > 0
                        ? Math.round(player.auto_potential)
                        : "—"}
                      <span className="font-editorial-mono text-[13px] ml-1" style={{ color: MUTED }}>/99</span>
                    </p>
                  </div>

                  <div className={`${CARD} p-5`}>
                    <CardLabel>PRONTO PARA COMPETIR?</CardLabel>
                    {player.ready_to_compete !== null && player.ready_to_compete !== undefined ? (
                      <p className="font-display font-bold text-[22px] uppercase" style={{ color: player.ready_to_compete ? GREEN : AMBER }}>
                        {player.ready_to_compete ? "SIM" : "NÃO"}
                      </p>
                    ) : (
                      <p className="font-display font-bold text-[24px]" style={{ color: MUTED }}>—</p>
                    )}
                  </div>

                  <div className={`${CARD} p-5`}>
                    <CardLabel>NÍVEL ESTIMADO</CardLabel>
                    {player.estimated_level ? (
                      <span
                        className="font-editorial-mono text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-lg border inline-block"
                        style={{ borderColor: AMBER, color: AMBER }}
                      >
                        {player.estimated_level}
                      </span>
                    ) : (
                      <p className="font-display font-bold text-[24px]" style={{ color: MUTED }}>—</p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Sidebar ─────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* M3 Market Score */}
              <section className={`${CARD} p-5`}>
                <CardLabel>M3 MARKET SCORE</CardLabel>

                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-display font-bold leading-none" style={{ fontSize: 68, color: FG, lineHeight: 1 }}>
                    {marketScoreLoading ? "…" : marketScore !== null ? Math.round(marketScore) : "—"}
                  </span>
                  <span className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>/100</span>
                  {!marketScoreLoading && marketScore !== null && (
                    <span className="font-editorial-mono text-[11px] uppercase tracking-wider font-semibold" style={{ color: tierCfg.color }}>
                      {tierCfg.label}
                    </span>
                  )}
                </div>

                <div className="w-full mb-3 overflow-hidden rounded-full" style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{ height: "100%", width: `${marketScore ?? 0}%`, background: tierCfg.color, transition: "width 0.6s ease" }}
                  />
                </div>

                {!marketScoreLoading && marketScore !== null ? (
                  <>
                    <p className="font-editorial-mono text-[11px] mb-1" style={{ color: MUTED }}>
                      Base: {player.auto_rating !== null ? Math.min(100, Math.round(player.auto_rating)) : "—"} → Ajustado: {Math.min(100, Math.round(marketScore))}
                    </p>
                    <p className="font-editorial-mono text-[11px] mb-3" style={{ color: AMBER }}>
                      {dataConfidence < 75 ? "↓" : "→"} Confiança {Math.round(dataConfidence)}%{(!marketHasData || reports.length < 3) ? " · Amostra reduzida" : ""}
                    </p>
                    <div
                      className="font-editorial-mono text-[11px] leading-relaxed rounded-lg p-3"
                      style={{ background: "rgba(255,255,255,0.04)", borderLeft: `2px solid ${AMBER}`, color: MUTED }}
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
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: ACCENT }} />
                        <span className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>{insight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Attributes Radar */}
              <section className={`${CARD} p-5`}>
                <AtributoRadar playerId={player.id} filterToLatestSeason />
              </section>

              {/* Market Value */}
              <section className={`${CARD} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <CardLabel>VALOR DE MERCADO</CardLabel>
                  {player.market_value_trend && (() => {
                    const t = player.market_value_trend.toLowerCase();
                    const cfg = t === "up"
                      ? { icon: "↗", label: "EM ALTA",  color: GREEN  }
                      : t === "down"
                      ? { icon: "↘", label: "EM BAIXA", color: ACCENT }
                      : { icon: "→", label: "ESTÁVEL",  color: MUTED  };
                    return (
                      <span className="font-editorial-mono text-[10px] uppercase tracking-wide font-semibold" style={{ color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="font-display font-bold text-[22px] mb-3" style={{ color: GREEN }}>
                  {formatMarketValue(player.market_value, player.market_value_currency)}
                </p>
                <MarketValueMiniChart playerId={player.id} currentValue={player.market_value} />
              </section>

              {/* Note Evolution */}
              <section className={`${CARD} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <CardLabel>EVOLUÇÃO DA NOTA</CardLabel>
                  {ratingDelta !== null && (
                    <span className="font-editorial-mono text-[13px] font-bold" style={{ color: ratingDelta >= 0 ? GREEN : ACCENT }}>
                      {ratingDelta >= 0 ? "+" : "−"}{Math.abs(ratingDelta).toFixed(1)}
                    </span>
                  )}
                </div>
                <NoteEvolutionMiniChart playerId={player.id} currentRating={player.auto_rating} />
                {initialRating !== null && player.auto_rating !== null && (
                  <div className="flex items-start justify-between mt-3">
                    <div>
                      <p className="font-editorial-mono text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: MUTED }}>INICIAL</p>
                      <p className="font-display font-bold text-[22px]" style={{ color: MUTED }}>{initialRating.toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-editorial-mono text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: MUTED }}>ATUAL</p>
                      <p className="font-display font-bold text-[22px]" style={{ color: ratingDelta !== null && ratingDelta >= 0 ? GREEN : ACCENT }}>
                        {player.auto_rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Reliability */}
              <section className={`${CARD} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <CardLabel>CONFIABILIDADE</CardLabel>
                  <span className="font-display font-bold text-[22px]" style={{ color: reliabilityColor }}>
                    {reliabilityPct}%
                  </span>
                </div>
                <span
                  className="font-editorial-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-lg border inline-block mb-3"
                  style={{ borderColor: reliabilityColor, color: reliabilityColor }}
                >
                  {reliabilityLabel}
                </span>
                <div className="w-full overflow-hidden rounded-full" style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{ height: "100%", width: `${reliabilityPct}%`, background: reliabilityColor, transition: "width 0.6s ease" }}
                  />
                </div>
                <p className="font-editorial-mono text-[10px] uppercase tracking-wider mt-2" style={{ color: MUTED }}>
                  Baseado em {reports.length} relatório{reports.length !== 1 ? "s" : ""}
                </p>
              </section>

              {/* Recent Reports */}
              <section className={`${CARD} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <CardLabel>RELATÓRIOS RECENTES</CardLabel>
                  {avgScoutNote !== null && (
                    <div className="text-right">
                      <p className="font-display font-bold text-[18px]" style={{ color: avgScoutNote > 70 ? GREEN : avgScoutNote >= 50 ? AMBER : ACCENT }}>
                        {avgScoutNote.toFixed(1)}
                      </p>
                      <p className="font-editorial-mono text-[9px] tracking-wider uppercase" style={{ color: MUTED }}>
                        Média (últimos 5)
                      </p>
                    </div>
                  )}
                </div>
                {reports.length === 0 ? (
                  <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>Nenhum relatório encontrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {reports.slice(0, RECENT_REPORTS_LIMIT).map((r) => {
                      const score = r.final_score ?? 0;
                      const scoreColor = score > 70 ? GREEN : score >= 50 ? AMBER : FG;
                      return (
                        <li
                          key={r.id}
                          className={`flex items-center justify-between pb-2 border-b border-zinc-800/60 last:border-0 last:pb-0`}
                        >
                          <div>
                            <p className="font-display font-semibold text-[13px] uppercase tracking-wide" style={{ color: FG }}>
                              {r.competition?.name ?? "—"}
                            </p>
                            <p className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                              {format(new Date(r.match_date), "dd MMM yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Link to={`/dashboard/relatorios/${r.id}`}>
                            <span className="font-display font-bold text-[15px]" style={{ color: scoreColor }}>
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
