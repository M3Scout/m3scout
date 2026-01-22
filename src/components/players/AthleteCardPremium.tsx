import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Flame, Eye, Snowflake, TrendingUp, Activity, DollarSign, FileText, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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
  clubMode?: boolean; // A/B toggle: false = Visual, true = Data-driven
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
}

type PriorityLevel = "high" | "monitoring" | "low";

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
  "Meia Atacante": "Meia Atacante",
  "Ponta Esquerda": "Ponta Esquerda",
  "Ponta Direita": "Ponta Direita",
  Atacante: "Atacante",
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

const physicalStatusLabels: Record<string, { label: string; color: string }> = {
  fit: { label: "Apto", color: "#1ED760" },
  attention: { label: "Atenção", color: "#FFB800" },
  recovering: { label: "Retorno", color: "#FF6B35" },
  injured: { label: "Lesionado", color: "#FF4444" },
};

const priorityConfig: Record<PriorityLevel, { icon: typeof Flame; label: string; color: string; bgColor: string; glowColor: string }> = {
  high: {
    icon: Flame,
    label: "Alta Prioridade",
    color: "#FF6B35",
    bgColor: "rgba(255, 107, 53, 0.12)",
    glowColor: "rgba(255, 107, 53, 0.15)",
  },
  monitoring: {
    icon: Eye,
    label: "Monitorando",
    color: "#1ED760",
    bgColor: "rgba(30, 215, 96, 0.1)",
    glowColor: "rgba(30, 215, 96, 0.08)",
  },
  low: {
    icon: Snowflake,
    label: "Baixa Prioridade",
    color: "#6B7280",
    bgColor: "rgba(107, 114, 128, 0.1)",
    glowColor: "transparent",
  },
};

// Animation easing
const premiumEasing = [0.22, 1, 0.36, 1] as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculatePriority(overallRating?: number | null, potentialRating?: number | null): PriorityLevel {
  const overall = overallRating ?? 0;
  const potential = potentialRating ?? 0;
  
  // High priority: high potential (8+) or good overall with growth potential
  if (potential >= 8.5 || (overall >= 7 && potential >= 8)) return "high";
  // Monitoring: decent ratings
  if (overall >= 5 || potential >= 6) return "monitoring";
  // Low: everything else
  return "low";
}

function formatHeight(h: number | null | undefined): string {
  if (!h) return "—";
  const meters = h >= 100 ? h / 100 : h;
  return `${meters.toFixed(2).replace(".", ",")}m`;
}

function formatFoot(foot: string | null | undefined): string {
  if (!foot) return "—";
  return footLabels[foot] || foot;
}

function formatMarketValue(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${Math.round(value / 1000)}k`;
  return `€${value}`;
}

function formatMarketValueRange(value: number | null | undefined): string {
  if (!value) return "A definir";
  const low = Math.round(value * 0.8);
  const high = Math.round(value * 1.3);
  if (value >= 1000000) {
    return `€${(low / 1000000).toFixed(1)}M–€${(high / 1000000).toFixed(1)}M`;
  }
  return `€${Math.round(low / 1000)}k–€${Math.round(high / 1000)}k`;
}

function getPositionLabel(pos: string): string {
  return positionLabels[pos] || pos;
}

// Badge styles - glassmorphism
const badgeStyle = {
  background: "rgba(7, 9, 16, 0.75)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT A — VISUAL MODE (Default / Home-like)
// Premium Desktop: ~390px height, comfortable spacing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VisualModeCard({
  slug,
  name,
  position,
  age,
  nationality,
  currentClub,
  imageUrl,
  isPublic,
  priority,
}: AthleteCardPremiumProps & { priority: PriorityLevel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;
  const priorityInfo = priorityConfig[priority];
  const PriorityIcon = priorityInfo.icon;

  return (
    <Link
      to={href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{
          default: { duration: 0.22, ease: premiumEasing },
          y: { duration: 0.16, ease: "easeOut" },
        }}
        style={{
          background: "#0a0c12",
          minHeight: "390px",
          boxShadow: isHovered
            ? `0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px -10px ${priorityInfo.glowColor}`
            : "0 4px 14px -4px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Priority indicator bar */}
        {priority === "high" && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] z-20"
            style={{ backgroundColor: priorityInfo.color }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Image Container - Taller aspect ratio for premium feel */}
        <div className="relative w-full h-full min-h-[390px] overflow-hidden">
          {/* Placeholder */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              imageLoaded ? "opacity-0" : "opacity-100"
            )}
            style={{ background: "linear-gradient(135deg, #12141a 0%, #070910 100%)" }}
          />

          <motion.img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={cn("w-full h-full object-cover object-top", imageLoaded ? "opacity-100" : "opacity-0")}
            animate={{ scale: isHovered ? 1.03 : 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          />

          {/* Gradient overlay - stronger at bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/45 to-[#070910]/20" />

          {/* ━━━ TOP META BAR — with more breathing room ━━━ */}
          <div className="absolute top-0 left-0 right-0 pt-5 px-4">
            <div 
              className="flex items-center justify-between gap-3 min-h-[36px] px-3.5 py-2.5 rounded-sm"
              style={{
                background: "rgba(7, 9, 16, 0.72)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Position Badge - Neutral, less emphasis */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-white/[0.07]">
                  <Zap className="w-3 h-3 text-white/55" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/75">
                  {getPositionLabel(position)}
                </span>
              </div>

              {/* Status Badge - Semantic green with indicator */}
              <div className="flex items-center gap-2">
                <div 
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm"
                  style={{
                    background: priority === "high" ? priorityInfo.bgColor : "rgba(30, 215, 96, 0.1)",
                    border: `1px solid ${priority === "high" ? priorityInfo.color : "#1ED760"}20`,
                  }}
                >
                  {priority === "high" ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <PriorityIcon className="w-3.5 h-3.5" style={{ color: priorityInfo.color }} />
                      </motion.div>
                      <span 
                        className="text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{ color: priorityInfo.color }}
                      >
                        Prioridade
                      </span>
                    </>
                  ) : (
                    <>
                      <span 
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: "#1ED760" }}
                      />
                      <span 
                        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: "#1ED760" }}
                      >
                        Monitorado
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player Info - More generous spacing */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-white text-xl font-semibold tracking-tight mb-2 line-clamp-1">{name}</h3>
            <p className="text-white/55 text-sm font-medium tracking-wide leading-relaxed">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && <span className="mx-2 text-white/25">•</span>}
              {nationality}
            </p>
            {currentClub && (
              <p className="text-white/35 text-[13px] mt-1.5 line-clamp-1">{currentClub}</p>
            )}

            {/* Hover CTA */}
            <motion.div
              className="flex items-center gap-2 mt-4 text-white/45 text-[12px] font-medium tracking-wide"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <span>Ver perfil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT B — CLUB SCOUTING MODE (Data-driven)
// Premium Desktop Layout: 3 Zones (Header / Image / Info)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ClubScoutingCard({
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
  potentialRating,
  physicalStatus,
  marketValue,
  estimatedLevel,
  competitionName,
  lastReportDate,
  priority,
}: AthleteCardPremiumProps & { priority: PriorityLevel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;
  const priorityInfo = priorityConfig[priority];
  const PriorityIcon = priorityInfo.icon;
  const physicalInfo = physicalStatusLabels[physicalStatus || "fit"];

  return (
    <Link
      to={href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-sm flex flex-col"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{
          default: { duration: 0.22, ease: premiumEasing },
          y: { duration: 0.16, ease: "easeOut" },
        }}
        style={{
          background: "#0a0c12",
          minHeight: "440px",
          boxShadow: isHovered
            ? `0 24px 48px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.05), 0 0 50px -15px ${priorityInfo.glowColor}`
            : "0 4px 16px -4px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Priority indicator bar - left side */}
        <motion.div
          className="absolute top-0 left-0 bottom-0 w-[3px] z-20"
          style={{ backgroundColor: priorityInfo.color }}
          animate={priority === "high" ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ━━━ ZONE 1: FIXED HEADER — 60px ━━━ */}
        <div 
          className="relative z-10 flex-shrink-0 px-4 py-3"
          style={{
            minHeight: "60px",
            background: "linear-gradient(180deg, rgba(7, 9, 16, 0.95) 0%, rgba(7, 9, 16, 0.85) 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <div 
            className="flex items-center justify-between gap-3 h-full"
          >
            {/* Left: Position Badge */}
            <div 
              className="flex items-center gap-2 px-3 py-2 rounded-sm min-h-[32px]"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-white/[0.08]">
                <Zap className="w-3 h-3 text-white/60" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
                {getPositionLabel(position)}
              </span>
            </div>

            {/* Right: Status + Priority Badges */}
            <div className="flex items-center gap-2">
              {/* Status Badge - Monitorado */}
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-sm min-h-[32px]"
                style={{
                  background: "rgba(30, 215, 96, 0.08)",
                  border: "1px solid rgba(30, 215, 96, 0.12)",
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "#1ED760" }}
                />
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "#1ED760" }}
                >
                  Monitorado
                </span>
              </div>

              {/* Priority Badge - High Priority */}
              {priority === "high" && (
                <motion.div
                  className="flex items-center gap-1.5 px-3 py-2 rounded-sm min-h-[32px]"
                  style={{ 
                    background: priorityInfo.bgColor,
                    border: `1px solid ${priorityInfo.color}30`,
                  }}
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <PriorityIcon className="w-3.5 h-3.5" style={{ color: priorityInfo.color }} />
                  <span 
                    className="text-[10px] font-bold uppercase tracking-[0.06em]"
                    style={{ color: priorityInfo.color }}
                  >
                    Prioridade
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* ━━━ ZONE 2: IMAGE AREA ━━━ */}
        <div className="relative flex-shrink-0 h-[180px] overflow-hidden">
          {/* Placeholder */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              imageLoaded ? "opacity-0" : "opacity-100"
            )}
            style={{ background: "linear-gradient(135deg, #12141a 0%, #070910 100%)" }}
          />

          <motion.img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={cn("w-full h-full object-cover object-top", imageLoaded ? "opacity-100" : "opacity-0")}
            animate={{ scale: isHovered ? 1.03 : 1 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-[#0a0c12]/40 to-transparent" />

          {/* Name overlay on image bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-lg font-bold tracking-tight line-clamp-1">{name}</h3>
          </div>
        </div>

        {/* ━━━ ZONE 3: INFO & KPI AREA ━━━ */}
        <div className="flex-1 flex flex-col p-4 pt-3 space-y-3">
          {/* Meta Row: Age, Height, Foot, Competition */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[12px] text-white/70 font-medium">
              <span>{age} anos</span>
              <span className="text-white/20">•</span>
              <span>{formatHeight(height)}</span>
              <span className="text-white/20">•</span>
              <span>Pé {formatFoot(dominantFoot)}</span>
            </div>
            
            {/* Country & Club */}
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              {nationality && <span>{nationality}</span>}
              {currentClub && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-white/40 line-clamp-1">{currentClub}</span>
                </>
              )}
            </div>

            {/* Competition */}
            {competitionName && (
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/40 line-clamp-1 pt-1">
                {competitionName}
              </div>
            )}
          </div>

          {/* KPI Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            {/* Scout Rating */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-sm bg-white/[0.03] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-amber-500/10">
                <span className="text-xs font-bold text-amber-400">⭐</span>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Scout</div>
                <div className="text-base font-bold text-white">{overallRating?.toFixed(1) || "—"}</div>
              </div>
            </div>

            {/* Potential */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-sm bg-white/[0.03] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-emerald-500/10">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Potencial</div>
                <div className="text-base font-bold text-white">{potentialRating?.toFixed(1) || "—"}</div>
              </div>
            </div>

            {/* Physical Status */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-sm bg-white/[0.03] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: `${physicalInfo.color}12` }}>
                <Activity className="w-3.5 h-3.5" style={{ color: physicalInfo.color }} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Físico</div>
                <div className="text-sm font-bold" style={{ color: physicalInfo.color }}>{physicalInfo.label}</div>
              </div>
            </div>

            {/* Market Value */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-sm bg-white/[0.03] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-blue-500/10">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Valor</div>
                <div className="text-sm font-bold text-white">{formatMarketValue(marketValue)}</div>
              </div>
            </div>
          </div>

          {/* Hover Additional Info - Reveals on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: premiumEasing }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-white/[0.05] space-y-2">
                  {lastReportDate && (
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Último relatório: {lastReportDate}</span>
                    </div>
                  )}
                  {estimatedLevel && (
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Nível estimado: {estimatedLevel}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer CTA */}
          <div className="mt-auto pt-2">
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: isHovered ? 1 : 0.6 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-white/25">
                Perfil validado por scout
              </p>
              <motion.div
                className="flex items-center gap-1 text-white/50 text-[11px] font-medium"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <span>Ver análise</span>
                <ArrowRight className="w-3 h-3" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT — EXPORTS BOTH MODES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AthleteCardPremium(props: AthleteCardPremiumProps) {
  const {
    scoutingMode = false,
    clubMode = false,
    overallRating,
    potentialRating,
  } = props;

  // Calculate priority based on ratings
  const priority = calculatePriority(overallRating, potentialRating);

  // If scouting mode is OFF, always use visual mode
  if (!scoutingMode) {
    return <VisualModeCard {...props} priority={priority} />;
  }

  // If scouting mode is ON, check clubMode toggle
  if (clubMode) {
    return <ClubScoutingCard {...props} priority={priority} />;
  }

  // Scouting mode ON but clubMode OFF = Visual with priority indicators
  return <VisualModeCard {...props} priority={priority} />;
}
