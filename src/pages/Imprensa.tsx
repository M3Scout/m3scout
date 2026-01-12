import { Newspaper, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const newsItems = [
  {
    id: 1,
    title: "M3 Agency fecha parceria com clubes europeus",
    date: "10 Jan 2026",
    excerpt: "A agência expandiu sua rede de contatos internacionais, firmando parcerias estratégicas com importantes clubes da Europa.",
    category: "Parcerias",
  },
  {
    id: 2,
    title: "Atleta representado pela M3 é convocado para Seleção",
    date: "05 Jan 2026",
    excerpt: "Mais um atleta do nosso elenco recebe convocação para defender as cores da Seleção Brasileira.",
    category: "Atletas",
  },
  {
    id: 3,
    title: "M3 Agency completa 5 anos de atuação no mercado",
    date: "28 Dez 2025",
    excerpt: "Celebramos nossa trajetória de sucesso com mais de 50 transferências realizadas e 150 atletas representados.",
    category: "Institucional",
  },
];

const Imprensa = () => {
  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Hero Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-8">
              <Newspaper className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
              Sala de <span className="text-emerald-400">Imprensa</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Acompanhe as últimas notícias e novidades da M3 Agency e de nossos atletas.
            </p>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {newsItems.map((item) => (
              <article 
                key={item.id} 
                className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8 transition-all duration-300 hover:bg-white/[0.04] hover:border-emerald-500/20"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{item.date}</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">
                    {item.category}
                  </span>
                </div>
                
                <h2 className="text-xl font-semibold text-white mb-4 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h2>
                
                <p className="text-gray-400 mb-6 leading-relaxed">
                  {item.excerpt}
                </p>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 gap-2 px-0"
                >
                  Ler mais
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Press Contact */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl p-10 md:p-14">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Contato para Imprensa
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Para solicitações de entrevistas, materiais de imprensa ou informações 
              sobre nossos atletas, entre em contato com nossa assessoria.
            </p>
            <Button 
              size="lg" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 rounded-xl px-8"
            >
              Falar com Assessoria
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Imprensa;
