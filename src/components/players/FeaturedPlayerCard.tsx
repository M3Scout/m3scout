import { Link } from "react-router-dom";
import { formatFixed } from "@/lib/formatters";

interface FeaturedPlayerCardProps {
  id: string;
  slug: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  currentClub: string;
  imageUrl: string;
  isPublic?: boolean;
  autoRating?: number | null;
}

export function FeaturedPlayerCard({
  slug,
  name,
  position,
  age,
  nationality,
  currentClub,
  imageUrl,
  isPublic = true,
  autoRating,
}: FeaturedPlayerCardProps) {
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;

  const isHighRating = autoRating !== null && autoRating !== undefined && autoRating >= 4.0;

  return (
    <Link to={href} className="group block col-span-1 sm:col-span-2">
      <article className="relative bg-zinc-950 overflow-hidden">
        {/* Image Container - Taller aspect ratio for featured */}
        <div className="relative aspect-[4/5] sm:aspect-[16/10] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover sm:transition-transform sm:duration-700 sm:ease-out sm:group-hover:scale-[1.02]"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />
          
          {/* Red Accent Line - Left Edge */}
          <div className="absolute top-0 left-0 w-1 h-full bg-[#e52421]" />
          
          {/* Position Tag - Top Left */}
          <div className="absolute top-5 left-5 sm:top-6 sm:left-7">
            <span className="inline-block bg-black/80 text-white text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.15em] px-3 py-1.5 sm:px-4 sm:py-2">
              {position}
            </span>
          </div>

          {/* Featured Badge - Top Right */}
          <div className="absolute top-5 right-5 sm:top-6 sm:right-7">
            <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] text-[#e52421]">
              Destaque
            </span>
          </div>

          {/* Content - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
            {/* Score - Editorial Style */}
            {autoRating !== null && autoRating !== undefined && (
              <div className="mb-3 sm:mb-4">
                <span 
                  className={`font-serif text-3xl sm:text-4xl font-bold ${
                    isHighRating ? "text-[#e52421]" : "text-white"
                  }`}
                >
                  {formatFixed(autoRating, 1)}
                </span>
                <span className="text-zinc-500 text-xs sm:text-sm ml-1.5">/5</span>
              </div>
            )}
            
            {/* Name - Larger for Featured */}
            <h3 className="text-white text-xl sm:text-3xl font-semibold tracking-tight mb-2 sm:mb-3 leading-tight">
              {name}
            </h3>
            
            {/* Meta Info Line */}
            <p className="text-zinc-400 text-sm sm:text-base">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && <span className="mx-2">·</span>}
              {nationality && <span>{nationality}</span>}
              {(age > 0 || nationality) && currentClub && <span className="mx-2">·</span>}
              {currentClub && <span>{currentClub}</span>}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
