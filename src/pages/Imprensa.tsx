import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import type { CropPosition } from "@/components/news/CroppedNewsImage";
import logoM3 from "@/assets/logo-m3.png";
import "@/components/site/m3site.css";
import "@/components/site/m3pages.css";
import { KickTitle } from "@/components/site/KickTitle";
import { SoccerStrip } from "@/components/site/SoccerStrip";
import { SplitTitle, usePageFx } from "@/components/site/pageFx";
import { useHomePlayers } from "@/components/home2/useHomePlayers";

type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  publish_date: string;
  featured_image_url: string | null;
  card_crop: CropPosition | null;
};

const DRIVE_LOGO = "https://drive.google.com/drive/folders/1f99p5pzV9qIcAk05ZaSDFlg2rKR4Eh81?usp=drive_link";
const DRIVE_FOTOS = "https://drive.google.com/drive/folders/1Ft7SwI4wmRKVqvbtSt3hrqJScOfO1vub?usp=drive_link";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
/** respeita o enquadramento salvo no editor (crops antigos com zoom caem no padrão) */
const objPos = (c: CropPosition | null, fallback = "50% 25%") => (c && c.scale <= 1 ? `${c.x}% ${c.y}%` : fallback);
const img = (url: string | null, width: number) => (url ? getOptimizedImageUrl(url, { width, quality: 82, format: "webp" }) || url : "");

const Arrow = ({ d = "M5 12h14M13 6l6 6-6 6" }: { d?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const Imprensa = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const players = useHomePlayers();

  const { data: articles = [] } = useQuery({
    queryKey: ["public-news-vitrine-v2"],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, slug, category, excerpt, publish_date, featured_image_url, card_crop")
        .eq("status", "published")
        .order("publish_date", { ascending: false })
        .limit(7);
      if (error) throw error;
      return (data ?? []).map((item) => ({ ...item, card_crop: item.card_crop as CropPosition | null })) as NewsArticle[];
    },
  });

  const featured = articles[0];
  const grid = articles.slice(1, 7);
  const fan = players.filter((p) => p.photo_url).slice(0, 4);
  const FAN_POS = [
    { x: "-54px", r: "-10deg" },
    { x: "54px", r: "10deg" },
    { x: "-18px", r: "-3deg" },
    { x: "18px", r: "4deg" },
  ];

  usePageFx(rootRef, [articles.length, fan.length]);

  const onFeatMove = (e: React.PointerEvent<HTMLElement>) => {
    const f = e.currentTarget, r = f.getBoundingClientRect();
    f.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    f.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onFeatLeave = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--mx", "0");
    e.currentTarget.style.setProperty("--my", "0");
  };

  return (
    <div className="m3s m3p" ref={rootRef}>
      <section className="page-h wrap" id="top">
        <KickTitle as="h1" text="Imprensa" />
        {articles.length > 0 && (
          <div className="ticker" aria-label="Manchetes recentes">
            <span className="tk-tag"><i />Últimas</span>
            <div className="tk-run">
              <div className="tk-track">
                {[...articles, ...articles].map((a, i) => (
                  <Link
                    key={i}
                    to={`/imprensa/${a.slug}`}
                    {...(i >= articles.length ? { tabIndex: -1, "aria-hidden": true } : {})}
                  >
                    {a.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {featured && (
        <section className="wrap" id="destaque" aria-label="Destaque">
          <Link className="feat rise" to={`/imprensa/${featured.slug}`} onPointerMove={onFeatMove} onPointerLeave={onFeatLeave}>
            <div className="feat-img">
              {featured.featured_image_url && (
                <img src={img(featured.featured_image_url, 1400)} alt={featured.title} style={{ objectPosition: objPos(featured.card_crop, "50% 30%") }} />
              )}
            </div>
            <div className="feat-body">
              <div className="meta">
                <time dateTime={featured.publish_date}>{fmtDate(featured.publish_date)}</time>
                {featured.category && <span className="tag">{featured.category}</span>}
              </div>
              <h2>{featured.title}</h2>
              {featured.excerpt && <p>{featured.excerpt}</p>}
              <span className="pill ghost">Ler matéria <Arrow /></span>
            </div>
          </Link>
        </section>
      )}

      <section className="wrap news" aria-labelledby="nt">
        <SoccerStrip kind="goal" />
        <div className="news-h"><SplitTitle text="Últimas notícias" id="nt" /></div>
        <div className="ngrid">
          {grid.map((a, i) => (
            <Link key={a.id} className="nc rise tilt" style={{ ["--i" as string]: i % 3 }} to={`/imprensa/${a.slug}`}>
              <div className="nc-img">
                {a.featured_image_url && (
                  <img src={img(a.featured_image_url, 800)} alt="" loading="lazy" decoding="async" style={{ objectPosition: objPos(a.card_crop) }} />
                )}
              </div>
              <div className="nc-body">
                <time dateTime={a.publish_date}>{fmtDate(a.publish_date)}</time>
                <h3>{a.title}</h3>
                {a.excerpt && <p>{a.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
        <div className="more">
          <Link className="pill ghost" to="/imprensa/todas">Ver todas as notícias <Arrow /></Link>
        </div>
      </section>

      <section className="wrap kit" aria-labelledby="kt">
        <SoccerStrip kind="cones" />
        <SplitTitle text="Press kit" id="kt" />
        <div className="kit-grid">
          <article className="kc rise tilt" data-tilt="4" style={{ ["--i" as string]: 0 }}>
            <div className="kc-vis logo-vis" aria-hidden="true">
              <div className="dk"><img src={logoM3} alt="" style={{ width: "58%", height: "auto" }} /></div>
              <div className="lt"><img src={logoM3} alt="" style={{ width: "58%", height: "auto", filter: "invert(1)" }} /></div>
            </div>
            <div className="kc-body">
              <div><h3>Logo M3 Agency</h3><p>Versões oficiais da marca para uso editorial.</p></div>
              <a className="pill" href={DRIVE_LOGO} target="_blank" rel="noopener noreferrer">Acessar no Drive <Arrow d="M7 17 17 7M8 7h9v9" /></a>
            </div>
          </article>
          <article className="kc rise tilt" data-tilt="4" style={{ ["--i" as string]: 1 }}>
            <div className="kc-vis photos-vis" aria-hidden="true">
              <div className="fan">
                {fan.map((p, k) => (
                  <img key={p.id} src={img(p.photo_url, 400)} alt="" style={{ ["--x" as string]: FAN_POS[k].x, ["--r" as string]: FAN_POS[k].r }} />
                ))}
              </div>
            </div>
            <div className="kc-body">
              <div><h3>Fotos dos atletas</h3><p>Imagens oficiais para matérias e divulgações.</p></div>
              <a className="pill" href={DRIVE_FOTOS} target="_blank" rel="noopener noreferrer">Acessar no Drive <Arrow d="M7 17 17 7M8 7h9v9" /></a>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

export default Imprensa;
