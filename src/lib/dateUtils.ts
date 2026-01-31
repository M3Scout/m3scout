/**
 * Date utilities with timezone-safe parsing for Brazilian locale.
 * Prevents UTC offset bugs that shift dates by 1 day.
 */
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Parse a date string safely, preserving the local date.
 * 
 * Handles both:
 * - Full ISO timestamps (e.g., "2026-01-18T10:30:00Z") → uses parseISO
 * - Date-only strings (e.g., "2026-01-18") → parsed as local date to avoid UTC shift
 * 
 * This prevents the common bug where "2026-01-18" becomes "2026-01-17" 
 * when the browser interprets it as UTC midnight and converts to local time.
 * 
 * @param dateStr - ISO date string or date-only string
 * @returns Date object representing the correct local date
 */
export function parseDateSafe(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  
  // If it's a full ISO timestamp (contains 'T'), use parseISO which handles TZ correctly
  if (dateStr.includes("T")) {
    return parseISO(dateStr);
  }
  
  // For date-only strings (YYYY-MM-DD), parse as local date to avoid UTC shift
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  
  return new Date(year, month - 1, day);
}

/**
 * Format a date for display in Brazilian Portuguese.
 * Uses timezone-safe parsing internally.
 * 
 * @param dateStr - ISO date string or date-only string
 * @param formatStr - date-fns format string (default: "dd 'de' MMMM 'de' yyyy")
 * @returns Formatted date string in PT-BR
 * 
 * @example
 * formatDateBR("2026-01-18T10:30:00Z") // "18 de janeiro de 2026"
 * formatDateBR("2026-01-18", "dd/MM/yyyy") // "18/01/2026"
 */
export function formatDateBR(
  dateStr: string | null | undefined,
  formatStr: string = "dd 'de' MMMM 'de' yyyy"
): string {
  const date = parseDateSafe(dateStr);
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Format a date in short Brazilian format (dd/MM/yyyy).
 * 
 * @param dateStr - ISO date string or date-only string
 * @returns Formatted date string like "18/01/2026"
 */
export function formatDateShortBR(dateStr: string | null | undefined): string {
  return formatDateBR(dateStr, "dd/MM/yyyy");
}

/**
 * Format a date in abbreviated Brazilian format (dd/MMM/yyyy).
 * Uses timezone-safe parsing.
 * 
 * @param dateStr - ISO date string or date-only string
 * @returns Formatted date string like "18 jan. 2026"
 */
export function formatDateMediumBR(dateStr: string | null | undefined): string {
  const date = parseDateSafe(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Convert a Date object to YYYY-MM-DD string for database storage.
 * This ensures we're storing the local date, not a UTC-shifted date.
 * 
 * @param date - JavaScript Date object
 * @returns String in YYYY-MM-DD format
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the difference in days between two date strings.
 * Uses timezone-safe parsing to ensure accurate calculations.
 * 
 * @param startDateStr - Start date string (YYYY-MM-DD)
 * @param endDateStr - End date string (YYYY-MM-DD), defaults to today
 * @returns Number of days between the dates
 */
export function daysBetween(startDateStr: string, endDateStr?: string | null): number {
  const start = parseDateSafe(startDateStr);
  const end = endDateStr ? parseDateSafe(endDateStr) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
