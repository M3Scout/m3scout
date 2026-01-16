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

type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  publish_date: string;
};

const pressKitItems = [
  {
    id: 1,
    icon: Sparkles,
    title: "Logo M3 Agency",
    description: "Versões oficiais da marca para uso editorial.",
    driveUrl: "https://drive.google.com/drive/folders/YOUR_LOGO_FOLDER_ID",
  },
  {
    id: 2,
    icon: Image,
    title: "Fotos dos Atletas",
    description: "Imagens oficiais para matérias e divulgações.",
    driveUrl: "https://drive.google.com/drive/folders/YOUR_PHOTOS_FOLDER_ID",
  },
  {
    id: 3,
    icon: FileText,
    title: "Release Institucional",
    description: "Textos e informações oficiais sobre a agência.",
    driveUrl: "https://drive.google.com/drive/folders/YOUR_RELEASE_FOLDER_ID",
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
    queryKey: ["public-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, slug, category, excerpt, publish_date")
        .eq("status", "published")
        .order("publish_date", { ascending: false })
        .limit(9);
      
      if (error) throw error;
      return data as NewsArticle[];
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Poppins', sans-serif" }}>
      
      {/* Subtle grain texture */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e52421]/30 bg-[#e52421]/5 text-[10px] uppercase tracking-[0.2em] text-[#e52421] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e52421]" />
              Press
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6"
          >
            Sala de{" "}
            <span className="text-[#e52421]">Imprensa</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl leading-relaxed tracking-wide"
          >
            Acompanhe as últimas notícias e novidades da M3 Agency e de nossos atletas.
          </motion.p>

          {/* Subtle divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 w-20 h-px bg-gradient-to-r from-[#e52421]/60 to-transparent origin-left"
          />
        </div>
      </section>

      {/* PRESS KIT SECTION */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Section Header */}
          <motion.div 
            ref={pressKitRef}
            initial={{ opacity: 0 }}
            animate={pressKitInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-10"
          >
            <span className="w-2 h-2 rounded-full bg-[#e52421]" />
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 font-medium">
              Press Kit
            </p>
          </motion.div>

          {/* Press Kit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {pressKitItems.map((item, index) => (
              <motion.a
                key={item.id}
                href={item.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={pressKitInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative block p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 transition-all duration-300 hover:border-neutral-700/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
              >
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-neutral-800/60 flex items-center justify-center mb-5 group-hover:bg-[#e52421]/10 transition-colors duration-300">
                  <item.icon className="w-5 h-5 text-neutral-500 group-hover:text-[#e52421] transition-colors duration-300" />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-medium text-white mb-2 group-hover:text-white transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-sm text-neutral-500 leading-relaxed mb-5 line-clamp-2">
                  {item.description}
                </p>
                
                {/* CTA */}
                <span className="inline-flex items-center gap-2 text-sm text-[#e52421] group-hover:gap-3 transition-all duration-300">
                  <span className="relative">
                    Acessar no Drive
                    <span className="absolute left-0 bottom-0 w-0 h-px bg-[#e52421] group-hover:w-full transition-all duration-300" />
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* NEWS SECTION */}
      <section className="py-16 md:py-20 lg:py-24 bg-[#0d0d0d]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Section Header */}
          <motion.div 
            ref={newsRef}
            initial={{ opacity: 0 }}
            animate={newsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#e52421]" />
              <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 font-medium">
                Últimas Notícias
              </p>
            </div>
            <p className="text-neutral-600 text-sm font-light">
              Atualizações e comunicados oficiais.
            </p>
          </motion.div>

          {/* News Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/50"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-5 w-20 bg-neutral-800 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-neutral-800 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-full bg-neutral-800 rounded animate-pulse mb-3" />
                  <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse mb-5" />
                  <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : articles?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={newsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-16 md:py-20"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-5">
                <Newspaper className="w-6 h-6 text-neutral-700" strokeWidth={1.5} />
              </div>
              <p className="text-neutral-400 text-lg font-light mb-2">
                Sem publicações no momento.
              </p>
              <p className="text-neutral-600 text-sm mb-6">
                Novas atualizações em breve.
              </p>
              <Link 
                to="/contato"
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-neutral-800 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white transition-all duration-300"
              >
                <span>Entrar em contato</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {articles?.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={newsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link 
                    to={`/imprensa/${article.slug}`}
                    className="group block p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 transition-all duration-300 hover:border-neutral-700/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 h-full"
                  >
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
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Imprensa;
