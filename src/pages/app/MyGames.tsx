import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Radio, Calendar, Trophy, MapPin, Clock, Eye,
  CheckCircle2, Wifi, Search, Target, Zap, Timer,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT      = "#ec4525";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";
const GREEN       = "#2DCE8A";
const BLUE        = "#3b82f6";

// ── Types ─────────────────────────────────────────────────────────────────────
type MatchStatus = "draft" | "live" | "finished" | "applied";

interface PlayerMatch {
  id: string;
  opponent_name: string;
  match_date: string;
  status: MatchStatus;
  venue: string | null;
  season_year: number;
  team_name_display: string | null;
  team_logo_url: string | null;
  opponent_logo_url: string | null;
  competition: { id: string; name: string; display_name: string | null } | null;
  participation: {
    started: boolean;
    minutes_played: number | null;
  };
  stats: {
    goals: number;
    assists: number;
  } | null;
}

const STATUS_CFG: Record<MatchStatus, { label: string; color: string; bg: string; border: string }> = {
  live:     { label: "Ao Vivo",    color: ACCENT, bg: "rgba(236,69,37,0.10)",   border: "rgba(236,69,37,0.28)"   },
  finished: { label: "Finalizado", color: "#E8C44A", bg: "rgba(232,196,74,0.10)",  border: "rgba(232,196,74,0.25)"  },
  applied:  { label: "Aplicado",   color: GREEN,  bg: "rgba(45,206,138,0.10)",  border: "rgba(45,206,138,0.25)"  },
  draft:    { label: "Agendado",   color: MUTED,  bg: "rgba(98,97,106,0.10)",   border: "rgba(98,97,106,0.20)"   },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function MatchCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="rounded-xl border px-4 py-3 flex items-center gap-4 animate-pulse"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-10 h-10 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="w-4 h-2 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="w-10 h-10 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-3 w-48 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-2.5 w-32 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="w-8 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
    </motion.div>
  );
}

// ── Empty ─────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-10 sm:p-16 text-center" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <div className="relative w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: "rgba(236,69,37,0.07)", border: "1px solid rgba(236,69,37,0.18)" }}>
        <Wifi className="w-7 h-7" style={{ color: ACCENT }} />
      </div>
      <h3 className="font-display font-bold text-[20px] mb-2" style={{ color: TEXT }}>
        Nenhum jogo registrado
      </h3>
      <p className="font-editorial-mono text-[11px] max-w-sm mx-auto leading-relaxed" style={{ color: MUTED }}>
        Você será notificado quando for escalado para uma partida.
      </p>
    </motion.div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────
function PlayerMatchCard({ match, index }: { match: PlayerMatch; index: number }) {
  const cfg  = STATUS_CFG[match.status];
  const isLive = match.status === "live";
  const link = match.status === "applied"
    ? `/dashboard/aovivo/${match.id}/revisao`
    : `/dashboard/aovivo/${match.id}`;

  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const displayTeamName = match.team_name_display || "Time";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Link
        to={link}
        className="block relative rounded-xl border transition-colors duration-[250ms] hover:bg-zinc-800/25"
        style={{
          background: isLive ? "rgba(236,69,37,0.03)" : "transparent",
          borderColor: isLive ? "rgba(236,69,37,0.18)" : CARD_BORDER,
        }}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Logos */}
          <div className="shrink-0 flex items-center gap-2">
            {match.team_logo_url
              ? <img src={match.team_logo_url} alt={displayTeamName} className="w-10 h-10 object-contain rounded-lg p-1" style={{ background: "rgba(255,255,255,0.03)" }} loading="lazy" />
              : <div className="w-10 h-10 rounded-lg flex items-center justify-center font-editorial-mono text-[11px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{displayTeamName.substring(0, 2).toUpperCase()}</div>
            }
            <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>vs</span>
            {match.opponent_logo_url
              ? <img src={match.opponent_logo_url} alt={match.opponent_name} className="w-10 h-10 object-contain rounded-lg p-1" style={{ background: "rgba(255,255,255,0.03)" }} loading="lazy" />
              : <div className="w-10 h-10 rounded-lg flex items-center justify-center font-editorial-mono text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.04)", color: MUTED }}>{match.opponent_name.substring(0, 2).toUpperCase()}</div>
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Row 1: names + status badge */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>
                {displayTeamName} <span style={{ color: MUTED, fontWeight: 400 }}>vs</span> {match.opponent_name}
              </span>
              <span
                className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 inline-flex items-center gap-1"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                {isLive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />}
                {cfg.label}
              </span>
            </div>

            {/* Row 2: competition + date + time + venue */}
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <span className="font-editorial-mono text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                <Trophy className="w-3 h-3" />{competitionName}
              </span>
              <span className="font-editorial-mono text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                <Calendar className="w-3 h-3" />{format(new Date(match.match_date), "dd/MM/yy", { locale: ptBR })}
              </span>
              <span className="font-editorial-mono text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                <Clock className="w-3 h-3" />{format(new Date(match.match_date), "HH:mm")}
              </span>
              {match.venue && (
                <span className="hidden sm:flex font-editorial-mono text-[10px] items-center gap-1" style={{ color: MUTED }}>
                  <MapPin className="w-3 h-3" />{match.venue}
                </span>
              )}
            </div>

            {/* Row 3: player participation (only if data exists) */}
            {(match.participation.minutes_played != null || match.stats) && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Titular / Reserva */}
                <span
                  className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border"
                  style={{
                    color:       match.participation.started ? GREEN : MUTED,
                    borderColor: match.participation.started ? "rgba(45,206,138,0.35)" : CARD_BORDER,
                    background:  match.participation.started ? "rgba(45,206,138,0.08)" : "transparent",
                  }}
                >
                  {match.participation.started ? "Titular" : "Reserva"}
                </span>

                {match.participation.minutes_played != null && (
                  <span className="font-editorial-mono text-[10px] flex items-center gap-0.5" style={{ color: MUTED }}>
                    <Timer className="w-3 h-3" />{match.participation.minutes_played}'
                  </span>
                )}

                {!!match.stats?.goals && (
                  <span className="font-editorial-mono text-[10px] flex items-center gap-0.5" style={{ color: GREEN }}>
                    <Target className="w-3 h-3" />{match.stats.goals} gol{match.stats.goals > 1 ? "s" : ""}
                  </span>
                )}

                {!!match.stats?.assists && (
                  <span className="font-editorial-mono text-[10px] flex items-center gap-0.5" style={{ color: BLUE }}>
                    <Zap className="w-3 h-3" />{match.stats.assists} assist.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action — eye icon */}
          <div className="shrink-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 hover:bg-zinc-800"
              style={{ color: MUTED }}
            >
              <Eye className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function MatchSection({
  title, icon, accentColor, accentBorder, matches,
}: {
  title: string; icon: React.ReactNode; accentColor: string; accentBorder?: string;
  matches: PlayerMatch[];
}) {
  if (matches.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: accentBorder ?? CARD_BORDER }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2.5" style={{ color: accentColor }}>
          {icon}
          <span className="font-display font-semibold text-[13px]">{title}</span>
        </div>
        <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: MUTED }}>
          {matches.length} {matches.length === 1 ? "jogo" : "jogos"}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {matches.map((match, i) => (
          <PlayerMatchCard key={match.id} match={match} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MyGames() {
  const { linkedPlayerId } = useAuth();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen]     = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["my-games", linkedPlayerId],
    queryFn: async () => {
      if (!linkedPlayerId) return [];

      const { data: participations, error: pErr } = await supabase
        .from("match_players")
        .select("match_id, started, minutes_played")
        .eq("player_id", linkedPlayerId)
        .eq("is_removed", false);
      if (pErr) throw pErr;
      if (!participations?.length) return [];

      const matchIds = participations.map(p => p.match_id);

      const [{ data: matchesData, error: mErr }, { data: statsData }] = await Promise.all([
        supabase
          .from("matches")
          .select(`id, opponent_name, match_date, status, venue, season_year, team_name_display, team_logo_url, opponent_logo_url, competition:competitions(id, name, display_name)`)
          .in("id", matchIds)
          .order("match_date", { ascending: false }),
        supabase
          .from("match_player_stats")
          .select("match_id, goals, assists")
          .eq("player_id", linkedPlayerId)
          .in("match_id", matchIds),
      ]);
      if (mErr) throw mErr;

      return (matchesData ?? []).map(m => {
        const part  = participations.find(p => p.match_id === m.id);
        const stats = statsData?.find(s => s.match_id === m.id);
        return {
          ...m,
          participation: {
            started:       part?.started       ?? false,
            minutes_played: part?.minutes_played ?? null,
          },
          stats: stats ? { goals: stats.goals ?? 0, assists: stats.assists ?? 0 } : null,
        } as PlayerMatch;
      });
    },
    enabled: !!linkedPlayerId,
  });

  // Realtime: revalidate when matches change
  useEffect(() => {
    if (!linkedPlayerId) return;
    const ch = supabase.channel("my-games-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-games", linkedPlayerId] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [linkedPlayerId, queryClient]);

  const filteredMatches = useMemo(() => {
    if (!mobileSearch.trim()) return matches;
    const q = mobileSearch.toLowerCase();
    return matches.filter(m =>
      m.opponent_name.toLowerCase().includes(q) ||
      m.team_name_display?.toLowerCase().includes(q) ||
      (m.competition?.display_name ?? m.competition?.name ?? "").toLowerCase().includes(q)
    );
  }, [matches, mobileSearch]);

  const liveMatches     = useMemo(() => filteredMatches.filter(m => m.status === "live"),                          [filteredMatches]);
  const historyMatches  = useMemo(() => filteredMatches.filter(m => m.status === "applied" || m.status === "finished"), [filteredMatches]);
  const draftMatches    = useMemo(() => filteredMatches.filter(m => m.status === "draft"),                         [filteredMatches]);
  const hasLive         = liveMatches.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {hasLive && (
            <div className="relative w-2.5 h-2.5 shrink-0">
              <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: ACCENT }} />
              <span className="relative block w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />
            </div>
          )}
          <h1 className="m3-page-title">Meus Jogos</h1>
          {matches.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full font-editorial-mono text-[12px] font-bold text-white" style={{ background: ACCENT }}>
              {matches.length}
            </span>
          )}
        </div>
        <button
          className="sm:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: MUTED }}
          onClick={() => { setSearchOpen(v => !v); setMobileSearch(""); }}
          aria-label="Buscar"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile search */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sm:hidden overflow-hidden">
            <input
              autoFocus
              value={mobileSearch}
              onChange={e => setMobileSearch(e.target.value)}
              placeholder="Buscar jogo ou competição..."
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} index={i} />)}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState />
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-xl border p-8 text-center font-editorial-mono text-[11px]" style={{ background: CARD_BG, borderColor: CARD_BORDER, color: MUTED }}>
          Nenhum jogo encontrado
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            <MatchSection
              title="Ao Vivo"
              icon={<Radio className="w-4 h-4 animate-pulse" />}
              accentColor={ACCENT}
              accentBorder="rgba(236,69,37,0.22)"
              matches={liveMatches}
            />
            <MatchSection
              title="Histórico"
              icon={<CheckCircle2 className="w-4 h-4" />}
              accentColor={GREEN}
              matches={historyMatches}
            />
            <MatchSection
              title="Próximas Partidas"
              icon={<Calendar className="w-4 h-4" />}
              accentColor={BLUE}
              matches={draftMatches}
            />
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
