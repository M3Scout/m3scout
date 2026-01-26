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
// INTENSITY BAR COMPONENT
// ============================================

interface IntensityBarProps {
  /** Percentage value (0-100) */
  value: number;
  /** Orientation of the bar */
  orientation: "vertical" | "horizontal";
  /** Position relative to field */
  position: "left" | "right" | "bottom";
  /** Label for the bar */
  label: string;
  /** Max dimension (height for vertical, width for horizontal) */
  maxDimension: number;
  /** Bar thickness */
  thickness?: number;
}

function IntensityBar({ 
  value, 
  orientation, 
  position, 
  label, 
  maxDimension,
  thickness = 6 
}: IntensityBarProps) {
  const fillSize = (value / 100) * maxDimension;
  
  // Color based on zone
  const getBarColor = () => {
    switch (position) {
      case "left": return "from-sky-500/60 to-sky-400/40"; // Defense - blue
      case "right": return "from-emerald-500/60 to-emerald-400/40"; // Attack - green
      case "bottom": return "from-amber-500/60 to-amber-400/40"; // Midfield - amber
      default: return "from-zinc-500/60 to-zinc-400/40";
    }
  };

  if (orientation === "vertical") {
    // Vertical bar (left or right side)
    return (
      <div 
        className="flex flex-col items-center justify-end"
        style={{ height: maxDimension }}
      >
        {/* Bar track */}
        <div 
          className="relative rounded-full bg-zinc-800/50 overflow-hidden"
          style={{ width: thickness, height: maxDimension }}
        >
          {/* Bar fill - grows from bottom */}
          <div 
            className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${getBarColor()} transition-all`}
            style={{ height: fillSize }}
          />
        </div>
        {/* Label below */}
        <span className="text-[8px] text-muted-foreground mt-1 font-medium">{label}</span>
      </div>
    );
  }

  // Horizontal bar (bottom)
  return (
    <div className="flex flex-col items-center w-full">
      {/* Bar track */}
      <div 
        className="relative rounded-full bg-zinc-800/50 overflow-hidden"
        style={{ height: thickness, width: maxDimension }}
      >
        {/* Bar fill - centered */}
        <div 
          className={`absolute top-0 bottom-0 rounded-full bg-gradient-to-r ${getBarColor()} transition-all`}
          style={{ 
            width: fillSize,
            left: `${(maxDimension - fillSize) / 2}px`
          }}
        />
      </div>
      {/* Label below */}
      <span className="text-[8px] text-muted-foreground mt-1 font-medium">{label}</span>
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
  width?: number;
  height?: number;
  showLegend?: boolean;
  /** Show intensity bars around the field */
  showIntensityBars?: boolean;
}

export function MiniFieldHeatmap({
  percentages,
  matchId,
  playerId,
  className = "",
  width = 140,
  height = 200,
  showLegend = true,
  showIntensityBars = true,
}: MiniFieldHeatmapProps) {
  const seed = `${matchId}:${playerId}`;
  
  const points = useMemo(
    () => generateHeatmapPoints(percentages, seed, 220),
    [percentages.attack, percentages.midfield, percentages.defense, seed]
  );

  // Field dimensions
  const fieldPadding = 4;
  const legendHeight = showLegend ? 20 : 0;
  const barSpace = showIntensityBars ? 24 : 0; // Space for side bars
  const bottomBarSpace = showIntensityBars ? 22 : 0; // Space for bottom bar
  
  const svgWidth = width;
  const svgHeight = height - legendHeight - bottomBarSpace;
  const fieldWidth = svgWidth - fieldPadding * 2 - (showIntensityBars ? barSpace * 2 : 0);
  const fieldHeight = svgHeight - fieldPadding * 2;
  const fieldX = fieldPadding + (showIntensityBars ? barSpace : 0);
  const fieldY = fieldPadding;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Main container with field and side bars */}
      <div className="flex items-center gap-2">
        {/* Left bar - DEFENSE */}
        {showIntensityBars && (
          <IntensityBar
            value={percentages.defense}
            orientation="vertical"
            position="left"
            label="DEF"
            maxDimension={fieldHeight}
            thickness={6}
          />
        )}

        {/* Field SVG */}
        <svg
          width={width - (showIntensityBars ? barSpace * 2 + 16 : 0)}
          height={svgHeight}
          viewBox={`0 0 ${width - (showIntensityBars ? barSpace * 2 + 16 : 0)} ${svgHeight}`}
          className="rounded-md overflow-hidden"
        >
          {/* Definitions: Blur filter */}
          <defs>
            <filter id={`heatBlur-${seed.replace(/[^a-zA-Z0-9]/g, '')}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
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
              points={`${fieldPadding + fieldWidth / 2 - 6},${fieldPadding + 8} ${fieldPadding + fieldWidth / 2 + 6},${fieldPadding + 8} ${fieldPadding + fieldWidth / 2},${fieldPadding + 2}`}
            />
          </g>
        </svg>

        {/* Right bar - ATTACK */}
        {showIntensityBars && (
          <IntensityBar
            value={percentages.attack}
            orientation="vertical"
            position="right"
            label="ATA"
            maxDimension={fieldHeight}
            thickness={6}
          />
        )}
      </div>

      {/* Bottom bar - MIDFIELD */}
      {showIntensityBars && (
        <div className="mt-2 w-full flex justify-center">
          <IntensityBar
            value={percentages.midfield}
            orientation="horizontal"
            position="bottom"
            label="MEI"
            maxDimension={width - (showIntensityBars ? 60 : 0)}
            thickness={6}
          />
        </div>
      )}

      {/* Legend (percentage text) */}
      {showLegend && (
        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
          <span className="text-emerald-400 font-medium">ATA</span>
          <span>{percentages.attack}%</span>
          <span className="text-zinc-500">•</span>
          <span className="text-amber-400 font-medium">MEI</span>
          <span>{percentages.midfield}%</span>
          <span className="text-zinc-500">•</span>
          <span className="text-sky-400 font-medium">DEF</span>
          <span>{percentages.defense}%</span>
        </div>
      )}
    </div>
  );
}
