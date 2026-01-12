import { Link } from "react-router-dom";
import { formatFixed } from "@/lib/formatters";

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
  autoRating?: number | null;
}

export function PlayerCard({
  slug,
  name,
  position,
  age,
  nationality,
  currentClub,
  imageUrl,
  isPublic = true,
  autoRating,
}: PlayerCardProps) {
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;

  // Rating display logic: highlight in red if >= 4.0
  const isHighRating = autoRating !== null && autoRating !== undefined && autoRating >= 4.0;

  return (
    <Link to={href} className="group block">
      <article className="relative bg-zinc-950 overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          
          {/* Gradient Overlay - bottom fade for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
          
          {/* Position Tag - Top Left */}
          <div className="absolute top-4 left-4">
            <span className="inline-block bg-black/90 text-white text-[10px] font-medium uppercase tracking-[0.15em] px-3 py-1.5">
              {position}
            </span>
          </div>

          {/* Rating Badge - Top Right */}
          {autoRating !== null && autoRating !== undefined && (
            <div className="absolute top-4 right-4">
              <span 
                className={`inline-block text-sm font-medium px-2.5 py-1 border ${
                  isHighRating 
                    ? "text-[#e52421] border-[#e52421]/50" 
                    : "text-white border-white/30"
                }`}
              >
                {formatFixed(autoRating, 1)}
              </span>
            </div>
          )}

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Name */}
            <h3 className="text-white text-lg font-semibold tracking-tight mb-2 transition-opacity duration-300 group-hover:opacity-100 opacity-95">
              {name}
            </h3>
            
            {/* Meta Info Line */}
            <p className="text-zinc-400 text-sm">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && <span className="mx-1.5">·</span>}
              {nationality && <span>{nationality}</span>}
              {(age > 0 || nationality) && currentClub && <span className="mx-1.5">·</span>}
              {currentClub && <span>{currentClub}</span>}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
