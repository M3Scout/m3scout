import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Flame, Eye, Snowflake, TrendingUp, Activity, DollarSign, FileText, Calendar, Sparkles } from "lucide-react";
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
  createdAt,
}: AthleteCardPremiumProps & { priority: PriorityLevel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const href = isPublic ? `/players/${slug}` : `/app/players/${slug}`;
  const priorityInfo = priorityConfig[priority];
  const physicalInfo = physicalStatusLabels[physicalStatus || "fit"];
  const status = getAthleteStatus(priority, createdAt);

  return (
    <Link
      to={href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.article
        className="relative overflow-hidden rounded-sm flex flex-col w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{
          default: { duration: 0.22, ease: premiumEasing },
          y: { duration: 0.16, ease: "easeOut" },
        }}
        style={{
          background: "#0a0c12",
          aspectRatio: "3 / 4",
          minHeight: "380px",
          maxHeight: "480px",
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

        {/* ━━━ ZONE 1: TOP HEADER — Two separate pills ━━━ */}
        <div className="relative z-10 flex-shrink-0 pt-3.5 px-3.5 pb-3">
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
              <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-white/[0.08]">
                <Zap className="w-3 h-3 text-white/60" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">
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
