import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import os from "node:os";

const readEnv = (file) => existsSync(file)
  ? Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]))
  : {};
const local = readEnv(join(process.cwd(), ".env.local"));
const secrets = readEnv(join(os.homedir(), ".claude", "secrets.env"));
const url = local.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = secrets.SUPABASE_ACCESS_TOKEN;
if (!url || !accessToken) throw new Error("Supabase URL and approved management token are required.");
const projectRef = new URL(url).hostname.split(".")[0];
const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
if (!keyResponse.ok) throw new Error(`Unable to retrieve the production server key: ${keyResponse.status}`);
const keys = await keyResponse.json();
const serverKey = keys.find((key) => key.type === "secret" && key.api_key)?.api_key || keys.find((key) => key.name === "service_role" && key.api_key)?.api_key;
if (!serverKey) throw new Error("No active production server key is available.");
const admin = createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } });
const deleteUserWithRetry = async (userId) => {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await admin.auth.admin.deleteUser(userId);
      lastError = result.error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (!lastError) return null;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
  return lastError;
};
const { data: stores, error: storeError } = await admin.from("stores").select("id, name").ilike("name", "%Blossom Royall%");
if (storeError) throw storeError;
if (!stores || stores.length !== 1) throw new Error(`Expected exactly one Blossom Royall store; found ${stores?.length || 0}.`);

let runError = null;
for (const edition of ["detailed", "reel"]) {
  const email = `owner.qa.${edition}.${Date.now()}@blossomroyall.invalid`;
  const password = `${randomBytes(24).toString("base64url")}aA7!`;
  let qaUserId = null;
  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Delly owner walkthrough QA", ephemeral: true, edition } });
    if (createError) throw createError;
    qaUserId = created.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({ id: qaUserId, full_name: "Delly owner walkthrough QA", role: "owner" });
    if (profileError) throw profileError;
    const { error: membershipError } = await admin.from("store_memberships").insert({ store_id: stores[0].id, user_id: qaUserId, role: "owner" });
    if (membershipError) throw membershipError;
    const result = spawnSync("node", ["scripts/record-role-training.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        TRAINING_ROLE: "owner",
        TRAINING_EDITION: edition,
        TRAINING_BASE_URL: "https://app.blossomroyall.com",
        TRAINING_PRODUCTION_APPROVED: "true",
        TRAINING_NARRATION_MODE: "ndamba",
        TRAINING_OWNER_EMAIL: email,
        TRAINING_OWNER_PASSWORD: password,
        TRAINING_USER_ID: qaUserId,
        TRAINING_SERVER_KEY: serverKey,
        TRAINING_SUPABASE_URL: url,
        TRAINING_DIAGNOSTIC: "true",
      },
    });
    if (result.status !== 0) throw new Error(`${edition} production owner recording failed its MFA or UI gate.`);
  } catch (error) {
    runError ||= error instanceof Error ? error : new Error(String(error));
  } finally {
    if (qaUserId) {
      const deletionError = await deleteUserWithRetry(qaUserId);
      if (deletionError) runError ||= deletionError;
      const [{ count: membershipCount }, { count: profileCount }] = await Promise.all([
        admin.from("store_memberships").select("id", { count: "exact", head: true }).eq("user_id", qaUserId),
        admin.from("profiles").select("id", { count: "exact", head: true }).eq("id", qaUserId),
      ]);
      if (membershipCount || profileCount) runError ||= new Error(`Ephemeral ${edition} owner cleanup verification failed.`);
    }
  }
  if (runError) break;
}
if (runError) throw runError;
console.log("Detailed and reel owner MFA UI QA passed. Ephemeral production owner account and factor were deleted.");
