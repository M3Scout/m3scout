import { Link } from "react-router-dom";
import { ScoreDisplay } from "./ScoreDisplay";

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
  id,
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
  // Public routes use slug for SEO-friendly URLs, app routes use id for reliability
  const href = isPublic ? `/players/${slug}` : `/dashboard/atletas/${id}`;

  return (
    <Link to={href} className="group block">
      <article className="relative bg-zinc-950 overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            width={400}
            height={500}
            className="w-full h-full object-cover sm:transition-transform sm:duration-500 sm:ease-out sm:group-hover:scale-[1.03]"
          />
          
          {/* Gradient Overlay - bottom fade for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 sm:opacity-80" />
          
          {/* === MOBILE LAYOUT: Overlay Info === */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 p-4">
            {/* Top row: Position + Score */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                {position}
              </span>
              {autoRating !== null && autoRating !== undefined && (
                <ScoreDisplay score={autoRating} variant="bar" size="sm" />
              )}
            </div>
            
            {/* Name */}
            <h3 className="text-white text-base font-semibold tracking-tight leading-tight">
              {name}
            </h3>
          </div>
          
          {/* === DESKTOP LAYOUT: Position Tag (Top Left) === */}
          <div className="hidden sm:block absolute top-4 left-4">
            <span className="inline-block bg-black/90 text-white text-[10px] font-medium uppercase tracking-[0.15em] px-3 py-1.5">
              {position}
            </span>
          </div>

          {/* === DESKTOP LAYOUT: Score Badge (Top Right) === */}
          {autoRating !== null && autoRating !== undefined && (
            <div className="hidden sm:block absolute top-4 right-4">
              <ScoreDisplay score={autoRating} variant="badge" size="sm" />
            </div>
          )}

          {/* === DESKTOP LAYOUT: Player Info (Bottom) === */}
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-white text-lg font-semibold tracking-tight mb-2 transition-opacity duration-300 group-hover:opacity-100 opacity-95">
              {name}
            </h3>
            
            <p className="text-zinc-400 text-sm">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && <span className="mx-1.5">·</span>}
              {nationality && <span>{nationality}</span>}
              {(age > 0 || nationality) && currentClub && <span className="mx-1.5">·</span>}
              {currentClub && <span>{currentClub}</span>}
            </p>
          </div>
        </div>

        {/* === MOBILE LAYOUT: Meta Row (Below Image) === */}
        <div className="sm:hidden px-4 py-3 bg-zinc-950 border-t border-zinc-900">
          <p className="text-zinc-500 text-xs leading-relaxed">
            {age > 0 && <span>{age} anos</span>}
            {age > 0 && nationality && <span className="mx-1.5">·</span>}
            {nationality && <span>{nationality}</span>}
            {(age > 0 || nationality) && currentClub && <span className="mx-1.5">·</span>}
            {currentClub && <span className="truncate">{currentClub}</span>}
          </p>
        </div>
      </article>
    </Link>
  );
}
