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

/**
 * Currency codes supported by the system
 */
export type CurrencyCode = "BRL" | "USD" | "EUR";

/**
 * Currency configuration for display
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BRL: "R$",
  USD: "$",
  EUR: "€",
};

/**
 * Format a financial value with proper currency formatting
 * This is for display purposes, showing full formatted value
 */
export const formatFinancialValue = (
  value: unknown,
  currency: CurrencyCode = "BRL"
): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Não informado";

  const locales: Record<CurrencyCode, string> = {
    BRL: "pt-BR",
    USD: "en-US",
    EUR: "de-DE",
  };

  const symbol = CURRENCY_SYMBOLS[currency];
  const locale = locales[currency];

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  return `${symbol} ${formatted}`;
};

/**
 * Format a compact financial value (with K/M abbreviations)
 */
export const formatFinancialCompact = (
  value: unknown,
  currency: CurrencyCode = "BRL"
): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  const symbol = CURRENCY_SYMBOLS[currency];

  if (n >= 1000000) {
    return `${symbol} ${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${symbol} ${(n / 1000).toFixed(0)}K`;
  }
  return `${symbol} ${n.toLocaleString()}`;
};

/**
 * Format game minute with added time notation (45+X', 90+X')
 * @param seconds - Total seconds elapsed in the period
 * @param period - Current period (1 = first half, 2 = second half)
 * @returns Formatted string like "12'", "45+2'", "67'", "90+4'"
 */
export const formatGameMinute = (
  seconds: number | null | undefined,
  period: number = 1
): string => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "—";
  }

  const totalMinutes = Math.floor(seconds / 60);
  const baseMinute = period === 1 ? 0 : 45;
  const regularTimeLimit = period === 1 ? 45 : 90;
  const periodLimit = 45; // 45 minutes per period in seconds = 2700

  const gameMinute = baseMinute + totalMinutes;

  if (gameMinute >= regularTimeLimit) {
    // Added time
    const addedMinutes = gameMinute - regularTimeLimit + 1;
    return `${regularTimeLimit}+${addedMinutes}'`;
  }

  return `${gameMinute}'`;
};

/**
 * Format seconds to display minute for an event
 * Takes into account period to show correct game minute
 */
export const formatEventMinute = (
  gameTimeSeconds: number | null | undefined,
  period: number = 1
): string => {
  return formatGameMinute(gameTimeSeconds, period);
};

/**
 * Format a presence interval for display
 * Shows entry and exit times in game minute format
 */
export const formatPresenceInterval = (
  enteredSeconds: number,
  exitedSeconds: number | null,
  period: number
): string => {
  const entryMin = formatGameMinute(enteredSeconds, period);
  if (exitedSeconds === null) {
    return `${entryMin} → em campo`;
  }
  const exitMin = formatGameMinute(exitedSeconds, period);
  const durationSeconds = exitedSeconds - enteredSeconds;
  const durationMinutes = Math.floor(durationSeconds / 60);
  return `${entryMin} → ${exitMin} (${durationMinutes} min)`;
};
