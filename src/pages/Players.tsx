import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import "@/components/site/m3site.css";
import "@/components/site/m3pages.css";
import "@/components/site/m3talents.css";
import { KickTitle } from "@/components/site/KickTitle";
import { usePageFx } from "@/components/site/pageFx";
import { colorOf, sectorOf, styleTags, zoneOf, type Sector } from "@/components/site/positions";

/* =====================================================================
   Talentos (/atletas) — design de talentos.html, atletas do Supabase
   ===================================================================== */

interface Athlete {
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  current_club: string | null;
  photo_url: string | null;
  dominant_foot: string | null;
  height: number | null;
  play_style: string | null;
  primary_tactical_role: string | null;
}
type Attr = { TAT: number; DEF: number; TEC: number; ATA: number; CRI: number };

const SEGS: { g: "all" | Sector; label: string }[] = [
  { g: "all", label: "Todos" },
  { g: "def", label: "Defesa" },
  { g: "mei", label: "Meio" },
  { g: "ata", label: "Ataque" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const photo = (url: string | null, w: number) => (url ? getOptimizedImageUrl(url, { width: w, quality: 82, format: "webp" }) || url : "");
const meters = (cm: number | null) => (cm ? `${(cm / 100).toFixed(2).replace(".", ",")} m` : "—");

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const PITCH = (
  <svg viewBox="0 0 105 50" aria-hidden="true">
    <g className="ln">
      <rect x="1" y="1" width="103" height="48" rx="1" />
      <path d="M52.5 1v48M1 13h13v24H1M104 13H91v24h13" />
      <circle cx="52.5" cy="25" r="6.5" />
    </g>
  </svg>
);

function useAthletes() {
  const [list, setList] = useState<Athlete[] | null>(null);
  const [attrs, setAttrs] = useState<Record<string, Attr>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { data } = await (supabase
        .from("public_players_safe" as any)
        .select("id, slug, full_name, position, age, nationality, current_club, photo_url, dominant_foot, height, play_style, primary_tactical_role")
        .order("full_name") as any);
      if (cancelled) return;
      const rows = (data as Athlete[] | null) ?? [];
      setList(rows);
      // notas de atributos mais recentes de cada atleta (função pública; sem ela, o verso mostra "em breve")
      const entries = await Promise.all(
        rows.map(async (p) => {
          const { data: sc, error } = await (supabase as any).rpc("get_public_player_attribute_scores", { p_player_id: p.id });
          const r = !error && Array.isArray(sc) ? sc[0] : null;
          return r ? ([p.id, { TAT: +r.tat, DEF: +r.def, TEC: +r.tec, ATA: +r.ata, CRI: +r.cri }] as const) : null;
        })
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (!cancelled) setAttrs(Object.fromEntries(entries.filter(Boolean) as [string, Attr][]));
    })();
    return () => { cancelled = true; };
  }, []);
  return { list, attrs };
}

function Card({ p, i, k, hidden, attr }: { p: Athlete; i: number; k: number; hidden: boolean; attr?: Attr }) {
  const c = colorOf(p.position);
  const [x, y] = zoneOf(p.position);
  const first = p.full_name.split(" ")[0];
  const pos = p.position ?? "Atleta";
  const no = String(i + 1).padStart(2, "0");
  const sub = [p.age != null && `${p.age} anos`, p.nationality, p.current_club].filter(Boolean).join(" · ");
  const tags = styleTags(p.primary_tactical_role, p.play_style);
  const img = photo(p.photo_url, 700);

  return (
    <Link
      className="tl rise"
      to={`/atleta/${p.slug}`}
      hidden={hidden}
      style={{ ["--i" as string]: i % 3, ["--c" as string]: c, ["--k" as string]: k }}
      aria-label={`${p.full_name}, ${pos}`}
    >
      <div className="tl-in">
        <div className="tl-f tl-fr">
          <div className="tl-ph">
            {img && <img className="tl-img" src={img} alt="" loading="lazy" decoding="async" />}
            <span className="tl-pos"><i />{pos}</span>
            <span className="tl-no">{no}</span>
          </div>
          <div className="tl-b">
            <div>
              <h3>{p.full_name}</h3>
              {sub && <p>{sub}</p>}
            </div>
            <span className="tl-go"><Arrow /></span>
          </div>
        </div>
        <div className="tl-f tl-bk">
          <div className="bk-h">
            {img && <img src={img} alt="" />}
            <div><b>{first}</b><small>{pos}</small></div>
            <span className="no">{no}</span>
          </div>
          <div className="bk-pitch">
            {PITCH}
            <span className="bk-dot" style={{ left: `${x}%`, top: `${y}%` }} />
            <span className="lbl">Zona de atuação</span>
          </div>
          <div className="bk-facts">
            <div><small>Idade</small><b>{p.age != null ? `${p.age} anos` : "—"}</b></div>
            <div><small>Altura</small><b>{meters(p.height)}</b></div>
            <div><small>Pé</small><b>{p.dominant_foot || "—"}</b></div>
            <div><small>Clube</small><b>{p.current_club || "Livre"}</b></div>
          </div>
          {attr ? (
            <>
              <div className="bk-attr">
                {(["TAT", "DEF", "TEC", "ATA", "CRI"] as const).map((key, j) => (
                  <div className="bk-a" key={key} style={{ ["--j" as string]: j }}>
                    <span>{key}</span>
                    <span className="tk"><i style={{ ["--w" as string]: Math.max(0, Math.min(1, attr[key] / 100)) }} /></span>
                    <b>{Math.round(attr[key])}</b>
                  </div>
                ))}
              </div>
              {tags.length > 0 && <div className="bk-tags">{tags.map((t) => <span key={t}>{t}</span>)}</div>}
              <span className="bk-cta">Ver relatório completo<Arrow /></span>
            </>
          ) : (
            <>
              <p className="bk-soon">Relatório de scouting em produção. Atributos e números chegam em breve.</p>
              <span className="bk-cta">Ver perfil<Arrow /></span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

const Players = () => {
  const { list, attrs } = useAthletes();
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [g, setG] = useState<"all" | Sector>("all");
  const [scout, setScout] = useState(() => {
    if (params.get("modo") === "scouting") return true;
    try { return localStorage.getItem("m3:scout") === "1"; } catch { return false; }
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touched = useRef(false);

  const athletes = useMemo(() => list ?? [], [list]);
  const counts = useMemo(() => {
    const c = { all: athletes.length, def: 0, mei: 0, ata: 0 };
    athletes.forEach((p) => c[sectorOf(p.position)]++);
    return c;
  }, [athletes]);

  const t = norm(q.trim());
  let k = 0;
  const visible = athletes.map((p) => {
    const hay = norm(`${p.full_name} ${p.position ?? ""} ${p.current_club ?? ""}`);
    const ok = (g === "all" || sectorOf(p.position) === g) && (!t || hay.includes(t));
    return { p, ok, k: ok ? k++ : 0 };
  });
  const n = k;

  usePageFx(rootRef, [list]);

  // filtrando: os cards visíveis aparecem na hora (sem esperar a rolagem)
  useEffect(() => {
    if (!touched.current) return;
    gridRef.current?.querySelectorAll(".tl:not([hidden])").forEach((el) => el.classList.add("in"));
  }, [q, g]);

  // pílula deslizante do filtro
  const place = () => {
    const b = segRef.current?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (b && pillRef.current) { pillRef.current.style.width = b.offsetWidth + "px"; pillRef.current.style.transform = `translateX(${b.offsetLeft}px)`; }
  };
  useLayoutEffect(place);
  useEffect(() => {
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener("resize", place);
  }, []);

  // "/" foca a busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current && !(e.target as HTMLElement).closest?.("input,textarea")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("m3:scout", scout ? "1" : "0"); } catch { /* sem armazenamento */ }
  }, [scout]);

  const faces = athletes.filter((p) => p.photo_url).slice(0, 6);
  const filtered = g !== "all" || !!t;

  return (
    <div className="m3s m3p m3t" ref={rootRef}>
      <Helmet>
        <title>Talentos — M3 Agency</title>
        <meta name="description" content="Conheça os atletas agenciados pela M3 Agency: perfis, posições e relatórios de scouting." />
      </Helmet>

      <section className="page-h tal-h wrap" id="top">
        <KickTitle as="h1" text="Nossos atletas" red={[1]} />
        <p className="tal-sub">
          <span className="faces" aria-hidden="true">
            {faces.map((p) => <img key={p.id} src={photo(p.photo_url, 120)} alt="" />)}
          </span>
          <span>
            <b>{list ? n : "—"}</b> {n === 1 ? "atleta" : "atletas"}{filtered ? " encontrados" : " no portfólio"}
          </span>
        </p>
      </section>

      <div className="tbar-wrap wrap">
        <div className="tbar" role="search">
          <label className="srch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Buscar atleta</span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Buscar atleta, posição…"
              autoComplete="off"
              value={q}
              onChange={(e) => { touched.current = true; setQ(e.target.value); }}
            />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <div className="segp" role="group" aria-label="Filtrar por setor" ref={segRef}>
            {SEGS.map((s) => (
              <button key={s.g} type="button" aria-pressed={g === s.g} onClick={() => { touched.current = true; setG(s.g); }}>
                {s.label} <em>{counts[s.g]}</em>
              </button>
            ))}
            <i ref={pillRef} />
          </div>
          <button className="mode" type="button" role="switch" aria-checked={scout} onClick={() => setScout((v) => !v)}>
            <span>Modo scouting</span>
            <span className="sw" aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="wrap" aria-label="Atletas">
        <div className={`tgrid ${scout ? "scout" : ""}`} ref={gridRef}>
          {visible.map(({ p, ok, k: kk }, i) => (
            <Card key={p.id} p={p} i={i} k={kk} hidden={!ok} attr={attrs[p.id]} />
          ))}
        </div>
        <div className={`empty ${list && n === 0 ? "on" : ""}`}>
          <b>Nenhum atleta encontrado</b>
          <span>Tente outro nome ou posição.</span>
          <button className="pill ghost" type="button" onClick={() => { setQ(""); setG("all"); }}>Limpar filtros</button>
        </div>
      </section>
    </div>
  );
};

export default Players;
