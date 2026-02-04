import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, useInView } from "framer-motion";
import { 
  Newspaper, 
  Calendar, 
  ArrowUpRight, 
  Sparkles, 
  Image, 
  FileText,
  ExternalLink,
  Clock
} from "lucide-react";
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

const pressKitItems = [
  {
    id: 1,
    icon: Sparkles,
    title: "Logo M3 Agency",
    description: "Versões oficiais da marca para uso editorial.",
    driveUrl: "https://drive.google.com/drive/folders/1f99p5pzV9qIcAk05ZaSDFlg2rKR4Eh81?usp=drive_link",
    accent: "#e52421",
  },
  {
    id: 2,
    icon: Image,
    title: "Fotos dos Atletas",
    description: "Imagens oficiais para matérias e divulgações.",
    driveUrl: "https://drive.google.com/drive/folders/1Ft7SwI4wmRKVqvbtSt3hrqJScOfO1vub?usp=drive_link",
    accent: "#f59e0b",
  },
];

const Imprensa = () => {
  const pressKitRef = useRef<HTMLDivElement>(null);
  const newsRef = useRef<HTMLDivElement>(null);
  
  const pressKitInView = useInView(pressKitRef, { once: true, margin: "-80px" });
  const newsInView = useInView(newsRef, { once: true, margin: "-80px" });

  // Fix scroll bug - always start at top
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', fontFamily: "'Poppins', sans-serif" }}>
      
      {/* Subtle grain texture */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <section className="relative pt-24 pb-8 md:pt-28 md:pb-10">
        <div className="relative z-10 w-full mx-auto" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#e52421]/30 bg-[#e52421]/5 text-[9px] uppercase tracking-[0.2em] text-[#e52421] font-medium">
              <span className="w-1 h-1 rounded-full bg-[#e52421]" />
              Press
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3"
          >
            Sala de{" "}
            <span className="text-[#e52421]">Imprensa</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-base md:text-lg text-neutral-400 font-light max-w-xl leading-relaxed"
          >
            Últimas notícias e novidades da M3 Agency e de nossos atletas.
          </motion.p>

          {/* Subtle divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 w-16 h-px bg-gradient-to-r from-[#e52421]/60 to-transparent origin-left"
          />
        </div>
      </section>

      <section className="py-8 md:py-10 lg:py-12">
        <div className="w-full mx-auto" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          
          {/* Section Header */}
          <motion.div 
            ref={pressKitRef}
            initial={{ opacity: 0 }}
            animate={pressKitInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#e52421]" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-semibold">
              Press Kit
            </p>
          </motion.div>

          {/* Press Kit Grid - 2 Cards Only */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-2xl"
            initial="hidden"
            animate={pressKitInView ? "visible" : "hidden"}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.1
                }
              }
            }}
          >
            {pressKitItems.map((item) => (
              <motion.a
                key={item.id}
                href={item.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                variants={{
                  hidden: { 
                    opacity: 0, 
                    y: 30,
                    scale: 0.95
                  },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 100,
                      damping: 15,
                      mass: 0.8
                    }
                  }
                }}
                className="group relative block rounded-xl bg-neutral-800/60 border border-neutral-700/50 transition-all duration-300 hover:border-neutral-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 overflow-hidden"
                style={{
                  boxShadow: `0 0 0 0 ${item.accent}00`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 32px -8px ${item.accent}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 0 ${item.accent}00`;
                }}
              >
                {/* Accent Top Bar */}
                <div 
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${item.accent}, ${item.accent}80)` }}
                />
                
                <div className="p-5">
                  {/* Icon with accent glow */}
                  <motion.div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                    style={{ 
                      background: `linear-gradient(135deg, ${item.accent}20, ${item.accent}10)`,
                      border: `1px solid ${item.accent}30`,
                    }}
                    variants={{
                      hidden: { scale: 0.5, opacity: 0 },
                      visible: { 
                        scale: 1, 
                        opacity: 1,
                        transition: { delay: 0.1, type: "spring", stiffness: 200 }
                      }
                    }}
                  >
                    <item.icon 
                      className="w-5 h-5 transition-colors duration-300" 
                      style={{ color: item.accent }}
                    />
                  </motion.div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                    {item.description}
                  </p>
                  
                  {/* CTA with accent color */}
                  <span 
                    className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all duration-300"
                    style={{ color: item.accent }}
                  >
                    <span className="relative">
                      Acessar no Drive
                      <span 
                        className="absolute left-0 bottom-0 w-0 h-0.5 group-hover:w-full transition-all duration-300"
                        style={{ background: item.accent }}
                      />
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-8 md:py-10 lg:py-12" style={{ backgroundColor: 'var(--bg-base-alt)' }}>
        <div className="w-full mx-auto" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          
          {/* Section Header */}
          <motion.div 
            ref={newsRef}
            initial={{ opacity: 0 }}
            animate={newsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e52421]" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-semibold">
                Últimas Notícias
              </p>
            </div>
            <p className="text-neutral-600 text-xs font-light">
              Atualizações e comunicados oficiais.
            </p>
          </motion.div>

          {/* News Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/60"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-neutral-800 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-full bg-neutral-800 rounded animate-pulse mb-2" />
                  <div className="h-3 w-3/4 bg-neutral-800 rounded animate-pulse mb-4" />
                  <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : articles?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={newsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-12 md:py-16"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center mb-4">
                <Newspaper className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
              </div>
              <p className="text-neutral-400 text-base font-light mb-1">
                Sem publicações no momento.
              </p>
              <p className="text-neutral-600 text-xs mb-5">
                Novas atualizações em breve.
              </p>
              <Link 
                to="/contato"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-800 text-xs text-neutral-400 hover:border-neutral-700 hover:text-white transition-all duration-300"
              >
                <span>Entrar em contato</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {articles?.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={newsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                  >
                    <Link 
                      to={`/imprensa/${article.slug}`}
                      className="group block rounded-xl bg-neutral-900/50 border border-neutral-800/60 transition-all duration-300 hover:border-neutral-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 h-full overflow-hidden"
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
                      
                      <div className="p-4">
                        {/* Meta */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {format(new Date(article.publish_date), "dd MMM yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 bg-[#e52421]/10 text-[#e52421] rounded text-[9px] font-semibold uppercase tracking-wide">
                            {article.category}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-sm md:text-base font-semibold text-white mb-2 group-hover:text-white transition-colors leading-snug line-clamp-2">
                          {article.title}
                        </h3>
                        
                        {/* Excerpt */}
                        {article.excerpt && (
                          <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                        )}
                        
                        {/* CTA */}
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e52421] group-hover:gap-2.5 transition-all duration-300">
                          <span className="relative">
                            Ler mais
                            <span className="absolute left-0 bottom-0 w-0 h-px bg-[#e52421] group-hover:w-full transition-all duration-300" />
                          </span>
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Ver Todas Button */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={newsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex justify-center mt-8"
              >
                <Link 
                  to="/imprensa/todas"
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-300"
                >
                  <span className="text-xs font-semibold">Ver todas as notícias</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </section>

    </div>
  );
};

export default Imprensa;
