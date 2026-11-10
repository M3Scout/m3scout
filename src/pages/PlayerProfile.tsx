import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useComparePlayerStats } from "@/hooks/useComparePlayerStats";
import { isGoalkeeper } from "@/lib/positionUtils";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import "@/components/site/m3site.css";
import "@/components/site/m3pages.css";
import "@/components/site/m3athlete.css";
import { KickTitle } from "@/components/site/KickTitle";
import { SoccerStrip } from "@/components/site/SoccerStrip";
import { SplitTitle, usePageFx } from "@/components/site/pageFx";
import { styleTags, zoneOf } from "@/components/site/positions";

/* =====================================================================
   Página do atleta — design de atleta.html, dados reais do Supabase
   ===================================================================== */

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  age: number | null;
  birth_date: string | null;
  nationality: string | null;
  current_club: string | null;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  highlight_video_url: string | null;
  primary_tactical_role: string | null;
  play_style: string | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
}

type Season = Record<string, number> & { season_year: number };
type Attr = { TAT: number; DEF: number; TEC: number; ATA: number; CRI: number };

const SUM_KEYS = [
  "matches", "minutes", "goals", "assists", "yellow_cards", "red_cards", "steals", "tackles", "interceptions",
  "recoveries", "shots", "shots_on_target", "key_passes", "chances_created", "successful_dribbles", "total_dribbles",
  "accurate_passes", "total_passes", "long_passes_accurate", "long_passes_total", "clearances", "saves",
  "goals_conceded", "clean_sheets", "penalties_saved", "aerial_duels_won", "aerial_duels_total", "fouls_committed",
  "penalties_won",
] as const;

const nf = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const ARR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ---------- utilidades de animação ---------- */
/** vira true quando o elemento entra na tela (ref por callback: funciona mesmo se ele montar depois) */
function useSeen<T extends Element>(threshold: number) {
  const [el, setEl] = useState<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [el, threshold, seen]);
  return [setEl, seen] as const;
}

/** odômetro: cada dígito gira até o valor */
function Od({ text, run, delay = 0, className = "od" }: { text: string; run: boolean; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !run) return;
    const digits = text.replace(/\D/g, "");
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        [...el.querySelectorAll<HTMLElement>(".c > span")].forEach((s, i) => { s.style.transform = `translateY(${-digits[i]}em)`; });
      });
    });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [text, run]);
  if (text === "—") return <span className={className}>—</span>;
  let di = 0;
  return (
    <span className={className} ref={ref} aria-label={text}>
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="c" key={i}>
            <span style={{ ["--d" as string]: `${(delay + di++ * 0.06).toFixed(2)}s` }}>
              {"0123456789".split("").map((d) => <b key={d}>{d}</b>)}
            </span>
          </span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </span>
  );
}

/**
 * Valor dos fatos do topo (Idade, Clube…): diminui a fonte até a palavra mais longa
 * caber na coluna; se nem no mínimo couber, quebra a palavra. Nunca invade a coluna vizinha.
 */
function FitValue({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      el.style.overflowWrap = "";
      const base = parseFloat(getComputedStyle(el).fontSize);
      const min = Math.max(14, base * 0.55);
      let size = base;
      while (el.scrollWidth > el.clientWidth + 1 && size > min) {
        size -= 1;
        el.style.fontSize = size + "px";
      }
      if (el.scrollWidth > el.clientWidth + 1) el.style.overflowWrap = "anywhere";
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  });
  return <b ref={ref}>{children}</b>;
}

/** controle segmentado com pílula deslizante */
function Seg<T extends string>({ items, value, onPick, label }: { items: { v: T; label: string }[]; value: T; onPick: (v: T) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLElement>(null);
  const place = () => {
    const b = ref.current?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (b && pillRef.current) { pillRef.current.style.width = b.offsetWidth + "px"; pillRef.current.style.transform = `translateX(${b.offsetLeft}px)`; }
  };
  useLayoutEffect(place);
  useEffect(() => {
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener("resize", place);
  }, []);
  return (
    <div className="seg" ref={ref} role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.v} type="button" aria-pressed={it.v === value} onClick={() => onPick(it.v)}>{it.label}</button>
      ))}
      <i ref={pillRef} />
    </div>
  );
}

/* ---------- atributos: anéis ---------- */
const AT: [keyof Attr, string, string][] = [
  ["TAT", "Tático", "#FF3B30"], ["DEF", "Defesa", "#FF9F0A"], ["TEC", "Técnica", "#FFD60A"],
  ["ATA", "Ataque", "#30D158"], ["CRI", "Criatividade", "#64D2FF"],
];
const R = [196, 170, 144, 118, 92];

function Attributes({ attrs }: { attrs: Record<number, Attr> }) {
  const years = Object.keys(attrs).map(Number).sort((a, b) => b - a);
  const [year, setYear] = useState(years[0]);
  const [hot, setHot] = useState<string | null>(null);
  const [ringsRef, shown] = useSeen<HTMLDivElement>(0.3);
  const d = attrs[year];
  const sorted = d ? AT.slice().sort((a, b) => d[b[0]] - d[a[0]]) : [];
  const avg = d ? Math.round(AT.reduce((s, [k]) => s + d[k], 0) / AT.length) : 0;

  return (
    <section className="wrap sec" id="atributos" aria-labelledby="t-attr">
      <SoccerStrip kind="cones" />
      <div className="sec-top">
        <SplitTitle text="Atributos" id="t-attr" />
        {years.length > 0 && <Seg label="Ano" items={years.map((y) => ({ v: String(y), label: String(y) }))} value={String(year)} onPick={(v) => setYear(Number(v))} />}
      </div>
      <div className="card attr rise">
        <div className={`rings ${hot ? "dim" : ""}`} ref={ringsRef}>
          <svg viewBox="0 0 440 440" aria-hidden="true">
            {AT.map(([k, , c], i) => {
              const C = 2 * Math.PI * R[i];
              const off = shown && d ? C * (1 - Math.max(0, Math.min(100, d[k])) / 100) : C;
              return (
                <g key={k}>
                  <circle className="trk" cx="220" cy="220" r={R[i]} stroke={c} />
                  <circle className={`arc ${hot === k ? "on" : ""}`} cx="220" cy="220" r={R[i]} stroke={c} strokeDasharray={C.toFixed(1)} style={{ strokeDashoffset: off.toFixed(1) }} />
                </g>
              );
            })}
          </svg>
          <div className="rings-c">
            <b><Od text={d ? String(avg) : "—"} run={shown} delay={0.2} /></b>
            <small>Média geral</small>
          </div>
        </div>
        <div>
          {d ? (
            <ul className={`alist ${hot ? "dim" : ""}`}>
              {sorted.map(([k, n, c], i) => (
                <li key={k} className={`arow ${hot === k ? "on" : ""}`} style={{ ["--c" as string]: c }} onPointerEnter={() => setHot(k)} onPointerLeave={() => setHot(null)}>
                  <i />
                  <span><strong>{n}</strong><small>{k}</small></span>
                  <Od className="v od" text={String(Math.round(d[k]))} run={shown} delay={0.1 + i * 0.08} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Sem avaliação de atributos registrada{year ? ` em ${year}` : ""}.</div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- físico ---------- */
const PHYS: [keyof Player, string, string, number, number, number, number, string][] = [
  ["height", "Altura", "cm", 160, 200, 175, 185, "175–185 cm"],
  ["weight", "Peso", "kg", 55, 95, 70, 80, "70–80 kg"],
  ["wingspan", "Envergadura", "cm", 0, 0, 0, 0, ""],
  ["body_fat_percentage", "% de gordura", "%", 4, 20, 8, 12, "8–12 %"],
  ["muscle_mass", "Massa muscular", "kg", 25, 65, 35, 55, "35–55 kg"],
  ["max_speed", "Velocidade máxima", "km/h", 20, 38, 30, 38, "30+ km/h"],
  ["sprint_30m", "Sprint 30 m", "s", 3.6, 5, 3.6, 4.2, "Abaixo de 4,2 s"],
  ["vo2_max", "VO₂ máximo", "ml/kg", 40, 70, 55, 70, "55+ ml/kg"],
];
const pct = (v: number, a: number, b: number) => Math.max(0, Math.min(100, ((v - a) / (b - a)) * 100));

/* ---------- página ---------- */
const PlayerProfile = () => {
  const { slug } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [attrs, setAttrs] = useState<Record<number, Attr>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [publicRows, setPublicRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"temporada" | "p90" | "competicao" | "carreira">("temporada");
  const [zone, setZone] = useState(0);
  const [toast, setToast] = useState("");
  const [lbOpen, setLbOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lbRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("public_players_safe" as any).select("*").eq("slug", slug).limit(1) as any);
      const row = Array.isArray(data) ? data[0] ?? null : null;
      if (row) {
        // clube atual = contrato mais recente (mesma lógica da aba Contrato)
        const { data: contracts } = await supabase
          .from("player_contract_history")
          .select("club_name")
          .eq("player_id", row.id)
          .eq("is_archived", false)
          .order("start_date", { ascending: false })
          .limit(1);
        if (!cancelled) setPlayer({ ...row, current_club: contracts?.[0]?.club_name ?? row.current_club });

        // números públicos por temporada/competição (view liberada para visitantes)
        const { data: pub } = await supabase.from("unified_player_season_stats").select("*").eq("player_id", row.id);
        if (!cancelled && pub) setPublicRows(pub);

        // notas de atributos por temporada (função pública; se não existir ainda, a seção fica vazia)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sc } = await (supabase as any).rpc("get_public_player_attribute_scores", { p_player_id: row.id });
        if (!cancelled && Array.isArray(sc)) {
          const out: Record<number, Attr> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sc.forEach((r: any) => { out[r.season_year] = { TAT: +r.tat, DEF: +r.def, TEC: +r.tec, ATA: +r.ata, CRI: +r.cri }; });
          setAttrs(out);
        }
      } else if (!cancelled) setPlayer(null);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // números completos (mesmas fontes e mesmo cálculo da área logada), lidos pela
  // função pública get_public_player_stats_sources — iguais para visitante e logado
  const { rows: fullRows, isLoading: statsLoading } = useComparePlayerStats({
    playerId: player?.id ?? null,
    seasonFilter: "all",
    competitionFilter: "all",
    publicSource: true,
  });
  // reserva: se a função ainda não existir no banco, usa a view pública unificada
  const rows = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (fullRows.length ? fullRows : publicRows) as any[],
    [fullRows, publicRows]
  );

  const seasons: Season[] = useMemo(() => {
    const acc: Record<number, Season> = {};
    for (const s of rows) {
      const y = s.season_year;
      if (!acc[y]) { acc[y] = { season_year: y } as Season; SUM_KEYS.forEach((k) => (acc[y][k] = 0)); }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SUM_KEYS.forEach((k) => (acc[y][k] += Number((s as any)[k] ?? 0)));
    }
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [rows]);

  const comps = useMemo(() => {
    const acc: Record<string, { name: string; year: number; matches: number; minutes: number; goals: number; assists: number }> = {};
    for (const s of rows) {
      if (!s.competition_id) continue;
      const key = `${s.competition_id}-${s.season_year}`;
      acc[key] ??= { name: s.competition_name || "Competição", year: s.season_year, matches: 0, minutes: 0, goals: 0, assists: 0 };
      acc[key].matches += s.matches; acc[key].minutes += s.minutes; acc[key].goals += s.goals; acc[key].assists += s.assists;
    }
    return Object.values(acc).sort((a, b) => b.year - a.year || b.minutes - a.minutes);
  }, [rows]);

  const cur = seasons[0] ?? null;
  const tot = useMemo(() => {
    const t: Record<string, number> = {};
    SUM_KEYS.forEach((k) => (t[k] = seasons.reduce((s, x) => s + x[k], 0)));
    return t;
  }, [seasons]);

  usePageFx(rootRef, [loading, player?.id, seasons.length, Object.keys(attrs).length]);

  const [boardRef, boardSeen] = useSeen<HTMLDivElement>(0.4);
  const [filterRef, filterSeen] = useSeen<HTMLDivElement>(0.2);
  const [phaseRef, phaseSeen] = useSeen<HTMLDivElement>(0.3);
  const [phaseOn, setPhaseOn] = useState(false);
  useEffect(() => {
    if (!phaseSeen) return;
    setPhaseOn(false);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setPhaseOn(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [phaseSeen, zone]);

  const say = (t: string) => { setToast(t); window.setTimeout(() => setToast(""), 1800); };

  if (loading) return <div className="m3s m3p m3a" style={{ minHeight: "100vh" }} />;

  if (!player) {
    return (
      <div className="m3s m3p m3a" style={{ minHeight: "80vh" }}>
        <section className="wrap sec" style={{ paddingTop: 180 }}>
          <div className="card soon">
            <h2>Atleta não encontrado</h2>
            <p>O perfil que você procura não existe ou não está mais público.</p>
            <Link className="pill" to="/atletas">Ver talentos {ARR}</Link>
          </div>
        </section>
      </div>
    );
  }

  const nick = player.full_name.split(" ")[0];
  const pos = player.position ?? "Atleta";
  const tags = styleTags(player.primary_tactical_role, player.play_style);
  const [px, py] = zoneOf(player.position);
  const isGK = isGoalkeeper(player.position);
  const hasStats = seasons.length > 0;
  const hasAttrs = Object.keys(attrs).length > 0;
  const reportYear = cur?.season_year ?? new Date().getFullYear();
  const vid = youtubeId(player.highlight_video_url);
  const share = async () => {
    const data = { title: `${nick} — M3 Agency`, url: window.location.href };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(window.location.href);
      say("Link do perfil copiado");
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) say("Não foi possível compartilhar");
    }
  };

  /* recortes de estatísticas */
  const m = cur?.matches ?? 0, mins = cur?.minutes ?? 0, p90 = (v: number) => (mins > 0 ? Math.round((v / mins) * 90 * 100) / 100 : null);
  const FILTERS: Record<string, [string, number | null][] | null> = {
    temporada: cur ? [["Jogos", cur.matches], ["Minutos", cur.minutes], ["Gols", cur.goals], ["Assistências", cur.assists], ["Desarmes", cur.tackles], ["Interceptações", cur.interceptions]] : null,
    p90: cur ? [["Minutos por jogo", m ? Math.round(mins / m) : null], ["Gols / 90", p90(cur.goals)], ["Assist. / 90", p90(cur.assists)], ["G+A / 90", p90(cur.goals + cur.assists)], ["Desarmes / 90", p90(cur.tackles)], ["Intercep. / 90", p90(cur.interceptions)]] : null,
    competicao: comps.length ? comps.map((c) => [`${c.name} · ${c.year}`, c.matches] as [string, number]) : null,
    carreira: [["Jogos", tot.matches], ["Minutos", tot.minutes], ["Gols", tot.goals], ["Assistências", tot.assists], ["Desarmes", tot.tackles], ["Interceptações", tot.interceptions]],
  };
  const fData = FILTERS[filter];

  /* fases do jogo: valor / referência (mesmas referências do perfil anterior) */
  const s = cur ?? ({} as Season);
  const PHASES: { k: string; label: string; rows: [string, number, number][] }[] = isGK
    ? [
        { k: "defesas", label: "Defesas", rows: [["Defesas", s.saves, 50], ["Clean sheets", s.clean_sheets, 15], ["Pênaltis defendidos", s.penalties_saved, 5]] },
        { k: "aereo", label: "Jogo aéreo", rows: [["Duelos aéreos ganhos", s.aerial_duels_won, 20], ["Duelos aéreos (total)", s.aerial_duels_total, 30]] },
        { k: "reposicao", label: "Reposição", rows: [["Passes certos", s.accurate_passes, 300], ["Passes (total)", s.total_passes, 400]] },
        { k: "disciplina", label: "Disciplina", rows: [["Amarelos", s.yellow_cards, 10], ["Vermelhos", s.red_cards, 3], ["Faltas cometidas", s.fouls_committed, 20]] },
      ]
    : [
        { k: "defesa", label: "Defesa", rows: [["Roubadas de bola", s.steals, 30], ["Desarmes", s.tackles, 40], ["Interceptações", s.interceptions, 30], ["Recuperações", s.recoveries, 50]] },
        { k: "passe", label: "Passe", rows: [["Passes certos", s.accurate_passes, 500], ["Passes longos certos", s.long_passes_accurate, 150], ["Passes longos (total)", s.long_passes_total, 200], ["Dribles certos", s.successful_dribbles, 30]] },
        { k: "criatividade", label: "Criatividade", rows: [["Assistências", s.assists, 15], ["Passes decisivos", s.key_passes, 40], ["Chances criadas", s.chances_created, 30]] },
        { k: "ataque", label: "Ataque", rows: [["Gols", s.goals, 20], ["Chutes", s.shots, 50], ["Chutes no gol", s.shots_on_target, 30], ["Pênaltis sofridos", s.penalties_won, 5]] },
      ];

  const fact = (k: string, v: string | number | null, u?: string) => (
    <div className="fact"><small>{k}</small><FitValue>{v == null || v === "" ? "—" : v}{u && v != null && <i>{u}</i>}</FitValue></div>
  );

  const pageTitle = `${player.full_name} — ${pos}${player.current_club ? ` · ${player.current_club}` : ""} | M3 Agency`;
  const pageDescription = `Perfil do atleta ${player.full_name}${player.age ? `, ${player.age} anos` : ""}${player.current_club ? `, ${player.current_club}` : ""}. Atributos, estatísticas, desempenho por fase, dados físicos e vídeo.`;
  const canonicalUrl = `https://m3agency.com.br/atleta/${player.slug}`;
  const ogImage = player.photo_url || "https://m3agency.com.br/og-default.png";

  return (
    <div className="m3s m3p m3a" ref={rootRef}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "Person", name: player.full_name, image: ogImage, url: canonicalUrl,
          ...(player.nationality ? { nationality: player.nationality } : {}),
          ...(player.birth_date ? { birthDate: player.birth_date } : {}),
          ...(player.current_club ? { memberOf: { "@type": "SportsTeam", name: player.current_club } } : {}),
          jobTitle: pos,
        })}</script>
      </Helmet>

      {/* ---------- topo ---------- */}
      <section className="ah" id="top">
        <div className="wrap">
          <div className="ah-grid">
            <div>
              <div className="ah-k">
                <Link className="back" to="/#talentos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                  Talentos
                </Link>
                <span>Relatório de scouting · {reportYear}</span>
              </div>
              <KickTitle as="h1" text={nick} />
              <p className="ah-full">{player.full_name}</p>
              <div className="chips">
                <span className="chip main">{pos}</span>
                {tags.map((t) => <span className="chip" key={t}>{t}</span>)}
              </div>
              <div className="facts">
                {fact("Idade", player.age, "anos")}
                {fact("Clube", player.current_club)}
                {fact("Altura", player.height, "cm")}
                {fact("Pé", player.dominant_foot)}
              </div>
              <div className="ah-acts">
                <Link className="pill" to={`/contato?player=${player.slug}`}>Falar com a M3 {ARR}</Link>
                {(hasAttrs || hasStats) && (
                  <a className="pill ghost" href="#atributos" onClick={(e) => { e.preventDefault(); document.getElementById(hasAttrs ? "atributos" : "carreira")?.scrollIntoView({ behavior: "smooth" }); }}>Perfil técnico</a>
                )}
                <button className="share" type="button" aria-label="Compartilhar perfil" onClick={share}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
                </button>
              </div>
            </div>
            <div className="ah-photo tilt" data-tilt="5">
              {player.photo_url ? (
                <img src={getOptimizedImageUrl(player.photo_url, { width: 1100, quality: 85, format: "webp" }) || player.photo_url} alt={`${player.full_name}, ${pos}`} onError={(e) => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }} />
              ) : (
                <div className="ph-none">Foto em breve</div>
              )}
              <div className="pos-mini">
                <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                  <rect x=".6" y=".6" width="98.8" height="62.8" rx="3" />
                  <path d="M50 .6v62.8" /><circle cx="50" cy="32" r="8" /><path d="M.6 16h13v32H.6M99.4 16h-13v32h13" />
                  <circle className="halo" cx={px} cy={py * 0.64} r="4" />
                  <circle className="dot" cx={px} cy={py * 0.64} r="3.4" stroke="none" />
                </svg>
                <span><b>{pos}</b>Zona de atuação</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!hasStats && !hasAttrs && !statsLoading ? (
        <section className="wrap sec">
          <div className="card soon rise">
            <h2>Relatório completo em breve</h2>
            <p>Os dados de desempenho de {nick} estão sendo consolidados pela equipe da M3.</p>
            <Link className="pill" to={`/contato?player=${player.slug}`}>Falar com a M3 {ARR}</Link>
          </div>
        </section>
      ) : (
        <>
          {/* atributos */}
          <Attributes key={Object.keys(attrs).join(",")} attrs={attrs} />

          {hasStats && (
            <>
              {/* carreira */}
              <section className="wrap sec" id="carreira" aria-labelledby="t-car">
                <div className="sec-top"><SplitTitle text="Carreira" id="t-car" /></div>
                <div className="card board rise" ref={boardRef}>
                  <div className="bcell hl"><small>Gols + assistências</small><Od text={nf(tot.goals + tot.assists)} run={boardSeen} /></div>
                  <div className="bcell"><small>Gols</small><Od text={nf(tot.goals)} run={boardSeen} delay={0.1} /></div>
                  <div className="bcell"><small>Assistências</small><Od text={nf(tot.assists)} run={boardSeen} delay={0.2} /></div>
                  <div className="bcell"><small>Jogos</small><Od text={nf(tot.matches)} run={boardSeen} delay={0.3} /></div>
                  <div className="bcell"><small>Minutos</small><Od text={nf(tot.minutes)} run={boardSeen} delay={0.4} /></div>
                </div>
              </section>

              {/* recortes */}
              <section className="wrap sec" aria-labelledby="t-fil">
                <div className="sec-top">
                  <SplitTitle text="Estatísticas" id="t-fil" />
                  <Seg
                    label="Recorte"
                    value={filter}
                    onPick={(v) => setFilter(v as typeof filter)}
                    items={[
                      { v: "temporada", label: `Temporada ${reportYear}` },
                      { v: "p90", label: "Por 90 min" },
                      { v: "competicao", label: "Por competição" },
                      { v: "carreira", label: "Carreira" },
                    ]}
                  />
                </div>
                <div className="rise" ref={filterRef}>
                  {fData ? (
                    <>
                      <div className="sgrid" key={filter}>
                        {fData.map(([l, v], i) => (
                          <div className="sbox" key={l}>
                            <small>{l}</small>
                            <Od text={nf(v)} run={filterSeen} delay={i * 0.05} />
                          </div>
                        ))}
                      </div>
                      {filter === "p90" && <p className="s-note">Médias calculadas sobre a temporada {reportYear}.</p>}
                      {filter === "competicao" && <p className="s-note">Jogos por competição.</p>}
                    </>
                  ) : (
                    <div className="empty">O recorte por competição ainda não está disponível para este atleta.</div>
                  )}
                </div>
              </section>

              {/* fases */}
              <section className="wrap sec" aria-labelledby="t-fas">
                <SoccerStrip kind="goal" />
                <div className="sec-top"><SplitTitle text="Desempenho por fase" id="t-fas" /></div>
                <div className="rise">
                  <div className="zones" role="group" aria-label="Fase do jogo">
                    {PHASES.map((ph, i) => (
                      <button key={ph.k} className="zbtn" type="button" aria-pressed={zone === i} onClick={() => setZone(i)}>
                        {ph.label}<small>{ph.rows.length} métricas</small>
                      </button>
                    ))}
                  </div>
                  <div className="zdir" aria-hidden="true">
                    <span>{isGK ? "Goleiro" : "Campo de defesa"}</span>
                    <span>Temporada {reportYear} · valor / referência</span>
                    <span>{isGK ? "" : "Campo de ataque"}</span>
                  </div>
                  <div className="card phase" ref={phaseRef}>
                    {PHASES[zone].rows.map(([l, v, ref], i) => {
                      const val = Number(v ?? 0);
                      return (
                        <div className="pm" key={`${zone}-${l}`}>
                          <strong>{l}{val > ref && <span className="over">Acima da referência</span>}</strong>
                          <span className="pv"><b>{nf(val)}</b> / {nf(ref)}</span>
                          <span className="bar2">
                            <i style={{ ["--d" as string]: `${(i * 0.08).toFixed(2)}s`, ["--w" as string]: phaseOn ? Math.max(0.02, Math.min(1, val / ref)) : 0 }} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* físico */}
          <section className="wrap sec" aria-labelledby="t-fis">
            <div className="sec-top"><SplitTitle text="Físico" id="t-fis" /></div>
            <div className="fgrid">
              {PHYS.map(([k, l, u, a, b, lo, hi, ref], i) => {
                const v = player[k] as number | null;
                if (v == null) {
                  return (
                    <div className="phbox none rise" key={k} style={{ ["--i" as string]: i % 4 }}>
                      <div className="f-top"><small>{l}</small></div>
                      <p className="f-val">Aguardando avaliação</p>
                      {ref && <p className="f-ref">Referência: {ref}</p>}
                    </div>
                  );
                }
                const st = !ref ? null : v < lo ? ["lo", "Abaixo"] : v > hi ? ["hi", "Acima"] : ["ok", "Na faixa"];
                return (
                  <div className="phbox rise" key={k} style={{ ["--i" as string]: i % 4 }}>
                    <div className="f-top"><small>{l}</small>{st && <span className={`badge ${st[0]}`}>{st[1]}</span>}</div>
                    <p className="f-val">{nf(v)}<i>{u}</i></p>
                    {ref && (
                      <>
                        <div className="range">
                          <span className="band" style={{ left: `${pct(lo, a, b)}%`, right: `${100 - pct(hi, a, b)}%` }} />
                          <span className="mk" style={{ left: `${pct(v, a, b)}%` }} />
                        </div>
                        <p className="f-ref">Referência: {ref}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* vídeo */}
          <section className="wrap sec" aria-labelledby="t-vid">
            <div className="sec-top"><SplitTitle text="Highlights" id="t-vid" /></div>
            <button className="vid rise" type="button" aria-label={`Assistir ao vídeo de ${nick}`} onClick={() => { setLbOpen(true); lbRef.current?.showModal(); }}>
              {vid ? (
                <img src={`https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`} alt="" onError={(e) => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`; }} />
              ) : player.photo_url ? (
                <img src={getOptimizedImageUrl(player.photo_url, { width: 1600, quality: 80, format: "webp" }) || player.photo_url} alt="" style={{ objectPosition: "50% 20%" }} />
              ) : null}
              <span className="play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg></span>
              <span className="vid-cap"><small>Highlights</small><b>Assista ao vídeo completo</b></span>
            </button>
            <dialog
              className="lb"
              ref={lbRef}
              aria-label="Vídeo do atleta"
              onClose={() => setLbOpen(false)}
              onClick={(e) => { if (e.target === lbRef.current) lbRef.current?.close(); }}
            >
              <button className="share lb-x" type="button" aria-label="Fechar" onClick={() => lbRef.current?.close()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
              <div className="lb-f">
                {lbOpen && (vid ? (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`} title={`Vídeo de ${nick}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                ) : player.highlight_video_url ? (
                  <p><a href={player.highlight_video_url} target="_blank" rel="noopener noreferrer">Abrir o vídeo em uma nova aba</a></p>
                ) : (
                  <p>O vídeo completo estará disponível em breve.</p>
                ))}
              </div>
            </dialog>
          </section>
        </>
      )}

      <div className={`toast2 ${toast ? "on" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
};

export default PlayerProfile;
