import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, ChevronRight, Lightbulb, X, ChevronLeft, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildInsights, groupInsightsByPlayer, CAT,
  type InsightCategory, type PlayerInsightGroup,
  type AggregateRow, type GoalRow, type ContractRow, type PhysicalRow,
} from "@/lib/insightsEngine";

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG      = "#0f0e13";
const BDR     = "rgba(255,255,255,0.07)";
const MUTED   = "#62616a";
const FG      = "#ededee";

// ─── LocalStorage dismiss ─────────────────────────────────────────────────────

const LS_KEY = "dismissed_insights_v2";

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveDismissed(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

// ─── LocalStorage "reviewed" tracking ───────────────────────────────────────
// Lightweight audit trail: unlike dismiss (hides forever), marking an athlete
// as reviewed just timestamps that an admin has seen/handled their insights —
// the card stays visible until the underlying data actually improves. Scoped
// to this browser only, same as dismiss; not shared across admins/devices.

const REVIEWED_LS_KEY = "reviewed_insights_v1";

function getReviewed(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(REVIEWED_LS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveReviewed(map: Record<string, string>) {
  localStorage.setItem(REVIEWED_LS_KEY, JSON.stringify(map));
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

// ─── Category filter pill ─────────────────────────────────────────────────────

type FilterValue = "all" | InsightCategory;

function FilterPill({
  label, count, active, color, onClick,
}: { label: string; count: number; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-200 shrink-0"
      style={{
        background: active ? `${color}22` : "rgba(255,255,255,0.04)",
        border:     `1px solid ${active ? color : BDR}`,
        color:      active ? color : MUTED,
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
          style={{ background: active ? color : "rgba(255,255,255,0.08)", color: active ? "#111" : MUTED }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Insight card (grouped per athlete) ────────────────────────────────────────

function InsightGroupChip({
  group, index, onDismiss, onOpen, reviewedAt,
}: { group: PlayerInsightGroup; index: number; onDismiss: (ids: string[]) => void; onOpen: () => void; reviewedAt?: string }) {
  const cat = CAT[group.category];
  const MAX_VISIBLE = 3;
  const visibleItems = group.items.slice(0, MAX_VISIBLE);
  const extraCount = group.items.length - visibleItems.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="relative rounded-xl flex flex-col gap-2.5 p-4 group cursor-pointer transition-colors hover:brightness-110"
      style={{
        background: cat.bg,
        border: `1px solid ${cat.border}`,
        flex: "0 0 calc(25% - 9px)",
        minWidth: "220px",
        minHeight: "160px",
      }}
    >
      {/* Dismiss */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(group.items.map(i => i.id)); }}
        className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(255,255,255,0.08)", color: MUTED }}
        title="Dispensar"
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {/* Player name header */}
      <div className="flex items-center gap-2 pr-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}30` }}
        >
          {(() => { const Icon = visibleItems[0].icon; return <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />; })()}
        </div>
        <p className="font-display font-semibold text-[13px] leading-tight truncate" style={{ color: cat.color }}>
          {group.playerName}
        </p>
      </div>

      {/* Items list */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {visibleItems.map(item => (
          <div key={item.id} title={item.tooltip} className="min-w-0">
            <p className="font-mono text-[10px] font-semibold leading-tight truncate" style={{ color: CAT[item.category].color }}>
              {item.title}
            </p>
            <p className="font-mono text-[9.5px] leading-snug line-clamp-1" style={{ color: MUTED }}>
              {item.description}
            </p>
          </div>
        ))}
        {extraCount > 0 && (
          <p className="font-mono text-[9.5px] underline" style={{ color: MUTED }}>
            +{extraCount} outro{extraCount > 1 ? "s" : ""} insight{extraCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {reviewedAt && (
        <div className="flex items-center gap-1 font-mono text-[9px]" style={{ color: "#22c55e" }} title={`Revisado ${formatRelativeTime(reviewedAt)}`}>
          <CheckCircle2 className="w-3 h-3" />
          Revisado {formatRelativeTime(reviewedAt)}
        </div>
      )}

      {/* Link arrow */}
      <Link
        to={group.link}
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-all duration-150 w-fit"
        style={{ color: cat.color }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        Ver atleta <ChevronRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

// ─── Insight detail modal (all items for one athlete) ──────────────────────────

function InsightGroupModal({
  group, reviewedAt, onOpenChange, onToggleReviewed,
}: {
  group: PlayerInsightGroup | null;
  reviewedAt?: string;
  onOpenChange: (open: boolean) => void;
  onToggleReviewed: (playerId: string) => void;
}) {
  return (
    <Dialog open={!!group} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden rounded-xl border"
        style={{ background: BG, borderColor: group ? CAT[group.category].border : BDR }}
      >
        {group && (
          <>
            <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: CAT[group.category].border }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${CAT[group.category].color}18`, border: `1px solid ${CAT[group.category].border}` }}
                >
                  {(() => { const Icon = group.items[0].icon; return <Icon className="w-4 h-4" style={{ color: CAT[group.category].color }} />; })()}
                </div>
                <div>
                  <DialogTitle className="font-display font-semibold text-[15px]" style={{ color: CAT[group.category].color }}>
                    {group.playerName}
                  </DialogTitle>
                  {reviewedAt && (
                    <p className="flex items-center gap-1 font-mono text-[9.5px] mt-0.5" style={{ color: "#22c55e" }}>
                      <CheckCircle2 className="w-2.5 h-2.5" /> Revisado {formatRelativeTime(reviewedAt)}
                    </p>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="px-5 py-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {group.items.map(item => (
                <div key={item.id}>
                  <p className="font-mono text-[12px] font-semibold" style={{ color: CAT[item.category].color }}>
                    {item.title}
                  </p>
                  <p className="font-mono text-[11px] leading-relaxed mt-0.5" style={{ color: MUTED }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: CAT[group.category].border }}>
              <button
                onClick={() => onToggleReviewed(group.playerId)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-opacity hover:opacity-80"
                style={reviewedAt
                  ? { background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: MUTED, border: `1px solid ${BDR}` }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {reviewedAt ? "Revisado — desmarcar" : "Marcar como revisado"}
              </button>
              <Link
                to={group.link}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-opacity hover:opacity-80"
                style={{ background: `${CAT[group.category].color}18`, color: CAT[group.category].color, border: `1px solid ${CAT[group.category].border}` }}
              >
                Ver atleta <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const InsightsCard = () => {
  const { session } = useAuth();
  const currentYear = new Date().getFullYear();

  const [filter,    setFilter]    = useState<FilterValue>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const [reviewed,  setReviewed]  = useState<Record<string, string>>(getReviewed);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync dismissed / reviewed to localStorage
  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);
  useEffect(() => { saveReviewed(reviewed); }, [reviewed]);

  const handleDismiss = (ids: string[]) =>
    setDismissed(prev => new Set([...prev, ...ids]));

  const handleToggleReviewed = (playerId: string) =>
    setReviewed(prev => {
      if (prev[playerId]) {
        const next = { ...prev };
        delete next[playerId];
        return next;
      }
      return { ...prev, [playerId]: new Date().toISOString() };
    });

  // ── Query 1: season aggregates, walking back to the most recent season
  // that actually has data — mirrors the same fallback used on the dashboard
  // Gols/Assistências cards, so insights don't go quiet at the start of a
  // new season before any stats have been entered.
  const { data: aggResult, isLoading: loadingAgg } = useQuery({
    queryKey:  ["insights-season-aggregates-v3", currentYear],
    queryFn:   async () => {
      for (const year of [currentYear, currentYear - 1, currentYear - 2]) {
        const { data, error } = await supabase.rpc("get_season_player_aggregates", { p_season_year: year });
        if (error) throw error;
        const rows = (data ?? []) as AggregateRow[];
        if (rows.length > 0) return { year, aggregates: rows };
      }
      return { year: currentYear, aggregates: [] as AggregateRow[] };
    },
    staleTime: 5 * 60 * 1000,
    enabled:   !!session?.user,
  });

  const resolvedYear = aggResult?.year ?? currentYear;
  const aggregates   = aggResult?.aggregates ?? [];

  // ── Query 2: player season goals (meta progress) — tied to the same
  // resolved season as the aggregates above ────────────────────────────────
  const { data: goals = [], isLoading: loadingGoals } = useQuery<GoalRow[]>({
    queryKey:  ["insights-goals", resolvedYear],
    queryFn:   async () => {
      const { data, error } = await supabase
        .from("player_season_goals")
        .select("id, player_id, goal_type, target_value, season_year, player:players(full_name)")
        .eq("season_year", resolvedYear);
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled:   !!session?.user && !!aggResult,
  });

  // ── Query 3: contracts expiring — sourced from player_contract_history,
  // the real multi-contract system (national/international fee, full
  // history), not the legacy single players.contract_end column ───────────
  const { data: contracts = [], isLoading: loadingContracts } = useQuery<ContractRow[]>({
    queryKey:  ["insights-contracts-v3"],
    queryFn:   async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      const ninetyDaysStr = ninetyDays.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("player_contract_history")
        .select("player_id, end_date, players!player_contract_history_player_id_fkey(full_name, is_archived)")
        .eq("is_archived", false)
        .not("end_date", "is", null)
        .gte("end_date", todayStr)
        .lte("end_date", ninetyDaysStr);
      if (error) throw error;

      // Collapse to the soonest-expiring contract per (non-archived) player —
      // a player can have more than one row within the window.
      type Row = { player_id: string; end_date: string; players: { full_name: string; is_archived: boolean | null } | null };
      const byPlayer = new Map<string, ContractRow>();
      for (const row of (data ?? []) as Row[]) {
        if (row.players?.is_archived) continue;
        const existing = byPlayer.get(row.player_id);
        if (!existing || row.end_date < (existing.contract_end ?? "9999-99-99")) {
          byPlayer.set(row.player_id, {
            id: row.player_id,
            full_name: row.players?.full_name ?? "Atleta",
            contract_end: row.end_date,
          });
        }
      }
      return Array.from(byPlayer.values());
    },
    staleTime: 10 * 60 * 1000,
    enabled:   !!session?.user,
  });

  // ── Query 4: player position + physical data — for position-aware
  // performance thresholds and the body-composition-vs-elite rule ─────────
  const { data: physicalRows = [], isLoading: loadingPhysical } = useQuery<PhysicalRow[]>({
    queryKey:  ["insights-player-physical"],
    queryFn:   async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, position, body_fat_percentage")
        .or("is_archived.is.null,is_archived.eq.false");
      if (error) throw error;
      return (data ?? []) as PhysicalRow[];
    },
    staleTime: 10 * 60 * 1000,
    enabled:   !!session?.user,
  });

  const positionByPlayerId = useMemo(
    () => new Map(physicalRows.map(p => [p.id, p.position])),
    [physicalRows],
  );

  const isLoading = loadingAgg || loadingGoals || loadingContracts || loadingPhysical;

  // ── Build, group and filter insights ─────────────────────────────────────
  const allInsights = useMemo(
    () => buildInsights(aggregates, goals, contracts, physicalRows, resolvedYear, positionByPlayerId),
    [aggregates, goals, contracts, physicalRows, resolvedYear, positionByPlayerId],
  );

  const visibleInsights = useMemo(
    () => allInsights.filter(i => !dismissed.has(i.id)),
    [allInsights, dismissed],
  );

  const groups = useMemo(
    () => groupInsightsByPlayer(visibleInsights),
    [visibleInsights],
  );

  const filtered = useMemo(
    () => filter === "all" ? groups : groups.filter(g => g.category === filter),
    [groups, filter],
  );

  const counts = useMemo(() => ({
    critical: groups.filter(g => g.category === "critical").length,
    alert:    groups.filter(g => g.category === "alert").length,
    positive: groups.filter(g => g.category === "positive").length,
  }), [groups]);

  const openGroup = openGroupId ? groups.find(g => g.playerId === openGroupId) ?? null : null;

  // ── Scroll helpers ──────────────────────────────────────────────────────
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full rounded-xl overflow-hidden" style={{ background: BG, border: `1px solid ${BDR}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: BDR }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)" }}>
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[13px] font-display font-semibold" style={{ color: FG }}>Insights da Plataforma</p>
              <p className="text-[10px] font-mono" style={{ color: MUTED }}>Analisando dados...</p>
            </div>
          </div>
        </div>
        <div className="p-4 flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-[210px] h-[130px] rounded-xl animate-pulse shrink-0"
              style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl overflow-hidden flex flex-col"
      style={{ background: BG, border: `1px solid ${BDR}` }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 border-b shrink-0"
        style={{ borderColor: BDR }}>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center relative shrink-0"
            style={{ background: "rgba(245,158,11,0.12)" }}>
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <Sparkles className="w-2 h-2 text-amber-300 absolute -top-0.5 -right-0.5" />
          </div>
          <div>
            <p className="text-[12px] font-display font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: FG }}>
              // Insights da Plataforma
            </p>
            {resolvedYear !== currentYear && (
              <p className="text-[9.5px] font-mono" style={{ color: MUTED }}>
                Exibindo dados de {resolvedYear} (sem dados em {currentYear} ainda)
              </p>
            )}
          </div>
        </div>

        {/* Filter pills + scroll arrows — grouped together on the right */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <FilterPill
              label="Todos" count={groups.length}
              active={filter === "all"} color="#ededee"
              onClick={() => setFilter("all")}
            />
            {counts.critical > 0 && (
              <FilterPill
                label="Crítico" count={counts.critical}
                active={filter === "critical"} color={CAT.critical.color}
                onClick={() => setFilter(f => f === "critical" ? "all" : "critical")}
              />
            )}
            {counts.alert > 0 && (
              <FilterPill
                label="Atenção" count={counts.alert}
                active={filter === "alert"} color={CAT.alert.color}
                onClick={() => setFilter(f => f === "alert" ? "all" : "alert")}
              />
            )}
            {counts.positive > 0 && (
              <FilterPill
                label="Positivo" count={counts.positive}
                active={filter === "positive"} color={CAT.positive.color}
                onClick={() => setFilter(f => f === "positive" ? "all" : "positive")}
              />
            )}
          </div>

          {/* Scroll arrows */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => scroll("left")}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BDR}`, color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BDR}`, color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards row */}
      <div
        ref={scrollRef}
        className="flex gap-3 p-4 pb-5 overflow-x-auto scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center justify-center py-8 gap-2"
            >
              <Sparkles className="w-5 h-5 text-amber-400/60" />
              <p className="font-mono text-[11px]" style={{ color: MUTED }}>
                {filter === "all"
                  ? "Nenhum insight ativo no momento."
                  : `Nenhum insight "${CAT[filter as InsightCategory]?.label ?? filter}" ativo.`}
              </p>
              {dismissed.size > 0 && (
                <button
                  onClick={() => { setDismissed(new Set()); saveDismissed(new Set()); }}
                  className="font-mono text-[10px] underline"
                  style={{ color: MUTED }}
                >
                  Restaurar {dismissed.size} dispensado{dismissed.size > 1 ? "s" : ""}
                </button>
              )}
            </motion.div>
          ) : (
            filtered.map((group, i) => (
              <InsightGroupChip
                key={group.playerId}
                group={group}
                index={i}
                onDismiss={handleDismiss}
                onOpen={() => setOpenGroupId(group.playerId)}
                reviewedAt={reviewed[group.playerId]}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Restore dismissed link (footer) */}
      {dismissed.size > 0 && filtered.length > 0 && (
        <div className="px-5 pb-3 flex justify-end">
          <button
            onClick={() => { setDismissed(new Set()); saveDismissed(new Set()); }}
            className="font-mono text-[9px] uppercase tracking-wider transition-colors"
            style={{ color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            Restaurar {dismissed.size} dispensado{dismissed.size > 1 ? "s" : ""}
          </button>
        </div>
      )}

      <InsightGroupModal
        group={openGroup}
        reviewedAt={openGroup ? reviewed[openGroup.playerId] : undefined}
        onOpenChange={open => !open && setOpenGroupId(null)}
        onToggleReviewed={handleToggleReviewed}
      />
    </motion.div>
  );
};
