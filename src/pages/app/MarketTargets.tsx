/**
 * Market Targets Page — Technical Minimalist
 * Logic: unchanged. UI: complete overhaul per spec.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Handshake, CheckCircle2, XCircle } from "lucide-react";
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
import { CSS } from "@dnd-kit/utilities";

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
  { key: "MONITORING"  as const, label: "MONITORANDO", color: "#9B6DFF", Icon: Eye },
  { key: "NEGOTIATION" as const, label: "NEGOCIAÇÃO",  color: "#E8C84A", Icon: Handshake },
  { key: "SIGNED"      as const, label: "CONTRATADO",  color: "#2DCE8A", Icon: CheckCircle2 },
  { key: "DROPPED"     as const, label: "DESCARTADO",  color: "#E5173F", Icon: XCircle },
] as const;

type StageKey = typeof KANBAN_STAGES[number]["key"];

// ============ HELPERS ============

function getScoreBarColor(score: number): string {
  if (score >= 80) return "#2DCE8A";
  if (score >= 65) return "#E8C84A";
  if (score >= 45) return "#FF8C42";
  return "#E5173F";
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

// ============ MODULE-LEVEL STYLE CONSTANTS ============

const BORDER = "1px solid rgba(255,255,255,0.07)";
const CONDENSED = '"Barlow Condensed", sans-serif';
const MONO = '"JetBrains Mono", monospace';

// ============ CARD VISUAL (pure, no hooks — used by overlay too) ============

function CardVisual({ target, isOverlay = false }: { target: TargetWithScore; isOverlay?: boolean }) {
  const age = getAge(target);
  const hasScore = target.market_score !== null;
  const dotColor = hasScore ? getScoreBarColor(target.market_score!.score_total) : "#2a2a2a";
  const meta = [target.position, age ? `${age}a` : null, target.current_club].filter(Boolean).join(" · ");

  return (
    <div style={{
      background: "#181818",
      border: isOverlay ? "1px solid rgba(255,255,255,0.18)" : BORDER,
      padding: "11px 13px",
      boxShadow: isOverlay ? "0 16px 48px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)" : "none",
      transform: isOverlay ? "scale(1.04) rotate(1deg)" : "none",
      cursor: isOverlay ? "grabbing" : "grab",
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          {target.photo_url ? (
            <img src={target.photo_url} alt={target.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: CONDENSED, fontWeight: 700, fontSize: 11, color: "#555" }}>
              {getInitials(target.name)}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: CONDENSED, fontWeight: 700, fontSize: 13,
            textTransform: "uppercase", color: "#ddd",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {target.name}
          </div>
          {meta && (
            <div style={{
              fontFamily: MONO, fontSize: 9, color: "#444", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {meta}
            </div>
          )}
        </div>
      </div>
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 7,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: hasScore ? "#888" : "#333" }}>
            {hasScore ? target.market_score!.score_total.toFixed(0) : "—"}
          </span>
        </div>
        <span style={{
          fontFamily: MONO, fontSize: 9, color: "#444",
          border: "1px solid rgba(255,255,255,0.07)", padding: "1px 5px", textTransform: "uppercase",
        }}>
          {target.position}
        </span>
      </div>
    </div>
  );
}

// ============ KANBAN CARD (draggable) ============

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
      style={{
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
        transition: "opacity 0.15s ease",
      }}
    >
      <CardVisual target={target} />
    </div>
  );
}

// ============ KANBAN COLUMN (droppable) ============

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
    <div className="mt-kanban-col" style={{
      background: "#111111",
      border: isOver ? `1px solid ${color}50` : BORDER,
      display: "flex",
      flexDirection: "column",
      transition: "border-color 0.15s ease",
    }}>
      {/* Column header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 10px" }}>
          <span style={{
            color, fontFamily: CONDENSED, fontWeight: 700, fontSize: 13,
            letterSpacing: "0.06em", textTransform: "uppercase", flex: 1,
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 10, color: "#444",
            border: "1px solid rgba(255,255,255,0.1)", padding: "1px 6px",
          }}>
            {stageTargets.length}
          </span>
        </div>
        <div style={{ height: 2, background: color, opacity: isOver ? 1 : 0.7, transition: "opacity 0.15s ease" }} />
      </div>
      {/* Droppable content area */}
      <div
        ref={setNodeRef}
        style={{
          padding: "10px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          minHeight: 120,
          background: isOver ? `${color}0c` : "transparent",
          transition: "background 0.15s ease",
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-none" />)}
          </div>
        ) : stageTargets.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.05)" }} />
            <div style={{
              fontFamily: MONO, fontSize: 10,
              color: isOver ? `${color}90` : "#2a2a2a",
              textTransform: "uppercase", textAlign: "center",
              lineHeight: 1.6, padding: "8px 0",
              transition: "color 0.15s ease",
            }}>
              {isOver ? <>Soltar aqui</> : <>Nenhum target<br />nesta etapa</>}
            </div>
            <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.05)" }} />
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
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetWithScore | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetWithScore | null>(null);

  // ---- Targets + scores query (unchanged logic) ----
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
              score_total: scoreMap.get(t.id)!.score_total,
              confidence_level: scoreMap.get(t.id)!.confidence_level,
              trend_30d: scoreMap.get(t.id)!.trend_30d as MarketScoreTrend,
            }
          : null,
      })) as TargetWithScore[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // ---- Activity query (new) ----
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

  // ---- Derived data (unchanged logic) ----
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

  // ---- Handlers (unchanged logic) ----
  const handleOpenDetail = (target: TargetWithScore) => {
    setSelectedTarget(target);
    setDetailModalOpen(true);
  };
  const handleEdit = (target: TargetWithScore) => {
    setEditTarget(target);
    setFormModalOpen(true);
  };
  const handleCloseForm = () => { setFormModalOpen(false); setEditTarget(null); };
  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["market-targets"] });
    queryClient.invalidateQueries({ queryKey: ["target-activity"] });
    handleCloseForm();
    setDetailModalOpen(false);
  };

  // ---- DnD state & sensors ----
  const [activeTarget, setActiveTarget] = useState<TargetWithScore | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const t = targets.find(x => x.id === event.active.id);
    setActiveTarget(t ?? null);
  }, [targets]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTarget(null);
    if (!over) return;
    const newStatus = over.id as StageKey;
    const dragged = targets.find(t => t.id === active.id);
    if (!dragged || dragged.status === newStatus) return;

    // Optimistic update
    queryClient.setQueryData<TargetWithScore[]>(["market-targets"], old =>
      old?.map(t => t.id === dragged.id ? { ...t, status: newStatus } : t) ?? []
    );

    // Persist
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
    <div className="market-targets-page">
      <style>{`
        .mt-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: ${BORDER};
        }
        .mt-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 16px;
        }
        .mt-funnel-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          border: ${BORDER};
          background: rgba(255,255,255,0.07);
          margin-bottom: 20px;
        }
        .mt-kanban-scroll {
          margin-bottom: 20px;
        }
        .mt-kanban-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .mt-footer-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 12px;
        }

        @media (max-width: 767px) {
          .mt-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .mt-header-right {
            align-items: flex-start;
            width: 100%;
          }
          .mt-header-right .mt-header-meta {
            text-align: left;
          }
          .mt-header-right button {
            width: 100%;
          }
          .mt-funnel-strip {
            grid-template-columns: repeat(2, 1fr);
          }
          .mt-funnel-cell {
            padding: 14px 16px 12px !important;
          }
          .mt-funnel-label {
            font-size: 10px !important;
            white-space: nowrap;
          }
          .mt-funnel-number {
            font-size: 30px !important;
          }
          .mt-kanban-grid {
            grid-template-columns: 1fr;
          }
          .mt-kanban-col {
            margin-bottom: 4px;
          }
          .mt-footer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="mt-header">
        <h1 className="m3-page-title">MONITORAMENTO</h1>

        <div className="mt-header-right">
          <button
            onClick={() => setFormModalOpen(true)}
            style={{
              padding: "10px 20px",
              background: "#E5173F",
              border: "none",
              borderRadius: 9999,
              color: "#fff",
              fontFamily: CONDENSED,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            + NOVO TARGET
          </button>
        </div>
      </div>

      {/* ===== FUNNEL STRIP ===== */}
      <div className="mt-funnel-strip">
        {KANBAN_STAGES.map(({ key, label, color, Icon }) => (
          <div key={key} className="mt-funnel-cell" style={{
            background: "#111111",
            padding: "18px 22px 16px",
            borderTop: `2px solid ${color}`,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span className="mt-funnel-label" style={{
                fontFamily: MONO,
                fontSize: 9,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}>
                {label}
              </span>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: `${color}18`,
                border: `1px solid ${color}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon style={{ width: 14, height: 14, color }} strokeWidth={1.5} />
              </div>
            </div>

            <div className="mt-funnel-number" style={{
              fontFamily: CONDENSED,
              fontWeight: 900,
              fontSize: 38,
              lineHeight: 1,
              color: "#fff",
              marginBottom: 6,
              minHeight: 38,
            }}>
              {isLoading
                ? <Skeleton className="h-9 w-10 rounded-none" />
                : statusCounts[key]}
            </div>

            <div style={{
              fontFamily: MONO,
              fontSize: 9,
              color: "#3a3a3a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              atletas no funil
            </div>
          </div>
        ))}
      </div>

      {/* ===== KANBAN ===== */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="mt-kanban-scroll" style={{ overflowX: "auto" }}>
          <div className="mt-kanban-grid" style={{ minWidth: 900 }}>
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
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTarget ? (
            <div style={{ width: 220 }}>
              <CardVisual target={activeTarget} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ===== FOOTER (2 cols → stacked on mobile) ===== */}
      <div className="mt-footer-grid">
        {/* Left: Atividade Recente */}
        <div style={{ background: "#111111", border: BORDER }}>
          <div style={{
            padding: "13px 18px",
            borderBottom: BORDER,
          }}>
            <span style={{
              fontFamily: CONDENSED,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#ccc",
            }}>
              <span style={{ color: "#E5173F" }}>//</span>{" "}ATIVIDADE RECENTE
            </span>
          </div>
          <div style={{
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}>
            {recentActivity.length === 0 ? (
              <span style={{
                fontFamily: MONO,
                fontSize: 10,
                color: "#333",
                textTransform: "uppercase",
              }}>
                Nenhuma atividade registrada
              </span>
            ) : recentActivity.map(obs => {
              const stageConf = KANBAN_STAGES.find(s => s.key === obs.targets?.status);
              const dotColor = stageConf?.color ?? "#444";
              return (
                <div key={obs.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: dotColor,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: '"Barlow", sans-serif',
                    fontSize: 12,
                    color: "#666",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    <strong style={{ color: "#888", fontWeight: 600 }}>
                      {obs.targets?.name}
                    </strong>
                    {obs.qualitative_notes
                      ? ` — ${obs.qualitative_notes}`
                      : " — Observação registrada"}
                  </span>
                  <span style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    color: "#333",
                    flexShrink: 0,
                  }}>
                    {formatTimeAgo(obs.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Market Score Ranking */}
        <div style={{ background: "#111111", border: BORDER }}>
          <div style={{
            padding: "13px 18px",
            borderBottom: BORDER,
          }}>
            <span style={{
              fontFamily: CONDENSED,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#ccc",
            }}>
              <span style={{ color: "#E5173F" }}>//</span>{" "}MARKET SCORE
            </span>
          </div>
          <div style={{
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            {top5.length === 0 ? (
              <span style={{
                fontFamily: MONO,
                fontSize: 10,
                color: "#333",
                textTransform: "uppercase",
              }}>
                Sem scores calculados
              </span>
            ) : top5.map(target => {
              const score = target.market_score!.score_total;
              const barColor = getScoreBarColor(score);
              return (
                <div
                  key={target.id}
                  onClick={() => handleOpenDetail(target)}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}>
                    <span style={{
                      fontFamily: CONDENSED,
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "#888",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {target.name}
                    </span>
                    <span style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      color: barColor,
                      flexShrink: 0,
                      marginLeft: 10,
                    }}>
                      {score.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
                    <div style={{
                      height: "100%",
                      width: `${score}%`,
                      background: barColor,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== MODALS (unchanged) ===== */}
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
