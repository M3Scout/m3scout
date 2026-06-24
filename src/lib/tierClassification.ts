/**
 * Centralized Tier Classification System
 *
 * Official thresholds (Regra Definitiva):
 * - Tier S: final_coefficient >= 0.9400
 * - Tier A: 0.8500 <= final_coefficient < 0.9400
 * - Tier B: 0.7400 <= final_coefficient < 0.8500
 * - Tier C: 0.6000 <= final_coefficient < 0.7400
 * - Tier D: final_coefficient < 0.6000
 */

export type TierLevel = 'S' | 'A' | 'B' | 'C' | 'D';

export interface TierInfo {
  tier: TierLevel;
  label: string;
  description: string;
  minCoefficient: number | null;
  maxCoefficient: number | null;
}

export function getTierFromCoefficient(coefficient: number): TierLevel {
  if (coefficient >= 0.94) return 'S';
  if (coefficient >= 0.85) return 'A';
  if (coefficient >= 0.74) return 'B';
  if (coefficient >= 0.60) return 'C';
  return 'D';
}

export function getTierInfo(tier: TierLevel): TierInfo {
  switch (tier) {
    case 'S':
      return {
        tier: 'S',
        label: 'Elite',
        description: 'Competições de elite mundial',
        minCoefficient: 0.94,
        maxCoefficient: null,
      };
    case 'A':
      return {
        tier: 'A',
        label: 'Alto',
        description: 'Competições de alto nível',
        minCoefficient: 0.85,
        maxCoefficient: 0.9399,
      };
    case 'B':
      return {
        tier: 'B',
        label: 'Médio',
        description: 'Competições de nível intermediário',
        minCoefficient: 0.74,
        maxCoefficient: 0.8499,
      };
    case 'C':
      return {
        tier: 'C',
        label: 'Base',
        description: 'Competições de base',
        minCoefficient: 0.60,
        maxCoefficient: 0.7399,
      };
    case 'D':
      return {
        tier: 'D',
        label: 'Inferior',
        description: 'Competições de nível inferior',
        minCoefficient: null,
        maxCoefficient: 0.5999,
      };
  }
}

export function getTierColorClasses(tier: TierLevel | string): string {
  switch (tier) {
    case 'S':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    case 'A':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    case 'B':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'C':
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50';
    case 'D':
      return 'bg-red-500/20 text-red-400 border-red-500/50';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50';
  }
}

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

export const TIER_COLORS: Record<string, string> = {
  S: getTierColorClasses('S'),
  A: getTierColorClasses('A'),
  B: getTierColorClasses('B'),
  C: getTierColorClasses('C'),
  D: getTierColorClasses('D'),
};

export const TIER_THRESHOLDS = {
  S: { min: 0.94,  max: null,   label: '>= 0.9400' },
  A: { min: 0.85,  max: 0.9399, label: '0.8500 – 0.9399' },
  B: { min: 0.74,  max: 0.8499, label: '0.7400 – 0.8499' },
  C: { min: 0.60,  max: 0.7399, label: '0.6000 – 0.7399' },
  D: { min: null,  max: 0.5999, label: '< 0.6000' },
} as const;

export function getTierThresholdsTooltip(): Array<{ tier: TierLevel; range: string; colorClass: string }> {
  return [
    { tier: 'S', range: '>= 0.9400',        colorClass: 'text-amber-400' },
    { tier: 'A', range: '0.8500 – 0.9399',  colorClass: 'text-emerald-400' },
    { tier: 'B', range: '0.7400 – 0.8499',  colorClass: 'text-blue-400' },
    { tier: 'C', range: '0.6000 – 0.7399',  colorClass: 'text-zinc-400' },
    { tier: 'D', range: '< 0.6000',         colorClass: 'text-red-400' },
  ];
}
