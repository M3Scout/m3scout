/**
 * Mini-Field Heatmap Component
 * 
 * Renders a mini soccer field SVG with seeded heatmap visualization:
 * - Football field markings (outline, center line, center circle, penalty areas)
 * - Seeded random points with blur for heatmap effect
 * - Deterministic rendering using match_id + player_id seed
 * - Zone distribution: Defense (bottom), Midfield (center), Attack (top)
 */

import React, { useMemo } from "react";
import type { ZoneDistribution } from "@/lib/postGameAnalysis";

// ============================================
// SEEDED RANDOM (xfnv1a hash + Mulberry32 PRNG)
// ============================================

/** FNV-1a hash: string -> uint32 */
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================
// HEATMAP POINT GENERATION (Exact Algorithm)
// ============================================

interface HeatmapPoint {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

/** Helpers */
function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function generateHeatmapPoints(
  percentages: ZoneDistribution,
  seed: string,
  totalPoints: number = 220
): HeatmapPoint[] {
  const rand = mulberry32(xfnv1a(seed));
  const randRange = (min: number, max: number) => min + (max - min) * rand();

  const points: HeatmapPoint[] = [];

  // Zone Y ranges (attack at top in SVG coordinates)
  const zones: { name: keyof ZoneDistribution; yMin: number; yMax: number }[] = [
    { name: "attack", yMin: 0.02, yMax: 0.33 },    // Top third (attack)
    { name: "midfield", yMin: 0.34, yMax: 0.66 },  // Middle third
    { name: "defense", yMin: 0.67, yMax: 0.98 },   // Bottom third (defense)
  ];

  // Calculate points per zone
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
    
    // Create 2-3 cluster centers per zone
    const numClusters = 2 + Math.floor(rand() * 2); // 2 or 3
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

      // 70% clustered, 30% uniform
      if (rand() < 0.7 && clusters.length > 0) {
        // Pick random cluster center
        const cluster = clusters[Math.floor(rand() * clusters.length)];
        // Gaussian-like fake distribution around center
        x = clamp(cluster.cx + (rand() - 0.5) * 0.18, 0.03, 0.97);
        y = clamp(cluster.cy + (rand() - 0.5) * 0.14, yMin, yMax);
      } else {
        // Uniform distribution
        x = randRange(0.03, 0.97);
        y = randRange(yMin, yMax);
      }

      points.push({
        x,
        y,
        radius: randRange(2.5, 5.0),
        opacity: randRange(0.08, 0.18),
      });
    }
  });

  return points;
}

// ============================================
// MINI FIELD SVG COMPONENT
// ============================================

interface MiniFieldHeatmapProps {
  percentages: ZoneDistribution;
  matchId: string;
  playerId: string;
  className?: string;
  /** If true, field expands to fill container width */
  fullWidth?: boolean;
  showLegend?: boolean;
  /** Show intensity bars as overlays */
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
  const seed = `${matchId}:${playerId}`;
  
  const points = useMemo(
    () => generateHeatmapPoints(percentages, seed, 220),
    [percentages.attack, percentages.midfield, percentages.defense, seed]
  );

  // Field uses full width, aspect ratio ~0.7 (width/height)
  const aspectRatio = 0.65;

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Field container - full width with aspect ratio */}
      <div 
        className="relative w-full"
        style={{ paddingBottom: `${100 / aspectRatio}%` }}
      >
        {/* SVG fills container absolutely */}
        <svg
          className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
          viewBox="0 0 100 154"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Definitions: Blur filter */}
          <defs>
            <filter id={`heatBlur-${seed.replace(/[^a-zA-Z0-9]/g, '')}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>

          {/* Field background */}
          <rect x="0" y="0" width="100" height="154" fill="#1a2f1a" rx="3" />

          {/* Field markings */}
          <g stroke="#3d5c3d" strokeWidth="0.8" fill="none">
            {/* Field outline */}
            <rect x="3" y="3" width="94" height="148" rx="2" />
            {/* Center line */}
            <line x1="3" y1="77" x2="97" y2="77" />
            {/* Center circle */}
            <circle cx="50" cy="77" r="12" />
            {/* Top penalty area (attack) */}
            <rect x="20" y="3" width="60" height="22" />
            <rect x="32" y="3" width="36" height="9" />
            {/* Bottom penalty area (defense) */}
            <rect x="20" y="129" width="60" height="22" />
            <rect x="32" y="142" width="36" height="9" />
          </g>

          {/* Heatmap points with blur */}
          <g filter={`url(#heatBlur-${seed.replace(/[^a-zA-Z0-9]/g, '')})`}>
            {points.map((point, i) => (
              <circle
                key={i}
                cx={3 + point.x * 94}
                cy={3 + point.y * 148}
                r={point.radius * 0.8}
                fill="#10b981"
                opacity={point.opacity}
              />
            ))}
          </g>

          {/* Attack direction arrow */}
          <polygon points="44,10 56,10 50,4" fill="#4ade80" opacity="0.6" />
        </svg>

        {/* OVERLAY: Left bar - DEFENSE */}
        {showIntensityBars && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <div 
              className="w-2 rounded-full bg-zinc-800/70 overflow-hidden"
              style={{ height: '70%' }}
            >
              <div 
                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-sky-500/80 to-sky-400/50"
                style={{ height: `${percentages.defense}%` }}
              />
            </div>
            <span className="text-[7px] font-bold text-sky-400/80">DEF</span>
          </div>
        )}

        {/* OVERLAY: Right bar - ATTACK */}
        {showIntensityBars && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <div 
              className="w-2 rounded-full bg-zinc-800/70 overflow-hidden relative"
              style={{ height: '70%' }}
            >
              <div 
                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-500/80 to-emerald-400/50"
                style={{ height: `${percentages.attack}%` }}
              />
            </div>
            <span className="text-[7px] font-bold text-emerald-400/80">ATA</span>
          </div>
        )}
      </div>

      {/* Bottom bar - MIDFIELD (below field) */}
      {showIntensityBars && (
        <div className="flex flex-col items-center mt-2 w-full px-4">
          <div className="h-1.5 w-full rounded-full bg-zinc-800/70 overflow-hidden relative">
            <div 
              className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-amber-500/60 via-amber-400/80 to-amber-500/60"
              style={{ 
                width: `${percentages.midfield}%`,
                left: `${(100 - percentages.midfield) / 2}%`
              }}
            />
          </div>
          <span className="text-[7px] font-bold text-amber-400/80 mt-1">MEI</span>
        </div>
      )}

      {/* Legend (percentage text) */}
      {showLegend && (
        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span><span className="text-emerald-400 font-semibold">ATA</span> {percentages.attack}%</span>
          <span className="text-zinc-600">•</span>
          <span><span className="text-amber-400 font-semibold">MEI</span> {percentages.midfield}%</span>
          <span className="text-zinc-600">•</span>
          <span><span className="text-sky-400 font-semibold">DEF</span> {percentages.defense}%</span>
        </div>
      )}
    </div>
  );
}
