import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cardHover, cardTap, pillHover, smoothTransition, staggerContainer, staggerItem } from "@/lib/animations";

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
  totalMinutes?: number | null;
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
  totalMinutes,
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

  // Format minutes with pt-BR thousands separator
  const formatMinutes = (mins: number | null | undefined) => {
    if (!mins || mins === 0) return '—';
    return mins.toLocaleString('pt-BR');
  };

  return (
    <Link to={href} className="group block">
      <motion.article 
        className="relative overflow-hidden rounded-[var(--radius-card)] bg-[#0a0a0a]"
        style={{ fontFamily: "'Poppins', sans-serif" }}
        whileHover={cardHover}
        whileTap={cardTap}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
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
          
          <motion.img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {/* Gradient Overlay - stronger at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/95" />
          
          {/* Border on hover */}
          <motion.div 
            className="absolute inset-0 rounded-[var(--radius-card)] border border-white/0"
            whileHover={{ borderColor: "rgba(255,255,255,0.1)" }}
            transition={smoothTransition}
          />
          
          {/* Position Tag - Top Left - Pill Style */}
          <div className="absolute top-4 left-4">
            <motion.span 
              className="inline-block px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/90 rounded-[var(--radius-pill)]"
              style={{ 
                background: 'var(--bg-glass)',
                border: 'var(--border-glass)',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={pillHover}
            >
              {position}
            </motion.span>
          </div>

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Scouting Mode Chips with Animation */}
            <AnimatePresence>
              {scoutingMode && (dominantFoot || height || totalMinutes !== undefined) && (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={staggerContainer}
                  className="flex flex-wrap gap-1.5 mb-3 overflow-hidden"
                >
                  {dominantFoot && (
                    <motion.span 
                      variants={staggerItem}
                      whileHover={pillHover}
                      className="inline-flex items-center px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white/80 rounded-[var(--radius-pill)]"
                      style={{ 
                        background: 'rgba(229, 36, 33, 0.15)',
                        border: '1px solid rgba(229, 36, 33, 0.25)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      Pé: {formatFoot(dominantFoot)}
                    </motion.span>
                  )}
                  {height && (
                    <motion.span 
                      variants={staggerItem}
                      whileHover={pillHover}
                      className="inline-flex items-center px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white/80 rounded-[var(--radius-pill)]"
                      style={{ 
                        background: 'rgba(229, 36, 33, 0.15)',
                        border: '1px solid rgba(229, 36, 33, 0.25)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {formatHeight(height)}
                    </motion.span>
                  )}
                  {/* Minutes chip - always show in scouting mode */}
                  <motion.span 
                    variants={staggerItem}
                    whileHover={pillHover}
                    className="inline-flex items-center px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white/80 rounded-[var(--radius-pill)]"
                    style={{ 
                      background: 'var(--bg-glass)',
                      border: 'var(--border-glass)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    MIN {formatMinutes(totalMinutes)}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Name - max 2 lines with clamp */}
            <h3 className="text-white text-lg md:text-xl font-semibold tracking-tight mb-2 transition-colors duration-300 line-clamp-2">
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
      </motion.article>
    </Link>
  );
}
