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
          boxShadow: isHovered
            ? `0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px -10px ${priorityInfo.glowColor}`
            : "0 4px 12px -4px rgba(0, 0, 0, 0.3)",
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

        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
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
            transition={{ duration: 0.22, ease: "easeOut" }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/50 to-[#070910]/30 opacity-90" />

          {/* ━━━ TOP META BAR ━━━ */}
          <div className="absolute top-0 left-0 right-0 pt-4 px-4">
            <div 
              className="flex items-center justify-between gap-3 min-h-[34px] px-3 py-2 rounded-sm"
              style={{
                background: "rgba(7, 9, 16, 0.72)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Position Badge - Neutral, less emphasis */}
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-white/[0.06]">
                  <Zap className="w-2.5 h-2.5 text-white/50" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/70">
                  {getPositionLabel(position)}
                </span>
              </div>

              {/* Status Badge - Semantic green with indicator */}
              <div className="flex items-center gap-2">
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
                  style={{
                    background: priority === "high" ? priorityInfo.bgColor : "rgba(30, 215, 96, 0.1)",
                    border: `1px solid ${priority === "high" ? priorityInfo.color : "#1ED760"}20`,
                  }}
                >
                  {priority === "high" ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <PriorityIcon className="w-3 h-3" style={{ color: priorityInfo.color }} />
                      </motion.div>
                      <span 
                        className="text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: priorityInfo.color }}
                      >
                        Prioridade
                      </span>
                    </>
                  ) : (
                    <>
                      <span 
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: "#1ED760" }}
                      />
                      <span 
                        className="text-[9px] font-semibold uppercase tracking-[0.1em]"
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

          {/* Player Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-lg font-semibold tracking-tight mb-1.5 line-clamp-1">{name}</h3>
            <p className="text-white/50 text-[13px] font-medium tracking-wide">
              {age > 0 && <span>{age} anos</span>}
              {age > 0 && nationality && <span className="mx-1.5 text-white/20">•</span>}
              {nationality}
              {currentClub && <span className="mx-1.5 text-white/20">•</span>}
              {currentClub && <span className="text-white/30">{currentClub}</span>}
            </p>

            {/* Hover CTA */}
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD VARIANT B — CLUB SCOUTING MODE (Data-driven)
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
          boxShadow: isHovered
            ? `0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px -10px ${priorityInfo.glowColor}`
            : "0 4px 12px -4px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Priority indicator bar - left side */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[3px] z-20"
          style={{ backgroundColor: priorityInfo.color }}
        />

        {/* Image Container - Smaller in Club Mode */}
        <div className="relative aspect-[4/3] overflow-hidden">
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
            animate={{ scale: isHovered ? 1.02 : 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/60 to-[#070910]/30" />

          {/* ━━━ TOP META BAR — CLUB MODE ━━━ */}
          <div className="absolute top-0 left-0 right-0 pt-4 px-4">
            <div 
              className="flex items-center justify-between gap-2 min-h-[36px] px-3 py-2 rounded-sm"
              style={{
                background: "rgba(7, 9, 16, 0.78)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Position Badge - Neutral */}
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-white/[0.06]">
                  <Zap className="w-2.5 h-2.5 text-white/50" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
                  {getPositionLabel(position)}
                </span>
              </div>

              {/* Separator */}
              <div className="w-px h-4 bg-white/10" />

              {/* Status Badge */}
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
                style={{
                  background: "rgba(30, 215, 96, 0.08)",
                  border: "1px solid rgba(30, 215, 96, 0.15)",
                }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: "#1ED760" }}
                />
                <span 
                  className="text-[9px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "#1ED760" }}
                >
                  Monitorado
                </span>
              </div>

              {/* Priority Badge - Only if high */}
              {priority === "high" && (
                <motion.div
                  className="flex items-center gap-1 px-2 py-1 rounded-sm ml-auto"
                  style={{ 
                    background: priorityInfo.bgColor,
                    border: `1px solid ${priorityInfo.color}25`,
                  }}
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Flame className="w-3 h-3" style={{ color: priorityInfo.color }} />
                  <span 
                    className="text-[9px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: priorityInfo.color }}
                  >
                    Hot
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Name overlay on image */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white text-base font-semibold tracking-tight line-clamp-1">{name}</h3>
          </div>
        </div>

        {/* Data Panel - Dense Information */}
        <div className="p-3 space-y-3 border-t border-white/[0.04]">
          {/* Primary Data Row */}
          <div className="flex items-center gap-2 text-[11px] text-white/60 font-medium">
            <span>{age} anos</span>
            <span className="text-white/20">•</span>
            <span>{formatHeight(height)}</span>
            <span className="text-white/20">•</span>
            <span>Pé {formatFoot(dominantFoot)}</span>
          </div>

          {/* Competition */}
          {competitionName && (
            <div className="text-[10px] uppercase tracking-[0.08em] text-white/40 line-clamp-1">
              {competitionName}
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Scout Rating */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-white/[0.03] border border-white/[0.04]">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center bg-amber-500/10">
                <span className="text-[10px] font-bold text-amber-400">⭐</span>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Scout</div>
                <div className="text-sm font-semibold text-white">{overallRating?.toFixed(1) || "—"}</div>
              </div>
            </div>

            {/* Potential */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-white/[0.03] border border-white/[0.04]">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center bg-emerald-500/10">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Potencial</div>
                <div className="text-sm font-semibold text-white">{potentialRating?.toFixed(1) || "—"}</div>
              </div>
            </div>

            {/* Physical Status */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-white/[0.03] border border-white/[0.04]">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: `${physicalInfo.color}15` }}>
                <Activity className="w-3 h-3" style={{ color: physicalInfo.color }} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Físico</div>
                <div className="text-xs font-semibold" style={{ color: physicalInfo.color }}>{physicalInfo.label}</div>
              </div>
            </div>

            {/* Market Value */}
            <div className="flex items-center gap-2 p-2 rounded-sm bg-white/[0.03] border border-white/[0.04]">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center bg-blue-500/10">
                <DollarSign className="w-3 h-3 text-blue-400" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/40">Valor</div>
                <div className="text-xs font-semibold text-white">{formatMarketValue(marketValue)}</div>
              </div>
            </div>
          </div>

          {/* Hover Additional Info */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: premiumEasing }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
                  {lastReportDate && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <FileText className="w-3 h-3" />
                      <span>Último relatório: {lastReportDate}</span>
                    </div>
                  )}
                  {estimatedLevel && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <Calendar className="w-3 h-3" />
                      <span>Nível estimado: {estimatedLevel}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-1 text-white/50 text-[11px] font-medium">
                    <span>Ver análise completa</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Microcopy footer */}
        <div className="px-3 pb-2">
          <p className="text-[9px] uppercase tracking-[0.1em] text-white/20">
            Perfil validado por scout
          </p>
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
