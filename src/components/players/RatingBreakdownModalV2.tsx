import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  Trophy,
  Target,
  Shield,
  AlertTriangle,
  Clock,
  Star,
  Calculator,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Percent,
  Activity,
  HelpCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import {
  RatingBreakdownV2,
  CompetitionBreakdown,
  getReliabilityLabelV2,
  getReliabilityVariantV2,
} from "@/lib/playerRatingV2";
import type { ExtendedRatingBreakdownV2, ExtendedCompetitionBreakdown } from "@/lib/autoRatingDetailsAdapter";
import { formatFixed } from "@/lib/formatters";
import { StatsRadarChart } from "./StatsRadarChart";
import { SofaScoreRadarCard } from "./SofaScoreRadarCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RatingBreakdownModalV2Props {
  details: RatingBreakdownV2 | ExtendedRatingBreakdownV2 | null;
  rating: number;
  trigger?: React.ReactNode;
  playerId: string; // REQUIRED - must always be passed
  isAdmin?: boolean;
  onRecalculated?: () => void;
}

// Helper to check if details have computation flags
function hasComputationFlags(details: RatingBreakdownV2 | ExtendedRatingBreakdownV2): details is ExtendedRatingBreakdownV2 {
  return 'has_data' in details && 'computed' in details;
}

// Helper to check if competition has computation flags
function competitionHasFlags(comp: CompetitionBreakdown | ExtendedCompetitionBreakdown): comp is ExtendedCompetitionBreakdown {
  return 'has_data' in comp && 'computed' in comp;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-amber-500";
  return "bg-destructive";
}

function getScoreLevel(score: number): { label: string; description: string } {
  if (score >= 80) return { label: "Alto", description: "Desempenho excelente nesta métrica" };
  if (score >= 60) return { label: "Bom", description: "Desempenho acima da média" };
  if (score >= 40) return { label: "Médio", description: "Desempenho dentro da média" };
  return { label: "Baixo", description: "Área de melhoria identificada" };
}

// Detailed stat info with group, description, and specific low-score feedback
interface StatInfo {
  group: string;
  groupIcon: string;
  description: string;
  lowFeedback: string;
  highFeedback: string;
}

const STAT_INFO: Record<string, StatInfo> = {
  // Regularidade
  minutes_games: {
    group: "Regularidade",
    groupIcon: "⏱️",
    description: "Tempo de jogo e consistência. Jogadores com mais minutos demonstram confiança do treinador.",
    lowFeedback: "Poucos minutos jogados — falta de ritmo de jogo ou pouca confiança do técnico.",
    highFeedback: "Jogador titular absoluto com alta regularidade.",
  },
  
  // Finalização (Atacantes)
  goals_per_90: {
    group: "Finalização",
    groupIcon: "⚽",
    description: "Eficiência goleadora. Média de gols marcados a cada 90 minutos jogados.",
    lowFeedback: "Baixa média de gols — dificuldade em converter chances ou pouca presença na área.",
    highFeedback: "Finalizador letal com alta taxa de conversão.",
  },
  shots: {
    group: "Finalização",
    groupIcon: "⚽",
    description: "Volume de finalizações por 90 minutos. Indica presença ofensiva e busca pelo gol.",
    lowFeedback: "Poucas finalizações — baixa participação em jogadas de conclusão.",
    highFeedback: "Alta presença ofensiva com muitas tentativas de gol.",
  },
  shots_90: {
    group: "Finalização",
    groupIcon: "⚽",
    description: "Volume de finalizações por 90 minutos. Indica presença ofensiva e busca pelo gol.",
    lowFeedback: "Poucas finalizações — baixa participação em jogadas de conclusão.",
    highFeedback: "Alta presença ofensiva com muitas tentativas de gol.",
  },
  shots_on_target: {
    group: "Finalização",
    groupIcon: "🎯",
    description: "Finalizações certas no gol. Mede precisão nas conclusões.",
    lowFeedback: "Baixa precisão nas finalizações — chutes fora do alvo ou bloqueados.",
    highFeedback: "Excelente precisão de finalização.",
  },
  shots_on_target_90: {
    group: "Finalização",
    groupIcon: "🎯",
    description: "Finalizações certas no gol por 90 minutos. Mede precisão nas conclusões.",
    lowFeedback: "Baixa precisão nas finalizações — chutes fora do alvo ou bloqueados.",
    highFeedback: "Excelente precisão de finalização.",
  },
  
  // Participação Ofensiva
  ga_per_90: {
    group: "Participação Ofensiva",
    groupIcon: "📈",
    description: "Gols + Assistências por 90 minutos. Mede impacto direto no placar.",
    lowFeedback: "Baixa participação em gols — poucas assistências e finalizações convertidas.",
    highFeedback: "Alto impacto ofensivo com participação constante em gols.",
  },
  offensive_involvement: {
    group: "Participação Ofensiva",
    groupIcon: "📈",
    description: "Envolvimento geral em jogadas ofensivas (gols, passes decisivos, finalizações).",
    lowFeedback: "Baixo envolvimento ofensivo — pouca participação nas jogadas de ataque.",
    highFeedback: "Protagonista das ações ofensivas da equipe.",
  },
  
  // Passe & Construção
  accurate_passes: {
    group: "Passe & Construção",
    groupIcon: "🎯",
    description: "Volume de passes certos. Indica qualidade na posse e circulação de bola.",
    lowFeedback: "Poucos passes certos — dificuldade na construção ou pouco envolvimento no jogo.",
    highFeedback: "Peça fundamental na construção e circulação de bola.",
  },
  accurate_passes_90: {
    group: "Passe & Construção",
    groupIcon: "🎯",
    description: "Volume de passes certos por 90 minutos. Indica qualidade na posse e circulação de bola.",
    lowFeedback: "Poucos passes certos — dificuldade na construção ou pouco envolvimento no jogo.",
    highFeedback: "Peça fundamental na construção e circulação de bola.",
  },
  pass_accuracy: {
    group: "Passe & Construção",
    groupIcon: "🎯",
    description: "Percentual de acerto nos passes. Indica qualidade técnica e tomada de decisão.",
    lowFeedback: "Baixa precisão de passes — muitos erros de passe prejudicando a construção.",
    highFeedback: "Alta precisão técnica nos passes.",
  },
  key_passes: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Passes decisivos que geraram chances de gol. Mede capacidade de criar para os companheiros.",
    lowFeedback: "Poucos passes decisivos — dificuldade em criar oportunidades de gol.",
    highFeedback: "Criador consistente de chances de gol.",
  },
  key_passes_90: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Passes decisivos por 90 minutos. Mede capacidade de criar para os companheiros.",
    lowFeedback: "Poucos passes decisivos — dificuldade em criar oportunidades de gol.",
    highFeedback: "Criador consistente de chances de gol.",
  },
  key_pass_accuracy: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Precisão nos passes decisivos. Qualidade nas bolas que geram chances.",
    lowFeedback: "Baixa precisão em passes decisivos — passes mal calibrados em momentos chave.",
    highFeedback: "Alta qualidade nos passes que decidem jogadas.",
  },
  chances_created: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Oportunidades de gol criadas para companheiros. Mede visão de jogo e criatividade.",
    lowFeedback: "Poucas chances criadas — falta de criatividade ou visão de jogo limitada.",
    highFeedback: "Motor criativo da equipe com ótima visão de jogo.",
  },
  chances_created_90: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Oportunidades de gol criadas por 90 minutos. Mede visão de jogo e criatividade.",
    lowFeedback: "Poucas chances criadas — falta de criatividade ou visão de jogo limitada.",
    highFeedback: "Motor criativo da equipe com ótima visão de jogo.",
  },
  
  // Defesa & Duelos
  tackles: {
    group: "Defesa & Duelos",
    groupIcon: "🛡️",
    description: "Desarmes bem-sucedidos por 90 minutos. Indica capacidade de recuperar a bola.",
    lowFeedback: "Poucos desarmes — dificuldade em recuperar a bola ou posicionamento defensivo ruim.",
    highFeedback: "Excelente na marcação e recuperação de bola.",
  },
  tackles_90: {
    group: "Defesa & Duelos",
    groupIcon: "🛡️",
    description: "Desarmes por 90 minutos. Indica capacidade de recuperar a bola.",
    lowFeedback: "Poucos desarmes — dificuldade em recuperar a bola ou posicionamento defensivo ruim.",
    highFeedback: "Excelente na marcação e recuperação de bola.",
  },
  interceptions: {
    group: "Defesa & Duelos",
    groupIcon: "🛡️",
    description: "Interceptações por 90 minutos. Mede leitura de jogo e antecipação.",
    lowFeedback: "Poucas interceptações — falta de leitura de jogo ou posicionamento inadequado.",
    highFeedback: "Ótima leitura de jogo e antecipação defensiva.",
  },
  interceptions_90: {
    group: "Defesa & Duelos",
    groupIcon: "🛡️",
    description: "Interceptações por 90 minutos. Mede leitura de jogo e antecipação.",
    lowFeedback: "Poucas interceptações — falta de leitura de jogo ou posicionamento inadequado.",
    highFeedback: "Ótima leitura de jogo e antecipação defensiva.",
  },
  recoveries: {
    group: "Intensidade Defensiva",
    groupIcon: "🔄",
    description: "Recuperações de bola. Indica pressão, intensidade e esforço defensivo.",
    lowFeedback: "Poucas recuperações — baixa intensidade ou pouca pressão na marcação.",
    highFeedback: "Alta intensidade e esforço na recuperação de bola.",
  },
  recoveries_90: {
    group: "Intensidade Defensiva",
    groupIcon: "🔄",
    description: "Recuperações de bola por 90 minutos. Indica pressão, intensidade e esforço defensivo.",
    lowFeedback: "Poucas recuperações — baixa intensidade ou pouca pressão na marcação.",
    highFeedback: "Alta intensidade e esforço na recuperação de bola.",
  },
  duels_won: {
    group: "Defesa & Duelos",
    groupIcon: "💪",
    description: "Duelos vencidos (aéreos e no chão). Mede força física e determinação.",
    lowFeedback: "Baixa taxa de duelos vencidos — dificuldade em disputas físicas.",
    highFeedback: "Dominante nos duelos individuais.",
  },
  duels_won_pct: {
    group: "Defesa & Duelos",
    groupIcon: "💪",
    description: "Percentual de duelos vencidos. Mede força física e determinação.",
    lowFeedback: "Baixa taxa de duelos vencidos — dificuldade em disputas físicas.",
    highFeedback: "Dominante nos duelos individuais.",
  },
  aerial_duels: {
    group: "Jogo Aéreo",
    groupIcon: "🦅",
    description: "Duelos aéreos vencidos. Importante para defesa e ataque em bolas altas.",
    lowFeedback: "Dificuldade no jogo aéreo — perde muitas disputas de cabeça.",
    highFeedback: "Dominante no jogo aéreo.",
  },
  aerial_duels_90: {
    group: "Jogo Aéreo",
    groupIcon: "🦅",
    description: "Duelos aéreos vencidos por 90 minutos. Importante para defesa e ataque em bolas altas.",
    lowFeedback: "Dificuldade no jogo aéreo — perde muitas disputas de cabeça.",
    highFeedback: "Dominante no jogo aéreo.",
  },
  
  // Disciplina
  discipline: {
    group: "Disciplina",
    groupIcon: "📋",
    description: "Cartões por 90 min (vermelho = 3x amarelo). Menor valor = melhor.",
    lowFeedback: "Muitos cartões — jogo imprudente ou dificuldade em controlar temperamento.",
    highFeedback: "Jogo limpo e controlado emocionalmente.",
  },
  
  // Goleiro - Defesas
  saves: {
    group: "Defesas (GK)",
    groupIcon: "🧤",
    description: "Total de defesas realizadas. Mede capacidade de evitar gols.",
    lowFeedback: "Poucas defesas — pode indicar pouca exigência ou dificuldade nas finalizações.",
    highFeedback: "Goleiro decisivo com alto volume de defesas.",
  },
  saves_per_90: {
    group: "Defesas (GK)",
    groupIcon: "🧤",
    description: "Defesas por 90 minutos. Mede capacidade de evitar gols.",
    lowFeedback: "Poucas defesas — pode indicar pouca exigência ou dificuldade nas finalizações.",
    highFeedback: "Goleiro decisivo com alto volume de defesas.",
  },
  saves_90: {
    group: "Defesas (GK)",
    groupIcon: "🧤",
    description: "Defesas por 90 minutos. Mede capacidade de evitar gols.",
    lowFeedback: "Poucas defesas — pode indicar pouca exigência ou dificuldade nas finalizações.",
    highFeedback: "Goleiro decisivo com alto volume de defesas.",
  },
  goals_conceded: {
    group: "Solidez Defensiva (GK)",
    groupIcon: "🚫",
    description: "Gols sofridos. Menor valor = melhor. Indica segurança do goleiro.",
    lowFeedback: "Muitos gols sofridos — vazamentos frequentes comprometendo o resultado.",
    highFeedback: "Goleiro seguro com poucos gols sofridos.",
  },
  goals_conceded_inv: {
    group: "Solidez Defensiva (GK)",
    groupIcon: "🚫",
    description: "Gols sofridos (invertido). Maior score = menos gols = melhor.",
    lowFeedback: "Muitos gols sofridos — vazamentos frequentes comprometendo o resultado.",
    highFeedback: "Goleiro seguro com poucos gols sofridos.",
  },
  errors: {
    group: "Erros Graves (GK)",
    groupIcon: "⚠️",
    description: "Erros que resultaram em gol. Menor valor = melhor.",
    lowFeedback: "Erros decisivos — falhas que resultaram em gols adversários.",
    highFeedback: "Goleiro confiável sem erros graves.",
  },
  errors_inv: {
    group: "Erros Graves (GK)",
    groupIcon: "⚠️",
    description: "Erros (invertido). Maior score = menos erros = melhor.",
    lowFeedback: "Erros decisivos — falhas que resultaram em gols adversários.",
    highFeedback: "Goleiro confiável sem erros graves.",
  },
  penalties_saved: {
    group: "Pênaltis (GK)",
    groupIcon: "🎯",
    description: "Pênaltis defendidos. Habilidade específica em cobranças.",
    lowFeedback: "Poucos pênaltis defendidos — pode melhorar na leitura de cobranças.",
    highFeedback: "Especialista em defesas de pênalti.",
  },
};

// Fallback for stats not in STAT_INFO
const safeLower = (v: unknown): string => {
  if (typeof v === "string" && v.trim() && v !== "—" && v !== "---") return v.toLowerCase();
  if (typeof v === "number" || typeof v === "boolean") return String(v).toLowerCase();
  return "";
};

// Human-readable stat name mapping for all stats (includes DB field names and per-90 variants)
const STAT_NAME_MAP: Record<string, string> = {
  // Core stats
  minutes_games: "Minutos/Jogos",
  matches: "Jogos",
  minutes: "Minutos",
  
  // Goal involvement - raw and per-90 (canonical keys from DB)
  goal_contributions: "Participações em Gol",  // Canonical key for G+A
  cards: "Cartões",  // Canonical key for discipline
  gk_saves: "Defesas",  // Canonical GK key
  gk_goals_conceded: "Gols Sofridos",  // Canonical GK key
  gk_penalties_saved: "Pênaltis Defendidos",  // Canonical GK key
  gk_errors_led_to_goal: "Erros que Resultam em Gol",  // Canonical GK key
  goals: "Gols",
  goals_per_90: "Gols/90",
  assists: "Assistências",
  assists_per_90: "Assistências/90",
  ga_per_90: "G+A/90",
  
  // Finishing
  shots: "Finalizações",
  shots_90: "Finalizações/90",
  shots_on_target: "Finalizações no Alvo",
  shots_on_target_90: "Finalizações no Alvo/90",
  shots_blocked: "Chutes Bloqueados",
  
  // Creativity
  chances_created: "Chances Criadas",
  chances_created_90: "Chances Criadas/90",
  key_passes: "Passes Decisivos",
  key_passes_90: "Passes Decisivos/90",
  key_pass_accuracy: "Precisão Passes Decisivos",
  offensive_involvement: "Envolvimento Ofensivo",
  
  // Passing
  accurate_passes: "Passes Certos",
  accurate_passes_90: "Passes Certos/90",
  total_passes: "Total de Passes",
  pass_accuracy: "Precisão de Passes",
  long_passes_accurate: "Lançamentos Certos",
  long_passes_total: "Total de Lançamentos",
  
  // Defensive
  tackles: "Desarmes",
  tackles_90: "Desarmes/90",
  interceptions: "Interceptações",
  interceptions_90: "Interceptações/90",
  recoveries: "Recuperações",
  recoveries_90: "Recuperações/90",
  reco: "Recuperações/90", // Alias used in some DB outputs
  clearances: "Afastamentos",
  
  // Duels
  duels_won: "Duelos Vencidos",
  duels_won_pct: "Duelos Vencidos (%)",
  total_duels: "Total de Duelos",
  ground_duels_won: "Duelos no Chão Vencidos",
  ground_duels_total: "Total de Duelos no Chão",
  aerial_duels: "Duelos Aéreos",
  aerial_duels_90: "Duelos Aéreos/90",
  aerial_duels_won: "Duelos Aéreos Vencidos",
  aerial_duels_total: "Total de Duelos Aéreos",
  
  // Dribbling
  successful_dribbles: "Dribles Bem-sucedidos",
  total_dribbles: "Total de Dribles",
  times_dribbled_past: "Vezes Driblado",
  
  // Discipline
  discipline: "Disciplina",
  yellow_cards: "Cartões Amarelos",
  red_cards: "Cartões Vermelhos",
  fouls_committed: "Faltas Cometidas",
  fouls_drawn: "Faltas Sofridas",
  cards_90: "Cartões/90",
  
  // Possession
  possession_lost: "Posses Perdidas",
  offsides: "Impedimentos",
  
  // Goalkeeper - raw and per-90
  saves: "Defesas",
  saves_90: "Defesas/90",
  saves_per_90: "Defesas/90",
  saves_inside_box: "Defesas na Área",
  goals_conceded: "Gols Sofridos",
  goals_conceded_90: "Gols Sofridos/90",
  goals_conceded_inv: "Gols Sofridos (inv)",
  clean_sheets: "Clean Sheets",
  penalties_saved: "Pênaltis Defendidos",
  errors: "Erros Graves",
  errors_inv: "Erros (inv)",
  errors_leading_to_goal: "Erros que Resultam em Gol",
  punches: "Socos",
  high_claims: "Cruzamentos Dominados",
  successful_runs_out: "Saídas do Gol",
  total_runs_out: "Total de Saídas do Gol",
};

// Helper to safely get numeric value with fallback
function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

// ==================== POSITION-BASED STAT CLASSIFICATION ====================
// Explicitly defines which stats are POSITIVE (high score = good) and which are
// NEGATIVE (high score = concerning, or inverse stats where LOW = bad)

type StatClassification = "positive" | "negative" | "neutral";

interface PositionStatClassification {
  positiveStats: string[];  // Stats where HIGH score = strong point
  negativeStats: string[];  // Stats that indicate issues or inverse metrics
}

const POSITION_STAT_CLASSIFICATIONS: Record<string, PositionStatClassification> = {
  goalkeeper: {
    positiveStats: ["saves", "saves_per_90", "saves_90", "gk_saves", "clean_sheets", "penalties_saved", "gk_penalties_saved", "aerial_duels", "aerial_duels_90", "accurate_passes", "accurate_passes_90", "minutes_games", "minutes"],
    negativeStats: ["goals_conceded", "goals_conceded_inv", "gk_goals_conceded", "errors", "errors_inv", "gk_errors_led_to_goal", "discipline", "cards"],
  },
  center_back: {
    positiveStats: ["tackles", "tackles_90", "interceptions", "interceptions_90", "duels_won", "duels_won_pct", "aerial_duels", "aerial_duels_90", "recoveries", "recoveries_90", "accurate_passes", "accurate_passes_90", "minutes_games", "minutes", "goal_contributions", "ga_per_90"],
    negativeStats: ["errors", "errors_inv", "discipline", "cards", "goals_conceded", "goals_conceded_inv"],
  },
  defensive_mid: {
    positiveStats: ["tackles", "tackles_90", "interceptions", "interceptions_90", "recoveries", "recoveries_90", "accurate_passes", "accurate_passes_90", "pass_accuracy", "duels_won", "duels_won_pct", "minutes_games", "minutes", "goal_contributions", "ga_per_90"],
    negativeStats: ["discipline", "cards", "errors", "errors_inv"],
  },
  midfielder: {
    positiveStats: ["key_passes", "key_passes_90", "chances_created", "chances_created_90", "assists", "ga_per_90", "goal_contributions", "accurate_passes", "accurate_passes_90", "pass_accuracy", "key_pass_accuracy", "shots", "shots_90", "minutes_games", "minutes"],
    negativeStats: ["discipline", "cards", "possession_lost"],
  },
  forward: {
    positiveStats: ["goals", "goals_per_90", "assists", "ga_per_90", "goal_contributions", "shots", "shots_90", "shots_on_target", "shots_on_target_90", "offensive_involvement", "chances_created", "chances_created_90", "minutes_games", "minutes"],
    negativeStats: ["discipline", "cards"],
  },
};

function getStatClassificationForPosition(
  statKey: string,
  positionGroup: string
): StatClassification {
  const classification = POSITION_STAT_CLASSIFICATIONS[positionGroup] || POSITION_STAT_CLASSIFICATIONS.midfielder;
  
  if (classification.positiveStats.includes(statKey)) return "positive";
  if (classification.negativeStats.includes(statKey)) return "negative";
  return "neutral";
}

function getPositionStatsBreakdown(
  stats: Array<{ stat: string; label: string; score: number; available: boolean }>,
  positionGroup: string
): { positiveStats: typeof stats; negativeStats: typeof stats; neutralStats: typeof stats } {
  const classification = POSITION_STAT_CLASSIFICATIONS[positionGroup] || POSITION_STAT_CLASSIFICATIONS.midfielder;
  const availableStats = stats.filter(s => s.available);
  
  const positiveStats = availableStats.filter(s => 
    classification.positiveStats.includes(s.stat) && s.score >= 60
  ).sort((a, b) => b.score - a.score);
  
  const negativeStats = availableStats.filter(s => 
    (classification.negativeStats.includes(s.stat) && s.score < 60) ||
    (classification.positiveStats.includes(s.stat) && s.score < 40)
  ).sort((a, b) => a.score - b.score);
  
  const neutralStats = availableStats.filter(s => 
    !positiveStats.some(p => p.stat === s.stat) && 
    !negativeStats.some(n => n.stat === s.stat)
  );
  
  return { positiveStats, negativeStats, neutralStats };
}

function getHumanStatName(statKey: string, providedLabel: unknown): string {
  // Normalize the key
  const normalizedKey = (statKey || "").trim().toLowerCase();
  
  // 1. Try our manual mapping first (most reliable)
  if (normalizedKey && STAT_NAME_MAP[normalizedKey]) {
    return STAT_NAME_MAP[normalizedKey];
  }
  // Also try original case
  if (statKey && STAT_NAME_MAP[statKey]) {
    return STAT_NAME_MAP[statKey];
  }
  
  // 2. If providedLabel is a valid non-placeholder string, use it
  if (typeof providedLabel === "string" && providedLabel.trim() && 
      providedLabel !== "—" && providedLabel !== "---" && 
      providedLabel !== "unknown" && providedLabel !== "Desconhecido" &&
      providedLabel !== "Estatística não identificada" &&
      providedLabel !== "") {
    return providedLabel;
  }
  
  // 3. Convert snake_case to Title Case (always do this if we have a key)
  if (statKey && statKey !== "unknown" && statKey.length > 0) {
    const titleCase = statKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    // DEV: Log unknown stat keys so we can add them to the mapping
    if (import.meta.env.DEV) {
      console.warn(`[getHumanStatName] Unknown stat key: "${statKey}" -> displaying as "${titleCase}". Consider adding to STAT_NAME_MAP.`);
    }
    return titleCase;
  }
  
  // 4. Ultimate fallback - never show "não identificada".
  // If we have any key at all, show the raw key.
  if (import.meta.env.DEV) {
    console.error("[getHumanStatName] Called with empty/unknown stat key:", statKey, "label:", providedLabel);
  }
  return statKey && statKey !== "unknown" ? statKey : "unknown";
}

function getStatInfo(statKey: string, label: unknown): StatInfo {
  const humanLabel = getHumanStatName(statKey, label);
  const labelLower = safeLower(humanLabel) || "esta estatística";

  if (import.meta.env.DEV && typeof label !== "string") {
    console.debug("[RatingBreakdownModalV2] getStatInfo label not string:", label, "statKey:", statKey);
  }

  // If we have it in STAT_INFO, return it directly
  if (STAT_INFO[statKey]) {
    return STAT_INFO[statKey];
  }

  // Build a dynamic fallback with meaningful copy
  return {
    group: "Desempenho Geral",
    groupIcon: "📊",
    description: `Mede o desempenho em ${humanLabel}.`,
    lowFeedback: `Desempenho abaixo do esperado em ${humanLabel}.`,
    highFeedback: `Excelente desempenho em ${humanLabel}.`,
  };
}

function StatScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded-md">
      <span className="font-medium">Legenda:</span>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span>Alto (80+)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span>Bom (60-79)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span>Médio (40-59)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <span>Baixo (&lt;40)</span>
      </div>
    </div>
  );
}

function StatBreakdownCard({ 
  competition, 
  isExpanded, 
  onToggle,
  positionGroup,
  playerId,
}: { 
  competition: CompetitionBreakdown | ExtendedCompetitionBreakdown; 
  isExpanded: boolean;
  onToggle: () => void;
  positionGroup: string;
  playerId: string; // REQUIRED - must always be passed
}) {
  const compId = String((competition as any)?.competition_id ?? "");
  const seasonYear = Number((competition as any)?.season_year);

  // Check if this competition was actually computed
  const isComputed = competitionHasFlags(competition)
    ? competition.computed
    : safeNumber((competition as any).minutes) > 0;

  // Fetch the exact saved stats source when a competition is expanded.
  // This is the SAME table the edit form writes into: public.player_stats.
  const [statsRow, setStatsRow] = useState<any | null | undefined>(undefined);
  const [statsReason, setStatsReason] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch when expanded
    if (!isExpanded) return;

    // Mandatory logs for debugging
    console.log("[BREAKDOWN] query params:", { playerId, competitionId: compId, seasonYear });

    if (!playerId) {
      setStatsRow(null);
      setStatsReason("missing_playerId");
      console.warn("[BREAKDOWN] reason missing_playerId");
      return;
    }

    if (!compId || !Number.isFinite(seasonYear)) {
      setStatsRow(null);
      setStatsReason("comp_year_not_found");
      console.warn("[BREAKDOWN] reason comp_year_not_found", { compId, seasonYear });
      return;
    }

    // Fetch only once per expansion (avoid spamming)
    if (statsRow !== undefined) return;

    (async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .eq("competition_id", compId)
        .eq("season_year", seasonYear)
        .maybeSingle();

      // Mandatory log for statsRow
      console.log("[BREAKDOWN] statsRow:", data);

      if (error) {
        setStatsRow(null);
        setStatsReason("missing_stats_source");
        console.error("[BREAKDOWN] missing_stats_source", error);
        return;
      }

      if (!data) {
        setStatsRow(null);
        setStatsReason("missing_stats_source");
        console.warn("[BREAKDOWN] missing_stats_source: no row returned", {
          playerId,
          competitionId: compId,
          year: seasonYear,
          hint:
            "mismatch competitionId OR mismatch year type OR wrong filter field OR query not executed",
        });
        return;
      }

      // Raw stats payload (mandatory)
      console.log("[BREAKDOWN] raw stats for comp/year", data);
      setStatsRow(data);
      setStatsReason(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, playerId, compId, seasonYear, positionGroup]);

  // Full mapping of player_stats columns to breakdown rows
  const minutes = Number(statsRow?.minutes ?? 0);
  const per90Factor = minutes > 0 ? 90 / minutes : 0;

  // Per90 caps for normalization (based on elite player benchmarks)
  const PER90_CAPS: Record<string, { cap: number; inverse?: boolean; per90?: boolean }> = {
    // Attack
    goals: { cap: 0.9, per90: true },
    assists: { cap: 0.6, per90: true },
    shots: { cap: 4.5, per90: true },
    shots_on_target: { cap: 2.0, per90: true },
    // Creativity
    key_passes: { cap: 3.0, per90: true },
    chances_created: { cap: 2.5, per90: true },
    successful_dribbles: { cap: 4.0, per90: true },
    // Defense
    tackles: { cap: 4.0, per90: true },
    interceptions: { cap: 3.0, per90: true },
    recoveries: { cap: 12.0, per90: true },
    clearances: { cap: 6.0, per90: true },
    duels_won: { cap: 8.0, per90: true },
    aerial_duels_won: { cap: 3.0, per90: true },
    // Discipline (inverse - lower is better)
    yellow_cards: { cap: 0.35, per90: true, inverse: true },
    red_cards: { cap: 0.08, per90: true, inverse: true },
    fouls_committed: { cap: 3.0, per90: true, inverse: true },
    possession_lost: { cap: 20.0, per90: true, inverse: true },
    // Positive
    fouls_drawn: { cap: 3.0, per90: true },
    // GK
    saves: { cap: 5.0, per90: true },
    goals_conceded: { cap: 2.0, per90: true, inverse: true },
    clean_sheets: { cap: 40, per90: false }, // total count
    penalties_saved: { cap: 5, per90: false }, // total count
    errors_leading_to_goal: { cap: 5, per90: false, inverse: true },
    // General
    matches: { cap: 50, per90: false },
    minutes: { cap: 4000, per90: false },
    accurate_passes: { cap: 50, per90: true },
    total_passes: { cap: 70, per90: true },
  };

  const scoreFromStatValue = (statKey: string, rawValue: number): { score: number; value_per90: number | null } => {
    const meta = PER90_CAPS[statKey];
    if (!meta) {
      // Fallback: use raw value with simple normalization
      const score = Math.min(100, Math.max(0, rawValue));
      return { score, value_per90: null };
    }
    
    let valueToScore = rawValue;
    let value_per90: number | null = null;
    
    if (meta.per90 && minutes > 0) {
      value_per90 = rawValue * per90Factor;
      valueToScore = value_per90;
    }
    
    const normalized = meta.cap > 0 ? (valueToScore / meta.cap) * 100 : 0;
    const finalScore = meta.inverse ? 100 - normalized : normalized;
    
    return {
      score: Math.min(100, Math.max(0, finalScore)),
      value_per90,
    };
  };

  // Determine if GK position
  const isGoalkeeper = positionGroup === "goalkeeper" || positionGroup === "GK";

  // Build breakdown rows from statsRow
  const breakdownRowsFromStatsRow: {
    stat: string;
    label: string;
    category: string;
    value_raw: number;
    value_per90: number | null;
    score: number;
    weight: number;
    adjusted_weight: number;
    available: boolean;
    inverse: boolean;
  }[] = statsRow
    ? (() => {
        const rows: {
          stat: string;
          label: string;
          category: string;
          value_raw: number;
          value_per90: number | null;
          score: number;
          weight: number;
          adjusted_weight: number;
          available: boolean;
          inverse: boolean;
        }[] = [];

        // ATTACK
        rows.push({ stat: "goals", label: "Gols", category: "Ataque", value_raw: statsRow.goals ?? 0, ...scoreFromStatValue("goals", statsRow.goals ?? 0), weight: 10, adjusted_weight: 10, available: true, inverse: false });
        rows.push({ stat: "assists", label: "Assistências", category: "Ataque", value_raw: statsRow.assists ?? 0, ...scoreFromStatValue("assists", statsRow.assists ?? 0), weight: 8, adjusted_weight: 8, available: true, inverse: false });
        rows.push({ stat: "shots", label: "Chutes", category: "Ataque", value_raw: statsRow.shots ?? 0, ...scoreFromStatValue("shots", statsRow.shots ?? 0), weight: 6, adjusted_weight: 6, available: true, inverse: false });
        rows.push({ stat: "shots_on_target", label: "Chutes no Gol", category: "Ataque", value_raw: statsRow.shots_on_target ?? 0, ...scoreFromStatValue("shots_on_target", statsRow.shots_on_target ?? 0), weight: 6, adjusted_weight: 6, available: true, inverse: false });

        // CREATIVITY
        rows.push({ stat: "key_passes", label: "Passes Decisivos", category: "Criatividade", value_raw: statsRow.key_passes ?? 0, ...scoreFromStatValue("key_passes", statsRow.key_passes ?? 0), weight: 8, adjusted_weight: 8, available: true, inverse: false });
        rows.push({ stat: "chances_created", label: "Chances Criadas", category: "Criatividade", value_raw: statsRow.chances_created ?? 0, ...scoreFromStatValue("chances_created", statsRow.chances_created ?? 0), weight: 7, adjusted_weight: 7, available: true, inverse: false });
        rows.push({ stat: "successful_dribbles", label: "Dribles Certos", category: "Criatividade", value_raw: statsRow.successful_dribbles ?? 0, ...scoreFromStatValue("successful_dribbles", statsRow.successful_dribbles ?? 0), weight: 5, adjusted_weight: 5, available: true, inverse: false });

        // DEFENSE
        rows.push({ stat: "tackles", label: "Desarmes", category: "Defesa", value_raw: statsRow.tackles ?? 0, ...scoreFromStatValue("tackles", statsRow.tackles ?? 0), weight: 7, adjusted_weight: 7, available: true, inverse: false });
        rows.push({ stat: "interceptions", label: "Interceptações", category: "Defesa", value_raw: statsRow.interceptions ?? 0, ...scoreFromStatValue("interceptions", statsRow.interceptions ?? 0), weight: 6, adjusted_weight: 6, available: true, inverse: false });
        rows.push({ stat: "recoveries", label: "Recuperações", category: "Defesa", value_raw: statsRow.recoveries ?? 0, ...scoreFromStatValue("recoveries", statsRow.recoveries ?? 0), weight: 6, adjusted_weight: 6, available: true, inverse: false });
        rows.push({ stat: "duels_won", label: "Duelos Ganhos", category: "Defesa", value_raw: statsRow.duels_won ?? 0, ...scoreFromStatValue("duels_won", statsRow.duels_won ?? 0), weight: 5, adjusted_weight: 5, available: true, inverse: false });
        rows.push({ stat: "clearances", label: "Cortes", category: "Defesa", value_raw: statsRow.clearances ?? 0, ...scoreFromStatValue("clearances", statsRow.clearances ?? 0), weight: 4, adjusted_weight: 4, available: true, inverse: false });
        rows.push({ stat: "aerial_duels_won", label: "Duelos Aéreos", category: "Defesa", value_raw: statsRow.aerial_duels_won ?? 0, ...scoreFromStatValue("aerial_duels_won", statsRow.aerial_duels_won ?? 0), weight: 4, adjusted_weight: 4, available: true, inverse: false });

        // DISCIPLINE (inverse stats)
        rows.push({ stat: "yellow_cards", label: "Amarelos", category: "Disciplina", value_raw: statsRow.yellow_cards ?? 0, ...scoreFromStatValue("yellow_cards", statsRow.yellow_cards ?? 0), weight: 4, adjusted_weight: 4, available: true, inverse: true });
        rows.push({ stat: "red_cards", label: "Vermelhos", category: "Disciplina", value_raw: statsRow.red_cards ?? 0, ...scoreFromStatValue("red_cards", statsRow.red_cards ?? 0), weight: 5, adjusted_weight: 5, available: true, inverse: true });
        rows.push({ stat: "fouls_committed", label: "Faltas Cometidas", category: "Disciplina", value_raw: statsRow.fouls_committed ?? 0, ...scoreFromStatValue("fouls_committed", statsRow.fouls_committed ?? 0), weight: 3, adjusted_weight: 3, available: true, inverse: true });
        rows.push({ stat: "fouls_drawn", label: "Faltas Sofridas", category: "Tática", value_raw: statsRow.fouls_drawn ?? 0, ...scoreFromStatValue("fouls_drawn", statsRow.fouls_drawn ?? 0), weight: 3, adjusted_weight: 3, available: true, inverse: false });
        rows.push({ stat: "possession_lost", label: "Bolas Perdidas", category: "Disciplina", value_raw: statsRow.possession_lost ?? 0, ...scoreFromStatValue("possession_lost", statsRow.possession_lost ?? 0), weight: 4, adjusted_weight: 4, available: true, inverse: true });

        // PASSES
        rows.push({ stat: "accurate_passes", label: "Passes Certos", category: "Passe", value_raw: statsRow.accurate_passes ?? 0, ...scoreFromStatValue("accurate_passes", statsRow.accurate_passes ?? 0), weight: 5, adjusted_weight: 5, available: true, inverse: false });

        // GENERAL
        rows.push({ stat: "minutes", label: "Minutos", category: "Geral", value_raw: statsRow.minutes ?? 0, ...scoreFromStatValue("minutes", statsRow.minutes ?? 0), weight: 5, adjusted_weight: 5, available: true, inverse: false });
        rows.push({ stat: "matches", label: "Jogos", category: "Geral", value_raw: statsRow.matches ?? 0, ...scoreFromStatValue("matches", statsRow.matches ?? 0), weight: 3, adjusted_weight: 3, available: true, inverse: false });

        // GK-specific stats (only for goalkeepers)
        if (isGoalkeeper) {
          rows.push({ stat: "saves", label: "Defesas", category: "Goleiro", value_raw: statsRow.saves ?? 0, ...scoreFromStatValue("saves", statsRow.saves ?? 0), weight: 10, adjusted_weight: 10, available: true, inverse: false });
          rows.push({ stat: "goals_conceded", label: "Gols Sofridos", category: "Goleiro", value_raw: statsRow.goals_conceded ?? 0, ...scoreFromStatValue("goals_conceded", statsRow.goals_conceded ?? 0), weight: 10, adjusted_weight: 10, available: true, inverse: true });
          rows.push({ stat: "clean_sheets", label: "Clean Sheets", category: "Goleiro", value_raw: statsRow.clean_sheets ?? 0, ...scoreFromStatValue("clean_sheets", statsRow.clean_sheets ?? 0), weight: 8, adjusted_weight: 8, available: true, inverse: false });
          rows.push({ stat: "penalties_saved", label: "Pênaltis Salvos", category: "Goleiro", value_raw: statsRow.penalties_saved ?? 0, ...scoreFromStatValue("penalties_saved", statsRow.penalties_saved ?? 0), weight: 5, adjusted_weight: 5, available: true, inverse: false });
          rows.push({ stat: "errors_leading_to_goal", label: "Erros p/ Gol", category: "Goleiro", value_raw: statsRow.errors_leading_to_goal ?? 0, ...scoreFromStatValue("errors_leading_to_goal", statsRow.errors_leading_to_goal ?? 0), weight: 6, adjusted_weight: 6, available: true, inverse: true });
        }

        return rows;
      })()
    : [];

  // Mandatory log for mapped rows
  console.log("[BREAKDOWN] mapped rows:", breakdownRowsFromStatsRow);

  // If we have a saved stats row, ALWAYS render using it (no dependency on auto_rating_details).
  const statBreakdown = statsRow
    ? breakdownRowsFromStatsRow
    : Array.isArray((competition as any).stat_breakdown)
      ? (competition as any).stat_breakdown
      : [];

  // DEV: Reason logging
  if (isExpanded) {
    if (statsRow === null) {
      console.warn("[BREAKDOWN] reason", statsReason ?? "missing_stats_source");
    }
    if (statsRow && breakdownRowsFromStatsRow.length === 0) {
      console.warn("[BREAKDOWN] reason", "stat_key_mapping_missing");
    }
  }

  // Type for breakdown rows
  type BreakdownRow = {
    stat: string;
    label: string;
    category?: string;
    value_raw?: number;
    value_per90?: number | null;
    value?: number;
    score: number;
    weight: number;
    adjusted_weight: number;
    available: boolean;
    inverse?: boolean;
  };

  // CRITICAL: DO NOT filter out stats with value 0 - they should show as red bars
  // Only filter out truly invalid entries (missing stat key)
  const allStats: BreakdownRow[] = (statBreakdown as BreakdownRow[]).filter((s) => {
    const key = String(s.stat || "").trim();
    return key.length > 0 && key !== "unknown";
  });

  // For breakdown UI, ALL stats are "available" - we render them all, even with 0 values
  const availableStats = allStats;
  const unavailableStats: BreakdownRow[] = []; // We no longer hide stats

  // For position-based summary, get positive and negative contributors based on score
  const positiveStats = allStats.filter((s) => s.score >= 60).sort((a, b) => b.score - a.score);
  const negativeStats = allStats.filter((s) => s.score < 40).sort((a, b) => a.score - b.score);
  
  return (
    <Card className="bg-secondary/20 border-border/50">
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">{competition.competition_name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {competition.season_year}
            </Badge>
          </div>
            <div className="flex items-center gap-3">
            <div className="text-right">
              {isComputed ? (
                <>
                  <span className={cn("text-sm font-semibold", getScoreColor(safeNumber(competition.competition_score)))}>
                    {formatFixed(safeNumber(competition.competition_score), 1)}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">N/D</span>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {/* Competition Info - V2 with year-based weighting */}
          <div className="grid grid-cols-5 gap-2 text-xs text-center">
            <div>
              <p className="text-muted-foreground">Ano</p>
              <Badge variant="outline" className="mt-1">{competition.season_year}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Minutos</p>
              <p className="font-medium">{competition.minutes}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso Ano</p>
              <p className="font-medium">{formatFixed((competition.year_weight ?? competition.recency_weight) * 100, 0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso no Ano</p>
              <p className="font-medium">{formatFixed((competition.in_year_weight ?? competition.minutes_factor) * 100, 0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso Final</p>
              <p className="font-medium">{formatFixed((competition.final_weight ?? competition.combined_weight) * 100, 0)}%</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Stats breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Estatísticas por Posição (peso ajustado)
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">
                      Cada estatística tem um peso diferente baseado na posição do jogador. 
                      A nota final considera apenas estatísticas disponíveis, redistribuindo os pesos.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Position-based Summary */}
            {(positiveStats.length > 0 || negativeStats.length > 0) && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                  <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3" />
                    Pontos Fortes
                  </p>
                  {positiveStats.length > 0 ? (
                    <ul className="text-[10px] text-emerald-700 space-y-0.5">
                      {positiveStats.slice(0, 3).map(s => (
                        <li key={s.stat}>• {getHumanStatName(s.stat, s.label)} ({formatFixed(s.score, 0)})</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Nenhum destaque</p>
                  )}
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                  <p className="text-[10px] font-medium text-destructive flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    Atenção
                  </p>
                  {negativeStats.length > 0 ? (
                    <ul className="text-[10px] text-destructive space-y-0.5">
                      {negativeStats.slice(0, 3).map(s => (
                        <li key={s.stat}>• {getHumanStatName(s.stat, s.label)} ({formatFixed(s.score, 0)})</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Nenhuma área crítica</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Color Legend */}
            {availableStats.length > 0 && <StatScoreLegend />}
            
            {/* Fallback when no stats available */}
            {availableStats.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sem estatísticas detalhadas para esta competição.</p>
                <p className="text-xs mt-1 opacity-70">
                  Adicione mais estatísticas para ver o breakdown completo.
                </p>
              </div>
            )}
            
            {/* Stats bars with tooltips */}
            <TooltipProvider delayDuration={200}>
              {availableStats.map((stat: BreakdownRow) => {
                const scoreLevel = getScoreLevel(stat.score);
                const statInfo = getStatInfo(stat.stat, stat.label);
                const humanLabel = getHumanStatName(stat.stat, stat.label);
                const statClassification = getStatClassificationForPosition(stat.stat, positionGroup);
                const isLow = stat.score < 40;
                const isHigh = stat.score >= 80;
                const isMedium = stat.score >= 40 && stat.score < 60;
                const playerValue = stat.value_raw ?? stat.value ?? null;
                const per90Value = stat.value_per90;
                
                // Determine if this is a positive contributor (high score in positive stat OR low score in inverse/negative stat)
                const isPositiveContributor = (statClassification === "positive" && stat.score >= 60) ||
                                              (statClassification === "negative" && stat.score >= 60); // inverse stat high = good
                const isNegativeContributor = (statClassification === "positive" && stat.score < 40) ||
                                              (statClassification === "negative" && stat.score < 40);
                
                return (
                  <Tooltip key={stat.stat}>
                    <TooltipTrigger asChild>
                      <div className="space-y-1 cursor-help hover:bg-muted/30 rounded-md p-1.5 -mx-1.5 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="mr-1">{statInfo.groupIcon}</span>
                            <span className="font-medium text-foreground">
                              {humanLabel}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                              {statInfo.group}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {formatFixed(stat.adjusted_weight, 0)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-semibold tabular-nums", getScoreColor(stat.score))}>
                              {formatFixed(stat.score, 0)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getScoreBarColor(stat.score))}
                            style={{ width: `${stat.score}%` }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <div className="space-y-2">
                        {/* Header with group and classification */}
                        <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                          <span className="text-base">{statInfo.groupIcon}</span>
                          <div>
                            <p className="font-semibold text-sm">{humanLabel}</p>
                            <p className="text-xs text-muted-foreground">{statInfo.group}</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs ml-auto",
                              stat.score >= 80 && "border-emerald-500 text-emerald-500",
                              stat.score >= 60 && stat.score < 80 && "border-primary text-primary",
                              stat.score >= 40 && stat.score < 60 && "border-amber-500 text-amber-500",
                              stat.score < 40 && "border-destructive text-destructive"
                            )}
                          >
                            {scoreLevel.label}
                          </Badge>
                        </div>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground">{statInfo.description}</p>
                        
                        {/* Stats with value */}
                        <div className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                          <div>
                            <span className="text-muted-foreground">Nota: </span>
                            <span className={cn("font-bold", getScoreColor(stat.score))}>
                              {formatFixed(stat.score, 0)}/100
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Peso: </span>
                            <span className="font-semibold">{formatFixed(stat.adjusted_weight, 0)}%</span>
                          </div>
                          {playerValue !== null && (
                            <div>
                              <span className="text-muted-foreground">Total: </span>
                              <span className="font-semibold">{playerValue}</span>
                            </div>
                          )}
                          {per90Value !== null && per90Value !== undefined && (
                            <div>
                              <span className="text-muted-foreground">p/90: </span>
                              <span className="font-semibold">{formatFixed(per90Value, 2)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Position-based feedback */}
                        {isNegativeContributor && (
                          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2">
                            <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                              <AlertTriangle className="w-3 h-3" />
                              Ponto de Atenção: {humanLabel}
                            </p>
                            <p className="text-xs text-destructive/90">
                              {statClassification === "positive" 
                                ? `Desempenho abaixo do esperado em ${humanLabel}${playerValue !== null ? ` (${playerValue})` : ""}. Esta estatística é importante para a posição.`
                                : `${humanLabel} está impactando negativamente${playerValue !== null ? ` (${playerValue})` : ""}. Área que precisa de atenção.`
                              }
                            </p>
                          </div>
                        )}
                        
                        {isPositiveContributor && (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
                            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mb-1">
                              <Star className="w-3 h-3" />
                              Ponto Forte: {humanLabel}
                            </p>
                            <p className="text-xs text-emerald-600/90">
                              {statClassification === "positive"
                                ? `Excelente desempenho em ${humanLabel}${playerValue !== null ? ` (${playerValue})` : ""}. Estatística chave para a posição.`
                                : `${humanLabel} bem controlado${playerValue !== null ? ` (${playerValue})` : ""}. Contribui positivamente para a nota.`
                              }
                            </p>
                          </div>
                        )}
                        
                        {/* Medium score feedback */}
                        {isMedium && !isPositiveContributor && !isNegativeContributor && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                            <p className="text-xs text-amber-600">
                              Desempenho médio em <strong>{humanLabel}</strong>{playerValue !== null ? ` (${playerValue})` : ""}. Dentro da média esperada.
                            </p>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
            
            {unavailableStats.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Estatísticas não disponíveis (peso redistribuído):
                </p>
                <div className="flex flex-wrap gap-1">
                  {unavailableStats.map((stat: BreakdownRow) => {
                    const statInfo = getStatInfo(stat.stat, stat.label);
                    const humanLabel = getHumanStatName(stat.stat, stat.label);
                    return (
                      <TooltipProvider key={stat.stat}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-xs opacity-60 cursor-help">
                              <span className="mr-1">{statInfo.groupIcon}</span>
                              {humanLabel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium text-xs">{humanLabel}</p>
                              <p className="text-xs text-muted-foreground">{statInfo.description}</p>
                              <p className="text-xs text-amber-500">Dados não disponíveis para esta competição.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Score components */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div className="text-xs">
              <span className="text-muted-foreground">Stats Posição (70%):</span>
              <span className={cn("ml-2 font-medium", getScoreColor(competition.position_stats_score))}>
                {formatFixed(competition.position_stats_score, 1)}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Nível Comp. (30%):</span>
              <span className={cn("ml-2 font-medium", getScoreColor(competition.competition_level_score))}>
                {formatFixed(competition.competition_level_score, 1)}
              </span>
            </div>
          </div>
          
          {/* Final contribution */}
          <div className="flex items-center justify-between bg-background/50 p-2 rounded text-xs">
            <span className="text-muted-foreground">
              Contribuição Final (peso {formatFixed(competition.combined_weight * 100, 0)}%):
            </span>
            <span className={cn("font-semibold", getScoreColor(competition.competition_score))}>
              {formatFixed(competition.weighted_contribution, 1)} pontos
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function RatingBreakdownModalV2({ 
  details, 
  rating, 
  trigger,
  playerId,
  isAdmin,
  onRecalculated,
}: RatingBreakdownModalV2Props) {
  const [expandedCompetitions, setExpandedCompetitions] = useState<Set<string>>(new Set());
  const [recalculating, setRecalculating] = useState(false);

  // Mandatory log for debugging
  console.log("[RADAR] modal playerId:", playerId);
  const toggleCompetition = (id: string) => {
    setExpandedCompetitions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRecalculate = async () => {
    if (!playerId) return;

    setRecalculating(true);
    try {
      const { error } = await supabase.rpc("update_player_auto_rating", {
        p_player_id: playerId,
      });

      if (error) throw error;

      toast.success("Nota recalculada com sucesso!");
      onRecalculated?.();
    } catch (error) {
      console.error("Error recalculating rating:", error);
      toast.error("Erro ao recalcular nota");
    } finally {
      setRecalculating(false);
    }
  };
  
  if (!details) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-1">
              <Info className="w-4 h-4" />
              Como é calculada?
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Nota Automática
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Detalhes indisponíveis. Recalcule a nota para ver o breakdown.
            </p>
            {isAdmin && playerId && (
              <Button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="mt-2"
              >
                {recalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Recalcular Nota
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              A nota será recalculada automaticamente quando houver estatísticas disponíveis.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1">
            <Info className="w-4 h-4" />
            Como é calculada?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Como essa nota foi calculada
            </DialogTitle>
            {isAdmin && playerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={recalculating}
                className="ml-4"
              >
                {recalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Recalcular
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-secondary/30 to-secondary/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nota Final</p>
                <div className="flex items-baseline gap-1">
                  <Star className="w-6 h-6 text-primary fill-primary" />
                  <span className="text-4xl font-bold text-primary">{formatFixed(rating, 1)}</span>
                  <span className="text-lg text-muted-foreground">/5</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Índice</p>
                {(() => {
                  const isComputed = hasComputationFlags(details) ? details.computed : safeNumber(details.final_score_100) > 0;
                  if (isComputed) {
                    return (
                      <>
                        <span className={cn("text-2xl font-semibold", getScoreColor(safeNumber(details.final_score_100)))}>
                          {formatFixed(safeNumber(details.final_score_100), 0)}
                        </span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </>
                    );
                  }
                  return <span className="text-lg text-muted-foreground">Sem dados</span>;
                })()}
              </div>
              <div className="text-right">
                <Badge variant={getReliabilityVariantV2(details.reliability)} className="text-sm mb-1">
                  Confiab. {getReliabilityLabelV2(details.reliability)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {details.total_competitions} competições
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position and sample info */}
        <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <Badge variant="secondary">{details.position_group_label}</Badge>
          </div>
          <div>
            {details.total_matches} jogos | {details.total_minutes} minutos
          </div>
          <div className="ml-auto text-xs">
            {new Date(details.calculated_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="radar" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="radar">Radar</TabsTrigger>
            <TabsTrigger value="competitions">Competições</TabsTrigger>
            <TabsTrigger value="weights">Pesos</TabsTrigger>
            <TabsTrigger value="formula">Fórmula</TabsTrigger>
          </TabsList>

          {/* Radar Tab - SofaScore Style */}
          <TabsContent value="radar" className="mt-4">
            <SofaScoreRadarCard playerId={playerId} showFilters={true} />
          </TabsContent>

          {/* Competitions Tab */}
          <TabsContent value="competitions" className="space-y-3 mt-4">
            {(details?.competitions?.length ?? 0) === 0 ? (
              <Card className="bg-secondary/20">
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Nenhuma competição encontrada para este jogador.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Resumo por Competição
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-2 px-1">Competição</th>
                            <th className="text-center py-2 px-1">Ano</th>
                            <th className="text-center py-2 px-1">Min</th>
                            <th className="text-center py-2 px-1">G</th>
                            <th className="text-center py-2 px-1">A</th>
                            <th className="text-center py-2 px-1" title="Peso do Ano (60% ou 40%)">Ano%</th>
                            <th className="text-center py-2 px-1" title="Peso dentro do Ano (por minutos)">NoAno%</th>
                            <th className="text-center py-2 px-1" title="Peso Final (Ano × NoAno)">Peso</th>
                            <th className="text-center py-2 px-1">Score</th>
                            <th className="text-center py-2 px-1" title="Contribuição = Score × Peso">Contrib</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeArray(details?.competitions ?? []).map((comp) => {
                            const isComputed = competitionHasFlags(comp) ? comp.computed : safeNumber(comp.minutes) > 0;
                            return (
                            <tr key={comp.competition_id} className="border-b border-border/30">
                              <td className="py-2 px-1 max-w-[100px] truncate" title={comp.competition_name}>
                                {comp.competition_name ?? "Sem competição"}
                              </td>
                              <td className="py-2 px-1 text-center">
                                <Badge variant="outline" className="text-xs">
                                  {comp.season_year}
                                </Badge>
                              </td>
                              <td className="py-2 px-1 text-center text-muted-foreground">{comp.minutes}</td>
                              <td className="py-2 px-1 text-center font-medium">{comp.goals}</td>
                              <td className="py-2 px-1 text-center font-medium">{comp.assists}</td>
                              <td className="py-2 px-1 text-center text-muted-foreground">
                                {formatFixed((comp.year_weight ?? comp.recency_weight) * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center text-muted-foreground">
                                {formatFixed((comp.in_year_weight ?? comp.minutes_factor) * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center text-primary font-medium">
                                {formatFixed((comp.final_weight ?? comp.combined_weight) * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center">
                                {isComputed ? (
                                  <span className={cn("font-semibold", getScoreColor(safeNumber(comp.competition_score)))}>
                                    {formatFixed(safeNumber(comp.competition_score), 0)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">N/D</span>
                                )}
                              </td>
                              <td className="py-2 px-1 text-center">
                                {isComputed ? (
                                  <span className={cn("font-medium", getScoreColor(safeNumber(comp.competition_score)))}>
                                    {formatFixed(safeNumber(comp.weighted_contribution), 1)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">N/D</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Expandable competition details */}
                <p className="text-xs text-muted-foreground px-1">
                  Clique em uma competição para ver o breakdown detalhado:
                </p>
                {safeArray(details?.competitions ?? []).map((comp) => (
                  <StatBreakdownCard
                    key={comp.competition_id}
                    competition={comp}
                    isExpanded={expandedCompetitions.has(comp.competition_id)}
                    onToggle={() => toggleCompetition(comp.competition_id)}
                    positionGroup={details.position_group}
                    playerId={playerId}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* Weights Tab */}
          <TabsContent value="weights" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Pesos para {details.position_group_label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cada posição tem pesos diferentes para cada estatística
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeArray(details.stat_weights).map((weight) => (
                  <div key={weight.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{weight.label}</span>
                      {weight.inverse && (
                        <Badge variant="secondary" className="text-xs">inverso</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={weight.weight} className="w-24 h-2" />
                      <span className="text-sm font-medium w-10 text-right">{weight.weight}%</span>
                    </div>
                  </div>
                ))}
                
                <Separator className="my-4" />
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Nota:</strong> Estatísticas com "inverso" significam que valores menores são melhores (ex: cartões).</p>
                  <p>Se uma estatística não estiver disponível, seu peso é redistribuído proporcionalmente entre as demais.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Formula Tab */}
          <TabsContent value="formula" className="mt-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Como funciona o cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">1. Seleção de Anos</p>
                    <p>Considera apenas os <strong>2 anos mais recentes</strong> com estatísticas registradas.</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-1">2. Peso por Ano (Recência)</p>
                    <ul className="text-xs list-disc ml-4 mt-1">
                      <li>Ano mais recente: <strong>60%</strong></li>
                      <li>Segundo ano: <strong>40%</strong></li>
                      <li>Se apenas 1 ano: <strong>100%</strong></li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">3. Peso Dentro do Ano (por Minutos)</p>
                    <p>Dentro de cada ano, cada competição recebe peso proporcional aos minutos jogados:</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      peso_no_ano = minutos_comp / total_minutos_do_ano
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">4. Peso Final</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      peso_final = peso_ano × peso_no_ano
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">5. Nível da Competição</p>
                    <p>Cada competição tem um coeficiente (0.75–1.30). Convertemos para 0–100:</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      score_nivel = ((coef - 0.75) / 0.55) × 100
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">6. Estatísticas por Posição</p>
                    <p>Cada posição tem pesos diferentes. Exemplo: atacantes valorizam gols/90 (28%), zagueiros valorizam desarmes (16%).</p>
                  </div>
                </div>
                
                <div className="p-3 rounded bg-background/50 text-xs font-mono space-y-1">
                  <p className="text-muted-foreground mb-2"># Fórmula Final:</p>
                  <p>score_comp = (stats_posição × 70%) + (nível_comp × 30%)</p>
                  <p>peso_final = peso_ano × (minutos / total_minutos_ano)</p>
                  <p>contribuição = score_comp × peso_final</p>
                  <p>nota_100 = Σ(contribuição) / Σ(peso_final)</p>
                  <p>nota_0_5 = arredondar(nota_100 / 20, 0.5)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
