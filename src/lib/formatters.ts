/**
 * Safe number formatting utilities
 * Prevents runtime crashes when values are null/undefined
 */

/**
 * Safely format a number with fixed decimals.
 * Returns fallback (default "—") if value is null/undefined/NaN/not finite.
 */
export const formatFixed = (
  value: unknown,
  decimals: number = 1,
  fallback: string = "—"
): string => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : fallback;
};

/**
 * Backwards-compatible alias.
 */
export const formatNumber = (value: unknown, decimals: number = 1): string => {
  return formatFixed(value, decimals);
};

/**
 * Format a rating value (0-5 scale)
 * Returns "—" if not a valid number
 */
export const formatRating = (value: unknown): string => {
  return formatNumber(value, 1);
};

/**
 * Format a percentage value
 * Returns "—" if not a valid number
 */
export const formatPercentage = (value: unknown, decimals: number = 1): string => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(decimals)}%` : "—";
};

/**
 * Format currency value (Brazilian Real)
 */
export const formatCurrency = (value: unknown): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
};

/**
 * Format a coefficient (e.g., ×1.30) with 2 decimals
 */
export const formatCoefficient = (value: unknown, prefix: string = "×"): string => {
  const n = Number(value);
  return Number.isFinite(n) ? `${prefix}${n.toFixed(2)}` : "—";
};

/**
 * Format a score (0-100 scale)
 */
export const formatScore = (value: unknown): string => {
  return formatFixed(value, 1);
};

/**
 * Format file size in KB
 */
export const formatFileSize = (bytes: unknown): string => {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  return `${(n / 1024).toFixed(1)} KB`;
};

/**
 * Format market value with currency symbol
 */
export const formatMarketValue = (
  value: unknown,
  symbol: string = "€"
): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  
  if (n >= 1000000) {
    return `${symbol}${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${symbol}${(n / 1000).toFixed(0)}K`;
  }
  return `${symbol}${n.toLocaleString()}`;
};

/**
 * Format market value with more precision (2 decimals for M)
 */
export const formatMarketValuePrecise = (
  value: unknown,
  symbol: string = "€"
): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  
  if (n >= 1000000) {
    return `${symbol}${(n / 1000000).toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `${symbol}${(n / 1000).toFixed(0)}K`;
  }
  return `${symbol}${n.toLocaleString()}`;
};
