/**
 * Mini-Field Heatmap Component - Premium Scouting Design
 * 
 * Professional soccer field SVG with premium heatmap visualization:
 * - Matte green field (#446c46) with clean markings
 * - Intensity gradient: Yellow (#fabe2e) → Orange (#f03530)
 * - Integrated zone indicators with dominant zone highlight
 * - Deterministic rendering using match_id + player_id seed
 */

import React, { useMemo } from "react";
import type { ZoneDistribution } from "@/lib/postGameAnalysis";

// ============================================
// SEEDED RANDOM (xfnv1a hash + Mulberry32 PRNG)
// ============================================

function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================
// PREMIUM COLORS
// ============================================

const FIELD_COLORS = {
  background: "#446c46",  // Matte green
  lines: "#5a8a5c",       // Lighter green for markings
  linesSubtle: "#3d5c3d", // Subtle markings
};

const HEAT_COLORS = {
  low: "#fabe2e",      // Yellow - weak zones
  medium: "#f7853a",   // Orange transition
  high: "#f03530",     // Red-orange - dominant zones
};

// ============================================
// HEATMAP POINT GENERATION
// ============================================

interface HeatmapPoint {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  intensity: number; // 0-1 for color interpolation
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function generateHeatmapPoints(
  percentages: ZoneDistribution,
  seed: string,
  totalPoints: number = 180
): HeatmapPoint[] {
  const rand = mulberry32(xfnv1a(seed));
  const randRange = (min: number, max: number) => min + (max - min) * rand();

  const points: HeatmapPoint[] = [];

  // Determine dominant zone for intensity scaling
  const maxPercent = Math.max(percentages.attack, percentages.midfield, percentages.defense);
  const minPercent = Math.min(percentages.attack, percentages.midfield, percentages.defense);
  const range = maxPercent - minPercent || 1;

  const zones: { name: keyof ZoneDistribution; yMin: number; yMax: number }[] = [
    { name: "attack", yMin: 0.02, yMax: 0.33 },
    { name: "midfield", yMin: 0.34, yMax: 0.66 },
    { name: "defense", yMin: 0.67, yMax: 0.98 },
  ];

  const N = totalPoints;
  const nDef = Math.round(N * percentages.defense / 100);
  const nMid = Math.round(N * percentages.midfield / 100);
  const nAtt = N - nDef - nMid;

  const pointCounts: Record<keyof ZoneDistribution, number> = {
    defense: nDef,
    midfield: nMid,
    attack: nAtt,
  };

  zones.forEach(({ name, yMin, yMax }) => {
    const nPoints = pointCounts[name];
    const zonePercent = percentages[name];
    // Normalize intensity: 0 = lowest zone, 1 = highest zone
    const intensity = (zonePercent - minPercent) / range;
    
    const numClusters = 2 + Math.floor(rand() * 2);
    const clusters: { cx: number; cy: number }[] = [];
    
    for (let c = 0; c < numClusters; c++) {
      clusters.push({
        cx: randRange(0.15, 0.85),
        cy: randRange(yMin + 0.05, yMax - 0.05),
      });
    }

    for (let i = 0; i < nPoints; i++) {
      let x: number;
      let y: number;

      if (rand() < 0.7 && clusters.length > 0) {
        const cluster = clusters[Math.floor(rand() * clusters.length)];
        x = clamp(cluster.cx + (rand() - 0.5) * 0.18, 0.03, 0.97);
        y = clamp(cluster.cy + (rand() - 0.5) * 0.14, yMin, yMax);
      } else {
        x = randRange(0.03, 0.97);
        y = randRange(yMin, yMax);
      }

      points.push({
        x,
        y,
        radius: randRange(3.5, 6.5),
        opacity: randRange(0.25, 0.5) * (0.6 + intensity * 0.4),
        intensity,
      });
    }
  });

  return points;
}

// Color interpolation for heat gradient
function getHeatColor(intensity: number): string {
  if (intensity < 0.5) {
    // Yellow to Orange
    const t = intensity * 2;
    return lerpColor(HEAT_COLORS.low, HEAT_COLORS.medium, t);
  } else {
    // Orange to Red
    const t = (intensity - 0.5) * 2;
    return lerpColor(HEAT_COLORS.medium, HEAT_COLORS.high, t);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  
  const ar = (ah >> 16) & 0xff;
  const ag = (ah >> 8) & 0xff;
  const ab = ah & 0xff;
  
  const br = (bh >> 16) & 0xff;
  const bg = (bh >> 8) & 0xff;
  const bb = bh & 0xff;
  
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  
  return `rgb(${rr}, ${rg}, ${rb})`;
}

// ============================================
// ZONE INDICATOR COMPONENT
// ============================================

interface ZoneIndicatorProps {
  label: string;
  value: number;
  isDominant: boolean;
  color: string;
  position: "left" | "right" | "bottom";
}

function ZoneIndicator({ label, value, isDominant, color, position }: ZoneIndicatorProps) {
  const isVertical = position !== "bottom";
  
  return (
    <div 
      className={`flex items-center gap-1.5 ${
        isVertical ? "flex-col" : "flex-row"
      } ${isDominant ? "scale-105" : ""}`}
    >
      <div 
        className={`
          flex items-center justify-center font-bold text-[10px] tracking-wide
          ${isDominant 
            ? "bg-white/95 text-zinc-900 shadow-lg shadow-white/20" 
            : "bg-zinc-900/80 text-zinc-300 border border-zinc-700/50"
          }
          ${isVertical ? "w-8 h-5 rounded" : "px-2 h-5 rounded"}
        `}
      >
        {label}
      </div>
      <div 
        className={`
          flex items-center justify-center font-bold text-xs
          ${isDominant 
            ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" 
            : "text-zinc-400"
          }
        `}
        style={{ color: isDominant ? color : undefined }}
      >
        {value}%
      </div>
    </div>
  );
}

// ============================================
// MINI FIELD SVG COMPONENT
// ============================================

interface MiniFieldHeatmapProps {
  percentages: ZoneDistribution;
  matchId: string;
  playerId: string;
  className?: string;
  fullWidth?: boolean;
  showLegend?: boolean;
  showIntensityBars?: boolean;
}

export function MiniFieldHeatmap({
  percentages,
  matchId,
  playerId,
  className = "",
  fullWidth = true,
  showLegend = true,
  showIntensityBars = true,
}: MiniFieldHeatmapProps) {
  const hasData = percentages.defense > 0 || percentages.midfield > 0 || percentages.attack > 0;
  
  const seed = `${matchId}:${playerId}`;
  const filterId = `heatBlur-${seed.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  const points = useMemo(
    () => hasData ? generateHeatmapPoints(percentages, seed, 180) : [],
    [percentages.attack, percentages.midfield, percentages.defense, seed, hasData]
  );

  // Determine dominant zone
  const dominantZone = useMemo(() => {
    if (!hasData) return null;
    if (percentages.attack >= percentages.midfield && percentages.attack >= percentages.defense) return "attack";
    if (percentages.midfield >= percentages.defense) return "midfield";
    return "defense";
  }, [percentages, hasData]);

  if (!hasData) {
    return (
      <div className={`flex flex-col items-center justify-center w-full ${className}`}>
        <div 
          className="relative w-full flex items-center justify-center text-muted-foreground text-sm"
          style={{ paddingBottom: `${100 / 0.65}%` }}
        >
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-lg border border-zinc-800/40">
            Sem dados de campo
          </span>
        </div>
      </div>
    );
  }

  const aspectRatio = 0.65;

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Main container with integrated zone indicators */}
      <div className="relative w-full flex items-stretch gap-2">
        {/* Left zone indicator - DEF */}
        {showIntensityBars && (
          <div className="flex flex-col items-center justify-center py-4">
            <ZoneIndicator 
              label="DEF" 
              value={percentages.defense}
              isDominant={dominantZone === "defense"}
              color={HEAT_COLORS.high}
              position="left"
            />
          </div>
        )}

        {/* Field container */}
        <div 
          className="relative flex-1"
          style={{ paddingBottom: `${100 / aspectRatio}%` }}
        >
          <svg
            className="absolute inset-0 w-full h-full rounded-lg overflow-hidden shadow-xl shadow-black/30"
            viewBox="0 0 100 154"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Definitions */}
            <defs>
              <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
              </filter>
              {/* Gradient for field depth */}
              <linearGradient id={`fieldGrad-${filterId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={FIELD_COLORS.background} stopOpacity="1" />
                <stop offset="50%" stopColor="#3d5c3d" stopOpacity="1" />
                <stop offset="100%" stopColor={FIELD_COLORS.background} stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Field background with gradient */}
            <rect x="0" y="0" width="100" height="154" fill={`url(#fieldGrad-${filterId})`} rx="4" />
            
            {/* Field texture overlay */}
            <rect x="0" y="0" width="100" height="154" fill={FIELD_COLORS.background} opacity="0.85" rx="4" />

            {/* Field markings - premium style */}
            <g stroke={FIELD_COLORS.lines} strokeWidth="0.6" fill="none" opacity="0.7">
              {/* Field outline */}
              <rect x="4" y="4" width="92" height="146" rx="2" />
              {/* Center line */}
              <line x1="4" y1="77" x2="96" y2="77" />
              {/* Center circle */}
              <circle cx="50" cy="77" r="11" />
              {/* Center dot */}
              <circle cx="50" cy="77" r="1" fill={FIELD_COLORS.lines} />
              {/* Top penalty area (attack) */}
              <rect x="22" y="4" width="56" height="20" />
              <rect x="34" y="4" width="32" height="8" />
              <circle cx="50" cy="17" r="0.8" fill={FIELD_COLORS.lines} />
              {/* Bottom penalty area (defense) */}
              <rect x="22" y="130" width="56" height="20" />
              <rect x="34" y="142" width="32" height="8" />
              <circle cx="50" cy="137" r="0.8" fill={FIELD_COLORS.lines} />
              {/* Corner arcs */}
              <path d="M4,7 Q7,4 10,4" />
              <path d="M90,4 Q93,4 96,7" />
              <path d="M4,147 Q4,150 7,150" />
              <path d="M96,147 Q96,150 93,150" />
            </g>

            {/* Zone divider lines (subtle) */}
            <g stroke={FIELD_COLORS.linesSubtle} strokeWidth="0.3" strokeDasharray="2,2" opacity="0.4">
              <line x1="4" y1="51" x2="96" y2="51" />
              <line x1="4" y1="103" x2="96" y2="103" />
            </g>

            {/* Heatmap points with blur and color gradient */}
            <g filter={`url(#${filterId})`}>
              {points.map((point, i) => (
                <circle
                  key={i}
                  cx={4 + point.x * 92}
                  cy={4 + point.y * 146}
                  r={point.radius}
                  fill={getHeatColor(point.intensity)}
                  opacity={point.opacity}
                />
              ))}
            </g>

            {/* Attack direction indicator */}
            <g opacity="0.8">
              <polygon points="44,9 56,9 50,3" fill="#ffffff" opacity="0.6" />
              <text x="50" y="14" textAnchor="middle" fontSize="5" fill="#ffffff" opacity="0.5">▲</text>
            </g>
          </svg>

          {/* Zone labels on field */}
          <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none">
            <div className="flex justify-center">
              <span className="text-[9px] font-medium text-white/40 tracking-widest uppercase">Ataque</span>
            </div>
            <div className="flex justify-center">
              <span className="text-[9px] font-medium text-white/40 tracking-widest uppercase">Meio</span>
            </div>
            <div className="flex justify-center">
              <span className="text-[9px] font-medium text-white/40 tracking-widest uppercase">Defesa</span>
            </div>
          </div>
        </div>

        {/* Right zone indicator - ATA */}
        {showIntensityBars && (
          <div className="flex flex-col items-center justify-center py-4">
            <ZoneIndicator 
              label="ATA" 
              value={percentages.attack}
              isDominant={dominantZone === "attack"}
              color={HEAT_COLORS.high}
              position="right"
            />
          </div>
        )}
      </div>

      {/* Bottom zone indicator - MEI */}
      {showIntensityBars && (
        <div className="flex justify-center mt-3">
          <ZoneIndicator 
            label="MEI" 
            value={percentages.midfield}
            isDominant={dominantZone === "midfield"}
            color={HEAT_COLORS.high}
            position="bottom"
          />
        </div>
      )}

      {/* Heat intensity legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-[9px] text-zinc-500">Baixa</span>
          <div 
            className="w-20 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${HEAT_COLORS.low}, ${HEAT_COLORS.medium}, ${HEAT_COLORS.high})`
            }}
          />
          <span className="text-[9px] text-zinc-500">Alta</span>
        </div>
      )}
    </div>
  );
}
