import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Users, FileText, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import heroAbstract from "@/assets/hero-abstract-intelligence.jpg";

// Simple animation stages for headline
type HeadlineStage = "hidden" | "line1" | "line2" | "complete";

export function CinematicHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [headlineStage, setHeadlineStage] = useState<HeadlineStage>("hidden");
  const [showSubheadline, setShowSubheadline] = useState(false);
  const [showCtas, setShowCtas] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Simple 2-line headline animation
  useEffect(() => {
    if (prefersReducedMotion) {
      setHeadlineStage("complete");
      setShowSubheadline(true);
      setShowCtas(true);
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setHeadlineStage("line1"), 150));
    timers.push(setTimeout(() => setHeadlineStage("line2"), 300));
    timers.push(setTimeout(() => setHeadlineStage("complete"), 450));
    timers.push(setTimeout(() => setShowSubheadline(true), 550));
    timers.push(setTimeout(() => setShowCtas(true), 850));

    return () => timers.forEach(clearTimeout);
  }, [prefersReducedMotion]);

  // Parallax scroll effect
  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      if (rect.bottom > 0) setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prefersReducedMotion]);

  // Mouse spotlight effect
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
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  const parallaxOffset = prefersReducedMotion ? 0 : scrollY * 0.3;
  const hudParallax = prefersReducedMotion ? 0 : scrollY * 0.15;

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ backgroundColor: "#070910" }}
    >
      {/* Abstract Background Image with Parallax */}
      <div
        className="absolute inset-0 z-0 transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset}px) scale(1.1)` }}
      >
        <img
          src={heroAbstract}
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Subtle Vignette - less aggressive to preserve the abstract visual */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 20%, rgba(7,9,16,0.4) 60%, rgba(7,9,16,0.85) 100%)",
          }}
        />
      </div>

      {/* Lighter Overlay - preserve more of the abstract image */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background: "linear-gradient(135deg, rgba(7,9,16,0.7) 0%, rgba(7,9,16,0.35) 40%, rgba(7,9,16,0.6) 100%)",
        }}
      />

      {/* Grain Texture */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Tactical Grid & HUD Layer */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none overflow-hidden"
        style={{ transform: `translateY(${hudParallax}px)` }}
      >
        {/* Tactical Field Lines */}
        <TacticalGrid />

        {/* Tracking Dots */}
        {!prefersReducedMotion && <TrackingDots />}

        {/* Light Sweep (Radar Style) */}
        {!prefersReducedMotion && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full animate-light-sweep">
              <div
                className="absolute top-0 w-[200px] h-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(229,36,33,0.03) 50%, transparent 100%)",
                }}
              />
            </div>
          </div>
        )}

        {/* Corner Reticles */}
        <Reticle position="top-[12%] left-[8%]" size={16} />
        <Reticle position="bottom-[18%] right-[12%]" size={20} isCircle />

        {/* Technical Label - only Scouting Intel, removed Data Layer */}
        <div className="absolute top-[10%] right-[6%] text-[9px] tracking-[0.35em] text-white/15 font-mono uppercase">
          Scouting Intel
        </div>
      </div>

      {/* Mouse Spotlight */}
      <div
        className="absolute inset-0 z-[4] pointer-events-none hidden md:block"
        style={{
          background: prefersReducedMotion
            ? "none"
            : `radial-gradient(500px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(229,36,33,0.04) 0%, transparent 50%)`,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 w-full mx-auto max-w-[1280px] px-6 lg:px-10 py-20">
        <div className="grid lg:grid-cols-[1fr,auto] gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-2xl">
            {/* Simple 2-line Animated Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-8">
              {/* Line 1: SCOUTING QUE */}
              <span
                className={cn(
                  "block text-white transition-all duration-300 ease-out",
                  headlineStage === "hidden" && "opacity-0 translate-y-3",
                  (headlineStage === "line1" || headlineStage === "line2" || headlineStage === "complete") && "opacity-100 translate-y-0"
                )}
              >
                SCOUTING QUE
              </span>
              {/* Line 2: VIRA CONTRATO. */}
              <span
                className={cn(
                  "block transition-all duration-300 ease-out",
                  (headlineStage === "hidden" || headlineStage === "line1") && "opacity-0 translate-y-3",
                  (headlineStage === "line2" || headlineStage === "complete") && "opacity-100 translate-y-0"
                )}
                style={{ transitionDelay: headlineStage === "line1" ? "0ms" : "100ms" }}
              >
                <span className="text-white">VIRA </span>
                <span className="text-[#e52421]">CONTRATO.</span>
              </span>
            </h1>

            {/* Subheadline with Text Reveal */}
            <div className="mb-10 overflow-hidden">
              <p
                className={cn(
                  "text-lg md:text-xl text-white/65 max-w-lg leading-relaxed transition-all duration-700",
                  showSubheadline
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
              >
                <TextReveal show={showSubheadline} delay={0}>
                  Identificamos talento,
                </TextReveal>{" "}
                <TextReveal show={showSubheadline} delay={100}>
                  aceleramos evolução
                </TextReveal>{" "}
                <TextReveal show={showSubheadline} delay={200}>
                  e conectamos com clubes de elite.
                </TextReveal>
              </p>
            </div>

            {/* CTAs with Enhanced Effects */}
            <div
              className={cn(
                "flex flex-wrap gap-4 mb-4 transition-all duration-700",
                showCtas ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              <Link to="/players">
                <Button
                  size="lg"
                  className="group relative bg-[#e52421] text-white px-8 py-6 text-base font-medium tracking-wide overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl"
                  style={{
                    boxShadow: "0 0 0 0 rgba(229,36,33,0), 0 4px 15px -3px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "inset 0 0 20px rgba(255,255,255,0.15), 0 8px 25px -5px rgba(229,36,33,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 0 0 rgba(229,36,33,0), 0 4px 15px -3px rgba(0,0,0,0.3)";
                  }}
                >
                  Ver Atletas
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 text-white px-8 py-6 text-base font-medium tracking-wide transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:translate-y-[-2px]"
                >
                  Falar com a M3
                </Button>
              </Link>
            </div>

            {/* Micro Text */}
            <p
              className={cn(
                "text-sm text-white/35 transition-all duration-500",
                showCtas ? "opacity-100" : "opacity-0"
              )}
              style={{ transitionDelay: "200ms" }}
            >
              Acesso rápido ao portfólio e relatórios.
            </p>
          </div>

          {/* Right - Live Scouting Feed */}
          <div
            className={cn(
              "hidden lg:block transition-all duration-1000",
              showCtas ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            )}
            style={{ transitionDelay: "300ms" }}
          >
            <LiveScoutingFeed prefersReducedMotion={prefersReducedMotion} />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-all duration-500 cursor-pointer",
          showCtas ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDelay: "600ms" }}
        aria-label="Role para explorar"
      >
        <span className="text-[9px] tracking-[0.35em] uppercase font-medium">
          Role para explorar
        </span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </button>

      {/* Bottom Gradient */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 z-[5]" 
        style={{ background: "linear-gradient(to top, #070910 0%, rgba(7,9,16,0.5) 50%, transparent 100%)" }}
      />
    </section>
  );
}

// Text Reveal Component
function TextReveal({ children, show, delay }: { children: React.ReactNode; show: boolean; delay: number }) {
  return (
    <span
      className={cn(
        "inline-block transition-all duration-500",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

// Tactical Grid Component
function TacticalGrid() {
  return (
    <div className="absolute inset-0 opacity-[0.025]">
      {/* Vertical lines */}
      <div className="absolute left-1/4 top-0 bottom-0 w-px bg-white" />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
      <div className="absolute left-3/4 top-0 bottom-0 w-px bg-white" />
      {/* Horizontal lines */}
      <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
      <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white rounded-full" />
    </div>
  );
}

// Tracking Dots Component
function TrackingDots() {
  const dots = [
    { left: "15%", top: "25%", delay: 0 },
    { left: "75%", top: "35%", delay: 1 },
    { left: "45%", top: "60%", delay: 2 },
    { left: "25%", top: "70%", delay: 0.5 },
    { left: "65%", top: "75%", delay: 1.5 },
    { left: "85%", top: "55%", delay: 2.5 },
  ];

  return (
    <>
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#e52421]/20 animate-tracking-pulse"
          style={{
            left: dot.left,
            top: dot.top,
            animationDelay: `${dot.delay}s`,
          }}
        >
          <div className="absolute inset-0 rounded-full bg-[#e52421]/40 animate-ping" />
        </div>
      ))}
    </>
  );
}

// Reticle Component
function Reticle({ position, size, isCircle }: { position: string; size: number; isCircle?: boolean }) {
  if (isCircle) {
    return (
      <div className={`absolute ${position} opacity-15`} style={{ width: size * 5, height: size * 5 }}>
        <div className="absolute inset-0 border border-white/40 rounded-full" />
        <div className="absolute inset-2 border border-white/25 rounded-full" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/25" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/25" />
      </div>
    );
  }

  return (
    <div className={`absolute ${position} opacity-20`} style={{ width: size * 4, height: size * 4 }}>
      <div className="absolute top-0 left-0 w-4 h-px bg-white" />
      <div className="absolute top-0 left-0 w-px h-4 bg-white" />
      <div className="absolute bottom-0 right-0 w-4 h-px bg-white" />
      <div className="absolute bottom-0 right-0 w-px h-4 bg-white" />
    </div>
  );
}

// Live Scouting Feed Component with Real Data
function LiveScoutingFeed({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [stats, setStats] = useState({
    players: 0,
    reports: 0,
    competitions: 0,
    targetPlayers: 0,
    targetReports: 0,
    targetCompetitions: 0,
    isLoading: true,
    hasError: false,
  });

  // Intersection Observer for viewport detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch real data from database
  useEffect(() => {
    async function fetchStats() {
      try {
        // Count public players (is_public = true and not archived)
        const { count: playersCount, error: playersError } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("is_public", true)
          .or("is_archived.is.null,is_archived.eq.false");

        // Count all scouting reports (not deleted)
        const { count: reportsCount, error: reportsError } = await supabase
          .from("scouting_reports")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null);

        // Count active competitions
        const { count: competitionsCount, error: competitionsError } = await supabase
          .from("competitions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        const hasAnyError = playersError || reportsError || competitionsError;

        if (hasAnyError) {
          console.error("Error fetching hero stats:", { playersError, reportsError, competitionsError });
        }

        setStats({
          players: 0,
          reports: 0,
          competitions: 0,
          targetPlayers: playersCount ?? 0,
          targetReports: reportsCount ?? 0,
          targetCompetitions: competitionsCount ?? 0,
          isLoading: false,
          hasError: !!hasAnyError,
        });
      } catch (error) {
        console.error("Error fetching hero stats:", error);
        setStats((prev) => ({
          ...prev,
          targetPlayers: 0,
          targetReports: 0,
          targetCompetitions: 0,
          isLoading: false,
          hasError: true,
        }));
      }
    }
    fetchStats();
  }, []);

  // Only animate counters if we have valid data (no error, values > 0)
  const shouldAnimate = isVisible && !stats.isLoading && !stats.hasError && 
    (stats.targetPlayers > 0 || stats.targetReports > 0 || stats.targetCompetitions > 0);

  // Animate counters when visible and data is valid
  useEffect(() => {
    if (!shouldAnimate) {
      if (prefersReducedMotion || stats.hasError) {
        setStats((prev) => ({
          ...prev,
          players: prev.targetPlayers,
          reports: prev.targetReports,
          competitions: prev.targetCompetitions,
        }));
      }
      return;
    }

    const duration = 1200;
    const steps = 50;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      setStats((prev) => ({
        ...prev,
        players: Math.round(prev.targetPlayers * eased),
        reports: Math.round(prev.targetReports * eased),
        competitions: Math.round(prev.targetCompetitions * eased),
      }));

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [shouldAnimate, stats.targetPlayers, stats.targetReports, stats.targetCompetitions, prefersReducedMotion, stats.hasError]);

  const isCounting = shouldAnimate && stats.players < stats.targetPlayers;

  return (
    <div
      ref={cardRef}
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full bg-[#e52421]",
            isCounting ? "animate-pulse" : ""
          )} />
          <span className="text-[9px] tracking-[0.25em] text-white/40 uppercase font-medium">
            Live Scouting Feed
          </span>
        </div>
        <span className="text-[8px] tracking-[0.2em] text-[#e52421]/60 uppercase font-medium px-2 py-1 bg-[#e52421]/10 rounded">
          Live Data
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-5">
        <AnimatedStatRow
          icon={Users}
          label="Atletas monitorados"
          value={stats.players}
          isCounting={isCounting}
        />
        <AnimatedStatRow
          icon={FileText}
          label="Relatórios gerados"
          value={stats.reports}
          isCounting={isCounting}
        />
        <AnimatedStatRow
          icon={Trophy}
          label="Competições mapeadas"
          value={stats.competitions}
          isCounting={isCounting}
        />
      </div>

      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl">
        <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-white/10" />
      </div>
    </div>
  );
}

function AnimatedStatRow({
  icon: Icon,
  label,
  value,
  isCounting,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  isCounting: boolean;
}) {
  // Format display: show value+ if > 0, "0" if explicitly 0, "..." if loading
  const displayValue = value > 0 ? `${value}+` : value === 0 ? "0" : "...";
  
  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        "w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center transition-all duration-300",
        isCounting && "animate-pulse"
      )}>
        <Icon className="w-5 h-5 text-[#e52421]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight tabular-nums">
          {displayValue}
        </p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  );
}
