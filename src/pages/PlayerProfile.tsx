import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/players/RatingStars";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Ruler, 
  User, 
  Flag,
  Play,
  MessageCircle 
} from "lucide-react";

// Mock data - will be replaced with real data from Supabase
const mockPlayer = {
  id: "1",
  slug: "gabriel-santos",
  name: "Gabriel Santos",
  position: "Meia Atacante",
  secondaryPositions: ["Ponta Direita", "Segundo Volante"],
  age: 22,
  birthYear: 2002,
  nationality: "Brasil",
  currentClub: "EC Bahia",
  height: 178,
  dominantFoot: "Direito",
  imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=1000&fit=crop",
  rating: 4,
  bio: "Gabriel Santos é um meio-campista versátil com excelente visão de jogo e capacidade técnica refinada. Destaca-se pela criatividade e precisão nos passes decisivos, sendo peça fundamental na construção ofensiva do EC Bahia. Com passagens pelas seleções de base do Brasil, demonstra potencial para atuar em ligas europeias de primeiro nível.",
  highlightVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
};

const PlayerProfile = () => {
  const { slug } = useParams();

  // In production, fetch player data based on slug
  const player = mockPlayer;

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
                src={player.imageUrl}
                alt={player.name}
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              
              {/* Rating Badge */}
              <div className="absolute top-4 right-4 glass-card px-3 py-2">
                <RatingStars rating={player.rating} size="md" />
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-col">
            {/* Position */}
            <span className="position-badge w-fit mb-4">{player.position}</span>

            {/* Name */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{player.name}</h1>

            {/* Secondary Positions */}
            <div className="flex flex-wrap gap-2 mb-6">
              {player.secondaryPositions.map((pos) => (
                <span key={pos} className="stat-badge">{pos}</span>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Idade</span>
                </div>
                <p className="text-lg font-semibold">{player.age} anos</p>
              </div>
              
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Ruler className="w-4 h-4" />
                  <span className="text-xs">Altura</span>
                </div>
                <p className="text-lg font-semibold">{player.height} cm</p>
              </div>
              
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs">Pé Dominante</span>
                </div>
                <p className="text-lg font-semibold">{player.dominantFoot}</p>
              </div>
              
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Flag className="w-4 h-4" />
                  <span className="text-xs">Nacionalidade</span>
                </div>
                <p className="text-lg font-semibold">{player.nationality}</p>
              </div>
              
              <div className="glass-card p-4 col-span-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">Clube Atual</span>
                </div>
                <p className="text-lg font-semibold">{player.currentClub}</p>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Sobre o Atleta</h2>
              <p className="text-muted-foreground leading-relaxed">{player.bio}</p>
            </div>

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

        {/* Video Section */}
        {player.highlightVideoUrl && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Play className="w-6 h-6 text-primary" />
              Vídeo de Highlights
            </h2>
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="aspect-video">
                <iframe
                  src={player.highlightVideoUrl}
                  title="Player Highlights"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
