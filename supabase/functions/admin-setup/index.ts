import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-setup-token",
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require setup token for authorization
    const setupToken = req.headers.get("x-setup-token");
    const expectedToken = Deno.env.get("ADMIN_SETUP_TOKEN");

    if (!expectedToken || setupToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminPassword = Deno.env.get("ADMIN_DEFAULT_PASSWORD");
    if (!adminPassword) {
      return new Response(
        JSON.stringify({ error: "Admin password not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", "admin")
      .maybeSingle();

    if (existingProfile) {
      // Check if role exists
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", existingProfile.user_id)
        .eq("role", "admin")
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ message: "Admin already exists" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Assign admin role
      await supabaseAdmin.from("user_roles").insert({
        user_id: existingProfile.user_id,
        role: "admin",
      });

      return new Response(
        JSON.stringify({ message: "Admin role assigned to existing user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@habittracker.local",
      password: adminPassword,
      email_confirm: true,
      user_metadata: { username: "admin" },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: "Failed to create admin account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign admin role
    await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: "admin",
    });

    return new Response(
      JSON.stringify({ message: "Admin account created successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Admin setup error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
