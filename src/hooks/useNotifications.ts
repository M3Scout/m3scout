import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Module-level tracker to detect concurrent useNotifications instances
// and prevent duplicate realtime subscriptions per user.
let __notificationsActiveInstances = 0;
let __notificationsInstanceSeq = 0;
const __notificationsActiveUsers = new Set<string>();

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchNotifications = useCallback(async () => {
    // Don't fetch if no user or auth is still loading
    if (!user || authLoading) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Dedupe - don't fetch if already fetched for this user
    if (hasFetched) {
      setLoading(false);
      return;
    }

    try {
      if (import.meta.env.DEV) console.log("[TIMING] Notifications fetch start");
      const fetchStart = performance.now();
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const typedData = (data || []) as Notification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter((n) => !n.read).length);
      setHasFetched(true);
      
      if (import.meta.env.DEV) {
        console.log("[TIMING] Notifications fetch complete", {
          duration: `${Math.round(performance.now() - fetchStart)}ms`,
          count: typedData.length
        });
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, hasFetched]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-realtime-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
  // Track instance lifecycle to detect duplicate mounts in dev/prod.
  const instanceIdRef = useRef<number>(0);
  if (instanceIdRef.current === 0) {
    instanceIdRef.current = ++__notificationsInstanceSeq;
  }

  useEffect(() => {
    __notificationsActiveInstances += 1;
    const id = instanceIdRef.current;
    if (import.meta.env.DEV) {
      console.log(
        `[useNotifications] mount #${id} (active=${__notificationsActiveInstances})`,
      );
      if (__notificationsActiveInstances > 1) {
        console.warn(
          `[useNotifications] ⚠️ ${__notificationsActiveInstances} instâncias ativas — possível duplicação. Considere mover o hook para um Provider único.`,
        );
      }
    }
    return () => {
      __notificationsActiveInstances = Math.max(0, __notificationsActiveInstances - 1);
      if (import.meta.env.DEV) {
        console.log(
          `[useNotifications] unmount #${id} (active=${__notificationsActiveInstances})`,
        );
      }
    };
  }, []);

  // Subscribe to realtime updates — one channel per (user, instance), com
  // dedupe por user para garantir que apenas a primeira instância montada
  // mantenha a inscrição ativa.
  useEffect(() => {
    if (!user) return;

    // Se já existe uma instância inscrita para este user, não duplicamos.
    if (__notificationsActiveUsers.has(user.id)) {
      if (import.meta.env.DEV) {
        console.log(
          `[useNotifications] skip realtime subscribe — já existe canal ativo para user ${user.id}`,
        );
      }
      return;
    }

    __notificationsActiveUsers.add(user.id);
    const channelName = `notifications-realtime-${user.id}-${instanceIdRef.current}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log(`[useNotifications] channel ${channelName} → ${status}`);
        }
      });

    return () => {
      // Cleanup completo: unsubscribe + remove + libera o slot do user.
      try {
        channel.unsubscribe();
      } catch (e) {
        if (import.meta.env.DEV) console.warn("[useNotifications] unsubscribe error", e);
      }
      supabase.removeChannel(channel);
      __notificationsActiveUsers.delete(user.id);
      if (import.meta.env.DEV) {
        console.log(`[useNotifications] cleanup channel ${channelName}`);
      }
    };
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
