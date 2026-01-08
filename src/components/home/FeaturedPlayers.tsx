import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/players/PlayerCard";
import { ArrowRight, Loader2 } from "lucide-react";

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

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Atletas em <span className="gradient-text">Destaque</span>
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Conheça alguns dos talentos que representamos. Nossa seleção inclui 
              atletas de diversas posições e categorias.
            </p>
          </div>
          <Link to="/players">
            <Button variant="outline" className="group">
              Ver Todos
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {/* Players Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {players.map((player, index) => (
              <div 
                key={player.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <PlayerCard
                  id={player.id}
                  slug={player.slug}
                  name={player.full_name}
                  position={player.position}
                  secondaryPositions={player.secondary_positions || []}
                  age={player.age || 0}
                  nationality={player.nationality}
                  currentClub={player.current_club || ""}
                  imageUrl={player.photo_url || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop"}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>Nenhum atleta disponível no momento.</p>
          </div>
        )}
      </div>
    </section>
  );
}
