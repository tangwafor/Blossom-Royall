import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

const roles = ["owner", "manager", "staff", "vendor", "customer"];
const readEnv = (file) => existsSync(file) ? Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()])) : {};
const requireData = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data; };

export async function productionTrainingAdmin() {
  const local = readEnv(join(process.cwd(), ".env.local"));
  const secrets = readEnv(join(os.homedir(), ".claude", "secrets.env"));
  const url = local.NEXT_PUBLIC_SUPABASE_URL;
  const accessToken = secrets.SUPABASE_ACCESS_TOKEN;
  if (!url || !accessToken) throw new Error("Supabase URL and approved management token are required.");
  const projectRef = new URL(url).hostname.split(".")[0];
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Unable to retrieve the production server key: ${response.status}`);
  const keys = await response.json();
  const serverKey = keys.find((key) => key.type === "secret" && key.api_key)?.api_key || keys.find((key) => key.name === "service_role" && key.api_key)?.api_key;
  if (!serverKey) throw new Error("No active production server key is available.");
  return { url, serverKey, admin: createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } }) };
}

const deleteUser = async (admin, userId) => {
  let failure = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await admin.auth.admin.deleteUser(userId);
    failure = result.error;
    if (!failure) return;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
  throw failure;
};

export async function createRoleCourseFixtures() {
  const { admin, url, serverKey } = await productionTrainingAdmin();
  const runId = `course-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const stores = requireData(await admin.from("stores").select("id, name").ilike("name", "%Blossom Royall%"), "Blossom Royall store lookup");
  if (stores.length !== 1) throw new Error(`Expected one Blossom Royall store, received ${stores.length}.`);
  const storeId = stores[0].id;
  const identities = {};
  let vendorId = null;
  try {
    for (const role of roles) {
      const email = `${role}.${runId}@blossomroyall.invalid`;
      const password = `${randomBytes(24).toString("base64url")}aA7!`;
      const created = requireData(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `${role} role course QA`, ephemeral: true, training_run_id: runId } }), `${role} authentication fixture`);
      const userId = created.user.id;
      requireData(await admin.from("profiles").upsert({ id: userId, full_name: `${role} role course QA`, role }), `${role} profile fixture`);
      if (role !== "customer") requireData(await admin.from("store_memberships").insert({ store_id: storeId, user_id: userId, role }), `${role} membership fixture`);
      identities[role] = { userId, email, password };
    }
    vendorId = randomUUID();
    requireData(await admin.from("vendors").insert({ id: vendorId, store_id: storeId, owner_user_id: identities.vendor.userId, name: `Role Course QA ${runId}`, status: "Invited" }), "Vendor fixture");
    return { admin, url, serverKey, runId, storeId, vendorId, identities };
  } catch (error) {
    await cleanupRoleCourseFixtures({ admin, runId, vendorId, identities }).catch(() => {});
    throw error;
  }
}

export async function cleanupRoleCourseFixtures({ admin, runId, vendorId, identities }) {
  if (vendorId) requireData(await admin.from("vendors").delete().eq("id", vendorId), "Vendor fixture cleanup");
  for (const identity of Object.values(identities).reverse()) await deleteUser(admin, identity.userId);
  const users = requireData(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "Fixture user cleanup audit");
  const leakedUsers = users.users.filter((user) => user.user_metadata?.training_run_id === runId);
  const leakedVendors = requireData(await admin.from("vendors").select("id").ilike("name", `%${runId}%`), "Fixture vendor cleanup audit");
  if (leakedUsers.length || leakedVendors.length) throw new Error(`Role course cleanup leaked ${leakedUsers.length} users and ${leakedVendors.length} vendors for ${runId}.`);
}

export { roles as roleCourseFixtureRoles };
