import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Newspaper,
  Calendar,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CroppedNewsImage, type CropPosition } from "@/components/news/CroppedNewsImage";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 9;

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

const ImprensaTodas = () => {
  const [page, setPage] = useState(0);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Fix scroll bug - always start at top
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // SEO
  useEffect(() => {
    document.title = "Todas as Notícias | M3 Scout";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Arquivo completo de notícias e comunicados da M3 Agency. Acompanhe toda a trajetória dos nossos atletas.");
    }
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["all-news", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from("news_articles")
        .select("id, title, slug, category, excerpt, publish_date, featured_image_url, card_crop", { count: "exact" })
        .eq("status", "published")
        .order("publish_date", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      const articles = (data ?? []).map((item) => ({
        ...item,
        card_crop: item.card_crop as CropPosition | null,
      })) as NewsArticle[];

      // Check if there are more articles
      const totalFetched = from + articles.length;
      setHasMore(count ? totalFetched < count : false);
      
      return articles;
    },
  });

  // Accumulate articles when page changes
  useEffect(() => {
    if (data) {
      if (page === 0) {
        setAllArticles(data);
      } else {
        setAllArticles(prev => [...prev, ...data]);
      }
    }
  }, [data, page]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', fontFamily: "'Basis Grotesque Pro', sans-serif" }}>
      
      {/* Subtle grain texture */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* HEADER SECTION */}
      <section style={{ backgroundColor: '#0A0A0A', padding: `clamp(96px, 13vh, 220px) clamp(24px, 5.625vw, 72px) 80px`, borderBottom: `1px solid rgba(242,237,228,0.1)` }}>
        <h1 style={{
          fontFamily: "'Basis Grotesque Pro', sans-serif",
          fontWeight: 900,
          fontSize: "clamp(72px, 10vw, 120px)",
          lineHeight: 0.87,
          textTransform: "uppercase",
          color: "#F2EDE4",
          letterSpacing: "-0.02em",
          margin: "0 0 40px 0",
        }}>
          TODAS AS<br />
          <span style={{ fontWeight: 300, fontStyle: "italic", color: "#E5173F" }}>NOTÍCIAS.</span>
        </h1>
        <p style={{ fontFamily: "'Basis Grotesque Pro', sans-serif", fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: "rgba(242,237,228,0.42)", maxWidth: 480, margin: 0 }}>
          Arquivo completo de notícias e comunicados da M3 Agency.
        </p>
      </section>

      {/* NEWS GRID */}
      <section className="py-8 md:py-12 lg:py-16" style={{ paddingLeft: 'clamp(24px, 5.625vw, 72px)', paddingRight: 'clamp(24px, 5.625vw, 72px)' }}>
        <div>
          
          {/* Initial Loading State */}
          {isLoading && page === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  className="rounded-2xl bg-neutral-900/40 border border-neutral-800/50 overflow-hidden"
                >
                  <div className="aspect-[1.91/1] bg-neutral-800 animate-pulse" />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-5 w-20 bg-neutral-800 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-neutral-800 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-full bg-neutral-800 rounded animate-pulse mb-3" />
                    <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse mb-5" />
                    <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : allArticles.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-16 md:py-20"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-5">
                <Newspaper className="w-6 h-6 text-neutral-700" strokeWidth={1.5} />
              </div>
              <p className="text-neutral-400 text-lg font-light mb-2">
                Nenhuma notícia encontrada.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Articles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {allArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <Link 
                      to={`/imprensa/${article.slug}`}
                      className="group block rounded-2xl bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 transition-all duration-300 hover:border-neutral-700/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 h-full overflow-hidden"
                    >
                      {/* Featured Image */}
                      {article.featured_image_url && (
                        <CroppedNewsImage
                          src={article.featured_image_url}
                          alt={article.title}
                          crop={article.card_crop}
                          className="w-full"
                          aspectRatio={1.91}
                        />
                      )}
                      
                      <div className="p-6">
                        {/* Meta */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {format(new Date(article.publish_date), "dd MMM yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-[#e52421]/10 text-[#e52421] rounded text-[10px] font-medium uppercase tracking-wide">
                            {article.category}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-base md:text-lg font-medium text-white mb-3 group-hover:text-white transition-colors leading-snug line-clamp-2">
                          {article.title}
                        </h3>
                        
                        {/* Excerpt */}
                        {article.excerpt && (
                          <p className="text-neutral-500 text-sm leading-relaxed line-clamp-2 mb-5">
                            {article.excerpt}
                          </p>
                        )}
                        
                        {/* CTA */}
                        <span className="inline-flex items-center gap-2 text-sm text-[#e52421] group-hover:gap-3 transition-all duration-300">
                          <span className="relative">
                            Ler mais
                            <span className="absolute left-0 bottom-0 w-0 h-px bg-[#e52421] group-hover:w-full transition-all duration-300" />
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center mt-12"
                >
                  <Button
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    variant="outline"
                    className="px-8 py-6 rounded-full border-neutral-700 bg-transparent text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-300"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      "Carregar mais notícias"
                    )}
                  </Button>
                </motion.div>
              )}

              {/* End of list indicator */}
              {!hasMore && allArticles.length > PAGE_SIZE && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-neutral-600 text-sm mt-12"
                >
                  Você chegou ao fim do arquivo.
                </motion.p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ImprensaTodas;
