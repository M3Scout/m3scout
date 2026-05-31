import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";

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
  return `${photoUrl}${separator}width=${reqWidth}&quality=85&format=avif`;
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
      return `${baseUrl}?w=${w}&q=85&fit=crop&auto=format&fm=avif`;
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

// Player interface
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
// PREMIUM CAROUSEL CARD - Position-based colors
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CarouselCard({ player, isMobile }: { player: Player; isMobile: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get position-based colors from centralized system
  const posColors = getPositionColor(player.position);
  const shortPos = getShortPosition(player.position);
  
  // Get optimized image props - mobile uses 1800px for retina sharpness
  const imageProps = getOptimizedImageProps(player.photo_url, isMobile);

  return (
    <Link
      to={`/players/${player.slug}`}
      className="group block h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article 
        className="relative overflow-hidden rounded-xl h-full"
        style={{
          background: "linear-gradient(180deg, #14161c 0%, #0c0e12 100%)",
          boxShadow: isHovered 
            ? `0 20px 60px -15px rgba(0,0,0,0.7), 0 0 30px -10px hsl(${posColors.color} / 0.3)` 
            : "0 8px 30px -10px rgba(0,0,0,0.4)",
        }}
        animate={{ 
          scale: isHovered ? 1.02 : 1,
          y: isHovered ? -4 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Accent top border - Position color */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 z-10"
          style={{ 
            background: `linear-gradient(90deg, hsl(${posColors.color}), hsl(${posColors.color} / 0.5), transparent)`,
          }}
        />

        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.img
            src={imageProps.src}
            srcSet={imageProps.srcSet}
            sizes={imageProps.sizes}
            alt={player.full_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* Clean bottom gradient only - no side shadows */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, 
                transparent 0%, 
                transparent 45%, 
                rgba(10, 12, 18, 0.6) 70%, 
                rgba(10, 12, 18, 0.95) 100%)`,
            }}
          />

          {/* Position Badge - Top Left, Position color */}
          <div className="absolute top-4 left-4 z-10">
            <div 
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border"
              style={{ 
                background: `hsl(${posColors.color} / 0.15)`,
                borderColor: `hsl(${posColors.color} / 0.3)`,
                backdropFilter: "blur(8px)",
              }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: `hsl(${posColors.color})` }} />
              <span 
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: `hsl(${posColors.color})` }}
              >
                {shortPos}
              </span>
            </div>
          </div>

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            {/* Name - Pure white */}
            <h3 className="text-white font-bold text-xl tracking-tight mb-2 line-clamp-1 drop-shadow-md">
              {player.full_name}
            </h3>

            {/* Age & Country - Light gray */}
            <p className="text-zinc-300 text-sm font-medium tracking-wide mb-1.5">
              {player.age ? `${player.age} anos` : "—"}
              <span className="mx-2 text-zinc-500">•</span>
              {player.nationality}
            </p>

            {/* Club - Muted */}
            {player.current_club && (
              <p className="text-zinc-400 text-xs uppercase tracking-[0.1em] line-clamp-1 mb-4">
                {player.current_club}
              </p>
            )}

            {/* Hover CTA - Position color accent */}
            <motion.div
              className="flex items-center gap-2 pt-3 border-t"
              style={{ borderColor: `hsl(${posColors.color} / 0.2)` }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <span 
                className="text-sm font-semibold tracking-wide"
                style={{ color: `hsl(${posColors.color})` }}
              >
                Ver perfil completo
              </span>
              <ArrowRight className="w-4 h-4" style={{ color: `hsl(${posColors.color})` }} />
            </motion.div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIVERSAL CAROUSEL - Works on both desktop and mobile
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UniversalCarousel({ players }: { players: Player[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const isMobile = useIsMobile();

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
    // Scroll by card width + gap
    const cardWidth = isMobile ? containerRef.current.clientWidth * 0.85 : 320;
    containerRef.current.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mobile: calculate full-width card size (100vw - 2*gutter)
  // Gutter is 16px on mobile (1rem), so card = 100vw - 32px
  const mobileCardWidth = "calc(100vw - 32px)";
  const mobileGap = 16; // gap between cards

  return (
    <div className="relative">
      {/* Scroll Container */}
      <div
        ref={containerRef}
        className={cn(
          "flex overflow-x-auto scrollbar-hide scroll-smooth pb-4",
          isDragging && "cursor-grabbing select-none"
        )}
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          cursor: isDragging ? "grabbing" : "grab",
          gap: isMobile ? `${mobileGap}px` : "20px",
          // Mobile: scroll-padding matches container gutter so cards center
          scrollPaddingLeft: isMobile ? "16px" : undefined,
          scrollPaddingRight: isMobile ? "16px" : undefined,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            className="flex-shrink-0"
            style={{ 
              // Mobile: full-width cards (no peek of next card)
              // Desktop: fixed widths
              width: isMobile ? mobileCardWidth : undefined,
              scrollSnapAlign: "start",
            }}
            // Desktop only: use class-based widths
            {...(!isMobile && { className: "flex-shrink-0 sm:w-[60vw] md:w-[320px] lg:w-[300px]" })}
            variants={cardVariants}
            custom={index}
          >
            <CarouselCard player={player} isMobile={isMobile} />
          </motion.div>
        ))}
        {/* End spacer for last card alignment */}
        <div className="flex-shrink-0" style={{ width: isMobile ? "16px" : "16px" }} />
      </div>

      {/* Left fade gradient - Desktop only */}
      <div
        className={cn(
          "hidden md:block absolute left-0 top-0 bottom-4 w-20 pointer-events-none transition-opacity duration-300 z-10",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
        style={{ background: 'linear-gradient(to right, var(--bg-base), transparent)' }}
      />

      {/* Right fade gradient - Desktop only */}
      <div
        className={cn(
          "hidden md:block absolute right-0 top-0 bottom-4 w-20 pointer-events-none transition-opacity duration-300 z-10",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
        style={{ background: 'linear-gradient(to left, var(--bg-base), transparent)' }}
      />

      {/* Navigation arrows - Desktop only */}
      <button
        onClick={() => scroll("left")}
        className={cn(
          "hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center z-20 transition-all duration-300",
          "bg-white/10 backdrop-blur-md border border-white/20",
          "hover:bg-white/20 hover:scale-110 hover:border-white/30",
          "text-white/70 hover:text-white",
          !canScrollLeft && "opacity-0 pointer-events-none"
        )}
        aria-label="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={() => scroll("right")}
        className={cn(
          "hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center z-20 transition-all duration-300",
          "bg-white/10 backdrop-blur-md border border-white/20",
          "hover:bg-white/20 hover:scale-110 hover:border-white/30",
          "text-white/70 hover:text-white",
          !canScrollRight && "opacity-0 pointer-events-none"
        )}
        aria-label="Próximo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Mobile: scroll indicators (dots) */}
      <div className="flex md:hidden justify-center gap-2 mt-4">
        {players.slice(0, Math.min(players.length, 6)).map((_, i) => (
          <div 
            key={i}
            className="w-2 h-2 rounded-full bg-white/25"
          />
        ))}
      </div>
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
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>

      {/* Container with unified max-width - matches header */}
      <div className="relative w-full mx-auto" style={{ maxWidth: 'var(--page-max-width)', paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
        {/* Section Header - Compact */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 md:mb-8"
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

        {/* Players Carousel - Premium horizontal scroll */}
        {players.length > 0 ? (
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <UniversalCarousel players={players} />
          </motion.div>
        ) : loading ? (
          // SKELETON: show placeholder grid while loading (no spinner)
          <div>
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

export default FeaturedPlayers;
