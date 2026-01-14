/**
 * Centralized Tier Classification System
 * 
 * Official thresholds (Regra Definitiva):
 * - Tier S: coeficiente > 1.01
 * - Tier A: 0.97 <= coeficiente <= 1.01
 * - Tier B: 0.93 <= coeficiente < 0.97
 * - Tier C: 0.89 <= coeficiente < 0.93
 * - Tier D: coeficiente < 0.89
 */

export type TierLevel = 'S' | 'A' | 'B' | 'C' | 'D';

export interface TierInfo {
  tier: TierLevel;
  label: string;
  description: string;
  minCoefficient: number | null;
  maxCoefficient: number | null;
}

/**
 * Get tier from coefficient value
 * Uses the official thresholds defined in the system
 */
export function getTierFromCoefficient(coefficient: number): TierLevel {
  if (coefficient > 1.01) return 'S';
  if (coefficient >= 0.97) return 'A';
  if (coefficient >= 0.93) return 'B';
  if (coefficient >= 0.89) return 'C';
  return 'D';
}

/**
 * Get detailed tier information
 */
export function getTierInfo(tier: TierLevel): TierInfo {
  switch (tier) {
    case 'S':
      return {
        tier: 'S',
        label: 'Elite',
        description: 'Competições de elite mundial',
        minCoefficient: 1.02,
        maxCoefficient: null,
      };
    case 'A':
      return {
        tier: 'A',
        label: 'Alto',
        description: 'Competições de alto nível',
        minCoefficient: 0.97,
        maxCoefficient: 1.01,
      };
    case 'B':
      return {
        tier: 'B',
        label: 'Médio',
        description: 'Competições de nível intermediário',
        minCoefficient: 0.93,
        maxCoefficient: 0.96,
      };
    case 'C':
      return {
        tier: 'C',
        label: 'Base',
        description: 'Competições de base',
        minCoefficient: 0.89,
        maxCoefficient: 0.92,
      };
    case 'D':
      return {
        tier: 'D',
        label: 'Inferior',
        description: 'Competições de nível inferior',
        minCoefficient: null,
        maxCoefficient: 0.88,
      };
  }
}

/**
 * Get CSS classes for tier badge styling
 */
export function getTierColorClasses(tier: TierLevel | string): string {
  switch (tier) {
    case 'S':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    case 'A':
      return 'bg-primary/20 text-primary border-primary/50';
    case 'B':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    case 'C':
      return 'bg-muted text-muted-foreground border-border';
    case 'D':
      return 'bg-destructive/20 text-destructive border-destructive/50';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Get admin badge classes for tier styling
 */
export function getTierAdminBadgeClass(tier: TierLevel | string): string {
  switch (tier) {
    case 'S':
      return 'admin-badge-tier-s';
    case 'A':
      return 'admin-badge-tier-a';
    case 'B':
      return 'admin-badge-tier-b';
    case 'C':
      return 'admin-badge-tier-c';
    case 'D':
      return 'admin-badge-tier-d';
    default:
      return 'admin-badge-tier-c';
  }
}

/**
 * TIER_COLORS constant for backward compatibility
 */
export const TIER_COLORS: Record<string, string> = {
  S: getTierColorClasses('S'),
  A: getTierColorClasses('A'),
  B: getTierColorClasses('B'),
  C: getTierColorClasses('C'),
  D: getTierColorClasses('D'),
};

/**
 * All tier thresholds for display in tooltips
 */
export const TIER_THRESHOLDS = {
  S: { min: 1.02, max: null, label: '> 1.01' },
  A: { min: 0.97, max: 1.01, label: '0.97 – 1.01' },
  B: { min: 0.93, max: 0.96, label: '0.93 – 0.96' },
  C: { min: 0.89, max: 0.92, label: '0.89 – 0.92' },
  D: { min: null, max: 0.88, label: '< 0.89' },
} as const;

/**
 * Get formatted tier thresholds for tooltip display
 */
export function getTierThresholdsTooltip(): Array<{ tier: TierLevel; range: string; colorClass: string }> {
  return [
    { tier: 'S', range: '> 1.01', colorClass: 'text-amber-400' },
    { tier: 'A', range: '0.97 – 1.01', colorClass: 'text-primary' },
    { tier: 'B', range: '0.93 – 0.96', colorClass: 'text-emerald-400' },
    { tier: 'C', range: '0.89 – 0.92', colorClass: 'text-muted-foreground' },
    { tier: 'D', range: '< 0.89', colorClass: 'text-destructive' },
  ];
}
