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

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;

  const userId = data.claims.sub as string;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) return null;
  return { userId, supabaseAdmin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = await verifyAdmin(authHeader);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { supabaseAdmin } = admin;
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list_users": {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, username, created_at, updated_at")
          .order("created_at", { ascending: false });

        // Get roles for all users
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role");

        const rolesMap: Record<string, string[]> = {};
        roles?.forEach((r: any) => {
          if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
          rolesMap[r.user_id].push(r.role);
        });

        const users = profiles?.map((p: any) => ({
          ...p,
          roles: rolesMap[p.user_id] || [],
        })) || [];

        return new Response(
          JSON.stringify({ users }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_password": {
        const { target_user_id, new_password } = body;
        if (!target_user_id || !new_password || new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Valid user ID and password (min 6 chars) required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
          password: new_password,
        });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_username": {
        const { target_user_id, new_username } = body;
        if (!target_user_id || !new_username || typeof new_username !== "string") {
          return new Response(
            JSON.stringify({ error: "Valid user ID and username required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const trimmed = new_username.trim();
        if (trimmed.length < 1 || trimmed.length > 30 || /\s/.test(trimmed)) {
          return new Response(
            JSON.stringify({ error: "Username must be 1-30 chars, no spaces" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check availability
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("username", trimmed)
          .maybeSingle();

        if (existing && existing.user_id !== target_user_id) {
          return new Response(
            JSON.stringify({ error: "Username already taken" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ username: trimmed })
          .eq("user_id", target_user_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Also update user metadata
        await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
          user_metadata: { username: trimmed },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { target_user_id } = body;
        if (!target_user_id) {
          return new Response(
            JSON.stringify({ error: "User ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Don't allow deleting self
        if (target_user_id === admin.userId) {
          return new Response(
            JSON.stringify({ error: "Cannot delete your own admin account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete profile, backups, roles, then auth user
        await supabaseAdmin.from("user_backups").delete().eq("user_id", target_user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);
        await supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id);
        
        const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("Admin manage error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
