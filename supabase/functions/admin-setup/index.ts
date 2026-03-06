import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const allowedOrigins = [
  "https://aravind212y.lovable.app",
  "https://id-preview--2ee928ff-387d-4346-ac31-3f1aab4cf10f.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      password: "aravind",
      email_confirm: true,
      user_metadata: { username: "admin" },
    });

    if (authError) {
      console.error("Error creating admin:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
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
