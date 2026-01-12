import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Calendar, ExternalLink, Image, FileText, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Main Container - consistent for all sections */}
      <div className="w-full max-w-[1100px] mx-auto px-6 md:px-8">
        
        {/* Hero Section */}
        <section className="pt-32 pb-12 md:pb-14">
          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-4">
            Imprensa
          </p>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
            Sala de{" "}
            <span className="text-[#e52421]">Imprensa</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Acompanhe as últimas notícias e novidades da M3 Agency e de nossos atletas.
          </p>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-800" />

        {/* Press Kit Section */}
        <section className="py-12 md:py-14">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-6">
            Press Kit
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pressKitItems.map((item) => (
              <a
                key={item.id}
                href={item.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 transition-all duration-300 hover:border-[#e52421]/30 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-[#e52421]/10 transition-colors">
                  <item.icon className="w-5 h-5 text-zinc-400 group-hover:text-[#e52421] transition-colors" />
                </div>
                
                <h3 className="text-white font-medium mb-1">
                  {item.title}
                </h3>
                
                <p className="text-zinc-500 text-sm mb-4">
                  {item.description}
                </p>
                
                <span className="inline-flex items-center gap-2 text-sm text-[#e52421] group-hover:text-[#ff3b38] transition-colors">
                  Acessar no Drive
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-800" />

        {/* News Section */}
        <section className="py-12 md:py-14">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-6">
            Últimas Notícias
          </p>
          
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4" />
                  <div className="h-5 bg-zinc-800 rounded w-full mb-3" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : articles?.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhuma notícia publicada ainda.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles?.map((article) => (
                <Link 
                  key={article.id}
                  to={`/imprensa/${article.slug}`}
                  className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 transition-all duration-300 hover:border-[#e52421]/30 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
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
                  
                  <h3 className="text-white font-medium mb-3 group-hover:text-[#e52421] transition-colors leading-snug">
                    {article.title}
                  </h3>
                  
                  {article.excerpt && (
                    <p className="text-zinc-500 text-sm mb-4 leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  
                  <span className="inline-flex items-center gap-2 text-sm text-[#e52421] group-hover:text-[#ff3b38] transition-colors">
                    Ler mais
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Signature Section */}
        <section className="pt-12 pb-16 md:pb-20 border-t border-zinc-800">
          <p className="text-xl md:text-2xl">
            <span className="text-white font-bold">M3 Agency.</span>
            {" "}
            <span className="text-[#e52421]">Conectando talentos.</span>
            {" "}
            <span className="text-white font-bold">Construindo caminhos.</span>
          </p>
        </section>

      </div>
    </div>
  );
};

export default Imprensa;
