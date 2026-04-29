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

export type StatValues = Record<string, number>;

export interface ScoutStatDef {
  /** chave da stat na tabela / objeto values */
  key: string;
  /** rótulo curto exibido no card */
  label: string;
  /** se for o "sucesso" de um par (ex: passes_completed) — informe a chave do total / falhas para calcular % */
  successOf?: string; // key of the failures/total partner
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
      { key: "shots_on_target", label: "Final. Gol" },
      { key: "shots", label: "Final. Total" },
      { key: "shots_blocked", label: "Final. Bloq." },
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
    ],
  },
  {
    key: "dribbles",
    label: "DRIBLES",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { key: "successful_dribbles", label: "Dribles ✓", successOf: "total_dribbles" },
      { key: "total_dribbles", label: "Dribles Tot." },
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
      { key: "aerial_duels_won", label: "Aéreos ✓", successOf: "aerial_duels_total" },
      { key: "aerial_duels_total", label: "Aéreos Tot." },
      { key: "ground_duels_won", label: "Duelos ✓", successOf: "ground_duels_total" },
      { key: "ground_duels_total", label: "Duelos Tot." },
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

function getValue(values: StatValues, key: string): number {
  const raw = values[key];
  if (typeof raw !== "number" || isNaN(raw)) return 0;
  return Math.max(0, raw);
}

function calcPct(success: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.round((success / total) * 100));
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

  const handleStep = (key: string, delta: number) => {
    if (!onChange) return;
    const next = Math.max(0, getValue(values, key) + delta);
    onChange(key, next);
  };

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
              const value = getValue(values, stat.key);
              const pct = stat.successOf
                ? calcPct(value, getValue(values, stat.successOf))
                : null;

              return (
                <div
                  key={stat.key}
                  className={cn(
                    "rounded-md bg-zinc-950/60 border border-zinc-800/60 p-2 flex flex-col gap-1.5",
                    stat.highlight && "ring-1 ring-primary/30",
                  )}
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
                      <span
                        className={cn(
                          "text-base font-bold tabular-nums flex-1 text-center",
                          stat.highlight ? category.color : "text-foreground",
                        )}
                      >
                        {value}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => handleStep(stat.key, 1)}
                        className={cn(
                          "h-7 w-7 shrink-0 rounded-md hover:bg-zinc-800 text-zinc-100",
                          "bg-zinc-900/80",
                        )}
                        aria-label={`Aumentar ${stat.label}`}
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
