import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPlayerAllAttributeScores,
  type AttributeScoresData,
} from "@/lib/attributeScores";
import { formatDateMediumBR } from "@/lib/dateUtils";

// ─── Design tokens ───────────────────────────────────────────────────────────

const ACCENT = "#E5173F";
const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";
const TEXT   = "#F2EDE4";
const BG     = "#0A0A0A";

// ─── Category & sub-attribute config ─────────────────────────────────────────

const CATEGORIES = [
  {
    key: "ata" as const,
    scoreKey: "ata_score_100" as const,
    label: "ATAQUE",
    attrs: [
      { key: "goals_p90",         label: "Gols" },
      { key: "assists_p90",       label: "Assistências" },
      { key: "shots_p90",         label: "Finalizações" },
      { key: "shots_on_target_p90", label: "Fin. no Gol" },
    ],
  },
  {
    key: "cri" as const,
    scoreKey: "cri_score_100" as const,
    label: "CRIATIVIDADE",
    attrs: [
      { key: "key_passes_p90",      label: "Passes-chave" },
      { key: "chances_created_p90", label: "Chances Criadas" },
      { key: "dribble_success_rate", label: "Dribles" },
    ],
  },
  {
    key: "tec" as const,
    scoreKey: "tec_score_100" as const,
    label: "TÉCNICA",
    attrs: [
      { key: "pass_accuracy", label: "Precisão de Passe" },
      { key: "passes_p90",    label: "Volume de Passe" },
      { key: "ball_control",  label: "Controle de Bola" },
    ],
  },
  {
    key: "def" as const,
    scoreKey: "def_score_100" as const,
    label: "DEFESA",
    attrs: [
      { key: "tackles_p90",       label: "Desarmes" },
      { key: "interceptions_p90", label: "Interceptações" },
      { key: "recoveries_p90",    label: "Recuperações" },
      { key: "duels_win_rate",    label: "Duelos" },
      { key: "clearances_p90",    label: "Cortes" },
    ],
  },
  {
    key: "tat" as const,
    scoreKey: "tat_score_100" as const,
    label: "TÁTICO",
    attrs: [
      { key: "yellow_cards_p90",    label: "Amarelos" },
      { key: "red_cards_p90",       label: "Vermelhos" },
      { key: "fouls_committed_p90", label: "Faltas Cometidas" },
      { key: "fouls_drawn_p90",     label: "Faltas Sofridas" },
      { key: "possession_lost_p90", label: "Posse Perdida" },
    ],
  },
] as const;

// ─── Aggregation helpers ──────────────────────────────────────────────────────

interface AggregatedScores {
  ata: number; tec: number; def: number; tat: number; cri: number;
  subScores: Record<string, number>;
  hasData: boolean;
}

function aggregateScores(rows: AttributeScoresData[]): AggregatedScores {
  if (!rows.length) return { ata: 0, tec: 0, def: 0, tat: 0, cri: 0, subScores: {}, hasData: false };

  let totalMin = 0;
  let wAta = 0, wTec = 0, wDef = 0, wTat = 0, wCri = 0;
  const wSub: Record<string, number> = {};

  rows.forEach(r => {
    const mins = r.details?.minutes ?? 60;
    totalMin += mins;
    wAta += (r.ata_score_100 ?? 0) * mins;
    wTec += (r.tec_score_100 ?? 0) * mins;
    wDef += (r.def_score_100 ?? 0) * mins;
    wTat += (r.tat_score_100 ?? 0) * mins;
    wCri += (r.cri_score_100 ?? 0) * mins;

    const raw = (r.details as { raw_scores?: Record<string, number> } | null)?.raw_scores ?? {};
    Object.entries(raw).forEach(([k, v]) => {
      wSub[k] = (wSub[k] ?? 0) + v * mins;
    });
  });

  const d = totalMin || 1;
  const subScores: Record<string, number> = {};
  Object.entries(wSub).forEach(([k, v]) => { subScores[k] = v / d; });

  return {
    ata: wAta / d, tec: wTec / d, def: wDef / d,
    tat: wTat / d, cri: wCri / d,
    subScores,
    hasData: totalMin > 0,
  };
}

// ─── Pentagon radar (same math as AtributoRadar.tsx) ─────────────────────────

const CX = 115, CY = 130, R = 86;
const LABEL_R = R + 20;
const RADAR_AXES = [
  { key: "ata" as const, label: "ATA", angleDeg: -90  },
  { key: "tec" as const, label: "TEC", angleDeg: -18  },
  { key: "tat" as const, label: "TAT", angleDeg:  54  },
  { key: "def" as const, label: "DEF", angleDeg:  126 },
  { key: "cri" as const, label: "CRI", angleDeg:  198 },
] as const;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, deg: number) => ({ x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) });

function pentagonPath(scores: number[]) {
  return RADAR_AXES.map((a, i) => {
    const { x, y } = pt(((scores[i] ?? 0) / 100) * R, a.angleDeg);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function gridPath(f: number) {
  return RADAR_AXES.map((a, i) => {
    const { x, y } = pt(R * f, a.angleDeg);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function TechRadar({ scores }: { scores: number[] }) {
  return (
    <svg viewBox="0 0 230 270" className="w-full" style={{ maxHeight: 270 }}>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <path key={f} d={gridPath(f)} fill="none" stroke={BORDER} strokeWidth="1" />
      ))}
      {/* Axis spokes */}
      {RADAR_AXES.map(a => {
        const outer = pt(R, a.angleDeg);
        return (
          <line key={a.key} x1={CX} y1={CY} x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)} stroke={BORDER} strokeWidth="1" />
        );
      })}
      {/* Data polygon */}
      <path d={pentagonPath(scores)} fill="rgba(229,23,63,0.18)" stroke={ACCENT} strokeWidth="1.5" />
      {/* Vertex dots */}
      {RADAR_AXES.map((a, i) => {
        const r = ((scores[i] ?? 0) / 100) * R;
        const { x, y } = pt(r, a.angleDeg);
        return <circle key={`dot-${a.key}`} cx={x.toFixed(2)} cy={y.toFixed(2)} r="3" fill={ACCENT} />;
      })}
      {/* Axis labels + values — entirely outside the polygon */}
      {RADAR_AXES.map((a, i) => {
        const { x, y } = pt(LABEL_R, a.angleDeg);
        return (
          <text key={`lv-${a.key}`} textAnchor="middle">
            <tspan
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              fontSize="13"
              fontFamily="Basis Grotesque Pro, sans-serif"
              fontWeight="700"
              fill={MUTED}
              letterSpacing="1"
            >
              {a.label}
            </tspan>
            <tspan
              x={x.toFixed(2)}
              dy="16"
              fontSize="11"
              fontFamily="Basis Grotesque Pro, sans-serif"
              fontWeight="700"
              fill={TEXT}
            >
              {String(Math.round(scores[i] ?? 0))}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[3px] h-[14px]" style={{ background: ACCENT }} />
      <h3 className="font-barlow text-[13px] uppercase tracking-widest" style={{ color: TEXT }}>
        {title}
      </h3>
    </div>
  );
}

// ─── Scouting report type ─────────────────────────────────────────────────────

interface ReportRow {
  id: string;
  match_date: string;
  rating: number;
  technical_score: number;
  technical_notes: string | null;
  scout_id: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TechnicalTabProps {
  playerId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TechnicalTab({ playerId }: TechnicalTabProps) {
  // Attribute scores
  const { data: attrRows = [], isLoading: attrLoading } = useQuery({
    queryKey: ["player-attr-scores-tech", playerId],
    queryFn: () => fetchPlayerAllAttributeScores(playerId),
  });

  // Scouting reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["scouting-reports-tech", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("id, match_date, rating, technical_score, technical_notes, scout_id")
        .eq("player_id", playerId)
        .order("match_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  // Fetch scout names from distinct scout_ids
  const scoutIds = [...new Set(reports.map(r => r.scout_id).filter(Boolean))];
  const { data: scouts = [] } = useQuery({
    queryKey: ["scout-profiles-tech", scoutIds.join(",")],
    queryFn: async () => {
      if (!scoutIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", scoutIds);
      return (data ?? []) as { user_id: string; full_name: string | null }[];
    },
    enabled: scoutIds.length > 0,
  });

  const scoutMap = Object.fromEntries(scouts.map(s => [s.user_id, s.full_name ?? "Scout"]));

  // Aggregate scores
  const agg = aggregateScores(attrRows);
  const radarScores = [agg.ata, agg.tec, agg.tat, agg.def, agg.cri];

  // KPI strip items (same order as categories)
  const KPI_ITEMS = [
    { key: "ata", label: "ATAQUE",      value: agg.ata },
    { key: "tec", label: "TÉCNICA",     value: agg.tec },
    { key: "def", label: "DEFESA",      value: agg.def },
    { key: "tat", label: "TÁTICO",      value: agg.tat },
    { key: "cri", label: "CRIATIVIDADE",value: agg.cri },
  ];

  return (
    <div className="space-y-8 py-6">

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-5 divide-x"
        style={{ borderColor: BORDER, border: `1px solid ${BORDER}` }}
      >
        {KPI_ITEMS.map((item, i) => {
          const val = item.value;
          const hasVal = agg.hasData;
          return (
            <div
              key={item.key}
              className="px-4 py-4 flex flex-col gap-1"
              style={{ borderRight: i < 4 ? `1px solid ${BORDER}` : undefined }}
            >
              <span className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
                {item.label}
              </span>
              {attrLoading ? (
                <span className="font-jetbrains text-[22px]" style={{ color: MUTED }}>…</span>
              ) : hasVal ? (
                <>
                  <span className="font-jetbrains text-[24px] leading-none tabular-nums" style={{ color: TEXT }}>
                    {Math.round(val)}
                  </span>
                  <div className="mt-1.5 h-[2px]" style={{ background: BORDER }}>
                    <div
                      className="h-full"
                      style={{ width: `${Math.min(val, 100)}%`, background: ACCENT }}
                    />
                  </div>
                </>
              ) : (
                <span className="font-jetbrains text-[14px]" style={{ color: MUTED }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Atributos Técnicos ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Atributos Técnicos" />

        {/* Radar + category cards in 2-col grid */}
        <div className="grid gap-0 lg:grid-cols-[240px_1fr]" style={{ border: `1px solid ${BORDER}` }}>

          {/* Radar */}
          <div
            className="flex items-center justify-center p-6"
            style={{ borderRight: `1px solid ${BORDER}` }}
          >
            {attrLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                  CARREGANDO...
                </span>
              </div>
            ) : !agg.hasData ? (
              <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-center">
                <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                  SEM DADOS
                </span>
                <span className="font-jetbrains text-[9px]" style={{ color: MUTED }}>
                  Nenhuma avaliação computada
                </span>
              </div>
            ) : (
              <TechRadar scores={radarScores} />
            )}
          </div>

          {/* Category attribute cards — 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {CATEGORIES.map((cat, catIdx) => {
              const catScore = agg[cat.key];
              const isLastRow = catIdx === CATEGORIES.length - 1;
              return (
                <div
                  key={cat.key}
                  className="p-4"
                  style={{
                    borderBottom: !isLastRow ? `1px solid ${BORDER}` : undefined,
                    borderLeft: `1px solid ${BORDER}`,
                  }}
                >
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-barlow text-[11px] uppercase tracking-widest" style={{ color: TEXT }}>
                      {cat.label}
                    </span>
                    <span className="font-jetbrains text-[13px] tabular-nums" style={{ color: agg.hasData ? ACCENT : MUTED }}>
                      {agg.hasData ? Math.round(catScore) : "—"}
                    </span>
                  </div>

                  {/* Sub-attributes */}
                  <div className="space-y-2.5">
                    {cat.attrs.map(attr => {
                      const raw = agg.subScores[attr.key];
                      const hasV = raw != null && Number.isFinite(raw);
                      const pct = hasV ? Math.min(100, Math.max(0, raw)) : 0;
                      return (
                        <div key={attr.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-jetbrains text-[10px]" style={{ color: MUTED }}>
                              {attr.label}
                            </span>
                            <span className="font-jetbrains text-[10px] tabular-nums" style={{ color: hasV ? TEXT : MUTED }}>
                              {hasV ? Math.round(raw) : "—"}
                            </span>
                          </div>
                          <div className="h-[2px]" style={{ background: BORDER }}>
                            <div
                              className="h-full"
                              style={{
                                width: `${pct}%`,
                                background: hasV ? ACCENT : "transparent",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Histórico de Avaliações Técnicas ───────────────────────────────── */}
      <section>
        <SectionHeader title="Histórico de Avaliações Técnicas" />
        <div className="border" style={{ borderColor: BORDER }}>
          {/* Table header */}
          <div
            className="grid grid-cols-[120px_140px_80px_1fr] px-4 py-2"
            style={{ borderBottom: `1px solid ${BORDER}`, background: "#0D0D0D" }}
          >
            {["DATA", "SCOUT", "NOTA", "OBSERVAÇÃO TÉCNICA"].map(col => (
              <span key={col} className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {reportsLoading ? (
            <div className="px-4 py-8 text-center">
              <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                CARREGANDO...
              </span>
            </div>
          ) : reports.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
              <span className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: MUTED }}>
                SEM AVALIAÇÕES
              </span>
              <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                Nenhum relatório de observação registrado
              </span>
            </div>
          ) : (
            reports.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-[120px_140px_80px_1fr] px-4 py-3 items-start"
                style={{
                  borderBottom: i < reports.length - 1 ? `1px solid ${BORDER}` : undefined,
                  background: i % 2 === 1 ? "#080808" : BG,
                }}
              >
                {/* Data */}
                <span className="font-jetbrains text-[11px]" style={{ color: MUTED }}>
                  {formatDateMediumBR(r.match_date)}
                </span>

                {/* Scout */}
                <span className="font-jetbrains text-[11px] truncate pr-2" style={{ color: TEXT }}>
                  {scoutMap[r.scout_id] ?? "—"}
                </span>

                {/* Nota */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-jetbrains text-[13px] tabular-nums font-bold"
                    style={{ color: r.rating >= 4 ? "#22C55E" : r.rating >= 3 ? TEXT : MUTED }}
                  >
                    {r.rating}
                  </span>
                  <span className="font-jetbrains text-[9px]" style={{ color: MUTED }}>/5</span>
                </div>

                {/* Observação */}
                <span
                  className="font-jetbrains text-[11px] leading-relaxed"
                  style={{ color: r.technical_notes ? TEXT : MUTED }}
                >
                  {r.technical_notes
                    ? r.technical_notes.length > 120
                      ? r.technical_notes.slice(0, 120) + "…"
                      : r.technical_notes
                    : "—"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Row count footer */}
        {reports.length > 0 && (
          <p className="font-jetbrains text-[10px] uppercase tracking-wider mt-2 text-right" style={{ color: MUTED }}>
            {reports.length} {reports.length === 1 ? "avaliação" : "avaliações"}
          </p>
        )}
      </section>
    </div>
  );
}
