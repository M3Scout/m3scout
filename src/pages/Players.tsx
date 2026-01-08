import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters } from "@/components/players/PlayerFilters";
import { Loader2 } from "lucide-react";

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

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("todos");
  const [nationalityFilter, setNationalityFilter] = useState("todos");

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url")
        .eq("is_public", true)
        .order("full_name");

      if (data) {
        setPlayers(data);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = positionFilter === "todos" || 
      player.position.toLowerCase().includes(positionFilter);
    const matchesNationality = nationalityFilter === "todos" || 
      player.nationality.toLowerCase() === nationalityFilter;
    
    return matchesSearch && matchesPosition && matchesNationality;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Nossos <span className="gradient-text">Atletas</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Explore nosso portfólio completo de atletas. Use os filtros para encontrar 
            o perfil ideal para suas necessidades.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <PlayerFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            positionFilter={positionFilter}
            onPositionChange={setPositionFilter}
            nationalityFilter={nationalityFilter}
            onNationalityChange={setNationalityFilter}
          />
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} encontrado{filteredPlayers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <div 
                key={player.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
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
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
