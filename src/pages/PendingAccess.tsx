import { useAuth } from "@/hooks/authContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, ArrowLeft, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import logoM3 from "@/assets/logo-m3.png";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { clearRbacCache, resetInflightState } from "@/lib/authRecovery";
import { motion, AnimatePresence } from "framer-motion";

const APPROVED_ROLES = new Set(["admin", "scout", "editor", "viewer", "player"]);

const getRealtimeStatus = (row: unknown) =>
  typeof row === "object" && row !== null && "status" in row
    ? String((row as { status?: unknown }).status ?? "")
    : "";

export default function PendingAccess() {
  const { signOut, user, triggerRecovery } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);
  const hasRedirectedRef = useRef(false);

  // ============ CORE: Check status and redirect if approved ============
  const checkAndRedirect = useCallback(async (source: string) => {
    if (hasRedirectedRef.current || !user?.id) return;

    setChecking(true);
    try {
      // Query user_roles directly for current status
      const { data } = await supabase
        .from("user_roles")
        .select("status, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      if (data?.some((entry) => APPROVED_ROLES.has(entry.role))) {
        console.log(`[PendingAccess] User approved via ${source}`);
        hasRedirectedRef.current = true;
        setApproved(true);

        // Force session refresh to get updated JWT claims
        await supabase.auth.refreshSession();

        // Clear RBAC cache and force fresh fetch
        clearRbacCache();
        resetInflightState();
        await triggerRecovery("manual-retry");

        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.warn("[PendingAccess] Check failed:", err);
    } finally {
      setChecking(false);
    }
  }, [user?.id, triggerRecovery, navigate]);

  // ============ REALTIME: Subscribe to user_roles changes ============
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`pending-access-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = getRealtimeStatus(payload.new);
          console.log("[PendingAccess] Realtime update:", newStatus);
          if (newStatus === "active") {
            checkAndRedirect("realtime");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = getRealtimeStatus(payload.new);
          console.log("[PendingAccess] Realtime insert:", newStatus);
          if (newStatus === "active") {
            checkAndRedirect("realtime-insert");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, checkAndRedirect]);

  // ============ VISIBILITY: Check on tab focus ============
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAndRedirect("tab-focus");
      }
    };

    const handleFocus = () => {
      checkAndRedirect("window-focus");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkAndRedirect]);

  // ============ INITIAL CHECK on mount ============
  useEffect(() => {
    checkAndRedirect("mount");
  }, [checkAndRedirect]);

  // ============ MANUAL CHECK ============
  const handleManualCheck = async () => {
    await checkAndRedirect("manual-button");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("[PendingAccess] signOut error:", error);
    } finally {
      window.location.href = "/dashboard/auth";
    }
  };

  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoM3} alt="M3 Agency" className="h-10 w-auto" width={100} height={40} />
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {approved ? (
              /* ===== SUCCESS STATE ===== */
              <motion.div
                key="approved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2">
                  Acesso Liberado!
                </h1>
                <p className="text-zinc-400 mb-4">
                  Abrindo dashboard...
                </p>
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                </div>
              </motion.div>
            ) : (
              /* ===== PENDING STATE ===== */
              <motion.div
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-white mb-2">
                  Aguardando Liberação
                </h1>

                {/* Description */}
                <p className="text-zinc-400 mb-2">
                  Sua conta foi criada com sucesso!
                </p>
                <p className="text-zinc-500 text-sm mb-6">
                  Um administrador precisa liberar seu acesso ao sistema.
                  Você será redirecionado automaticamente quando aprovado.
                </p>

                {/* User email */}
                {user?.email && (
                  <div className="bg-zinc-800/50 rounded-lg px-4 py-3 mb-6">
                    <p className="text-xs text-zinc-500 mb-1">Conta registrada</p>
                    <p className="text-sm text-zinc-300 font-medium">{user.email}</p>
                  </div>
                )}

                {/* Realtime indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-zinc-500">Monitorando em tempo real</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleManualCheck}
                    variant="outline"
                    className="w-full gap-2 border-zinc-700 hover:bg-zinc-800"
                    disabled={checking || loggingOut}
                  >
                    {checking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {checking ? "Checando acesso..." : "Checar acesso"}
                  </Button>

                  <Button
                    onClick={handleLogout}
                    variant="default"
                    className="w-full gap-2"
                    disabled={loggingOut || checking}
                  >
                    {loggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    {loggingOut ? "Saindo..." : "Sair da Conta"}
                  </Button>

                  <Button
                    onClick={handleBack}
                    variant="ghost"
                    className="w-full gap-2 text-zinc-400 hover:text-zinc-200"
                    disabled={loggingOut}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Site
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          Dúvidas? Entre em contato com o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
