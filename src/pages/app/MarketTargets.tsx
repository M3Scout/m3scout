/**
 * Market Targets Page — Technical Minimalist
 * Logic: unchanged. UI: complete overhaul per spec.
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Handshake, CheckCircle2 } from "lucide-react";
import { Target as TargetType, MarketScoreTrend } from "@/types/marketScore";
import { TargetFormModal } from "@/components/market/TargetFormModal";
import { TargetDetailModal } from "@/components/market/TargetDetailModal";

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
  { key: "MONITORING" as const, label: "MONITORANDO", color: "#9B6DFF", Icon: Eye },
  { key: "APPROACH"   as const, label: "ABORDAGEM",   color: "#FF8C42", Icon: Users },
  { key: "NEGOTIATION"as const, label: "NEGOCIAÇÃO",  color: "#E8C84A", Icon: Handshake },
  { key: "SIGNED"     as const, label: "CONTRATADO",  color: "#2DCE8A", Icon: CheckCircle2 },
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
    APPROACH:    targetsByStatus.APPROACH.length,
    NEGOTIATION: targetsByStatus.NEGOTIATION.length,
    SIGNED:      targetsByStatus.SIGNED.length,
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

  // ============ RENDER ============

  const BORDER = "1px solid rgba(255,255,255,0.07)";
  const CONDENSED = '"Barlow Condensed", sans-serif';
  const MONO = '"JetBrains Mono", monospace';

  return (
    <div>

      {/* ===== HEADER ===== */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingBottom: 20,
        marginBottom: 20,
        borderBottom: BORDER,
      }}>
        <div style={{
          fontFamily: CONDENSED,
          fontWeight: 900,
          fontSize: 52,
          textTransform: "uppercase",
          lineHeight: 0.88,
          color: "#fff",
          letterSpacing: "-0.01em",
        }}>
          <div>FUNIL</div>
          <div>DE TARGETS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16 }}>
          <div style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#444",
            textAlign: "right",
            lineHeight: 1.7,
            textTransform: "uppercase",
          }}>
            <div>MERCADO · CAPTAÇÃO</div>
            <div>MARKET SCORE ATIVO</div>
            <div>MAI 2026</div>
          </div>
          <button
            onClick={() => setFormModalOpen(true)}
            style={{
              padding: "8px 16px",
              background: "#E5173F",
              border: "none",
              color: "#fff",
              fontFamily: CONDENSED,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            + NOVO TARGET
          </button>
        </div>
      </div>

      {/* ===== FUNNEL STRIP ===== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1px",
        border: BORDER,
        background: "rgba(255,255,255,0.07)",
        marginBottom: 20,
      }}>
        {KANBAN_STAGES.map(({ key, label, color, Icon }) => (
          <div key={key} style={{
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
              <span style={{
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

            <div style={{
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
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          minWidth: 900,
        }}>
          {KANBAN_STAGES.map(({ key, label, color }) => {
            const stageTargets = targetsByStatus[key] || [];

            return (
              <div key={key} style={{
                background: "#111111",
                border: BORDER,
                display: "flex",
                flexDirection: "column",
              }}>
                {/* Column header */}
                <div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px 10px",
                  }}>
                    <span style={{
                      color,
                      fontFamily: CONDENSED,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      color: "#444",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "1px 6px",
                    }}>
                      {stageTargets.length}
                    </span>
                  </div>
                  <div style={{ height: 2, background: color }} />
                </div>

                {/* Column content */}
                <div style={{
                  padding: "10px 8px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                  minHeight: 180,
                }}>
                  {isLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-none" />)}
                    </div>
                  ) : stageTargets.length === 0 ? (
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                    }}>
                      <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.05)" }} />
                      <div style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        color: "#2a2a2a",
                        textTransform: "uppercase",
                        textAlign: "center",
                        lineHeight: 1.6,
                        padding: "8px 0",
                      }}>
                        Nenhum target<br />nesta etapa
                      </div>
                      <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  ) : stageTargets.map(target => {
                    const age = getAge(target);
                    const hasScore = target.market_score !== null;
                    const dotColor = hasScore ? getScoreBarColor(target.market_score!.score_total) : "#2a2a2a";
                    const meta = [
                      target.position,
                      age ? `${age}a` : null,
                      target.current_club,
                    ].filter(Boolean).join(" · ");

                    return (
                      <div
                        key={target.id}
                        onClick={() => handleOpenDetail(target)}
                        style={{
                          background: "#181818",
                          border: BORDER,
                          padding: "11px 13px",
                          cursor: "pointer",
                        }}
                      >
                        {/* Top: avatar + name + meta */}
                        <div style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}>
                          <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "#1e1e1e",
                            border: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden",
                          }}>
                            {target.photo_url ? (
                              <img
                                src={target.photo_url}
                                alt={target.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span style={{
                                fontFamily: CONDENSED,
                                fontWeight: 700,
                                fontSize: 11,
                                color: "#555",
                              }}>
                                {getInitials(target.name)}
                              </span>
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: CONDENSED,
                              fontWeight: 700,
                              fontSize: 13,
                              textTransform: "uppercase",
                              color: "#ddd",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}>
                              {target.name}
                            </div>
                            {meta && (
                              <div style={{
                                fontFamily: MONO,
                                fontSize: 9,
                                color: "#444",
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}>
                                {meta}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom: score dot + position tag */}
                        <div style={{
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          paddingTop: 7,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: dotColor,
                              display: "inline-block",
                              flexShrink: 0,
                            }} />
                            <span style={{
                              fontFamily: MONO,
                              fontSize: 10,
                              color: hasScore ? "#888" : "#333",
                            }}>
                              {hasScore ? target.market_score!.score_total.toFixed(0) : "—"}
                            </span>
                          </div>
                          <span style={{
                            fontFamily: MONO,
                            fontSize: 9,
                            color: "#444",
                            border: "1px solid rgba(255,255,255,0.07)",
                            padding: "1px 5px",
                            textTransform: "uppercase",
                          }}>
                            {target.position}
                          </span>
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

      {/* ===== FOOTER (2 cols) ===== */}
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 12,
          minWidth: 600,
        }}>
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
