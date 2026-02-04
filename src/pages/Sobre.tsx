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
      
      {/* HERO SECTION - Compact Premium */}
      <section className="relative min-h-[70vh] w-full flex items-center">
        {/* Subtle grain texture */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 w-full">
          <div className="container-main py-20 md:py-28">
            <div className="max-w-3xl">
              
              {/* M3 Agency Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-4"
              >
                <span className="text-[#e52421]">M3</span> Agency
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-base sm:text-lg md:text-xl text-neutral-400 font-light mb-8 leading-relaxed"
              >
                Scouting, estratégia e decisões de carreira no futebol profissional.
              </motion.p>

              {/* Editorial Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="mb-8"
              >
                <p className="text-xl sm:text-2xl md:text-3xl text-white font-medium leading-[1.35]">
                  Transformamos talento em direção.
                  <br />
                  <span className="text-neutral-500 font-light">Criamos caminhos reais no futebol de elite.</span>
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
                  className="inline-flex items-center gap-3 text-sm tracking-widest uppercase text-neutral-500 hover:text-white transition-colors duration-300 group"
                >
                  <span className="w-8 h-px bg-neutral-600 group-hover:w-12 group-hover:bg-[#e52421] transition-all duration-300" />
                  Falar com a M3
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 lg:py-20 bg-[#0a0a0a]">
        <div className="container-main">
          <motion.div 
            ref={conceptRef}
            initial={{ opacity: 0, y: 30 }}
            animate={conceptInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-2xl"
          >
            <p className="text-lg sm:text-xl md:text-2xl leading-[1.7]">
              <span className="text-white font-semibold">A M3 Agency atua onde talento encontra decisão.</span>
              <br /><br />
              <span className="text-neutral-400 font-light">Mais do que representar atletas, operamos como um núcleo estratégico: análise, visão de mercado e construção de carreira com base em dados, contexto competitivo e leitura real do jogo.</span>
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 md:py-14 lg:py-16 bg-[#0d0d0d]">
        <div className="container-main">
          
          {/* Section Label */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={servicesInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-semibold mb-6 md:mb-8"
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
                className="group border-t border-neutral-800/50 py-5 md:py-6 cursor-pointer"
                onMouseEnter={() => setActiveService(index)}
                onMouseLeave={() => setActiveService(null)}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 items-baseline">
                  
                  {/* Number */}
                  <div className="md:col-span-2">
                    <span 
                      className={`text-xl md:text-2xl font-bold transition-colors duration-300 ${
                        activeService === index ? 'text-[#e52421]' : 'text-neutral-700'
                      }`}
                    >
                      {service.number}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <div className="md:col-span-4">
                    <h3 
                      className={`text-lg md:text-xl font-semibold transition-colors duration-300 ${
                        activeService === index ? 'text-white' : 'text-neutral-400'
                      }`}
                    >
                      {service.title}
                    </h3>
                  </div>
                  
                  {/* Description */}
                  <div className="md:col-span-6">
                    <p 
                      className={`text-sm md:text-base font-light leading-relaxed transition-colors duration-300 ${
                        activeService === index ? 'text-neutral-300' : 'text-neutral-600'
                      }`}
                    >
                      {service.description}
                    </p>
                  </div>
                </div>
                
                {/* Hover accent line */}
                <div 
                  className={`mt-4 h-px transition-all duration-500 ${
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

      <section className="py-16 md:py-20 lg:py-24 bg-[#0a0a0a]">
        <div className="container-main">
          <div 
            ref={manifestoRef}
            className="manifesto max-w-3xl mx-auto text-center flex flex-col gap-1 md:gap-2"
          >
            {[
              { text: "Talento sem direção é ruído.", delay: 0, weight: "font-light" },
              { text: "Direção sem estratégia é sorte.", delay: 0.15, weight: "font-light" },
              { text: "Nós trabalhamos com os dois.", delay: 0.3, weight: "font-semibold" },
            ].map((item, index) => (
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={manifestoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: item.delay, ease: [0.25, 0.1, 0.25, 1] }}
                className={`manifesto-item text-lg sm:text-xl md:text-2xl lg:text-3xl ${item.weight} leading-[1.4] text-neutral-500 transition-colors duration-[220ms] ease-out hover:text-white`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {item.text}
              </motion.p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
