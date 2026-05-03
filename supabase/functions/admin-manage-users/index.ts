// Admin-only edge function for user management operations:
// - GET: Fetch last_sign_in_at for all users from auth.users
// - DELETE: Delete a user from auth (admin only, not owner)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "Não autenticado" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate caller is an admin
    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return json({ error: "Acesso negado: somente administradores" }, 403);
    }

    // GET: Fetch last_sign_in_at for users
    if (req.method === "GET") {
      const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listError) {
        console.error("[admin-manage-users] list error:", listError);
        return json({ error: listError.message }, 500);
      }

      const loginMap: Record<string, string | null> = {};
      for (const u of authUsers.users) {
        loginMap[u.id] = u.last_sign_in_at ?? null;
      }

      return json({ login_map: loginMap });
    }

    // POST with action=delete: Delete a user
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { action, user_id } = body as { action?: string; user_id?: string };

      if (action === "delete") {
        if (!user_id) {
          return json({ error: "user_id é obrigatório" }, 400);
        }

        // Prevent self-deletion
        if (user_id === caller.id) {
          return json({ error: "Não é possível excluir a si mesmo" }, 400);
        }

        // Check if target is owner
        const { data: ownerCheck } = await admin
          .from("user_roles")
          .select("is_owner")
          .eq("user_id", user_id)
          .eq("is_owner", true)
          .maybeSingle();

        if (ownerCheck) {
          return json({ error: "Não é possível excluir o proprietário" }, 403);
        }

        // Delete from auth (cascades to user_roles, profiles, etc.)
        const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);

        if (deleteError) {
          console.error("[admin-manage-users] delete error:", deleteError);
          return json({ error: deleteError.message }, 500);
        }

        return json({ success: true });
      }

      return json({ error: "Ação desconhecida" }, 400);
    }

    return json({ error: "Método não suportado" }, 405);
  } catch (err) {
    console.error("[admin-manage-users] unexpected:", err);
    return json({ error: (err as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
