import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { safeArray, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Get color classes based on global score (0-5)
function getScoreColorClasses(score: number): { text: string; bg: string; glow: string } {
  if (score >= 4.0) {
    return { 
      text: "text-emerald-400", 
      bg: "bg-emerald-500/20 border-emerald-500/40",
      glow: "shadow-emerald-500/30"
    };
  }
  if (score >= 3.0) {
    return { 
      text: "text-green-400", 
      bg: "bg-green-500/20 border-green-500/40",
      glow: "shadow-green-500/30"
    };
  }
  if (score >= 2.0) {
    return { 
      text: "text-amber-400", 
      bg: "bg-amber-500/20 border-amber-500/40",
      glow: "shadow-amber-500/30"
    };
  }
  return { 
    text: "text-red-400", 
    bg: "bg-red-500/20 border-red-500/40",
    glow: "shadow-red-500/30"
  };
}

// Get position color
function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    GK: "bg-amber-500",
    CB: "bg-blue-500",
    LB: "bg-sky-500",
    RB: "bg-sky-500",
    CDM: "bg-green-600",
    CM: "bg-green-500",
    CAM: "bg-emerald-500",
    LM: "bg-teal-500",
    RM: "bg-teal-500",
    LW: "bg-purple-500",
    RW: "bg-purple-500",
    CF: "bg-rose-500",
    ST: "bg-red-500",
  };
  return colors[position] || "bg-zinc-500";
}

// Position labels
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
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.9,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.6,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
    },
  },
};

// Individual card component with scouting focus
function PlayerCard({ player }: { player: Player }) {
  const score = player.auto_rating ?? 0;
  const scoreColors = getScoreColorClasses(score);
  
  return (
    <motion.div variants={cardVariants}>
      <Link
        to={`/players/${player.slug}`}
        className="group block"
      >
        <article 
          className={cn(
            "relative overflow-hidden rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-white/5 transition-all duration-500",
            "hover:border-white/20 hover:shadow-2xl hover:shadow-black/50",
            "hover:-translate-y-2"
          )}
        >
          {/* Image Container with gradient overlay */}
          <div className="relative aspect-[3/4] overflow-hidden">
            <img
              src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
              alt={player.full_name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/50" />
            
            {/* Hover glow effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
            
            {/* Position Badge - Top Left */}
            <div className="absolute top-3 left-3">
              <motion.span 
                className={cn(
                  "inline-flex items-center justify-center w-10 h-10 rounded-lg text-white text-xs font-bold uppercase shadow-lg",
                  getPositionColor(player.position)
                )}
                whileHover={{ scale: 1.1 }}
              >
                {positionLabels[player.position] || player.position}
              </motion.span>
            </div>
            
            {/* Global Score Badge - Top Right */}
            <div className="absolute top-3 right-3">
              <motion.div 
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg",
                  scoreColors.bg,
                  scoreColors.glow
                )}
                whileHover={{ scale: 1.05 }}
              >
                <Star className={cn("w-4 h-4 fill-current", scoreColors.text)} />
                <span className={cn("font-bold text-sm", scoreColors.text)}>
                  {score.toFixed(1)}
                </span>
              </motion.div>
            </div>
            
            {/* Player Info - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-bold text-lg md:text-xl tracking-wide uppercase mb-1.5 drop-shadow-lg line-clamp-1">
                {player.full_name}
              </h3>
              
              <p className="text-white/70 text-sm font-medium mb-1">
                {player.age ? `${player.age} anos` : "—"} · {player.nationality}
              </p>
              
              {player.current_club && (
                <p className="text-white/50 text-xs uppercase tracking-wide line-clamp-1">
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

// Carousel component for mobile
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
  
  // Auto-play carousel
  useEffect(() => {
    if (!isPaused && players.length > 1) {
      intervalRef.current = setInterval(nextSlide, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, nextSlide, players.length]);
  
  if (players.length === 0) return null;
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      {/* Carousel Container */}
      <div className="overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4 
            }}
            className="w-full"
          >
            <Link
              to={`/players/${players[currentIndex].slug}`}
              className="group block"
            >
              <article className="relative overflow-hidden rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-white/5">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={players[currentIndex].photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                    alt={players[currentIndex].full_name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  {/* Position Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-xl text-white text-sm font-bold uppercase shadow-lg",
                      getPositionColor(players[currentIndex].position)
                    )}>
                      {positionLabels[players[currentIndex].position] || players[currentIndex].position}
                    </span>
                  </div>
                  
                  {/* Score Badge */}
                  <div className="absolute top-4 right-4">
                    {(() => {
                      const score = players[currentIndex].auto_rating ?? 0;
                      const colors = getScoreColorClasses(score);
                      return (
                        <div className={cn(
                          "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg",
                          colors.bg,
                          colors.glow
                        )}>
                          <Star className={cn("w-5 h-5 fill-current", colors.text)} />
                          <span className={cn("font-bold text-lg", colors.text)}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Player Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-white font-bold text-2xl tracking-wide uppercase mb-2 drop-shadow-lg">
                      {players[currentIndex].full_name}
                    </h3>
                    <p className="text-white/70 text-base font-medium mb-1">
                      {players[currentIndex].age ? `${players[currentIndex].age} anos` : "—"} · {players[currentIndex].nationality}
                    </p>
                    {players[currentIndex].current_club && (
                      <p className="text-white/50 text-sm uppercase tracking-wide">
                        {players[currentIndex].current_club}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation Arrows */}
      {players.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {/* Dots Indicator */}
      {players.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {players.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "bg-white w-6" 
                  : "bg-white/30 hover:bg-white/50"
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

  // Intersection observer for section visibility
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
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-zinc-900/30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div variants={headerVariants}>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-none mb-2">
              ATLETAS
            </h2>
            <p className="text-white/50 text-sm md:text-base uppercase tracking-widest font-medium">
              Top avaliados no scouting
            </p>
          </motion.div>
          
          <motion.div variants={headerVariants}>
            <Link 
              to="/players"
              className="group inline-flex items-center gap-3 text-white/70 hover:text-white transition-colors duration-300 uppercase tracking-widest text-sm font-medium"
            >
              <span className="relative">
                Ver Todos
                <span className="absolute bottom-0 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Players Grid / Carousel */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-white/50" />
            </motion.div>
          </div>
        ) : players.length > 0 ? (
          <>
            {/* Mobile: Auto-playing Carousel */}
            <div className="md:hidden">
              <MobileCarousel players={players} />
            </div>
            
            {/* Desktop: Animated Grid */}
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
            <p className="text-white/40 uppercase tracking-wider text-sm">
              Nenhum atleta avaliado disponível no momento.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
