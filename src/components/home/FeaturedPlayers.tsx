import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMAGE OPTIMIZATION HELPER
// For mobile retina displays (DPR 2-3), we need larger images to avoid blur
// Mobile card ~420px CSS width × DPR 3 = 1260px minimum, we use 1600-1800px
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculates the optimal image width based on target CSS width and device pixel ratio.
 * Clamps between 1200-1800px to ensure sharpness on mobile retina without excessive size.
 */
function getPlayerPhotoUrl(photoUrl: string, targetCssWidthPx: number): string {
  // Get device pixel ratio (default to 2 for SSR safety)
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;
  
  // Calculate required width and clamp between 1200-1800
  let reqWidth = Math.ceil(targetCssWidthPx * dpr);
  reqWidth = Math.max(1200, Math.min(reqWidth, 1800));
  
  // Add Supabase transform params
  const separator = photoUrl.includes("?") ? "&" : "?";
  return `${photoUrl}${separator}width=${reqWidth}&quality=90`;
}

/**
 * Returns optimized image props for athlete cards.
 * Mobile: Uses 1600-1800px for retina sharpness
 * Desktop: Uses 1200px for faster loading
 */
function getOptimizedImageProps(photoUrl: string | null, isMobile: boolean = false) {
  const fallback = "/placeholder.svg";
  if (!photoUrl) return { src: fallback, srcSet: undefined, sizes: undefined };
  
  // Check if it's a Supabase storage URL that supports transforms
  const isSupabaseStorage = photoUrl.includes("supabase") && photoUrl.includes("/storage/");
  
  if (isSupabaseStorage) {
    // Mobile cards are ~420px wide, need higher resolution for DPR 3
    // Desktop cards are ~300-400px, 1200px is sufficient
    const mobileWidth = 1800; // Sharp on iPhone (420px × 3 DPR = 1260px needed)
    const desktopWidth = 1200;
    
    const getTransformUrl = (w: number) => {
      const separator = photoUrl.includes("?") ? "&" : "?";
      return `${photoUrl}${separator}width=${w}&quality=90`;
    };
    
    if (isMobile) {
      // Mobile: serve 1800px directly, no srcSet complexity
      return {
        src: getTransformUrl(mobileWidth),
        srcSet: `${getTransformUrl(1200)} 1200w, ${getTransformUrl(1600)} 1600w, ${getTransformUrl(mobileWidth)} 1800w`,
        sizes: "100vw",
      };
    }
    
    // Desktop: srcSet with smaller sizes
    return {
      src: getTransformUrl(desktopWidth),
      srcSet: `${getTransformUrl(800)} 800w, ${getTransformUrl(desktopWidth)} 1200w, ${getTransformUrl(1600)} 1600w`,
      sizes: "(max-width: 1024px) 50vw, 400px",
    };
  }
  
  // For external URLs (like Unsplash), they often support similar transforms
  if (photoUrl.includes("unsplash.com")) {
    const width = isMobile ? 1800 : 1200;
    
    const getUnsplashUrl = (w: number) => {
      const baseUrl = photoUrl.split("?")[0];
      return `${baseUrl}?w=${w}&q=90&fit=crop&auto=format`;
    };
    
    if (isMobile) {
      return {
        src: getUnsplashUrl(1800),
        srcSet: `${getUnsplashUrl(1200)} 1200w, ${getUnsplashUrl(1600)} 1600w, ${getUnsplashUrl(1800)} 1800w`,
        sizes: "100vw",
      };
    }
    
    return {
      src: getUnsplashUrl(width),
      srcSet: `${getUnsplashUrl(800)} 800w, ${getUnsplashUrl(1200)} 1200w, ${getUnsplashUrl(1600)} 1600w`,
      sizes: "(max-width: 1024px) 50vw, 400px",
    };
  }
  
  // For other URLs, return as-is
  return { 
    src: photoUrl, 
    srcSet: undefined, 
    sizes: isMobile ? "100vw" : "(max-width: 1024px) 50vw, 400px" 
  };
}

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
function PlayerCardPremium({ player, isMobile }: { player: Player; isMobile: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get optimized image props - mobile uses 1800px for retina sharpness
  const imageProps = getOptimizedImageProps(player.photo_url, isMobile);

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
            src={imageProps.src}
            srcSet={imageProps.srcSet}
            sizes={imageProps.sizes}
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

          {/* Status Badge - Top Right (hide on iPad/tablet) */}
          <div className="absolute top-4 right-4 tablet:hidden tablet-landscape:hidden">
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
function PlayerCardScout({ player, isMobile }: { player: Player; isMobile: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get optimized image props - mobile uses 1800px for retina sharpness
  const imageProps = getOptimizedImageProps(player.photo_url, isMobile);

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
            src={imageProps.src}
            srcSet={imageProps.srcSet}
            sizes={imageProps.sizes}
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

          {/* Status Badge - Top Right (hide on iPad/tablet) */}
          <div className="absolute top-4 right-4 tablet:hidden tablet-landscape:hidden">
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
          <CardComponent player={player} isMobile={false} />
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
    // Scroll exactly 1 full card width
    const scrollAmount = containerRef.current.clientWidth;
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="md:hidden relative">
      {/* Scroll Container — 1 card at a time, no peek */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            className="flex-shrink-0 w-full px-4"
            style={{ scrollSnapAlign: "start" }}
            variants={cardVariants}
            custom={index}
          >
            <CardComponent player={player} isMobile={true} />
          </motion.div>
        ))}
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
// Cache configuration for instant cold-start renders
const PLAYERS_CACHE_KEY = "m3_featured_players_v1";
const PLAYERS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedPlayers {
  players: Player[];
  fetchedAt: number;
}

function readPlayersCache(): Player[] | null {
  try {
    const raw = localStorage.getItem(PLAYERS_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedPlayers = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > PLAYERS_CACHE_TTL_MS) {
      localStorage.removeItem(PLAYERS_CACHE_KEY);
      return null;
    }
    return parsed.players;
  } catch {
    return null;
  }
}

function writePlayersCache(players: Player[]) {
  try {
    const payload: CachedPlayers = { players, fetchedAt: Date.now() };
    localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function FeaturedPlayers() {
  // PERFORMANCE: Add mount timing
  useEffect(() => {
    if (import.meta.env.DEV) {
      const appStart = (window as any).__APP_MOUNT_START ?? performance.now();
      console.log("[TIMING] FeaturedPlayers mounted", {
        sinceAppMount: `${Math.round(performance.now() - appStart)}ms`
      });
    }
  }, []);

  // INSTANT: Try cache first for immediate render on cold start
  const cachedPlayers = useRef(readPlayersCache());
  const [players, setPlayers] = useState<Player[]>(cachedPlayers.current || []);
  const [loading, setLoading] = useState(!cachedPlayers.current);
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
      if (import.meta.env.DEV) console.log("[TIMING] FeaturedPlayers fetch start");
      const fetchStart = performance.now();
      
      const { data } = await supabase
        .from("players")
        .select("id, slug, full_name, position, age, nationality, current_club, photo_url, auto_rating, dominant_foot")
        .eq("is_public", true)
        .not("auto_rating", "is", null)
        .order("auto_rating", { ascending: false })
        .limit(8);

      if (data && data.length > 0) {
        setPlayers(data);
        writePlayersCache(data);
      }
      setLoading(false);
      
      if (import.meta.env.DEV) {
        console.log("[TIMING] FeaturedPlayers fetch complete", { 
          duration: `${Math.round(performance.now() - fetchStart)}ms`,
          count: data?.length ?? 0,
          fromCache: cachedPlayers.current !== null
        });
      }
    };

    fetchPlayers();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-12 md:py-16 lg:py-20 overflow-hidden"
      style={{ backgroundColor: "#070910" }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header - Compact */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 md:mb-8 px-5 md:px-6 lg:px-8"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div variants={headerVariants} className="space-y-1">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white uppercase">
              ATLETAS
            </h2>
            <p className="text-white/40 text-xs md:text-sm font-medium tracking-wide">
              Talentos monitorados pela M3
            </p>
          </motion.div>

          <motion.div variants={headerVariants}>
            <Link
              to="/players"
              className="group inline-flex items-center gap-1.5 text-white/40 hover:text-white transition-colors duration-300 text-xs font-semibold tracking-wide"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Players Display - PROGRESSIVE: show skeletons or cached data immediately */}
        {players.length > 0 ? (
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <DesktopGrid players={players} variant={variant} />
            <MobileCarousel players={players} variant={variant} />
          </motion.div>
        ) : loading ? (
          // SKELETON: show placeholder grid while loading (no spinner)
          <div className="px-5 md:px-6 lg:px-8">
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] bg-white/[0.03] animate-pulse rounded-lg"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
            <div className="md:hidden flex gap-3 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[160px] aspect-[3/4] bg-white/[0.03] animate-pulse rounded-lg"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
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
