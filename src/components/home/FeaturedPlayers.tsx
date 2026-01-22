import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Position labels - professional format
const positionLabels: Record<string, string> = {
  GK: "Goleiro",
  CB: "Zagueiro",
  LB: "Lateral Esquerdo",
  RB: "Lateral Direito",
  CDM: "Volante",
  CM: "Meio-Campo",
  CAM: "Meia Atacante",
  LM: "Meia Esquerda",
  RM: "Meia Direita",
  LW: "Ponta Esquerda",
  RW: "Ponta Direita",
  CF: "Segundo Atacante",
  ST: "Atacante",
};

// Position codes - compact
const positionCodes: Record<string, string> = {
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

// Foot labels
const footLabels: Record<string, string> = {
  right: "Direito",
  left: "Esquerdo",
  both: "Ambos",
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
  dominant_foot: string | null;
}

// Animation config
const sectionEasing = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: sectionEasing,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: sectionEasing,
    },
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT A — Premium Standard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PlayerCardPremium({ player }: { player: Player }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/players/${player.slug}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article className="relative overflow-hidden rounded-sm bg-[#0a0c12]">
        {/* Image Container - 70% of card */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.img
            src={player.photo_url || "/placeholder.svg"}
            alt={player.full_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
            animate={{ scale: isHovered ? 1.03 : 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          />

          {/* Premium gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/50 to-transparent transition-opacity duration-240",
              isHovered ? "opacity-95" : "opacity-85"
            )}
          />

          {/* Position Badge - Top Left */}
          <div className="absolute top-4 left-4">
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08]"
              style={{ 
                background: "rgba(7, 9, 16, 0.65)", 
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)"
              }}
            >
              <Zap className="w-3 h-3 text-white/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                {positionCodes[player.position] || player.position}
              </span>
            </div>
          </div>

          {/* Status Badge - Top Right */}
          <div className="absolute top-4 right-4">
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08]"
              style={{ 
                background: "rgba(7, 9, 16, 0.65)", 
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)"
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#1ED760" }}
              />
              <span 
                className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "#1ED760" }}
              >
                Monitorado
              </span>
            </div>
          </div>

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Name */}
            <h3 className="text-white font-semibold text-lg tracking-tight mb-1.5 line-clamp-1">
              {player.full_name}
            </h3>

            {/* Age & Country */}
            <p className="text-white/50 text-[13px] font-medium tracking-wide mb-1">
              {player.age ? `${player.age} anos` : "—"}
              <span className="mx-1.5 text-white/20">•</span>
              {player.nationality}
            </p>

            {/* Club */}
            {player.current_club && (
              <p className="text-white/30 text-[11px] uppercase tracking-[0.08em] line-clamp-1">
                {player.current_club}
              </p>
            )}

            {/* Hover CTA */}
            <motion.div
              className="flex items-center gap-1.5 mt-4 text-white/40 text-[11px] font-medium tracking-wide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <span>Ver perfil</span>
              <ArrowRight className="w-3 h-3" />
            </motion.div>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT B — Data-Driven / Scout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PlayerCardScout({ player }: { player: Player }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/players/${player.slug}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article className="relative overflow-hidden rounded-sm bg-[#0a0c12]">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.img
            src={player.photo_url || "/placeholder.svg"}
            alt={player.full_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
            animate={{ scale: isHovered ? 1.03 : 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          />

          {/* Premium gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/50 to-transparent transition-opacity duration-240",
              isHovered ? "opacity-95" : "opacity-85"
            )}
          />

          {/* Position Badge - Top Left */}
          <div className="absolute top-4 left-4">
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08]"
              style={{ 
                background: "rgba(7, 9, 16, 0.65)", 
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)"
              }}
            >
              <Zap className="w-3 h-3 text-white/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                {positionCodes[player.position] || player.position}
              </span>
            </div>
          </div>

          {/* Status Badge - Top Right */}
          <div className="absolute top-4 right-4">
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08]"
              style={{ 
                background: "rgba(7, 9, 16, 0.65)", 
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)"
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#1ED760" }}
              />
              <span 
                className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "#1ED760" }}
              >
                Monitorado
              </span>
            </div>
          </div>

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Name */}
            <h3 className="text-white font-semibold text-lg tracking-tight mb-1 line-clamp-1">
              {player.full_name}
            </h3>

            {/* Age & Country */}
            <p className="text-white/50 text-[13px] font-medium tracking-wide mb-3">
              {player.age ? `${player.age} anos` : "—"}
              <span className="mx-1.5 text-white/20">•</span>
              {player.nationality}
            </p>

            {/* Data Strip - Scout Quick Read */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06] text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
              <span className="text-white/60">
                POS: {positionCodes[player.position] || player.position}
              </span>
              <span className="w-px h-3 bg-white/10" />
              <span>
                Pé: {player.dominant_foot ? footLabels[player.dominant_foot] || player.dominant_foot : "—"}
              </span>
              <span className="w-px h-3 bg-white/10" />
              <span>
                {player.age ? `${player.age}a` : "—"}
              </span>
            </div>

            {/* Hover CTA */}
            <motion.div
              className="flex items-center gap-1.5 mt-3 text-white/40 text-[11px] font-medium tracking-wide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <span>Ver perfil</span>
              <ArrowRight className="w-3 h-3" />
            </motion.div>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESKTOP GRID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DesktopGrid({ players, variant }: { players: Player[]; variant: "premium" | "scout" }) {
  const CardComponent = variant === "scout" ? PlayerCardScout : PlayerCardPremium;

  return (
    <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 px-6 lg:px-8">
      {players.slice(0, 8).map((player, index) => (
        <motion.div
          key={player.id}
          variants={cardVariants}
          custom={index}
        >
          <CardComponent player={player} />
        </motion.div>
      ))}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOBILE CAROUSEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MobileCarousel({ players, variant }: { players: Player[]; variant: "premium" | "scout" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const CardComponent = variant === "scout" ? PlayerCardScout : PlayerCardPremium;

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
    container.addEventListener("scroll", checkScrollPosition);
    window.addEventListener("resize", checkScrollPosition);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, [players]);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const scrollAmount = 280;
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="md:hidden relative">
      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-5 pb-4"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            className="flex-shrink-0 w-[260px]"
            style={{ scrollSnapAlign: "start" }}
            variants={cardVariants}
            custom={index}
          >
            <CardComponent player={player} />
          </motion.div>
        ))}
        {/* End spacer */}
        <div className="flex-shrink-0 w-3" aria-hidden="true" />
      </div>

      {/* Left fade */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-[#070910] to-transparent pointer-events-none transition-opacity duration-300",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Right fade */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#070910] to-transparent pointer-events-none transition-opacity duration-300",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Navigation arrows */}
      <button
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 transition-all duration-200",
          !canScrollLeft && "opacity-0 pointer-events-none"
        )}
        aria-label="Anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 transition-all duration-200",
          !canScrollRight && "opacity-0 pointer-events-none"
        )}
        aria-label="Próximo"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function FeaturedPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // A/B variant - can be toggled via props or feature flag
  const variant: "premium" | "scout" = "scout";

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
        .select("id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating, dominant_foot")
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
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ backgroundColor: "#070910" }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 md:mb-14 px-5 md:px-6 lg:px-8"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div variants={headerVariants} className="space-y-2">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white uppercase">
              ATLETAS
            </h2>
            <p className="text-white/40 text-sm md:text-[15px] font-medium tracking-wide">
              Talentos monitorados pela M3
            </p>
          </motion.div>

          <motion.div variants={headerVariants}>
            <Link
              to="/players"
              className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-300 text-sm font-medium tracking-wide"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Players Display */}
        {loading ? (
          <div className="flex items-center justify-center py-24 px-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5 text-white/20" />
            </motion.div>
          </div>
        ) : players.length > 0 ? (
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <DesktopGrid players={players} variant={variant} />
            <MobileCarousel players={players} variant={variant} />
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
