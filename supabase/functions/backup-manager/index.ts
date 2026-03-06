import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hash PIN using PBKDF2 with random salt (returns salt+hash hex string)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const combined = new Uint8Array(salt.length + new Uint8Array(derivedBits).length);
  combined.set(salt);
  combined.set(new Uint8Array(derivedBits), salt.length);
  return Array.from(combined).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify PIN against a stored PBKDF2 hash
async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const combined = new Uint8Array(
    storedHash.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  const salt = combined.slice(0, 16);
  const storedKey = combined.slice(16);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const derivedArray = new Uint8Array(derivedBits);
  if (derivedArray.length !== storedKey.length) return false;
  let result = 0;
  for (let i = 0; i < derivedArray.length; i++) {
    result |= derivedArray[i] ^ storedKey[i];
  }
  return result === 0;
}

// Legacy SHA-256 hash for migration compatibility
async function legacySha256(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simple rate limiting
const attemptTracker = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attemptTracker.get(ip);
  if (!entry || now > entry.resetAt) {
    attemptTracker.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, pin, habits, tasks } = body;

    if (action === "check") {
      // Check if user has a backup PIN set
      const { data, error } = await supabaseAdmin
        .from("user_backups")
        .select("id, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ hasBackup: !!data, backup: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-pin-available") {
      if (!pin || typeof pin !== "string" || pin.trim().length < 4) {
        return new Response(
          JSON.stringify({ error: "PIN must be at least 4 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pinHash = await hashPin(pin.trim());
      const { data, error } = await supabaseAdmin
        .from("user_backups")
        .select("id, user_id")
        .eq("pin_hash", pinHash)
        .maybeSingle();

      if (error) throw error;

      // Available if no one uses it, or the current user owns it
      const available = !data || data.user_id === userId;

      return new Response(
        JSON.stringify({ available }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PIN for backup/restore/delete
    if (!pin || typeof pin !== "string" || pin.trim().length < 4) {
      return new Response(
        JSON.stringify({ error: "PIN must be at least 4 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pin.length > 64) {
      return new Response(
        JSON.stringify({ error: "PIN must be at most 64 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedPin = pin.trim();
    const pinHash = await hashPin(trimmedPin);

    if (action === "backup") {
      if (!Array.isArray(habits) || !Array.isArray(tasks)) {
        return new Response(
          JSON.stringify({ error: "Invalid data format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const dataSize = JSON.stringify({ habits, tasks }).length;
      if (dataSize > 500_000) {
        return new Response(
          JSON.stringify({ error: "Backup data too large" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already has a backup
      const { data: existing } = await supabaseAdmin
        .from("user_backups")
        .select("id, pin_hash")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // User already has a backup — they MUST use the same PIN
        if (existing.pin_hash !== pinHash) {
          return new Response(
            JSON.stringify({ error: "You already have a backup with a different PIN. Use your original PIN to update." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from("user_backups")
          .update({ habits, tasks })
          .eq("user_id", userId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, message: "Backup updated" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // New backup — check PIN isn't taken by another user
        const { data: pinOwner } = await supabaseAdmin
          .from("user_backups")
          .select("user_id")
          .eq("pin_hash", pinHash)
          .maybeSingle();

        if (pinOwner) {
          return new Response(
            JSON.stringify({ error: "This PIN is already taken. Please choose another." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: insertError } = await supabaseAdmin
          .from("user_backups")
          .insert({
            user_id: userId,
            pin_hash: pinHash,
            pin_code: "hashed",
            habits,
            tasks,
          });

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ success: true, message: "Backup created" }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (action === "restore") {
      // Restore by PIN hash (any user can restore with correct PIN)
      const { data, error } = await supabaseAdmin
        .from("user_backups")
        .select("habits, tasks")
        .eq("pin_hash", pinHash)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(
          JSON.stringify({ error: "No backup found for this PIN." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, habits: data.habits, tasks: data.tasks }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "delete") {
      // Delete user's backup, verify PIN matches
      const { data: backup } = await supabaseAdmin
        .from("user_backups")
        .select("id, pin_hash")
        .eq("user_id", userId)
        .maybeSingle();

      if (!backup) {
        return new Response(
          JSON.stringify({ error: "No backup found to delete." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (backup.pin_hash !== pinHash) {
        return new Response(
          JSON.stringify({ error: "Incorrect PIN." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("user_backups")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: "Backup deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Backup manager error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
