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
  low: "#fabe2e",      // Vivid yellow - weak zones
  medium: "#ff6b35",   // Strong orange transition
  high: "#f03530",     // Intense red-orange - dominant zones
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

/**
 * Professional-grade heatmap point generation
 * Mimics Wyscout/SofaScore style with:
 * - Adaptive scaling based on activity level
 * - Guaranteed minimum visibility for any participation
 * - High contrast for clear tactical reading
 */
function generateHeatmapPoints(
  percentages: ZoneDistribution,
  seed: string,
  totalPoints: number = 400 // Base point count
): HeatmapPoint[] {
  const rand = mulberry32(xfnv1a(seed));
  const randRange = (min: number, max: number) => min + (max - min) * rand();

  const points: HeatmapPoint[] = [];

  // Calculate total activity to determine adaptive scaling
  const totalActivity = percentages.attack + percentages.midfield + percentages.defense;
  
  // Adaptive intensity multiplier: boost visibility for low activity
  // Players with any activity should always be visible
  const activityBoost = totalActivity > 0 ? Math.max(1.0, 2.5 - (totalActivity / 100)) : 0;
  
  // Determine dominant zone for intensity scaling
  const maxPercent = Math.max(percentages.attack, percentages.midfield, percentages.defense);
  const minPercent = Math.min(percentages.attack, percentages.midfield, percentages.defense);
  const range = maxPercent - minPercent || 1;

  const zones: { name: keyof ZoneDistribution; yMin: number; yMax: number }[] = [
    { name: "attack", yMin: 0.02, yMax: 0.33 },
    { name: "midfield", yMin: 0.34, yMax: 0.66 },
    { name: "defense", yMin: 0.67, yMax: 0.98 },
  ];

  // Scale points based on total activity - more activity = more points
  const scaledTotal = Math.max(150, Math.round(totalPoints * (0.4 + (totalActivity / 150))));
  
  const nDef = Math.round(scaledTotal * percentages.defense / 100);
  const nMid = Math.round(scaledTotal * percentages.midfield / 100);
  const nAtt = scaledTotal - nDef - nMid;

  const pointCounts: Record<keyof ZoneDistribution, number> = {
    defense: nDef,
    midfield: nMid,
    attack: nAtt,
  };

  zones.forEach(({ name, yMin, yMax }) => {
    const nPoints = pointCounts[name];
    if (nPoints === 0) return;
    
    const zonePercent = percentages[name];
    // Normalize intensity: 0 = lowest zone, 1 = highest zone
    // But ensure minimum of 0.3 so even low zones are visible
    const rawIntensity = (zonePercent - minPercent) / range;
    const intensity = 0.3 + rawIntensity * 0.7; // Range: 0.3 to 1.0
    
    // Create fewer, more concentrated clusters for stronger hotspots
    const numClusters = 2 + Math.floor(rand() * 3); // 2-4 clusters per zone
    const clusters: { cx: number; cy: number; weight: number }[] = [];
    
    for (let c = 0; c < numClusters; c++) {
      clusters.push({
        cx: randRange(0.15, 0.85),
        cy: randRange(yMin + 0.05, yMax - 0.05),
        weight: randRange(0.5, 1.0),
      });
    }

    for (let i = 0; i < nPoints; i++) {
      let x: number;
      let y: number;

      // 95% clustered for very dense, visible hotspots
      if (rand() < 0.95 && clusters.length > 0) {
        const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);
        let r = rand() * totalWeight;
        let cluster = clusters[0];
        for (const c of clusters) {
          r -= c.weight;
          if (r <= 0) { cluster = c; break; }
        }
        
        // Tight clustering for concentrated hotspots
        const spread = randRange(0.04, 0.10);
        x = clamp(cluster.cx + (rand() - 0.5) * spread * 2, 0.05, 0.95);
        y = clamp(cluster.cy + (rand() - 0.5) * spread * 1.5, yMin, yMax);
      } else {
        x = randRange(0.10, 0.90);
        y = randRange(yMin, yMax);
      }

      // Larger, more visible points with adaptive sizing
      const baseRadius = randRange(1.2, 2.2) * (0.8 + activityBoost * 0.3);
      
      // High opacity with activity boost for guaranteed visibility
      // Minimum opacity of 0.35 ensures every point is seen
      const baseOpacity = randRange(0.40, 0.70);
      const boostedOpacity = Math.min(0.85, baseOpacity * activityBoost * intensity);
      
      points.push({
        x,
        y,
        radius: baseRadius,
        opacity: Math.max(0.35, boostedOpacity),
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
    () => hasData ? generateHeatmapPoints(percentages, seed, 400) : [],
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
            {/* Definitions - MINIMAL blur for crisp professional look */}
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
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
