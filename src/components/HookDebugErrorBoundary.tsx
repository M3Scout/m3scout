import React from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HookDebugState {
  phase: "searching" | "found" | "idle";
  currentMask: number;
  culpritBlock: string | null;
  attempts: number;
  lastError: {
    message: string;
    stack: string;
    componentStack: string;
    timestamp: number;
    mask: number;
  } | null;
}

const BLOCK_NAMES = ["A_Header", "B_Timeline", "C_Summary", "D_StatsPanels", "E_Modals"];
const STORAGE_KEY = "hookDebugState";

// Read stored state
export function getHookDebugState(): HookDebugState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Write stored state
export function setHookDebugState(state: HookDebugState | null) {
  try {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

// Get mask from URL or calculate next step
export function getHookMask(): number {
  if (typeof window === "undefined") return 31; // all on
  const params = new URLSearchParams(window.location.search);
  const maskStr = params.get("hookMask");
  if (maskStr) {
    return parseInt(maskStr, 10) || 31;
  }
  // Check stored state for auto binary search
  const state = getHookDebugState();
  if (state?.phase === "searching") {
    return state.currentMask;
  }
  return 31; // all blocks enabled
}

// Check if block is enabled
export function isBlockEnabled(blockIndex: number, mask: number): boolean {
  return (mask & (1 << blockIndex)) !== 0;
}

// Get block names from mask
export function getMaskBlockNames(mask: number): string[] {
  return BLOCK_NAMES.filter((_, i) => isBlockEnabled(i, mask));
}

interface HookDebugErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
  copied: boolean;
}

export class HookDebugErrorBoundary extends React.Component<
  HookDebugErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: HookDebugErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: "", copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("HookDebugErrorBoundary caught:", error, errorInfo);

    // Check if in hookDebug mode
    const params = new URLSearchParams(window.location.search);
    const isHookDebug = params.has("hookDebug");

    if (isHookDebug) {
      const currentMask = getHookMask();
      const isHookError =
        error.message.includes("Rendered more hooks") ||
        error.message.includes("Rendered fewer hooks") ||
        error.message.includes("React error #310") ||
        error.message.includes("error #310");

      // Store error in localStorage for persistence across refresh
      const debugState = getHookDebugState() || {
        phase: "idle" as const,
        currentMask: 31,
        culpritBlock: null,
        attempts: 0,
        lastError: null,
      };

      debugState.lastError = {
        message: error.message,
        stack: error.stack || "",
        componentStack: errorInfo.componentStack || "",
        timestamp: Date.now(),
        mask: currentMask,
      };

      // Auto binary search logic
      if (isHookError && debugState.phase === "idle") {
        debugState.phase = "searching";
        debugState.attempts = 0;
      }

      if (debugState.phase === "searching" && isHookError) {
        debugState.attempts++;
        const enabledBlocks = getMaskBlockNames(currentMask);

        if (enabledBlocks.length === 1) {
          // Found the culprit!
          debugState.phase = "found";
          debugState.culpritBlock = enabledBlocks[0];
        } else if (enabledBlocks.length > 1) {
          // Binary search: try first half
          const half = Math.ceil(enabledBlocks.length / 2);
          let newMask = 0;
          for (let i = 0; i < half; i++) {
            const blockIdx = BLOCK_NAMES.indexOf(enabledBlocks[i]);
            if (blockIdx >= 0) newMask |= 1 << blockIdx;
          }
          debugState.currentMask = newMask;
        }
      }

      setHookDebugState(debugState);
    }

    this.setState({ componentStack: errorInfo.componentStack || "" });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: "", copied: false });
  };

  handleContinueBinarySearch = () => {
    const state = getHookDebugState();
    if (state) {
      // Redirect with new mask
      const params = new URLSearchParams(window.location.search);
      params.set("hookMask", String(state.currentMask));
      window.location.search = params.toString();
    }
  };

  handleResetDebug = () => {
    setHookDebugState(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("hookMask");
    window.location.search = params.toString();
  };

  handleCopy = () => {
    const debugInfo = this.getDebugInfo();
    navigator.clipboard.writeText(debugInfo).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  getDebugInfo() {
    const state = getHookDebugState();
    const currentMask = getHookMask();
    return `=== HookDebug Error Report ===
Timestamp: ${new Date().toISOString()}
Current Mask: ${currentMask} (${getMaskBlockNames(currentMask).join(", ")})
Phase: ${state?.phase || "idle"}
Culprit: ${state?.culpritBlock || "not found"}
Attempts: ${state?.attempts || 0}

Error Message:
${this.state.error?.message || "N/A"}

Error Stack:
${this.state.error?.stack || "N/A"}

Component Stack:
${this.state.componentStack || "N/A"}

Last Stored Error:
${state?.lastError ? JSON.stringify(state.lastError, null, 2) : "N/A"}
`;
  }

  render() {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isHookDebug = params.has("hookDebug");
    const state = getHookDebugState();
    const currentMask = getHookMask();

    if (this.state.hasError) {
      const isHookError =
        this.state.error?.message.includes("Rendered more hooks") ||
        this.state.error?.message.includes("Rendered fewer hooks") ||
        this.state.error?.message.includes("error #310");

      // Standard error view
      if (!isHookDebug) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
            <div className="glass-card p-8 max-w-md text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
                <p className="text-muted-foreground text-sm">
                  {this.props.fallbackMessage || "Ocorreu um erro inesperado. Por favor, tente novamente."}
                </p>
              </div>
              {this.state.error && (
                <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded p-3 mt-4">
                  <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <Button onClick={this.handleRetry} variant="outline" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        );
      }

      // HookDebug mode - detailed debug view
      return (
        <div className="fixed inset-0 z-[9999] bg-zinc-950/95 overflow-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-red-400">🔍 HookDebug Error Captured</h1>
              <div className="flex gap-2">
                <Button
                  onClick={this.handleCopy}
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  {this.state.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-2">{this.state.copied ? "Copiado!" : "Copiar"}</span>
                </Button>
                <Button
                  onClick={this.handleResetDebug}
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  Reset Debug
                </Button>
              </div>
            </div>

            {/* Status Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Phase:</span>
                  <span className={`ml-2 font-mono ${state?.phase === "found" ? "text-green-400" : "text-amber-400"}`}>
                    {state?.phase || "idle"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Attempts:</span>
                  <span className="ml-2 font-mono text-zinc-300">{state?.attempts || 0}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Current Mask:</span>
                  <span className="ml-2 font-mono text-zinc-300">{currentMask}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Enabled Blocks:</span>
                  <span className="ml-2 font-mono text-zinc-300">
                    {getMaskBlockNames(currentMask).join(", ") || "none"}
                  </span>
                </div>
              </div>

              {state?.phase === "found" && state.culpritBlock && (
                <div className="mt-4 p-4 bg-red-950/50 border border-red-800/50 rounded-lg">
                  <div className="text-lg font-bold text-red-400">
                    🎯 CULPRIT FOUND: {state.culpritBlock}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">
                    O bloco "{state.culpritBlock}" é o responsável pelo erro de hooks.
                  </p>
                </div>
              )}

              {state?.phase === "searching" && isHookError && (
                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={this.handleContinueBinarySearch}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Continuar Binary Search (mask={state.currentMask})
                  </Button>
                </div>
              )}
            </div>

            {/* Error Details */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-zinc-200">Error Message</h2>
              <pre className="text-sm text-red-300 bg-zinc-950 rounded p-3 overflow-auto whitespace-pre-wrap">
                {this.state.error?.message || "N/A"}
              </pre>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-zinc-200">Error Stack</h2>
              <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {this.state.error?.stack || "N/A"}
              </pre>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <h2 className="text-lg font-semibold text-zinc-200">Component Stack</h2>
              <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {this.state.componentStack || "N/A"}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={this.handleRetry} variant="outline" className="border-zinc-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-zinc-700"
              >
                Recarregar Página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
