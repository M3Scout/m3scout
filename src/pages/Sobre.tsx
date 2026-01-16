import { useEffect } from "react";
import { Briefcase, BarChart3, Network } from "lucide-react";

const Sobre = () => {
  // Fix scroll bug - always start at top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* BLOCO 1 – HERO EDITORIAL */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="max-w-3xl">
            {/* Vertical red accent line */}
            <div className="flex items-start gap-6 mb-8">
              <div className="w-[3px] h-20 bg-[#e52421] rounded-full flex-shrink-0 hidden md:block" />
              <div>
                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 mb-4">
                  <span className="text-[#e52421]">M3</span> Agency
                </h1>
                {/* Subtitle */}
                <p className="text-lg md:text-xl lg:text-2xl text-neutral-600 leading-relaxed">
                  Scouting, gestão e estratégia de carreira no futebol profissional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2 – MANIFESTO */}
      <section className="py-16 md:py-20 lg:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="max-w-4xl">
            <p 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.3] md:leading-[1.25] tracking-tight text-neutral-900"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <span className="font-normal">Conectamos talento a decisões estratégicas.</span>
              <br className="hidden sm:block" />
              <span className="block mt-2 sm:mt-0">
                <span className="font-bold">Construímos caminhos reais</span>{" "}
                <span className="font-normal">no futebol profissional.</span>
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* BLOCO 3 – O QUE FAZEMOS (CARDS) */}
      <section className="py-16 md:py-20 lg:py-24 bg-[#f8f7f4]">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          {/* Section label */}
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-10 md:mb-12">
            O que fazemos
          </p>

          {/* Cards grid - stacked on mobile, 3 columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1 */}
            <div className="group p-6 md:p-8 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all duration-300 hover:shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-[#e52421]/10 flex items-center justify-center mb-5">
                <Briefcase className="w-6 h-6 text-[#e52421]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-neutral-900 mb-3">
                Gestão de Carreira
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Planejamento profissional, contratos, posicionamento e visão de longo prazo.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-6 md:p-8 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all duration-300 hover:shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-[#e52421]/10 flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6 text-[#e52421]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-neutral-900 mb-3">
                Scouting & Performance
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Análise técnica, dados, acompanhamento contínuo e relatórios.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-6 md:p-8 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all duration-300 hover:shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-[#e52421]/10 flex items-center justify-center mb-5">
                <Network className="w-6 h-6 text-[#e52421]" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-neutral-900 mb-3">
                Conexão com o Mercado
              </h3>
              <p className="text-base text-neutral-600 leading-relaxed">
                Relação direta com clubes e projetos institucionais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 4 – TEXTO INSTITUCIONAL */}
      <section className="py-16 md:py-20 lg:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="max-w-3xl space-y-6">
            <p className="text-base md:text-lg text-neutral-700 leading-[1.75]">
              A M3 Agency é uma agência de gestão esportiva, scouting e desenvolvimento de talentos, criada para conectar potencial, performance e oportunidade dentro e fora de campo.
            </p>
            <p className="text-base md:text-lg text-neutral-700 leading-[1.75]">
              Atuamos de forma estratégica e profissional, indo além da intermediação tradicional, estruturando carreiras e projetos com visão de longo prazo, dados e transparência.
            </p>
            <p className="text-base md:text-lg text-neutral-700 leading-[1.75]">
              Acreditamos que talento precisa de direção. Por isso, unimos análise técnica, mercado e posicionamento para criar oportunidades sólidas no futebol profissional.
            </p>
          </div>
        </div>
      </section>

      {/* BLOCO 5 – ASSINATURA FINAL */}
      <section className="py-16 md:py-20 lg:py-24 bg-[#f8f7f4]">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          {/* Horizontal line */}
          <div className="w-full max-w-3xl h-px bg-neutral-300 mb-10" />
          
          {/* Signature text */}
          <p 
            className="text-xl md:text-2xl lg:text-3xl text-neutral-900 tracking-tight"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <span className="font-bold text-[#e52421]">M3</span>{" "}
            <span className="font-bold">Agency</span>{" "}
            <span className="text-neutral-400 mx-2">—</span>{" "}
            <span className="italic font-normal">Scouting que vira contrato.</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
