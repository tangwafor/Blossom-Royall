import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

const readEnv = (file) => existsSync(file)
  ? Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]))
  : {};
const local = readEnv(join(process.cwd(), ".env.local"));
const secrets = readEnv(join(os.homedir(), ".claude", "secrets.env"));
const url = local.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = new URL(url).hostname.split(".")[0];
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${secrets.SUPABASE_ACCESS_TOKEN}` } });
if (!response.ok) throw new Error(`Cleanup audit could not retrieve the production server key: ${response.status}`);
const keys = await response.json();
const serverKey = keys.find((key) => key.type === "secret" && key.api_key)?.api_key || keys.find((key) => key.name === "service_role" && key.api_key)?.api_key;
if (!serverKey) throw new Error("Cleanup audit could not find an active production server key.");
const admin = createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } });
const repair = process.argv.includes("--repair");
let { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) throw error;
let ephemeralIds = (data.users || []).filter((user) => user.email?.endsWith("@blossomroyall.invalid") || user.user_metadata?.ephemeral === true).map((user) => user.id);
let ownerCount = 0;
if (ephemeralIds.length) {
  const ownerResult = await admin.from("vendors").select("id", { count: "exact", head: true }).in("owner_user_id", ephemeralIds);
  if (ownerResult.error) throw ownerResult.error;
  ownerCount = ownerResult.count || 0;
}
if (repair && ephemeralIds.length) {
  if (ownerCount) throw new Error("Repair refused because a temporary user still owns a vendor. Restore vendor ownership first.");
  for (const userId of ephemeralIds) {
    let deletionError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await admin.auth.admin.deleteUser(userId);
      deletionError = result.error;
      if (!deletionError) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
    if (deletionError) throw deletionError;
  }
  const refreshed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (refreshed.error) throw refreshed.error;
  ephemeralIds = (refreshed.data.users || []).filter((user) => user.email?.endsWith("@blossomroyall.invalid") || user.user_metadata?.ephemeral === true).map((user) => user.id);
}
if (ephemeralIds.length || ownerCount) throw new Error(`Ephemeral cleanup failed: ${ephemeralIds.length} QA users and ${ownerCount} QA vendor owners remain.`);
console.log(`Ephemeral cleanup ${repair ? "repair and " : ""}audit passed: no QA users or QA vendor ownership remain.`);
