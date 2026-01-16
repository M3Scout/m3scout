import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { safeArray, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Get position color with low opacity for premium look
function getPositionStyle(position: string): { bg: string; text: string } {
  const styles: Record<string, { bg: string; text: string }> = {
    GK: { bg: "bg-amber-500/20", text: "text-amber-300" },
    CB: { bg: "bg-blue-500/20", text: "text-blue-300" },
    LB: { bg: "bg-sky-500/20", text: "text-sky-300" },
    RB: { bg: "bg-sky-500/20", text: "text-sky-300" },
    CDM: { bg: "bg-green-500/20", text: "text-green-300" },
    CM: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
    CAM: { bg: "bg-teal-500/20", text: "text-teal-300" },
    LM: { bg: "bg-cyan-500/20", text: "text-cyan-300" },
    RM: { bg: "bg-cyan-500/20", text: "text-cyan-300" },
    LW: { bg: "bg-purple-500/20", text: "text-purple-300" },
    RW: { bg: "bg-purple-500/20", text: "text-purple-300" },
    CF: { bg: "bg-rose-500/20", text: "text-rose-300" },
    ST: { bg: "bg-red-500/20", text: "text-red-300" },
  };
  return styles[position] || { bg: "bg-white/10", text: "text-white/70" };
}

// Position labels - compact
const positionLabels: Record<string, string> = {
  GK: "GOL",
  CB: "ZAG",
  LB: "LE",
  RB: "LD",
  CDM: "VOL",
  CM: "MC",
  CAM: "MEI",
  LM: "ME",
  RM: "MD",
  LW: "PE",
  RW: "PD",
  CF: "SA",
  ST: "ATA",
};

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
} as const;

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
    },
  },
};

// Premium player card - clean and minimal
function PlayerCard({ player }: { player: Player }) {
  const positionStyle = getPositionStyle(player.position);
  
  return (
    <motion.div variants={cardVariants}>
      <Link
        to={`/players/${player.slug}`}
        className="group block"
      >
        <article className="relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-white/5">
          {/* Image Container */}
          <div className="relative aspect-[3/4] overflow-hidden">
            <img
              src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
              alt={player.full_name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />
            
            {/* Premium gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
            
            {/* Subtle hover glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Position Badge - Refined, semi-transparent */}
            <div className="absolute top-4 left-4">
              <span className={cn(
                "inline-flex items-center justify-center px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 text-[11px] font-semibold uppercase tracking-wider",
                positionStyle.bg,
                positionStyle.text
              )}>
                {positionLabels[player.position] || player.position}
              </span>
            </div>
            
            {/* Player Info - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {/* Player Name - Primary element */}
              <h3 className="text-white font-bold text-xl md:text-2xl tracking-wide mb-2 line-clamp-1 drop-shadow-lg">
                {player.full_name}
              </h3>
              
              {/* Secondary info - Discrete */}
              <p className="text-white/60 text-sm font-medium tracking-wide">
                {player.age ? `${player.age} anos` : "—"} · {player.nationality}
              </p>
              
              {player.current_club && (
                <p className="text-white/40 text-xs uppercase tracking-wider mt-1 line-clamp-1">
                  {player.current_club}
                </p>
              )}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

// Mobile Carousel - Clean version
function MobileCarousel({ players }: { players: Player[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % players.length);
  }, [players.length]);
  
  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + players.length) % players.length);
  }, [players.length]);
  
  useEffect(() => {
    if (!isPaused && players.length > 1) {
      intervalRef.current = setInterval(nextSlide, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, nextSlide, players.length]);
  
  if (players.length === 0) return null;
  
  const currentPlayer = players[currentIndex];
  const positionStyle = getPositionStyle(currentPlayer.position);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
    >
      <div className="overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Link to={`/players/${currentPlayer.slug}`} className="group block">
              <article className="relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-sm">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={currentPlayer.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                    alt={currentPlayer.full_name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
                  
                  {/* Position Badge */}
                  <div className="absolute top-5 left-5">
                    <span className={cn(
                      "inline-flex items-center justify-center px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 text-xs font-semibold uppercase tracking-wider",
                      positionStyle.bg,
                      positionStyle.text
                    )}>
                      {positionLabels[currentPlayer.position] || currentPlayer.position}
                    </span>
                  </div>
                  
                  {/* Player Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white font-bold text-2xl tracking-wide mb-2 drop-shadow-lg">
                      {currentPlayer.full_name}
                    </h3>
                    <p className="text-white/60 text-base font-medium">
                      {currentPlayer.age ? `${currentPlayer.age} anos` : "—"} · {currentPlayer.nationality}
                    </p>
                    {currentPlayer.current_club && (
                      <p className="text-white/40 text-sm uppercase tracking-wider mt-1">
                        {currentPlayer.current_club}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation - Minimal */}
      {players.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {/* Dots - Refined */}
      {players.length > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {players.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "bg-white w-8" 
                  : "bg-white/20 w-1.5 hover:bg-white/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FeaturedPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      // Fetch top-rated players (criteria is technical, but not exposed visually)
      const { data } = await supabase
        .from("players")
        .select("id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating")
        .eq("is_public", true)
        .not("auto_rating", "is", null)
        .order("auto_rating", { ascending: false })
        .limit(6);

      if (data) {
        setPlayers(data);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative bg-black py-20 md:py-28 overflow-hidden"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/30 via-transparent to-zinc-900/20 pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header - Clean */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div variants={headerVariants}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-none">
              ATLETAS
            </h2>
          </motion.div>
          
          <motion.div variants={headerVariants}>
            <Link 
              to="/players"
              className="group inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-300 text-sm font-medium tracking-wide"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Players */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-6 h-6 text-white/30" />
            </motion.div>
          </div>
        ) : players.length > 0 ? (
          <>
            {/* Mobile: Carousel */}
            <div className="md:hidden">
              <MobileCarousel players={players} />
            </div>
            
            {/* Desktop: Grid */}
            <motion.div 
              className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={containerVariants}
            >
              {safeArray(players).map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </motion.div>
          </>
        ) : (
          <motion.div 
            className="text-center py-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-white/30 text-sm">
              Nenhum atleta disponível no momento.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
