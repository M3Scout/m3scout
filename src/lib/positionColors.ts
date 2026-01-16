/**
 * Position Color System
 * Defines consistent colors for each player position for visual scanning
 */

export type PositionCategory = 
  | "goalkeeper" 
  | "defender" 
  | "fullback" 
  | "midfielder_defensive" 
  | "midfielder" 
  | "winger" 
  | "forward";

export interface PositionColorConfig {
  category: PositionCategory;
  color: string;        // Primary color (HSL values)
  textClass: string;    // Tailwind text color class
  bgClass: string;      // Tailwind background class (10-15% opacity)
  borderClass: string;  // Tailwind border class
  accentClass: string;  // For lateral bar / stronger accent
}

// Position to category mapping
const positionCategoryMap: Record<string, PositionCategory> = {
  // Goalkeeper
  "Goleiro": "goalkeeper",
  "GOL": "goalkeeper",
  
  // Defenders
  "Zagueiro": "defender",
  "ZAG": "defender",
  
  // Fullbacks
  "Lateral Direito": "fullback",
  "Lateral Esquerdo": "fullback",
  "LD": "fullback",
  "LE": "fullback",
  
  // Defensive Midfielders
  "Volante": "midfielder_defensive",
  "VOL": "midfielder_defensive",
  
  // Midfielders
  "Meia": "midfielder",
  "Meia Atacante": "midfielder",
  "Meia Ofensivo": "midfielder",
  "MEI": "midfielder",
  "MEA": "midfielder",
  
  // Wingers
  "Ponta Direita": "winger",
  "Ponta Esquerda": "winger",
  "PD": "winger",
  "PE": "winger",
  
  // Forwards
  "Centroavante": "forward",
  "Atacante": "forward",
  "Segundo Atacante": "forward",
  "CA": "forward",
  "ATA": "forward",
};

// Color configurations per category
const categoryColors: Record<PositionCategory, PositionColorConfig> = {
  goalkeeper: {
    category: "goalkeeper",
    color: "267 84% 60%",  // Purple/Violet
    textClass: "text-violet-400",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/30",
    accentClass: "bg-violet-500",
  },
  defender: {
    category: "defender",
    color: "217 91% 60%",  // Blue
    textClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    accentClass: "bg-blue-500",
  },
  fullback: {
    category: "fullback",
    color: "187 85% 53%",  // Cyan
    textClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
    accentClass: "bg-cyan-500",
  },
  midfielder_defensive: {
    category: "midfielder_defensive",
    color: "142 71% 45%",  // Green
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    accentClass: "bg-emerald-500",
  },
  midfielder: {
    category: "midfielder",
    color: "45 93% 47%",   // Yellow/Gold
    textClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    accentClass: "bg-amber-500",
  },
  winger: {
    category: "winger",
    color: "24 95% 53%",   // Orange
    textClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/30",
    accentClass: "bg-orange-500",
  },
  forward: {
    category: "forward",
    color: "0 84% 60%",    // Red
    textClass: "text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/30",
    accentClass: "bg-red-500",
  },
};

// Default color for unknown positions
const defaultColor: PositionColorConfig = {
  category: "midfielder",
  color: "240 5% 65%",
  textClass: "text-zinc-400",
  bgClass: "bg-zinc-500/10",
  borderClass: "border-zinc-500/30",
  accentClass: "bg-zinc-500",
};

/**
 * Get the color configuration for a position
 */
export function getPositionColor(position: string | null | undefined): PositionColorConfig {
  if (!position) return defaultColor;
  
  const category = positionCategoryMap[position];
  if (!category) return defaultColor;
  
  return categoryColors[category];
}

/**
 * Get just the category for a position
 */
export function getPositionCategory(position: string | null | undefined): PositionCategory | null {
  if (!position) return null;
  return positionCategoryMap[position] || null;
}

/**
 * Get all positions for a category
 */
export function getPositionsForCategory(category: PositionCategory): string[] {
  return Object.entries(positionCategoryMap)
    .filter(([_, cat]) => cat === category)
    .map(([pos]) => pos);
}

/**
 * Short position label (for badges)
 */
export function getShortPosition(position: string | null | undefined): string {
  if (!position) return "N/A";
  
  const shortMap: Record<string, string> = {
    "Goleiro": "GOL",
    "Zagueiro": "ZAG",
    "Lateral Direito": "LD",
    "Lateral Esquerdo": "LE",
    "Volante": "VOL",
    "Meia": "MEI",
    "Meia Atacante": "MEA",
    "Meia Ofensivo": "MEO",
    "Ponta Direita": "PD",
    "Ponta Esquerda": "PE",
    "Centroavante": "CA",
    "Atacante": "ATA",
    "Segundo Atacante": "SA",
  };
  
  return shortMap[position] || position;
}

// Export all category colors for reference
export const positionColors = categoryColors;
