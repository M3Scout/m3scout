import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, Star } from "lucide-react";
import { safeArray, cn } from "@/lib/utils";

// Custom hook for intersection observer
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(element);
      }
    }, { threshold: 0.1, ...options });

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

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

// Individual card component with scouting focus
function PlayerCard({ player, index }: { player: Player; index: number }) {
  const { ref, isInView } = useInView();
  const score = player.auto_rating ?? 0;
  const scoreColors = getScoreColorClasses(score);
  
  return (
    <Link
      to={`/players/${player.slug}`}
      className="group block flex-shrink-0 w-[280px] md:w-auto"
      ref={ref as React.RefObject<HTMLAnchorElement>}
    >
      <article 
        className={cn(
          "relative overflow-hidden rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-white/5 transition-all duration-700",
          "hover:border-white/20 hover:shadow-xl hover:shadow-black/40",
          isInView 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-12"
        )}
        style={{ transitionDelay: `${index * 100}ms` }}
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
          
          {/* Position Badge - Top Left */}
          <div className="absolute top-3 left-3">
            <span className={cn(
              "inline-flex items-center justify-center w-10 h-10 rounded-lg text-white text-xs font-bold uppercase shadow-lg",
              getPositionColor(player.position)
            )}>
              {positionLabels[player.position] || player.position}
            </span>
          </div>
          
          {/* Global Score Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg",
              scoreColors.bg,
              scoreColors.glow
            )}>
              <Star className={cn("w-4 h-4 fill-current", scoreColors.text)} />
              <span className={cn("font-bold text-sm", scoreColors.text)}>
                {score.toFixed(1)}
              </span>
            </div>
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
  );
}

export function FeaturedPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      // Fetch top-rated public players ordered by auto_rating (global score)
      const { data, error } = await supabase
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
    <section className="relative bg-black py-20 md:py-28 overflow-hidden">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-zinc-900/30 pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-none mb-2">
              ATLETAS
            </h2>
            <p className="text-white/50 text-sm md:text-base uppercase tracking-widest font-medium">
              Top avaliados no scouting
            </p>
          </div>
          
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
        </div>

        {/* Players Grid / Scroll */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : players.length > 0 ? (
          <>
            {/* Mobile: Horizontal scroll */}
            <div className="md:hidden -mx-6 px-6">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {safeArray(players).map((player, index) => (
                  <div key={player.id} className="snap-start">
                    <PlayerCard player={player} index={index} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Desktop: Grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
              {safeArray(players).map((player, index) => (
                <PlayerCard key={player.id} player={player} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-white/40 uppercase tracking-wider text-sm">
              Nenhum atleta avaliado disponível no momento.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
