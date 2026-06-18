/**
 * Match Summary PDF — redesigned v3
 * Dark header, brand red accents, no heatmaps, per-player performance sections.
 */
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Line as SvgLine,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Match, MatchPlayer, MatchEvent, MatchEventType, MatchPlayerStats } from "@/hooks/useLiveMatch";
import { calculateMinutesPlayed } from "@/lib/minutesPlayed";
import { matchPlayerStatsToInput } from "@/lib/matchRatingEngine";
import { classifyMatchProfile, type MatchProfileKey } from "@/lib/matchProfileEngine";
import { calculateMatchEfficiency, type EfficiencyLevel } from "@/lib/matchEfficiencyEngine";
import { generateScoutingText } from "@/lib/scoutingTextEngine";
import { generatePostGameAnalysis, type MatchStatsInput } from "@/lib/postGameAnalysis";
import { calculateBallActionsFromMatchStats } from "@/lib/derivedBallActions";
import { normalizeMatchStats } from "@/lib/normalizeMatchStats";
import {
  EVENT_TYPE_CONFIG,
  COMPUTED_STATS,
  SUMMARY_EVENT_TYPES,
  EventCountsMap,
} from "@/lib/matchStatsDefinitions";

// ── Design tokens ────────────────────────────────────────────────────────────
const D = {
  // Page
  pageBg: "#FFFFFF",
  // Header dark band
  dark: "#111111",
  dark2: "#1A1A1A",
  // Brand
  red: "#EC4525",
  redFaint: "#FFF1EE",
  // Text
  text: "#0F0F10",
  textMuted: "#62616A",
  textWhite: "#FFFFFF",
  textWhiteMuted: "#9CA3AF",
  // Neutrals
  g50:  "#FAFAFA",
  g100: "#F4F4F5",
  g200: "#E4E4E7",
  g300: "#D1D5DB",
  g400: "#A1A1AA",
  g500: "#71717A",
  g600: "#52525B",
  g700: "#3F3F46",
  g800: "#27272A",
  g900: "#18181B",
  // Semantic
  green: "#16A34A",
  greenFaint: "#DCFCE7",
  blue: "#1D4ED8",
  blueFaint: "#DBEAFE",
  amber: "#D97706",
  amberFaint: "#FEF3C7",
  // Efficiency
  effHigh:   { bg: "#D1FAE5", text: "#065F46" },
  effMedium: { bg: "#FEF3C7", text: "#92400E" },
  effLow:    { bg: "#FEE2E2", text: "#991B1B" },
  effNone:   { bg: "#E5E7EB", text: "#6B7280" },
};

// Profile palette
const PROFILE_COLOR: Record<MatchProfileKey, { bg: string; text: string }> = {
  decisive_efficient:       { bg: "#DCFCE7", text: "#166534" },
  participative_impact:     { bg: "#D1FAE5", text: "#065F46" },
  participative_no_impact:  { bg: "#FFEDD5", text: "#C2410C" },
  efficient_low_volume:     { bg: "#FEF3C7", text: "#92400E" },
  unproductive_volume:      { bg: "#FEE2E2", text: "#991B1B" },
  defensive_dominant:       { bg: "#DBEAFE", text: "#1E40AF" },
  defensive_consistent:     { bg: "#CFFAFE", text: "#0E7490" },
  high_defensive_risk:      { bg: "#FECACA", text: "#B91C1C" },
  low_general_impact:       { bg: "#E5E7EB", text: "#374151" },
};

const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: "Gol", shot_on_target: "Finalização Gol", shot: "Finalização Fora",
  shot_blocked: "Final. Bloqueada", offside: "Impedimento", penalty_won: "Pênalti Sofrido",
  assist: "Assistência", key_pass: "Passe Decisivo", chance_created: "Chance Criada",
  pass_success: "Passe Certo", pass_total: "Passe Errado", cross_success: "Cruzamento Certo",
  cross_failed: "Cruzamento Errado", ball_action: "Ação c/ Bola", dribble_success: "Drible Certo",
  dribble_attempt: "Drible Errado", foul_suffered: "Falta Sofrida", possession_lost: "Bola Perdida",
  tackle: "Desarme", steal: "Roubada de Bola", interception: "Interceptação",
  recovery: "Recuperação", clearance: "Corte", blocked_shot: "Chute Bloqueado",
  was_dribbled: "Driblado", ground_duel_won: "Duelo Chão (G)", ground_duel_total: "Duelo Chão (P)",
  duel_won: "Duelo (G)", duel_total: "Duelo (P)", aerial_duel_won: "Duelo Aéreo (G)",
  aerial_duel_total: "Duelo Aéreo (P)", foul_committed: "Falta Cometida",
  yellow: "Amarelo", red: "Vermelho", save: "Defesa", goal_conceded: "Gol Sofrido",
  clean_sheet: "Clean Sheet", penalty_saved: "Pênalti Defendido", error_led_to_goal: "Erro→Gol",
  box_save: "Defesa Área", punch: "Soco", high_claim: "Bola Alta", sweeper_action: "Saída Gol",
  long_pass_success: "Lançamento Certo", long_pass_total: "Lançamento Errado",
  substitution: "Substituição", player_on: "Entrou", player_off: "Saiu",
  progressive_pass: "Passe Progressivo", shot_on_post: "Trave",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { padding: 0, backgroundColor: D.pageBg, fontFamily: "Helvetica" },

  // ── Dark header band ─────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: D.dark,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  headerRight: { alignItems: "flex-end" },
  logo:        { height: 32, objectFit: "contain" as const },
  logoSm:      { height: 22, objectFit: "contain" as const },
  h1:   { fontSize: 17, fontWeight: 700, color: D.textWhite },
  h1Sm: { fontSize: 13, fontWeight: 700, color: D.textWhite },
  sub:  { fontSize: 8,  color: D.textWhiteMuted, marginTop: 2 },
  matchTitle: { fontSize: 11, fontWeight: 700, color: D.textWhite, textAlign: "right" },
  matchMeta:  { fontSize: 8,  color: D.textWhiteMuted, marginTop: 2, textAlign: "right" },
  playerTag:  { fontSize: 8,  color: D.red, marginTop: 3, fontWeight: 700, textAlign: "right" },
  redLine: { height: 2, backgroundColor: D.red },

  // ── Page content wrapper ─────────────────────────────────────────────────
  body: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 44 },

  // ── KPI row ──────────────────────────────────────────────────────────────
  kpiRow:  { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1, borderRadius: 6, padding: 10,
    borderWidth: 1, borderColor: D.g200, backgroundColor: D.g50,
    borderTopWidth: 3,
  },
  kpiVal: { fontSize: 22, fontWeight: 700, color: D.text, lineHeight: 1 },
  kpiLbl: { fontSize: 7, color: D.textMuted, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 },

  // ── Section title ─────────────────────────────────────────────────────────
  secTitle: { fontSize: 10, fontWeight: 700, color: D.text, marginBottom: 8 },
  secSub:   { fontSize: 7, color: D.textMuted, marginBottom: 8, marginTop: -5 },

  // ── Stats table ───────────────────────────────────────────────────────────
  table: { borderRadius: 6, borderWidth: 1, borderColor: D.g200, overflow: "hidden", marginBottom: 16 },
  tHead: { flexDirection: "row", backgroundColor: D.dark },
  tHCell: { flex: 1, paddingVertical: 5, paddingHorizontal: 4, fontSize: 7, fontWeight: 700, color: D.textWhite, textAlign: "center" },
  tHCellWide: { flex: 2, paddingVertical: 5, paddingHorizontal: 6, fontSize: 7, fontWeight: 700, color: D.textWhiteMuted, textAlign: "center" },
  tRow: { flexDirection: "row", borderTopWidth: 1, borderColor: D.g200 },
  tRowAlt: { flexDirection: "row", borderTopWidth: 1, borderColor: D.g200, backgroundColor: D.g50 },
  tCell: { flex: 1, paddingVertical: 4, paddingHorizontal: 4, fontSize: 9, fontWeight: 700, textAlign: "center", color: D.text },
  tCellWide: { flex: 2, paddingVertical: 4, paddingHorizontal: 6, fontSize: 7, color: D.textMuted, textAlign: "center" },

  // ── Distribution chart ────────────────────────────────────────────────────
  chartBox: { borderRadius: 6, borderWidth: 1, borderColor: D.g200, padding: 10, backgroundColor: D.g50 },
  distRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  distCard: { flex: 1, backgroundColor: D.g100, borderRadius: 4, padding: 6, alignItems: "center" },
  distCardHl: { flex: 1, backgroundColor: D.amberFaint, borderRadius: 4, padding: 6, alignItems: "center", borderWidth: 1, borderColor: "#FDE68A" },
  distVal: { fontSize: 13, fontWeight: 700, color: D.text },
  distLbl: { fontSize: 6, color: D.textMuted, marginTop: 2 },

  // ── Events columns ────────────────────────────────────────────────────────
  eventsGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  eventsCol: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: D.g200, overflow: "hidden" },
  eventsColHead: { backgroundColor: D.g100, paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: D.g200 },
  eventsColTitle: { fontSize: 8, fontWeight: 700, color: D.text },
  eventsBody: { paddingHorizontal: 8, paddingVertical: 6 },
  eventItem: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  eventMin: {
    backgroundColor: D.g200, paddingHorizontal: 4, paddingVertical: 2,
    borderRadius: 3, fontSize: 7, fontWeight: 700, color: D.g700,
    marginRight: 5, minWidth: 24, textAlign: "center",
  },
  eventType:   { fontSize: 7, fontWeight: 700, color: D.text, marginRight: 3 },
  eventPlayer: { fontSize: 7, color: D.textMuted, flex: 1 },
  eventsEmpty: { fontSize: 7, color: D.g400, padding: 8, textAlign: "center" },

  // ── Player card ───────────────────────────────────────────────────────────
  playerCard: {
    borderRadius: 8, borderWidth: 1, borderColor: D.g200,
    overflow: "hidden", marginBottom: 12,
  },
  pcHead: {
    backgroundColor: D.dark2, flexDirection: "row",
    alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  pcPhoto: { width: 40, height: 40, borderRadius: 20, backgroundColor: D.g700, objectFit: "cover" as const, objectPosition: "center top" },
  pcPhotoInit: { width: 40, height: 40, borderRadius: 20, backgroundColor: D.g800, alignItems: "center", justifyContent: "center" },
  pcPhotoInitTxt: { fontSize: 14, fontWeight: 700, color: D.g400 },
  pcName:     { fontSize: 11, fontWeight: 700, color: D.textWhite },
  pcPosition: { fontSize: 8, color: D.textWhiteMuted, marginTop: 2 },
  pcRating: {
    marginLeft: "auto", paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: 5, alignItems: "center",
  },
  pcRatingTxt: { fontSize: 14, fontWeight: 700, color: D.textWhite },
  pcRatingLbl: { fontSize: 6, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  pcBody:    { padding: 12 },
  pcMetaRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  pcBadge: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
    fontSize: 7, fontWeight: 700,
  },
  pcStatPills: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 },
  pcStatPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: D.g100, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: D.g200,
  },
  pcStatLbl: { fontSize: 6, color: D.textMuted },
  pcStatVal: { fontSize: 8, fontWeight: 700, color: D.text },
  pcScoutText: { fontSize: 6, color: D.g600, lineHeight: 1.4, marginBottom: 8 },
  pcSWRow: { flexDirection: "row", gap: 10 },
  pcSWCol: { flex: 1, borderRadius: 4, padding: 6 },
  pcSWTitle: { fontSize: 6, fontWeight: 700, marginBottom: 3 },
  pcSWItem: { fontSize: 5.5, color: D.g600, marginBottom: 2, paddingLeft: 4 },

  // ── Player summary row (Resumo por Jogador) ──────────────────────────────
  sumCard: { borderRadius: 8, borderWidth: 1, borderColor: D.g200, overflow: "hidden", marginBottom: 8 },
  sumHead: { backgroundColor: D.dark2, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  sumPhoto: { width: 30, height: 30, borderRadius: 15, backgroundColor: D.g700, objectFit: "cover" as const, objectPosition: "center top" },
  sumPhotoInit: { width: 30, height: 30, borderRadius: 15, backgroundColor: D.g800, alignItems: "center", justifyContent: "center" },
  sumPhotoInitTxt: { fontSize: 10, fontWeight: 700, color: D.g400 },
  sumName: { fontSize: 9, fontWeight: 700, color: D.textWhite },
  sumPosBadge: { fontSize: 6, fontWeight: 700, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginTop: 2 },
  sumBody: { padding: 10 },
  sumProfileBox: { marginBottom: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 5, borderWidth: 1, borderColor: D.g200, backgroundColor: D.g50 },
  sumProfileLbl: { fontSize: 6, color: D.textMuted, fontWeight: 700, marginBottom: 3 },
  sumProfileTxt: { fontSize: 7, color: D.text, lineHeight: 1.4 },
  sumIndRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  sumIndItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 5, borderWidth: 1 },
  sumIndLbl: { fontSize: 5.5, color: D.textMuted },
  sumIndVal: { fontSize: 8, fontWeight: 700 },

  // ── Summary chips ─────────────────────────────────────────────────────────
  summaryBox: {
    flexDirection: "row", flexWrap: "wrap", gap: 4,
    marginBottom: 12, padding: 8,
    backgroundColor: D.g50, borderRadius: 6,
    borderWidth: 1, borderColor: D.g200,
  },
  summaryTitle: { fontSize: 7, fontWeight: 700, color: D.text, width: "100%", marginBottom: 3 },
  summaryChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: D.pageBg, paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 3, borderWidth: 1, borderColor: D.g200,
  },
  summaryChipLbl: { fontSize: 6, color: D.textMuted, marginRight: 3 },
  summaryChipVal: { fontSize: 7, fontWeight: 700, color: D.text },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute", bottom: 16, left: 28, right: 28,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderColor: D.g200, paddingTop: 6,
  },
  footerTxt: { fontSize: 6, color: D.g400 },
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface MatchSummaryVectorPdfProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  playerEventCounts: Record<string, Partial<Record<MatchEventType, number>>>;
  playerStatsMap?: Record<string, MatchPlayerStats>;
  teamName: string;
  logoUrl?: string;
  selectedPlayerIds?: string[];
  playerPhotoBase64?: Record<string, string>;
}

export function MatchSummaryVectorPdf({
  match,
  matchPlayers,
  matchEvents,
  playerEventCounts,
  playerStatsMap = {},
  teamName,
  logoUrl,
  selectedPlayerIds,
  playerPhotoBase64 = {},
}: MatchSummaryVectorPdfProps) {
  const matchDuration = match.duration_minutes || 90;

  const filteredPlayers = selectedPlayerIds?.length
    ? matchPlayers.filter((mp) => selectedPlayerIds.includes(mp.player_id))
    : matchPlayers;

  const filteredEvents = selectedPlayerIds?.length
    ? matchEvents.filter((e) => selectedPlayerIds.includes(e.player_id))
    : matchEvents;

  // ── Data helpers ───────────────────────────────────────────────────────────
  const getHalfStats = () => {
    const ec: EventCountsMap = {};
    let subF = 0, subS = 0;
    filteredEvents.forEach((e) => {
      if (e.event_status === "voided" || !e.count_in_stats) return;
      const half = e.half === 2 ? "second" : "first";
      const t = e.event_type as MatchEventType;
      if (!ec[t]) ec[t] = { first: 0, second: 0 };
      ec[t]![half] += e.value || 1;
    });
    filteredEvents.forEach((e) => {
      if (e.event_type === "player_on" && e.event_status !== "voided") {
        (e.half === 2 || e.period === 2) ? subS++ : subF++;
      }
    });
    const rows: Array<{ id: string; label: string; first: number; second: number; total: number; order: number }> = [];
    SUMMARY_EVENT_TYPES.forEach((t) => {
      const c = ec[t]; if (!c) return;
      const total = c.first + c.second; if (!total) return;
      const cfg = EVENT_TYPE_CONFIG[t];
      rows.push({ id: t, label: cfg.label, first: c.first, second: c.second, total, order: cfg.order });
    });
    COMPUTED_STATS.forEach((cs) => {
      const c = cs.compute(ec);
      const total = c.first + c.second; if (!total) return;
      rows.push({ id: cs.id, label: cs.label, first: c.first, second: c.second, total, order: cs.order });
    });
    rows.sort((a, b) => a.order - b.order);
    return {
      rows,
      subs: { first: subF, second: subS },
      goals: (ec.goal?.first ?? 0) + (ec.goal?.second ?? 0),
      assists: (ec.assist?.first ?? 0) + (ec.assist?.second ?? 0),
    };
  };

  const getDistStats = () => {
    const valid = filteredEvents.filter((e) => e.event_status !== "voided" && e.count_in_stats !== false);
    const f1 = valid.filter((e) => e.half === 1).length;
    const f2 = valid.filter((e) => e.half === 2).length;
    const mins: Record<number, number> = {};
    valid.forEach((e) => {
      const m = e.minute ?? (e.game_time_seconds != null ? Math.floor(e.game_time_seconds / 60) : null);
      if (m != null && m >= 0) mins[m] = (mins[m] ?? 0) + 1;
    });
    let peakMin = 0, peakCnt = 0;
    Object.entries(mins).forEach(([m, c]) => { if (c > peakCnt) { peakCnt = c; peakMin = +m; } });
    return { f1, f2, peakMin, peakCnt, total: valid.length };
  };

  const getChartData = () => {
    const valid = filteredEvents.filter((e) => e.event_status !== "voided" && e.count_in_stats !== false);
    const data: Array<{ minute: number; total: number; smoothed: number; goals: number }> = [];
    for (let i = 0; i <= matchDuration; i++) data.push({ minute: i, total: 0, smoothed: 0, goals: 0 });
    valid.forEach((e) => {
      let m = e.minute ?? (e.game_time_seconds != null ? Math.floor(e.game_time_seconds / 60) : null);
      if (m == null || m < 0 || m > matchDuration + 15) return;
      const idx = Math.min(Math.floor(m), data.length - 1);
      data[idx].total++;
      if (e.event_type === "goal") data[idx].goals++;
    });
    const smoothed = data.map((p, i) => {
      const w = 5, start = Math.max(0, i - 2), end = Math.min(data.length - 1, i + 2);
      let sum = 0, cnt = 0;
      for (let j = start; j <= end; j++) { sum += data[j].total; cnt++; }
      return { ...p, smoothed: cnt > 0 ? +(sum / cnt).toFixed(2) : 0 };
    });
    const maxEv = Math.max(...smoothed.map((d) => Math.max(d.total, d.smoothed)), 1);
    const goalMinutes = smoothed.filter((d) => d.goals > 0).map((d) => d.minute);
    return { data: smoothed, maxEv, goalMinutes };
  };

  const getEventsByHalf = () => {
    const f: MatchEvent[] = [], s: MatchEvent[] = [];
    filteredEvents.forEach((e) => {
      if (e.event_status === "voided" || e.count_in_stats === false) return;
      (e.half === 2 ? s : f).push(e);
    });
    const sort = (arr: MatchEvent[]) => arr.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
    return { first: sort(f), second: sort(s) };
  };

  const playerName = (id: string) => matchPlayers.find((p) => p.player_id === id)?.player?.full_name ?? "Jogador";

  // ── Derived data ───────────────────────────────────────────────────────────
  const halfStats  = getHalfStats();
  const distStats  = getDistStats();
  const chartData  = getChartData();
  const evsByHalf  = getEventsByHalf();

  const competition = match.competition?.display_name || match.competition?.name || "Competição";
  const displayTeam = match.team_name_display || teamName || "Time";
  const halfMin     = Math.floor(matchDuration / 2);
  const isFiltered  = !!(selectedPlayerIds?.length);
  const filterNames = isFiltered
    ? filteredPlayers.map((mp) => mp.player?.full_name).filter(Boolean).join(", ")
    : null;
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // SVG chart helpers
  const CW = 500, CH = 80;
  const CP = { t: 8, r: 8, b: 16, l: 22 };
  const PW = CW - CP.l - CP.r, PH = CH - CP.t - CP.b;
  const xS = PW / matchDuration;
  const yS = PH / chartData.maxEv;

  const areaPath = (() => {
    if (!chartData.data.length) return "";
    const bl = CP.t + PH;
    let p = `M ${CP.l} ${bl}`;
    chartData.data.forEach((d) => {
      p += ` L ${(CP.l + d.minute * xS).toFixed(1)} ${(CP.t + PH - d.smoothed * yS).toFixed(1)}`;
    });
    return p + ` L ${CP.l + PW} ${bl} Z`;
  })();

  const linePath = chartData.data.map((d, i) =>
    `${i === 0 ? "M" : "L"} ${(CP.l + d.minute * xS).toFixed(1)} ${(CP.t + PH - d.smoothed * yS).toFixed(1)}`
  ).join(" ");

  const dots = chartData.data.filter((d) => d.total > 0).map((d) => ({
    cx: CP.l + d.minute * xS,
    cy: CP.t + PH - d.total * yS,
  }));

  // ── Render helpers ─────────────────────────────────────────────────────────
  const PageHeader = ({ compact }: { compact?: boolean }) => (
    <>
      <View style={s.headerBand}>
        <View style={s.headerLeft}>
          {logoUrl && <Image src={logoUrl} style={compact ? s.logoSm : s.logo} />}
          <View>
            <Text style={compact ? s.h1Sm : s.h1}>Resumo do Jogo</Text>
            <Text style={s.sub}>{compact ? `${displayTeam} vs ${match.opponent_name}` : competition}</Text>
          </View>
        </View>
        {!compact && (
          <View style={s.headerRight}>
            <Text style={s.matchTitle}>{displayTeam} vs {match.opponent_name}</Text>
            <Text style={s.matchMeta}>
              {format(new Date(match.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {match.match_start_time && ` · ${format(new Date(match.match_start_time), "HH:mm")}`}
            </Text>
            {match.venue && <Text style={s.matchMeta}>{match.venue}</Text>}
            {filterNames && <Text style={s.playerTag}>Jogador: {filterNames}</Text>}
          </View>
        )}
      </View>
      <View style={s.redLine} />
    </>
  );

  const Footer = () => (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>Gerado por M3 Scouting · {now}</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  const renderPlayerSummaryCard = (mp: MatchPlayer) => {
    if (!mp.player) return null;
    const stats = playerStatsMap[mp.player_id];
    const minutesInfo = calculateMinutesPlayed({
      started: mp.started,
      entered_minute: mp.entered_minute,
      exited_minute: mp.exited_minute,
      minutes_played: null,
    });
    const mins = minutesInfo.minutesPlayed;
    const initials = mp.player.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

    let profileLabel = "—";
    let profileColors = { bg: D.g100, text: D.textMuted };
    let profileDesc = "";
    let indicators: Array<{ id: string; label: string; value: string; type: "positive" | "neutral" | "negative"; icon: string }> = [];

    if (mins >= 10 && stats) {
      const normalized = normalizeMatchStats(stats, {
        started: mp.started,
        entered_minute: mp.entered_minute ?? null,
        exited_minute: mp.exited_minute ?? null,
        minutes_played: mp.minutes_played,
      });
      const ballActions = calculateBallActionsFromMatchStats(stats);
      const statsInput: MatchStatsInput = {
        goals: normalized.goals ?? 0, assists: normalized.assists ?? 0,
        shots: normalized.shots_total, shots_on_target: normalized.shots_on_target ?? 0,
        shots_blocked: normalized.shots_blocked ?? 0, key_passes: normalized.key_passes ?? 0,
        chances_created: normalized.chances_created ?? 0, passes_completed: normalized.passes_completed ?? 0,
        passes_total: normalized.passes_total_derived, dribbles_success: normalized.dribbles_success ?? 0,
        dribbles_total: normalized.dribbles_total_derived, tackles: normalized.tackles ?? 0,
        interceptions: normalized.interceptions ?? 0, clearances: normalized.clearances ?? 0,
        recoveries: normalized.recoveries ?? 0, duels_won: normalized.duels_won ?? 0,
        duels_total: normalized.duels_total_derived, aerial_duels_won: normalized.aerial_duels_won ?? 0,
        aerial_duels_total: normalized.aerial_duels_total_derived, fouls_committed: normalized.fouls_committed ?? 0,
        fouls_suffered: normalized.fouls_suffered ?? 0, yellow_cards: normalized.yellow_cards ?? 0,
        red_cards: normalized.red_cards ?? 0, possession_lost: normalized.possession_lost ?? 0,
        saves: normalized.saves ?? 0, goals_conceded: normalized.goals_conceded ?? 0,
        blocked_shots: normalized.blocked_shots ?? 0, was_dribbled: normalized.was_dribbled ?? 0,
        ball_actions: ballActions, crosses_success: normalized.crosses_success ?? 0,
        crosses_failed: normalized.crosses_failed ?? 0, offsides: normalized.offsides ?? 0,
      };
      const profile = classifyMatchProfile(matchPlayerStatsToInput(stats), mins);
      const eff = calculateMatchEfficiency(matchPlayerStatsToInput(stats), mins);
      const pc = PROFILE_COLOR[profile.primary.key];
      const scout = generateScoutingText(mp.player.position, profile.primary.key, eff.level, false);
      const analysis = generatePostGameAnalysis(mp.player.position, statsInput, mins);

      profileLabel = profile.primary.label;
      profileColors = pc;
      profileDesc = scout.combinedText.slice(0, 140) + (scout.combinedText.length > 140 ? "…" : "");
      indicators = analysis.quickIndicators.slice(0, 4) as typeof indicators;
    }

    // Pair indicators into rows of 2
    const indRows: (typeof indicators)[] = [];
    for (let i = 0; i < indicators.length; i += 2) indRows.push(indicators.slice(i, i + 2));

    return (
      <View key={mp.id} style={s.sumCard} wrap={false}>
        {/* Dark header */}
        <View style={s.sumHead}>
          {playerPhotoBase64[mp.player_id] ? (
            <Image src={playerPhotoBase64[mp.player_id]} style={s.sumPhoto} />
          ) : mp.player.photo_url ? (
            <Image src={mp.player.photo_url} style={s.sumPhoto} />
          ) : (
            <View style={s.sumPhotoInit}><Text style={s.sumPhotoInitTxt}>{initials}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.sumName}>{mp.player.full_name}</Text>
            <View style={{ ...s.sumPosBadge, backgroundColor: profileColors.bg }}>
              <Text style={{ fontSize: 6, fontWeight: 700, color: profileColors.text }}>{mp.player.position}</Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.07)" }}>
            <Text style={{ fontSize: 7, color: D.textWhiteMuted }}>{mins} min</Text>
          </View>
        </View>

        {/* Body */}
        {(profileDesc || indicators.length > 0) && (
          <View style={s.sumBody}>
            {profileDesc ? (
              <View style={s.sumProfileBox}>
                <Text style={s.sumProfileLbl}>Perfil de Atuação</Text>
                <Text style={s.sumProfileTxt}>{profileDesc}</Text>
              </View>
            ) : null}
            {indRows.map((row, ri) => (
              <View key={ri} style={s.sumIndRow}>
                {row.map((ind) => {
                  const bg = ind.type === "positive" ? D.greenFaint : ind.type === "negative" ? "#FEE2E2" : D.g100;
                  const border = ind.type === "positive" ? "#86EFAC" : ind.type === "negative" ? "#FECACA" : D.g200;
                  const valColor = ind.type === "positive" ? D.green : ind.type === "negative" ? "#EF4444" : D.text;
                  return (
                    <View key={ind.id} style={{ ...s.sumIndItem, backgroundColor: bg, borderColor: border }}>
                      <View>
                        <Text style={s.sumIndLbl}>{ind.label}</Text>
                        <Text style={{ ...s.sumIndVal, color: valColor }}>{ind.value}</Text>
                      </View>
                    </View>
                  );
                })}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPlayerCard = (mp: MatchPlayer) => {
    if (!mp.player) return null;
    const stats = playerStatsMap[mp.player_id];
    const minutesInfo = calculateMinutesPlayed({
      started: mp.started,
      entered_minute: mp.entered_minute,
      exited_minute: mp.exited_minute,
      minutes_played: null,
    });
    const mins = minutesInfo.minutesPlayed;
    const initials = mp.player.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

    // Rating
    const ratingVal = stats?.rating ?? null;
    const ratingBg = ratingVal == null ? D.g600
      : ratingVal < 6   ? "#EF4444"
      : ratingVal < 6.5 ? "#F97316"
      : ratingVal < 7   ? "#F59E0B"
      : ratingVal < 8   ? "#22C55E"
      : ratingVal < 9   ? "#06B6D4"
                        : "#3B82F6";

    // Analysis
    const ballActions = stats ? calculateBallActionsFromMatchStats(stats) : 0;
    const counts = playerEventCounts[mp.player_id] ?? {};
    const statEntries = Object.entries(counts)
      .filter(([, v]) => (v ?? 0) > 0)
      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
      .slice(0, 6);

    let profileEl: JSX.Element | null = null;
    let effEl: JSX.Element | null = null;
    let scoutEl: JSX.Element | null = null;
    let swEl: JSX.Element | null = null;

    if (mins >= 10 && stats) {
      const normalized = normalizeMatchStats(stats, {
        started: mp.started,
        entered_minute: mp.entered_minute ?? null,
        exited_minute: mp.exited_minute ?? null,
        minutes_played: mp.minutes_played,
      });
      const statsInput: MatchStatsInput = {
        goals: normalized.goals ?? 0, assists: normalized.assists ?? 0,
        shots: normalized.shots_total, shots_on_target: normalized.shots_on_target ?? 0,
        shots_blocked: normalized.shots_blocked ?? 0, key_passes: normalized.key_passes ?? 0,
        chances_created: normalized.chances_created ?? 0, passes_completed: normalized.passes_completed ?? 0,
        passes_total: normalized.passes_total_derived, dribbles_success: normalized.dribbles_success ?? 0,
        dribbles_total: normalized.dribbles_total_derived, tackles: normalized.tackles ?? 0,
        interceptions: normalized.interceptions ?? 0, clearances: normalized.clearances ?? 0,
        recoveries: normalized.recoveries ?? 0, duels_won: normalized.duels_won ?? 0,
        duels_total: normalized.duels_total_derived, aerial_duels_won: normalized.aerial_duels_won ?? 0,
        aerial_duels_total: normalized.aerial_duels_total_derived, fouls_committed: normalized.fouls_committed ?? 0,
        fouls_suffered: normalized.fouls_suffered ?? 0, yellow_cards: normalized.yellow_cards ?? 0,
        red_cards: normalized.red_cards ?? 0, possession_lost: normalized.possession_lost ?? 0,
        saves: normalized.saves ?? 0, goals_conceded: normalized.goals_conceded ?? 0,
        blocked_shots: normalized.blocked_shots ?? 0, was_dribbled: normalized.was_dribbled ?? 0,
        ball_actions: ballActions, crosses_success: normalized.crosses_success ?? 0,
        crosses_failed: normalized.crosses_failed ?? 0, offsides: normalized.offsides ?? 0,
      };

      const profile = classifyMatchProfile(matchPlayerStatsToInput(stats), mins);
      const eff = calculateMatchEfficiency(matchPlayerStatsToInput(stats), mins);
      const pc = PROFILE_COLOR[profile.primary.key];
      const ec = D[`eff${eff.level.charAt(0).toUpperCase() + eff.level.slice(1)}` as "effHigh" | "effMedium" | "effLow"] ?? D.effNone;
      const scout = generateScoutingText(mp.player.position, profile.primary.key, eff.level, false);
      const analysis = generatePostGameAnalysis(mp.player.position, statsInput, mins);

      profileEl = (
        <View style={{ ...s.pcBadge, backgroundColor: pc.bg }}>
          <Text style={{ fontSize: 6, fontWeight: 700, color: pc.text }}>{profile.primary.label}</Text>
        </View>
      );
      effEl = (
        <View style={{ ...s.pcBadge, backgroundColor: ec.bg }}>
          <Text style={{ fontSize: 6, fontWeight: 700, color: ec.text }}>Efic: {eff.level === "high" ? "Alta" : eff.level === "medium" ? "Média" : "Baixa"}</Text>
        </View>
      );
      scoutEl = (
        <Text style={s.pcScoutText}>
          {scout.combinedText.slice(0, 160)}{scout.combinedText.length > 160 ? "…" : ""}
        </Text>
      );

      const hasS = analysis.strengthsImprovements.strengths.length > 0;
      const hasI = analysis.strengthsImprovements.improvements.length > 0;
      if (hasS || hasI) {
        swEl = (
          <View style={s.pcSWRow}>
            {hasS && (
              <View style={{ ...s.pcSWCol, backgroundColor: D.greenFaint }}>
                <Text style={{ ...s.pcSWTitle, color: D.green }}>✓ Pontos Fortes</Text>
                {analysis.strengthsImprovements.strengths.slice(0, 3).map((t, i) => (
                  <Text key={i} style={s.pcSWItem}>· {t.slice(0, 70)}{t.length > 70 ? "…" : ""}</Text>
                ))}
              </View>
            )}
            {hasI && (
              <View style={{ ...s.pcSWCol, backgroundColor: D.amberFaint }}>
                <Text style={{ ...s.pcSWTitle, color: D.amber }}>⚠ A Melhorar</Text>
                {analysis.strengthsImprovements.improvements.slice(0, 3).map((t, i) => (
                  <Text key={i} style={s.pcSWItem}>· {t.slice(0, 70)}{t.length > 70 ? "…" : ""}</Text>
                ))}
              </View>
            )}
          </View>
        );
      }
    }

    return (
      <View key={mp.id} style={s.playerCard} wrap={false}>
        {/* Dark header */}
        <View style={s.pcHead}>
          {playerPhotoBase64[mp.player_id] ? (
            <Image src={playerPhotoBase64[mp.player_id]} style={s.pcPhoto} />
          ) : mp.player.photo_url ? (
            <Image src={mp.player.photo_url} style={s.pcPhoto} />
          ) : (
            <View style={s.pcPhotoInit}><Text style={s.pcPhotoInitTxt}>{initials}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.pcName}>{mp.player.full_name}</Text>
            <Text style={s.pcPosition}>{mp.player.position}</Text>
          </View>
          {/* Rating */}
          <View style={{ ...s.pcRating, backgroundColor: ratingBg }}>
            <Text style={s.pcRatingTxt}>{ratingVal != null ? ratingVal.toFixed(1) : "—"}</Text>
            <Text style={s.pcRatingLbl}>NOTA</Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.pcBody}>
          {/* Meta row */}
          <View style={s.pcMetaRow}>
            <View style={{ ...s.pcBadge, backgroundColor: mp.started ? D.greenFaint : D.blueFaint }}>
              <Text style={{ fontSize: 6, fontWeight: 700, color: mp.started ? D.green : D.blue }}>
                {mp.started ? "TITULAR" : "RESERVA"}
              </Text>
            </View>
            <View style={{ ...s.pcBadge, backgroundColor: D.g100, borderWidth: 1, borderColor: D.g200 }}>
              <Text style={{ fontSize: 6, color: D.textMuted }}>{mins} min</Text>
            </View>
            {profileEl}
            {effEl}
          </View>

          {/* Scouting text */}
          {scoutEl}

          {/* Stat pills */}
          {(statEntries.length > 0 || ballActions > 0) && (
            <View style={s.pcStatPills}>
              {ballActions > 0 && (
                <View style={{ ...s.pcStatPill, backgroundColor: "#164E63", borderColor: "#0E7490" }}>
                  <Text style={{ ...s.pcStatLbl, color: "#67E8F9" }}>Ações</Text>
                  <Text style={{ ...s.pcStatVal, color: "#22D3EE" }}>{ballActions}</Text>
                </View>
              )}
              {statEntries.map(([type, val]) => (
                <View key={type} style={s.pcStatPill}>
                  <Text style={s.pcStatLbl}>{EVENT_LABELS[type as MatchEventType] ?? type}</Text>
                  <Text style={s.pcStatVal}>{val}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Strengths / Improvements */}
          {swEl}
        </View>
      </View>
    );
  };

  // ── Document ───────────────────────────────────────────────────────────────
  return (
    <Document>

      {/* Single page — react-pdf breaks automatically when content overflows */}
      <Page size="A4" style={s.page}>
        <PageHeader />
        {/* Footer fixed: repeats on every auto-generated page */}
        <Footer />
        <View style={s.body}>

          {/* KPI row */}
          <View style={s.kpiRow}>
            {[
              { val: filteredPlayers.length, lbl: "Jogadores",    color: D.g700 },
              { val: filteredEvents.length,  lbl: "Eventos",      color: D.g700 },
              { val: halfStats.goals,        lbl: "Gols",         color: D.green },
              { val: halfStats.assists,      lbl: "Assistências", color: D.blue  },
            ].map(({ val, lbl, color }) => (
              <View key={lbl} style={{ ...s.kpiCard, borderTopColor: color }}>
                <Text style={{ ...s.kpiVal, color }}>{val}</Text>
                <Text style={s.kpiLbl}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* Stats table */}
          <Text style={s.secTitle}>Estatísticas por Tempo</Text>
          <View style={s.table}>
            <View style={s.tHead}>
              <Text style={s.tHCell}>1º TEMPO</Text>
              <Text style={s.tHCellWide}>Estatística</Text>
              <Text style={s.tHCell}>2º TEMPO</Text>
              <Text style={s.tHCell}>TOTAL</Text>
            </View>
            {halfStats.rows.map((row, i) => (
              <View key={row.id} style={i % 2 === 0 ? s.tRow : s.tRowAlt} wrap={false}>
                <Text style={{ ...s.tCell, color: row.first > row.second ? D.red : D.text }}>{row.first}</Text>
                <Text style={s.tCellWide}>{row.label}</Text>
                <Text style={{ ...s.tCell, color: row.second > row.first ? D.red : D.text }}>{row.second}</Text>
                <Text style={{ ...s.tCell, color: D.text }}>{row.total}</Text>
              </View>
            ))}
            {(halfStats.subs.first > 0 || halfStats.subs.second > 0) && (
              <View style={halfStats.rows.length % 2 === 0 ? s.tRow : s.tRowAlt} wrap={false}>
                <Text style={s.tCell}>{halfStats.subs.first}</Text>
                <Text style={s.tCellWide}>Substituições</Text>
                <Text style={s.tCell}>{halfStats.subs.second}</Text>
                <Text style={s.tCell}>{halfStats.subs.first + halfStats.subs.second}</Text>
              </View>
            )}
          </View>

          {/* Distribution chart */}
          <View wrap={false}>
            <Text style={s.secTitle}>Distribuição de Eventos</Text>
            <Text style={s.secSub}>Intensidade de atividade ao longo da partida</Text>
            <View style={s.distRow}>
              {[
                { val: distStats.f1, lbl: "1º TEMPO", hl: false },
                { val: distStats.f2, lbl: "2º TEMPO", hl: false },
                { val: `${distStats.peakMin}'`, lbl: `PICO (${distStats.peakCnt} ev)`, hl: true },
                { val: distStats.total, lbl: "TOTAL", hl: false },
              ].map(({ val, lbl, hl }) => (
                <View key={lbl} style={hl ? s.distCardHl : s.distCard}>
                  <Text style={s.distVal}>{val}</Text>
                  <Text style={s.distLbl}>{lbl}</Text>
                </View>
              ))}
            </View>
            <View style={s.chartBox}>
              <Svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
                <Defs>
                  <LinearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={D.red} stopOpacity={0.25} />
                    <Stop offset="100%" stopColor={D.red} stopOpacity={0.01} />
                  </LinearGradient>
                </Defs>
                {[0, 0.5, 1].map((r, i) => (
                  <SvgLine key={i}
                    x1={CP.l} y1={CP.t + PH * (1 - r)}
                    x2={CW - CP.r} y2={CP.t + PH * (1 - r)}
                    stroke={D.g200} strokeWidth={0.5} strokeDasharray="2,3"
                  />
                ))}
                <Path d={areaPath} fill="url(#g1)" stroke="none" />
                <SvgLine
                  x1={CP.l + (halfMin / matchDuration) * PW} y1={CP.t}
                  x2={CP.l + (halfMin / matchDuration) * PW} y2={CP.t + PH}
                  stroke={D.g300} strokeWidth={1} strokeDasharray="4,3"
                />
                {chartData.goalMinutes.map((m, i) => (
                  <SvgLine key={i}
                    x1={CP.l + (m / matchDuration) * PW} y1={CP.t}
                    x2={CP.l + (m / matchDuration) * PW} y2={CP.t + PH}
                    stroke={D.green} strokeWidth={1.5} strokeOpacity={0.7}
                  />
                ))}
                <Path d={linePath} stroke={D.red} strokeWidth={2} fill="none" />
                {dots.map((d, i) => (
                  <Circle key={i} cx={d.cx} cy={d.cy} r={2} fill={D.g400} fillOpacity={0.5} />
                ))}
                <SvgLine
                  x1={CP.l} y1={CP.t + PH}
                  x2={CW - CP.r} y2={CP.t + PH}
                  stroke={D.g300} strokeWidth={1}
                />
              </Svg>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: CP.l - 4, marginTop: 2 }}>
                {[0, 15, 30, 45, 60, 75, 90].filter((m) => m <= matchDuration).map((m) => (
                  <Text key={m} style={{ fontSize: 6, color: D.g400 }}>{m}'</Text>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <View style={{ width: 10, height: 2, backgroundColor: D.red, borderRadius: 1 }} />
                  <Text style={{ fontSize: 6, color: D.g500 }}>Intensidade</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <View style={{ width: 4, height: 4, backgroundColor: D.g400, borderRadius: 2 }} />
                  <Text style={{ fontSize: 6, color: D.g500 }}>Eventos/min</Text>
                </View>
                {chartData.goalMinutes.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <View style={{ width: 2, height: 8, backgroundColor: D.green, borderRadius: 1 }} />
                    <Text style={{ fontSize: 6, color: D.g500 }}>Gols</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Events by half */}
          <Text style={{ ...s.secTitle, marginTop: 12 }}>Eventos por Tempo</Text>
          <View style={s.eventsGrid}>
            {[
              { title: `1º TEMPO (${evsByHalf.first.length})`, events: evsByHalf.first },
              { title: `2º TEMPO (${evsByHalf.second.length})`, events: evsByHalf.second },
            ].map(({ title, events }) => (
              <View key={title} style={s.eventsCol}>
                <View style={s.eventsColHead}>
                  <Text style={s.eventsColTitle}>{title}</Text>
                </View>
                <View style={s.eventsBody}>
                  {events.length === 0 ? (
                    <Text style={s.eventsEmpty}>Nenhum evento</Text>
                  ) : events.map((e) => (
                    <View key={e.id} style={s.eventItem}>
                      <Text style={s.eventMin}>{e.display_minute || `${e.minute}'`}</Text>
                      <Text style={s.eventType}>{EVENT_LABELS[e.event_type]}</Text>
                      <Text style={s.eventPlayer}>· {playerName(e.player_id)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* Page 2+: Summary + Player stats — guaranteed new page */}
      {filteredPlayers.length > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader compact />
          <Footer />
          <View style={s.body}>
            <Text style={s.secTitle}>Resumo por Jogador</Text>
            {filteredPlayers.map(renderPlayerSummaryCard)}
            <Text style={{ ...s.secTitle, marginTop: 14 }}>Estatísticas por Jogador</Text>
            {filteredPlayers.map(renderPlayerCard)}
          </View>
        </Page>
      )}

    </Document>
  );
}
