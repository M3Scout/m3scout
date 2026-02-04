import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Users, FileText, Globe, ChevronDown, Sparkles, Zap, TrendingUp } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Animated counter component
function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}</span>;
}

// Floating particle component
function FloatingParticle({ delay, size, color, x, y }: { 
  delay: number; 
  size: number; 
  color: string;
  x: string;
  y: string;
}) {
  return (
    <motion.div
      className={`absolute rounded-full ${color} blur-sm`}
      style={{ width: size, height: size, left: x, top: y }}
      animate={{
        y: [0, -30, 0],
        opacity: [0.3, 0.8, 0.3],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 4,
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
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
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
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950">
      {/* Dynamic Background */}
      <motion.div 
        className="absolute inset-0"
        style={{ y: backgroundY }}
      >
        {/* Primary gradient orbs */}
        <motion.div 
          className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(251, 146, 60, 0.12) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 60%)",
          }}
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Floating particles */}
        <FloatingParticle delay={0} size={6} color="bg-red-500" x="10%" y="20%" />
        <FloatingParticle delay={0.5} size={4} color="bg-orange-500" x="85%" y="30%" />
        <FloatingParticle delay={1} size={8} color="bg-emerald-500" x="70%" y="70%" />
        <FloatingParticle delay={1.5} size={5} color="bg-red-400" x="20%" y="60%" />
        <FloatingParticle delay={2} size={6} color="bg-amber-500" x="50%" y="15%" />
        <FloatingParticle delay={2.5} size={4} color="bg-emerald-400" x="30%" y="80%" />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </motion.div>

      {/* Main Content */}
      <motion.div 
        className="container mx-auto px-4 relative z-10 py-20"
        style={{ opacity }}
      >
        <motion.div
          className="max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <motion.div 
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 border border-red-500/20 backdrop-blur-sm"
              whileHover={{ scale: 1.05, borderColor: "rgba(239, 68, 68, 0.4)" }}
              transition={{ duration: 0.2 }}
            >
              <motion.span 
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm font-semibold tracking-wide uppercase bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Football Intelligence System
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.div>
          </motion.div>

          {/* Main Heading */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]">
              <motion.span 
                className="block text-white mb-2"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                FOOTBALL
              </motion.span>
              <motion.span 
                className="block text-white mb-2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                INTELLIGENCE.
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.7, type: "spring" }}
              >
                NOT OPINION.
              </motion.span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-zinc-400 text-center max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Dados reais, leitura humana e decisão profissional.
            <br />
            <span className="text-zinc-300">Conectamos atletas, clubes e oportunidades reais.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link to="/players">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  size="lg"
                  className="group relative h-14 px-8 text-base font-semibold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-orange-500 border-0 shadow-lg shadow-red-500/25 transition-all duration-300"
                >
                  <motion.span
                    className="absolute inset-0 rounded-md bg-gradient-to-r from-red-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity"
                  />
                  Ver Atletas
                  <motion.div
                    className="ml-2"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>

            <Link to="/contact">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-base font-semibold bg-white/5 border-zinc-700 hover:bg-white/10 hover:border-zinc-500 backdrop-blur-sm transition-all duration-300"
                >
                  <Zap className="w-4 h-4 mr-2 text-amber-400" />
                  Falar com a M3
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Live Stats Bar */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm"
          >
            {/* System Active Indicator */}
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"
              animate={{ 
                borderColor: ["rgba(16, 185, 129, 0.2)", "rgba(16, 185, 129, 0.5)", "rgba(16, 185, 129, 0.2)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div 
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-emerald-400 font-medium">Sistema ativo</span>
            </motion.div>

            <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

            {/* Stats Items */}
            <motion.div 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default"
              whileHover={{ scale: 1.05 }}
            >
              <Users className="w-4 h-4 text-red-400" />
              <span className="font-bold text-white"><AnimatedCounter end={stats.players} /></span>
              <span>atletas monitorados</span>
            </motion.div>

            <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

            <motion.div 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default"
              whileHover={{ scale: 1.05 }}
            >
              <FileText className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-white"><AnimatedCounter end={stats.reports} /></span>
              <span>relatórios gerados</span>
            </motion.div>

            <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

            <motion.div 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default"
              whileHover={{ scale: 1.05 }}
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white"><AnimatedCounter end={stats.competitions} />+</span>
              <span>competições monitoradas</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2 cursor-pointer"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
        >
          <span className="text-xs text-zinc-500 uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        </motion.div>
      </motion.div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
    </section>
  );
}
