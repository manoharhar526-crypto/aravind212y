import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hash PIN using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simple rate limiting using in-memory map (resets on cold start)
const attemptTracker = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attemptTracker.get(ip);

  if (!entry || now > entry.resetAt) {
    attemptTracker.set(ip, { count: 1, resetAt: now + 60_000 }); // 1 minute window
    return false;
  }

  entry.count++;
  if (entry.count > 10) {
    // Max 10 attempts per minute
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, pin, habits, tasks } = body;

    // Validate PIN
    if (!pin || typeof pin !== "string" || pin.trim().length < 4) {
      return new Response(
        JSON.stringify({ error: "PIN must be at least 4 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Enforce max PIN length
    if (pin.length > 64) {
      return new Response(
        JSON.stringify({ error: "PIN must be at most 64 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trimmedPin = pin.trim();
    const pinHash = await hashPin(trimmedPin);

    if (action === "backup") {
      // Validate habits and tasks are arrays
      if (!Array.isArray(habits) || !Array.isArray(tasks)) {
        return new Response(
          JSON.stringify({ error: "Invalid data format" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Limit data size (prevent abuse)
      const dataSize = JSON.stringify({ habits, tasks }).length;
      if (dataSize > 500_000) {
        // 500KB limit
        return new Response(
          JSON.stringify({ error: "Backup data too large" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if backup exists by pin_hash
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("user_backups")
        .select("id")
        .eq("pin_hash", pinHash)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update existing backup
        const { error: updateError } = await supabaseAdmin
          .from("user_backups")
          .update({
            habits: habits,
            tasks: tasks,
          })
          .eq("pin_hash", pinHash);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, message: "Backup updated" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        // Create new backup
        const { error: insertError } = await supabaseAdmin
          .from("user_backups")
          .insert({
            pin_hash: pinHash,
            pin_code: "hashed", // Keep column non-null but don't store real PIN
            habits: habits,
            tasks: tasks,
          });

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ success: true, message: "Backup created" }),
          {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (action === "restore") {
      // Look up by pin_hash
      const { data, error } = await supabaseAdmin
        .from("user_backups")
        .select("habits, tasks")
        .eq("pin_hash", pinHash)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(
          JSON.stringify({
            error: "No backup found for this PIN. Please check and try again.",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          habits: data.habits,
          tasks: data.tasks,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'backup' or 'restore'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (err) {
    console.error("Backup manager error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
