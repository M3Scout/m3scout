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
