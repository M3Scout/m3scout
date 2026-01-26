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
    hash |= 0;
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
  totalPoints: number = 120 // Fewer points for PDF (larger circles)
): HeatmapPoint[] {
  const rng = mulberry32(hashString(seed));
  const points: HeatmapPoint[] = [];

  const zones: { name: keyof ZoneDistribution; yMin: number; yMax: number }[] = [
    { name: "attack", yMin: 0, yMax: 0.33 },
    { name: "midfield", yMin: 0.33, yMax: 0.66 },
    { name: "defense", yMin: 0.66, yMax: 1 },
  ];

  zones.forEach(({ name, yMin, yMax }) => {
    const zonePercent = percentages[name] / 100;
    const nPoints = Math.round(totalPoints * zonePercent);

    // Cluster centers
    const numClusters = Math.max(1, Math.floor(rng() * 3) + 1);
    const clusters: { cx: number; cy: number }[] = [];

    for (let c = 0; c < numClusters; c++) {
      clusters.push({
        cx: 0.15 + rng() * 0.7,
        cy: yMin + 0.1 + rng() * (yMax - yMin - 0.2),
      });
    }

    for (let i = 0; i < nPoints; i++) {
      const useCluster = rng() < 0.3 && clusters.length > 0;

      let x: number;
      let y: number;

      if (useCluster) {
        const cluster = clusters[Math.floor(rng() * clusters.length)];
        const angle = rng() * Math.PI * 2;
        const radius = rng() * 0.15;
        x = cluster.cx + Math.cos(angle) * radius;
        y = cluster.cy + Math.sin(angle) * radius * 0.5;
      } else {
        x = 0.05 + rng() * 0.9;
        y = yMin + rng() * (yMax - yMin);
      }

      x = Math.max(0.02, Math.min(0.98, x));
      y = Math.max(yMin + 0.02, Math.min(yMax - 0.02, y));

      // Larger circles for PDF fallback (no blur)
      points.push({
        x,
        y,
        radius: 4 + rng() * 4, // 4-8 (larger for visibility without blur)
        opacity: 0.25 + rng() * 0.25, // 0.25-0.5 (lower for overlay effect)
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
    color: PDF_COLORS.emerald,
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
}

export function MiniFieldHeatmapPdf({
  percentages,
  matchId,
  playerId,
  width = 90,
  height = 130,
  showLegend = true,
}: MiniFieldHeatmapPdfProps) {
  const seed = `${matchId}:${playerId}`;
  const cleanSeed = seed.replace(/[^a-zA-Z0-9]/g, "");

  const points = useMemo(
    () => generateHeatmapPoints(percentages, seed, 120),
    [percentages.attack, percentages.midfield, percentages.defense, seed]
  );

  const fieldPadding = 3;
  const fieldWidth = width - fieldPadding * 2;
  const fieldHeight = height - fieldPadding * 2;

  // Colors
  const fieldBg = "#1a2f1a";
  const lineColor = "#3d5c3d";
  const heatColor = "#10b981";
  const arrowColor = "#4ade80";

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
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
          width={fieldWidth}
          height={fieldHeight}
          fill={fieldBg}
          rx={2}
        />

        {/* Field outline */}
        <Rect
          x={fieldPadding + 2}
          y={fieldPadding + 2}
          width={fieldWidth - 4}
          height={fieldHeight - 4}
          stroke={lineColor}
          strokeWidth={0.5}
          fill="none"
          rx={1}
        />

        {/* Center line */}
        <Line
          x1={fieldPadding + 2}
          y1={fieldPadding + fieldHeight / 2}
          x2={fieldPadding + fieldWidth - 2}
          y2={fieldPadding + fieldHeight / 2}
          stroke={lineColor}
          strokeWidth={0.5}
        />

        {/* Center circle */}
        <Circle
          cx={fieldPadding + fieldWidth / 2}
          cy={fieldPadding + fieldHeight / 2}
          r={Math.min(fieldWidth, fieldHeight) * 0.1}
          stroke={lineColor}
          strokeWidth={0.5}
          fill="none"
        />

        {/* Top penalty area */}
        <Rect
          x={fieldPadding + fieldWidth * 0.2}
          y={fieldPadding + 2}
          width={fieldWidth * 0.6}
          height={fieldHeight * 0.13}
          stroke={lineColor}
          strokeWidth={0.5}
          fill="none"
        />

        {/* Bottom penalty area */}
        <Rect
          x={fieldPadding + fieldWidth * 0.2}
          y={fieldPadding + fieldHeight - fieldHeight * 0.13 - 2}
          width={fieldWidth * 0.6}
          height={fieldHeight * 0.13}
          stroke={lineColor}
          strokeWidth={0.5}
          fill="none"
        />

        {/* Heatmap points (no blur filter in PDF, use gradient + larger circles) */}
        <G>
          {points.map((point, i) => (
            <Circle
              key={i}
              cx={fieldPadding + point.x * fieldWidth}
              cy={fieldPadding + point.y * fieldHeight}
              r={point.radius}
              fill={`url(#heatGrad-${cleanSeed})`}
              opacity={point.opacity}
            />
          ))}
        </G>

        {/* Attack direction arrow */}
        <Polygon
          points={`${width / 2 - 4},${fieldPadding + 6} ${width / 2 + 4},${fieldPadding + 6} ${width / 2},${fieldPadding + 1}`}
          fill={arrowColor}
          opacity={0.5}
        />
      </Svg>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Text style={styles.legendLabel}>ATA</Text>
            <Text style={styles.legendValue}>{percentages.attack}%</Text>
          </View>
          <Text style={styles.legendSeparator}>•</Text>
          <View style={styles.legendItem}>
            <Text style={styles.legendLabel}>MEI</Text>
            <Text style={styles.legendValue}>{percentages.midfield}%</Text>
          </View>
          <Text style={styles.legendSeparator}>•</Text>
          <View style={styles.legendItem}>
            <Text style={styles.legendLabel}>DEF</Text>
            <Text style={styles.legendValue}>{percentages.defense}%</Text>
          </View>
        </View>
      )}
    </View>
  );
}
