import { Link } from "react-router-dom";
import { ArrowRight, Users, FileText, Globe, ChevronDown, Sparkles, MessageCircle, Play } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Animated counter with easing
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;
    
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Glowing orb component
function GlowOrb({ className, color, delay = 0 }: { className: string; color: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{ background: color }}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

export function HeroSection() {
  const [stats, setStats] = useState({ players: 0, reports: 0, competitions: 0 });
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);
  const textOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [playersRes, reportsRes, competitionsRes] = await Promise.all([
          supabase.from("players").select("id", { count: "exact", head: true }).eq("is_public", true),
          supabase.from("scouting_reports").select("id", { count: "exact", head: true }),
          supabase.from("competitions").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        
        setStats({
          players: playersRes.count || 6,
          reports: reportsRes.count || 5,
          competitions: competitionsRes.count || 100,
        });
      } catch {
        setStats({ players: 6, reports: 5, competitions: 100 });
      }
    }
    fetchStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Animated Background Orbs */}
      <motion.div className="absolute inset-0 overflow-hidden" style={{ y }}>
        <GlowOrb 
          className="w-[600px] h-[600px] -top-40 -left-40" 
          color="radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)" 
          delay={0}
        />
        <GlowOrb 
          className="w-[500px] h-[500px] top-1/2 -right-40" 
          color="radial-gradient(circle, rgba(251, 146, 60, 0.2) 0%, transparent 70%)" 
          delay={2}
        />
        <GlowOrb 
          className="w-[400px] h-[400px] bottom-20 left-1/3" 
          color="radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)" 
          delay={4}
        />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
      </motion.div>

      {/* Main Content */}
      <motion.div 
        className="container mx-auto px-4 sm:px-6 relative z-10 pt-24 pb-32"
        style={{ opacity: textOpacity }}
      >
        <div className="max-w-6xl mx-auto text-center">
          
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-red-500/5 via-orange-500/5 to-amber-500/5 border border-white/10 backdrop-blur-md hover:border-red-500/30 transition-all duration-500 cursor-default">
              {/* Animated pulse ring */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-red-500 to-orange-500" />
              </span>
              
              <span className="text-sm font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                Football Intelligence System
              </span>
              
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            </div>
          </motion.div>

          {/* Main Headline */}
          <div className="mb-10 overflow-hidden">
            <motion.h1 
              className="text-[3.5rem] sm:text-[5rem] md:text-[6.5rem] lg:text-[8rem] font-black tracking-[-0.03em] leading-[0.85]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.span 
                className="block text-white"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                FOOTBALL
              </motion.span>
              <motion.span 
                className="block text-white"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
              >
                INTELLIGENCE.
              </motion.span>
              <motion.span 
                className="block relative"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              >
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(239,68,68,0.3)]">
                  NOT OPINION.
                </span>
              </motion.span>
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-14 leading-relaxed font-light"
          >
            Dados reais, leitura humana e decisão profissional.
            <br className="hidden sm:block" />
            <span className="text-white font-normal">Conectamos atletas, clubes e oportunidades reais.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-20"
          >
            {/* Primary CTA */}
            <Link to="/players" className="group">
              <motion.button
                className="relative w-full sm:w-auto h-16 px-10 rounded-2xl font-bold text-lg text-white overflow-hidden"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Gradient background */}
                <span className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 transition-all duration-500" />
                
                {/* Hover glow */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
                
                {/* Shine effect */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700">
                  <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </span>
                
                {/* Shadow */}
                <span className="absolute inset-0 shadow-[0_10px_40px_-10px_rgba(239,68,68,0.5)] group-hover:shadow-[0_20px_60px_-10px_rgba(239,68,68,0.6)] transition-shadow duration-500" />
                
                {/* Content */}
                <span className="relative flex items-center justify-center gap-3">
                  <Play className="w-5 h-5 fill-current" />
                  <span>Ver Atletas</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </span>
              </motion.button>
            </Link>

            {/* Secondary CTA */}
            <Link to="/contact" className="group">
              <motion.button
                className="relative w-full sm:w-auto h-16 px-10 rounded-2xl font-bold text-lg overflow-hidden"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Glass background */}
                <span className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl group-hover:border-white/20 group-hover:bg-white/10 transition-all duration-300" />
                
                {/* Content */}
                <span className="relative flex items-center justify-center gap-3 text-white">
                  <MessageCircle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Falar com a M3</span>
                </span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Live Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-0 px-6 sm:px-8 py-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm"
          >
            {/* System Status */}
            <div className="flex items-center gap-3 px-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-sm font-semibold text-emerald-400">Sistema ativo</span>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10" />

            {/* Stats */}
            <div className="flex items-center gap-6 sm:gap-8 px-4">
              <motion.div 
                className="flex items-center gap-2.5 group cursor-default"
                whileHover={{ scale: 1.05 }}
              >
                <div className="p-1.5 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                  <Users className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white tabular-nums">
                    <AnimatedCounter end={stats.players} />
                  </span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">atletas</span>
                </div>
              </motion.div>

              <motion.div 
                className="flex items-center gap-2.5 group cursor-default"
                whileHover={{ scale: 1.05 }}
              >
                <div className="p-1.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <FileText className="w-4 h-4 text-orange-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white tabular-nums">
                    <AnimatedCounter end={stats.reports} />
                  </span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">relatórios</span>
                </div>
              </motion.div>

              <motion.div 
                className="flex items-center gap-2.5 group cursor-default"
                whileHover={{ scale: 1.05 }}
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <Globe className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-white tabular-nums">
                    <AnimatedCounter end={stats.competitions} suffix="+" />
                  </span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">competições</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator - Highly Visible */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <motion.button
          className="group relative flex flex-col items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 backdrop-blur-md hover:border-red-500/40 hover:from-red-500/10 hover:to-orange-500/5 transition-all duration-500"
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
        >
          {/* Glow effect */}
          <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-red-500/20 to-transparent blur-xl" />
          
          {/* Text */}
          <span className="relative text-sm font-semibold tracking-wide text-white/90 group-hover:text-white transition-colors">
            Descubra nossos atletas
          </span>
          
          {/* Animated arrows */}
          <div className="relative flex flex-col items-center -space-y-1">
            <motion.div
              animate={{ y: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-5 h-5 text-red-400" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 4, 0], opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            >
              <ChevronDown className="w-5 h-5 text-orange-400" />
            </motion.div>
          </div>
          
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-red-500/30 pointer-events-none" style={{ animationDuration: '2s' }} />
        </motion.button>
      </motion.div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pointer-events-none" />
    </section>
  );
}
