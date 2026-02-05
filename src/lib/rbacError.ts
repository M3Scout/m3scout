/**
 * RBAC Error Classification
 * 
 * CRITICAL: Proper classification prevents auth loops:
 * - 401: Token invalid → refresh once, retry once
 * - 403: Permission denied (RLS) → NEVER refresh, show error
 * - Network/timeout: Retry with backoff, use cache fallback
 */

export type RbacErrorType = "401" | "403" | "timeout" | "abort" | "network" | "pgrst116" | "exception";

export interface ClassifiedError {
  type: RbacErrorType;
  shouldRefreshToken: boolean;
  shouldRetry: boolean;
  shouldLogout: boolean;
  message: string;
}

export function classifyRbacError(err: any): ClassifiedError {
  const code = err?.code ?? err?.error?.code;
  const status = err?.status ?? err?.statusCode ?? err?.error?.status;
  const message = String(err?.message ?? err?.error_description ?? "");
  const lowerMessage = message.toLowerCase();

  // 401 - Token invalid/expired → refresh once
  if (status === 401 || code === "401" || lowerMessage.includes("jwt expired")) {
    return {
      type: "401",
      shouldRefreshToken: true, // Try refresh ONCE
      shouldRetry: true,        // Retry ONCE after refresh
      shouldLogout: false,      // Only logout if refresh fails
      message: "Sessão expirada"
    };
  }

  // 403 - Permission denied (RLS/access) → NEVER refresh, just show error
  if (status === 403 || code === "403" || code === "PGRST301" || code === "42501") {
    return {
      type: "403",
      shouldRefreshToken: false, // NEVER refresh for permission errors
      shouldRetry: false,        // Don't retry permission errors
      shouldLogout: false,       // Don't logout, just show permission error
      message: "Acesso negado"
    };
  }

  // PGRST116 - Row not found (no permissions row)
  if (code === "PGRST116" || message.includes("PGRST116")) {
    return {
      type: "pgrst116",
      shouldRefreshToken: false,
      shouldRetry: false,
      shouldLogout: false,
      message: "Dados não encontrados"
    };
  }

  // AbortError - Request cancelled (navigation, etc) → ignore
  if (err?.name === "AbortError" || lowerMessage.includes("aborted")) {
    return {
      type: "abort",
      shouldRefreshToken: false,
      shouldRetry: false,
      shouldLogout: false,
      message: "Requisição cancelada"
    };
  }

  // Timeout
  if (lowerMessage.includes("timeout") || code === "ETIMEDOUT") {
    return {
      type: "timeout",
      shouldRefreshToken: false,
      shouldRetry: true,  // Retry with backoff
      shouldLogout: false,
      message: "Tempo esgotado"
    };
  }

  // Network error
  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("load failed") ||
    status === 0
  ) {
    return {
      type: "network",
      shouldRefreshToken: false,
      shouldRetry: true,  // Retry with backoff
      shouldLogout: false,
      message: "Erro de rede"
    };
  }

  // Unknown exception
  return {
    type: "exception",
    shouldRefreshToken: false,
    shouldRetry: true,  // Maybe transient, try retry
    shouldLogout: false,
    message: message || "Erro desconhecido"
  };
}

/**
 * Quick check if error is 401 (token issue)
 */
export function is401Error(err: any): boolean {
  return classifyRbacError(err).type === "401";
}

/**
 * Quick check if error is 403 (permission issue - NEVER refresh)
 */
export function is403Error(err: any): boolean {
  return classifyRbacError(err).type === "403";
}
