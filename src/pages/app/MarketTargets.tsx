import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Handshake, CheckCircle2, XCircle, Plus, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { Target as TargetType, MarketScoreTrend } from "@/types/marketScore";
import { TargetFormModal } from "@/components/market/TargetFormModal";
import { TargetDetailModal } from "@/components/market/TargetDetailModal";
import { Ic } from "@/components/dash/icons";
import { Head, Kpi, View } from "@/components/dash/ui";
import { getTargetAlertSeverity, type TargetAlert } from "@/lib/targetInsightsEngine";
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TargetWithScore extends TargetType {
  market_score: { score_total: number; confidence_level: number; trend_30d: MarketScoreTrend } | null;
}

type ActivityRow = {
  id: string; target_id: string; qualitative_notes: string | null;
  performance_rating: number | null; created_at: string;
  targets: { name: string; status: string } | null;
};

// ─── Stage config ─────────────────────────────────────────────────────────────

const KANBAN_STAGES = [
  { key: "MONITORING"  as const, label: "Monitorando", color: "#BF5AF2", Icon: Eye },
  { key: "NEGOTIATION" as const, label: "Negociação",  color: "#FFD60A", Icon: Handshake },
  { key: "SIGNED"      as const, label: "Contratado",  color: "#30D158", Icon: CheckCircle2 },
  { key: "DROPPED"     as const, label: "Descartado",  color: "#FF3B30", Icon: XCircle },
] as const;
type StageKey = typeof KANBAN_STAGES[number]["key"];

// ─── Design tokens ─────────────────────────────────────────────────────────────

const ACCENT = "#ec4525";
const FG     = "#ededee";
const MUTED  = "#62616a";
const BDR    = "rgba(255,255,255,0.07)";

// Kanban-specific tokens (Trello-style board look, per reference screenshot)
// The code-level "Ativo" green is #22c55e, but pixel-sampling the user's own
// screenshot of /dashboard/contratos shows it actually renders as ~#5ec26a on
// their display — using the measured value instead of the nominal hex so the
// wash matches what they actually see, not what the source claims.
// Same solid colors as the athlete row rectangle in AthleteContractRow.tsx
// (bg-[#16181a], hover:bg-[#0d0e0f]) — no alpha, straight copy for comparison.
const CARD_BG   = "#1a1b1d";
const COLUMN_BG = "#0d0e0f";
const HOVER_BORDER = "#4BA3FA";

const GRADE_COLOR: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#ef4444",
};

const ALERT_COLOR: Record<TargetAlert["severity"], string> = {
  critical: "#f43f5e",
  alert:    "#f59e0b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return "#2DCE8A";
  if (s >= 65) return "#E8C84A";
  if (s >= 45) return "#FF8C42";
  return "#e5173f";
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  if (m < 43200) return `${Math.floor(m / 1440)}d`;
  return `${Math.floor(m / 43200)}mo`;
}

function getAge(t: TargetWithScore) {
  if (t.age_estimate) return t.age_estimate;
  if (t.birth_date) return new Date().getFullYear() - new Date(t.birth_date).getFullYear();
  return null;
}

// ─── Funnel card ──────────────────────────────────────────────────────────────

function FunnelCard({ label, count, loading, color }: {
  label: string;
  count: number; loading: boolean; color: string;
}) {
  return <Kpi label={label} value={loading ? "—" : count} hl c={color} />;
}

// ─── Kanban card visual ───────────────────────────────────────────────────────

const WARN_SVG = '<path d="M12 4 2 20h20zM12 10v4M12 17.5v.5"/>';

function CardVisual({ target, isOverlay = false, alert }: { target: TargetWithScore; isOverlay?: boolean; alert?: TargetAlert }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = target as any;
  const age = getAge(target);
  const score = target.market_score?.score_total ?? null;
  const grade = t.recommendation_grade as string | undefined;
  const gradeCfg = grade ? GRADE_COLOR[grade] : null;
  const alertColor = alert ? ALERT_COLOR[alert.severity] : null;
  const avgPillar = (() => {
    const vals = [t.score_physical, t.score_technical, t.score_tactical, t.score_mental].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((x: number, y: number) => x + y, 0) / vals.length : null;
  })();
  const pos = (target.position ?? "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);

  return (
    <article
      className="tc"
      style={isOverlay ? { transform: "scale(1.04) rotate(1.5deg)", boxShadow: "0 20px 60px rgba(0,0,0,.8)", cursor: "grabbing" } : alertColor ? { boxShadow: `inset 0 0 0 1px ${alertColor}70` } : undefined}
    >
      <div className="tc-h">
        <div style={{ minWidth: 0 }}>
          <h4>{target.name}</h4>
          <p>{[target.position, age ? `${age}a` : null, target.current_club].filter(Boolean).join(" · ")}</p>
        </div>
        {alert && alertColor && (
          <span title={alert.reason} style={{ display: "flex" }}>
            <svg className="warn" viewBox="0 0 24 24" fill="none" stroke={alertColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: WARN_SVG }} />
          </span>
        )}
        {grade && gradeCfg && <span className="tier" style={{ ["--c" as string]: gradeCfg, width: 26, height: 26, fontSize: 12 }}>{grade}</span>}
      </div>
      <div className="tc-f">
        <b style={{ ["--c" as string]: score !== null ? scoreColor(score) : "var(--l3)" }}>{score !== null ? score.toFixed(0) : "—"}</b>
        {avgPillar !== null ? (
          <>
            <span className="bar in"><i style={{ ["--w" as string]: (avgPillar / 5).toFixed(3), ["--c" as string]: "var(--red)" }} /></span>
            <small>{avgPillar.toFixed(1).replace(".", ",")}</small>
          </>
        ) : <span style={{ flex: 1 }} />}
        {pos && <span className="pill">{pos}</span>}
      </div>
    </article>
  );
}

// ─── Kanban card (draggable) ──────────────────────────────────────────────────

function KanbanCard({ target, onOpenDetail, alert }: { target: TargetWithScore; onOpenDetail: (t: TargetWithScore) => void; alert?: TargetAlert }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: target.id, data: { target } });
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={() => onOpenDetail(target)}
      style={{ opacity: isDragging ? 0.25 : 1, touchAction: "none" }}
    >
      <CardVisual target={target} alert={alert} />
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ stageKey, label, color, stageTargets, isLoading, onOpenDetail, alertsByTarget }: {
  stageKey: StageKey; label: string; color: string;
  stageTargets: TargetWithScore[]; isLoading: boolean;
  onOpenDetail: (t: TargetWithScore) => void;
  alertsByTarget: Map<string, TargetAlert>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  return (
    <div className={`col ${isOver ? "over" : ""}`} ref={setNodeRef} style={{ ["--c" as string]: color }}>
      <div className="col-h"><b>{label}</b><span>{isLoading ? "" : stageTargets.length}</span></div>
      {isLoading ? (
        [1, 2].map((i) => <div key={i} className="tc" style={{ height: 96, opacity: 0.4 }} />)
      ) : stageTargets.length === 0 ? (
        <div className="empty" style={{ flex: 1, justifyContent: "center", border: "1px dashed rgba(255,255,255,.12)", borderRadius: 18, background: "transparent", padding: 20, fontSize: 13, color: "var(--l3)" }}>
          {isOver ? "Soltar aqui" : <>Nenhum target<br />Arraste um card para cá</>}
        </div>
      ) : stageTargets.map((t) => (
        <KanbanCard key={t.id} target={t} onOpenDetail={onOpenDetail} alert={alertsByTarget.get(t.id)} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketTargets() {
  const queryClient = useQueryClient();
  const [formModalOpen,   setFormModalOpen]   = useState(false);
  const [selectedTarget,  setSelectedTarget]  = useState<TargetWithScore | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editTarget,      setEditTarget]      = useState<TargetWithScore | null>(null);
  const [activeTarget,    setActiveTarget]    = useState<TargetWithScore | null>(null);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["market-targets"],
    queryFn: async () => {
      const [{ data: tData, error: tErr }, { data: sData, error: sErr }] = await Promise.all([
        supabase.from("targets").select("*").order("created_at", { ascending: false }),
        supabase.from("market_scores").select("target_id, score_total, confidence_level, trend_30d").eq("type", "TARGET"),
      ]);
      if (tErr) throw tErr;
      if (sErr) throw sErr;
      const scoreMap = new Map<string, typeof sData[0]>();
      sData?.forEach(s => { if (s.target_id) scoreMap.set(s.target_id, s); });
      return (tData || []).map(t => ({
        ...t, tags: t.tags || [],
        market_score: scoreMap.has(t.id) ? {
          score_total:      scoreMap.get(t.id)!.score_total,
          confidence_level: scoreMap.get(t.id)!.confidence_level,
          trend_30d:        scoreMap.get(t.id)!.trend_30d as MarketScoreTrend,
        } : null,
      })) as TargetWithScore[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: lastObservationByTarget = new Map<string, string>() } = useQuery({
    queryKey: ["target-observations-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("target_observations")
        .select("target_id, observation_date")
        .order("observation_date", { ascending: false });
      if (error) throw error;
      const map = new Map<string, string>();
      (data || []).forEach(row => {
        if (!map.has(row.target_id)) map.set(row.target_id, row.observation_date);
      });
      return map;
    },
    staleTime: 2 * 60 * 1000,
  });

  const alertsByTarget = useMemo(() => {
    const map = new Map<string, TargetAlert>();
    targets.forEach(t => {
      const alert = getTargetAlertSeverity(t, lastObservationByTarget.get(t.id) ?? null);
      if (alert) map.set(t.id, alert);
    });
    return map;
  }, [targets, lastObservationByTarget]);

  const { data: recentActivity = [] } = useQuery<ActivityRow[]>({
    queryKey: ["target-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("target_observations")
        .select("id, target_id, qualitative_notes, performance_rating, created_at, targets!inner(name, status)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data || []) as ActivityRow[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const targetsByStatus = useMemo(() => {
    const g: Record<string, TargetWithScore[]> = { MONITORING: [], APPROACH: [], NEGOTIATION: [], DROPPED: [], SIGNED: [] };
    targets.forEach(t => { if (g[t.status]) g[t.status].push(t); });
    Object.values(g).forEach(arr => arr.sort((a, b) => (b.market_score?.score_total ?? 0) - (a.market_score?.score_total ?? 0)));
    return g;
  }, [targets]);

  const statusCounts = useMemo(() => ({
    MONITORING:  targetsByStatus.MONITORING.length,
    NEGOTIATION: targetsByStatus.NEGOTIATION.length,
    SIGNED:      targetsByStatus.SIGNED.length,
    DROPPED:     targetsByStatus.DROPPED.length,
  }), [targetsByStatus]);

  const top5 = useMemo(() =>
    [...targets].filter(t => t.market_score).sort((a, b) => (b.market_score?.score_total ?? 0) - (a.market_score?.score_total ?? 0)).slice(0, 5),
    [targets]
  );

  const handleOpenDetail = (t: TargetWithScore) => { setSelectedTarget(t); setDetailModalOpen(true); };
  const handleSelectTargetById = (id: string) => {
    const t = targets.find(x => x.id === id);
    if (t) handleOpenDetail(t);
  };
  const handleEdit       = (t: TargetWithScore) => { setEditTarget(t); setFormModalOpen(true); };
  const handleCloseForm  = () => { setFormModalOpen(false); setEditTarget(null); };
  const handleSuccess    = () => {
    queryClient.invalidateQueries({ queryKey: ["market-targets"] });
    queryClient.invalidateQueries({ queryKey: ["target-activity"] });
    handleCloseForm();
    setDetailModalOpen(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveTarget(targets.find(x => x.id === e.active.id) ?? null);
  }, [targets]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTarget(null);
    if (!over) return;
    const newStatus = over.id as StageKey;
    const dragged = targets.find(t => t.id === active.id);
    if (!dragged || dragged.status === newStatus) return;
    queryClient.setQueryData<TargetWithScore[]>(["market-targets"], old =>
      old?.map(t => t.id === dragged.id ? { ...t, status: newStatus } : t) ?? []
    );
    supabase.from("targets").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", dragged.id)
      .then(({ error }) => { if (error) queryClient.invalidateQueries({ queryKey: ["market-targets"] }); });
  }, [targets, queryClient]);

  return (
    <View>
      <Head title="Monitoramento" kicker="Arraste os cards entre as colunas">
        <button type="button" className="btn r" onClick={() => setFormModalOpen(true)}><Ic n="plus" />Novo target</button>
      </Head>

      <section className="grid g4" style={{ ["--s" as string]: 1 }}>
        {KANBAN_STAGES.map(({ key, label, color }) => (
          <FunnelCard key={key} label={label} count={statusCounts[key]} loading={isLoading} color={color} />
        ))}
      </section>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <section className="kb mt" style={{ ["--s" as string]: 2 }}>
          {KANBAN_STAGES.map(({ key, label, color }) => (
            <KanbanColumn
              key={key} stageKey={key} label={label} color={color}
              stageTargets={targetsByStatus[key] || []}
              isLoading={isLoading}
              onOpenDetail={handleOpenDetail}
              alertsByTarget={alertsByTarget}
            />
          ))}
        </section>
        <DragOverlay dropAnimation={null}>
          {activeTarget ? <div className="m3v" style={{ width: 260 }}><CardVisual target={activeTarget} isOverlay /></div> : null}
        </DragOverlay>
      </DndContext>

      <section className="hello mt2" style={{ ["--s" as string]: 3 }}>
        <div className="card pad">
          <div className="ch"><h2>Atividade recente</h2></div>
          {recentActivity.length === 0 ? <p style={{ color: "var(--l3)", margin: 0 }}>Nenhuma atividade registrada.</p> : (
            <div className="squad">
              {recentActivity.map((obs) => {
                const stageCfg = KANBAN_STAGES.find((st) => st.key === obs.targets?.status);
                return (
                  <div key={obs.id} style={{ display: "grid", gridTemplateColumns: "10px minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
                    <span style={{ width: 10, height: 10, marginTop: 6, borderRadius: "50%", background: stageCfg?.color ?? "var(--l3)" }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 15 }}>
                        <b>{obs.targets?.name}</b>
                        <span style={{ color: "var(--l2)" }}> · {obs.qualitative_notes || "Observação registrada"}</span>
                      </p>
                      {obs.performance_rating != null && (
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--l3)" }}>Nota {obs.performance_rating}/10</p>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--l3)", whiteSpace: "nowrap" }}>{timeAgo(obs.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card pad">
          <div className="ch"><h2>Market score</h2></div>
          {top5.length === 0 ? <p style={{ color: "var(--l3)", margin: 0 }}>Sem scores calculados.</p> : (
            <ol className="rank">
              {top5.map((t, i) => {
                const score = t.market_score!.score_total;
                const trend = t.market_score!.trend_30d;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const grade = (t as any).recommendation_grade as string | undefined;
                return (
                  <li key={t.id}>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleOpenDetail(t); }}>
                      <span className="n">{String(i + 1).padStart(2, "0")}</span>
                      <span className="who"><span><b>{t.name}</b><span>{[t.position, t.current_club].filter(Boolean).join(" · ")}</span></span></span>
                      <span className="sc">
                        {grade && GRADE_COLOR[grade] && <span className="tier" style={{ ["--c" as string]: GRADE_COLOR[grade], width: 26, height: 26, fontSize: 12 }}>{grade}</span>}
                        <b className="tab" style={{ color: scoreColor(score) }}>{score.toFixed(0)}</b>
                        <span style={{ fontSize: 12, color: trend === "UP" ? "var(--green)" : trend === "DOWN" ? "var(--red)" : "var(--l3)" }}>{trend === "UP" ? "▲" : trend === "DOWN" ? "▼" : "–"}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      <TargetFormModal open={formModalOpen} onOpenChange={handleCloseForm} target={editTarget} onSuccess={handleSuccess} />
      <TargetDetailModal open={detailModalOpen} onOpenChange={setDetailModalOpen} target={selectedTarget} onEdit={handleEdit} onSuccess={handleSuccess} onSelectTarget={handleSelectTargetById} />
    </View>
  );
}
