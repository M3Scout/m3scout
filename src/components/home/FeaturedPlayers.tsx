import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import { safeArray } from "@/lib/utils";

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[];
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
}

// Map position codes to display names
const positionLabels: Record<string, string> = {
  GK: "GOLEIRO",
  CB: "ZAGUEIRO",
  LB: "LATERAL ESQUERDO",
  RB: "LATERAL DIREITO",
  CDM: "VOLANTE",
  CM: "MEIO-CAMPO",
  CAM: "MEIA OFENSIVO",
  LM: "MEIA ESQUERDA",
  RM: "MEIA DIREITA",
  LW: "PONTA ESQUERDA",
  RW: "PONTA DIREITA",
  CF: "SEGUNDO ATACANTE",
  ST: "ATACANTE",
};

export function FeaturedPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url")
        .eq("is_public", true)
        .limit(4)
        .order("created_at", { ascending: false });

      if (data) {
        setPlayers(data);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const getPositionLabel = (position: string) => {
    return positionLabels[position] || position;
  };

  return (
    <section className="relative bg-black py-24 md:py-32">
      {/* Gradient transition from hero */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            {/* Large uppercase title - editorial style */}
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white uppercase leading-none">
              ATLETAS
            </h2>
          </div>
          
          {/* Minimal "Ver Todos" button */}
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

        {/* Players Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {safeArray(players).map((player, index) => (
              <Link
                key={player.id}
                to={`/players/${player.slug}`}
                className="group block"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  opacity: 0,
                }}
              >
                {/* Card - No rounded corners */}
                <article className="relative overflow-hidden bg-neutral-900">
                  {/* Image Container */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {/* Player Image */}
                    <img
                      src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                      alt={player.full_name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Position Tag - Top left, minimal style */}
                    <div className="absolute top-0 left-0">
                      <span className="inline-block bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1.5">
                        {getPositionLabel(player.position)}
                      </span>
                    </div>
                  </div>

                  {/* Info Section - Below image, dark solid background */}
                  <div className="bg-neutral-900 p-4 md:p-5 border-t border-white/5">
                    {/* Player Name */}
                    <h3 className="text-white font-semibold text-base md:text-lg tracking-wide uppercase mb-2 group-hover:text-white/90 transition-colors">
                      {player.full_name}
                    </h3>
                    
                    {/* Age and Nationality */}
                    <p className="text-white/50 text-xs md:text-sm uppercase tracking-wider mb-1">
                      {player.age ? `${player.age} anos` : "—"} • {player.nationality}
                    </p>
                    
                    {/* Current Club */}
                    {player.current_club && (
                      <p className="text-white/40 text-xs uppercase tracking-wider">
                        {player.current_club}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-white/40 uppercase tracking-wider text-sm">
              Nenhum atleta disponível no momento.
            </p>
          </div>
        )}
      </div>

      {/* Custom animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
