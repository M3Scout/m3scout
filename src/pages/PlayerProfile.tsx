import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  Star,
  Target,
} from "lucide-react";
import { PublicStatsSection } from "@/components/players/sections/PublicStatsSection";

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Atleta não encontrado</h1>
          <Link to="/players">
            <Button variant="outline">Voltar para atletas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link 
          to="/players" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para atletas
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="relative">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden glass-card">
              <img
                src={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop"}
                alt={player.full_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-col">
            {/* Position */}
            <span className="position-badge w-fit mb-4">{player.position}</span>

            {/* Name */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{player.full_name}</h1>

            {/* Rating */}
            {player.auto_rating !== null && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <span className="text-xl font-bold text-primary">
                    {player.auto_rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/5.0</span>
                </div>
              </div>
            )}

            {/* Secondary Positions */}
            {player.secondary_positions && player.secondary_positions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {player.secondary_positions.map((pos) => (
                  <span key={pos} className="stat-badge">{pos}</span>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {player.age && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Idade</span>
                  </div>
                  <p className="text-lg font-semibold">{player.age} anos</p>
                </div>
              )}
              
              {player.height && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Ruler className="w-4 h-4" />
                    <span className="text-xs">Altura</span>
                  </div>
                  <p className="text-lg font-semibold">{player.height} cm</p>
                </div>
              )}
              
              {player.dominant_foot && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-xs">Pé Dominante</span>
                  </div>
                  <p className="text-lg font-semibold">{player.dominant_foot}</p>
                </div>
              )}
              
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Flag className="w-4 h-4" />
                  <span className="text-xs">Nacionalidade</span>
                </div>
                <p className="text-lg font-semibold">{player.nationality}</p>
              </div>
              
              {player.current_club && (
                <div className="glass-card p-4 col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Clube Atual</span>
                  </div>
                  <p className="text-lg font-semibold">{player.current_club}</p>
                </div>
              )}
            </div>

            {/* Tactical Info */}
            {(player.primary_tactical_role || player.play_style) && (
              <div className="glass-card p-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">Perfil Tático</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {player.primary_tactical_role && (
                    <Badge variant="outline" className="border-primary/50">
                      {player.primary_tactical_role}
                    </Badge>
                  )}
                  {player.play_style && (
                    <Badge variant="secondary">{player.play_style}</Badge>
                  )}
                </div>
                {player.strengths && player.strengths.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {player.strengths.slice(0, 4).map((s) => (
                      <Badge key={s} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {player.bio_public && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">Sobre o Atleta</h2>
                <p className="text-muted-foreground leading-relaxed">{player.bio_public}</p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-auto">
              <Link to={`/contact?player=${player.slug}`}>
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  <MessageCircle className="w-5 h-5" />
                  Falar com a M3 sobre este atleta
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section - Public */}
        <section className="mt-16">
          <PublicStatsSection playerId={player.id} />
        </section>

        {/* Video Section */}
        {player.highlight_video_url && (() => {
          const embedUrl = getYouTubeEmbedUrl(player.highlight_video_url);
          if (!embedUrl) return null;
          return (
            <section className="mt-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Play className="w-6 h-6 text-primary" />
                Vídeo de Highlights
              </h2>
              <div className="glass-card overflow-hidden rounded-2xl">
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
  );
};

export default PlayerProfile;
