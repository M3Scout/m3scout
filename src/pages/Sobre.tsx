import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import heroStadium from "@/assets/hero-stadium.jpg";

const Sobre = () => {
  const [scrollY, setScrollY] = useState(0);
  const conceptRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLDivElement>(null);
  
  const conceptInView = useInView(conceptRef, { once: true, margin: "-100px" });
  const servicesInView = useInView(servicesRef, { once: true, margin: "-100px" });
  const manifestoInView = useInView(manifestoRef, { once: true, margin: "-100px" });

  // Fix scroll bug - always start at top
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Parallax effect for hero
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* HERO SECTION - Full Screen */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image with Parallax */}
        <div 
          className="absolute inset-0 scale-110"
          style={{ 
            transform: `translateY(${scrollY * 0.3}px) scale(1.1)`,
          }}
        >
          <img 
            src={heroStadium} 
            alt="" 
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]" />
        
        {/* Subtle Grain/Noise */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-12">
            <div className="max-w-4xl">
              {/* M3 Agency Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-6"
              >
                <span className="text-[#e52421]">M3</span> Agency
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-lg sm:text-xl md:text-2xl text-neutral-400 mb-8 max-w-2xl"
              >
                Scouting, estratégia e decisões de carreira no futebol profissional.
              </motion.p>

              {/* Editorial Headline */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mb-12"
              >
                <p 
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.2] text-white/90 font-light"
                  style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
                >
                  Transformamos talento em direção.
                  <br />
                  <span className="text-white">Criamos caminhos reais no futebol de elite.</span>
                </p>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
              >
                <Link 
                  to="/contato"
                  className="inline-flex items-center gap-3 text-sm tracking-wide text-neutral-300 hover:text-white transition-colors duration-300 group"
                >
                  <span className="w-8 h-px bg-neutral-500 group-hover:w-12 group-hover:bg-[#e52421] transition-all duration-300" />
                  Falar com a M3
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-neutral-600 to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* BLOCO CONCEITO - Editorial */}
      <section className="py-24 md:py-32 lg:py-40 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div 
            ref={conceptRef}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16"
          >
            {/* Empty column for breathing space (desktop only) */}
            <div className="hidden lg:block lg:col-span-4" />
            
            {/* Content column */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={conceptInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="lg:col-span-8"
            >
              <p 
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-[1.5] text-neutral-300 font-light"
                style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
              >
                <span className="text-white">A M3 Agency atua onde talento encontra decisão.</span>
                <br /><br />
                Mais do que representar atletas, operamos como um núcleo estratégico: análise, visão de mercado e construção de carreira com base em dados, contexto competitivo e leitura real do jogo.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* O QUE FAZEMOS - Editorial List */}
      <section className="py-24 md:py-32 lg:py-40 bg-[#0f0f0f]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          {/* Section Label */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={servicesInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-16 md:mb-20"
          >
            O que fazemos
          </motion.p>

          {/* Services List */}
          <div ref={servicesRef} className="space-y-0">
            {services.map((service, index) => (
              <motion.div
                key={service.number}
                initial={{ opacity: 0, y: 20 }}
                animate={servicesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="group border-t border-neutral-800/60 py-10 md:py-14 lg:py-16 cursor-default"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
                  {/* Number */}
                  <div className="md:col-span-2">
                    <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#e52421] opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                      {service.number}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <div className="md:col-span-4">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white group-hover:text-white/90 transition-colors duration-300">
                      {service.title}
                    </h3>
                  </div>
                  
                  {/* Description */}
                  <div className="md:col-span-6">
                    <p className="text-base md:text-lg text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors duration-300">
                      {service.description}
                    </p>
                  </div>
                </div>
                
                {/* Hover accent line */}
                <div className="mt-8 md:mt-10 h-px bg-gradient-to-r from-[#e52421]/0 via-[#e52421]/0 to-transparent group-hover:from-[#e52421]/40 group-hover:via-[#e52421]/20 transition-all duration-500" />
              </motion.div>
            ))}
            
            {/* Bottom border */}
            <div className="border-t border-neutral-800/60" />
          </div>
        </div>
      </section>

      {/* BLOCO MANIFESTO - Assinatura */}
      <section className="py-32 md:py-40 lg:py-52 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <motion.div 
            ref={manifestoRef}
            initial={{ opacity: 0, y: 30 }}
            animate={manifestoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <p 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-[1.4] text-white font-light max-w-5xl mx-auto"
              style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
            >
              <span className="text-neutral-500">Talento sem direção é ruído.</span>
              <br />
              <span className="text-neutral-500">Direção sem estratégia é sorte.</span>
              <br />
              <span className="text-white mt-4 block pt-4">Nós trabalhamos com os dois.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER SIGNATURE */}
      <section className="py-20 md:py-24 bg-[#0a0a0a] border-t border-neutral-900">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-sm text-neutral-600">
              © 2025 M3 Agency. Todos os direitos reservados.
            </p>
            <p 
              className="text-lg md:text-xl text-neutral-400"
              style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
            >
              <span className="text-[#e52421] font-semibold">M3</span>{" "}
              <span className="text-white">Agency</span>{" "}
              <span className="text-neutral-600 mx-2">—</span>{" "}
              <span className="italic">Scouting que vira contrato.</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
