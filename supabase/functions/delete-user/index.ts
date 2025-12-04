// supabase/functions/delete-user/index.ts
// Edge Function to delete the authenticated user and related data.
// Requires environment variables:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Use custom env keys (avoid SUPABASE_ prefix restriction in Edge Secrets UI)
  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      status: 500,
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Validate user from token
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const userId = user.id;

  // Delete user-owned rows (RLS may block service role; use admin deletes)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Delete auth user first. If it fails, we abort to avoid "ghost" auth accounts.
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return new Response(JSON.stringify({ error: `Failed to delete user: ${deleteUserError.message}` }), { status: 500 });
  }

  // Then delete user-owned rows (best-effort, but we stop if any fail)
  const deletions = [
    adminClient.from("user_module_unlocks").delete().eq("user_id", userId),
    adminClient.from("user_lessons_completed").delete().eq("user_id", userId),
    adminClient.from("initial_quiz_results").delete().eq("user_id", userId),
    adminClient.from("user_profiles").delete().eq("user_id", userId),
  ];

  for (const promise of deletions) {
    const { error } = await promise;
    if (error) {
      return new Response(JSON.stringify({ error: `Failed to delete data: ${error.message}` }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
