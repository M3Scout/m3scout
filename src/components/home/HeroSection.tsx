import { Link } from "react-router-dom";
import { ArrowRight, ArrowDown, Users, FileText, Globe, Sparkles, MessageCircle, ChevronDown, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Animated counter
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
    if (!hasAnimated) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function HeroSection() {
  const [stats, setStats] = useState({ players: 0, reports: 0, competitions: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [p, r, c] = await Promise.all([
          supabase.from("players").select("id", { count: "exact", head: true }).eq("is_public", true),
          supabase.from("scouting_reports").select("id", { count: "exact", head: true }),
          supabase.from("competitions").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        setStats({ players: p.count || 6, reports: r.count || 5, competitions: c.count || 100 });
      } catch {
        setStats({ players: 6, reports: 5, competitions: 100 });
      }
    }
    fetchStats();
  }, []);

  const scrollToNext = () => {
    window.scrollTo({ top: window.innerHeight - 50, behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#050505]">
      
      {/* === DRAMATIC BACKGROUND === */}
      <div className="absolute inset-0">
        {/* Large red glow - top left */}
        <motion.div 
          className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, rgba(220, 38, 38, 0.1) 40%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Orange glow - right */}
        <motion.div 
          className="absolute top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0.1) 40%, transparent 70%)" }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Green accent - bottom */}
        <motion.div 
          className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 60%)" }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spotlight from top */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px]"
          style={{ 
            background: "conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)"
          }}
        />

        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-28 pb-8">
        <div className="max-w-6xl mx-auto text-center">
          
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex justify-center mb-12"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-red-600/20 via-orange-500/15 to-amber-500/10 border-2 border-red-500/30 shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]">
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

          {/* Main Headline */}
          <motion.h1 
            className="text-[3rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem] font-black tracking-[-0.03em] leading-[0.85] mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span 
              className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              FOOTBALL
            </motion.span>
            <motion.span 
              className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              INTELLIGENCE.
            </motion.span>
            <motion.span 
              className="block"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(239,68,68,0.5)]">
                NOT OPINION.
              </span>
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="text-xl sm:text-2xl text-zinc-400 max-w-3xl mx-auto mb-14 leading-relaxed"
          >
            Dados reais, leitura humana e decisão profissional.
            <br />
            <span className="text-white font-medium">Conectamos atletas, clubes e oportunidades reais.</span>
          </motion.p>

          {/* === DRAMATIC CTA BUTTONS === */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-5 justify-center mb-16"
          >
            {/* PRIMARY CTA - HUGE AND IMPOSSIBLE TO MISS */}
            <Link to="/players">
              <motion.button
                className="group relative w-full sm:w-auto min-w-[280px] h-20 px-12 rounded-2xl font-black text-xl text-white overflow-hidden"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Animated gradient background */}
                <motion.span 
                  className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500"
                  animate={{ 
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 100%" }}
                />
                
                {/* Pulsing glow */}
                <motion.span 
                  className="absolute inset-0 rounded-2xl"
                  animate={{ 
                    boxShadow: [
                      "0 0 30px 5px rgba(239, 68, 68, 0.4), 0 0 60px 10px rgba(239, 68, 68, 0.2)",
                      "0 0 50px 10px rgba(239, 68, 68, 0.6), 0 0 80px 20px rgba(239, 68, 68, 0.3)",
                      "0 0 30px 5px rgba(239, 68, 68, 0.4), 0 0 60px 10px rgba(239, 68, 68, 0.2)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Shine sweep on hover */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </span>
                
                {/* Border glow */}
                <span className="absolute inset-0 rounded-2xl border-2 border-white/20 group-hover:border-white/40 transition-colors" />
                
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

            {/* SECONDARY CTA */}
            <Link to="/contact">
              <motion.button
                className="group relative w-full sm:w-auto min-w-[240px] h-20 px-10 rounded-2xl font-bold text-lg overflow-hidden"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Glass background */}
                <span className="absolute inset-0 bg-white/[0.08] backdrop-blur-md border-2 border-white/20 rounded-2xl group-hover:border-amber-500/50 group-hover:bg-white/[0.12] transition-all duration-300" />
                
                {/* Subtle glow on hover */}
                <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_30px_-5px_rgba(251,191,36,0.3)]" />
                
                {/* Content */}
                <span className="relative flex items-center justify-center gap-3 text-white">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <MessageCircle className="w-5 h-5 text-amber-400" />
                  </motion.span>
                  <span>Falar com a M3</span>
                </span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.95 }}
            className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-0 px-8 py-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 px-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-sm font-semibold text-emerald-400">Sistema ativo</span>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10" />

            <div className="flex items-center gap-6 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/20">
                  <Users className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-lg font-bold text-white"><AnimatedCounter end={stats.players} /></span>
                <span className="text-xs text-zinc-500 uppercase">atletas</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/20">
                  <FileText className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-lg font-bold text-white"><AnimatedCounter end={stats.reports} /></span>
                <span className="text-xs text-zinc-500 uppercase">relatórios</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <Globe className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-lg font-bold text-white"><AnimatedCounter end={stats.competitions} suffix="+" /></span>
                <span className="text-xs text-zinc-500 uppercase">competições</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* === MASSIVE SCROLL INDICATOR - IMPOSSIBLE TO MISS === */}
      <motion.div 
        className="relative z-20 mt-auto pb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <motion.button
          onClick={scrollToNext}
          className="group relative mx-auto flex flex-col items-center gap-4 px-10 py-6 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Background glow */}
          <motion.div 
            className="absolute inset-0 rounded-3xl bg-gradient-to-b from-red-500/20 via-orange-500/10 to-transparent blur-2xl"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Container */}
          <div className="relative flex flex-col items-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border-2 border-white/20 group-hover:border-red-500/50 backdrop-blur-md transition-all duration-300">
            
            {/* Main text */}
            <span className="text-base sm:text-lg font-bold text-white tracking-wide">
              ↓ Conheça nossos talentos ↓
            </span>
            
            {/* Animated arrows stack */}
            <div className="flex flex-col items-center -space-y-2">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="w-8 h-8 text-red-400" strokeWidth={3} />
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              >
                <ChevronDown className="w-8 h-8 text-orange-400" strokeWidth={3} />
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              >
                <ChevronDown className="w-8 h-8 text-amber-400" strokeWidth={3} />
              </motion.div>
            </div>
          </div>
          
          {/* Pulse effect behind */}
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-red-500/40"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </section>
  );
}
