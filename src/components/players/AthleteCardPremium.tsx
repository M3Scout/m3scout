import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Position codes - compact
const positionCodes: Record<string, string> = {
  GK: "GOL",
  CB: "ZAG",
  LB: "LE",
  RB: "LD",
  CDM: "VOL",
  CM: "MC",
  CAM: "MEI",
  LM: "ME",
  RM: "MD",
  LW: "PE",
  RW: "PD",
  CF: "SA",
  ST: "ATA",
};

// Foot labels
const footLabels: Record<string, string> = {
  right: "Direito",
  left: "Esquerdo",
  both: "Ambos",
  direito: "Direito",
  esquerdo: "Esquerdo",
  ambos: "Ambos",
};

// Animation easing
const premiumEasing = [0.4, 0, 0.2, 1] as const;

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
  const [isHovered, setIsHovered] = useState(false);

  // Format height
  const formatHeight = (h: number | null | undefined) => {
    if (!h) return null;
    return `${(h / 100).toFixed(2).replace(".", ",")}m`;
  };

  // Format foot - short
  const formatFootShort = (foot: string | null | undefined) => {
    if (!foot) return "—";
    const footMap: Record<string, string> = {
      right: "D",
      left: "E",
      both: "A",
      direito: "D",
      esquerdo: "E",
      ambos: "A",
    };
    return footMap[foot.toLowerCase()] || foot.charAt(0).toUpperCase();
  };

  // Format foot - full
  const formatFootFull = (foot: string | null | undefined) => {
    if (!foot) return "—";
    return footLabels[foot.toLowerCase()] || foot;
  };

  // Format minutes with pt-BR thousands separator
  const formatMinutes = (mins: number | null | undefined) => {
    if (!mins || mins === 0) return "—";
    return mins.toLocaleString("pt-BR");
  };

  // Get position code
  const positionCode = positionCodes[position] || position;

  // Badge styles - glassmorphism
  const badgeStyle = {
    background: "rgba(7, 9, 16, 0.65)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };

  return (
    <Link
      to={href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-sm bg-[#0a0c12]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{
          default: { duration: 0.42, ease: premiumEasing },
          y: { duration: 0.24, ease: "easeOut" },
        }}
        style={{
          boxShadow: isHovered
            ? "0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 8px 16px -8px rgba(0, 0, 0, 0.4)"
            : "0 4px 12px -4px rgba(0, 0, 0, 0.3)",
          transition: "box-shadow 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {/* Blur placeholder */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              imageLoaded ? "opacity-0" : "opacity-100"
            )}
            style={{
              background: "linear-gradient(135deg, #12141a 0%, #070910 100%)",
            }}
          >
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.02] to-transparent" />
          </div>

          <motion.img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover object-top",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            animate={{ scale: isHovered ? 1.03 : 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          />

          {/* Premium gradient overlay - stronger for consistent contrast */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/50 to-transparent transition-opacity duration-240",
              isHovered ? "opacity-95" : "opacity-85"
            )}
          />

          {/* Position Badge - Top Left */}
          <div className="absolute top-4 left-4">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08]"
              style={badgeStyle}
            >
              <Zap className="w-3 h-3 text-white/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                {positionCode}
              </span>
            </div>
          </div>

          {/* Status Badge - Top Right */}
          <div className="absolute top-4 right-4">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-white/[0.08]"
              style={badgeStyle}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#1ED760" }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "#1ED760" }}
              >
                Monitorado
              </span>
            </div>
          </div>

          {/* Player Info - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Name - Primary focus */}
            <h3 className="text-white text-lg font-semibold tracking-tight mb-1.5 line-clamp-1">
              {name}
            </h3>

            {/* Meta row - Age • Country • Club */}
            <p className="text-white/50 text-[13px] font-medium tracking-wide mb-3">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && (
                <span className="mx-1.5 text-white/20">•</span>
              )}
              {nationality && <span>{nationality}</span>}
              {(age > 0 || nationality) && currentClub && (
                <span className="mx-1.5 text-white/20">•</span>
              )}
              {currentClub && (
                <span className="text-white/30">{currentClub}</span>
              )}
            </p>

            {/* Scouting Mode - Data Strip */}
            <AnimatePresence>
              {scoutingMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: premiumEasing }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06] text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
                    <span className="text-white/60">
                      POS: {positionCode}
                    </span>
                    <span className="w-px h-3 bg-white/10" />
                    <span>
                      Pé: {formatFootFull(dominantFoot)}
                    </span>
                    {height && (
                      <>
                        <span className="w-px h-3 bg-white/10" />
                        <span>{formatHeight(height)}</span>
                      </>
                    )}
                    {totalMinutes !== undefined && totalMinutes !== null && (
                      <>
                        <span className="w-px h-3 bg-white/10" />
                        <span>{formatMinutes(totalMinutes)} min</span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hover CTA - Fade in */}
            <motion.div
              className="flex items-center gap-1.5 mt-3 text-white/40 text-[11px] font-medium tracking-wide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <span>Ver perfil</span>
              <ArrowRight className="w-3 h-3" />
            </motion.div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
