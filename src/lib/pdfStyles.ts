/**
 * Shared PDF styles and utilities for @react-pdf/renderer
 * Vector-based PDF generation for crisp text at any scale
 */
import { StyleSheet, Font } from "@react-pdf/renderer";

// Register Inter font for PDF (Google Fonts CDN)
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 700 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 800 },
  ],
});

// Design tokens
export const PDF_COLORS = {
  // Base
  white: "#FFFFFF",
  black: "#000000",
  
  // Gray scale
  gray50: "#FAFAFA",
  gray100: "#F4F4F5",
  gray200: "#E4E4E7",
  gray300: "#D4D4D8",
  gray400: "#A1A1AA",
  gray500: "#71717A",
  gray600: "#52525B",
  gray700: "#3F3F46",
  gray800: "#27272A",
  gray900: "#18181B",
  
  // Brand
  brandRed: "#E30613",
  
  // Semantic
  primary: "#18181B",
  secondary: "#71717A",
  muted: "#A1A1AA",
  
  // Accent
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  orange: "#F97316",
  emerald: "#10B981",
};

// Common base styles
export const pdfBaseStyles = StyleSheet.create({
  // Page
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: PDF_COLORS.gray900,
    backgroundColor: PDF_COLORS.white,
  },
  
  // Typography
  h1: {
    fontSize: 24,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
    marginBottom: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 6,
  },
  h3: {
    fontSize: 14,
    fontWeight: 600,
    color: PDF_COLORS.gray900,
    marginBottom: 4,
  },
  h4: {
    fontSize: 12,
    fontWeight: 600,
    color: PDF_COLORS.gray800,
    marginBottom: 4,
  },
  body: {
    fontSize: 10,
    fontWeight: 400,
    color: PDF_COLORS.gray700,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 9,
    fontWeight: 400,
    color: PDF_COLORS.gray500,
  },
  small: {
    fontSize: 8,
    fontWeight: 400,
    color: PDF_COLORS.gray500,
  },
  
  // Layout
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  column: {
    flexDirection: "column",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Cards
  card: {
    backgroundColor: PDF_COLORS.white,
    borderRadius: 8,
    border: `1px solid ${PDF_COLORS.gray200}`,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
  },
  
  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 600,
  },
  badgePrimary: {
    backgroundColor: PDF_COLORS.blue,
    color: PDF_COLORS.white,
  },
  badgeSuccess: {
    backgroundColor: PDF_COLORS.green,
    color: PDF_COLORS.white,
  },
  badgeWarning: {
    backgroundColor: PDF_COLORS.amber,
    color: PDF_COLORS.white,
  },
  badgeDanger: {
    backgroundColor: PDF_COLORS.red,
    color: PDF_COLORS.white,
  },
  
  // Tables
  table: {
    width: "100%",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.gray100,
    borderBottom: `1px solid ${PDF_COLORS.gray300}`,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
    flex: 1,
  },
  tableCellHeader: {
    padding: 8,
    fontSize: 10,
    fontWeight: 600,
    flex: 1,
    color: PDF_COLORS.gray600,
  },
  
  // Grid
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  grid3: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  grid4: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem2: {
    width: "50%",
    padding: 4,
  },
  gridItem3: {
    width: "33.33%",
    padding: 4,
  },
  gridItem4: {
    width: "25%",
    padding: 4,
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: PDF_COLORS.gray200,
    marginVertical: 12,
  },
  dividerBold: {
    height: 2,
    backgroundColor: PDF_COLORS.gray300,
    marginVertical: 16,
  },
  dividerBrand: {
    height: 3,
    backgroundColor: PDF_COLORS.brandRed,
    marginVertical: 16,
  },
  
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: PDF_COLORS.gray400,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
    paddingTop: 12,
  },
});

// Utility functions
export function getScoreColor(score: number): string {
  if (score >= 80) return PDF_COLORS.green;
  if (score >= 60) return PDF_COLORS.blue;
  if (score >= 40) return PDF_COLORS.amber;
  return PDF_COLORS.red;
}

export function getSeverityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "mild" || s === "leve") return PDF_COLORS.green;
  if (s === "medium" || s === "media" || s === "média") return PDF_COLORS.amber;
  if (s === "severe" || s === "grave") return PDF_COLORS.red;
  return PDF_COLORS.gray500;
}

// Position colors for comparison
export const POSITION_COLORS_PDF: Record<string, string> = {
  goalkeeper: PDF_COLORS.violet,
  defender: PDF_COLORS.blue,
  fullback: PDF_COLORS.cyan,
  midfielder_defensive: PDF_COLORS.emerald,
  midfielder: PDF_COLORS.amber,
  winger: PDF_COLORS.orange,
  forward: PDF_COLORS.red,
};

// Format helpers
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "—";
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}
