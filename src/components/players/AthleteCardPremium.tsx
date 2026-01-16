import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  // Scouting mode extras
  scoutingMode?: boolean;
  dominantFoot?: string | null;
  height?: number | null;
  currentLeague?: string | null;
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
  scoutingMode = false,
  dominantFoot,
  height,
  currentLeague,
}: AthleteCardPremiumProps) {
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;
  const [imageLoaded, setImageLoaded] = useState(false);

  // Format height
  const formatHeight = (h: number | null | undefined) => {
    if (!h) return null;
    return `${(h / 100).toFixed(2).replace('.', ',')}m`;
  };

  // Format foot
  const formatFoot = (foot: string | null | undefined) => {
    if (!foot) return null;
    const footMap: Record<string, string> = {
      'right': 'D',
      'left': 'E',
      'both': 'A',
      'direito': 'D',
      'esquerdo': 'E',
      'ambos': 'A',
    };
    return footMap[foot.toLowerCase()] || foot.charAt(0).toUpperCase();
  };

  return (
    <Link to={href} className="group block">
      <article 
        className="relative overflow-hidden rounded-[20px] bg-[#0a0a0a] transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {/* Blur placeholder */}
          <div 
            className={`absolute inset-0 bg-neutral-800 transition-opacity duration-500 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}
            style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
            }}
          >
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-700/20 to-neutral-900/20" />
          </div>
          
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.03] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
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
            {/* Scouting Mode Chips with Animation */}
            <AnimatePresence>
              {scoutingMode && (dominantFoot || height || currentLeague) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex flex-wrap gap-1.5 mb-3 overflow-hidden"
                >
                  {dominantFoot && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.05 }}
                      className="inline-flex items-center px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70 rounded"
                      style={{ 
                        background: 'rgba(229, 36, 33, 0.15)',
                        border: '1px solid rgba(229, 36, 33, 0.25)'
                      }}
                    >
                      Pé: {formatFoot(dominantFoot)}
                    </motion.span>
                  )}
                  {height && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="inline-flex items-center px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70 rounded"
                      style={{ 
                        background: 'rgba(229, 36, 33, 0.15)',
                        border: '1px solid rgba(229, 36, 33, 0.25)'
                      }}
                    >
                      {formatHeight(height)}
                    </motion.span>
                  )}
                  {currentLeague && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.15 }}
                      className="inline-flex items-center px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70 rounded"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {currentLeague}
                    </motion.span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
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
