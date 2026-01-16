import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { safeArray, cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
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

// Premium player card
function PlayerCard({ player }: { player: Player }) {
  return (
    <Link
      to={`/players/${player.slug}`}
      className="group block flex-shrink-0 w-[280px] md:w-[320px] lg:w-[340px]"
    >
      <article className="relative overflow-hidden rounded-2xl bg-zinc-900/60 transition-all duration-500 hover:shadow-2xl hover:shadow-white/5">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
            alt={player.full_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          />
          
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Position Badge - Solid blue pill */}
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
              {positionLabels[player.position] || player.position}
            </span>
          </div>
          
          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Player Name - Primary element */}
            <h3 className="text-white font-bold text-xl md:text-2xl tracking-wide mb-2 line-clamp-1 drop-shadow-lg">
              {player.full_name}
            </h3>
            
            {/* Secondary info */}
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
  );
}

// Drag carousel component
function DragCarousel({ players }: { players: Player[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  
  const checkScrollPosition = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    
    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [players]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 360;
    containerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };
  
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setTimeout(() => setIsDragging(false), 100);
  };
  
  return (
    <div className="relative group/carousel">
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8 cursor-grab active:cursor-grabbing"
        style={{ scrollSnapType: 'x mandatory' }}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {players.map((player, index) => (
          <motion.div 
            key={player.id}
            className="scroll-snap-align-start"
            style={{ scrollSnapAlign: 'start' }}
            variants={cardVariants}
            onClick={(e) => {
              if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <PlayerCard player={player} />
          </motion.div>
        ))}
        {/* Spacer for last card visibility */}
        <div className="flex-shrink-0 w-4 md:w-8" />
      </div>
      
      {/* Fade edges */}
      <div className={cn(
        "absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none transition-opacity duration-300",
        canScrollLeft ? "opacity-100" : "opacity-0"
      )} />
      <div className={cn(
        "absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none transition-opacity duration-300",
        canScrollRight ? "opacity-100" : "opacity-0"
      )} />
      
      {/* Navigation arrows - Discrete, show on hover */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100",
          !canScrollLeft && "!opacity-0 pointer-events-none"
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all duration-300 opacity-0 group-hover/carousel:opacity-100",
          !canScrollRight && "!opacity-0 pointer-events-none"
        )}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
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
      const { data } = await supabase
        .from("players")
        .select("id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating")
        .eq("is_public", true)
        .not("auto_rating", "is", null)
        .order("auto_rating", { ascending: false })
        .limit(8);

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
      className="relative bg-black py-16 md:py-24 overflow-hidden"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-transparent to-zinc-900/20 pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 px-6 lg:px-8"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div variants={headerVariants}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase leading-none">
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

        {/* Players Carousel */}
        {loading ? (
          <div className="flex items-center justify-center py-24 px-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-6 h-6 text-white/30" />
            </motion.div>
          </div>
        ) : players.length > 0 ? (
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <DragCarousel players={players} />
          </motion.div>
        ) : (
          <motion.div 
            className="text-center py-24 px-6"
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
