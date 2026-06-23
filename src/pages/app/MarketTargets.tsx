import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Handshake, CheckCircle2, XCircle, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Target as TargetType, MarketScoreTrend } from "@/types/marketScore";
import { TargetFormModal } from "@/components/market/TargetFormModal";
import { TargetDetailModal } from "@/components/market/TargetDetailModal";
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
  { key: "MONITORING"  as const, label: "Monitorando", color: "#9B6DFF", Icon: Eye },
  { key: "NEGOTIATION" as const, label: "Negociação",  color: "#E8C84A", Icon: Handshake },
  { key: "SIGNED"      as const, label: "Contratado",  color: "#2DCE8A", Icon: CheckCircle2 },
  { key: "DROPPED"     as const, label: "Descartado",  color: "#e5173f", Icon: XCircle },
] as const;
type StageKey = typeof KANBAN_STAGES[number]["key"];

// ─── Design tokens ─────────────────────────────────────────────────────────────

const ACCENT = "#ec4525";
const FG     = "#ededee";
const MUTED  = "#62616a";
const BDR    = "rgba(255,255,255,0.07)";
const BG     = "#0a0a0d";
const BG2    = "#0f0e13";

const GRADE_COLOR: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#ef4444",
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

function initials(n: string) {
  return n.split(" ").slice(0, 2).map(x => x[0]).join("").toUpperCase();
}

function getAge(t: TargetWithScore) {
  if (t.age_estimate) return t.age_estimate;
  if (t.birth_date) return new Date().getFullYear() - new Date(t.birth_date).getFullYear();
  return null;
}

// ─── Funnel card ──────────────────────────────────────────────────────────────

function FunnelCard({ label, color, Icon, count, total, loading }: {
  label: string; color: string; Icon: React.ElementType;
  count: number; total: number; loading: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-5 flex flex-col gap-3 group cursor-default transition-all duration-300 hover:scale-[1.02]"
      style={{ background: BG2, border: `1px solid ${BDR}` }}
    >
      {/* Glow blob */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.2]"
        style={{ background: color }} />

      {/* Top row */}
      <div className="flex items-center justify-between relative z-10">
        <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: MUTED }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon style={{ width: 13, height: 13, color }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Number */}
      <div className="relative z-10">
        {loading
          ? <Skeleton className="h-10 w-10 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
          : <span className="font-display font-bold leading-none" style={{ fontSize: 44, color: FG }}>{count}</span>
        }
      </div>

      {/* Progress bar */}
      <div className="relative z-10 space-y-1">
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
          />
        </div>
        <span className="font-mono text-[9px]" style={{ color: `${color}80` }}>
          {pct}% do total
        </span>
      </div>
    </div>
  );
}

// ─── Kanban card visual ───────────────────────────────────────────────────────

function CardVisual({ target, isOverlay = false }: { target: TargetWithScore; isOverlay?: boolean }) {
  const t = target as any;
  const age       = getAge(target);
  const score     = target.market_score?.score_total ?? null;
  const sc        = score !== null ? scoreColor(score) : null;
  const grade     = t.recommendation_grade as string | undefined;
  const gradeCfg  = grade ? GRADE_COLOR[grade] : null;
  const stageCfg  = KANBAN_STAGES.find(s => s.key === target.status);
  const stageColor = stageCfg?.color ?? MUTED;

  const avgPillar = (() => {
    const vals = [t.score_physical, t.score_technical, t.score_tactical, t.score_mental].filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
  })();

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200 group/card"
      style={{
        background: isOverlay ? "#1c1a22" : BG,
        borderColor: isOverlay ? "rgba(255,255,255,0.2)" : BDR,
        boxShadow: isOverlay ? "0 20px 60px rgba(0,0,0,0.9)" : "none",
        transform: isOverlay ? "scale(1.05) rotate(1.5deg)" : "none",
        cursor: isOverlay ? "grabbing" : "grab",
      }}
    >
      {/* Stage accent line */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${stageColor}60, transparent)` }} />

      <div className="p-3">
        {/* Top: avatar + name + grade */}
        <div className="flex items-start gap-2.5 mb-3">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-lg flex-none overflow-hidden flex items-center justify-center text-[11px] font-bold font-mono"
            style={{ background: `${stageColor}18`, border: `1px solid ${stageColor}30`, color: stageColor }}
          >
            {target.photo_url
              ? <img src={target.photo_url} alt={target.name} className="w-full h-full object-cover object-top" loading="lazy" />
              : initials(target.name)
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-[12px] uppercase leading-tight truncate" style={{ color: FG }}>
              {target.name}
            </p>
            <p className="font-mono text-[9px] mt-0.5 truncate" style={{ color: MUTED }}>
              {[target.position, age ? `${age}a` : null, target.current_club].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* Grade badge */}
          {grade && gradeCfg && (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-none font-display font-bold text-[11px] leading-none"
              style={{ background: `${gradeCfg}18`, border: `1px solid ${gradeCfg}40`, color: gradeCfg }}
            >
              {grade}
            </div>
          )}
        </div>

        {/* Bottom: score + pillars */}
        <div className="flex items-center gap-2 pt-2.5 border-t" style={{ borderColor: BDR }}>
          {/* Score */}
          <div className="flex items-center gap-1.5 flex-none">
            <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: sc ?? MUTED }} />
            <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: sc ?? MUTED }}>
              {score !== null ? score.toFixed(0) : "—"}
            </span>
          </div>

          {/* Pillar avg mini bar */}
          {avgPillar !== null && (
            <div className="flex-1 flex items-center gap-1.5">
              <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full" style={{ width: `${(avgPillar / 5) * 100}%`, background: `${ACCENT}90` }} />
              </div>
              <span className="font-mono text-[9px] tabular-nums" style={{ color: MUTED }}>{avgPillar.toFixed(1)}</span>
            </div>
          )}

          {/* Position pill */}
          <span
            className="font-mono text-[9px] px-1.5 py-0.5 rounded-md ml-auto flex-none"
            style={{ color: MUTED, border: `1px solid ${BDR}` }}
          >
            {(target.position ?? "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 3)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban card (draggable) ──────────────────────────────────────────────────

function KanbanCard({ target, onOpenDetail }: { target: TargetWithScore; onOpenDetail: (t: TargetWithScore) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: target.id, data: { target } });
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={() => onOpenDetail(target)}
      className="transition-all duration-200 hover:-translate-y-0.5"
      style={{ opacity: isDragging ? 0.25 : 1, touchAction: "none" }}
    >
      <CardVisual target={target} />
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ stageKey, label, color, Icon, stageTargets, isLoading, onOpenDetail }: {
  stageKey: StageKey; label: string; color: string; Icon: React.ElementType;
  stageTargets: TargetWithScore[]; isLoading: boolean;
  onOpenDetail: (t: TargetWithScore) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden transition-all duration-200"
      style={{
        background: isOver ? `${color}07` : BG2,
        borderColor: isOver ? `${color}50` : BDR,
      }}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-none" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon style={{ width: 11, height: 11, color }} strokeWidth={2} />
          </div>
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase flex-1" style={{ color }}>
            {label}
          </span>
          <span
            className="font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
            style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
          >
            {stageTargets.length}
          </span>
        </div>
        <div className="h-px rounded-full" style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }} />
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 p-2 flex-1 min-h-[140px] transition-colors duration-150"
      >
        {isLoading ? (
          [1, 2].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />)
        ) : stageTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 py-6">
            <div className="w-px h-6" style={{ background: BDR }} />
            <span className="font-mono text-[9px] uppercase text-center leading-loose" style={{ color: isOver ? `${color}80` : "rgba(255,255,255,0.1)" }}>
              {isOver ? "Soltar aqui" : "Nenhum\ntarget"}
            </span>
            <div className="w-px h-6" style={{ background: BDR }} />
          </div>
        ) : stageTargets.map(t => (
          <KanbanCard key={t.id} target={t} onOpenDetail={onOpenDetail} />
        ))}
      </div>
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
    <div className="space-y-5">

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="m3-page-title">
            <span className="block sm:hidden">Targets</span>
            <span className="hidden sm:block">Monitoramento</span>
          </h1>
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full font-mono text-[10px] font-bold text-white" style={{ background: ACCENT }}>
            {targets.length}
          </span>
        </div>
        <button
          onClick={() => setFormModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[11px] tracking-[0.1em] uppercase text-white transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: ACCENT }}
          onMouseEnter={e => (e.currentTarget.style.background = "#c9112e")}
          onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Target</span>
        </button>
      </div>

      {/* ── FUNNEL STRIP ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KANBAN_STAGES.map(({ key, label, color, Icon }) => (
          <FunnelCard
            key={key}
            label={label}
            color={color}
            Icon={Icon}
            count={statusCounts[key]}
            total={targets.length}
            loading={isLoading}
          />
        ))}
      </div>

      {/* ── KANBAN ────────────────────────────────────────────────────── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {KANBAN_STAGES.map(({ key, label, color, Icon }) => (
            <KanbanColumn
              key={key} stageKey={key} label={label} color={color} Icon={Icon}
              stageTargets={targetsByStatus[key] || []}
              isLoading={isLoading}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTarget ? <div style={{ width: 220 }}><CardVisual target={activeTarget} isOverlay /></div> : null}
        </DragOverlay>
      </DndContext>

      {/* ── FOOTER PANELS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">

        {/* Atividade Recente */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: BG2, borderColor: BDR }}>
          <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: BDR }}>
            <span className="font-mono text-[10px] font-semibold" style={{ color: ACCENT }}>01</span>
            <div className="h-px w-5" style={{ background: BDR }} />
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>Atividade Recente</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {recentActivity.length === 0 ? (
              <p className="font-mono text-[10px] uppercase py-4 text-center" style={{ color: "rgba(255,255,255,0.1)" }}>
                Nenhuma atividade registrada
              </p>
            ) : recentActivity.map(obs => {
              const stageCfg = KANBAN_STAGES.find(s => s.key === obs.targets?.status);
              const dot = stageCfg?.color ?? MUTED;
              return (
                <div key={obs.id} className="flex items-start gap-3 group">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none" style={{ background: dot }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] leading-snug" style={{ color: MUTED }}>
                      <span className="font-semibold" style={{ color: FG }}>{obs.targets?.name}</span>
                      {obs.qualitative_notes
                        ? <> — <span className="line-clamp-1">{obs.qualitative_notes}</span></>
                        : <> — Observação registrada</>
                      }
                    </p>
                    {obs.performance_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const full = obs.performance_rating! / 2;
                          const fill = full >= i + 1 ? "#ec4525" : full >= i + 0.5 ? "#ec452580" : "rgba(255,255,255,0.1)";
                          return <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: fill }} />;
                        })}
                        <span className="font-mono text-[9px] ml-1" style={{ color: MUTED }}>{obs.performance_rating}/10</span>
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-[10px] flex-none mt-0.5" style={{ color: "rgba(255,255,255,0.18)" }}>
                    {timeAgo(obs.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Score Ranking */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: BG2, borderColor: BDR }}>
          <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: BDR }}>
            <span className="font-mono text-[10px] font-semibold" style={{ color: ACCENT }}>02</span>
            <div className="h-px w-5" style={{ background: BDR }} />
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>Market Score</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {top5.length === 0 ? (
              <p className="font-mono text-[10px] uppercase py-4 text-center" style={{ color: "rgba(255,255,255,0.1)" }}>
                Sem scores calculados
              </p>
            ) : top5.map((t, i) => {
              const score = t.market_score!.score_total;
              const bar   = scoreColor(score);
              const trend = t.market_score!.trend_30d;
              const grade = (t as any).recommendation_grade as string | undefined;
              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenDetail(t)}
                  className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/[0.03]"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = BDR)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                >
                  {/* Rank */}
                  <span className="font-mono text-[10px] w-4 text-right flex-none" style={{ color: i === 0 ? ACCENT : MUTED }}>
                    {i + 1}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-lg flex-none overflow-hidden flex items-center justify-center text-[9px] font-bold font-mono"
                    style={{ background: `${bar}18`, border: `1px solid ${bar}30`, color: bar }}
                  >
                    {t.photo_url
                      ? <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                      : initials(t.name)
                    }
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-semibold text-[11px] uppercase truncate flex-1" style={{ color: FG }}>
                        {t.name}
                      </span>
                      {grade && GRADE_COLOR[grade] && (
                        <span className="font-mono text-[9px] px-1 rounded" style={{ color: GRADE_COLOR[grade], background: `${GRADE_COLOR[grade]}15` }}>
                          {grade}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${bar}80, ${bar})` }} />
                      </div>
                    </div>
                  </div>

                  {/* Score + trend */}
                  <div className="flex flex-col items-end flex-none gap-0.5">
                    <span className="font-display font-bold text-[14px] tabular-nums" style={{ color: bar }}>
                      {score.toFixed(0)}
                    </span>
                    {trend === "UP"     && <TrendingUp   className="w-3 h-3 text-emerald-400" />}
                    {trend === "DOWN"   && <TrendingDown  className="w-3 h-3 text-red-400" />}
                    {trend === "STABLE" && <Minus         className="w-3 h-3" style={{ color: MUTED }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      <TargetFormModal open={formModalOpen} onOpenChange={handleCloseForm} target={editTarget} onSuccess={handleSuccess} />
      <TargetDetailModal open={detailModalOpen} onOpenChange={setDetailModalOpen} target={selectedTarget} onEdit={handleEdit} onSuccess={handleSuccess} />
    </div>
  );
}
