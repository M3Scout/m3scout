/**
 * Mini-Field Heatmap PDF Component - Premium Scouting Design
 * 
 * PDF-compatible version using @react-pdf/renderer:
 * - Matte green field (#446c46) with clean markings
 * - Intensity gradient: Yellow (#fabe2e) → Orange (#f03530)
 * - Integrated zone indicators with dominant zone highlight
 * - Seeded random points for deterministic rendering
 */

import React, { useMemo } from "react";
import { View, Text, Svg, Circle, Rect, Line, G, Polygon, Defs, LinearGradient, Stop, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "@/lib/pdfStyles";
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
  background: "#446c46",
  lines: "#5a8a5c",
  linesSubtle: "#3d5c3d",
};

const HEAT_COLORS = {
  low: "#fabe2e",
  medium: "#f7853a",
  high: "#f03530",
};

// ============================================
// HEATMAP POINT GENERATION
// ============================================

interface HeatmapPoint {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  intensity: number;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

/**
 * Professional-grade heatmap point generation for PDF
 * Mimics Wyscout/SofaScore style with:
 * - Adaptive scaling based on activity level
 * - Guaranteed minimum visibility for any participation
 * - High contrast for clear tactical reading
 * - Support for both vertical (portrait) and horizontal (landscape) orientations
 */
function generateHeatmapPoints(
  percentages: ZoneDistribution,
  seed: string,
  totalPoints: number = 350, // Base point count for PDF
  orientation: "vertical" | "horizontal" = "vertical"
): HeatmapPoint[] {
  const rand = mulberry32(xfnv1a(seed));
  const randRange = (min: number, max: number) => min + (max - min) * rand();

  const points: HeatmapPoint[] = [];

  // Calculate total activity to determine adaptive scaling
  const totalActivity = percentages.attack + percentages.midfield + percentages.defense;
  
  // Adaptive intensity multiplier: boost visibility for low activity
  const activityBoost = totalActivity > 0 ? Math.max(1.0, 2.5 - (totalActivity / 100)) : 0;

  const maxPercent = Math.max(percentages.attack, percentages.midfield, percentages.defense);
  const minPercent = Math.min(percentages.attack, percentages.midfield, percentages.defense);
  const range = maxPercent - minPercent || 1;

  // Zone definitions differ by orientation
  // Vertical: zones arranged Y (top=attack, bottom=defense)
  // Horizontal: zones arranged X (left=defense, right=attack)
  const zones: { name: keyof ZoneDistribution; min: number; max: number }[] = orientation === "vertical"
    ? [
        { name: "attack", min: 0.02, max: 0.33 },
        { name: "midfield", min: 0.34, max: 0.66 },
        { name: "defense", min: 0.67, max: 0.98 },
      ]
    : [
        { name: "defense", min: 0.02, max: 0.33 },
        { name: "midfield", min: 0.34, max: 0.66 },
        { name: "attack", min: 0.67, max: 0.98 },
      ];

  // Scale points based on total activity
  const scaledTotal = Math.max(120, Math.round(totalPoints * (0.4 + (totalActivity / 150))));
  
  const nDef = Math.round(scaledTotal * percentages.defense / 100);
  const nMid = Math.round(scaledTotal * percentages.midfield / 100);
  const nAtt = scaledTotal - nDef - nMid;

  const pointCounts: Record<keyof ZoneDistribution, number> = {
    defense: nDef,
    midfield: nMid,
    attack: nAtt,
  };

  zones.forEach(({ name, min, max }) => {
    const nPoints = pointCounts[name];
    if (nPoints === 0) return;
    
    const zonePercent = percentages[name];
    // Ensure minimum intensity of 0.3 so even low zones are visible
    const rawIntensity = (zonePercent - minPercent) / range;
    const intensity = 0.3 + rawIntensity * 0.7;
    
    // Fewer, more concentrated clusters
    const numClusters = 2 + Math.floor(rand() * 3);
    const clusters: { cx: number; cy: number; weight: number }[] = [];
    
    for (let c = 0; c < numClusters; c++) {
      if (orientation === "vertical") {
        clusters.push({
          cx: randRange(0.15, 0.85),
          cy: randRange(min + 0.05, max - 0.05),
          weight: randRange(0.5, 1.0),
        });
      } else {
        // Horizontal: X is the zone axis, Y is lateral spread
        clusters.push({
          cx: randRange(min + 0.05, max - 0.05),
          cy: randRange(0.15, 0.85),
          weight: randRange(0.5, 1.0),
        });
      }
    }

    for (let i = 0; i < nPoints; i++) {
      let x: number;
      let y: number;

      // 95% clustered for dense hotspots
      if (rand() < 0.95 && clusters.length > 0) {
        const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);
        let r = rand() * totalWeight;
        let cluster = clusters[0];
        for (const c of clusters) {
          r -= c.weight;
          if (r <= 0) { cluster = c; break; }
        }
        
        const spread = randRange(0.04, 0.10);
        if (orientation === "vertical") {
          x = clamp(cluster.cx + (rand() - 0.5) * spread * 2, 0.05, 0.95);
          y = clamp(cluster.cy + (rand() - 0.5) * spread * 1.5, min, max);
        } else {
          x = clamp(cluster.cx + (rand() - 0.5) * spread * 1.5, min, max);
          y = clamp(cluster.cy + (rand() - 0.5) * spread * 2, 0.05, 0.95);
        }
      } else {
        if (orientation === "vertical") {
          x = randRange(0.10, 0.90);
          y = randRange(min, max);
        } else {
          x = randRange(min, max);
          y = randRange(0.10, 0.90);
        }
      }

      // Larger, more visible points with adaptive sizing
      const baseRadius = randRange(1.4, 2.4) * (0.8 + activityBoost * 0.3);
      
      // High opacity with activity boost
      const baseOpacity = randRange(0.45, 0.75);
      const boostedOpacity = Math.min(0.90, baseOpacity * activityBoost * intensity);

      points.push({
        x,
        y,
        radius: baseRadius,
        opacity: Math.max(0.40, boostedOpacity),
        intensity,
      });
    }
  });

  return points;
}

// Color interpolation
function getHeatColor(intensity: number): string {
  if (intensity < 0.5) {
    const t = intensity * 2;
    return lerpColor(HEAT_COLORS.low, HEAT_COLORS.medium, t);
  } else {
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
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zoneIndicator: {
    alignItems: "center",
    gap: 2,
  },
  zoneLabelNormal: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: "#18181b",
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "#3f3f46",
  },
  zoneLabelDominant: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  zoneLabelTextNormal: {
    fontSize: 6,
    fontWeight: 700,
    color: "#a1a1aa",
  },
  zoneLabelTextDominant: {
    fontSize: 6,
    fontWeight: 700,
    color: "#18181b",
  },
  zoneValueNormal: {
    fontSize: 7,
    fontWeight: 600,
    color: "#71717a",
  },
  zoneValueDominant: {
    fontSize: 7,
    fontWeight: 700,
  },
  bottomZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 4,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  legendText: {
    fontSize: 6,
    color: "#71717a",
  },
});

// ============================================
// ZONE INDICATOR PDF COMPONENT
// ============================================

interface ZoneIndicatorPdfProps {
  label: string;
  value: number;
  isDominant: boolean;
  color: string;
}

function ZoneIndicatorPdf({ label, value, isDominant, color }: ZoneIndicatorPdfProps) {
  return (
    <View style={styles.zoneIndicator}>
      <View style={isDominant ? styles.zoneLabelDominant : styles.zoneLabelNormal}>
        <Text style={isDominant ? styles.zoneLabelTextDominant : styles.zoneLabelTextNormal}>
          {label}
        </Text>
      </View>
      <Text 
        style={[
          isDominant ? styles.zoneValueDominant : styles.zoneValueNormal,
          isDominant ? { color } : {}
        ]}
      >
        {value}%
      </Text>
    </View>
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
  /** 
   * Layout orientation for the field:
   * - "vertical" (default): Portrait mode, attack at top, defense at bottom
   * - "horizontal": Landscape mode, defense at left, attack at right
   */
  orientation?: "vertical" | "horizontal";
  /** Minutes played - used to show "Amostra reduzida" badge when < 30 */
  minutesPlayed?: number;
}

export function MiniFieldHeatmapPdf({
  percentages,
  matchId,
  playerId,
  width = 90,
  height = 130,
  showLegend = true,
  showIntensityBars = true,
  orientation = "vertical",
  minutesPlayed,
}: MiniFieldHeatmapPdfProps) {
  const hasData = percentages.defense > 0 || percentages.midfield > 0 || percentages.attack > 0;
  
  const seed = `${matchId}:${playerId}`;
  const cleanSeed = seed.replace(/[^a-zA-Z0-9]/g, "");

  const points = useMemo(
    () => hasData ? generateHeatmapPoints(percentages, seed, 100, orientation) : [],
    [percentages.attack, percentages.midfield, percentages.defense, seed, hasData, orientation]
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
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <View style={{
          width: width,
          height: height * 0.6,
          backgroundColor: "#18181b",
          borderRadius: 4,
          borderWidth: 1,
          borderColor: "#27272a",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <Text style={{ fontSize: 8, color: "#71717a" }}>Sem dados de campo</Text>
        </View>
      </View>
    );
  }

  // For horizontal layout, swap width/height logic for the field area
  const isHorizontal = orientation === "horizontal";
  const indicatorSize = showIntensityBars ? 20 : 0;
  
  // Horizontal: indicators at top/bottom, field fills width
  // Vertical: indicators at left/right, field fills height
  const fieldWidth = isHorizontal ? width : width - (indicatorSize * 2);
  const fieldHeight = isHorizontal ? height - (indicatorSize * 2) : height;
  const fieldPadding = 3;
  const innerFieldWidth = fieldWidth - fieldPadding * 2;
  const innerFieldHeight = fieldHeight - fieldPadding * 2;

  // ========== HORIZONTAL LAYOUT ==========
  if (isHorizontal) {
    return (
      <View style={styles.container}>
        {/* Top indicator row - DEF at left side of field */}
        {showIntensityBars && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4, width: fieldWidth }}>
            <ZoneIndicatorPdf 
              label="DEF" 
              value={percentages.defense}
              isDominant={dominantZone === "defense"}
              color={HEAT_COLORS.high}
            />
            <ZoneIndicatorPdf 
              label="MEI" 
              value={percentages.midfield}
              isDominant={dominantZone === "midfield"}
              color={HEAT_COLORS.high}
            />
            <ZoneIndicatorPdf 
              label="ATA" 
              value={percentages.attack}
              isDominant={dominantZone === "attack"}
              color={HEAT_COLORS.high}
            />
          </View>
        )}

        {/* Field SVG - Horizontal (Landscape) */}
        <Svg width={fieldWidth} height={fieldHeight} viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}>
          {/* Field background */}
          <Rect
            x={0}
            y={0}
            width={fieldWidth}
            height={fieldHeight}
            fill={FIELD_COLORS.background}
            rx={3}
          />

          {/* Field outline */}
          <Rect
            x={fieldPadding + 1}
            y={fieldPadding + 1}
            width={innerFieldWidth - 2}
            height={innerFieldHeight - 2}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
            rx={1}
          />

          {/* Center line - VERTICAL for horizontal field */}
          <Line
            x1={fieldPadding + innerFieldWidth / 2}
            y1={fieldPadding + 1}
            x2={fieldPadding + innerFieldWidth / 2}
            y2={fieldPadding + innerFieldHeight - 1}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
          />

          {/* Center circle */}
          <Circle
            cx={fieldPadding + innerFieldWidth / 2}
            cy={fieldPadding + innerFieldHeight / 2}
            r={Math.min(innerFieldWidth, innerFieldHeight) * 0.12}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Center dot */}
          <Circle
            cx={fieldPadding + innerFieldWidth / 2}
            cy={fieldPadding + innerFieldHeight / 2}
            r={1}
            fill={FIELD_COLORS.lines}
          />

          {/* LEFT penalty area (Defense goal) */}
          <Rect
            x={fieldPadding + 1}
            y={fieldPadding + innerFieldHeight * 0.22}
            width={innerFieldWidth * 0.12}
            height={innerFieldHeight * 0.56}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />
          <Rect
            x={fieldPadding + 1}
            y={fieldPadding + innerFieldHeight * 0.35}
            width={innerFieldWidth * 0.05}
            height={innerFieldHeight * 0.30}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />

          {/* RIGHT penalty area (Attack goal) */}
          <Rect
            x={fieldPadding + innerFieldWidth - innerFieldWidth * 0.12 - 1}
            y={fieldPadding + innerFieldHeight * 0.22}
            width={innerFieldWidth * 0.12}
            height={innerFieldHeight * 0.56}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />
          <Rect
            x={fieldPadding + innerFieldWidth - innerFieldWidth * 0.05 - 1}
            y={fieldPadding + innerFieldHeight * 0.35}
            width={innerFieldWidth * 0.05}
            height={innerFieldHeight * 0.30}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Zone divider lines - VERTICAL for horizontal field */}
          <Line
            x1={fieldPadding + innerFieldWidth * 0.33}
            y1={fieldPadding + 1}
            x2={fieldPadding + innerFieldWidth * 0.33}
            y2={fieldPadding + innerFieldHeight - 1}
            stroke={FIELD_COLORS.linesSubtle}
            strokeWidth={0.3}
            strokeDasharray="2,2"
            opacity={0.4}
          />
          <Line
            x1={fieldPadding + innerFieldWidth * 0.67}
            y1={fieldPadding + 1}
            x2={fieldPadding + innerFieldWidth * 0.67}
            y2={fieldPadding + innerFieldHeight - 1}
            stroke={FIELD_COLORS.linesSubtle}
            strokeWidth={0.3}
            strokeDasharray="2,2"
            opacity={0.4}
          />

          {/* Heatmap points */}
          <G>
            {points.map((point, i) => (
              <Circle
                key={i}
                cx={fieldPadding + point.x * innerFieldWidth}
                cy={fieldPadding + point.y * innerFieldHeight}
                r={point.radius}
                fill={getHeatColor(point.intensity)}
                opacity={point.opacity}
              />
            ))}
          </G>

          {/* Attack direction arrow - pointing RIGHT */}
          <Polygon
            points={`${fieldWidth - fieldPadding - 5},${fieldHeight / 2 - 3} ${fieldWidth - fieldPadding - 5},${fieldHeight / 2 + 3} ${fieldWidth - fieldPadding - 1},${fieldHeight / 2}`}
            fill="#ffffff"
            opacity={0.5}
          />
        </Svg>

        {/* Badge "Amostra reduzida" quando minutes_played < 30 */}
        {minutesPlayed !== undefined && minutesPlayed < 30 && (
          <View style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 3,
          }}>
            <View style={{
              paddingVertical: 2,
              paddingHorizontal: 6,
              backgroundColor: "#fef3c7",
              borderRadius: 8,
              borderWidth: 0.5,
              borderColor: "#fcd34d",
            }}>
              <Text style={{
                fontSize: 6,
                color: "#92400e",
                fontWeight: 500,
              }}>
                ⚠ Amostra reduzida ({minutesPlayed} min)
              </Text>
            </View>
          </View>
        )}

        {/* Heat intensity legend */}
        {showLegend && (
          <View style={styles.legend}>
            <Text style={styles.legendText}>Baixa</Text>
            <Svg width={50} height={6} viewBox="0 0 50 6">
              <Defs>
                <LinearGradient id={`heatLegend-${cleanSeed}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={HEAT_COLORS.low} />
                  <Stop offset="50%" stopColor={HEAT_COLORS.medium} />
                  <Stop offset="100%" stopColor={HEAT_COLORS.high} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={50} height={6} fill={`url(#heatLegend-${cleanSeed})`} rx={3} />
            </Svg>
            <Text style={styles.legendText}>Alta</Text>
          </View>
        )}
      </View>
    );
  }

  // ========== VERTICAL LAYOUT (Original) ==========
  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        {/* Left indicator - DEF */}
        {showIntensityBars && (
          <ZoneIndicatorPdf 
            label="DEF" 
            value={percentages.defense}
            isDominant={dominantZone === "defense"}
            color={HEAT_COLORS.high}
          />
        )}

        {/* Field SVG */}
        <Svg width={fieldWidth} height={fieldHeight} viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}>
          {/* Field background */}
          <Rect
            x={0}
            y={0}
            width={fieldWidth}
            height={fieldHeight}
            fill={FIELD_COLORS.background}
            rx={3}
          />

          {/* Field outline */}
          <Rect
            x={fieldPadding + 1}
            y={fieldPadding + 1}
            width={innerFieldWidth - 2}
            height={innerFieldHeight - 2}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
            rx={1}
          />

          {/* Center line */}
          <Line
            x1={fieldPadding + 1}
            y1={fieldPadding + innerFieldHeight / 2}
            x2={fieldPadding + innerFieldWidth - 1}
            y2={fieldPadding + innerFieldHeight / 2}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
          />

          {/* Center circle */}
          <Circle
            cx={fieldPadding + innerFieldWidth / 2}
            cy={fieldPadding + innerFieldHeight / 2}
            r={Math.min(innerFieldWidth, innerFieldHeight) * 0.09}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Center dot */}
          <Circle
            cx={fieldPadding + innerFieldWidth / 2}
            cy={fieldPadding + innerFieldHeight / 2}
            r={0.8}
            fill={FIELD_COLORS.lines}
          />

          {/* Top penalty area */}
          <Rect
            x={fieldPadding + innerFieldWidth * 0.22}
            y={fieldPadding + 1}
            width={innerFieldWidth * 0.56}
            height={innerFieldHeight * 0.13}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />
          <Rect
            x={fieldPadding + innerFieldWidth * 0.35}
            y={fieldPadding + 1}
            width={innerFieldWidth * 0.30}
            height={innerFieldHeight * 0.05}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Bottom penalty area */}
          <Rect
            x={fieldPadding + innerFieldWidth * 0.22}
            y={fieldPadding + innerFieldHeight - innerFieldHeight * 0.13 - 1}
            width={innerFieldWidth * 0.56}
            height={innerFieldHeight * 0.13}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />
          <Rect
            x={fieldPadding + innerFieldWidth * 0.35}
            y={fieldPadding + innerFieldHeight - innerFieldHeight * 0.05 - 1}
            width={innerFieldWidth * 0.30}
            height={innerFieldHeight * 0.05}
            stroke={FIELD_COLORS.lines}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Zone divider lines (subtle dashed) */}
          <Line
            x1={fieldPadding + 1}
            y1={fieldPadding + innerFieldHeight * 0.33}
            x2={fieldPadding + innerFieldWidth - 1}
            y2={fieldPadding + innerFieldHeight * 0.33}
            stroke={FIELD_COLORS.linesSubtle}
            strokeWidth={0.3}
            strokeDasharray="2,2"
            opacity={0.4}
          />
          <Line
            x1={fieldPadding + 1}
            y1={fieldPadding + innerFieldHeight * 0.67}
            x2={fieldPadding + innerFieldWidth - 1}
            y2={fieldPadding + innerFieldHeight * 0.67}
            stroke={FIELD_COLORS.linesSubtle}
            strokeWidth={0.3}
            strokeDasharray="2,2"
            opacity={0.4}
          />

          {/* Heatmap points with color gradient */}
          <G>
            {points.map((point, i) => (
              <Circle
                key={i}
                cx={fieldPadding + point.x * innerFieldWidth}
                cy={fieldPadding + point.y * innerFieldHeight}
                r={point.radius}
                fill={getHeatColor(point.intensity)}
                opacity={point.opacity}
              />
            ))}
          </G>

          {/* Attack direction arrow */}
          <Polygon
            points={`${fieldWidth / 2 - 3},${fieldPadding + 5} ${fieldWidth / 2 + 3},${fieldPadding + 5} ${fieldWidth / 2},${fieldPadding + 1}`}
            fill="#ffffff"
            opacity={0.5}
          />
        </Svg>

        {/* Right indicator - ATA */}
        {showIntensityBars && (
          <ZoneIndicatorPdf 
            label="ATA" 
            value={percentages.attack}
            isDominant={dominantZone === "attack"}
            color={HEAT_COLORS.high}
          />
        )}
      </View>

      {/* Bottom indicator - MEI */}
      {showIntensityBars && (
        <View style={styles.bottomZone}>
          <ZoneIndicatorPdf 
            label="MEI" 
            value={percentages.midfield}
            isDominant={dominantZone === "midfield"}
            color={HEAT_COLORS.high}
          />
        </View>
      )}

      {/* Badge "Amostra reduzida" quando minutes_played < 30 */}
      {minutesPlayed !== undefined && minutesPlayed < 30 && (
        <View style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 3,
        }}>
          <View style={{
            paddingVertical: 2,
            paddingHorizontal: 6,
            backgroundColor: "#fef3c7",
            borderRadius: 8,
            borderWidth: 0.5,
            borderColor: "#fcd34d",
          }}>
            <Text style={{
              fontSize: 6,
              color: "#92400e",
              fontWeight: 500,
            }}>
              ⚠ Amostra reduzida ({minutesPlayed} min)
            </Text>
          </View>
        </View>
      )}

      {/* Heat intensity legend */}
      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendText}>Baixa</Text>
          <Svg width={50} height={6} viewBox="0 0 50 6">
            <Defs>
              <LinearGradient id={`heatLegend-${cleanSeed}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={HEAT_COLORS.low} />
                <Stop offset="50%" stopColor={HEAT_COLORS.medium} />
                <Stop offset="100%" stopColor={HEAT_COLORS.high} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={50} height={6} fill={`url(#heatLegend-${cleanSeed})`} rx={3} />
          </Svg>
          <Text style={styles.legendText}>Alta</Text>
        </View>
      )}
    </View>
  );
}
