import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(authHeader: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) return null;
  return { userId: user.id, supabaseAdmin };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const admin = await verifyAdmin(authHeader);
    if (!admin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const { supabaseAdmin } = admin;
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list_users": {
        const [{ data: profiles }, { data: roles }] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("user_id, username, created_at, updated_at")
            .order("created_at", { ascending: false }),
          supabaseAdmin.from("user_roles").select("user_id, role"),
        ]);

        const rolesMap: Record<string, string[]> = {};
        roles?.forEach((r: any) => {
          if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
          rolesMap[r.user_id].push(r.role);
        });

        const users = profiles?.map((p: any) => ({
          ...p,
          roles: rolesMap[p.user_id] || [],
        })) || [];

        return jsonResponse({ users });
      }

      case "get_user_data": {
        const { target_user_id } = body;
        if (!target_user_id) return jsonResponse({ error: "User ID required" }, 400);

        const [{ data: profile }, { data: backup }, { data: authUser }, { data: roles }] = await Promise.all([
          supabaseAdmin.from("profiles").select("*").eq("user_id", target_user_id).maybeSingle(),
          supabaseAdmin.from("user_backups").select("*").eq("user_id", target_user_id).maybeSingle(),
          supabaseAdmin.auth.admin.getUserById(target_user_id),
          supabaseAdmin.from("user_roles").select("role").eq("user_id", target_user_id),
        ]);

        return jsonResponse({
          profile,
          backup: backup ? { habits: backup.habits, tasks: backup.tasks, updated_at: backup.updated_at } : null,
          email: authUser?.user?.email || null,
          last_sign_in: authUser?.user?.last_sign_in_at || null,
          roles: roles?.map((r: any) => r.role) || [],
        });
      }

      case "update_user_backup": {
        const { target_user_id, habits, tasks } = body;
        if (!target_user_id) return jsonResponse({ error: "User ID required" }, 400);

        const updateData: Record<string, unknown> = {};
        if (habits !== undefined) updateData.habits = habits;
        if (tasks !== undefined) updateData.tasks = tasks;

        if (Object.keys(updateData).length === 0) {
          return jsonResponse({ error: "No data to update" }, 400);
        }

        const { error } = await supabaseAdmin
          .from("user_backups")
          .update(updateData)
          .eq("user_id", target_user_id);

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      }

      case "update_password": {
        const { target_user_id, new_password } = body;
        if (!target_user_id || !new_password || new_password.length < 6) {
          return jsonResponse({ error: "Valid user ID and password (min 6 chars) required" }, 400);
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
          password: new_password,
        });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      }

      case "update_username": {
        const { target_user_id, new_username } = body;
        if (!target_user_id || !new_username || typeof new_username !== "string") {
          return jsonResponse({ error: "Valid user ID and username required" }, 400);
        }

        const trimmed = new_username.trim();
        if (trimmed.length < 1 || trimmed.length > 30 || /\s/.test(trimmed)) {
          return jsonResponse({ error: "Username must be 1-30 chars, no spaces" }, 400);
        }

        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("username", trimmed)
          .maybeSingle();

        if (existing && existing.user_id !== target_user_id) {
          return jsonResponse({ error: "Username already taken" }, 409);
        }

        // Update profile and auth metadata in parallel
        const [profileResult, _authResult] = await Promise.all([
          supabaseAdmin.from("profiles").update({ username: trimmed }).eq("user_id", target_user_id),
          supabaseAdmin.auth.admin.updateUserById(target_user_id, { user_metadata: { username: trimmed } }),
        ]);

        if (profileResult.error) return jsonResponse({ error: profileResult.error.message }, 500);
        return jsonResponse({ success: true });
      }

      case "delete_user": {
        const { target_user_id } = body;
        if (!target_user_id) return jsonResponse({ error: "User ID required" }, 400);

        if (target_user_id === admin.userId) {
          return jsonResponse({ error: "Cannot delete your own admin account" }, 400);
        }

        await Promise.all([
          supabaseAdmin.from("user_backups").delete().eq("user_id", target_user_id),
          supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id),
          supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id),
        ]);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("Admin manage error:", err);
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
});
