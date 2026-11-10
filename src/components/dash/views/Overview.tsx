import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { useContractNotificationCheck } from "@/hooks/useContractNotificationCheck";
import { AthleteDashboard } from "@/components/dashboard/athlete/AthleteDashboard";
import {
  buildInsights, groupInsightsByPlayer,
  type AggregateRow, type GoalRow, type ContractRow, type PhysicalRow, type PlayerInsightGroup,
} from "@/lib/insightsEngine";
import { Ic } from "../icons";
import { Av, Bar, Head, Kpi, PosPill, Seg, TIER_COLOR, View, fmt, posColor, shortPos } from "../ui";

/* =====================================================================
   Visão geral — design de painel.html, mesmas consultas da versão anterior
   ===================================================================== */

const YEAR = new Date().getFullYear();
const ATTR_K = ["ATA", "TEC", "TAT", "DEF", "CRI"] as const;
const ATTR_COL = ["ata_score_100", "tec_score_100", "tat_score_100", "def_score_100", "cri_score_100"] as const;
const POS_NAME: Record<string, string> = {
  GOL: "Goleiro", ZAG: "Zagueiro", LD: "Lateral direito", LE: "Lateral esquerdo", VOL: "Volante", MC: "Meio-campo",
  MEI: "Meia", MEA: "Meia atacante", PD: "Ponta direita", PE: "Ponta esquerda", CA: "Centroavante", ATA: "Atacante",
};

type Player = { id: string; full_name: string; position: string | null; photo_url: string | null; age: number | null; current_club: string | null; auto_rating: number | null };

/* ---------- dados ---------- */
function useOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["dash-m3", "overview", YEAR],
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const in60 = new Date(Date.now() + 60 * 864e5).toISOString().split("T")[0];
      const [playersRes, contractsRes] = await Promise.all([
        supabase.from("players")
          .select("id, full_name, position, photo_url, age, current_club, auto_rating")
          .or("is_archived.is.null,is_archived.eq.false"),
        supabase.from("player_contract_history")
          .select("player_id, players!player_contract_history_player_id_fkey(is_archived)")
          .or("is_archived.is.null,is_archived.eq.false")
          .gte("end_date", today).lte("end_date", in60),
      ]);
      // mesma regra da versão anterior: volta até a temporada que tem gols/assistências
      let agg: { total_goals: number | null; total_assists: number | null }[] = [];
      let seasonYear = YEAR;
      for (const y of [YEAR, YEAR - 1, YEAR - 2]) {
        const { data } = await supabase.rpc("get_season_player_aggregates", { p_season_year: y });
        agg = (data as typeof agg | null) ?? [];
        seasonYear = y;
        if (agg.some((r) => (r.total_goals || 0) > 0 || (r.total_assists || 0) > 0)) break;
      }
      const expiring = new Set(
        ((contractsRes.data as { player_id: string; players: { is_archived: boolean | null } | null }[] | null) ?? [])
          .filter((c) => !c.players?.is_archived).map((c) => c.player_id)
      );
      const players = (playersRes.data as Player[] | null) ?? [];
      return {
        players,
        goals: agg.reduce((s, r) => s + (r.total_goals || 0), 0),
        assists: agg.reduce((s, r) => s + (r.total_assists || 0), 0),
        seasonYear,
        expiring: expiring.size,
      };
    },
  });
}

/** mesmas 4 consultas e o mesmo motor de insights do cartão anterior */
function useInsightGroups(enabled: boolean) {
  const agg = useQuery({
    queryKey: ["insights-season-aggregates-v3", YEAR],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      for (const y of [YEAR, YEAR - 1, YEAR - 2]) {
        const { data, error } = await supabase.rpc("get_season_player_aggregates", { p_season_year: y });
        if (error) throw error;
        const rows = (data ?? []) as AggregateRow[];
        if (rows.length > 0) return { year: y, aggregates: rows };
      }
      return { year: YEAR, aggregates: [] as AggregateRow[] };
    },
  });
  const year = agg.data?.year ?? YEAR;
  const goals = useQuery<GoalRow[]>({
    queryKey: ["insights-goals", year],
    enabled: enabled && !!agg.data,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("player_season_goals")
        .select("id, player_id, goal_type, target_value, season_year, player:players(full_name)").eq("season_year", year);
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
  });
  const contracts = useQuery<ContractRow[]>({
    queryKey: ["insights-contracts-v3"],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const in90 = new Date(Date.now() + 90 * 864e5).toISOString().split("T")[0];
      const { data, error } = await supabase.from("player_contract_history")
        .select("player_id, end_date, players!player_contract_history_player_id_fkey(full_name, is_archived)")
        .eq("is_archived", false).not("end_date", "is", null).gte("end_date", today).lte("end_date", in90);
      if (error) throw error;
      type Row = { player_id: string; end_date: string; players: { full_name: string; is_archived: boolean | null } | null };
      const by = new Map<string, ContractRow>();
      for (const r of (data ?? []) as Row[]) {
        if (r.players?.is_archived) continue;
        const ex = by.get(r.player_id);
        if (!ex || r.end_date < (ex.contract_end ?? "9999")) by.set(r.player_id, { id: r.player_id, full_name: r.players?.full_name ?? "Atleta", contract_end: r.end_date });
      }
      return [...by.values()];
    },
  });
  const physical = useQuery<PhysicalRow[]>({
    queryKey: ["insights-player-physical"],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id, full_name, position, body_fat_percentage").or("is_archived.is.null,is_archived.eq.false");
      if (error) throw error;
      return (data ?? []) as PhysicalRow[];
    },
  });
  return useMemo(() => {
    if (!agg.data || !goals.data || !contracts.data || !physical.data) return null;
    const posBy = new Map(physical.data.map((p) => [p.id, p.position]));
    let dismissed = new Set<string>();
    try { dismissed = new Set(JSON.parse(localStorage.getItem("dismissed_insights_v2") ?? "[]")); } catch { /* sem armazenamento */ }
    const all = buildInsights(agg.data.aggregates, goals.data, contracts.data, physical.data, year, posBy).filter((i) => !dismissed.has(i.id));
    return groupInsightsByPlayer(all);
  }, [agg.data, goals.data, contracts.data, physical.data, year]);
}

function useCompetitionsUsage(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard-v2", "competitions-usage", YEAR],
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_competitions_usage", { p_season_year: YEAR });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data as any[] | null) ?? []).map((r) => ({
        id: r.id as string, name: r.name as string, tier: r.tier as string,
        coef: Number(r.final_coefficient ?? 1), uses: Number(r.usos ?? 0), players: Number(r.jogadores ?? 0),
        last: (r.ultimo_uso as string | null) ?? null,
      }));
    },
  });
}

function useAttributeMap(ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: ["dash-m3", "attr-map", ids.join(",")],
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("player_attribute_scores")
        .select("player_id, season_year, ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, details")
        .in("player_id", ids);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []) as any[];
      const years = [...new Set(rows.map((r) => r.season_year as number))].filter((y) => y >= 2024).sort((a, b) => b - a);
      const byYear: Record<number, Record<string, number[]>> = {};
      for (const y of years) {
        byYear[y] = {};
        for (const id of ids) {
          const pr = rows.filter((r) => r.player_id === id && r.season_year === y);
          if (!pr.length) continue;
          let w = 0; const s = [0, 0, 0, 0, 0];
          pr.forEach((r) => { const m = Math.max(Number(r.details?.minutes ?? 0), 1); ATTR_COL.forEach((c, i) => (s[i] += (r[c] ?? 0) * m)); w += m; });
          byYear[y][id] = s.map((v) => Math.round(v / (w || 1)));
        }
      }
      return { years, byYear };
    },
  });
}

/* ---------- tela ---------- */
const greet = () => {
  const h = +new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Campo_Grande" }).format(new Date());
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

function InsightCard({ g, photo, age, pos }: { g: PlayerInsightGroup; photo?: string | null; age?: number | null; pos?: string | null }) {
  const kind = g.category === "positive" ? "pos" : "att";
  const shown = g.items.slice(0, 3);
  const more = g.items.length - shown.length;
  const dot = (c: string) => (c === "critical" ? "#FF3B30" : c === "alert" ? "#FF9F0A" : c === "positive" ? "#30D158" : "#8E8E93");
  return (
    <Link className={`insc ${kind}`} to={`/dashboard/atletas/${g.playerId}`}>
      <div className="who">
        <Av name={g.playerName} photo={photo} size={44} />
        <div><b>{g.playerName}</b><span>{[pos ? POS_NAME[shortPos(pos)] ?? pos : null, age ? `${age} anos` : null].filter(Boolean).join(" · ")}</span></div>
      </div>
      <ul>
        {shown.map((it) => (
          <li key={it.id} style={{ ["--c" as string]: dot(it.category) }}>
            <span><strong>{it.title}</strong>{it.description}</span>
          </li>
        ))}
      </ul>
      <span className="more">{more > 0 ? `+${more} ${more > 1 ? "outros insights" : "outro insight"} · ` : ""}Ver atleta →</span>
    </Link>
  );
}

export function Overview() {
  const { user, isAdmin, isScout, isPlayer, rolesLoading, session, permissionsLoading } = useAuth();
  const ready = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  useContractNotificationCheck();

  const ov = useOverview(ready);
  const groups = useInsightGroups(ready);
  const comps = useCompetitionsUsage(ready);
  const players = useMemo(() => ov.data?.players ?? [], [ov.data]);
  const top = useMemo(() => players.filter((p) => p.auto_rating != null).sort((a, b) => (b.auto_rating ?? 0) - (a.auto_rating ?? 0)).slice(0, 6), [players]);
  const attr = useAttributeMap(top.map((p) => p.id), ready);
  const [insF, setInsF] = useState<"all" | "att" | "pos">("all");
  const [attrYear, setAttrYear] = useState<number | null>(null);

  if (!rolesLoading && isPlayer && !isAdmin && !isScout) return <AthleteDashboard />;

  const byId = new Map(players.map((p) => [p.id, p]));
  const gs = groups ?? [];
  const att = gs.filter((g) => g.category === "critical" || g.category === "alert").length;
  const posN = gs.filter((g) => g.category === "positive").length;
  const shownGroups = gs.filter((g) => insF === "all" || (insF === "pos" ? g.category === "positive" : g.category !== "positive"));

  const byPos: Record<string, Player[]> = {};
  players.forEach((p) => { const k = shortPos(p.position); (byPos[k] ??= []).push(p); });
  const posRows = Object.entries(byPos).sort((a, b) => b[1].length - a[1].length);
  const maxPos = Math.max(1, ...posRows.map(([, l]) => l.length));

  const year = attrYear ?? attr.data?.years[0] ?? null;
  const heat = year ? attr.data?.byYear[year] ?? {} : {};
  const heatRows = top.filter((p) => heat[p.id]);

  const usedComps = (comps.data ?? []).filter((c) => c.uses > 0).sort((a, b) => b.uses - a.uses);
  const name = (user?.user_metadata?.name as string | undefined)?.split(" ")[0] || (user?.email ?? "").split("@")[0];
  const sy = ov.data?.seasonYear ?? YEAR;

  return (
    <View>
      <Head
        title="Visão geral"
        kicker={<>{greet()}{name ? `, ${name[0].toUpperCase()}${name.slice(1)}` : ""}{groups ? <> · <b>{att} {att === 1 ? "alerta" : "alertas"}</b> {att === 1 ? "pede" : "pedem"} sua atenção</> : null}</>}
      >
        <Link className="btn g" to="/dashboard/atletas"><Ic n="users" />Atletas</Link>
        <Link className="btn r" to="/dashboard/relatorios/novo"><Ic n="plus" />Novo relatório</Link>
      </Head>

      <section className="grid g4" style={{ ["--s" as string]: 1 }}>
        <Link to="/dashboard/atletas" style={{ textDecoration: "none" }}>
          <Kpi label="Atletas" value={ov.data ? players.length : "—"} note="Portfólio ativo" hl c="var(--green)" spark="M2 22 L18 18 L34 20 L50 10 L70 6" />
        </Link>
        <Kpi label="Gols" value={ov.data ? ov.data.goals : "—"} note={`Temporada ${sy}`} c="var(--yellow)" spark="M2 24 L14 20 L28 22 L42 12 L56 14 L70 4" delay={0.08} />
        <Kpi label="Assistências" value={ov.data ? ov.data.assists : "—"} note={`Temporada ${sy}`} c="var(--teal)" spark="M2 20 L16 22 L30 16 L44 18 L58 10 L70 12" delay={0.16} />
        <Link to="/dashboard/contratos?status=expiring&days=60" style={{ textDecoration: "none" }}>
          <Kpi label="Contratos" value={ov.data ? ov.data.expiring : "—"} note="Expirando em 60 dias" hl c="var(--orange)" delay={0.24} />
        </Link>
      </section>

      <section className="card pad mt2" style={{ ["--s" as string]: 2 }}>
        <div className="ch">
          <h2>Insights da plataforma</h2>
          <Seg label="Filtrar insights" value={insF} onPick={(v) => setInsF(v as typeof insF)} items={[{ v: "all", label: "Todos", n: gs.length }, { v: "att", label: "Atenção", n: att }, { v: "pos", label: "Positivo", n: posN }]} />
        </div>
        {groups == null ? (
          <p style={{ color: "var(--l3)", margin: 0 }}>Carregando insights…</p>
        ) : shownGroups.length === 0 ? (
          <p style={{ color: "var(--l3)", margin: 0 }}>Nenhum insight {insF === "pos" ? "positivo" : insF === "att" ? "de atenção" : ""} no momento.</p>
        ) : (
          <div className="ins">
            {shownGroups.map((g) => { const p = byId.get(g.playerId); return <InsightCard key={g.playerId} g={g} photo={p?.photo_url} age={p?.age} pos={p?.position} />; })}
          </div>
        )}
      </section>

      <section className="hello mt" style={{ ["--s" as string]: 3 }}>
        <div className="card pad">
          <div className="ch"><h2>Top atletas</h2><Link to="/dashboard/atletas">Ver todos</Link></div>
          {top.length === 0 ? <p style={{ color: "var(--l3)", margin: 0 }}>Nenhum atleta com nota disponível.</p> : (
            <ol className="rank">
              {top.map((p, i) => (
                <li key={p.id}>
                  <Link to={`/dashboard/atletas/${p.id}`}>
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="who">
                      <Av name={p.full_name} photo={p.photo_url} size={44} />
                      <span><b>{p.full_name}</b><span>{[shortPos(p.position), p.age ? `${p.age}a` : null, p.current_club].filter(Boolean).join(" · ")}</span></span>
                    </span>
                    <span className="sc"><PosPill pos={p.position} /><b className="tab">{fmt(p.auto_rating, 1)}</b></span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card pad">
          <div className="ch">
            <h2>Mapa de atributos</h2>
            {(attr.data?.years.length ?? 0) > 1 ? (
              <Seg label="Ano" value={String(year)} onPick={(v) => setAttrYear(Number(v))} items={(attr.data?.years ?? []).map((y) => ({ v: String(y), label: String(y) }))} />
            ) : year ? <span className="pill">{year}</span> : null}
          </div>
          {heatRows.length === 0 ? <p style={{ color: "var(--l3)", margin: 0 }}>Sem atributos calculados ainda.</p> : (
            <>
              <div className="heat in">
                <span />
                {ATTR_K.map((k) => <span className="hd" key={k}>{k}</span>)}
                {heatRows.map((p, r) => [
                  <span className="nm" key={`n-${p.id}`}>{p.full_name.split(" ")[0]}</span>,
                  ...heat[p.id].map((x, c) => (
                    <span className="cell" key={`${p.id}-${c}`} title={`${p.full_name} · ${ATTR_K[c]} ${x}`} style={{ ["--a" as string]: ((x / 100) * 1.4).toFixed(2), ["--k" as string]: r * 5 + c }}>{x}</span>
                  )),
                ])}
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--l3)" }}>Quanto mais forte o vermelho, maior o atributo.</p>
            </>
          )}
        </div>
      </section>

      <section className="hello wide mt" style={{ ["--s" as string]: 4 }}>
        <div className="card pad">
          <div className="ch"><h2>Perfil do elenco</h2><span className="pill">{players.length} atletas</span></div>
          <div className="squad">
            {posRows.map(([k, list], i) => (
              <div className="sq" key={k}>
                <div className="sq-h"><strong style={{ color: posColor(list[0].position) }}>{k}</strong><span>{POS_NAME[k] ?? list[0].position}</span><em>{list.length}</em></div>
                <Bar w={list.length / maxPos} c={posColor(list[0].position)} d={i * 0.1} />
                <div className="stack">{list.map((p) => <Av key={p.id} name={p.full_name} photo={p.photo_url} size={32} round />)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <div className="ch"><h2>Competições em uso</h2><Link to="/dashboard/competicoes">Ver todas</Link></div>
          {usedComps.length === 0 ? <p style={{ color: "var(--l3)", margin: 0 }}>Nenhuma competição usada em {YEAR}.</p> : (
            <div className="scroll-x">
              <table className="tbl">
                <thead><tr><th>Competição</th><th>Tier</th><th className="num">Coef.</th><th className="num">Usos</th><th className="num">Atletas</th><th className="num">Último</th></tr></thead>
                <tbody>
                  {usedComps.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.name}</b></td>
                      <td><span className="tier" style={{ ["--c" as string]: TIER_COLOR[c.tier] ?? "#8E8E93" }}>{c.tier}</span></td>
                      <td className="num">{fmt(c.coef, 2)}×</td>
                      <td className="num" style={{ color: "var(--red)", fontWeight: 700 }}>{c.uses}</td>
                      <td className="num">{c.players}</td>
                      <td className="num" style={{ color: "var(--l3)" }}>{c.last ? new Date(c.last).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </View>
  );
}
