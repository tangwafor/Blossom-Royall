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
  const query = async (sql) => {
    const result = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
    });
    if (!result.ok) throw new Error(`Production SQL fixture operation failed: ${result.status} ${await result.text()}`);
    return result.json();
  };
  return { url, serverKey, query, admin: createClient(url, serverKey, { auth: { autoRefreshToken: false, persistSession: false } }) };
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
  const { admin, url, serverKey, query } = await productionTrainingAdmin();
  const runId = `course-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const stores = requireData(await admin.from("stores").select("id, name").ilike("name", "%Blossom Royall%"), "Blossom Royall store lookup");
  if (stores.length !== 1) throw new Error(`Expected one Blossom Royall store, received ${stores.length}.`);
  const storeId = stores[0].id;
  const identities = {};
  let vendorId = null;
  let productId = null;
  let variantId = null;
  let leaseId = null;
  let leaseReviewId = null;
  let leaseSubmitId = null;
  let registerId = null;
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
    productId = randomUUID();
    variantId = randomUUID();
    leaseId = randomUUID();
    leaseReviewId = randomUUID();
    leaseSubmitId = randomUUID();
    registerId = randomUUID();
    await query(`begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${identities.owner.userId}',true);
      select set_config('request.jwt.claims','{"aal":"aal2"}',true);
      insert into public.products(id,store_id,vendor_id,name,description,category,status,onsite_enabled,online_enabled,measurement_kind)
      values('${productId}','${storeId}','${vendorId}','Role Course Gold Ring ${runId}','Disposable training inventory','Training','draft',true,true,'ring');
      insert into public.product_variants(id,product_id,sku,size,color,price,ring_size,measurement_unit,reorder_point)
      values('${variantId}','${productId}','QA-${runId}','7','Gold',125,7,'mm',2);
      select public.adjust_catalog_stock('${variantId}',5,'Opening training fixture stock');
      select public.review_catalog_product('${productId}','published','');
      insert into public.cash_registers(id,store_id,name,location,created_by,updated_by)
      values('${registerId}','${storeId}','QA Assigned ${runId}','Release course','${identities.owner.userId}','${identities.owner.userId}');
      insert into public.leases(id,vendor_id,space_code,monthly_rent,deposit,start_date,end_date,status,signed_at,rent_due_day)
      values
        ('${leaseId}','${vendorId}','QA-A-${runId}',800,1600,current_date,current_date + 365,'signed',now(),1),
        ('${leaseReviewId}','${vendorId}','QA-B-${runId}',825,1650,current_date,current_date + 365,'signed',now(),1),
        ('${leaseSubmitId}','${vendorId}','QA-C-${runId}',850,1700,current_date,current_date + 365,'signed',now(),1);
      select set_config('request.jwt.claim.sub','${identities.vendor.userId}',true);
      select public.submit_vendor_rent_payment('${leaseId}',date_trunc('month',current_date)::date,800,'Bank transfer','QA-A-${runId}');
      select public.submit_vendor_rent_payment('${leaseReviewId}',date_trunc('month',current_date)::date,825,'Bank transfer','QA-B-${runId}');
      commit;`);
    return { admin, query, url, serverKey, runId, storeId, vendorId, productId, variantId, leaseId, leaseReviewId, leaseSubmitId, registerId, identities };
  } catch (error) {
    await cleanupRoleCourseFixtures({ admin, query, runId, vendorId, productId, variantId, leaseId, leaseReviewId, leaseSubmitId, registerId, identities }).catch(() => {});
    throw error;
  }
}

export async function cleanupRoleCourseFixtures({ admin, query, runId, vendorId, productId, variantId, leaseId, leaseReviewId, leaseSubmitId, registerId, identities }) {
  if (query) {
    const identityIds = Object.values(identities).map((identity) => `'${identity.userId}'`).join(",");
    const cleanup = [
      variantId && `create temporary table qa_course_orders on commit drop as select distinct order_id as id from public.order_items where variant_id='${variantId}';`,
      variantId && `delete from public.return_requests where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.order_fulfillment_events where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.order_pickup_credentials where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.inventory_movements where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.vendor_ledger_entries where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.payments where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.order_items where order_id in (select id from qa_course_orders);`,
      variantId && `delete from public.orders where id in (select id from qa_course_orders);`,
      identityIds && `delete from public.cash_drawer_adjustments where recorded_by in (${identityIds});`,
      identityIds && `delete from public.cash_drawer_sessions where opened_by in (${identityIds});`,
      identityIds && `delete from public.cash_registers where created_by in (${identityIds});`,
      registerId && `delete from public.cash_registers where id='${registerId}';`,
      leaseId && `delete from public.rent_payments where lease_id='${leaseId}';`,
      leaseReviewId && `delete from public.rent_payments where lease_id='${leaseReviewId}';`,
      leaseSubmitId && `delete from public.rent_payments where lease_id='${leaseSubmitId}';`,
      leaseId && `delete from public.leases where id='${leaseId}';`,
      leaseReviewId && `delete from public.leases where id='${leaseReviewId}';`,
      leaseSubmitId && `delete from public.leases where id='${leaseSubmitId}';`,
      variantId && `delete from public.inventory_movements where variant_id='${variantId}';`,
      variantId && `delete from public.product_variants where id='${variantId}';`,
      productId && `delete from public.products where id='${productId}';`,
      vendorId && `delete from public.vendors where id='${vendorId}';`,
      runId && `delete from public.leases where space_code='LIFE-${runId}';`,
      runId && `delete from public.vendor_storefronts where vendor_id in (select id from public.vendors where name ilike 'Lifecycle QA ${runId}%');`,
      runId && `delete from public.vendors where name ilike 'Lifecycle QA ${runId}%';`,
      runId && `delete from public.audit_log where coalesce(after_data->>'name', before_data->>'name', '') ilike 'Lifecycle QA ${runId}%';`,
      runId && `delete from public.audit_log where coalesce(after_data->>'public_name', before_data->>'public_name', '') ilike 'Lifecycle QA ${runId}%';`,
      runId && `delete from public.audit_log where coalesce(after_data->>'space_code', before_data->>'space_code', '')='LIFE-${runId}';`,
    ].filter(Boolean);
    const auditIds = [vendorId, productId, variantId, leaseId, leaseReviewId, leaseSubmitId].filter(Boolean).map((id) => `'${id}'`).join(",");
    if (auditIds) cleanup.push(`delete from public.audit_log where entity_id in (${auditIds});`);
    if (cleanup.length) await query(`begin; ${cleanup.join("\n")} commit;`);
  }
  else if (vendorId) requireData(await admin.from("vendors").delete().eq("id", vendorId), "Vendor fixture cleanup");
  for (const identity of Object.values(identities).reverse()) await deleteUser(admin, identity.userId);
  const users = requireData(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "Fixture user cleanup audit");
  const leakedUsers = users.users.filter((user) => user.user_metadata?.training_run_id === runId);
  const [leakedVendors, leakedProducts, leakedLeases] = await Promise.all([
    admin.from("vendors").select("id").ilike("name", `%${runId}%`),
    admin.from("products").select("id").ilike("name", `%${runId}%`),
    admin.from("leases").select("id").in("space_code", [`QA-A-${runId}`, `QA-B-${runId}`, `QA-C-${runId}`]),
  ]).then((results) => results.map((result, index) => requireData(result, ["Fixture vendor", "Fixture product", "Fixture lease"][index])));
  if (leakedUsers.length || leakedVendors.length || leakedProducts.length || leakedLeases.length) throw new Error(`Role course cleanup leaked records for ${runId}.`);
}

export { roles as roleCourseFixtureRoles };
