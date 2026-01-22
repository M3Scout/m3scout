import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Flame, Eye, Snowflake, TrendingUp, Activity, DollarSign, FileText, Calendar, Sparkles, User, Ruler, Target } from "lucide-react";
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
  // New field for "Novo" status
  createdAt?: string | null;
}

type PriorityLevel = "high" | "monitoring" | "low";
type StatusLevel = "priority" | "new" | "monitoring";

// Check if athlete was added in the last 30 days
function isNewAthlete(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return created >= thirtyDaysAgo;
}

// Determine status: Priority > New > Monitoring
function getAthleteStatus(priority: PriorityLevel, createdAt?: string | null): StatusLevel {
  if (priority === "high") return "priority";
  if (isNewAthlete(createdAt)) return "new";
  return "monitoring";
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
// Premium Desktop: 450px height, image-centric, slim header
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
  createdAt,
}: AthleteCardPremiumProps & { priority: PriorityLevel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;
  const priorityInfo = priorityConfig[priority];
  const status = getAthleteStatus(priority, createdAt);

  return (
    <Link
      to={href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-md w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        transition={{
          default: { duration: 0.22, ease: premiumEasing },
          y: { duration: 0.18, ease: "easeOut" },
        }}
        style={{
          background: "#0a0c12",
          aspectRatio: "3 / 4",
          minHeight: "380px",
          maxHeight: "480px",
          boxShadow: isHovered
            ? `0 28px 56px -16px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 0 48px -12px ${priorityInfo.glowColor}`
            : "0 6px 20px -6px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Priority indicator bar - top edge */}
        {priority === "high" && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] z-30"
            style={{ backgroundColor: priorityInfo.color }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Full-height Image Container - Image as hero element */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Placeholder */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              imageLoaded ? "opacity-0" : "opacity-100"
            )}
            style={{ background: "linear-gradient(145deg, #12141a 0%, #070910 100%)" }}
          />

          <motion.img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover object-top",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            animate={{ scale: isHovered ? 1.04 : 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          />

          {/* Gradient overlays for depth and legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070910]/25 via-transparent to-transparent" />
        </div>

        {/* ━━━ TOP HEADER — Two separate pills ━━━ */}
        <div className="absolute top-0 left-0 right-0 pt-3.5 px-3.5 z-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Pill: Position */}
            <div 
              className="flex items-center gap-2 px-3 py-2 rounded-md min-h-[32px]"
              style={{
                background: "rgba(10, 12, 18, 0.92)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)",
              }}
            >
              <Zap className="w-3.5 h-3.5 text-white/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/90">
                {getPositionLabel(position)}
              </span>
            </div>

            {/* Right Pill: Status (Priority > New > Monitoring) */}
            {status === "priority" ? (
              <motion.div 
                className="flex items-center gap-2 px-3 py-2 rounded-md min-h-[32px]"
                style={{
                  background: "rgba(10, 12, 18, 0.92)",
                  border: "1px solid rgba(255, 107, 53, 0.35)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 107, 53, 0.15)",
                }}
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flame className="w-3.5 h-3.5" style={{ color: "#FF6B35" }} />
                <span 
                  className="text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: "#FF6B35" }}
                >
                  Prioridade
                </span>
              </motion.div>
            ) : status === "new" ? (
              <motion.div 
                className="flex items-center gap-2 px-3 py-2 rounded-md min-h-[32px]"
                style={{
                  background: "rgba(10, 12, 18, 0.92)",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(59, 130, 246, 0.15)",
                }}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
                <span 
                  className="text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: "#3B82F6" }}
                >
                  Novo
                </span>
              </motion.div>
            ) : (
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-md min-h-[32px]"
                style={{
                  background: "rgba(10, 12, 18, 0.92)",
                  border: "1px solid rgba(30, 215, 96, 0.25)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
                }}
              >
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
              </div>
            )}
          </div>
        </div>

        {/* ━━━ BOTTOM INFO ZONE — Generous padding, clear hierarchy ━━━ */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Name - Primary focus */}
          <h3 className="text-white text-[22px] font-bold tracking-tight mb-3 line-clamp-1 drop-shadow-sm">
            {name}
          </h3>
          
          {/* Meta row - Age & Nationality */}
          <div className="flex items-center gap-2 text-[14px] text-white/60 font-medium mb-2">
            {age > 0 && <span>{age} anos</span>}
            {age > 0 && nationality && <span className="text-white/25">•</span>}
            {nationality && <span>{nationality}</span>}
          </div>
          
          {/* Club - Secondary info */}
          {currentClub && (
            <p className="text-white/40 text-[13px] font-medium line-clamp-1 mb-3">
              {currentClub}
            </p>
          )}

          {/* Hover CTA - Slides up on hover */}
          <motion.div
            className="flex items-center gap-2 text-white/50 text-[12px] font-medium tracking-wide pt-2 border-t border-white/[0.06]"
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
// CARD VARIANT B — CLUB MODE (Horizontal, data-driven, readable)
// Premium horizontal layout: Photo | Data | Action
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
  createdAt,
}: AthleteCardPremiumProps & { priority: PriorityLevel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;
  const priorityInfo = priorityConfig[priority];
  const physicalInfo = physicalStatusLabels[physicalStatus || "fit"];
  const status = getAthleteStatus(priority, createdAt);

  // Border color based on priority
  const borderColor = status === "priority" 
    ? "rgba(255, 107, 53, 0.35)" 
    : status === "new" 
      ? "rgba(59, 130, 246, 0.25)" 
      : "rgba(255, 255, 255, 0.06)";

  return (
    <Link
      to={href}
      className="group block w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-lg w-full"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2, scale: 1.005 }}
        transition={{
          default: { duration: 0.2, ease: premiumEasing },
          y: { duration: 0.15, ease: "easeOut" },
        }}
        style={{
          background: "#0B0D12",
          border: `1px solid ${borderColor}`,
          boxShadow: isHovered
            ? `0 16px 40px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04)${status === "priority" ? ", 0 0 30px -10px rgba(255, 107, 53, 0.2)" : ""}`
            : "0 4px 12px -4px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Priority indicator bar - left edge */}
        {status === "priority" && (
          <motion.div
            className="absolute top-0 left-0 bottom-0 w-[3px] z-20"
            style={{ backgroundColor: "#FF6B35" }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {status === "new" && (
          <div
            className="absolute top-0 left-0 bottom-0 w-[3px] z-20"
            style={{ backgroundColor: "#3B82F6" }}
          />
        )}

        {/* ━━━ HORIZONTAL LAYOUT: 3 Columns ━━━ */}
        <div className="flex flex-col md:flex-row">
          
          {/* ━━━ COLUMN A: Photo + Identity ━━━ */}
          <div className="flex items-center gap-4 p-4 md:p-5 md:min-w-[280px] md:max-w-[320px] border-b md:border-b-0 md:border-r border-white/[0.04]">
            {/* Photo */}
            <div 
              className="relative flex-shrink-0 w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-lg overflow-hidden"
              style={{ 
                background: "linear-gradient(135deg, #12141a 0%, #070910 100%)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <img
                src={imageUrl}
                alt={name}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={cn(
                  "w-full h-full object-cover object-top transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <User className="w-8 h-8 text-white/20" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-lg md:text-xl font-bold tracking-tight mb-1 line-clamp-2">
                {name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-white/60">
                {age > 0 && <span>{age} anos</span>}
                {nationality && (
                  <>
                    <span className="text-white/25">•</span>
                    <span>{nationality}</span>
                  </>
                )}
              </div>
              {currentClub && (
                <p className="text-[12px] text-white/40 mt-1 line-clamp-1">{currentClub}</p>
              )}
            </div>
          </div>

          {/* ━━━ COLUMN B: Metrics & Status ━━━ */}
          <div className="flex-1 p-4 md:p-5">
            {/* First Row: Key chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Position */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "rgba(255, 255, 255, 0.85)",
                }}
              >
                <Zap className="w-3 h-3 text-white/50" />
                {getPositionLabel(position)}
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

              {/* Status Pill */}
              {status === "priority" ? (
                <motion.div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase"
                  style={{
                    background: "rgba(255, 107, 53, 0.12)",
                    border: "1px solid rgba(255, 107, 53, 0.3)",
                    color: "#FF6B35",
                  }}
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Flame className="w-3 h-3" />
                  Prioridade
                </motion.div>
              ) : status === "new" ? (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase"
                  style={{
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    color: "#3B82F6",
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  Novo
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase"
                  style={{
                    background: "rgba(30, 215, 96, 0.08)",
                    border: "1px solid rgba(30, 215, 96, 0.2)",
                    color: "#1ED760",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Monitorado
                </div>
              )}
            </div>

            {/* Second Row: Numeric KPIs */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-3">
              {/* Scout Rating */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
                  <span className="text-sm">⭐</span>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">Scout</div>
                  <div className="text-lg font-bold text-white leading-tight">{overallRating?.toFixed(1) || "—"}</div>
                </div>
              </div>

              {/* Potential */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">Potencial</div>
                  <div className="text-lg font-bold text-white leading-tight">{potentialRating?.toFixed(1) || "—"}</div>
                </div>
              </div>

              {/* Physical Status */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center border"
                  style={{ 
                    background: `${physicalInfo.color}12`,
                    borderColor: `${physicalInfo.color}30`,
                  }}
                >
                  <Activity className="w-4 h-4" style={{ color: physicalInfo.color }} />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">Físico</div>
                  <div className="text-sm font-bold leading-tight" style={{ color: physicalInfo.color }}>{physicalInfo.label}</div>
                </div>
              </div>

              {/* Market Value */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">Valor</div>
                  <div className="text-sm font-bold text-white leading-tight">{formatMarketValue(marketValue)}</div>
                </div>
              </div>

              {/* Estimated Level */}
              {estimatedLevel && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-purple-500/10 border border-purple-500/20">
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">Nível</div>
                    <div className="text-sm font-bold text-purple-300 leading-tight">{estimatedLevel}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Third Row: Meta info (always visible, no hover needed) */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40">
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
                background: isHovered ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: isHovered ? "#fff" : "rgba(255, 255, 255, 0.7)",
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
