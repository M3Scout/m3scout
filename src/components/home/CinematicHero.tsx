import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export function CinematicHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

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

  // Animation variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const buttonHover = {
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeOut" as const },
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ backgroundColor: "#070910" }}
    >
      {/* Abstract Grid Background with Parallax */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: prefersReducedMotion ? 0 : backgroundY }}
      >
        <AbstractGridBackground isLoaded={isLoaded} reducedMotion={prefersReducedMotion} />
      </motion.div>

      {/* Ambient Glow Effects */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {/* Primary glow - center left */}
        <div
          className={cn(
            "absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full transition-opacity duration-[2000ms]",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: "radial-gradient(circle, rgba(229,36,33,0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* Secondary glow - right */}
        <div
          className={cn(
            "absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full transition-opacity duration-[2500ms] delay-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* HUD Frame Elements */}
      <HUDElements isLoaded={isLoaded} />

      {/* Main Content */}
      <motion.div
        className="relative z-10 w-full mx-auto max-w-[1280px] px-6 lg:px-10"
        style={{ opacity: prefersReducedMotion ? 1 : contentOpacity }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
          className="max-w-3xl"
        >
          {/* Intel Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e52421] animate-pulse" />
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/50 font-medium">
                Football Intelligence System
              </span>
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
          >
            <span className="block text-white">FOOTBALL</span>
            <span className="block text-white">INTELLIGENCE.</span>
            <span className="block text-[#e52421]">NOT OPINION.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-white/50 max-w-xl leading-relaxed mb-10"
          >
            Plataforma proprietária de scouting que transforma dados em decisões. 
            Identificamos talento antes do mercado.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4 mb-6">
            <Link to="/players">
              <motion.button
                whileHover={buttonHover}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-[#e52421] text-white font-medium tracking-wide overflow-hidden transition-shadow duration-300 hover:shadow-[0_8px_30px_-8px_rgba(229,36,33,0.5)]"
              >
                <span className="relative z-10">Ver Atletas</span>
                <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                {/* Hover shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </motion.button>
            </Link>
            <Link to="/contact">
              <motion.button
                whileHover={buttonHover}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-medium tracking-wide transition-all duration-300 hover:border-white/40 hover:bg-white/[0.03]"
              >
                Falar com a M3
              </motion.button>
            </Link>
          </motion.div>

          {/* Micro Stats */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-6 text-xs text-white/30"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500/60" />
              <span>Sistema ativo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white/50">150+</span>
              <span>atletas monitorados</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToContent}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        aria-label="Role para explorar"
      >
        <span className="text-[9px] tracking-[0.3em] uppercase">Explorar</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </motion.button>

      {/* Bottom Gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 z-[5] pointer-events-none"
        style={{
          background: "linear-gradient(to top, #070910 0%, rgba(7,9,16,0.8) 40%, transparent 100%)",
        }}
      />
    </section>
  );
}

// Abstract Grid Background Component
function AbstractGridBackground({ isLoaded, reducedMotion }: { isLoaded: boolean; reducedMotion: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base grid - perspective view */}
      <svg
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-[2000ms]",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="heroGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </pattern>
          {/* Radial mask for grid fade */}
          <radialGradient id="gridFade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="gridMask">
            <rect width="100%" height="100%" fill="url(#gridFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroGrid)" mask="url(#gridMask)" />
      </svg>

      {/* Perspective lines - converging to center */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-[2500ms] delay-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* Horizontal scan lines */}
          {[20, 35, 50, 65, 80].map((y) => (
            <line
              key={y}
              x1="0%"
              y1={`${y}%`}
              x2="100%"
              y2={`${y}%`}
              stroke="url(#lineGradient)"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* Data points / nodes */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-[3000ms] delay-500",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        {!reducedMotion && <DataNodes />}
      </div>

      {/* Floating connection lines */}
      <svg
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-[3000ms] delay-700",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(229,36,33,0)" />
            <stop offset="50%" stopColor="rgba(229,36,33,0.15)" />
            <stop offset="100%" stopColor="rgba(229,36,33,0)" />
          </linearGradient>
        </defs>
        {/* Connection paths */}
        <path
          d="M 15% 30% Q 30% 40% 45% 35%"
          fill="none"
          stroke="url(#connectionGradient)"
          strokeWidth="1"
          className={cn(!reducedMotion && "animate-pulse")}
          style={{ animationDuration: "4s" }}
        />
        <path
          d="M 55% 60% Q 70% 50% 85% 55%"
          fill="none"
          stroke="url(#connectionGradient)"
          strokeWidth="1"
          className={cn(!reducedMotion && "animate-pulse")}
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
        <path
          d="M 25% 70% Q 40% 65% 55% 75%"
          fill="none"
          stroke="rgba(59,130,246,0.08)"
          strokeWidth="1"
          className={cn(!reducedMotion && "animate-pulse")}
          style={{ animationDuration: "6s", animationDelay: "2s" }}
        />
      </svg>
    </div>
  );
}

// Data Nodes Component
function DataNodes() {
  const nodes = [
    { x: "18%", y: "28%", size: 4, delay: 0 },
    { x: "45%", y: "35%", size: 3, delay: 0.5 },
    { x: "72%", y: "42%", size: 5, delay: 1 },
    { x: "28%", y: "55%", size: 3, delay: 1.5 },
    { x: "58%", y: "62%", size: 4, delay: 2 },
    { x: "85%", y: "48%", size: 3, delay: 0.8 },
    { x: "38%", y: "72%", size: 4, delay: 1.2 },
    { x: "68%", y: "78%", size: 3, delay: 1.8 },
  ];

  return (
    <>
      {nodes.map((node, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: node.x,
            top: node.y,
            width: node.size,
            height: node.size,
            animationDelay: `${node.delay}s`,
            animationDuration: "3s",
          }}
        >
          <div
            className="w-full h-full rounded-full bg-white/20"
            style={{
              boxShadow: "0 0 8px rgba(255,255,255,0.1)",
            }}
          />
          {/* Outer ring for some nodes */}
          {i % 2 === 0 && (
            <div
              className="absolute inset-0 -m-1 border border-white/5 rounded-full animate-ping"
              style={{ animationDuration: "2s" }}
            />
          )}
        </div>
      ))}
    </>
  );
}

// HUD Frame Elements
function HUDElements({ isLoaded }: { isLoaded: boolean }) {
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
      {/* Top-left corner bracket */}
      <div
        className={cn(
          "absolute top-8 left-8 transition-all duration-1000",
          isLoaded ? "opacity-100 translate-x-0 translate-y-0" : "opacity-0 -translate-x-4 -translate-y-4"
        )}
      >
        <div className="w-16 h-16">
          <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-white/20 to-transparent" />
          <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>

      {/* Top-right corner bracket */}
      <div
        className={cn(
          "absolute top-8 right-8 transition-all duration-1000",
          isLoaded ? "opacity-100 translate-x-0 translate-y-0" : "opacity-0 translate-x-4 -translate-y-4"
        )}
      >
        <div className="w-16 h-16">
          <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-white/20 to-transparent" />
          <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>

      {/* Right side data display */}
      <div
        className={cn(
          "absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block transition-all duration-1000 delay-500",
          isLoaded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        )}
      >
        <div className="space-y-6 text-right">
          <div className="text-[9px] tracking-[0.3em] text-white/20 uppercase">
            Analysis Active
          </div>
          <div className="flex flex-col gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-px bg-gradient-to-l from-white/15 to-transparent animate-pulse"
                style={{
                  width: `${20 + i * 8}px`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: "2s",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom-left technical label */}
      <div
        className={cn(
          "absolute bottom-24 left-8 transition-all duration-1000 delay-700",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="text-[9px] tracking-[0.25em] text-white/15 font-mono uppercase">
          M3 Scout Engine v2.0
        </div>
      </div>

      {/* Crosshair element - center right area */}
      <div
        className={cn(
          "absolute top-1/3 right-1/4 hidden md:block transition-opacity duration-1000 delay-1000",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="relative w-12 h-12">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
