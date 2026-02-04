import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Eye, MessageCircle, Sparkles, Users, FileText, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-stadium-cinematic.jpg";

interface HeroStats {
  athletes: number | null;
  reports: number | null;
  competitions: number | null;
}

// Animated counter component
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) setHasAnimated(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated || !end) return;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function CinematicHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [stats, setStats] = useState<HeroStats>({ athletes: null, reports: null, competitions: null });

  useEffect(() => {
    if (import.meta.env.DEV) {
      const appStart = (window as any).__APP_MOUNT_START ?? performance.now();
      console.log("[TIMING] CinematicHero mounted", {
        sinceAppMount: `${Math.round(performance.now() - appStart)}ms`
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const [playersRes, reportsRes, competitionsRes] = await Promise.all([
          supabase.from("players").select("id", { count: "exact", head: true }).eq("is_public", true).or("is_archived.is.null,is_archived.eq.false"),
          supabase.from("scouting_reports").select("id", { count: "exact", head: true }).is("deleted_at", null),
          supabase.from("competitions").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);

        if (isMounted) {
          setStats({
            athletes: playersRes.count ?? null,
            reports: reportsRes.count ?? null,
            competitions: competitionsRes.count ?? null,
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Error fetching hero stats:", error);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 50, behavior: "smooth" });
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#050505" }}
    >
      {/* === BACKGROUND WITH DRAMATIC EFFECTS === */}
      <div className="absolute inset-0 z-0">
        {/* Base image */}
        <img
          src={heroImage}
          alt=""
          className={cn(
            "w-full h-full object-cover transition-opacity duration-1000",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{ filter: "saturate(0.25) brightness(0.35)" }}
        />
        
        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #050505 0%, rgba(5,5,5,0.7) 40%, rgba(5,5,5,0.9) 100%)" }} />
        
        {/* RED GLOW - Top Left - DRAMATIC */}
        <motion.div 
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(220, 38, 38, 0.5) 0%, rgba(220, 38, 38, 0.15) 40%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* ORANGE GLOW - Right */}
        <motion.div 
          className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.1) 50%, transparent 70%)" }}
          animate={{ scale: [1.1, 1, 1.1], x: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* GREEN ACCENT - Bottom */}
        <motion.div 
          className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 60%)" }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spotlight from top */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none"
          style={{ background: "conic-gradient(from 180deg at 50% 0%, transparent 35%, rgba(255,255,255,0.04) 50%, transparent 65%)" }}
        />

        {/* Film grain */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex-1 flex items-center w-full mx-auto max-w-[1300px] px-6 lg:px-12 py-24">
        <div className="w-full text-center">
          
          {/* STATUS BADGE - More visible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-red-600/25 via-orange-500/15 to-amber-500/10 border-2 border-red-500/40 shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-bold tracking-[0.15em] uppercase text-red-400">
                Football Intelligence System
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </motion.div>

          {/* HEADLINE - Larger and more impactful */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            className="text-[2.8rem] sm:text-[4rem] md:text-[5.5rem] lg:text-[7rem] font-black tracking-[-0.02em] leading-[0.9] mb-8"
          >
            <motion.span 
              className="block text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: isLoaded ? 0 : 50, opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              FOOTBALL
            </motion.span>
            <motion.span 
              className="block text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: isLoaded ? 0 : 50, opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            >
              INTELLIGENCE.
            </motion.span>
            <motion.span 
              className="block"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: isLoaded ? 0 : 50, opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_80px_rgba(239,68,68,0.6)]">
                NOT OPINION.
              </span>
            </motion.span>
          </motion.h1>

          {/* SUBTITLE */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Dados reais, leitura humana e decisão profissional.
            <br className="hidden sm:block" />
            <span className="text-white font-medium">Conectamos atletas, clubes e oportunidades reais.</span>
          </motion.p>

          {/* === CTA BUTTONS - HUGE AND DRAMATIC === */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-5 justify-center mb-14"
          >
            {/* PRIMARY CTA - MASSIVE RED BUTTON */}
            <Link to="/players">
              <motion.button
                className="group relative w-full sm:w-auto min-w-[300px] h-[72px] px-12 rounded-2xl font-black text-xl text-white overflow-hidden"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {/* Animated gradient */}
                <motion.span 
                  className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500"
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 100%" }}
                />
                
                {/* Pulsing glow shadow */}
                <motion.span 
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{ 
                    boxShadow: [
                      "0 0 40px 8px rgba(239, 68, 68, 0.4), 0 0 80px 16px rgba(239, 68, 68, 0.2)",
                      "0 0 60px 12px rgba(239, 68, 68, 0.6), 0 0 100px 24px rgba(239, 68, 68, 0.3)",
                      "0 0 40px 8px rgba(239, 68, 68, 0.4), 0 0 80px 16px rgba(239, 68, 68, 0.2)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Shine sweep */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden rounded-2xl">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </span>
                
                {/* Inner border */}
                <span className="absolute inset-0 rounded-2xl border-2 border-white/25 group-hover:border-white/40 transition-colors" />
                
                {/* Content */}
                <span className="relative flex items-center justify-center gap-4">
                  <Eye className="w-6 h-6" />
                  <span className="tracking-wide">VER ATLETAS</span>
                  <motion.span
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.span>
                </span>
              </motion.button>
            </Link>

            {/* SECONDARY CTA - Glass style */}
            <Link to="/contact">
              <motion.button
                className="group relative w-full sm:w-auto min-w-[240px] h-[72px] px-10 rounded-2xl font-bold text-lg overflow-hidden"
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {/* Glass background */}
                <span className="absolute inset-0 bg-white/[0.08] backdrop-blur-md border-2 border-white/20 rounded-2xl group-hover:border-amber-500/50 group-hover:bg-white/[0.12] transition-all duration-300" />
                
                {/* Glow on hover */}
                <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_40px_-8px_rgba(251,191,36,0.4)]" />
                
                {/* Content */}
                <span className="relative flex items-center justify-center gap-3 text-white">
                  <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                    <MessageCircle className="w-5 h-5 text-amber-400" />
                  </motion.span>
                  <span>Falar com a M3</span>
                </span>
              </motion.button>
            </Link>
          </motion.div>

          {/* STATS BAR - More colorful */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-0 px-6 sm:px-8 py-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm"
          >
            {/* System status */}
            <div className="flex items-center gap-3 px-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-sm font-semibold text-emerald-400">Sistema ativo</span>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10" />

            <div className="flex items-center gap-6 px-4">
              {stats.athletes !== null && stats.athletes > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-500/20">
                    <Users className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    <AnimatedCounter end={stats.athletes} />
                  </span>
                  <span className="text-xs text-zinc-500 uppercase">atletas</span>
                </div>
              )}

              {stats.reports !== null && stats.reports > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-500/20">
                    <FileText className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    <AnimatedCounter end={stats.reports} />
                  </span>
                  <span className="text-xs text-zinc-500 uppercase">relatórios</span>
                </div>
              )}

              {stats.competitions !== null && stats.competitions > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Globe className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-lg font-bold text-white tabular-nums">
                    <AnimatedCounter end={stats.competitions} suffix="+" />
                  </span>
                  <span className="text-xs text-zinc-500 uppercase">competições</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* === SCROLL INDICATOR - MASSIVE AND IMPOSSIBLE TO MISS === */}
      <motion.div 
        className="relative z-20 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <motion.button
          onClick={scrollToContent}
          className="group relative mx-auto flex flex-col items-center cursor-pointer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Background glow */}
          <motion.div 
            className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-red-500/30 via-orange-500/15 to-transparent blur-2xl pointer-events-none"
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Container card */}
          <div className="relative flex flex-col items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-b from-white/15 to-white/5 border-2 border-white/25 group-hover:border-red-500/60 backdrop-blur-md transition-all duration-300 shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)]">
            
            {/* Text */}
            <span className="text-base sm:text-lg font-bold text-white tracking-wide">
              ↓ Conheça nossos talentos ↓
            </span>
            
            {/* Animated triple chevrons */}
            <div className="flex flex-col items-center -space-y-2">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="w-8 h-8 text-red-400" strokeWidth={3} />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              >
                <ChevronDown className="w-8 h-8 text-orange-400" strokeWidth={3} />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              >
                <ChevronDown className="w-8 h-8 text-amber-400" strokeWidth={3} />
              </motion.div>
            </div>
          </div>
          
          {/* Pulse ring effect */}
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-red-500/50 pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-[5] pointer-events-none" style={{ background: "linear-gradient(to top, #050505 0%, transparent 100%)" }} />
    </section>
  );
}
