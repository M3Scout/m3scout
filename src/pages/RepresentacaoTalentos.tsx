import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Star, Target, ArrowRight } from "lucide-react";

const RepresentacaoTalentos = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Hero Section */}
      <div className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="w-full mx-auto" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">
              Representação de Talentos
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
              Gerenciamos carreiras. Criamos legados.
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              A M3 Agency oferece representação profissional completa para atletas 
              de futebol, combinando estratégia de carreira, negociação de contratos 
              e desenvolvimento de marca pessoal.
            </p>
            <Link to="/contact">
              <Button className="bg-[#e52421] hover:bg-[#c91f1c] text-white font-medium px-8 py-3 h-auto shadow-none rounded-none">
                Fale conosco
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <section className="py-16 md:py-24 border-t border-zinc-900">
        <div className="w-full mx-auto" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-8">
            Nossos Serviços
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 mb-4">
                <Users className="w-5 h-5 text-[#e52421]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Gestão de Carreira
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Planejamento estratégico de longo prazo, orientação profissional 
                e suporte em todas as etapas da carreira do atleta.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 mb-4">
                <Target className="w-5 h-5 text-[#e52421]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Negociação de Contratos
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Negociação profissional com clubes nacionais e internacionais, 
                garantindo as melhores condições para nossos atletas.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 mb-4">
                <Star className="w-5 h-5 text-[#e52421]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Marca Pessoal
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Desenvolvimento de imagem e posicionamento de marca, 
                parcerias comerciais e gestão de redes sociais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 border-t border-zinc-900">
        <div className="w-full mx-auto text-center" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Pronto para o próximo nível?
          </h2>
          <p className="text-zinc-500 mb-8 max-w-xl mx-auto">
            Entre em contato conosco para saber como podemos ajudar a impulsionar sua carreira.
          </p>
          <Link to="/players">
            <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-900 px-8 py-3 h-auto rounded-none">
              Ver nossos atletas
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default RepresentacaoTalentos;
