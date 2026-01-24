export type RbacErrorType = "timeout" | "abort" | "network" | "pgrst116" | "exception";

export function classifyRbacError(err: any): RbacErrorType {
  const code = err?.code ?? err?.error?.code;
  const message = String(err?.message ?? err?.error_description ?? "");

  if (code === "PGRST116" || message.includes("PGRST116")) return "pgrst116";
  if (err?.name === "AbortError" || message.toLowerCase().includes("aborted")) return "abort";
  if (message.includes("Timeout") || message.toLowerCase().includes("timeout")) return "timeout";

  const msg = message.toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    err?.status === 0
  ) {
    return "network";
  }

  return "exception";
}
