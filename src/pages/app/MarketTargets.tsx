import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Handshake, CheckCircle2, XCircle, Plus } from "lucide-react";
import { Target as TargetType, MarketScoreTrend } from "@/types/marketScore";
import { TargetFormModal } from "@/components/market/TargetFormModal";
import { TargetDetailModal } from "@/components/market/TargetDetailModal";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

// ============ TYPES ============

interface TargetWithScore extends TargetType {
  market_score: {
    score_total: number;
    confidence_level: number;
    trend_30d: MarketScoreTrend;
  } | null;
}

type ActivityRow = {
  id: string;
  target_id: string;
  qualitative_notes: string | null;
  performance_rating: number | null;
  created_at: string;
  targets: { name: string; status: string } | null;
};

// ============ STAGE CONFIG ============

const KANBAN_STAGES = [
  { key: "MONITORING"  as const, label: "Monitorando", color: "#9B6DFF", Icon: Eye },
  { key: "NEGOTIATION" as const, label: "Negociação",  color: "#E8C84A", Icon: Handshake },
  { key: "SIGNED"      as const, label: "Contratado",  color: "#2DCE8A", Icon: CheckCircle2 },
  { key: "DROPPED"     as const, label: "Descartado",  color: "#e5173f", Icon: XCircle },
] as const;

type StageKey = typeof KANBAN_STAGES[number]["key"];

// ============ DESIGN TOKENS ============

const ACCENT      = "#ec4525";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";

// ============ HELPERS ============

function getScoreBarColor(score: number): string {
  if (score >= 80) return "#2DCE8A";
  if (score >= 65) return "#E8C84A";
  if (score >= 45) return "#FF8C42";
  return "#e5173f";
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function getAge(t: TargetWithScore): number | null {
  if (t.age_estimate) return t.age_estimate;
  if (t.birth_date) return new Date().getFullYear() - new Date(t.birth_date).getFullYear();
  return null;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ============ SECTION HEAD ============

function SectionHead({ n, children, action }: { n?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-center gap-2">
        {n && (
          <span className="font-editorial-mono text-[10px] tracking-[0.14em]" style={{ color: ACCENT }}>{n}</span>
        )}
        <span className="font-editorial-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>──</span>
        <span className="font-editorial-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: TEXT }}>{children}</span>
      </div>
      {action}
    </div>
  );
}

// ============ CARD VISUAL ============

function CardVisual({ target, isOverlay = false }: { target: TargetWithScore; isOverlay?: boolean }) {
  const age = getAge(target);
  const hasScore = target.market_score !== null;
  const dotColor = hasScore ? getScoreBarColor(target.market_score!.score_total) : MUTED;
  const meta = [target.position, age ? `${age}a` : null, target.current_club].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-xl border transition-colors duration-[250ms]"
      style={{
        background: isOverlay ? "#1a1a1c" : CARD_BG,
        borderColor: isOverlay ? "rgba(255,255,255,0.18)" : CARD_BORDER,
        padding: "10px 12px",
        boxShadow: isOverlay ? "0 16px 48px rgba(0,0,0,0.8)" : "none",
        transform: isOverlay ? "scale(1.04) rotate(1deg)" : "none",
        cursor: isOverlay ? "grabbing" : "grab",
      }}
    >
      <div className="flex gap-2 items-start mb-2.5">
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}
        >
          {target.photo_url ? (
            <img src={target.photo_url} alt={target.name} className="w-full h-full object-cover object-top" loading="lazy" decoding="async" />
          ) : (
            <span className="font-editorial-mono text-[10px] font-bold" style={{ color: MUTED }}>
              {getInitials(target.name)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[12px] uppercase truncate" style={{ color: TEXT }}>
            {target.name}
          </div>
          {meta && (
            <div className="font-editorial-mono text-[9px] truncate mt-0.5" style={{ color: MUTED }}>
              {meta}
            </div>
          )}
        </div>
      </div>
      <div
        className="flex items-center justify-between pt-2"
        style={{ borderTop: `1px solid ${CARD_BORDER}` }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
          <span className="font-editorial-mono text-[10px]" style={{ color: hasScore ? TEXT : MUTED }}>
            {hasScore ? target.market_score!.score_total.toFixed(0) : "—"}
          </span>
        </div>
        <span
          className="font-editorial-mono text-[9px] uppercase px-1.5 py-0.5 rounded-md"
          style={{ color: MUTED, border: `1px solid ${CARD_BORDER}` }}
        >
          {target.position}
        </span>
      </div>
    </div>
  );
}

// ============ KANBAN CARD ============

function KanbanCard({ target, onOpenDetail }: { target: TargetWithScore; onOpenDetail: (t: TargetWithScore) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: target.id,
    data: { target },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpenDetail(target)}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none", transition: "opacity 0.15s ease" }}
    >
      <CardVisual target={target} />
    </div>
  );
}

// ============ KANBAN COLUMN ============

interface KanbanColumnProps {
  stageKey: StageKey;
  label: string;
  color: string;
  stageTargets: TargetWithScore[];
  isLoading: boolean;
  onOpenDetail: (t: TargetWithScore) => void;
}

function KanbanColumn({ stageKey, label, color, stageTargets, isLoading, onOpenDetail }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });

  return (
    <div
      className="rounded-xl border flex flex-col transition-colors duration-150"
      style={{
        background: CARD_BG,
        borderColor: isOver ? `${color}50` : CARD_BORDER,
      }}
    >
      {/* Column header */}
      <div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="font-editorial-mono text-[10px] tracking-[0.1em] uppercase flex-1" style={{ color }}>
            {label}
          </span>
          <span
            className="font-editorial-mono text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ color: MUTED, border: `1px solid ${CARD_BORDER}` }}
          >
            {stageTargets.length}
          </span>
        </div>
        <div className="h-[2px] rounded-full mx-3 mb-1 transition-opacity duration-150" style={{ background: color, opacity: isOver ? 1 : 0.5 }} />
      </div>

      {/* Droppable content */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 p-2 flex-1 min-h-[120px] rounded-b-xl transition-colors duration-150"
        style={{ background: isOver ? `${color}08` : "transparent" }}
      >
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : stageTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <div className="w-px h-8" style={{ background: CARD_BORDER }} />
            <span
              className="font-editorial-mono text-[9px] uppercase text-center leading-relaxed transition-colors duration-150"
              style={{ color: isOver ? `${color}90` : "rgba(255,255,255,0.1)" }}
            >
              {isOver ? "Soltar aqui" : <>Nenhum<br />target</>}
            </span>
            <div className="w-px h-8" style={{ background: CARD_BORDER }} />
          </div>
        ) : stageTargets.map(target => (
          <KanbanCard key={target.id} target={target} onOpenDetail={onOpenDetail} />
        ))}
      </div>
    </div>
  );
}

// ============ COMPONENT ============

export default function MarketTargets() {
  const queryClient = useQueryClient();
  const [formModalOpen, setFormModalOpen]   = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetWithScore | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editTarget, setEditTarget]         = useState<TargetWithScore | null>(null);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["market-targets"],
    queryFn: async () => {
      const { data: targetsData, error: targetsError } = await supabase
        .from("targets")
        .select("*")
        .order("created_at", { ascending: false });
      if (targetsError) throw targetsError;

      const { data: scoresData, error: scoresError } = await supabase
        .from("market_scores")
        .select("target_id, score_total, confidence_level, trend_30d")
        .eq("type", "TARGET");
      if (scoresError) throw scoresError;

      const scoreMap = new Map<string, typeof scoresData[0]>();
      scoresData?.forEach(s => { if (s.target_id) scoreMap.set(s.target_id, s); });

      return (targetsData || []).map(t => ({
        ...t,
        tags: t.tags || [],
        market_score: scoreMap.get(t.id)
          ? {
              score_total:       scoreMap.get(t.id)!.score_total,
              confidence_level:  scoreMap.get(t.id)!.confidence_level,
              trend_30d:         scoreMap.get(t.id)!.trend_30d as MarketScoreTrend,
            }
          : null,
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
    const grouped: Record<string, TargetWithScore[]> = {
      MONITORING: [], APPROACH: [], NEGOTIATION: [], DROPPED: [], SIGNED: [],
    };
    targets.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); });
    Object.values(grouped).forEach(arr =>
      arr.sort((a, b) => (b.market_score?.score_total ?? 0) - (a.market_score?.score_total ?? 0))
    );
    return grouped;
  }, [targets]);

  const statusCounts = useMemo(() => ({
    MONITORING:  targetsByStatus.MONITORING.length,
    NEGOTIATION: targetsByStatus.NEGOTIATION.length,
    SIGNED:      targetsByStatus.SIGNED.length,
    DROPPED:     targetsByStatus.DROPPED.length,
  }), [targetsByStatus]);

  const top5 = useMemo(() =>
    [...targets]
      .filter(t => t.market_score)
      .sort((a, b) => (b.market_score?.score_total ?? 0) - (a.market_score?.score_total ?? 0))
      .slice(0, 5),
    [targets]
  );

  const handleOpenDetail = (target: TargetWithScore) => { setSelectedTarget(target); setDetailModalOpen(true); };
  const handleEdit       = (target: TargetWithScore) => { setEditTarget(target); setFormModalOpen(true); };
  const handleCloseForm  = () => { setFormModalOpen(false); setEditTarget(null); };
  const handleSuccess    = () => {
    queryClient.invalidateQueries({ queryKey: ["market-targets"] });
    queryClient.invalidateQueries({ queryKey: ["target-activity"] });
    handleCloseForm();
    setDetailModalOpen(false);
  };

  const [activeTarget, setActiveTarget] = useState<TargetWithScore | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTarget(targets.find(x => x.id === event.active.id) ?? null);
  }, [targets]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTarget(null);
    if (!over) return;
    const newStatus = over.id as StageKey;
    const dragged = targets.find(t => t.id === active.id);
    if (!dragged || dragged.status === newStatus) return;

    queryClient.setQueryData<TargetWithScore[]>(["market-targets"], old =>
      old?.map(t => t.id === dragged.id ? { ...t, status: newStatus } : t) ?? []
    );

    supabase
      .from("targets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", dragged.id)
      .then(({ error }) => {
        if (error) queryClient.invalidateQueries({ queryKey: ["market-targets"] });
      });
  }, [targets, queryClient]);

  // ============ RENDER ============

  return (
    <div className="space-y-4">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="m3-page-title">
            <span className="block sm:hidden">Targets</span>
            <span className="hidden sm:block">Monitoramento</span>
          </h1>
          <span
            className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full font-editorial-mono text-[10px] font-bold text-white"
            style={{ background: ACCENT }}
          >
            {targets.length}
          </span>
        </div>
        <div>
          <button
            className="sm:hidden p-1 transition-colors"
            onClick={() => setFormModalOpen(true)}
            aria-label="Novo target"
            style={{ color: MUTED }}
          >
            <Plus className="w-[18px] h-[18px]" />
          </button>
          <button
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full font-editorial-mono text-[11px] tracking-[0.1em] uppercase text-white transition-colors duration-150"
            onClick={() => setFormModalOpen(true)}
            style={{ background: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.background = "#c9112e")}
            onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Target
          </button>
        </div>
      </div>

      {/* ── FUNNEL STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KANBAN_STAGES.map(({ key, label, color, Icon }) => (
          <div
            key={key}
            className="rounded-xl border p-4"
            style={{ background: CARD_BG, borderColor: CARD_BORDER, borderTop: `2px solid ${color}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-editorial-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
                {label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}40` }}
              >
                <Icon style={{ width: 13, height: 13, color }} strokeWidth={1.5} />
              </div>
            </div>
            <div className="font-display font-bold text-4xl leading-none mb-1.5" style={{ color: TEXT }}>
              {isLoading
                ? <Skeleton className="h-9 w-10 rounded-lg" />
                : statusCounts[key]}
            </div>
            <div className="font-editorial-mono text-[9px] uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.15)" }}>
              atletas no funil
            </div>
          </div>
        ))}
      </div>

      {/* ── KANBAN ── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {KANBAN_STAGES.map(({ key, label, color }) => (
            <KanbanColumn
              key={key}
              stageKey={key}
              label={label}
              color={color}
              stageTargets={targetsByStatus[key] || []}
              isLoading={isLoading}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTarget ? (
            <div style={{ width: 220 }}>
              <CardVisual target={activeTarget} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── FOOTER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
        {/* Atividade Recente */}
        <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <SectionHead n="01">Atividade Recente</SectionHead>
          <div className="p-4 flex flex-col gap-2.5">
            {recentActivity.length === 0 ? (
              <span className="font-editorial-mono text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>
                Nenhuma atividade registrada
              </span>
            ) : recentActivity.map(obs => {
              const stageConf = KANBAN_STAGES.find(s => s.key === obs.targets?.status);
              const dotColor = stageConf?.color ?? MUTED;
              return (
                <div key={obs.id} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                  <span className="text-[12px] flex-1 truncate" style={{ color: MUTED }}>
                    <strong style={{ color: TEXT, fontWeight: 600 }}>{obs.targets?.name}</strong>
                    {obs.qualitative_notes ? ` — ${obs.qualitative_notes}` : " — Observação registrada"}
                  </span>
                  <span className="font-editorial-mono text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {formatTimeAgo(obs.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Score Ranking */}
        <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <SectionHead n="02">Market Score</SectionHead>
          <div className="p-4 flex flex-col gap-3">
            {top5.length === 0 ? (
              <span className="font-editorial-mono text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>
                Sem scores calculados
              </span>
            ) : top5.map(target => {
              const score = target.market_score!.score_total;
              const barColor = getScoreBarColor(score);
              return (
                <div key={target.id} onClick={() => handleOpenDetail(target)} className="cursor-pointer group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="font-display font-semibold text-[12px] uppercase flex-1 truncate transition-colors duration-150 group-hover:text-white"
                      style={{ color: TEXT }}
                    >
                      {target.name}
                    </span>
                    <span className="font-editorial-mono text-[11px] flex-shrink-0 ml-2" style={{ color: barColor }}>
                      {score.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${score}%`, background: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <TargetFormModal
        open={formModalOpen}
        onOpenChange={handleCloseForm}
        target={editTarget}
        onSuccess={handleSuccess}
      />
      <TargetDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        target={selectedTarget}
        onEdit={handleEdit}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
