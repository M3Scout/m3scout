import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { resolveCurrentContract } from "@/lib/currentContract";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ic } from "../icons";
import { Bar, Head, Od, PosPill, Seg, View, fmt, shortPos } from "../ui";

/* =====================================================================
   Atletas — design de painel.html, dados e ações da tela anterior
   ===================================================================== */

interface Player {
  id: string; slug: string | null; full_name: string; position: string | null; age: number | null;
  nationality: string | null; current_club: string | null; contract_until: string | null; is_public: boolean;
  photo_url: string | null; auto_rating: number | null; auto_potential: number | null; is_archived: boolean | null;
  height: number | null; dominant_foot: string | null;
}
type SortK = "ovr" | "name" | "age" | "pos";

const CUR_YEAR = new Date().getFullYear();
const until = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00");
  return `${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}. ${d.getFullYear()}`;
};

function usePlayers(enabled: boolean, archived: boolean) {
  return useQuery({
    queryKey: ["dash-m3", "players", archived],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      let q = supabase.from("players")
        .select("id, slug, full_name, position, age, nationality, current_club, is_public, photo_url, auto_rating, auto_potential, is_archived, height, dominant_foot")
        .order("full_name");
      if (!archived) q = q.or("is_archived.eq.false,is_archived.is.null");
      const [{ data, error }, { data: contracts }] = await Promise.all([
        q,
        supabase.from("player_contract_history")
          .select("player_id, club_name, start_date, end_date, contract_type, is_current, is_archived").eq("is_archived", false),
      ]);
      if (error) throw error;
      // clube atual pela mesma regra do banco (empréstimo ativo > contrato vigente > Livre)
      const by: Record<string, NonNullable<typeof contracts>> = {};
      for (const c of contracts ?? []) if (c.player_id) (by[c.player_id] ||= []).push(c);
      return ((data ?? []) as Omit<Player, "contract_until">[]).map((p) => {
        const rows = by[p.id];
        const r = rows ? resolveCurrentContract(rows) : null;
        return {
          ...p,
          current_club: rows ? r?.club ?? "Livre" : p.current_club,
          contract_until: (r?.ownerContract ?? r?.contract)?.end_date ?? null,
        } as Player;
      });
    },
  });
}

/* ---------- impacto da agência ---------- */
interface Impact {
  active_players: number; total_matches: number; total_minutes: number; total_goals: number; total_assists: number;
  total_goal_participations: number; total_penalties_won: number;
  pass_accuracy_pct: number | null; cross_accuracy_pct: number | null; dribble_success_pct: number | null;
  aerial_duel_win_pct: number | null; ground_duel_win_pct: number | null; shot_accuracy_pct: number | null;
  tier_breakdown: { tier: string; minutes: number }[] | null; available_years: number[] | null;
}
const TIER_C: Record<string, string> = { S: "#FFD60A", A: "#30D158", B: "#0A84FF", C: "#FF9F0A", D: "#BF5AF2" };
const effC = (p: number) => (p >= 75 ? "#30D158" : p >= 50 ? "#FF9F0A" : "#FF3B30");

function AgencyImpact() {
  const [year, setYear] = useState<string>(String(CUR_YEAR));
  const { data, isLoading } = useQuery({
    queryKey: ["agency-impact-stats", year === "all" ? "all" : Number(year)],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_agency_impact_stats", { p_season_year: year === "all" ? null : Number(year) });
      if (error) throw error;
      return data as unknown as Impact;
    },
  });
  const years = (data?.available_years ?? [CUR_YEAR]).slice().sort((a, b) => b - a).slice(0, 3);
  const tiers = data?.tier_breakdown ?? [];
  const tTot = tiers.reduce((s, t) => s + t.minutes, 0) || 1;
  const eff: [string, number | null][] = data ? [
    ["Passes certos", data.pass_accuracy_pct], ["Cruzamentos certos", data.cross_accuracy_pct], ["Dribles certos", data.dribble_success_pct],
    ["Duelos aéreos ganhos", data.aerial_duel_win_pct], ["Duelos no chão ganhos", data.ground_duel_win_pct], ["Finalização no gol", data.shot_accuracy_pct],
  ] : [];

  return (
    <section className="card pad mt2" style={{ ["--s" as string]: 3 }}>
      <div className="ch">
        <h2>Impacto da agência</h2>
        <Seg label="Período" value={year} onPick={setYear} items={[...years.map((y) => ({ v: String(y), label: String(y) })), { v: "all", label: "Todo o período" }]} />
      </div>
      {isLoading ? <p style={{ color: "var(--l3)", margin: 0 }}>Carregando…</p> : !data || data.active_players === 0 ? (
        <div className="empty">Sem dados consolidados para esse período.</div>
      ) : (
        <div key={year}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
            {([
              ["Jogos", data.total_matches, `${data.active_players} atletas`],
              ["Minutagem", fmt(data.total_minutes), "min"],
              ["Gols", data.total_goals],
              ["Assistências", data.total_assists],
              ["Participações (G+A)", data.total_goal_participations],
              ["Pênaltis sofridos", data.total_penalties_won],
            ] as [string, number | string, string?][]).map(([l, v, n], i) => (
              <div className="kpi" key={l} style={{ padding: "6px 0", minHeight: 0 }}>
                <small>{l}</small>
                <Od value={v} delay={i * 0.06} style={{ fontSize: "clamp(36px,3.4vw,52px)" }} />
                {n && <p>{n}</p>}
              </div>
            ))}
          </div>
          <div className="grid g3 mt2">
            {eff.map(([l, v], k) => (
              <div className="metric" key={l}>
                <span>{l}</span><b className="tab">{v == null ? "—" : `${fmt(v, 1)}%`}</b>
                <Bar w={(v ?? 0) / 100} c={effC(v ?? 0)} d={k * 0.06} />
              </div>
            ))}
          </div>
          {tiers.length > 0 && (
            <>
              <p className="mt2" style={{ marginBottom: 10, fontSize: 14, fontWeight: 600, color: "var(--l2)" }}>Impacto por tier de competição</p>
              <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", gap: 2 }}>
                {tiers.map((t) => <span key={t.tier} style={{ flex: t.minutes, background: TIER_C[t.tier] ?? "#8E8E93" }} />)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 13, color: "var(--l2)" }}>
                {tiers.map((t) => (
                  <span key={t.tier}><b style={{ color: TIER_C[t.tier] ?? "#8E8E93" }}>●</b> Tier {t.tier} <b style={{ color: "var(--ink)" }}>{Math.round((t.minutes / tTot) * 100)}%</b></span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- card ---------- */
function Card({ p, onArchive, onDelete, canEdit }: { p: Player; onArchive: () => void; onDelete: () => void; canEdit: boolean }) {
  const navigate = useNavigate();
  const ovr = p.auto_rating != null ? Math.round(p.auto_rating) : null;
  const pot = p.auto_potential != null ? Math.round(p.auto_potential) : null;
  const img = p.photo_url ? getOptimizedImageUrl(p.photo_url, { width: 700, quality: 82, format: "webp" }) || p.photo_url : null;
  const u = until(p.contract_until);
  return (
    <Link className="ac" to={`/dashboard/atletas/${p.id}`} style={p.is_archived ? { opacity: 0.55 } : undefined}>
      <div className="ac-top">
        {img && <img src={img} alt="" loading="lazy" />}
        <span className="ac-pos">
          <PosPill pos={p.position} />
          {p.is_archived ? <span className="pill">Arquivado</span>
            : <span className="pill c" style={{ ["--c" as string]: p.is_public ? "var(--green)" : "var(--l3)" }}>{p.is_public ? "Público" : "Privado"}</span>}
        </span>
        {ovr != null ? <span className="ac-ovr"><b>{ovr}</b><small>OVR</small></span> : <span className="ac-ovr"><span className="pill">Sem OVR</span></span>}
      </div>
      <div className="ac-b">
        <h3>{p.full_name}</h3>
        <p>{[p.age != null ? `${p.age} anos` : null, p.current_club].filter(Boolean).join(" · ")}</p>
        <div className="ac-meta">
          {p.nationality && <span className="pill">{p.nationality}</span>}
          {p.height && <span className="pill">{p.height} cm</span>}
          {p.dominant_foot && <span className="pill">{p.dominant_foot}</span>}
          {u && <span className="pill">Até {u}</span>}
          {canEdit && (
            <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ marginLeft: "auto" }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="rbtn-dots" aria-label={`Ações de ${p.full_name}`}><Ic n="menu" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/atletas/${p.id}/editar`)}>Editar</DropdownMenuItem>
                  {p.slug && <DropdownMenuItem onClick={() => window.open(`/atleta/${p.slug}`, "_blank")}>Ver página pública</DropdownMenuItem>}
                  <DropdownMenuItem onClick={onArchive}>{p.is_archived ? "Restaurar" : "Arquivar"}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={onDelete}>Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          )}
        </div>
        {pot != null && ovr != null && (
          <div className="ac-pot">
            <span>OVR {ovr}</span>
            <Bar w={ovr / 100} c="var(--l2)" />
            <span style={{ color: "var(--green)" }}>POT {pot}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ---------- tela ---------- */
export function Athletes() {
  const { session, permissionsLoading, rolesLoading, isAdmin, isScout } = useAuth();
  const ready = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  const qc = useQueryClient();
  const [archived, setArchived] = useState(false);
  const { data, isLoading, error, refetch } = usePlayers(ready, archived);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("all");
  const [sort, setSort] = useState<{ k: SortK; dir: 1 | -1 }>({ k: "ovr", dir: -1 });
  const [toDelete, setToDelete] = useState<{ id: string; full_name: string } | null>(null);
  const canEdit = isAdmin || isScout;

  const players = useMemo(() => data ?? [], [data]);
  const positions = useMemo(() => {
    const c: Record<string, number> = {};
    players.forEach((p) => { const k = shortPos(p.position); c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [players]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const list = players.filter((p) => {
      if (pos !== "all" && shortPos(p.position) !== pos) return false;
      if (!t) return true;
      return `${p.full_name} ${p.current_club ?? ""} ${p.position ?? ""} ${shortPos(p.position)}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(t);
    });
    const val = (p: Player) => (sort.k === "name" ? p.full_name : sort.k === "pos" ? shortPos(p.position) : sort.k === "age" ? p.age ?? -1 : p.auto_rating ?? -1);
    return list.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
  }, [players, q, pos, sort]);

  const archive = async (p: Player) => {
    const { error: e } = await supabase.from("players")
      .update({ is_archived: !p.is_archived, archived_at: p.is_archived ? null : new Date().toISOString() }).eq("id", p.id);
    if (e) { toast.error("Erro ao atualizar atleta"); return; }
    toast.success(p.is_archived ? "Atleta restaurado!" : "Atleta arquivado!");
    qc.invalidateQueries({ queryKey: ["dash-m3", "players"] });
  };

  const pickSort = (k: SortK) =>
    setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: k === "name" || k === "pos" ? 1 : -1 }));

  return (
    <View>
      <Head title="Atletas">
        <button type="button" className={`btn ${archived ? "" : "g"}`} aria-pressed={archived} onClick={() => setArchived((v) => !v)}>
          {archived ? "Ocultar arquivados" : "Arquivados"}
        </button>
        <Link className="btn r" to="/dashboard/atletas/novo"><Ic n="plus" />Novo atleta</Link>
      </Head>

      <div className="tools" style={{ ["--s" as string]: 1 }}>
        <label className="field">
          <Ic n="search" />
          <span className="sr">Buscar atleta</span>
          <input type="search" placeholder="Buscar atleta, clube ou posição" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {positions.length > 1 && (
          <Seg label="Posição" value={pos} onPick={setPos} items={[{ v: "all", label: "Todas" }, ...positions.map((k) => ({ v: k, label: k }))]} />
        )}
        <span className="sp" />
        <div className="seg sortb" role="group" aria-label="Ordenar" style={{ ["--rot" as string]: sort.dir > 0 && sort.k !== "name" && sort.k !== "pos" ? "180deg" : sort.dir < 0 && (sort.k === "name" || sort.k === "pos") ? "180deg" : "0deg" }}>
          {([["ovr", "OVR"], ["name", "Nome"], ["age", "Idade"], ["pos", "Posição"]] as [SortK, string][]).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={sort.k === k} onClick={() => pickSort(k)}>
              {l}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
          ))}
          <SortPill k={sort.k} />
        </div>
      </div>

      {error ? (
        <div className="empty">Não foi possível carregar os atletas. <button type="button" className="btn sm g" onClick={() => refetch()}>Tentar novamente</button></div>
      ) : isLoading || !data ? (
        <section className="ath">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="ac" style={{ aspectRatio: "4/5", opacity: 0.4 }} />)}</section>
      ) : (
        <section className="ath" style={{ ["--s" as string]: 2 }}>
          {rows.length === 0 ? <div className="empty" style={{ gridColumn: "1/-1" }}>Nenhum atleta encontrado.</div>
            : rows.map((p) => <Card key={p.id} p={p} canEdit={canEdit} onArchive={() => archive(p)} onDelete={() => setToDelete({ id: p.id, full_name: p.full_name })} />)}
        </section>
      )}

      <AgencyImpact />

      <DeletePlayerDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        player={toDelete}
        onSuccess={() => { setToDelete(null); qc.invalidateQueries({ queryKey: ["dash-m3", "players"] }); }}
      />
    </View>
  );
}

/** pílula do controle de ordenação (posiciona sob o botão ativo) */
function SortPill({ k }: { k: string }) {
  return (
    <i
      ref={(el) => {
        if (!el) return;
        requestAnimationFrame(() => {
          const b = el.parentElement?.querySelector<HTMLElement>('button[aria-pressed="true"]');
          if (b) { el.style.width = b.offsetWidth + "px"; el.style.transform = `translateX(${b.offsetLeft - 4}px)`; }
        });
      }}
      data-k={k}
    />
  );
}
