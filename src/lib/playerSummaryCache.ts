/**
 * playerSummaryCache
 *
 * Cache em memória (escopo de módulo) usado pelo botão "Resumo WhatsApp" para
 * evitar refetch ao alternar entre janelas já consultadas no mesmo atleta.
 *
 * Características:
 *  - Chave: `${playerId}:${windowId}` (ou `${playerId}:__years__`).
 *  - TTL configurável (default 2 min) — janelas baseadas em "agora" (últimos 3 meses,
 *    últimos N jogos, última partida) não devem viver muito para refletir novos jogos.
 *  - Dedupe de promises in-flight: chamadas concorrentes para a mesma chave
 *    compartilham o mesmo fetch.
 *  - Invalidação manual disponível para quando o usuário registrar novos dados.
 */

import type { AggregatedUnifiedStats } from "@/hooks/useUnifiedPlayerStats";

export interface SummaryCacheValue {
  stats: AggregatedUnifiedStats | null;
  matchesCount: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutos

const summaryStore = new Map<string, CacheEntry<SummaryCacheValue>>();
const yearsStore = new Map<string, CacheEntry<number[]>>();
const inFlight = new Map<string, Promise<unknown>>();

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && entry.expiresAt > Date.now();
}

/* ---------- Resumos por janela ---------- */

export function getSummary(playerId: string, windowId: string): SummaryCacheValue | null {
  const entry = summaryStore.get(`${playerId}:${windowId}`);
  return isFresh(entry) ? entry.value : null;
}

export function setSummary(
  playerId: string,
  windowId: string,
  value: SummaryCacheValue,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  summaryStore.set(`${playerId}:${windowId}`, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Executa `loader` apenas se não houver cache fresco; deduplica chamadas
 * concorrentes pela mesma chave.
 */
export async function loadSummary(
  playerId: string,
  windowId: string,
  loader: () => Promise<SummaryCacheValue>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<SummaryCacheValue> {
  const cached = getSummary(playerId, windowId);
  if (cached) return cached;

  const key = `summary:${playerId}:${windowId}`;
  const existing = inFlight.get(key) as Promise<SummaryCacheValue> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await loader();
      setSummary(playerId, windowId, value, ttlMs);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

/* ---------- Anos disponíveis (para popular o select) ---------- */

export async function loadYears(
  playerId: string,
  loader: () => Promise<number[]>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<number[]> {
  const entry = yearsStore.get(playerId);
  if (isFresh(entry)) return entry.value;

  const key = `years:${playerId}`;
  const existing = inFlight.get(key) as Promise<number[]> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const value = await loader();
      yearsStore.set(playerId, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

/* ---------- Invalidação ---------- */

/** Limpa todo o cache de um atleta (resumos + anos). Use após editar stats. */
export function invalidatePlayerSummary(playerId: string): void {
  for (const k of summaryStore.keys()) {
    if (k.startsWith(`${playerId}:`)) summaryStore.delete(k);
  }
  yearsStore.delete(playerId);
}

/** Limpa o cache inteiro (testes / logout). */
export function clearSummaryCache(): void {
  summaryStore.clear();
  yearsStore.clear();
  inFlight.clear();
}
