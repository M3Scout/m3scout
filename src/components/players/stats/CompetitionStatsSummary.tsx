import { Badge } from "@/components/ui/badge";
import { Trophy, Clock } from "lucide-react";
import { isGoalkeeper } from "@/lib/positionUtils";
import type { PlayerStats } from "@/lib/playerStats";
import { normalizePlayerStats } from "@/lib/normalizePlayerStats";
import { cn } from "@/lib/utils";

interface CompetitionStatsSummaryProps {
  stats: PlayerStats;
  playerPosition?: string;
  competitionName?: string;
  /** mantido por compat — não muda o layout */
  compact?: boolean;
}

/* ============================================================
 * Layout clássico (chips minimalistas) usado APENAS no perfil
 * (modo readonly). A edição continua usando ScoutCategoryStats
 * com os cards +/-. Aqui mantemos o mesmo agrupamento por
 * categoria (ATAQUE / PASSES / DRIBLES / DEFESA / GK) e as
 * mesmas cores de identidade visual, porém com aparência
 * leve, sem bordas grossas nem fundo "card de edição".
 * ============================================================ */

interface ChipDef {
  label: string;
  value: number;
  /** quando informado, exibe "value/total (pct%)" */
  total?: number;
  highlight?: boolean;
}

interface CategoryDef {
  key: string;
  label: string;
  /** classe text-* para o título e destaques */
  accent: string;
  chips: ChipDef[];
}

function StatCardItem({ label, value, total, highlight, accent }: ChipDef & { accent: string }) {
  const hasPair = typeof total === "number" && total > 0;
  const pct = hasPair ? Math.min(100, Math.round((value / total!) * 100)) : null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/60 p-3 transition-all",
        "hover:bg-card hover:border-border hover:-translate-y-0.5",
        highlight ? "border-border/80" : "border-border/40",
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums leading-none",
            highlight ? accent : "text-foreground",
          )}
        >
          {value}
        </span>
        {hasPair && (
          <span className="text-sm text-muted-foreground font-medium tabular-nums">
            /{total}
          </span>
        )}
      </div>
      {pct !== null && (
        <p className={cn("mt-1 text-[11px] font-semibold tabular-nums", accent)}>
          {pct}%
        </p>
      )}
    </div>
  );
}

function CategorySection({ category }: { category: CategoryDef }) {
  // Esconde categorias inteiramente vazias (só zeros e sem totais úteis)
  const hasAnyData = category.chips.some((c) => c.value > 0 || (c.total ?? 0) > 0);
  if (!hasAnyData) return null;

  return (
    <div className="space-y-2.5">
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-wider",
          category.accent,
        )}
      >
        {category.label}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {category.chips.map((chip) => (
          <StatCardItem key={chip.label} {...chip} accent={category.accent} />
        ))}
      </div>
    </div>
  );
}

/**
 * Read-only display de estatísticas completas de um atleta numa
 * temporada/competição. Agora usa o layout clássico de chips,
 * mantendo a estrutura de categorias e os campos novos derivados.
 */
export function CompetitionStatsSummary({
  stats: rawStats,
  playerPosition = "",
  competitionName,
}: CompetitionStatsSummaryProps) {
  const isGK = isGoalkeeper(playerPosition);
  const stats = normalizePlayerStats(rawStats);

  const safe = (val: number | undefined | null): number =>
    typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;

  const outfieldCategories: CategoryDef[] = [
    {
      key: "attack",
      label: "Ataque",
      accent: "text-red-500 dark:text-red-400",
      chips: [
        { label: "Gols", value: safe(stats.goals), highlight: true },
        { label: "Final. no Gol", value: safe(stats.shots_on_target), total: safe(stats.shots_total_derived) },
        { label: "Final. Bloq.", value: safe(stats.shots_blocked) },
        { label: "Impedimentos", value: safe(stats.offsides) },
      ],
    },
    {
      key: "passes",
      label: "Passes",
      accent: "text-amber-500 dark:text-amber-400",
      chips: [
        { label: "Assistências", value: safe(stats.assists), highlight: true },
        { label: "Passes Decisivos", value: safe(stats.key_passes) },
        { label: "Chances Criadas", value: safe(stats.chances_created) },
        { label: "Passes Certos", value: safe(stats.accurate_passes), total: safe(stats.passes_total_derived) },
      ],
    },
    {
      key: "dribbles",
      label: "Criatividade / Dribles",
      accent: "text-cyan-500 dark:text-cyan-400",
      chips: [
        { label: "Dribles Certos", value: safe(stats.successful_dribbles), total: safe(stats.dribbles_total_derived) },
        { label: "Faltas Sofridas", value: safe(stats.fouls_drawn) },
        { label: "Bolas Perdidas", value: safe(stats.possession_lost) },
      ],
    },
    {
      key: "defense",
      label: "Defesa",
      accent: "text-blue-500 dark:text-blue-400",
      chips: [
        { label: "Desarmes", value: safe(stats.tackles) },
        { label: "Interceptações", value: safe(stats.interceptions) },
        { label: "Cortes", value: safe(stats.clearances) },
        { label: "Recuperações", value: safe(stats.recoveries) },
        { label: "Duelos Aéreos", value: safe(stats.aerial_duels_won), total: safe(stats.aerial_duels_total_derived) },
        { label: "Duelos no Solo", value: safe(stats.ground_duels_won), total: safe(stats.ground_duels_total_derived) },
        { label: "Faltas Cometidas", value: safe(stats.fouls_committed) },
        { label: "Cartões Amarelos", value: safe(stats.yellow_cards) },
        { label: "Cartões Vermelhos", value: safe(stats.red_cards) },
      ],
    },
  ];

  const goalkeeperCategories: CategoryDef[] = [
    {
      key: "gk",
      label: "Goleiro",
      accent: "text-emerald-500 dark:text-emerald-400",
      chips: [
        { label: "Defesas", value: safe(stats.saves), highlight: true },
        { label: "Gols Sofridos", value: safe(stats.goals_conceded) },
        { label: "Clean Sheets", value: safe(stats.clean_sheets), highlight: true },
        { label: "Pênaltis Defendidos", value: safe(stats.penalties_saved) },
        { label: "Erros → Gol", value: safe(stats.errors_leading_to_goal) },
      ],
    },
    {
      key: "gk_advanced",
      label: "GK Avançado",
      accent: "text-cyan-500 dark:text-cyan-400",
      chips: [
        { label: "Defesas na Área", value: safe(stats.saves_inside_box) },
        { label: "Socos", value: safe(stats.punches) },
        { label: "Bolas Altas", value: safe(stats.high_claims) },
        { label: "Saídas", value: safe(stats.successful_runs_out), total: safe(stats.total_runs_out) },
      ],
    },
    {
      key: "gk_passes",
      label: "Passes",
      accent: "text-amber-500 dark:text-amber-400",
      chips: [
        { label: "Passes Certos", value: safe(stats.accurate_passes), total: safe(stats.passes_total_derived) },
        { label: "Lançamentos", value: safe(stats.long_passes_accurate), total: safe(stats.long_passes_total) },
      ],
    },
    {
      key: "gk_discipline",
      label: "Disciplina",
      accent: "text-blue-500 dark:text-blue-400",
      chips: [
        { label: "Cartões Amarelos", value: safe(stats.yellow_cards) },
        { label: "Cartões Vermelhos", value: safe(stats.red_cards) },
        { label: "Faltas Cometidas", value: safe(stats.fouls_committed) },
      ],
    },
  ];

  const categories = isGK ? goalkeeperCategories : outfieldCategories;

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        {competitionName && <Badge variant="secondary">{competitionName}</Badge>}
        {stats.season_year ? <Badge variant="outline">{stats.season_year}</Badge> : null}
        <Badge variant="outline" className="gap-1">
          <Trophy className="w-3 h-3" />
          {safe(stats.matches)} jogos
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          {safe(stats.minutes)} min
        </Badge>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <CategorySection key={cat.key} category={cat} />
        ))}
      </div>
    </div>
  );
}
