/**
 * Modal interativo para seleção de temporada e exportação do relatório PDF.
 * Mostra preview dos números do ano selecionado antes de gerar.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FileDown, Loader2, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportVectorPdf } from "@/lib/vectorPdfExport";
import { mergeSeasonRows } from "@/lib/mergeSeasonStats";
import { getTierFromCoefficient } from "@/lib/tierClassification";
import type { PublicSeasonRow } from "@/lib/mergeSeasonStats";
import {
  PlayerSeasonPdfDocument,
  type CompetitionMeta,
} from "./PlayerSeasonPdfDocument";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG           = "#0c0b0d";
const CARD         = "#0f0f10";
const BORDER       = "rgba(255,255,255,0.07)";
const BORDER_LIGHT = "rgba(255,255,255,0.04)";
const TEXT         = "#ededee";
const MUTED        = "#62616a";
const RED          = "#ec4525";

// Match CompetitionVisuals.TIER_COLORS
const TIER_CFG = {
  S: { bg: "#F5C451", text: "#1a1a1a", label: "Elite Mundial" },
  A: { bg: "#2ECC71", text: "#fff",    label: "Alta Qualidade" },
  B: { bg: "#3498DB", text: "#fff",    label: "Intermediário"  },
  C: { bg: "#7F8C8D", text: "#fff",    label: "Regional"       },
  D: { bg: "#E74C3C", text: "#fff",    label: "Base/Local"     },
} as const;

// Minutagem brackets (FIFPRO)
const MIN_BRACKET = (min: number) =>
  min > 4200  ? { label: "Zona de Risco",    color: "#b91c1c", bg: "rgba(185,28,28,0.12)",  border: "rgba(185,28,28,0.3)"  } :
  min >= 2500 ? { label: "Protagonista",     color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" } :
  min >= 1200 ? { label: "Jogador de Elenco",color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" } :
                { label: "Amostragem Baixa", color: "#fb7185", bg: "rgba(251,113,133,0.12)",border: "rgba(251,113,133,0.3)"};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExportSeasonReportModalProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  playerPosition?: string;
  allSeasons: number[];
  mergedBySeason: Record<number, PublicSeasonRow[]>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportSeasonReportModal({
  open,
  onClose,
  playerName,
  playerPosition,
  allSeasons,
  mergedBySeason,
}: ExportSeasonReportModalProps) {
  const defaultYear = allSeasons[0] ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [isExporting, setIsExporting] = useState(false);
  const [competitionMeta, setCompetitionMeta] = useState<Record<string, CompetitionMeta>>({});
  const [metaLoading, setMetaLoading] = useState(false);

  // Reset year when opening
  useEffect(() => {
    if (open) setSelectedYear(allSeasons[0] ?? new Date().getFullYear());
  }, [open, allSeasons]);

  // Fetch competition metadata for all seasons at once
  useEffect(() => {
    if (!open) return;
    const allIds = Array.from(
      new Set(
        Object.values(mergedBySeason)
          .flat()
          .map(r => r.competition_id)
          .filter(Boolean) as string[]
      )
    );
    if (!allIds.length) return;

    setMetaLoading(true);
    supabase
      .from("competitions")
      .select("id, name, display_name, final_coefficient, tier")
      .in("id", allIds)
      .then(({ data }) => {
        const map: Record<string, CompetitionMeta> = {};
        (data ?? []).forEach(c => {
          // Always derive tier from coefficient for accuracy
          const tier = getTierFromCoefficient(c.final_coefficient ?? 0);
          map[c.id] = {
            id: c.id,
            name: c.display_name ?? c.name,
            final_coefficient: c.final_coefficient ?? 0,
            tier,
          };
        });
        setCompetitionMeta(map);
      })
      .finally(() => setMetaLoading(false));
  }, [open, mergedBySeason]);

  // Rows for selected year (merged)
  const yearRows = useMemo(
    () => mergeSeasonRows(mergedBySeason[selectedYear] ?? []),
    [selectedYear, mergedBySeason]
  );

  // Quick totals for preview
  const preview = useMemo(() => {
    const t = { matches: 0, minutes: 0, goals: 0, assists: 0, passes_completed: 0, passes_total: 0, shots: 0, shots_on_target: 0, tackles: 0, interceptions: 0 };
    yearRows.forEach(r => {
      t.matches          += r.stats.matches;
      t.minutes          += r.stats.minutes;
      t.goals            += r.stats.goals;
      t.assists          += r.stats.assists;
      t.passes_completed += r.stats.passes_completed;
      t.passes_total     += r.stats.passes_total;
      t.shots            += r.stats.shots;
      t.shots_on_target  += r.stats.shots_on_target;
      t.tackles          += r.stats.tackles;
      t.interceptions    += r.stats.interceptions;
    });
    const passAcc = t.passes_total > 0 ? Math.round((t.passes_completed / t.passes_total) * 100) : null;
    const shotAcc = t.shots > 0 ? Math.round((t.shots_on_target / t.shots) * 100) : null;
    return { ...t, passAcc, shotAcc };
  }, [yearRows]);

  const bracket = MIN_BRACKET(preview.minutes);

  // Temporada anterior (ano imediatamente anterior com dados disponíveis)
  const prevYear = useMemo(() => {
    const sorted = allSeasons.filter(y => y < selectedYear).sort((a, b) => b - a);
    return sorted[0] ?? undefined;
  }, [allSeasons, selectedYear]);

  const prevRows = useMemo(
    () => prevYear !== undefined ? mergeSeasonRows(mergedBySeason[prevYear] ?? []) : undefined,
    [prevYear, mergedBySeason],
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      if (!yearRows.length) {
        toast.error("Sem dados para o ano selecionado.");
        return;
      }

      const generatedAt = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

      await exportVectorPdf(
        <PlayerSeasonPdfDocument
          playerName={playerName}
          playerPosition={playerPosition}
          year={selectedYear}
          rows={yearRows}
          competitionMeta={competitionMeta}
          generatedAt={generatedAt}
          prevRows={prevRows}
          prevYear={prevYear}
        />,
        {
          filename: `M3Scout_${playerName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_")}_${selectedYear}.pdf`,
        }
      );

      toast.success("Relatório exportado com sucesso!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório", { description: "Tente novamente em alguns instantes." });
    } finally {
      setIsExporting(false);
    }
  }, [yearRows, competitionMeta, playerName, playerPosition, selectedYear, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl w-full mx-4"
        style={{ background: CARD, borderColor: BORDER, maxWidth: 520 }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-none"
              style={{ background: "rgba(236,69,37,0.14)", border: "1px solid rgba(236,69,37,0.28)" }}
            >
              <FileDown className="w-3.5 h-3.5" style={{ color: RED }} />
            </div>
            <div>
              <p className="font-editorial-mono text-[11px] tracking-[0.2em] uppercase font-semibold" style={{ color: TEXT }}>
                Exportar Relatório Geral
              </p>
              <p className="font-editorial-mono text-[9px] tracking-wider" style={{ color: MUTED }}>
                {playerName}{playerPosition ? ` · ${playerPosition}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 flex-none"
          >
            <X className="w-4 h-4" style={{ color: MUTED }} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-5 space-y-4">
          {/* ── Seletor de temporada ──────────────────────────────────────── */}
          <div>
            <p className="font-editorial-mono text-[9px] tracking-[0.22em] uppercase mb-2" style={{ color: MUTED }}>
              TEMPORADA
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allSeasons.map(yr => {
                const active = yr === selectedYear;
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className="px-3 py-1.5 rounded-lg font-editorial-mono text-[12px] tracking-wider border transition-all"
                    style={{
                      background: active ? RED : "transparent",
                      borderColor: active ? RED : BORDER,
                      color: active ? "#fff" : MUTED,
                    }}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Preview da temporada selecionada ──────────────────────────── */}
          {yearRows.length > 0 ? (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              {/* Preview header */}
              <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.02)" }}>
                <p className="font-editorial-mono text-[9px] tracking-[0.22em] uppercase" style={{ color: MUTED }}>
                  PREVIEW · {selectedYear}
                </p>
                {/* Minutagem bracket */}
                <span
                  className="font-editorial-mono text-[9px] tracking-wider font-semibold px-2 py-0.5 rounded-md"
                  style={{ color: bracket.color, background: bracket.bg, border: `1px solid ${bracket.border}` }}
                >
                  {bracket.label} · {preview.minutes} min
                </span>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-5 divide-x" style={{ borderColor: BORDER, divideBorderColor: BORDER }}>
                {[
                  { label: "JOGOS",  value: preview.matches,                                       color: TEXT  },
                  { label: "MINUTOS",value: preview.minutes,                                       color: TEXT  },
                  { label: "GOLS",   value: preview.goals,                                         color: preview.goals > 0 ? "#34d399" : TEXT },
                  { label: "ASSIST", value: preview.assists,                                       color: preview.assists > 0 ? "#34d399" : TEXT },
                  { label: "PASS %", value: preview.passAcc !== null ? `${preview.passAcc}%` : "—", color: preview.passAcc !== null ? (preview.passAcc >= 78 ? "#34d399" : preview.passAcc >= 65 ? "#fbbf24" : "#fb7185") : MUTED },
                ].map((kpi, i) => (
                  <div key={i} className="py-3 flex flex-col items-center gap-1" style={{ borderColor: BORDER }}>
                    <span className="font-display font-bold tabular-nums" style={{ fontSize: 20, color: kpi.color }}>
                      {kpi.value}
                    </span>
                    <span className="font-editorial-mono text-[7.5px] tracking-[0.18em]" style={{ color: MUTED }}>
                      {kpi.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Competitions list */}
              <div className="border-t" style={{ borderColor: BORDER }}>
                <p className="font-editorial-mono text-[8px] tracking-[0.2em] uppercase px-4 pt-2.5 pb-1.5" style={{ color: MUTED }}>
                  COMPETIÇÕES INCLUÍDAS
                </p>
                <div className="divide-y" style={{ borderColor: BORDER_LIGHT }}>
                  {yearRows.map(row => {
                    const meta = row.competition_id ? competitionMeta[row.competition_id] : undefined;
                    const tier = meta?.tier ?? "C";
                    const tierCfg = TIER_CFG[tier as keyof typeof TIER_CFG] ?? TIER_CFG.C;
                    const coeff = meta?.final_coefficient ?? null;
                    const compName = row.competition_name ?? meta?.name ?? "—";
                    return (
                      <div key={row.id} className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className="w-3 h-3 flex-none" style={{ color: MUTED }} />
                          <span className="font-editorial-mono text-[11px] truncate" style={{ color: TEXT }}>
                            {compName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-none ml-2">
                          {coeff !== null && (
                            <span className="font-editorial-mono text-[9px]" style={{ color: MUTED }}>
                              {coeff.toFixed(2)}
                            </span>
                          )}
                          <span
                            className="font-editorial-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: tierCfg.bg, color: tierCfg.text }}
                          >
                            {tier}
                          </span>
                          <span className="font-editorial-mono text-[9px]" style={{ color: MUTED }}>
                            {row.stats.matches}J · {row.stats.minutes}min
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conteúdo do relatório */}
              <div className="px-4 py-2.5 border-t" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.01)" }}>
                <p className="font-editorial-mono text-[9px] leading-relaxed" style={{ color: MUTED }}>
                  Relatório inclui:{" "}
                  <span style={{ color: TEXT }}>stats completas por competição</span>
                  {" · "}
                  <span style={{ color: TEXT }}>total consolidado</span>
                  {" · "}
                  <span style={{ color: TEXT }}>números ponderados por coeficiente</span>
                  {" · "}
                  <span style={{ color: TEXT }}>análise tática de scout</span>
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border px-4 py-8 text-center"
              style={{ borderColor: BORDER, background: "rgba(255,255,255,0.01)" }}
            >
              <p className="font-editorial-mono text-[10px] tracking-wider uppercase" style={{ color: MUTED }}>
                Sem dados para {selectedYear}
              </p>
            </div>
          )}

          {/* ── Botão de exportação ───────────────────────────────────────── */}
          <button
            onClick={handleExport}
            disabled={isExporting || yearRows.length === 0 || metaLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 font-editorial-mono text-[10.5px] tracking-[0.18em] uppercase font-semibold transition-all"
            style={{
              background: (isExporting || yearRows.length === 0) ? "rgba(236,69,37,0.4)" : RED,
              color: "#fff",
              cursor: (isExporting || yearRows.length === 0) ? "not-allowed" : "pointer",
              opacity: metaLoading && !isExporting ? 0.7 : 1,
            }}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin flex-none" />
                A compilar estatísticas e gerar relatório…
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 flex-none" />
                Gerar PDF · Temporada {selectedYear}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
