import { Link } from "react-router-dom";

interface AthleteCardPremiumProps {
  id: string;
  slug: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  currentClub: string;
  imageUrl: string;
  isPublic?: boolean;
}

export function AthleteCardPremium({
  slug,
  name,
  position,
  age,
  nationality,
  currentClub,
  imageUrl,
  isPublic = true,
}: AthleteCardPremiumProps) {
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;

  return (
    <Link to={href} className="group block">
      <article 
        className="relative overflow-hidden rounded-[20px] bg-[#0a0a0a] transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[320ms] ease-out group-hover:scale-[1.03]"
          />
          
          {/* Gradient Overlay - stronger at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/95" />
          
          {/* Border on hover */}
          <div className="absolute inset-0 rounded-[20px] border border-transparent transition-all duration-300 group-hover:border-white/10" />
          
          {/* Position Tag - Top Left */}
          <div className="absolute top-4 left-4">
            <span 
              className="inline-block px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/90 rounded-sm"
              style={{ 
                background: 'rgba(15, 15, 15, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {position}
            </span>
          </div>

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Name - max 2 lines with clamp */}
            <h3 
              className="text-white text-lg md:text-xl font-semibold tracking-tight mb-2 transition-colors duration-300 line-clamp-2"
            >
              {name}
            </h3>
            
            {/* Meta row */}
            <p className="text-neutral-400 text-sm font-light tracking-wide">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && <span className="mx-2 text-neutral-600">•</span>}
              {nationality && <span>{nationality}</span>}
              {(age > 0 || nationality) && currentClub && <span className="mx-2 text-neutral-600">•</span>}
              {currentClub && <span className="text-neutral-500">{currentClub}</span>}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
