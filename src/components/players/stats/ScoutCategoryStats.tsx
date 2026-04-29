/**
 * ScoutCategoryStats
 *
 * Reusable stat card grid that mirrors the Live Match scout layout (categorias
 * ATAQUE / PASSES / DRIBLES / DEFESA com cores próprias e cards individuais).
 *
 * Suporta dois modos:
 *  - mode="edit"      → cada card exibe valor + botões `-` e `+` para incrementar
 *  - mode="readonly"  → apenas exibe valor (e percentual derivado quando aplicável)
 *
 * Quando uma stat possui `pairKey` (par certo/total), o card adicional do par
 * exibe automaticamente a porcentagem de aproveitamento, idêntico ao Live.
 */

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clampStatValue, getStatLimit } from "@/lib/statLimits";

export type StatValues = Record<string, number>;

export interface ScoutStatDef {
  /** chave da stat na tabela / objeto values */
  key: string;
  /** rótulo curto exibido no card */
  label: string;
  /**
   * Se este card é o lado "sucesso" de um par certo/total (ex: accurate_passes
   * pareado com total_passes). O % é calculado como success/total.
   */
  successOf?: string;
  /**
   * Se este card é o lado "sucesso" de um par certo/errado (ex: crosses_success
   * pareado com crosses_failed). O % é calculado como success/(success+failed).
   * Use quando a coluna do banco armazena os dois lados separadamente.
   */
  successOfFailed?: string;
  /** marca como destaque visual (gols, assistências, defesas) */
  highlight?: boolean;
}

export interface ScoutCategory {
  key: string;
  label: string;
  /** classe tailwind do título / borda */
  color: string; // text-* class
  bgColor: string; // bg-*/border-* combo
  stats: ScoutStatDef[];
}

interface ScoutCategoryStatsProps {
  categories: ScoutCategory[];
  values: StatValues;
  mode?: "edit" | "readonly";
  onChange?: (key: string, next: number) => void;
  disabled?: boolean;
  className?: string;
}

/* ============================================================
 * Categorias padrão — mesmo layout/cores do Live Match scout
 * ============================================================ */

export const OUTFIELD_SCOUT_CATEGORIES: ScoutCategory[] = [
  {
    key: "attack",
    label: "ATAQUE",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    stats: [
      { key: "goals", label: "Gols", highlight: true },
      { key: "shots_on_target", label: "Final. Gol", successOf: "shots" },
      { key: "shots_off_target_derived", label: "Finalizações Fora" },
      { key: "shots_blocked", label: "Final. Bloq." },
      { key: "shots", label: "Final. Total" },
      { key: "offsides", label: "Impedim." },
    ],
  },
  {
    key: "passes",
    label: "PASSES",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { key: "assists", label: "Assist.", highlight: true },
      { key: "key_passes", label: "Passes Dec." },
      { key: "chances_created", label: "Chances" },
      { key: "accurate_passes", label: "Passes ✓", successOf: "total_passes" },
      { key: "total_passes", label: "Passes Tot." },
      { key: "passes_failed_derived", label: "Passes ✗" },
      { key: "crosses_success", label: "Cruzam. ✓", successOfFailed: "crosses_failed" },
      { key: "crosses_failed", label: "Cruzam. ✗" },
    ],
  },
  {
    key: "dribbles",
    label: "DRIBLE / POSSE",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { key: "successful_dribbles", label: "Dribles ✓", successOf: "total_dribbles" },
      { key: "total_dribbles", label: "Dribles Tot." },
      { key: "dribbles_failed_derived", label: "Dribles ✗" },
      { key: "fouls_drawn", label: "Faltas Sof." },
      { key: "possession_lost", label: "Bolas Perd." },
    ],
  },
  {
    key: "defense",
    label: "DEFESA",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { key: "tackles", label: "Desarmes" },
      { key: "interceptions", label: "Interc." },
      { key: "clearances", label: "Cortes" },
      { key: "recoveries", label: "Recup." },
      { key: "times_dribbled_past", label: "Driblado" },
      { key: "ground_duels_won", label: "Duelo Chão ✓", successOf: "ground_duels_total" },
      { key: "ground_duels_total", label: "Duelo Chão Tot." },
      { key: "ground_duels_lost_derived", label: "Duelo Chão ✗" },
      { key: "aerial_duels_won", label: "Duelo Aéreo ✓", successOf: "aerial_duels_total" },
      { key: "aerial_duels_total", label: "Duelo Aéreo Tot." },
      { key: "aerial_duels_lost_derived", label: "Duelo Aéreo ✗" },
      { key: "fouls_committed", label: "Faltas Com." },
      { key: "yellow_cards", label: "Amarelos" },
      { key: "red_cards", label: "Vermelhos" },
    ],
  },
];

export const GOALKEEPER_SCOUT_CATEGORIES: ScoutCategory[] = [
  {
    key: "gk",
    label: "GOLEIRO",
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    stats: [
      { key: "saves", label: "Defesas", highlight: true },
      { key: "goals_conceded", label: "Gols Sof." },
      { key: "clean_sheets", label: "Clean Sheet", highlight: true },
      { key: "penalties_saved", label: "Pên. Def." },
      { key: "errors_leading_to_goal", label: "Erros→Gol" },
    ],
  },
  {
    key: "gk_advanced",
    label: "GK AVANÇADO",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { key: "saves_inside_box", label: "Def. Área" },
      { key: "punches", label: "Socos" },
      { key: "high_claims", label: "Bolas Altas" },
      { key: "successful_runs_out", label: "Saídas ✓", successOf: "total_runs_out" },
      { key: "total_runs_out", label: "Saídas Tot." },
    ],
  },
  {
    key: "gk_passes",
    label: "PASSES",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { key: "accurate_passes", label: "Passes ✓", successOf: "total_passes" },
      { key: "total_passes", label: "Passes Tot." },
      { key: "long_passes_accurate", label: "Lanç. ✓", successOf: "long_passes_total" },
      { key: "long_passes_total", label: "Lanç. Tot." },
    ],
  },
  {
    key: "gk_discipline",
    label: "DISCIPLINA",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { key: "yellow_cards", label: "Amarelos" },
      { key: "red_cards", label: "Vermelhos" },
      { key: "fouls_committed", label: "Faltas Com." },
    ],
  },
];

/* ============================================================
 * Helpers
 * ============================================================ */

/**
 * Mapeamento de chaves "virtuais" (não existem no banco) para o par
 * success/total real. Quando o usuário edita esses cards, atualizamos
 * o total subjacente: total = sum(siblings) + novoValor.
 *
 * `successKey` pode ser uma única chave (par success/failed) ou várias
 * (ex: shots_off = shots - shots_on_target - shots_blocked).
 */
const DERIVED_FAILED_MAP: Record<
  string,
  { successKey: string | string[]; totalKey: string }
> = {
  passes_failed_derived: { successKey: "accurate_passes", totalKey: "total_passes" },
  dribbles_failed_derived: { successKey: "successful_dribbles", totalKey: "total_dribbles" },
  ground_duels_lost_derived: { successKey: "ground_duels_won", totalKey: "ground_duels_total" },
  aerial_duels_lost_derived: { successKey: "aerial_duels_won", totalKey: "aerial_duels_total" },
  // Finalizações Fora = Total − No Gol − Bloqueadas (mesmo critério do Live Match)
  shots_off_target_derived: {
    successKey: ["shots_on_target", "shots_blocked"],
    totalKey: "shots",
  },
};

function sumKeys(values: StatValues, keys: string | string[]): number {
  const list = Array.isArray(keys) ? keys : [keys];
  return list.reduce((acc, k) => acc + getValue(values, k), 0);
}

function getValue(values: StatValues, key: string): number {
  const raw = values[key];
  if (typeof raw !== "number" || isNaN(raw)) return 0;
  return Math.max(0, raw);
}

/** Resolve o valor exibido — para chaves derivadas, computa total - sum(siblings). */
function resolveDisplayValue(values: StatValues, key: string): number {
  const derived = DERIVED_FAILED_MAP[key];
  if (derived) {
    const siblings = sumKeys(values, derived.successKey);
    const total = getValue(values, derived.totalKey);
    return Math.max(0, total - siblings);
  }
  return getValue(values, key);
}

function calcPct(success: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((success / total) * 100));
}

/* ============================================================
 * Coerência (validação visual)
 * ============================================================ */

export interface StatIncoherence {
  /** Chave do total que está incoerente */
  totalKey: string;
  /** Componentes (sucessos) que somam dentro do total */
  successKeys: string[];
  /** Soma atual dos componentes */
  componentsSum: number;
  /** Valor atual do total */
  totalValue: number;
  /** Valor sugerido para o total (= componentsSum) */
  suggestedTotal: number;
}

/**
 * Detecta incoerências do tipo: total < Σ componentes (acertos).
 * Usado para destacar visualmente os cards e oferecer recálculo automático.
 */
export function detectStatIncoherences(values: StatValues): StatIncoherence[] {
  const seen = new Set<string>();
  const result: StatIncoherence[] = [];
  for (const cfg of Object.values(DERIVED_FAILED_MAP)) {
    if (seen.has(cfg.totalKey)) continue;
    seen.add(cfg.totalKey);
    const successKeys = Array.isArray(cfg.successKey) ? cfg.successKey : [cfg.successKey];
    const componentsSum = sumKeys(values, successKeys);
    const totalValue = getValue(values, cfg.totalKey);
    if (componentsSum > totalValue) {
      result.push({
        totalKey: cfg.totalKey,
        successKeys,
        componentsSum,
        totalValue,
        suggestedTotal: componentsSum,
      });
    }
  }
  return result;
}

/**
 * Aplica o recálculo automático de todos os totais incoerentes.
 * Retorna um patch parcial com as chaves a serem atualizadas.
 */
export function recalcStatTotals(values: StatValues): Record<string, number> {
  const patch: Record<string, number> = {};
  for (const inc of detectStatIncoherences(values)) {
    patch[inc.totalKey] = clampStatValue(inc.totalKey, inc.suggestedTotal);
  }
  return patch;
}

/* ============================================================
 * Component
 * ============================================================ */

export function ScoutCategoryStats({
  categories,
  values,
  mode = "readonly",
  onChange,
  disabled,
  className,
}: ScoutCategoryStatsProps) {
  const isEdit = mode === "edit";

  /**
   * Índices reversos derivados do DERIVED_FAILED_MAP, calculados sob demanda:
   *  - successToTotal: para chaves "sucesso" (parte de um par success/total),
   *    indica qual é o total subjacente. Editar o sucesso pode forçar o total
   *    a crescer (total ≥ sum(success siblings)).
   *  - totalToSuccessKeys: para chaves "total", indica os componentes "sucesso"
   *    que somam dentro dele. Editar o total não pode resultar em valor < soma
   *    dos componentes (clamp para o mínimo = soma).
   */
  const successToTotal: Record<string, string> = {};
  const totalToSuccessKeys: Record<string, string[]> = {};
  for (const cfg of Object.values(DERIVED_FAILED_MAP)) {
    const successList = Array.isArray(cfg.successKey) ? cfg.successKey : [cfg.successKey];
    totalToSuccessKeys[cfg.totalKey] = successList;
    for (const sk of successList) successToTotal[sk] = cfg.totalKey;
  }

  /**
   * Aplica a mudança em uma stat mantendo a coerência total = Σ componentes.
   *  - Chave derivada (✗): atualiza o total subjacente.
   *  - Chave "sucesso" de um par: se o novo sucesso fizer Σ componentes > total,
   *    o total é elevado automaticamente para acomodar (✗ derivado se mantém).
   *  - Chave "total": clamp mínimo = Σ componentes (não pode ficar menor que
   *    a soma dos sucessos já registrados).
   */
  const commitValue = (key: string, nextRaw: number) => {
    if (!onChange) return;

    // 1) Chave derivada (✗): editar o "errado/fora" recalcula o total.
    const derived = DERIVED_FAILED_MAP[key];
    if (derived) {
      const siblings = sumKeys(values, derived.successKey);
      const nextValue = Math.max(0, nextRaw);
      const nextTotal = clampStatValue(derived.totalKey, siblings + nextValue);
      onChange(derived.totalKey, nextTotal);
      return;
    }

    // 2) Chave "total" de um par: não pode ficar abaixo da soma dos componentes.
    const successList = totalToSuccessKeys[key];
    if (successList) {
      const minTotal = sumKeys(values, successList);
      const nextValue = clampStatValue(key, Math.max(minTotal, Math.max(0, nextRaw)));
      onChange(key, nextValue);
      return;
    }

    // 3) Chave "sucesso" de um par success/total: ajusta o total se necessário.
    const totalKey = successToTotal[key];
    if (totalKey) {
      const nextSuccess = clampStatValue(key, Math.max(0, nextRaw));
      onChange(key, nextSuccess);
      // Recalcula a soma de todos os componentes do total considerando o novo valor.
      const siblings = totalToSuccessKeys[totalKey] ?? [];
      const newSiblingsSum = siblings.reduce(
        (acc, sk) => acc + (sk === key ? nextSuccess : getValue(values, sk)),
        0,
      );
      const currentTotal = getValue(values, totalKey);
      if (newSiblingsSum > currentTotal) {
        onChange(totalKey, clampStatValue(totalKey, newSiblingsSum));
      }
      return;
    }

    // 4) Caso geral.
    onChange(key, clampStatValue(key, nextRaw));
  };

  const handleStep = (key: string, delta: number) => {
    const current = resolveDisplayValue(values, key);
    commitValue(key, current + delta);
  };

  // Conjunto de chaves envolvidas em incoerências (total + seus componentes),
  // usado para destacar visualmente os cards afetados.
  const incoherences = detectStatIncoherences(values);
  const incoherentKeys = new Set<string>();
  for (const inc of incoherences) {
    incoherentKeys.add(inc.totalKey);
    for (const sk of inc.successKeys) incoherentKeys.add(sk);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {categories.map((category) => (
        <div
          key={category.key}
          className={cn("rounded-lg border p-2.5", category.bgColor)}
        >
          <p
            className={cn(
              "text-[10px] font-bold mb-2 uppercase tracking-wider",
              category.color,
            )}
          >
            {category.label}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {category.stats.map((stat) => {
              const value = resolveDisplayValue(values, stat.key);

              // Cálculo de porcentagem:
              // - successOf:        % = success / total
              // - successOfFailed:  % = success / (success + failed)
              let pct: number | null = null;
              if (stat.successOf) {
                pct = calcPct(value, getValue(values, stat.successOf));
              } else if (stat.successOfFailed) {
                const failed = getValue(values, stat.successOfFailed);
                pct = calcPct(value, value + failed);
              }

              const isDerived = stat.key in DERIVED_FAILED_MAP;
              const limitKey = isDerived
                ? DERIVED_FAILED_MAP[stat.key].totalKey
                : stat.key;
              const { max: statMax } = getStatLimit(limitKey);
              const atMax = isDerived
                ? value + sumKeys(values, DERIVED_FAILED_MAP[stat.key].successKey) >= statMax
                : value >= statMax;

              return (
                <div
                  key={stat.key}
                  className={cn(
                    "rounded-md bg-zinc-950/60 border border-zinc-800/60 p-2 flex flex-col gap-1.5",
                    stat.highlight && "ring-1 ring-primary/30",
                    isDerived && "border-dashed border-zinc-700/60",
                  )}
                  title={isDerived ? "Calculado automaticamente a partir do total e dos acertos" : undefined}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[10px] text-zinc-400 truncate uppercase">
                      {stat.label}
                    </span>
                    {pct !== null && (
                      <span className={cn("text-[10px] font-semibold", category.color)}>
                        {pct}%
                      </span>
                    )}
                  </div>

                  {isEdit ? (
                    <div className="flex items-center justify-between gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={disabled || value === 0}
                        onClick={() => handleStep(stat.key, -1)}
                        className="h-7 w-7 shrink-0 rounded-md bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300"
                        aria-label={`Diminuir ${stat.label}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <EditableStatValue
                        statKey={stat.key}
                        limitKey={limitKey}
                        value={value}
                        disabled={disabled}
                        highlight={!!stat.highlight}
                        accentClass={category.color}
                        ariaLabel={stat.label}
                        onCommit={(next) => commitValue(stat.key, next)}
                      />

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={disabled || atMax}
                        onClick={() => handleStep(stat.key, 1)}
                        className={cn(
                          "h-7 w-7 shrink-0 rounded-md hover:bg-zinc-800 text-zinc-100",
                          "bg-zinc-900/80",
                        )}
                        aria-label={`Aumentar ${stat.label}`}
                        title={atMax ? `Máximo: ${statMax}` : undefined}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums text-center",
                        stat.highlight ? category.color : "text-foreground",
                      )}
                    >
                      {value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 * EditableStatValue — inline numeric input usado no modo edit.
 * Permite digitar diretamente sem precisar usar +/-.
 * ============================================================ */

interface EditableStatValueProps {
  statKey: string;
  /** Chave usada para resolver os limites de validação (default: statKey).
   *  Necessária para chaves derivadas, que devem usar os limites do total subjacente. */
  limitKey?: string;
  value: number;
  disabled?: boolean;
  highlight?: boolean;
  accentClass: string;
  ariaLabel: string;
  onCommit: (next: number) => void;
}

function EditableStatValue({
  statKey,
  limitKey,
  value,
  disabled,
  highlight,
  accentClass,
  ariaLabel,
  onCommit,
}: EditableStatValueProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const focusedRef = useRef(false);
  const effectiveLimitKey = limitKey ?? statKey;
  const { max: statMax } = getStatLimit(effectiveLimitKey);

  // Mantém o input sincronizado quando o valor externo muda (ex: clique em +/-,
  // ou recálculo automático de um total derivado de outro campo).
  // Se o input está focado, só sobrescrevemos quando o valor externo difere do
  // que o usuário digitou — assim recálculos do pai aparecem instantaneamente
  // sem atrapalhar a digitação em curso.
  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value));
      return;
    }
    const parsed = parseInt(draft, 10);
    if (!Number.isFinite(parsed) || parsed !== value) {
      setDraft(String(value));
    }
  }, [value, draft]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    const raw = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    // Não fazemos clamp aqui — o pai (commitValue) decide o clamp final
    // (necessário para chaves derivadas que precisam considerar o total).
    if (raw !== value) onCommit(raw);
    setDraft(String(raw));
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={statMax}
      step={1}
      value={draft}
      disabled={disabled}
      aria-label={`Valor de ${ariaLabel}`}
      onFocus={(e) => {
        focusedRef.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(String(value));
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "flex-1 min-w-0 text-base font-bold tabular-nums text-center bg-transparent",
        "border-0 outline-none focus:outline-none focus:ring-0",
        "rounded-md px-1 py-0.5",
        "focus:bg-zinc-900/80 focus:ring-1 focus:ring-primary/40",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        highlight ? accentClass : "text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    />
  );
}

