import { useState } from "react";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters } from "@/components/players/PlayerFilters";

// Mock data - will be replaced with real data from Supabase
const allPlayers = [
  {
    id: "1",
    slug: "gabriel-santos",
    name: "Gabriel Santos",
    position: "Meia Atacante",
    secondaryPositions: ["Ponta Direita", "Segundo Volante"],
    age: 22,
    nationality: "Brasil",
    currentClub: "EC Bahia",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=600&fit=crop",
    rating: 4,
  },
  {
    id: "2",
    slug: "lucas-oliveira",
    name: "Lucas Oliveira",
    position: "Zagueiro",
    secondaryPositions: ["Lateral Direito"],
    age: 24,
    nationality: "Brasil",
    currentClub: "Cruzeiro EC",
    imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=600&fit=crop",
    rating: 5,
  },
  {
    id: "3",
    slug: "matheus-costa",
    name: "Matheus Costa",
    position: "Centroavante",
    secondaryPositions: ["Ponta Esquerda"],
    age: 20,
    nationality: "Brasil",
    currentClub: "Santos FC",
    imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=600&fit=crop",
    rating: 4,
  },
  {
    id: "4",
    slug: "pedro-almeida",
    name: "Pedro Almeida",
    position: "Volante",
    secondaryPositions: ["Meio-campo"],
    age: 23,
    nationality: "Brasil",
    currentClub: "Fluminense FC",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop",
    rating: 3,
  },
  {
    id: "5",
    slug: "rafael-silva",
    name: "Rafael Silva",
    position: "Goleiro",
    secondaryPositions: [],
    age: 26,
    nationality: "Brasil",
    currentClub: "Atlético Mineiro",
    imageUrl: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=400&h=600&fit=crop",
    rating: 4,
  },
  {
    id: "6",
    slug: "diego-martinez",
    name: "Diego Martínez",
    position: "Lateral Esquerdo",
    secondaryPositions: ["Meia Esquerda"],
    age: 21,
    nationality: "Argentina",
    currentClub: "Racing Club",
    imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400&h=600&fit=crop",
    rating: 3,
  },
  {
    id: "7",
    slug: "thiago-fernandes",
    name: "Thiago Fernandes",
    position: "Ponta Direita",
    secondaryPositions: ["Meia Atacante"],
    age: 19,
    nationality: "Brasil",
    currentClub: "São Paulo FC",
    imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400&h=600&fit=crop",
    rating: 4,
  },
  {
    id: "8",
    slug: "andre-souza",
    name: "André Souza",
    position: "Meio-campo",
    secondaryPositions: ["Volante", "Meia Atacante"],
    age: 25,
    nationality: "Brasil",
    currentClub: "Internacional",
    imageUrl: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=400&h=600&fit=crop",
    rating: 5,
  },
];

const Players = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("todos");
  const [nationalityFilter, setNationalityFilter] = useState("todos");

  const filteredPlayers = allPlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
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

        {/* Players Grid */}
        {filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <div 
                key={player.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PlayerCard {...player} />
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
