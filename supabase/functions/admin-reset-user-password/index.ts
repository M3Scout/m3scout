// Admin-only edge function to reset a user's password.
// Verifies the caller has the 'admin' role via has_role() before performing the change.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Client bound to the caller (to identify them)
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

    // Service-role admin client
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate caller is an admin
    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return json({ error: "Acesso negado: somente administradores" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, new_password } = body as {
      user_id?: string;
      new_password?: string;
    };

    if (!user_id || !new_password) {
      return json({ error: "user_id e new_password são obrigatórios" }, 400);
    }
    if (typeof new_password !== "string" || new_password.length < 6) {
      return json({ error: "Senha deve ter ao menos 6 caracteres" }, 400);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      user_id,
      { password: new_password, email_confirm: true },
    );

    if (updateError) {
      console.error("[admin-reset-user-password] update error:", updateError);
      return json({ error: updateError.message }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("[admin-reset-user-password] unexpected:", err);
    return json({ error: (err as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
