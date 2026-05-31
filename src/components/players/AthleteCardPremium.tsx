import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, FileText, Star, Gamepad2, Clock, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/lib/imageUtils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AthleteCardPremiumProps {
  id: string;
  slug: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  currentClub: string;
  imageUrl: string;
  isPublic?: boolean;
  // Scouting mode fields
  scoutingMode?: boolean;
  clubMode?: boolean;
  dominantFoot?: string | null;
  height?: number | null;
  totalMinutes?: number | null;
  // New scouting fields
  overallRating?: number | null;
  potentialRating?: number | null;
  physicalStatus?: string | null;
  marketValue?: number | null;
  estimatedLevel?: string | null;
  competitionName?: string | null;
  lastReportDate?: string | null;
  createdAt?: string | null;
  // New indicator header fields
  totalMatches?: number | null;
  playStyle?: string | null;
  primaryTacticalRole?: string | null;
  secondaryTacticalRole?: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const positionLabels: Record<string, string> = {
  GK: "Goleiro",
  CB: "Zagueiro",
  LB: "Lateral Esquerdo",
  RB: "Lateral Direito",
  CDM: "Volante",
  CM: "Meio-Campo",
  CAM: "Meia Atacante",
  LM: "Meia Esquerda",
  RM: "Meia Direita",
  LW: "Ponta Esquerda",
  RW: "Ponta Direita",
  CF: "Segundo Atacante",
  ST: "Atacante",
  Goleiro: "Goleiro",
  Zagueiro: "Zagueiro",
  "Lateral Esquerdo": "Lateral Esquerdo",
  "Lateral Direito": "Lateral Direito",
  Volante: "Volante",
  "Meio-Campo": "Meio-Campo",
  Meia: "Meia",
  "Meia Atacante": "Meia Atacante",
  "Meia Ofensivo": "Meia Ofensivo",
  "Ponta Esquerda": "Ponta Esquerda",
  "Ponta Direita": "Ponta Direita",
  Atacante: "Atacante",
  Centroavante: "Centroavante",
};

const footLabels: Record<string, string> = {
  right: "Direito",
  left: "Esquerdo",
  both: "Ambos",
  direito: "Direito",
  esquerdo: "Esquerdo",
  ambos: "Ambos",
  Direito: "Direito",
  Esquerdo: "Esquerdo",
  Ambos: "Ambos",
};

// Animation easing
const premiumEasing = [0.22, 1, 0.36, 1] as const;

// Physical status config
const PHYSICAL_STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  dotColor: string;
}> = {
  fit: { 
    label: "APTO", 
    color: "#1ED760", 
    bgColor: "rgba(30, 215, 96, 0.1)", 
    borderColor: "rgba(30, 215, 96, 0.2)",
    dotColor: "#1ED760"
  },
  attention: { 
    label: "EM TRANSIÇÃO", 
    color: "#FFB800", 
    bgColor: "rgba(255, 184, 0, 0.1)", 
    borderColor: "rgba(255, 184, 0, 0.2)",
    dotColor: "#FFB800"
  },
  recovering: { 
    label: "EM TRANSIÇÃO", 
    color: "#FFB800", 
    bgColor: "rgba(255, 184, 0, 0.1)", 
    borderColor: "rgba(255, 184, 0, 0.2)",
    dotColor: "#FFB800"
  },
  injured: { 
    label: "INAPTO", 
    color: "#FF4444", 
    bgColor: "rgba(255, 68, 68, 0.1)", 
    borderColor: "rgba(255, 68, 68, 0.2)",
    dotColor: "#FF4444"
  },
};

const DEFAULT_PHYSICAL_CONFIG = {
  label: "N/I",
  color: "rgba(255, 255, 255, 0.4)",
  bgColor: "rgba(255, 255, 255, 0.03)",
  borderColor: "rgba(255, 255, 255, 0.06)",
  dotColor: "rgba(255, 255, 255, 0.3)"
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatHeight(h: number | null | undefined): string {
  if (!h) return "—";
  const meters = h >= 100 ? h / 100 : h;
  return `${meters.toFixed(2).replace(".", ",")}m`;
}

function formatFoot(foot: string | null | undefined): string {
  if (!foot) return "—";
  return footLabels[foot] || foot;
}

function getPositionLabel(pos: string): string {
  return positionLabels[pos] || pos;
}

function formatMinutesDisplay(minutes: number | null | undefined): string {
  if (!minutes) return "0";
  if (minutes >= 1000) {
    return `${(minutes / 1000).toFixed(1)}k`;
  }
  return minutes.toString();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLUB MODE INDICATOR ROW COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ClubModeIndicatorRowProps {
  overallRating?: number | null;
  totalMinutes?: number | null;
  totalMatches?: number | null;
  physicalStatus?: string | null;
  playStyle?: string | null;
  primaryTacticalRole?: string | null;
  secondaryTacticalRole?: string | null;
}

function ClubModeIndicatorRow({
  overallRating,
  totalMinutes,
  totalMatches,
  physicalStatus,
  playStyle,
  primaryTacticalRole,
  secondaryTacticalRole,
}: ClubModeIndicatorRowProps) {
  const minutes = totalMinutes ?? 0;
  const matches = totalMatches ?? 0;
  
  const showRating = minutes > 0 && overallRating !== null && overallRating !== undefined;
  const ratingDisplay = showRating ? overallRating.toFixed(1) : "—";
  
  const physicalKey = physicalStatus?.toLowerCase() || "";
  const physicalConfig = PHYSICAL_STATUS_CONFIG[physicalKey] || DEFAULT_PHYSICAL_CONFIG;
  
  const roles = [primaryTacticalRole, secondaryTacticalRole].filter(Boolean).slice(0, 2);
  const hasPlayStyle = Boolean(playStyle) || roles.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
      {/* NOTA */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <Star className="w-3.5 h-3.5 text-white/40" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-white/35 leading-tight">Nota</span>
          <span className="text-sm font-bold text-white leading-tight">{ratingDisplay}</span>
        </div>
      </div>
      
      {/* JOGOS */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <Gamepad2 className="w-3.5 h-3.5 text-white/40" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-white/35 leading-tight">Jogos</span>
          <span className="text-sm font-bold text-white leading-tight">{matches}</span>
        </div>
      </div>
      
      {/* MINUTOS */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <Clock className="w-3.5 h-3.5 text-white/40" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-white/35 leading-tight">Minutos</span>
          <span className="text-sm font-bold text-white leading-tight">{formatMinutesDisplay(minutes)}</span>
        </div>
      </div>
      
      {/* FÍSICO */}
      <div 
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
        style={{
          background: physicalConfig.bgColor,
          border: `1px solid ${physicalConfig.borderColor}`,
        }}
      >
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: physicalConfig.dotColor }}
        />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-white/35 leading-tight">Físico</span>
          <span 
            className="text-xs font-bold uppercase leading-tight"
            style={{ color: physicalConfig.color }}
          >
            {physicalConfig.label}
          </span>
        </div>
      </div>
      
      {/* ESTILO DE JOGO */}
      {hasPlayStyle && (
        <div 
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Zap className="w-3.5 h-3.5 text-primary/60" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wider text-white/35 leading-tight">Estilo</span>
            <div className="flex flex-wrap items-center gap-1">
              {playStyle && (
                <span className="text-xs font-medium text-white/80 leading-tight">{playStyle}</span>
              )}
              {roles.map((role, i) => (
                <span 
                  key={i}
                  className="text-[9px] text-white/40 px-1 py-0.5 rounded bg-white/5"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT A — VISUAL MODE (Grid cards)
// Position-based colors, clean design, no status badges
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VisualModeCard({
  slug,
  name,
  position,
  id,
  age,
  nationality,
  currentClub,
  imageUrl,
  isPublic,
}: AthleteCardPremiumProps) {
  const [isHovered, setIsHovered] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/dashboard/atletas/${id}`;
  
  // Get position-based colors
  const positionColors = getPositionColor(position);
  const shortPosition = getShortPosition(position);

  return (
    <Link
      to={href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-xl w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{
          default: { duration: 0.22, ease: premiumEasing },
          y: { duration: 0.2, ease: "easeOut" },
        }}
        style={{
          // Slightly lighter card background for contrast
          background: "linear-gradient(180deg, #14161c 0%, #0c0e12 100%)",
          aspectRatio: "3 / 4",
          minHeight: "380px",
          maxHeight: "480px",
          // Position-based glow on hover
          boxShadow: isHovered
            ? `0 28px 56px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px hsl(${positionColors.color} / 0.2), 0 0 40px -8px hsl(${positionColors.color} / 0.25)`
            : "0 6px 20px -6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Position-colored top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] z-30"
          style={{ 
            background: `linear-gradient(90deg, hsl(${positionColors.color}) 0%, hsl(${positionColors.color} / 0.5) 100%)`,
          }}
        />

        {/* Full-height Image Container */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Placeholder */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(145deg, #18191f 0%, #0a0b0f 100%)" }}
          />

          {/* Image */}
          <img
            src={getOptimizedImageUrl(imageUrl, { width: 900, quality: 85, format: "avif" }) || imageUrl}
            srcSet={getResponsiveSrcSet(imageUrl, [450, 900], 85) || undefined}
            sizes="(max-width: 767px) 50vw, 400px"
            alt={name}
            loading="eager"
            decoding="async"
            width={900}
            height={1200}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{
              transform: isHovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.32s ease-out',
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = imageUrl; }}
          />

          {/* Clean bottom gradient only - no side shadows */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, 
                transparent 0%, 
                transparent 45%, 
                rgba(10, 12, 18, 0.6) 70%, 
                rgba(10, 12, 18, 0.95) 100%)`,
            }}
          />
        </div>

        {/* ━━━ TOP HEADER — Position badge only ━━━ */}
        <div className="absolute top-0 left-0 right-0 pt-3.5 px-3.5 z-20">
          <div 
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: `hsl(${positionColors.color} / 0.15)`,
              border: `1px solid hsl(${positionColors.color} / 0.3)`,
              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.3), 0 0 16px hsl(${positionColors.color} / 0.15)`,
            }}
          >
            <Zap 
              className="w-3.5 h-3.5" 
              style={{ color: `hsl(${positionColors.color})` }}
            />
            <span 
              className="text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ color: `hsl(${positionColors.color})` }}
            >
              {shortPosition}
            </span>
          </div>
        </div>

        {/* ━━━ BOTTOM INFO ZONE ━━━ */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Name - Pure white for maximum contrast */}
          <h3 className="text-white text-[22px] font-bold tracking-tight mb-3 line-clamp-1 drop-shadow-md">
            {name}
          </h3>
          
          {/* Meta row - Light gray secondary info */}
          <div className="flex items-center gap-2 text-[14px] text-zinc-300 font-medium mb-2">
            {age > 0 && <span>{age} anos</span>}
            {age > 0 && nationality && <span className="text-zinc-500">•</span>}
            {nationality && <span>{nationality}</span>}
          </div>
          
          {/* Club - Muted info */}
          {currentClub && (
            <p className="text-zinc-400 text-[13px] font-medium line-clamp-1 mb-3">
              {currentClub}
            </p>
          )}

          {/* Hover CTA with position color */}
          <motion.div
            className="flex items-center gap-2 text-[12px] font-medium tracking-wide pt-2 border-t"
            style={{ 
              borderColor: `hsl(${positionColors.color} / 0.2)`,
              color: isHovered ? `hsl(${positionColors.color})` : 'rgba(255,255,255,0.5)',
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <span>Ver perfil completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.div>
        </div>
      </motion.article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT B — CLUB MODE (Horizontal, data-driven)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ClubScoutingCard({
  id,
  slug,
  name,
  position,
  age,
  nationality,
  currentClub,
  imageUrl,
  isPublic,
  dominantFoot,
  height,
  overallRating,
  physicalStatus,
  competitionName,
  lastReportDate,
  totalMinutes,
  totalMatches,
  playStyle,
  primaryTacticalRole,
  secondaryTacticalRole,
}: AthleteCardPremiumProps) {
  const [isHovered, setIsHovered] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/dashboard/atletas/${id}`;
  
  // Get position-based colors
  const positionColors = getPositionColor(position);
  const shortPosition = getShortPosition(position);

  return (
    <Link
      to={href}
      className="group block w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-xl w-full"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{
          default: { duration: 0.2, ease: premiumEasing },
          y: { duration: 0.15, ease: "easeOut" },
        }}
        style={{
          background: "linear-gradient(180deg, #14161c 0%, #0c0e12 100%)",
          border: `1px solid ${isHovered ? `hsl(${positionColors.color} / 0.3)` : 'rgba(255, 255, 255, 0.06)'}`,
          boxShadow: isHovered
            ? `0 16px 40px -12px rgba(0, 0, 0, 0.6), 0 0 24px -8px hsl(${positionColors.color} / 0.2)`
            : "0 4px 12px -4px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Position-colored left edge indicator */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[3px] z-20"
          style={{ backgroundColor: `hsl(${positionColors.color})` }}
        />

        {/* ━━━ HORIZONTAL LAYOUT: 3 Columns ━━━ */}
        <div className="flex flex-col md:flex-row">
          
          {/* ━━━ COLUMN A: Photo + Identity ━━━ */}
          <div className="flex items-center gap-4 p-4 md:p-5 md:min-w-[280px] md:max-w-[320px] border-b md:border-b-0 md:border-r border-white/[0.04]">
            {/* Photo */}
            <div 
              className="relative flex-shrink-0 w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-lg overflow-hidden"
              style={{ 
                background: "linear-gradient(135deg, #18191f 0%, #0a0b0f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <img
                src={getOptimizedImageUrl(imageUrl, { width: 300, quality: 85, format: "avif" }) || imageUrl}
                alt={name}
                loading="eager"
                decoding="async"
                width={300}
                height={300}
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={(e) => { (e.target as HTMLImageElement).src = imageUrl; }}
              />
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-lg md:text-xl font-bold tracking-tight mb-1 line-clamp-2">
                {name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-zinc-300">
                {age > 0 && <span>{age} anos</span>}
                {nationality && (
                  <>
                    <span className="text-zinc-500">•</span>
                    <span>{nationality}</span>
                  </>
                )}
              </div>
              {currentClub && (
                <p className="text-[12px] text-zinc-400 mt-1 line-clamp-1">{currentClub}</p>
              )}
            </div>
          </div>

          {/* ━━━ COLUMN B: Metrics & Status ━━━ */}
          <div className="flex-1 p-4 md:p-5">
            {/* First Row: Key chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Position with color */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: `hsl(${positionColors.color} / 0.12)`,
                  border: `1px solid hsl(${positionColors.color} / 0.25)`,
                  color: `hsl(${positionColors.color})`,
                }}
              >
                <Zap className="w-3 h-3" />
                {shortPosition}
              </div>

              {/* Foot */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.65)",
                }}
              >
                <span className="text-white/40">Pé:</span>
                {formatFoot(dominantFoot)}
              </div>

              {/* Height */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.65)",
                }}
              >
                <Ruler className="w-3 h-3 text-white/40" />
                {formatHeight(height)}
              </div>
            </div>

            {/* Second Row: Indicator Header */}
            <ClubModeIndicatorRow 
              overallRating={overallRating}
              totalMinutes={totalMinutes}
              totalMatches={totalMatches}
              physicalStatus={physicalStatus}
              playStyle={playStyle}
              primaryTacticalRole={primaryTacticalRole}
              secondaryTacticalRole={secondaryTacticalRole}
            />

            {/* Third Row: Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
              {competitionName && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {competitionName}
                </span>
              )}
              {lastReportDate && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Relatório: {lastReportDate}
                </span>
              )}
            </div>
          </div>

          {/* ━━━ COLUMN C: Action ━━━ */}
          <div className="flex items-center justify-center p-4 md:p-5 md:min-w-[140px] border-t md:border-t-0 md:border-l border-white/[0.04]">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: isHovered ? `hsl(${positionColors.color} / 0.15)` : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${isHovered ? `hsl(${positionColors.color} / 0.3)` : 'rgba(255, 255, 255, 0.08)'}`,
                color: isHovered ? `hsl(${positionColors.color})` : "rgba(255, 255, 255, 0.7)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Ver perfil</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AthleteCardPremium(props: AthleteCardPremiumProps) {
  const { scoutingMode = false, clubMode = false } = props;

  // If scouting mode is OFF or clubMode is OFF, use visual grid mode
  if (!scoutingMode || !clubMode) {
    return <VisualModeCard {...props} />;
  }

  // Scouting mode ON + clubMode ON = horizontal data card
  return <ClubScoutingCard {...props} />;
}
