import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { Av, Bar, Head, View } from "../ui";

/* =====================================================================
   Comparar — design de painel.html: dois atletas, quem leva cada quesito
   ===================================================================== */

type P = { id: string; full_name: string; position: string | null; age: number | null; photo_url: string | null; auto_rating: number | null; auto_potential: number | null; height: number | null };
const YEAR = new Date().getFullYear();
const ATTR = [["ATA", "ata_score_100"], ["TEC", "tec_score_100"], ["TAT", "tat_score_100"], ["DEF", "def_score_100"], ["CRI", "cri_score_100"]] as const;
const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
const LS = "m3:cmpR";

function useData(enabled: boolean) {
  return useQuery({
    queryKey: ["dash-m3", "compare-base", YEAR],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: players } = await supabase.from("players")
        .select("id, full_name, position, age, photo_url, auto_rating, auto_potential, height")
        .or("is_archived.is.null,is_archived.eq.false").order("auto_rating", { ascending: false, nullsFirst: false });
      const list = (players ?? []) as P[];
      const ids = list.map((p) => p.id);
      const { data: scores } = ids.length
        ? await supabase.from("player_attribute_scores")
          .select("player_id, season_year, ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, details").in("player_id", ids)
        : { data: [] };
      // atributos: temporada mais recente de cada atleta, média ponderada por minutos
      const attr: Record<string, { year: number; v: number[] }> = {};
      for (const id of ids) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = ((scores ?? []) as any[]).filter((r) => r.player_id === id);
        if (!rows.length) continue;
        const y = Math.max(...rows.map((r) => r.season_year));
        const yr = rows.filter((r) => r.season_year === y);
        let w = 0; const s = [0, 0, 0, 0, 0];
        yr.forEach((r) => { const m = Math.max(Number(r.details?.minutes ?? 0), 1); ATTR.forEach(([, c], i) => (s[i] += (r[c] ?? 0) * m)); w += m; });
        attr[id] = { year: y, v: s.map((x) => Math.round(x / (w || 1))) };
      }
      // números da temporada (mesma volta para a última temporada com dados da Visão geral)
      let seasonYear = YEAR;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let agg: any[] = [];
      for (const y of [YEAR, YEAR - 1, YEAR - 2]) {
        const { data } = await supabase.rpc("get_season_player_aggregates", { p_season_year: y });
        agg = (data as unknown[] | null) ?? [];
        seasonYear = y;
        if (agg.length) break;
      }
      const season: Record<string, { j: number; m: number; g: number; a: number }> = {};
      agg.forEach((r) => (season[r.player_id] = { j: r.total_matches ?? 0, m: r.total_minutes ?? 0, g: r.total_goals ?? 0, a: r.total_assists ?? 0 }));
      return { list, attr, season, seasonYear };
    },
  });
}

function Side({ p, list, onPick }: { p: P | undefined; list: P[]; onPick: (id: string) => void }) {
  return (
    <div className="card vs-p">
      {p ? <Av name={p.full_name} photo={p.photo_url} size={120} /> : <span className="av" style={{ ["--sz" as string]: "120px" }} />}
      <h3>{p ? p.full_name.split(" ")[0] : "—"}</h3>
      <span style={{ color: "var(--l2)", fontSize: 14 }}>{p ? [cap(p.position), p.age ? `${p.age} anos` : null].filter(Boolean).join(" · ") : "Escolha um atleta"}</span>
      <select className="sel" aria-label="Trocar atleta" value={p?.id ?? ""} onChange={(e) => onPick(e.target.value)}>
        {list.map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
      </select>
    </div>
  );
}

export function Compare() {
  const { session, permissionsLoading, rolesLoading } = useAuth();
  const ready = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  const { data } = useData(ready);
  const [params] = useSearchParams();
  const list = useMemo(() => data?.list ?? [], [data]);
  const [l, setL] = useState<string | null>(null);
  const [r, setR] = useState<string | null>(null);

  // padrão: atleta da URL (?a=) ou o de maior nota, contra o último escolhido à direita
  useEffect(() => {
    if (!list.length || (l && r)) return;
    const fromUrl = params.get("a");
    const left = list.find((p) => p.id === fromUrl)?.id ?? list[0].id;
    let saved: string | null = null;
    try { saved = localStorage.getItem(LS); } catch { /* sem armazenamento */ }
    const right = list.find((p) => p.id === saved && p.id !== left)?.id ?? list.find((p) => p.id !== left)?.id ?? null;
    setL(left); setR(right);
  }, [list, l, r, params]);

  const pickR = (id: string) => { setR(id); try { localStorage.setItem(LS, id); } catch { /* sem armazenamento */ } };
  const A = list.find((p) => p.id === l), B = list.find((p) => p.id === r);
  const aa = A ? data?.attr[A.id] : undefined, bb = B ? data?.attr[B.id] : undefined;
  const sa = A ? data?.season[A.id] : undefined, sb = B ? data?.season[B.id] : undefined;
  const sy = data?.seasonYear ?? YEAR;

  const rows: [string, number | null | undefined, number | null | undefined, number][] = [
    ["OVR", A?.auto_rating != null ? Math.round(A.auto_rating) : null, B?.auto_rating != null ? Math.round(B.auto_rating) : null, 100],
    ["Potencial", A?.auto_potential != null ? Math.round(A.auto_potential) : null, B?.auto_potential != null ? Math.round(B.auto_potential) : null, 100],
    ...ATTR.map(([k], i) => [k, aa?.v[i], bb?.v[i], 100] as [string, number | undefined, number | undefined, number]),
    [`Jogos ${sy}`, sa?.j, sb?.j, Math.max(sa?.j ?? 0, sb?.j ?? 0, 1)],
    [`Minutos ${sy}`, sa?.m, sb?.m, Math.max(sa?.m ?? 0, sb?.m ?? 0, 1)],
    [`Gols ${sy}`, sa?.g, sb?.g, Math.max(sa?.g ?? 0, sb?.g ?? 0, 1)],
    [`Assistências ${sy}`, sa?.a, sb?.a, Math.max(sa?.a ?? 0, sb?.a ?? 0, 1)],
    ["Altura (cm)", A?.height, B?.height, 200],
  ];

  return (
    <View>
      <Head title="Comparar" kicker="Escolha dois atletas e veja quem leva em cada quesito" />
      {!data ? <p style={{ color: "var(--l3)" }}>Carregando atletas…</p> : list.length < 2 ? (
        <div className="empty">É preciso ter pelo menos dois atletas cadastrados para comparar.</div>
      ) : (
        <>
          <section className="vs" style={{ ["--s" as string]: 1 }}>
            <Side p={A} list={list} onPick={setL} />
            <div className="vs-mid">VS</div>
            <Side p={B} list={list} onPick={pickR} />
          </section>
          <section className="card pad mt" style={{ ["--s" as string]: 2 }}>
            <div className="cmp" key={`${l}-${r}`}>
              {rows.map(([n, x, y, m], i) => {
                const xv = x ?? null, yv = y ?? null;
                const lw = xv != null && yv != null && xv > yv, rw = xv != null && yv != null && yv > xv;
                return (
                  <div className="cmp-r" key={n}>
                    <div className={`cmp-side l ${lw ? "win" : ""}`}><b>{xv ?? "—"}</b><Bar w={(xv ?? 0) / m} c={lw ? "var(--green)" : "var(--g4)"} d={i * 0.04} /></div>
                    <span>{n}</span>
                    <div className={`cmp-side ${rw ? "win" : ""}`}><b>{yv ?? "—"}</b><Bar w={(yv ?? 0) / m} c={rw ? "var(--green)" : "var(--g4)"} d={i * 0.04} /></div>
                  </div>
                );
              })}
            </div>
            {(aa || bb) && (
              <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--l3)" }}>
                Atributos da temporada mais recente de cada atleta{aa && bb && aa.year !== bb.year ? ` (${aa.year} × ${bb.year})` : aa ? ` (${aa.year})` : ""}.
              </p>
            )}
          </section>
        </>
      )}
    </View>
  );
}
