import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CroppedNewsImage, type CropPosition } from "@/components/news/CroppedNewsImage";

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

const RED = "#E5173F";
const CREAM = "#F2EDE4";
const BLACK = "#0A0A0A";
const WHITE_MUTED = "rgba(242,237,228,0.42)";
const CREAM_MUTED = "rgba(15,15,15,0.42)";
const BORDER_DARK = "rgba(242,237,228,0.1)";
const BORDER_CREAM = "rgba(15,15,15,0.1)";
const BC = "'Basis Grotesque Pro', sans-serif";
const B = "'Basis Grotesque Pro', sans-serif";
const JB = "'Basis Grotesque Pro', sans-serif";

const pressKitItems = [
  {
    id: 1,
    title: "Logo M3 Agency",
    description: "Versões oficiais da marca para uso editorial.",
    driveUrl: "https://drive.google.com/drive/folders/1f99p5pzV9qIcAk05ZaSDFlg2rKR4Eh81?usp=drive_link",
  },
  {
    id: 2,
    title: "Fotos dos Atletas",
    description: "Imagens oficiais para matérias e divulgações.",
    driveUrl: "https://drive.google.com/drive/folders/1Ft7SwI4wmRKVqvbtSt3hrqJScOfO1vub?usp=drive_link",
  },
];

const Imprensa = () => {
  const [hoveredKit, setHoveredKit] = useState<number | null>(null);
  const [hoveredFeatured, setHoveredFeatured] = useState(false);
  const [hoveredArticle, setHoveredArticle] = useState<string | null>(null);
  const [hoveredCta, setHoveredCta] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["public-news-vitrine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, slug, category, excerpt, publish_date, featured_image_url, card_crop")
        .eq("status", "published")
        .order("publish_date", { ascending: false })
        .limit(6);

      if (error) throw error;
      return (data ?? []).map((item) => ({
        ...item,
        card_crop: item.card_crop as CropPosition | null,
      })) as NewsArticle[];
    },
  });

  const featured = articles?.[0];
  const grid = articles?.slice(1, 6) ?? [];

  const gutter = "clamp(24px, 5.625vw, 72px)";
  const maxW = "1600px";

  return (
    <div style={{ backgroundColor: BLACK, fontFamily: B }}>

      {/* S1 HERO */}
      <section style={{ backgroundColor: BLACK, padding: `136px ${gutter} 80px`, borderBottom: `1px solid ${BORDER_DARK}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          <h1 style={{
            fontFamily: BC,
            fontWeight: 900,
            fontSize: "clamp(72px, 10vw, 120px)",
            lineHeight: 0.87,
            textTransform: "uppercase",
            color: CREAM,
            letterSpacing: "-0.02em",
            margin: "0 0 40px 0",
            wordBreak: "normal",
            overflowWrap: "normal",
          }}>
            SALA DE<br />
            <span style={{ fontFamily: BC, fontWeight: 300, fontStyle: "italic", color: RED }}>IMPRENSA.</span>
          </h1>

          <p style={{ fontFamily: B, fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: WHITE_MUTED, maxWidth: 480, margin: 0 }}>
            Últimas notícias, comunicados oficiais e material para a imprensa sobre a M3 Agency e nossos atletas.
          </p>
        </div>
      </section>

      {/* S2 PRESS KIT */}
      <section style={{ backgroundColor: CREAM, padding: `72px ${gutter}`, borderBottom: `1px solid ${BORDER_CREAM}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>

          {pressKitItems.map((item, index) => (
            <a
              key={item.id}
              href={item.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredKit(index)}
              onMouseLeave={() => setHoveredKit(null)}
              className="grid grid-cols-1 sm:grid-cols-[1fr_180px] items-center"
              style={{
                gap: 16,
                padding: "24px 0",
                borderBottom: `1px solid ${BORDER_CREAM}`,
                backgroundColor: hoveredKit === index ? "rgba(15,15,15,0.02)" : "transparent",
                transition: "background-color 0.2s ease",
                textDecoration: "none",
              }}
            >
              <div>
                <h3 style={{ fontFamily: BC, fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: BLACK, lineHeight: 1, margin: "0 0 6px 0" }}>
                  {item.title}
                </h3>
                <p style={{ fontFamily: B, fontWeight: 300, fontSize: 14, color: CREAM_MUTED, margin: 0 }}>
                  {item.description}
                </p>
              </div>
              <div className="sm:text-right">
                <span style={{
                  fontFamily: BC,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  color: BLACK,
                  borderBottom: `1px solid ${RED}`,
                  paddingBottom: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: hoveredKit === index ? 14 : 8,
                  transition: "gap 0.2s ease",
                }}>
                  Acessar no Drive →
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* S3 NOTÍCIAS */}
      <section style={{ backgroundColor: BLACK, padding: `72px ${gutter}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          {isLoading ? (
            <>
              {/* Featured skeleton */}
              <div style={{ border: `1px solid ${BORDER_DARK}`, marginBottom: 0, height: 320, backgroundColor: BLACK }} />
              {/* Grid skeleton */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gap: 1, backgroundColor: BORDER_DARK, border: `1px solid ${BORDER_DARK}`, borderTop: "none", marginBottom: 48 }}
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ backgroundColor: BLACK, padding: "20px 22px", minHeight: 200 }}>
                    <div style={{ height: 10, width: 80, backgroundColor: BORDER_DARK, marginBottom: 12 }} />
                    <div style={{ height: 17, width: "100%", backgroundColor: BORDER_DARK, marginBottom: 8 }} />
                    <div style={{ height: 13, width: "70%", backgroundColor: BORDER_DARK }} />
                  </div>
                ))}
              </div>
            </>
          ) : !articles?.length ? (
            <div style={{ padding: "80px 0" }}>
              <Newspaper size={28} strokeWidth={1.5} style={{ color: BORDER_DARK, marginBottom: 16 }} />
              <p style={{ fontFamily: BC, fontWeight: 700, fontSize: 18, textTransform: "uppercase", color: WHITE_MUTED, margin: "0 0 8px 0" }}>
                SEM PUBLICAÇÕES
              </p>
              <p style={{ fontFamily: B, fontWeight: 300, fontSize: 14, color: WHITE_MUTED, margin: 0 }}>
                Novas atualizações em breve.
              </p>
            </div>
          ) : (
            <>
              {/* Featured Card */}
              {featured && (
                <Link
                  to={`/imprensa/${featured.slug}`}
                  onMouseEnter={() => setHoveredFeatured(true)}
                  onMouseLeave={() => setHoveredFeatured(false)}
                  className="grid grid-cols-1 md:grid-cols-[1fr_420px]"
                  style={{
                    border: `1px solid ${BORDER_DARK}`,
                    borderBottom: "none",
                    textDecoration: "none",
                    overflow: "hidden",
                  }}
                >
                  {/* Body */}
                  <div style={{
                    padding: "32px 36px",
                    backgroundColor: BLACK,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    minHeight: 280,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <span style={{ fontFamily: JB, fontSize: 10, color: WHITE_MUTED }}>
                        {format(new Date(featured.publish_date), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      <span style={{
                        fontFamily: JB,
                        fontSize: 9,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: RED,
                        border: `1px solid ${RED}`,
                        padding: "2px 8px",
                        borderRadius: 0,
                      }}>
                        {featured.category}
                      </span>
                    </div>
                    <h2 style={{
                      fontFamily: BC,
                      fontWeight: 800,
                      fontSize: 28,
                      textTransform: "uppercase",
                      color: CREAM,
                      lineHeight: 1.05,
                      margin: "0 0 12px 0",
                    }}>
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p style={{ fontFamily: B, fontWeight: 300, fontSize: 15, color: WHITE_MUTED, lineHeight: 1.6, margin: 0 }}>
                        {featured.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Image */}
                  <div
                    className="relative h-64 md:h-auto"
                    style={{
                      overflow: "hidden",
                      minHeight: "280px",
                      filter: hoveredFeatured ? "grayscale(0%)" : "grayscale(20%)",
                      transition: "filter 0.3s ease",
                    }}
                  >
                    {featured.featured_image_url ? (
                      <CroppedNewsImage
                        src={featured.featured_image_url}
                        alt={featured.title}
                        crop={featured.card_crop}
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", backgroundColor: "rgba(242,237,228,0.04)" }} />
                    )}
                  </div>
                </Link>
              )}

              {/* News Grid */}
              {grid.length > 0 && (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  style={{
                    gap: 1,
                    backgroundColor: BORDER_DARK,
                    border: `1px solid ${BORDER_DARK}`,
                    marginBottom: 48,
                  }}
                >
                  {grid.map((article) => (
                    <Link
                      key={article.id}
                      to={`/imprensa/${article.slug}`}
                      onMouseEnter={() => setHoveredArticle(article.id)}
                      onMouseLeave={() => setHoveredArticle(null)}
                      style={{ display: "block", backgroundColor: BLACK, textDecoration: "none", overflow: "hidden" }}
                    >
                      {article.featured_image_url && (
                        <div
                          style={{
                            height: 200,
                            overflow: "hidden",
                            filter: hoveredArticle === article.id ? "grayscale(0%)" : "grayscale(20%)",
                            transition: "filter 0.3s ease",
                          }}
                        >
                          <CroppedNewsImage
                            src={article.featured_image_url}
                            alt={article.title}
                            crop={article.card_crop}
                            className="w-full h-full"
                          />
                        </div>
                      )}
                      <div style={{ padding: "20px 22px" }}>
                        <p style={{ fontFamily: JB, fontSize: 9, color: WHITE_MUTED, margin: "0 0 8px 0", opacity: 0.7 }}>
                          {format(new Date(article.publish_date), "dd MMM yyyy", { locale: ptBR })}
                        </p>
                        <h3 style={{
                          fontFamily: BC,
                          fontWeight: 700,
                          fontSize: 17,
                          textTransform: "uppercase",
                          color: CREAM,
                          lineHeight: 1.1,
                          margin: "0 0 8px 0",
                        }}>
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p style={{ fontFamily: B, fontWeight: 300, fontSize: 13, color: WHITE_MUTED, lineHeight: 1.55, margin: 0 }}>
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* CTA Final */}
              <div style={{ textAlign: "center", marginTop: 32, marginBottom: 48 }}>
                <Link
                  to="/imprensa/todas"
                  onMouseEnter={() => setHoveredCta(true)}
                  onMouseLeave={() => setHoveredCta(false)}
                  style={{ textDecoration: "none" }}
                >
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: hoveredCta ? 20 : 12,
                    fontFamily: BC,
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: CREAM,
                    borderBottom: `1px solid ${RED}`,
                    paddingBottom: 4,
                    transition: "gap 0.2s ease",
                  }}>
                    VER TODAS AS NOTÍCIAS →
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
};

export default Imprensa;
