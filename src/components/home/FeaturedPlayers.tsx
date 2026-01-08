import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/players/PlayerCard";
import { ArrowRight } from "lucide-react";

// Mock data - will be replaced with real data from Supabase
const featuredPlayers = [
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
];

export function FeaturedPlayers() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PlayerCard {...player} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
