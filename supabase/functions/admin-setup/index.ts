import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-setup-token",
};

const ADMIN_USERNAME = "GOD";
const ADMIN_EMAIL    = "god@admin.internal";
const ADMIN_PASSWORD = "iamgod";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Protect with setup token
    const setupToken    = req.headers.get("x-setup-token");
    const expectedToken = Deno.env.get("ADMIN_SETUP_TOKEN");
    if (!expectedToken || setupToken !== expectedToken) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", ADMIN_USERNAME)
      .maybeSingle();

    if (existingProfile) {
      // Ensure admin role is assigned
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: existingProfile.user_id, role: "admin" },
        { onConflict: "user_id,role" }
      );
      return new Response(JSON.stringify({ message: "Admin already exists — role confirmed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         ADMIN_EMAIL,
      password:      ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { username: ADMIN_USERNAME },
    });

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? "Failed to create admin" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profile is created by handle_new_user trigger automatically.
    // Assign admin role.
    await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role:    "admin",
    });

    return new Response(JSON.stringify({ message: "Admin account created", username: ADMIN_USERNAME }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Admin setup error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
