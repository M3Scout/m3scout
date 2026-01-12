import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Ruler, 
  User, 
  Flag,
  Play,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { PublicStatsSection } from "@/components/players/sections/PublicStatsSection";
import { ScoreDisplay } from "@/components/players/ScoreDisplay";
import { formatFixed } from "@/lib/formatters";

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[];
  age: number | null;
  birth_date: string | null;
  nationality: string;
  current_club: string | null;
  height: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  bio_public: string | null;
  highlight_video_url: string | null;
  auto_rating: number | null;
  primary_tactical_role: string | null;
  play_style: string | null;
  strengths: string[] | null;
}

const PlayerProfile = () => {
  const { slug } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (data) {
        setPlayer(data);
      }
      setLoading(false);
    };

    fetchPlayer();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e52421]" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Atleta não encontrado</h1>
          <Link to="/players">
            <Button variant="outline">Voltar para atletas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Safe top offset for header - 80px header + 16px spacing */}
      <div className="pt-24 md:pt-28 lg:pt-32 pb-16 md:pb-20 lg:pb-24">
        {/* Centered container with max-width */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <Link 
            to="/players" 
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 md:mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm tracking-wide">Voltar para atletas</span>
          </Link>

          {/* Main Grid - Two columns on desktop */}
          <div className="grid lg:grid-cols-[1fr,1.1fr] gap-8 lg:gap-16 xl:gap-20">
            
            {/* ========== IMAGE COLUMN (LEFT) ========== */}
            <div className="relative">
              <div className="aspect-[3/4] overflow-hidden bg-zinc-950">
                <img
                  src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
                  alt={player.full_name}
                  className="w-full h-full object-cover"
                />
                {/* Subtle bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
              </div>
            </div>

            {/* ========== INFO COLUMN (RIGHT) ========== */}
            <div className="flex flex-col lg:py-4">
              
              {/* --- A) HEADER BLOCK --- */}
              <div className="mb-10 md:mb-12">
                {/* Position Tag */}
                <span className="inline-block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-3">
                  {player.position}
                </span>
                
                {/* Name + Score Row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                    {player.full_name}
                  </h1>
                  
                  {/* Score Badge */}
                  {player.auto_rating !== null && (
                    <div className="flex-shrink-0">
                      <ScoreDisplay score={player.auto_rating} size="lg" />
                    </div>
                  )}
                </div>

                {/* Secondary Positions */}
                {player.secondary_positions && player.secondary_positions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {player.secondary_positions.map((pos) => (
                      <span 
                        key={pos} 
                        className="text-[10px] uppercase tracking-widest text-zinc-600 border border-zinc-800 px-2 py-1"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* --- B) QUICK INFO GRID --- */}
              <div className="mb-10 md:mb-12">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Informações</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
                  {player.age && (
                    <div>
                      <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-widest">Idade</span>
                      </div>
                      <p className="text-white text-lg font-medium">{player.age} anos</p>
                    </div>
                  )}
                  
                  {player.height && (
                    <div>
                      <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                        <Ruler className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-widest">Altura</span>
                      </div>
                      <p className="text-white text-lg font-medium">{player.height} cm</p>
                    </div>
                  )}
                  
                  {player.dominant_foot && (
                    <div>
                      <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-widest">Pé</span>
                      </div>
                      <p className="text-white text-lg font-medium capitalize">{player.dominant_foot}</p>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                      <Flag className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-widest">País</span>
                    </div>
                    <p className="text-white text-lg font-medium">{player.nationality}</p>
                  </div>
                  
                  {player.current_club && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-widest">Clube</span>
                      </div>
                      <p className="text-white text-lg font-medium">{player.current_club}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* --- C) TACTICAL PROFILE --- */}
              {(player.primary_tactical_role || player.play_style || (player.strengths && player.strengths.length > 0)) && (
                <div className="mb-10 md:mb-12">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Perfil Tático</p>
                  
                  {/* Roles */}
                  {(player.primary_tactical_role || player.play_style) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {player.primary_tactical_role && (
                        <span className="text-xs text-white border border-zinc-700 px-3 py-1.5">
                          {player.primary_tactical_role}
                        </span>
                      )}
                      {player.play_style && (
                        <span className="text-xs text-zinc-400 border border-zinc-800 px-3 py-1.5">
                          {player.play_style}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Strengths */}
                  {player.strengths && player.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {player.strengths.slice(0, 5).map((s) => (
                        <span 
                          key={s} 
                          className="text-[11px] text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- D) BIO --- */}
              {player.bio_public && (
                <div className="mb-10 md:mb-12">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Sobre</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{player.bio_public}</p>
                </div>
              )}

              {/* --- E) CTA --- */}
              <div className="mt-auto pt-6">
                <Link to={`/contact?player=${player.slug}`}>
                  <Button 
                    className="w-full sm:w-auto bg-[#e52421] hover:bg-[#c91f1c] active:bg-[#b01b19] text-white font-medium px-8 py-3 h-auto shadow-none hover:shadow-none focus:shadow-none rounded-none border-none"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar com a M3 sobre este atleta
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* ========== STATS SECTION ========== */}
          <section className="mt-16 md:mt-20 lg:mt-24 pt-12 border-t border-zinc-900">
            <PublicStatsSection playerId={player.id} />
          </section>

          {/* ========== VIDEO SECTION ========== */}
          {player.highlight_video_url && (() => {
            const embedUrl = getYouTubeEmbedUrl(player.highlight_video_url);
            if (!embedUrl) return null;
            return (
              <section className="mt-16 md:mt-20 lg:mt-24">
                <div className="flex items-center gap-3 mb-6">
                  <Play className="w-5 h-5 text-[#e52421]" />
                  <h2 className="text-xl font-semibold text-white">Vídeo de Highlights</h2>
                </div>
                <div className="overflow-hidden bg-zinc-950 border border-zinc-900">
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      title="Player Highlights"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </section>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
