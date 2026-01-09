import { Link } from "react-router-dom";
import { MapPin, Calendar, Star } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlayerCardProps {
  id: string;
  slug: string;
  name: string;
  position: string;
  secondaryPositions?: string[];
  age: number;
  nationality: string;
  currentClub: string;
  imageUrl: string;
  rating?: number;
  isPublic?: boolean;
  // New: automatic rating (0-5)
  autoRating?: number | null;
}

export function PlayerCard({
  slug,
  name,
  position,
  secondaryPositions = [],
  age,
  nationality,
  currentClub,
  imageUrl,
  rating = 0,
  isPublic = true,
  autoRating,
}: PlayerCardProps) {
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.0) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (rating >= 3.0) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (rating >= 2.0) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <Link to={href} className="group block">
      <article className="glass-card-hover overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Position Badge */}
          <div className="absolute top-3 left-3">
            <span className="position-badge">{position}</span>
          </div>

          {/* Auto Rating Badge (0-5) */}
          {autoRating !== null && autoRating !== undefined && (
            <div className="absolute top-3 right-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "glass-card px-2 py-1 flex items-center gap-1 border cursor-help",
                      getRatingColor(autoRating)
                    )}>
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-sm font-semibold">{autoRating.toFixed(1)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Nota automática baseada em estatísticas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Legacy Rating Stars (if no auto rating) */}
          {rating > 0 && !autoRating && (
            <div className="absolute top-3 right-3">
              <div className="glass-card px-2 py-1">
                <RatingStars rating={rating} size="sm" />
              </div>
            </div>
          )}

          {/* Player Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
              {name}
            </h3>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {secondaryPositions.slice(0, 2).map((pos) => (
                <span key={pos} className="stat-badge text-[10px]">
                  {pos}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {age} anos
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {nationality}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground truncate">
              {currentClub}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
