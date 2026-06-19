import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CroppedNewsImage, type CropPosition } from "@/components/news/CroppedNewsImage";

const NewsDetail = () => {
  const { slug } = useParams();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["news-detail", slug],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .limit(1);
      
      if (error) throw error;
      const article = Array.isArray(data) ? data[0] ?? null : null;
      return article;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#0B0B0D]">
        <div className="w-full max-w-[1100px] mx-auto pt-32 pb-16" style={{ paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          <h1 className="text-2xl font-bold text-white mb-4">Notícia não encontrada</h1>
          <p className="text-zinc-400 mb-8">
            A notícia que você está procurando não existe ou foi removida.
          </p>
          <Link
            to="/imprensa"
            className="inline-flex items-center gap-2 text-[#e52421] hover:text-[#ff3b38] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Sala de Imprensa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      <div className="w-full mx-auto" style={{ maxWidth: '1600px', paddingLeft: 'clamp(24px, 4.5vw, 72px)', paddingRight: 'clamp(24px, 4.5vw, 72px)' }}>

        {/* Back link */}
        <div className="pt-32 pb-8">
          <Link
            to="/imprensa"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Sala de Imprensa
          </Link>
        </div>

        {/* Article Header */}
        <header className="pb-10 border-b border-zinc-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Calendar className="w-4 h-4" />
              <time dateTime={article.publish_date}>
                {format(new Date(article.publish_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </time>
            </div>
            <span className="px-3 py-1 bg-[#e52421]/10 text-[#e52421] rounded text-xs font-medium uppercase tracking-wide">
              {article.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </header>

        {/* Featured Image — full width of page container, 16:9 */}
        {article.featured_image_url && (
          <div className="py-10">
            <CroppedNewsImage
              src={article.featured_image_url}
              alt={article.title}
              crop={article.hero_crop as CropPosition | null}
              className="w-full rounded-xl"
              aspectRatio={16 / 9}
            />
          </div>
        )}

        {/* Content */}
        <article className="py-10 md:py-14">
          <div className="prose prose-invert prose-lg max-w-none">
            {article.content.split("\n").map((paragraph, index) =>
              paragraph.trim() && (
                <p key={index} className="text-zinc-300 leading-relaxed mb-6">
                  {paragraph}
                </p>
              )
            )}
          </div>
        </article>

        {/* Signature */}
        <section className="pt-10 pb-16 md:pb-20 border-t border-zinc-800">
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

export default NewsDetail;
