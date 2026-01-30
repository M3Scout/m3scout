import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Milestone days to notify (descending to process most urgent first)
const MILESTONE_DAYS = [30, 15, 7, 3, 1, 0];

interface ContractToNotify {
  contract_id: string;
  player_id: string;
  player_name: string;
  club_name: string;
  end_date: string;
  days_to_expire: number;
  milestone: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get mode from query params (dry-run or apply)
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "dry-run";
    const isDryRun = mode === "dry-run";

    console.log(`[contract-notifications] Running in ${mode} mode`);

    // 1. Fetch all contracts with end_date
    const { data: contracts, error: contractsError } = await supabase
      .from("player_contract_history")
      .select(`
        id,
        player_id,
        club_name,
        end_date,
        players!player_contract_history_player_id_fkey (
          full_name,
          is_archived
        )
      `)
      .not("end_date", "is", null)
      .order("end_date", { ascending: true });

    if (contractsError) {
      throw new Error(`Failed to fetch contracts: ${contractsError.message}`);
    }

    // 2. Fetch existing notifications to avoid duplicates
    const { data: existingNotifications, error: existingError } = await supabase
      .from("contract_notifications")
      .select("contract_id, milestone_days");

    if (existingError) {
      throw new Error(`Failed to fetch existing notifications: ${existingError.message}`);
    }

    const notifiedSet = new Set(
      (existingNotifications || []).map(
        (n) => `${n.contract_id}:${n.milestone_days}`
      )
    );

    // 3. Fetch all admin/scout users to receive notifications
    const { data: adminUsers, error: usersError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "scout"])
      .eq("status", "active");

    if (usersError) {
      throw new Error(`Failed to fetch admin users: ${usersError.message}`);
    }

    const userIds = (adminUsers || []).map((u) => u.user_id);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No admin/scout users to notify",
          notifications_created: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Calculate which contracts need notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contractsToNotify: ContractToNotify[] = [];

    for (const contract of contracts || []) {
      // Handle players as an array or object (Supabase returns nested data)
      const playerData = Array.isArray(contract.players) 
        ? contract.players[0] 
        : contract.players;
      
      // Skip archived players
      if (playerData?.is_archived) continue;

      const endDate = new Date(contract.end_date);
      endDate.setHours(0, 0, 0, 0);
      const daysToExpire = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find the appropriate milestone
      for (const milestone of MILESTONE_DAYS) {
        // Check if this milestone applies (days_to_expire <= milestone)
        if (daysToExpire <= milestone) {
          const key = `${contract.id}:${milestone}`;
          
          // Skip if already notified
          if (notifiedSet.has(key)) continue;

          contractsToNotify.push({
            contract_id: contract.id,
            player_id: contract.player_id,
            player_name: playerData?.full_name || "Atleta",
            club_name: contract.club_name,
            end_date: contract.end_date,
            days_to_expire: daysToExpire,
            milestone,
          });

          // Only one milestone per contract per run
          break;
        }
      }
    }

    console.log(`[contract-notifications] Found ${contractsToNotify.length} contracts to notify`);

    if (isDryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "dry-run",
          would_notify: contractsToNotify.length,
          contracts: contractsToNotify.slice(0, 20), // Preview first 20
          users_to_notify: userIds.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create notifications for each contract and user
    let notificationsCreated = 0;
    const errors: string[] = [];

    for (const contract of contractsToNotify) {
      const daysText =
        contract.days_to_expire === 0
          ? "hoje"
          : contract.days_to_expire === 1
          ? "amanhã"
          : `em ${contract.days_to_expire} dias`;

      const title = `Contrato expirando ${daysText}`;
      const message = `O contrato de ${contract.player_name} (${contract.club_name}) expira ${daysText}.`;
      const link = `/app/contratos?status=expiring`;

      for (const userId of userIds) {
        // Create notification
        const { data: notification, error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            title,
            message,
            type: "contract",
            link,
            read: false,
          })
          .select("id")
          .single();

        if (notifError) {
          errors.push(`Failed to notify user ${userId} for contract ${contract.contract_id}: ${notifError.message}`);
          continue;
        }

        // Record the milestone notification (only once per contract, not per user)
        if (notification && userId === userIds[0]) {
          const { error: recordError } = await supabase
            .from("contract_notifications")
            .insert({
              contract_id: contract.contract_id,
              milestone_days: contract.milestone,
              notification_id: notification.id,
            });

          if (recordError && !recordError.message.includes("duplicate")) {
            errors.push(`Failed to record notification: ${recordError.message}`);
          }
        }

        notificationsCreated++;
      }
    }

    console.log(`[contract-notifications] Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        mode: "apply",
        notifications_created: notificationsCreated,
        contracts_notified: contractsToNotify.length,
        users_notified: userIds.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[contract-notifications] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
