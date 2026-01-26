/**
 * Mini-Field Heatmap PDF Component
 * 
 * PDF-compatible version using @react-pdf/renderer:
 * - Uses Svg, Circle, Rect, Line, Polygon primitives
 * - No blur filter (PDF fallback: larger circles with lower opacity + gradient)
 * - Seeded random points for deterministic rendering
 */

import React, { useMemo } from "react";
import { View, Text, Svg, Circle, Rect, Line, G, Polygon, Defs, RadialGradient, Stop, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "@/lib/pdfStyles";
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
// HEATMAP POINT GENERATION (Exact Algorithm - PDF Fallback)
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

/**
 * PDF Fallback: No blur support, so use:
 * - Larger radius (6-10)
 * - Lower opacity (0.15-0.30)
 * - Fewer points for cleaner output
 */
function generateHeatmapPoints(
  percentages: ZoneDistribution,
  seed: string,
  totalPoints: number = 120 // Fewer for PDF
): HeatmapPoint[] {
  const rand = mulberry32(xfnv1a(seed));
  const randRange = (min: number, max: number) => min + (max - min) * rand();

  const points: HeatmapPoint[] = [];

  // Zone Y ranges (attack at top in SVG coordinates)
  const zones: { name: keyof ZoneDistribution; yMin: number; yMax: number }[] = [
    { name: "attack", yMin: 0.02, yMax: 0.33 },
    { name: "midfield", yMin: 0.34, yMax: 0.66 },
    { name: "defense", yMin: 0.67, yMax: 0.98 },
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

      // 70% clustered, 30% uniform
      if (rand() < 0.7 && clusters.length > 0) {
        const cluster = clusters[Math.floor(rand() * clusters.length)];
        x = clamp(cluster.cx + (rand() - 0.5) * 0.18, 0.03, 0.97);
        y = clamp(cluster.cy + (rand() - 0.5) * 0.14, yMin, yMax);
      } else {
        x = randRange(0.03, 0.97);
        y = randRange(yMin, yMax);
      }

      // PDF Fallback: larger radius, lower opacity (no blur)
      points.push({
        x,
        y,
        radius: randRange(6, 10),
        opacity: randRange(0.15, 0.30),
      });
    }
  });

  return points;
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  barContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barLabel: {
    fontSize: 5,
    fontWeight: 600,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
  bottomBarContainer: {
    alignItems: "center",
    marginTop: 3,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 3,
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  legendLabel: {
    fontSize: 6,
    fontWeight: 600,
  },
  legendValue: {
    fontSize: 6,
    color: PDF_COLORS.gray500,
  },
  legendSeparator: {
    fontSize: 6,
    color: PDF_COLORS.gray400,
  },
});

// Colors for intensity bars
const BAR_COLORS = {
  defense: "#0ea5e9", // sky-500
  attack: "#10b981", // emerald-500
  midfield: "#f59e0b", // amber-500
};

// ============================================
// INTENSITY BAR (PDF)
// ============================================

interface IntensityBarPdfProps {
  value: number;
  maxDimension: number;
  orientation: "vertical" | "horizontal";
  color: string;
  thickness?: number;
}

function IntensityBarPdf({ value, maxDimension, orientation, color, thickness = 4 }: IntensityBarPdfProps) {
  const fillSize = Math.max(2, (value / 100) * maxDimension);
  const trackColor = "#27272a"; // zinc-800

  if (orientation === "vertical") {
    return (
      <Svg width={thickness} height={maxDimension} viewBox={`0 0 ${thickness} ${maxDimension}`}>
        {/* Track */}
        <Rect x={0} y={0} width={thickness} height={maxDimension} fill={trackColor} rx={2} />
        {/* Fill - from bottom */}
        <Rect x={0} y={maxDimension - fillSize} width={thickness} height={fillSize} fill={color} rx={2} opacity={0.7} />
      </Svg>
    );
  }

  // Horizontal
  return (
    <Svg width={maxDimension} height={thickness} viewBox={`0 0 ${maxDimension} ${thickness}`}>
      {/* Track */}
      <Rect x={0} y={0} width={maxDimension} height={thickness} fill={trackColor} rx={2} />
      {/* Fill - centered */}
      <Rect x={(maxDimension - fillSize) / 2} y={0} width={fillSize} height={thickness} fill={color} rx={2} opacity={0.7} />
    </Svg>
  );
}

// ============================================
// COMPONENT
// ============================================

interface MiniFieldHeatmapPdfProps {
  percentages: ZoneDistribution;
  matchId: string;
  playerId: string;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showIntensityBars?: boolean;
}

export function MiniFieldHeatmapPdf({
  percentages,
  matchId,
  playerId,
  width = 90,
  height = 130,
  showLegend = true,
  showIntensityBars = true,
}: MiniFieldHeatmapPdfProps) {
  const seed = `${matchId}:${playerId}`;
  const cleanSeed = seed.replace(/[^a-zA-Z0-9]/g, "");

  const points = useMemo(
    () => generateHeatmapPoints(percentages, seed, 120),
    [percentages.attack, percentages.midfield, percentages.defense, seed]
  );

  const barThickness = 4;
  const barGap = 4;
  const sideBarSpace = showIntensityBars ? barThickness + barGap : 0;
  
  const fieldWidth = width - sideBarSpace * 2;
  const fieldHeight = height;
  const fieldPadding = 3;
  const innerFieldWidth = fieldWidth - fieldPadding * 2;
  const innerFieldHeight = fieldHeight - fieldPadding * 2;

  // Colors
  const fieldBg = "#1a2f1a";
  const lineColor = "#3d5c3d";
  const heatColor = "#10b981";
  const arrowColor = "#4ade80";

  return (
    <View style={styles.container}>
      {/* Main row: left bar + field + right bar */}
      <View style={styles.mainRow}>
        {/* Left bar - DEFENSE */}
        {showIntensityBars && (
          <View style={styles.barContainer}>
            <IntensityBarPdf 
              value={percentages.defense} 
              maxDimension={fieldHeight} 
              orientation="vertical" 
              color={BAR_COLORS.defense}
              thickness={barThickness}
            />
            <Text style={styles.barLabel}>DEF</Text>
          </View>
        )}

        {/* Field SVG */}
        <Svg width={fieldWidth} height={fieldHeight} viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}>
          {/* Gradient definition for heatmap points */}
          <Defs>
            <RadialGradient id={`heatGrad-${cleanSeed}`}>
              <Stop offset="0%" stopColor={heatColor} stopOpacity={0.6} />
              <Stop offset="60%" stopColor={heatColor} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={heatColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Field background */}
          <Rect
            x={fieldPadding}
            y={fieldPadding}
            width={innerFieldWidth}
            height={innerFieldHeight}
            fill={fieldBg}
            rx={2}
          />

          {/* Field outline */}
          <Rect
            x={fieldPadding + 2}
            y={fieldPadding + 2}
            width={innerFieldWidth - 4}
            height={innerFieldHeight - 4}
            stroke={lineColor}
            strokeWidth={0.5}
            fill="none"
            rx={1}
          />

          {/* Center line */}
          <Line
            x1={fieldPadding + 2}
            y1={fieldPadding + innerFieldHeight / 2}
            x2={fieldPadding + innerFieldWidth - 2}
            y2={fieldPadding + innerFieldHeight / 2}
            stroke={lineColor}
            strokeWidth={0.5}
          />

          {/* Center circle */}
          <Circle
            cx={fieldPadding + innerFieldWidth / 2}
            cy={fieldPadding + innerFieldHeight / 2}
            r={Math.min(innerFieldWidth, innerFieldHeight) * 0.1}
            stroke={lineColor}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Top penalty area */}
          <Rect
            x={fieldPadding + innerFieldWidth * 0.2}
            y={fieldPadding + 2}
            width={innerFieldWidth * 0.6}
            height={innerFieldHeight * 0.13}
            stroke={lineColor}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Bottom penalty area */}
          <Rect
            x={fieldPadding + innerFieldWidth * 0.2}
            y={fieldPadding + innerFieldHeight - innerFieldHeight * 0.13 - 2}
            width={innerFieldWidth * 0.6}
            height={innerFieldHeight * 0.13}
            stroke={lineColor}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Heatmap points */}
          <G>
            {points.map((point, i) => (
              <Circle
                key={i}
                cx={fieldPadding + point.x * innerFieldWidth}
                cy={fieldPadding + point.y * innerFieldHeight}
                r={point.radius}
                fill={`url(#heatGrad-${cleanSeed})`}
                opacity={point.opacity}
              />
            ))}
          </G>

          {/* Attack direction arrow */}
          <Polygon
            points={`${fieldWidth / 2 - 4},${fieldPadding + 6} ${fieldWidth / 2 + 4},${fieldPadding + 6} ${fieldWidth / 2},${fieldPadding + 1}`}
            fill={arrowColor}
            opacity={0.5}
          />
        </Svg>

        {/* Right bar - ATTACK */}
        {showIntensityBars && (
          <View style={styles.barContainer}>
            <IntensityBarPdf 
              value={percentages.attack} 
              maxDimension={fieldHeight} 
              orientation="vertical" 
              color={BAR_COLORS.attack}
              thickness={barThickness}
            />
            <Text style={styles.barLabel}>ATA</Text>
          </View>
        )}
      </View>

      {/* Bottom bar - MIDFIELD */}
      {showIntensityBars && (
        <View style={styles.bottomBarContainer}>
          <IntensityBarPdf 
            value={percentages.midfield} 
            maxDimension={fieldWidth - 10} 
            orientation="horizontal" 
            color={BAR_COLORS.midfield}
            thickness={barThickness}
          />
          <Text style={styles.barLabel}>MEI</Text>
        </View>
      )}

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Text style={[styles.legendLabel, { color: BAR_COLORS.attack }]}>ATA</Text>
            <Text style={styles.legendValue}>{percentages.attack}%</Text>
          </View>
          <Text style={styles.legendSeparator}>•</Text>
          <View style={styles.legendItem}>
            <Text style={[styles.legendLabel, { color: BAR_COLORS.midfield }]}>MEI</Text>
            <Text style={styles.legendValue}>{percentages.midfield}%</Text>
          </View>
          <Text style={styles.legendSeparator}>•</Text>
          <View style={styles.legendItem}>
            <Text style={[styles.legendLabel, { color: BAR_COLORS.defense }]}>DEF</Text>
            <Text style={styles.legendValue}>{percentages.defense}%</Text>
          </View>
        </View>
      )}
    </View>
  );
}
