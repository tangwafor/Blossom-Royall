import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const runnerSecret = Deno.env.get("AUTOMATION_RUNNER_SECRET") || "";
  const suppliedSecret = request.headers.get("x-automation-secret") || "";
  if (!supabaseUrl || !serviceRoleKey || !runnerSecret) return json({ error: "processor_not_configured" }, 503);
  if (!suppliedSecret || await digest(suppliedSecret) !== await digest(runnerSecret)) return json({ error: "unauthorized" }, 401);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const workerId = crypto.randomUUID();
  const results: Array<{ requestId: string; status: string; evidenceRemoved?: number }> = [];

  for (let index = 0; index < 10; index += 1) {
    const { data: claims, error: claimError } = await client.rpc("claim_due_account_deletion", { p_worker_id: workerId });
    if (claimError) return json({ error: "claim_failed", detail: claimError.message }, 500);
    const claim = Array.isArray(claims) ? claims[0] : claims;
    if (!claim?.request_id) break;

    try {
      const { data: preparation, error: preparationError } = await client.rpc("prepare_account_deletion", {
        p_request_id: claim.request_id,
        p_worker_id: workerId,
      });
      if (preparationError) throw preparationError;

      const evidencePaths = Array.isArray(preparation?.payment_evidence_paths)
        ? preparation.payment_evidence_paths.filter((path: unknown): path is string => typeof path === "string" && path.length > 0)
        : [];
      if (evidencePaths.length) {
        const { error: storageError } = await client.storage.from("payment-evidence").remove(evidencePaths);
        if (storageError) throw storageError;
      }

      const completionSummary = {
        auth_identity_deleted: true,
        payment_evidence_deleted: evidencePaths.length,
        completed_by: "account_deletion_processor",
        completed_at: new Date().toISOString(),
      };
      const { error: completionError } = await client.rpc("finalize_account_deletion", {
        p_request_id: claim.request_id,
        p_worker_id: workerId,
        p_completion_summary: completionSummary,
      });
      if (completionError) throw completionError;
      results.push({ requestId: claim.request_id, status: "completed", evidenceRemoved: evidencePaths.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const { error: failureError } = await client.rpc("fail_account_deletion", {
        p_request_id: claim.request_id,
        p_worker_id: workerId,
        p_error: message,
      });
      results.push({ requestId: claim.request_id, status: failureError ? "failure_record_failed" : "retry_scheduled" });
    }
  }

  return json({ processed: results.length, results });
});
