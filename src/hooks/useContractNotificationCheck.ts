import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./authContext";

const LAST_CHECK_KEY = "m3_contract_notify_last_check";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook that triggers contract notification check once per day (fallback for no cron).
 * Runs on dashboard load for admin/scout users.
 */
export function useContractNotificationCheck() {
  const { isAdmin, isScout, user } = useAuth();

  const triggerCheck = useCallback(async () => {
    if (!user || (!isAdmin && !isScout)) return;

    // Check if we've already run today
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();

    if (lastCheck) {
      const lastCheckTime = parseInt(lastCheck, 10);
      if (now - lastCheckTime < CHECK_INTERVAL_MS) {
        if (import.meta.env.DEV) {
          console.log("[ContractNotify] Skipping - already checked today");
        }
        return;
      }
    }

    // Mark as checked now (before async call to prevent duplicate triggers)
    localStorage.setItem(LAST_CHECK_KEY, now.toString());

    try {
      if (import.meta.env.DEV) {
        console.log("[ContractNotify] Running daily check...");
      }

      const { data, error } = await supabase.functions.invoke(
        "check-contract-notifications",
        {
          body: {},
          method: "POST",
        }
      );

      if (error) {
        console.error("[ContractNotify] Edge function error:", error);
        // Don't reset the check time on error - will retry next page load
        return;
      }

      if (import.meta.env.DEV) {
        console.log("[ContractNotify] Check complete:", data);
      }
    } catch (err) {
      console.error("[ContractNotify] Failed to trigger check:", err);
    }
  }, [user, isAdmin, isScout]);

  useEffect(() => {
    // Delay to not block initial render
    const timer = setTimeout(() => {
      triggerCheck();
    }, 3000);

    return () => clearTimeout(timer);
  }, [triggerCheck]);
}
