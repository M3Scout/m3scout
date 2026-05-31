import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PermissionsWarningBanner } from "@/components/auth/PermissionsWarningBanner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Thresholds for feedback - now much more lenient with SWR
const SLOW_LOADING_THRESHOLD_MS = 2000; // After 2s show "Sincronizando..." (only if no cache)
const ERROR_FINAL_THRESHOLD_MS = 15000; // After 15s, consider it a final error (only if no cache)

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    user,
    session,
    loading: authLoading,
    rolesLoading,
    rolesError,
    roles,
    isAdmin,
    isApproved,
    triggerRecovery,
    permissionsLoading,
    permissionsError,
    userStatus,
    isRecovering,
  } = useAuth();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Separate states for slow loading vs final error
  const [slowLoading, setSlowLoading] = useState(false);
  const [errorFinal, setErrorFinal] = useState(false);

  const isLoading = authLoading || rolesLoading || permissionsLoading;
  
  // CRITICAL: We have valid permissions if roles exist (SWR approach)
  const hasValidPermissions = roles.length > 0;
  
  // Only blocking error if we have hook error AND no valid permissions
  const hasHookError = Boolean(rolesError || permissionsError);
  const isBlockingError = hasHookError && !hasValidPermissions;

  const loadingSinceRef = useRef<number | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      setSlowLoading(false);
      setErrorFinal(false);
      loadingSinceRef.current = null;
      
      // Use the unified recovery function (clears stuck state, retries with backoff)
      const success = await triggerRecovery("manual-retry");
      
      if (!success) {
        console.warn("[ProtectedRoute] Manual retry failed");
      }
    } finally {
      setRetrying(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    // Import dynamically to avoid circular deps
    const { hardLogoutToAuth } = await import("@/lib/hardLogout");
    await hardLogoutToAuth(1800);
  };

  // Track loading duration (only relevant if NO cache)
  useEffect(() => {
    // Start tracking when loading begins AND we don't have valid permissions
    if (isLoading && !hasValidPermissions && loadingSinceRef.current == null) {
      loadingSinceRef.current = Date.now();
    }

    // Reset when loading completes OR when we have valid permissions (SWR success)
    if ((!isLoading && !isBlockingError) || hasValidPermissions) {
      loadingSinceRef.current = null;
      setSlowLoading(false);
      setErrorFinal(false);
    }
  }, [isLoading, isBlockingError, hasValidPermissions]);

  // Periodic check for slow/error states (only if no cache)
  useEffect(() => {
    const interval = setInterval(() => {
      // If we got a blocking error AND no valid permissions, that's final
      if (isBlockingError && !isLoading) {
        setErrorFinal(true);
        setSlowLoading(false);
        return;
      }

      // If we have valid permissions, never show error banners (SWR working)
      if (hasValidPermissions) {
        setSlowLoading(false);
        setErrorFinal(false);
        return;
      }

      if (!loadingSinceRef.current) return;

      const elapsed = Date.now() - loadingSinceRef.current;

      // After ERROR_FINAL_THRESHOLD_MS with no cache
      if (elapsed >= ERROR_FINAL_THRESHOLD_MS && !hasValidPermissions) {
        setErrorFinal(true);
        setSlowLoading(false);
      }
      // After SLOW_LOADING_THRESHOLD_MS
      else if (elapsed >= SLOW_LOADING_THRESHOLD_MS) {
        setSlowLoading(true);
        setErrorFinal(false);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isBlockingError, isLoading, hasValidPermissions]);

  // Determine banners - NEVER show error if we have valid permissions (SWR)
  const showSlowLoadingBanner = slowLoading && !errorFinal && isLoading && (user || session) && !hasValidPermissions;
  const showErrorFinalBanner = (errorFinal || (isBlockingError && !isLoading)) && !hasValidPermissions;

  // ===== SWR Recovering indicator (background update with existing data) =====
  // Show subtle indicator when recovering in background but we have valid data
  const showRecoveringIndicator = isRecovering && hasValidPermissions;

  // ===== Error Final state (after all retries exhausted AND no cache) =====
  if (showErrorFinalBanner) {
    const errorType = rolesError || (permissionsError as string) || "timeout";

    if (!user) {
      return <Navigate to="/dashboard/auth" state={{ from: location }} replace />;
    }

    return (
      <>
        <PermissionsWarningBanner
          mode="errorFinal"
          errorType={errorType}
          retrying={retrying}
          loggingOut={loggingOut}
          onRetry={handleRetry}
          onLogout={handleLogout}
        />
        <div className="pt-16">{children}</div>
      </>
    );
  }

  // ===== Slow Loading state (still trying, no cache) =====
  if (showSlowLoadingBanner) {
    return (
      <>
        <PermissionsWarningBanner
          mode="slowLoading"
          onRetry={handleRetry}
          onLogout={handleLogout}
        />
        <div className="pt-10">{children}</div>
      </>
    );
  }

  // ===== Normal loading state =====
  if (isLoading) {
    // If there's already a session/user AND we have valid roles (SWR), render children immediately
    if ((user || session) && hasValidPermissions) {
      return (
        <>
          {/* SWR: Subtle progress indicator - doesn't block content */}
          {showRecoveringIndicator && (
            <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
          )}
          {children}
        </>
      );
    }

    // If session exists but no roles yet (initial load), show minimal loading with content attempt
    if (user || session) {
      return (
        <>
          <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
          {children}
        </>
      );
    }

    // Only show full loading screen for initial auth check (no session yet)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/dashboard/auth" state={{ from: location }} replace />;
  }

  // Admin bypass → allow immediately
  if (isAdmin) {
    return (
      <>
        {showRecoveringIndicator && (
          <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
        )}
        {children}
      </>
    );
  }

  // Non-admin: enforce approval + active status
  if (!isApproved || userStatus !== "active") {
    return <Navigate to="/pending-access" replace />;
  }

  return (
    <>
      {showRecoveringIndicator && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
      )}
      {children}
    </>
  );
}
