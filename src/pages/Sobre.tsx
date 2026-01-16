import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";

const Sobre = () => {
  const [activeService, setActiveService] = useState<number | null>(null);
  const conceptRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLDivElement>(null);
  
  const conceptInView = useInView(conceptRef, { once: true, margin: "-80px" });
  const servicesInView = useInView(servicesRef, { once: true, margin: "-80px" });
  const manifestoInView = useInView(manifestoRef, { once: true, margin: "-80px" });

  // Fix scroll bug - always start at top
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  const services = [
    {
      number: "01",
      title: "Gestão de Carreira",
      description: "Planejamento profissional, contratos e decisões de longo prazo."
    },
    {
      number: "02",
      title: "Scouting & Performance",
      description: "Análise técnica, dados, relatórios e acompanhamento contínuo."
    },
    {
      number: "03",
      title: "Conexão com o Mercado",
      description: "Relação direta com clubes, projetos e estruturas profissionais."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Poppins', sans-serif" }}>
      
      {/* HERO SECTION - Clean, Premium */}
      <section className="relative min-h-screen w-full flex items-center">
        {/* Subtle grain texture */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 w-full">
          <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16 py-32 md:py-40">
            <div className="max-w-3xl">
              
              {/* M3 Agency Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white mb-8"
              >
                <span className="text-[#e52421]">M3</span> Agency
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-lg sm:text-xl md:text-2xl text-neutral-400 font-light mb-12 leading-relaxed tracking-wide"
              >
                Scouting, estratégia e decisões de carreira no futebol profissional.
              </motion.p>

              {/* Editorial Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="mb-16"
              >
                <p className="text-2xl sm:text-3xl md:text-4xl text-white/90 font-light leading-[1.4] tracking-wide">
                  Transformamos talento em direção.
                  <br />
                  <span className="text-neutral-400">Criamos caminhos reais no futebol de elite.</span>
                </p>
              </motion.div>

              {/* CTA Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Link 
                  to="/contato"
                  className="inline-flex items-center gap-4 text-sm tracking-widest uppercase text-neutral-500 hover:text-white transition-colors duration-300 group"
                >
                  <span className="w-10 h-px bg-neutral-600 group-hover:w-16 group-hover:bg-[#e52421] transition-all duration-300" />
                  Falar com a M3
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO EDITORIAL */}
      <section className="py-32 md:py-40 lg:py-48 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          <motion.div 
            ref={conceptRef}
            initial={{ opacity: 0, y: 40 }}
            animate={conceptInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-3xl"
          >
            <p className="text-xl sm:text-2xl md:text-3xl text-neutral-300 font-light leading-[1.8] tracking-wide">
              <span className="text-white font-normal">A M3 Agency atua onde talento encontra decisão.</span>
              <br /><br />
              Mais do que representar atletas, operamos como um núcleo estratégico: análise, visão de mercado e construção de carreira com base em dados, contexto competitivo e leitura real do jogo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* O QUE FAZEMOS - Editorial List */}
      <section className="py-24 md:py-32 lg:py-40 bg-[#0d0d0d]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Section Label */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={servicesInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[11px] uppercase tracking-[0.3em] text-neutral-600 font-medium mb-16 md:mb-20"
          >
            O que fazemos
          </motion.p>

          {/* Services List */}
          <div ref={servicesRef}>
            {services.map((service, index) => (
              <motion.div
                key={service.number}
                initial={{ opacity: 0, y: 20 }}
                animate={servicesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group border-t border-neutral-800/50 py-10 md:py-12 lg:py-14 cursor-pointer"
                onMouseEnter={() => setActiveService(index)}
                onMouseLeave={() => setActiveService(null)}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline">
                  
                  {/* Number */}
                  <div className="md:col-span-2">
                    <span 
                      className={`text-2xl md:text-3xl lg:text-4xl font-semibold transition-colors duration-300 ${
                        activeService === index ? 'text-[#e52421]' : 'text-neutral-700'
                      }`}
                    >
                      {service.number}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <div className="md:col-span-4">
                    <h3 
                      className={`text-xl md:text-2xl lg:text-3xl font-medium transition-colors duration-300 ${
                        activeService === index ? 'text-white' : 'text-neutral-500'
                      }`}
                    >
                      {service.title}
                    </h3>
                  </div>
                  
                  {/* Description */}
                  <div className="md:col-span-6">
                    <p 
                      className={`text-base md:text-lg font-light leading-relaxed transition-colors duration-300 ${
                        activeService === index ? 'text-neutral-300' : 'text-neutral-600'
                      }`}
                    >
                      {service.description}
                    </p>
                  </div>
                </div>
                
                {/* Hover accent line */}
                <div 
                  className={`mt-8 md:mt-10 h-px transition-all duration-500 ${
                    activeService === index 
                      ? 'bg-gradient-to-r from-[#e52421]/60 via-[#e52421]/20 to-transparent' 
                      : 'bg-transparent'
                  }`} 
                />
              </motion.div>
            ))}
            
            {/* Bottom border */}
            <div className="border-t border-neutral-800/50" />
          </div>
        </div>
      </section>

      {/* BLOCO MANIFESTO */}
      <section className="py-40 md:py-52 lg:py-64 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          <div 
            ref={manifestoRef}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-[1.6] tracking-wide space-y-4">
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={manifestoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-neutral-500"
              >
                Talento sem direção é ruído.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={manifestoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-neutral-500"
              >
                Direção sem estratégia é sorte.
              </motion.p>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={manifestoInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-white leading-[1.6] tracking-wide mt-8"
            >
              Nós trabalhamos com os dois.
            </motion.p>
          </div>
        </div>
      </section>

      {/* FOOTER SIGNATURE */}
      <section className="py-16 md:py-20 bg-[#0a0a0a] border-t border-neutral-900/50">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-xs text-neutral-600 tracking-wide">
              © 2025 M3 Agency. Todos os direitos reservados.
            </p>
            <p className="text-base md:text-lg text-neutral-500 font-light tracking-wide">
              <span className="text-[#e52421] font-medium">M3</span>{" "}
              <span className="text-white">Agency</span>{" "}
              <span className="text-neutral-700 mx-2">—</span>{" "}
              <span className="text-neutral-400 italic">Scouting que vira contrato.</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
