import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Users, FileText, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import heroStadium from "@/assets/hero-stadium.webp";

export function PremiumHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    // Trigger load animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      if (rect.bottom > 0) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      if (e.clientY > rect.bottom) return;

      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion]);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  const parallaxOffset = prefersReducedMotion ? 0 : scrollY * 0.3;
  const hudParallax = prefersReducedMotion ? 0 : scrollY * 0.15;

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-neutral-950"
    >
      {/* Background Image with Parallax */}
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `translateY(${parallaxOffset}px) scale(1.1)`,
        }}
      >
        <img
          src={heroStadium}
          alt=""
          className="w-full h-full object-cover"
          style={{
            filter: "blur(1px)",
          }}
        />
        {/* Vignette Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      </div>

      {/* Dark Gradient Overlay for Legibility */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Grain Texture */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* HUD Layer with Parallax */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none overflow-hidden"
        style={{
          transform: `translateY(${hudParallax}px)`,
        }}
      >
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating Particles */}
        {!prefersReducedMotion && (
          <div className="absolute inset-0">
            {Array.from({ length: 30 }).map((_, i) => (
              <Particle key={i} index={i} />
            ))}
          </div>
        )}

        {/* Scan Line */}
        {!prefersReducedMotion && (
          <div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan"
          />
        )}

        {/* Corner Reticles */}
        <div className="absolute top-[15%] left-[10%] w-16 h-16 opacity-20">
          <div className="absolute top-0 left-0 w-4 h-[1px] bg-white" />
          <div className="absolute top-0 left-0 w-[1px] h-4 bg-white" />
          <div className="absolute bottom-0 right-0 w-4 h-[1px] bg-white" />
          <div className="absolute bottom-0 right-0 w-[1px] h-4 bg-white" />
        </div>

        <div className="absolute bottom-[20%] right-[15%] w-20 h-20 opacity-15">
          <div className="absolute inset-0 border border-white/30 rounded-full" />
          <div className="absolute inset-2 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20" />
        </div>

        {/* Technical Labels */}
        <div className="absolute top-[12%] right-[8%] text-[10px] tracking-[0.3em] text-white/20 font-mono">
          SCOUTING INTEL
        </div>
        <div className="absolute bottom-[25%] left-[5%] text-[10px] tracking-[0.3em] text-white/15 font-mono">
          DATA LAYER
        </div>
        <div className="absolute top-[60%] right-[20%] text-[10px] tracking-[0.3em] text-white/10 font-mono">
          LIVE ANALYSIS
        </div>
      </div>

      {/* Mouse Spotlight (Desktop Only) */}
      <div
        className="absolute inset-0 z-[4] pointer-events-none hidden md:block transition-opacity duration-300"
        style={{
          background: prefersReducedMotion
            ? "none"
            : `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(229,36,33,0.03) 0%, transparent 50%)`,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 w-full mx-auto max-w-[1280px] px-6 lg:px-10 py-20">
        <div className="grid lg:grid-cols-[1fr,auto] gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="max-w-2xl">
            {/* Headline with Glitch Effect */}
            <h1
              className={cn(
                "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6 transition-all duration-700",
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <span className="block glitch-text" data-text="SCOUTING QUE">
                SCOUTING QUE
              </span>
              <span className="block text-[#e52421] glitch-text" data-text="VIRA CONTRATO.">
                VIRA CONTRATO.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className={cn(
                "text-lg md:text-xl text-white/70 max-w-lg mb-8 leading-relaxed transition-all duration-700 delay-100",
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              )}
            >
              Identificamos talento, aceleramos evolução e conectamos com clubes de elite.
            </p>

            {/* CTA Buttons */}
            <div
              className={cn(
                "flex flex-wrap gap-4 mb-4 transition-all duration-700 delay-200",
                isLoaded
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              )}
            >
              <Link to="/players">
                <Button
                  size="lg"
                  className="bg-[#e52421] hover:bg-[#c91f1c] text-white px-8 py-6 text-base font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#e52421]/20"
                >
                  Ver Atletas
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-8 py-6 text-base font-medium tracking-wide transition-all duration-300"
                >
                  Falar com a M3
                </Button>
              </Link>
            </div>

            {/* Micro Text */}
            <p
              className={cn(
                "text-sm text-white/40 transition-all duration-700 delay-300",
                isLoaded
                  ? "opacity-100"
                  : "opacity-0"
              )}
            >
              Acesso rápido ao portfólio e relatórios.
            </p>
          </div>

          {/* Right - Stats Card */}
          <div
            className={cn(
              "hidden lg:block transition-all duration-1000 delay-500",
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            )}
          >
            <StatsCard prefersReducedMotion={prefersReducedMotion} />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-all duration-500 cursor-pointer group",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDelay: "800ms" }}
        aria-label="Role para explorar"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase font-medium">
          Role para explorar
        </span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </button>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent z-[5]" />
    </section>
  );
}

function StatsCard({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const [stats, setStats] = useState({
    players: 0,
    reports: 0,
    competitions: 0,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch public players count
        const { count: playersCount } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true });

        // Fetch active competitions count
        const { count: competitionsCount } = await supabase
          .from("competitions")
          .select("*", { count: "exact", head: true });

        setStats({
          players: playersCount || 0,
          reports: 500, // Static fallback - scouting_reports requires auth
          competitions: competitionsCount || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats({
          players: 150,
          reports: 500,
          competitions: 25,
          isLoading: false,
        });
      }
    }

    fetchStats();
  }, []);

  const formatStat = (value: number, isLoading: boolean) => {
    if (isLoading) return "...";
    if (value === 0) return "0";
    return `${value}+`;
  };

  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl backdrop-blur-xl transition-all duration-500",
        "bg-white/[0.03] border border-white/10",
        "hover:bg-white/[0.06] hover:border-white/20",
        !prefersReducedMotion && "animate-float-subtle"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered
          ? "0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "0 10px 40px -10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Card Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-[#e52421] animate-pulse" />
        <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase font-medium">
          Live Stats
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-5">
        <StatRow
          icon={Users}
          label="Atletas monitorados"
          value={formatStat(stats.players, stats.isLoading)}
        />
        <StatRow
          icon={FileText}
          label="Relatórios gerados"
          value={formatStat(stats.reports, stats.isLoading)}
        />
        <StatRow
          icon={Trophy}
          label="Competições mapeadas"
          value={formatStat(stats.competitions, stats.isLoading)}
        />
      </div>

      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl">
        <div
          className="absolute top-2 right-2 w-8 h-8 border-t border-r border-white/10"
        />
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#e52421]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  );
}

function Particle({ index }: { index: number }) {
  // Generate pseudo-random values based on index for consistent rendering
  const seed = index * 7919; // Prime number for better distribution
  const left = ((seed * 13) % 100);
  const top = ((seed * 17) % 100);
  const size = 2 + ((seed * 3) % 3);
  const duration = 15 + ((seed * 11) % 20);
  const delay = ((seed * 5) % 10);
  const opacity = 0.1 + ((seed % 20) / 100);

  return (
    <div
      className="absolute rounded-full bg-white animate-particle"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}
