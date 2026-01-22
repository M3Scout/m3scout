import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-stadium-cinematic.jpg";

export function CinematicHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  // Animation config
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 8 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    }),
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ backgroundColor: "#070910" }}
    >
      {/* Background Image - Real Football, Cinematic */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt=""
          className={cn(
            "w-full h-full object-cover transition-opacity duration-1000",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            filter: "saturate(0.3) brightness(0.4)",
          }}
        />
        {/* Dark Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #070910 0%, rgba(7,9,16,0.75) 40%, rgba(7,9,16,0.85) 100%)",
          }}
        />
        {/* Subtle Film Grain */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full mx-auto max-w-[1200px] px-6 lg:px-10 py-20">
        <div className="max-w-2xl">
          {/* Headline */}
          <motion.h1
            variants={fadeUpVariant}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            custom={0.12}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold leading-[1.05] tracking-tight mb-6"
          >
            <span className="block text-white">SCOUTING QUE</span>
            <span className="block">
              <span className="text-white">VIRA </span>
              <span className="text-[#e52421]">CONTRATO.</span>
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUpVariant}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            custom={0.24}
            className="text-lg md:text-xl text-white/55 max-w-xl leading-relaxed mb-10"
          >
            Dados reais, leitura humana e decisão profissional.
            <br className="hidden sm:block" />
            Conectamos atletas, clubes e oportunidades reais.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUpVariant}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            custom={0.36}
            className="flex flex-wrap gap-4"
          >
            {/* Primary Button */}
            <Link to="/players">
              <motion.button
                whileHover={{ 
                  scale: 1.02, 
                  y: -2,
                  boxShadow: "0 8px 24px -8px rgba(229,36,33,0.4)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="group inline-flex items-center gap-2 px-7 py-4 bg-[#e52421] text-white font-medium tracking-wide transition-shadow duration-300"
              >
                Ver Atletas
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            </Link>

            {/* Secondary Button */}
            <Link to="/contact">
              <motion.button
                whileHover={{ 
                  scale: 1.02, 
                  y: -2,
                  backgroundColor: "rgba(255,255,255,0.04)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-2 px-7 py-4 border border-white/20 text-white font-medium tracking-wide transition-colors duration-300 hover:border-white/35"
              >
                Falar com a M3
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToContent}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isLoaded ? 0.5 : 0, y: isLoaded ? 0 : 10 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        whileHover={{ opacity: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white cursor-pointer"
        aria-label="Role para explorar"
      >
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </motion.button>

      {/* Bottom Gradient Fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 z-[5] pointer-events-none"
        style={{
          background: "linear-gradient(to top, #070910 0%, transparent 100%)",
        }}
      />
    </section>
  );
}
