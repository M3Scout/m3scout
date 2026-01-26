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
// SEEDED RANDOM NUMBER GENERATOR (Mulberry32)
// ============================================

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================
// HEATMAP POINT GENERATION
// ============================================

interface HeatmapPoint {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

function generateHeatmapPoints(
  percentages: ZoneDistribution,
  seed: string,
  totalPoints: number = 180
): HeatmapPoint[] {
  const rng = mulberry32(hashString(seed));
  const points: HeatmapPoint[] = [];

  // Zone Y ranges (field is rendered with attack at top, defense at bottom)
  // SVG coordinate system: y=0 at top
  const zones: { name: keyof ZoneDistribution; yMin: number; yMax: number }[] = [
    { name: "attack", yMin: 0, yMax: 0.33 },    // Top third
    { name: "midfield", yMin: 0.33, yMax: 0.66 }, // Middle third
    { name: "defense", yMin: 0.66, yMax: 1 },   // Bottom third
  ];

  zones.forEach(({ name, yMin, yMax }) => {
    const zonePercent = percentages[name] / 100;
    const nPoints = Math.round(totalPoints * zonePercent);

    // Generate cluster centers for more natural distribution
    const numClusters = Math.max(1, Math.floor(rng() * 3) + 1);
    const clusters: { cx: number; cy: number }[] = [];
    
    for (let c = 0; c < numClusters; c++) {
      clusters.push({
        cx: 0.15 + rng() * 0.7, // Avoid edges
        cy: yMin + 0.1 + rng() * (yMax - yMin - 0.2),
      });
    }

    for (let i = 0; i < nPoints; i++) {
      // 30% of points cluster around centers, 70% random in zone
      const useCluster = rng() < 0.3 && clusters.length > 0;

      let x: number;
      let y: number;

      if (useCluster) {
        const cluster = clusters[Math.floor(rng() * clusters.length)];
        // Gaussian-like distribution around cluster
        const angle = rng() * Math.PI * 2;
        const radius = rng() * 0.15;
        x = cluster.cx + Math.cos(angle) * radius;
        y = cluster.cy + Math.sin(angle) * radius * 0.5; // Flatten vertically
      } else {
        x = 0.05 + rng() * 0.9;
        y = yMin + rng() * (yMax - yMin);
      }

      // Clamp to valid range
      x = Math.max(0.02, Math.min(0.98, x));
      y = Math.max(yMin + 0.02, Math.min(yMax - 0.02, y));

      points.push({
        x,
        y,
        radius: 2 + rng() * 2.5, // 2-4.5
        opacity: 0.4 + rng() * 0.35, // 0.4-0.75
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
  width?: number;
  height?: number;
  showLegend?: boolean;
}

export function MiniFieldHeatmap({
  percentages,
  matchId,
  playerId,
  className = "",
  width = 140,
  height = 200,
  showLegend = true,
}: MiniFieldHeatmapProps) {
  const seed = `${matchId}:${playerId}`;
  
  const points = useMemo(
    () => generateHeatmapPoints(percentages, seed, 180),
    [percentages.attack, percentages.midfield, percentages.defense, seed]
  );

  // Field dimensions
  const fieldPadding = 4;
  const fieldWidth = width - fieldPadding * 2;
  const fieldHeight = height - fieldPadding * 2 - (showLegend ? 20 : 0);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={width}
        height={height - (showLegend ? 20 : 0)}
        viewBox={`0 0 ${width} ${height - (showLegend ? 20 : 0)}`}
        className="rounded-md overflow-hidden"
      >
        {/* Definitions: Blur filter and gradient */}
        <defs>
          <filter id={`heatBlur-${seed.replace(/[^a-zA-Z0-9]/g, '')}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          <radialGradient id={`heatGrad-${seed.replace(/[^a-zA-Z0-9]/g, '')}`}>
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Field background */}
        <rect
          x={fieldPadding}
          y={fieldPadding}
          width={fieldWidth}
          height={fieldHeight}
          fill="#1a2f1a"
          rx={3}
        />

        {/* Field markings */}
        <g stroke="#3d5c3d" strokeWidth="1" fill="none">
          {/* Field outline */}
          <rect
            x={fieldPadding + 2}
            y={fieldPadding + 2}
            width={fieldWidth - 4}
            height={fieldHeight - 4}
            rx={2}
          />

          {/* Center line */}
          <line
            x1={fieldPadding + 2}
            y1={fieldPadding + fieldHeight / 2}
            x2={fieldPadding + fieldWidth - 2}
            y2={fieldPadding + fieldHeight / 2}
          />

          {/* Center circle */}
          <circle
            cx={fieldPadding + fieldWidth / 2}
            cy={fieldPadding + fieldHeight / 2}
            r={Math.min(fieldWidth, fieldHeight) * 0.12}
          />

          {/* Top penalty area (attack) */}
          <rect
            x={fieldPadding + fieldWidth * 0.2}
            y={fieldPadding + 2}
            width={fieldWidth * 0.6}
            height={fieldHeight * 0.15}
          />
          {/* Top goal area */}
          <rect
            x={fieldPadding + fieldWidth * 0.32}
            y={fieldPadding + 2}
            width={fieldWidth * 0.36}
            height={fieldHeight * 0.06}
          />

          {/* Bottom penalty area (defense) */}
          <rect
            x={fieldPadding + fieldWidth * 0.2}
            y={fieldPadding + fieldHeight - fieldHeight * 0.15 - 2}
            width={fieldWidth * 0.6}
            height={fieldHeight * 0.15}
          />
          {/* Bottom goal area */}
          <rect
            x={fieldPadding + fieldWidth * 0.32}
            y={fieldPadding + fieldHeight - fieldHeight * 0.06 - 2}
            width={fieldWidth * 0.36}
            height={fieldHeight * 0.06}
          />
        </g>

        {/* Heatmap points with blur */}
        <g filter={`url(#heatBlur-${seed.replace(/[^a-zA-Z0-9]/g, '')})`}>
          {points.map((point, i) => (
            <circle
              key={i}
              cx={fieldPadding + point.x * fieldWidth}
              cy={fieldPadding + point.y * fieldHeight}
              r={point.radius}
              fill="#10b981"
              opacity={point.opacity}
            />
          ))}
        </g>

        {/* Attack direction arrow */}
        <g fill="#4ade80" opacity="0.6">
          <polygon
            points={`${width / 2 - 6},${fieldPadding + 8} ${width / 2 + 6},${fieldPadding + 8} ${width / 2},${fieldPadding + 2}`}
          />
        </g>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
          <span className="text-emerald-400 font-medium">ATA</span>
          <span>{percentages.attack}%</span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 font-medium">MEI</span>
          <span>{percentages.midfield}%</span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 font-medium">DEF</span>
          <span>{percentages.defense}%</span>
        </div>
      )}
    </div>
  );
}
