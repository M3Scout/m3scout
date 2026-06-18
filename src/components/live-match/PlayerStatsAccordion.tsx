import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MatchEvent, MatchPlayer } from "@/hooks/useLiveMatch";
import type { MatchEventType } from "@/hooks/useLiveMatch";
import {
  EVENT_TYPE_CONFIG,
  CATEGORY_COLORS,
  COMPUTED_STATS,
  SUMMARY_EVENT_TYPES,
  type EventCountsMap,
} from "@/lib/matchStatsDefinitions";

const CARD_BG          = "#16181a";
const CARD_BORDER      = "rgba(63,63,70,0.30)";
const CARD_BORDER_OPEN = "rgba(63,63,70,0.50)";
const INNER_BG         = "#0d0e0f";
const INNER_BORDER     = "rgba(39,39,42,0.40)";
const TEXT             = "#ededee";
const MUTED            = "#62616a";
const GREEN            = "#2DCE8A";

interface PlayerStatsAccordionProps {
  events: MatchEvent[];
  matchPlayers: MatchPlayer[];
}

interface PlayerRow {
  playerId: string;
  name: string;
  photoUrl: string | null;
  position: string;
  role: string;
  goals: number;
  assists: number;
  yellowCards: number;
  totalEvents: number;
}

function buildEventCounts(events: MatchEvent[]): EventCountsMap {
  const counts: EventCountsMap = {};
  events.forEach((e) => {
    if (e.event_status === "voided" || !e.count_in_stats) return;
    const half = e.half === 2 ? "second" : "first";
    const t = e.event_type as MatchEventType;
    if (!counts[t]) counts[t] = { first: 0, second: 0 };
    counts[t]![half] += e.value || 1;
  });
  return counts;
}

interface StatTableRow {
  id: string;
  label: string;
  icon: string;
  category: string;
  order: number;
  first: number;
  second: number;
  total: number;
}

function buildStatRows(events: MatchEvent[]): StatTableRow[] {
  const counts = buildEventCounts(events);
  const rows: StatTableRow[] = [];

  SUMMARY_EVENT_TYPES.forEach((type) => {
    const c = counts[type];
    if (!c) return;
    const total = c.first + c.second;
    if (total === 0) return;
    const cfg = EVENT_TYPE_CONFIG[type];
    rows.push({ id: type, label: cfg.label, icon: cfg.icon, category: cfg.category, order: cfg.order, first: c.first, second: c.second, total });
  });

  COMPUTED_STATS.forEach((cs) => {
    const computed = cs.compute(counts);
    const total = computed.first + computed.second;
    if (total === 0) return;
    rows.push({ id: cs.id, label: cs.label, icon: cs.icon, category: cs.category, order: cs.order, first: computed.first, second: computed.second, total });
  });

  return rows.sort((a, b) => a.order - b.order);
}

function StatTableRow({ row }: { row: StatTableRow }) {
  const catColor = CATEGORY_COLORS[row.category] ?? "";
  const isFirst  = row.first > row.second;
  const isSecond = row.second > row.first;

  return (
    <div className="grid grid-cols-4 text-center border-t" style={{ borderColor: INNER_BORDER }}>
      <div className={`p-2.5 font-display font-bold text-base tabular-nums ${isFirst ? catColor : ""}`} style={{ color: isFirst ? undefined : MUTED }}>
        {row.first}
      </div>
      <div className="p-2.5 font-editorial-mono text-[10px] flex items-center justify-center truncate" style={{ color: MUTED }}>
        <span className="truncate">{row.icon} {row.label}</span>
      </div>
      <div className={`p-2.5 font-display font-bold text-base tabular-nums ${isSecond ? catColor : ""}`} style={{ color: isSecond ? undefined : MUTED }}>
        {row.second}
      </div>
      <div className="p-2.5 font-display font-bold text-base tabular-nums" style={{ color: TEXT }}>
        {row.total}
      </div>
    </div>
  );
}

export function PlayerStatsAccordion({ events, matchPlayers }: PlayerStatsAccordionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const playerRows = useMemo<PlayerRow[]>(() => {
    return matchPlayers.map((mp) => {
      const playerEvents = events.filter((e) => e.player_id === mp.player_id && e.event_status !== "voided" && e.count_in_stats !== false);
      return {
        playerId: mp.player_id,
        name: mp.player?.full_name ?? `Atleta`,
        photoUrl: mp.player?.photo_url ?? null,
        position: mp.player?.position ?? "",
        role: mp.role ?? "substitute",
        goals: playerEvents.filter((e) => e.event_type === "goal").length,
        assists: playerEvents.filter((e) => e.event_type === "assist").length,
        yellowCards: playerEvents.filter((e) => e.event_type === "yellow").length,
        totalEvents: playerEvents.length,
      };
    });
  }, [events, matchPlayers]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (playerRows.length === 0) {
    return (
      <p className="font-editorial-mono text-[11px] text-center py-4" style={{ color: MUTED }}>
        Nenhum jogador registrado
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {playerRows.map((row) => {
        const isOpen = expanded.has(row.playerId);
        const playerEvents = events.filter((e) => e.player_id === row.playerId);
        const statRows = isOpen ? buildStatRows(playerEvents) : [];

        return (
          <div
            key={row.playerId}
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{ background: CARD_BG, border: `1px solid ${isOpen ? CARD_BORDER_OPEN : CARD_BORDER}` }}
          >
            {/* Collapsed header */}
            <button
              onClick={() => toggle(row.playerId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0d0e0f] transition-colors duration-200"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={row.photoUrl || undefined} className="object-cover object-top" />
                <AvatarFallback className="font-display text-[10px] bg-zinc-800">
                  {row.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-left">
                <p className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>
                  {row.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                    {row.position}
                  </span>
                  <span className="font-editorial-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.07)", color: MUTED }}>
                    {row.role === "starter" ? "Titular" : "Reserva"}
                  </span>
                </div>
              </div>

              {/* Quick KPIs */}
              <div className="flex items-center gap-2.5 shrink-0">
                {row.goals > 0 && (
                  <span className="font-display font-bold text-[13px] tabular-nums" style={{ color: GREEN }}>
                    {row.goals}G
                  </span>
                )}
                {row.assists > 0 && (
                  <span className="font-display font-bold text-[13px] tabular-nums" style={{ color: "#38bdf8" }}>
                    {row.assists}A
                  </span>
                )}
                {row.yellowCards > 0 && (
                  <span className="font-display font-bold text-[12px] tabular-nums" style={{ color: "#f59e0b" }}>
                    {row.yellowCards}🟡
                  </span>
                )}
                <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: MUTED }}>
                  {row.totalEvents} ev
                </span>
              </div>

              <div className="shrink-0 ml-1" style={{ color: MUTED }}>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Expanded stats table */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="border-t" style={{ borderColor: INNER_BORDER }}>
                    {/* Table header */}
                    <div className="grid grid-cols-4 text-center" style={{ background: INNER_BG }}>
                      {["1º TEMPO", "Estatística", "2º TEMPO", "TOTAL"].map((h, i) => (
                        <div key={h} className="px-3 py-2 font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: i === 1 ? MUTED : TEXT, borderRight: i < 3 ? `1px solid ${INNER_BORDER}` : undefined }}>
                          {h}
                        </div>
                      ))}
                    </div>

                    {statRows.length === 0 ? (
                      <p className="text-center py-4 font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                        Nenhum evento registrado
                      </p>
                    ) : (
                      statRows.map((sr) => <StatTableRow key={sr.id} row={sr} />)
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
