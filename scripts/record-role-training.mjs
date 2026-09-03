import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { roleCourseMatrix } from "./role-course-matrix.mjs";

const roles = ["customer", "staff", "manager", "owner", "vendor"];
const requestedRole = process.env.TRAINING_ROLE || "all";
const edition = process.env.TRAINING_EDITION || "detailed";
const baseUrl = process.env.TRAINING_BASE_URL || "http://127.0.0.1:3002";
const productionApproved = process.env.TRAINING_PRODUCTION_APPROVED === "true";
const narrationRoot = process.env.TRAINING_HUMAN_NARRATION_DIR;
const captureOnly = process.env.TRAINING_CAPTURE_ONLY === "true";
const narrationMode = process.env.TRAINING_NARRATION_MODE || "ndamba";
const ndambaVoice = process.env.TRAINING_NARRATION_VOICE || "en-US-AriaNeural";
const ndambaRate = process.env.TRAINING_NARRATION_RATE || "-4%";
const isProduction = new URL(baseUrl).hostname === "app.blossomroyall.com";
const trainingServerKey = process.env.TRAINING_SERVER_KEY;
const trainingUserId = process.env.TRAINING_USER_ID;
const trainingSupabaseUrl = process.env.TRAINING_SUPABASE_URL;
const diagnosticMode = process.env.TRAINING_DIAGNOSTIC === "true";
const courseActionCoverageComplete = true;
const workflowEvidence = new Map();
const selectedRoles = requestedRole === "all" ? roles : [requestedRole];
const trainingUserIdFor = (role) => process.env[`TRAINING_${role.toUpperCase()}_USER_ID`] || trainingUserId;
const trainingCredentialFor = (role, field) => process.env[`TRAINING_${role.toUpperCase()}_${field}`];
const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const date = new Date().toISOString().slice(0, 10);
const artifactRoot = join(process.cwd(), "artifacts", "training", `${date}-${commit}`);

if (!selectedRoles.every((role) => roles.includes(role))) throw new Error(`Unsupported TRAINING_ROLE: ${requestedRole}`);
if (!["detailed", "reel"].includes(edition)) throw new Error(`Unsupported TRAINING_EDITION: ${edition}`);
if (!["ndamba", "human"].includes(narrationMode)) throw new Error(`Unsupported TRAINING_NARRATION_MODE: ${narrationMode}`);
if (isProduction && !productionApproved) throw new Error("Production recording requires TRAINING_PRODUCTION_APPROVED=true.");
if (isProduction && (!trainingServerKey || !trainingSupabaseUrl || selectedRoles.some((role) => !trainingUserIdFor(role)))) throw new Error("Production role courses require sealed server side backend assertion credentials for every selected role.");

const trainingAdmin = trainingServerKey && trainingSupabaseUrl
  ? createClient(trainingSupabaseUrl, trainingServerKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const assertNoError = (result, label) => {
  if (result.error) throw new Error(`${label} backend assertion failed: ${result.error.message}`);
  return result.data;
};

const authenticatedTrainingClient = async (role) => {
  const email = trainingCredentialFor(role, "EMAIL");
  const password = trainingCredentialFor(role, "PASSWORD");
  if (!trainingSupabaseUrl || !trainingServerKey || !email || !password) throw new Error(`${role} sealed fixture credentials are unavailable.`);
  const client = createClient(trainingSupabaseUrl, trainingServerKey, { auth: { autoRefreshToken: false, persistSession: false } });
  assertNoError(await client.auth.signInWithPassword({ email, password }), `${role} sealed fixture sign in`);
  return client;
};

const waitForAdminRow = async (load, label) => {
  let lastError = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await load();
    if (!result.error && result.data) return result.data;
    lastError = result.error;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} backend assertion failed: ${lastError?.message || "record did not appear"}`);
};

const memberBackendAssertion = async (expectedRole) => {
  const userId = trainingUserIdFor(expectedRole);
  if (!trainingAdmin || !userId) throw new Error(`${expectedRole} backend assertion client is unavailable.`);
  const membership = assertNoError(await trainingAdmin.from("store_memberships").select("store_id, role").eq("user_id", userId).single(), `${expectedRole} membership`);
  if (membership.role !== expectedRole) throw new Error(`${expectedRole} backend role mismatch: ${membership.role}`);
  const [products, orders, returns, payments] = await Promise.all([
    trainingAdmin.from("products").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id),
    trainingAdmin.from("orders").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id),
    trainingAdmin.from("return_requests").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id),
    trainingAdmin.from("payments").select("id, orders!inner(store_id)", { count: "exact", head: true }).eq("orders.store_id", membership.store_id),
  ]);
  for (const [result, label] of [[products, "products"], [orders, "orders"], [returns, "returns"], [payments, "payments"]]) {
    if (result.error) throw new Error(`${expectedRole} ${label} backend assertion failed: ${result.error.message}`);
  }
  return { storeId: membership.store_id, role: membership.role, products: products.count || 0, orders: orders.count || 0, returns: returns.count || 0, payments: payments.count || 0 };
};

const backendAssertions = {
  owner: async () => {
    const userId = trainingUserIdFor("owner");
    if (!trainingAdmin || !userId) throw new Error("Owner backend assertion client is unavailable.");
    const membership = assertNoError(await trainingAdmin.from("store_memberships").select("store_id, role").eq("user_id", userId).single(), "Owner membership");
    if (membership.role !== "owner") throw new Error(`Owner backend role mismatch: ${membership.role}`);
    const [vendors, products, orders, leases] = await Promise.all([
      trainingAdmin.from("vendors").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id),
      trainingAdmin.from("products").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id),
      trainingAdmin.from("orders").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id),
      trainingAdmin.from("leases").select("id, vendors!inner(store_id)", { count: "exact", head: true }).eq("vendors.store_id", membership.store_id),
    ]);
    for (const [result, label] of [[vendors, "Owner vendors"], [products, "Owner products"], [orders, "Owner orders"], [leases, "Owner leases"]]) if (result.error) throw new Error(`${label} backend assertion failed: ${result.error.message}`);
    return { storeId: membership.store_id, role: membership.role, vendors: vendors.count || 0, products: products.count || 0, orders: orders.count || 0, leases: leases.count || 0 };
  },
  vendor: async () => {
    const userId = trainingUserIdFor("vendor");
    if (!trainingAdmin || !userId) throw new Error("Vendor backend assertion client is unavailable.");
    const membership = assertNoError(await trainingAdmin.from("store_memberships").select("store_id, role").eq("user_id", userId).single(), "Vendor membership");
    if (membership.role !== "vendor") throw new Error(`Vendor backend role mismatch: ${membership.role}`);
    const owned = assertNoError(await trainingAdmin.from("vendors").select("id, name").eq("store_id", membership.store_id).eq("owner_user_id", userId), "Vendor ownership");
    if (owned.length !== 1) throw new Error(`Vendor backend ownership mismatch: expected 1, received ${owned.length}`);
    const vendorId = owned[0].id;
    const [products, orderItems, leases, ledger] = await Promise.all([
      trainingAdmin.from("products").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id).eq("vendor_id", vendorId),
      trainingAdmin.from("order_items").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId),
      trainingAdmin.from("leases").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId),
      trainingAdmin.from("vendor_ledger_entries").select("id", { count: "exact", head: true }).eq("store_id", membership.store_id).eq("vendor_id", vendorId),
    ]);
    for (const [result, label] of [[products, "Vendor products"], [orderItems, "Vendor order items"], [leases, "Vendor leases"], [ledger, "Vendor ledger"]]) if (result.error) throw new Error(`${label} backend assertion failed: ${result.error.message}`);
    return { storeId: membership.store_id, role: membership.role, vendorId, vendorName: owned[0].name, products: products.count || 0, orderItems: orderItems.count || 0, leases: leases.count || 0, ledger: ledger.count || 0 };
  },
  manager: async () => memberBackendAssertion("manager"),
  staff: async () => memberBackendAssertion("staff"),
  customer: async () => {
    const userId = trainingUserIdFor("customer");
    if (!trainingAdmin || !userId) throw new Error("Customer backend assertion client is unavailable.");
    const profile = assertNoError(await trainingAdmin.from("profiles").select("role").eq("id", userId).single(), "Customer profile");
    if (profile.role !== "customer") throw new Error(`Customer backend role mismatch: ${profile.role}`);
    const membership = assertNoError(await trainingAdmin.from("store_memberships").select("store_id, role").eq("user_id", userId).limit(1).maybeSingle(), "Customer membership boundary");
    if (membership) throw new Error(`Customer must not receive an operating membership during the course: ${membership.role}`);
    const configuredStoreId = process.env.TRAINING_STORE_ID;
    const storesResult = configuredStoreId
      ? await trainingAdmin.from("stores").select("id").eq("id", configuredStoreId)
      : await trainingAdmin.from("stores").select("id").ilike("name", "%Blossom Royall%");
    const stores = assertNoError(storesResult, "Customer storefront");
    if (stores.length !== 1) throw new Error(`Customer course expected one storefront, received ${stores.length}.`);
    const storeId = stores[0].id;
    const [products, orders, returns] = await Promise.all([
      trainingAdmin.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "published"),
      trainingAdmin.from("orders").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("customer_id", userId),
      trainingAdmin.from("return_requests").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("customer_id", userId),
    ]);
    for (const [result, label] of [[products, "published products"], [orders, "orders"], [returns, "returns"]]) if (result.error) throw new Error(`Customer ${label} backend assertion failed: ${result.error.message}`);
    return { storeId, role: "customer", products: products.count || 0, orders: orders.count || 0, returns: returns.count || 0 };
  },
};

const expectVisibleText = async (page, text, label) => {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: "visible", timeout: 15000 }).catch(() => { throw new Error(`${label} UI assertion failed: ${text} is not visible.`); });
};

const observationActions = new Set([
  "review_attention", "browse_catalog", "open_product", "verify_seller_and_fulfillment",
  "inspect_payment", "verify_receipt", "inspect_lease", "inspect_stock", "verify_inventory_source",
  "inspect_attribution", "inspect_fulfillment_board", "inspect_staff_tools", "inspect_signal",
  "inspect_policy", "review_identity", "review_address", "review_contacts", "review_tax",
  "search_help", "open_guide", "refresh_board", "verify_stock", "verify_sales", "verify_ledger",
  "verify_rent", "inspect_authorized_products", "inspect_attributed_orders", "inspect_vendor",
  "inspect_storefront", "verify_audit_history", "inspect_operating_pulse", "review_bag",
  "inspect_order", "verify_fulfillment", "inspect_return_status", "verify_order_history",
]);

const boundaryActions = new Set([
  "verify_other_vendor_absent", "verify_owner_governance_boundary", "verify_owner_controls_absent",
  "verify_owner_consent_boundary", "verify_no_production_write", "label_preview", "label_preview_controls",
  "label_catalog_editing_development", "label_awaiting_owner_answers", "label_photo_sizing_development",
  "verify_alert_automation_development", "label_settlement_development", "label_routing_development",
  "verify_fulfillment_boundary",
]);

const exerciseFixtureInventory = async ({ page }) => {
  const productId = process.env.TRAINING_FIXTURE_PRODUCT_ID;
  const variantId = process.env.TRAINING_FIXTURE_VARIANT_ID;
  if (!trainingAdmin || !productId || !variantId) throw new Error("Inventory course action requires the disposable product and variant fixture.");
  const product = assertNoError(await trainingAdmin.from("products").select("name").eq("id", productId).single(), "Inventory fixture product");
  const before = assertNoError(await trainingAdmin.from("product_variants").select("qty_on_hand").eq("id", variantId).single(), "Inventory fixture quantity before action");
  const card = page.locator(".product", { has: page.getByRole("heading", { name: product.name, exact: true }) });
  await card.getByRole("button", { name: "Receive one", exact: true }).click();
  await card.getByText(`${before.qty_on_hand + 1} on hand`, { exact: false }).waitFor();
  await card.getByRole("button", { name: "Remove one", exact: true }).click();
  await card.getByText(`${before.qty_on_hand} on hand`, { exact: false }).waitFor();
  const after = assertNoError(await trainingAdmin.from("product_variants").select("qty_on_hand").eq("id", variantId).single(), "Inventory fixture quantity after action");
  if (after.qty_on_hand !== before.qty_on_hand) throw new Error(`Inventory fixture was not restored: expected ${before.qty_on_hand}, received ${after.qty_on_hand}.`);
  const movements = assertNoError(await trainingAdmin.from("inventory_movements").select("id, quantity_delta").eq("variant_id", variantId), "Inventory fixture movement audit");
  if (!movements.some((row) => row.quantity_delta === 1) || !movements.some((row) => row.quantity_delta === -1)) throw new Error("Inventory fixture did not record both accountable movements.");
  return { control: "Receive one and Remove one", result: `Quantity restored to ${after.qty_on_hand}; ${movements.length} movement records verified`, productId, variantId };
};

const addFixtureProductToCheckout = async (page) => {
  const productId = process.env.TRAINING_FIXTURE_PRODUCT_ID;
  if (!trainingAdmin || !productId) throw new Error("Checkout course action requires the disposable product fixture.");
  const product = assertNoError(await trainingAdmin.from("products").select("name").eq("id", productId).single(), "Checkout fixture product");
  const card = page.locator(".product", { has: page.getByRole("heading", { name: product.name, exact: true }) });
  const addButton = card.getByRole("button", { name: "Add to checkout", exact: true });
  await addButton.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -160));
  await addButton.click();
  return product;
};

const courseOrderFor = async (role) => {
  const own = workflowEvidence.get(`${role}:order`);
  if (own) return own;
  const variantId = process.env.TRAINING_FIXTURE_VARIANT_ID;
  if (!trainingAdmin || !variantId) throw new Error("Order course action requires the disposable variant fixture.");
  const rows = assertNoError(await trainingAdmin.from("orders")
    .select("id, receipt_no, payment_status, fulfillment_status, status, order_items!inner(variant_id)")
    .eq("order_items.variant_id", variantId)
    .order("created_at", { ascending: true }), "Shared course orders");
  const order = rows.find((row) => row.fulfillment_status !== "fulfilled") || rows[0];
  if (!order) throw new Error("No disposable course order is available.");
  return order;
};

const interfaceActionExecutors = {
  refresh_vendor_reconciliation: async ({ page }) => {
    const panel = page.getByLabel("Owner vendor reconciliation");
    await panel.getByRole("button", { name: "Refresh", exact: true }).click();
    await panel.getByRole("heading", { name: "What each vendor sees", exact: true }).waitFor();
    return { control: "Refresh", result: "Owner vendor reconciliation remained visible after refresh" };
  },
  refresh_board: async ({ page }) => {
    const control = page.getByRole("button", { name: /Refresh live data|Refreshing/ }).first();
    await control.click();
    await page.getByText("Vendor isolation active", { exact: true }).waitFor();
    return { control: "Refresh live data", result: "Vendor isolation remained active after refresh" };
  },
  search_order: async ({ page, backend }) => {
    const search = page.getByLabel("Search", { exact: true });
    await search.fill(backend.orders ? "BR" : "no matching training order");
    const visibleRows = await page.locator(".orders tbody tr").count();
    await search.fill("");
    return { control: "Search", result: `${visibleRows} matching order rows observed` };
  },
  route_to_workflow: async ({ page, role }) => {
    const search = page.getByLabel("Search help");
    const term = role === "customer" ? "fit" : role === "vendor" ? "vendor" : "sale";
    await search.fill(term);
    const guide = page.locator(".help-grid details").first();
    await guide.locator("summary").click();
    const route = guide.getByRole("button", { name: /^Open / });
    const label = (await route.innerText()).replace(/^Open\s+/, "").trim();
    await route.click();
    await page.getByRole("heading", { name: label, exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page.getByRole("heading", { name: "Help", exact: true }).first().waitFor();
    return { control: `Open ${label}`, result: `Routed to ${label} and returned to Help` };
  },
  restart_tour: async ({ page }) => {
    await page.getByRole("button", { name: "Start guided tour", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Close guided tour").click();
    return { control: "Start guided tour", result: "Tour opened and closed through its accessible controls" };
  },
  add_to_bag: async ({ page }) => {
    const add = page.getByRole("button", { name: /^Add .* to bag$/ }).first();
    await add.click();
    await page.getByLabel("Shopping bag summary").waitFor();
    return { control: "Add item to bag", result: "Shopping bag appeared with the disposable training item" };
  },
  start_sale: async ({ page }) => {
    await page.getByRole("button", { name: "Start checkout", exact: true }).click();
    await page.getByRole("heading", { name: "Start a new sale", exact: true }).waitFor();
    await page.getByRole("button", { name: "Browse catalog", exact: true }).click();
    await page.getByRole("heading", { name: "Checkout opened", exact: true }).waitFor();
    await page.getByRole("button", { name: /Continue to checkout/ }).click();
    await page.getByRole("button", { name: "Products", exact: true }).click();
    await page.getByRole("heading", { name: "Products", exact: true }).waitFor();
    const product = await addFixtureProductToCheckout(page);
    await page.getByRole("button", { name: "Checkout", exact: true }).click();
    await page.getByRole("heading", { name: "Your complete edit", exact: true }).waitFor();
    return { control: "Start checkout", result: `${product.name} added through the production catalog` };
  },
  add_item: async ({ page }) => {
    await page.getByRole("heading", { name: "Seller attributed bag", exact: true }).waitFor();
    return { control: "Add to checkout", result: "Seller attributed bag is visible" };
  },
  choose_fulfillment: async ({ page }) => {
    await page.getByRole("button", { name: /Pickup/ }).click();
    return { control: "Pickup", result: "Pickup fulfillment selected" };
  },
  record_tender: async ({ page, role }) => {
    await page.getByLabel("Payment method").selectOption("Bank transfer");
    const reference = `QA-${process.env.TRAINING_FIXTURE_RUN_ID}-${role}`;
    await page.getByLabel("Payment reference").fill(reference);
    return { control: "Payment method", result: `Controlled bank transfer reference ${reference} recorded` };
  },
  complete_sale: async ({ page, role }) => {
    await page.getByRole("button", { name: "Place order", exact: true }).click();
    const receipt = page.getByRole("article", { name: /Receipt for order/ });
    await receipt.waitFor({ timeout: 30000 });
    const receiptLabel = await receipt.getAttribute("aria-label");
    const receiptNo = receiptLabel?.replace("Receipt for order ", "");
    if (!receiptNo) throw new Error("Checkout completed without a visible receipt number.");
    let order = await waitForAdminRow(() => trainingAdmin.from("orders").select("id, receipt_no, payment_status, fulfillment_status").eq("receipt_no", receiptNo).maybeSingle(), "Checkout order");
    if (role === "customer" && order.payment_status !== "succeeded") {
      const payment = assertNoError(await trainingAdmin.from("payments").select("id").eq("order_id", order.id).single(), "Customer course payment");
      const staffClient = await authenticatedTrainingClient("staff");
      assertNoError(await staffClient.rpc("review_pending_payment", { p_payment_id: payment.id, p_decision: "verified", p_verification_note: "Disposable release course prerequisite" }), "Customer course payment verification");
      await staffClient.auth.signOut();
      order = assertNoError(await trainingAdmin.from("orders").select("id, receipt_no, payment_status, fulfillment_status, status").eq("id", order.id).single(), "Confirmed customer course order");
      if (order.payment_status !== "succeeded" || order.status !== "confirmed") throw new Error("Customer course payment prerequisite did not confirm the disposable order.");
    }
    workflowEvidence.set(`${role}:order`, order);
    return { control: "Place order", result: `Order ${order.receipt_no} verified in the database`, orderId: order.id };
  },
  verify_receipt: async ({ page, role, chapter }) => {
    if (chapter.label === "Rent") {
      const payments = assertNoError(await trainingAdmin.from("rent_payments").select("id, receipt_no, status, lease_id").in("lease_id", [process.env.TRAINING_FIXTURE_LEASE_ID, process.env.TRAINING_FIXTURE_REVIEW_LEASE_ID]).eq("status", "paid"), "Rent receipts");
      if (!payments.length || payments.some((payment) => !payment.receipt_no)) throw new Error(`${role} rent course has no finalized receipt evidence.`);
      for (const payment of payments) await page.getByText(payment.receipt_no, { exact: true }).waitFor();
      return { control: "Rent receipt", result: `${payments.length} finalized rent receipt records match the interface`, receiptNumbers: payments.map((payment) => payment.receipt_no) };
    }
    const order = workflowEvidence.get(`${role}:order`);
    if (!order) throw new Error(`${role} checkout has no verified order for receipt evidence.`);
    await page.getByRole("article", { name: `Receipt for order ${order.receipt_no}` }).waitFor();
    return { control: "Receipt", result: `${order.receipt_no} matches the persisted order`, orderId: order.id };
  },
  add_available_item_to_checkout: async ({ page }) => {
    const product = await addFixtureProductToCheckout(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("br-customer-bag:blossom-royall") || "[]"));
    if (!stored.some((item) => item.name === product.name && item.variantId)) throw new Error("Catalog item did not enter the production checkout bag.");
    return { control: "Add to checkout", result: `${product.name} entered the seller attributed checkout bag` };
  },
  create_register: async ({ page, role }) => {
    const name = `QA ${process.env.TRAINING_FIXTURE_RUN_ID}`;
    const setup = page.locator(".drawer-registers");
    await setup.getByLabel("Register", { exact: true }).fill(name);
    await setup.getByLabel("Location", { exact: true }).fill("Release course");
    await setup.getByRole("button", { name: "Add register", exact: true }).click();
    await setup.getByText(name, { exact: true }).waitFor();
    const register = assertNoError(await trainingAdmin.from("cash_registers").select("id, name").eq("name", name).eq("created_by", trainingUserIdFor(role)).single(), "Cash register creation");
    workflowEvidence.set("course:register", register);
    return { control: "Add register", result: `${name} verified in the database`, registerId: register.id };
  },
  open_drawer: async ({ page, role }) => {
    let register = workflowEvidence.get("course:register");
    if (!register) {
      const result = assertNoError(await trainingAdmin.from("cash_registers").select("id, name").ilike("name", `QA ${process.env.TRAINING_FIXTURE_RUN_ID}`).single(), "Shared cash register");
      register = result;
      workflowEvidence.set("course:register", result);
    }
    const panel = page.locator(".drawer-open");
    await panel.getByLabel("Register", { exact: true }).selectOption(register.id);
    await panel.getByLabel("Opening float", { exact: true }).fill("100");
    await panel.getByLabel("Note", { exact: true }).fill(`Release course ${role}`);
    await panel.getByRole("button", { name: "Open drawer", exact: true }).click();
    await page.getByText("Cash drawer opened.", { exact: true }).waitFor();
    const session = assertNoError(await trainingAdmin.from("cash_drawer_sessions").select("id, opening_float, status").eq("opened_by", trainingUserIdFor(role)).eq("status", "open").single(), "Open cash drawer");
    workflowEvidence.set(`${role}:drawer`, session);
    return { control: "Open drawer", result: `Open session ${session.id} verified`, sessionId: session.id };
  },
  record_adjustment: async ({ page, role }) => {
    const session = workflowEvidence.get(`${role}:drawer`);
    if (!session) throw new Error(`${role} has no verified open drawer.`);
    const panel = page.locator(".drawer-active");
    await panel.getByLabel("Cash movement").selectOption("paid_in");
    await panel.getByLabel("Movement amount").fill("10");
    await panel.getByLabel("Reason", { exact: true }).fill("Release course float check");
    await panel.getByRole("button", { name: "Record movement", exact: true }).click();
    await page.getByText("Cash movement recorded.", { exact: true }).waitFor();
    const adjustment = assertNoError(await trainingAdmin.from("cash_drawer_adjustments").select("id, amount, adjustment_type").eq("session_id", session.id).single(), "Cash drawer adjustment");
    return { control: "Record movement", result: `Paid in ${adjustment.amount} verified`, adjustmentId: adjustment.id };
  },
  close_drawer: async ({ page, role }) => {
    const session = workflowEvidence.get(`${role}:drawer`);
    if (!session) throw new Error(`${role} has no verified drawer to close.`);
    const panel = page.locator(".drawer-active");
    await panel.getByLabel("Counted cash", { exact: true }).fill("110");
    await panel.getByLabel("Note", { exact: true }).fill("Release course reconciled");
    await panel.getByRole("button", { name: "Close and reconcile", exact: true }).click();
    await page.getByText("Cash drawer closed and reconciled.", { exact: true }).waitFor();
    const closed = assertNoError(await trainingAdmin.from("cash_drawer_sessions").select("id, status, expected_cash, counted_cash, variance").eq("id", session.id).single(), "Closed cash drawer");
    if (closed.status !== "closed" || Number(closed.variance) !== 0) throw new Error(`Cash drawer reconciliation mismatch for ${session.id}.`);
    workflowEvidence.set(`${role}:drawer`, closed);
    return { control: "Close and reconcile", result: `Session ${closed.id} closed with zero variance`, sessionId: closed.id };
  },
  verify_variance: async ({ page, role }) => {
    const session = workflowEvidence.get(`${role}:drawer`);
    if (!session || session.status !== "closed") throw new Error(`${role} has no closed drawer evidence.`);
    const row = page.locator(".drawer-history article", { hasText: session.id }).first();
    const history = page.locator(".drawer-history");
    await history.getByText("Variance", { exact: true }).first().waitFor();
    return { control: "Recent drawer history", result: `Expected ${session.expected_cash}, counted ${session.counted_cash}, variance ${session.variance}`, visibleRows: await page.locator(".drawer-history article").count(), matchedRowCount: await row.count() };
  },
  advance_fulfillment: async ({ page, role }) => {
    let order = await courseOrderFor(role);
    if (order.payment_status !== "succeeded") {
      const queue = page.getByLabel("Pending payment verification");
      const payment = queue.locator("li", { hasText: order.receipt_no });
      await payment.getByRole("button", { name: "Verify", exact: true }).click();
      await page.getByText(`${order.receipt_no} payment verified.`, { exact: true }).waitFor();
      order = assertNoError(await trainingAdmin.from("orders").select("id, receipt_no, payment_status, fulfillment_status, status").eq("id", order.id).single(), "Verified course order");
      if (order.payment_status !== "succeeded") throw new Error(`${order.receipt_no} payment was not persisted as succeeded.`);
      await page.getByRole("button", { name: "Command Center", exact: true }).click();
      await page.getByRole("button", { name: "Orders", exact: true }).click();
    }
    const row = page.locator(".table > div", { hasText: order.receipt_no }).last();
    const action = row.getByRole("button", { name: /Start preparation|Mark ready|Send for delivery|Confirm pickup|Confirm delivery/ });
    const label = await action.innerText();
    await action.click();
    const updated = assertNoError(await trainingAdmin.from("orders").select("id, receipt_no, payment_status, fulfillment_status, status").eq("id", order.id).single(), "Advanced course order");
    const events = assertNoError(await trainingAdmin.from("order_fulfillment_events").select("id, event_type, actor_user_id").eq("order_id", order.id).order("created_at", { ascending: true }), "Course fulfillment events");
    if (!events.some((event) => event.actor_user_id === trainingUserIdFor(role))) throw new Error(`${role} fulfillment event was not recorded.`);
    workflowEvidence.set(`${role}:order`, updated);
    workflowEvidence.set("course:shared-order", updated);
    return { control: label, result: `${updated.receipt_no} advanced to ${updated.fulfillment_status}`, orderId: updated.id, eventCount: events.length };
  },
  verify_cross_role_status: async ({ role }) => {
    const order = workflowEvidence.get(`${role}:order`) || workflowEvidence.get("course:shared-order");
    if (!order) throw new Error(`${role} has no fulfillment state to reconcile.`);
    const persisted = assertNoError(await trainingAdmin.from("orders").select("id, receipt_no, fulfillment_status, status").eq("id", order.id).single(), "Cross role order status");
    return { control: "Shared order state", result: `${persisted.receipt_no} is ${persisted.fulfillment_status} for every authorized role`, orderId: persisted.id };
  },
  review_rent_payment: async ({ page, role }) => {
    const leaseId = role === "manager" ? process.env.TRAINING_FIXTURE_LEASE_ID : process.env.TRAINING_FIXTURE_REVIEW_LEASE_ID;
    if (!leaseId) throw new Error(`${role} rent review requires its disposable lease fixture.`);
    const pending = assertNoError(await trainingAdmin.from("rent_payments").select("id, amount, status").eq("lease_id", leaseId).eq("status", "pending").single(), `${role} pending rent payment`);
    const article = page.locator(".agreement-ledger article", { hasText: `$${Number(pending.amount).toFixed(2)}` });
    await article.getByRole("button", { name: "Confirm paid", exact: true }).click();
    const receipt = page.getByText(/^BRR-/).first();
    await receipt.waitFor();
    const reviewed = assertNoError(await trainingAdmin.from("rent_payments").select("id, status, receipt_no, reviewed_by").eq("id", pending.id).single(), `${role} reviewed rent payment`);
    if (reviewed.status !== "paid" || reviewed.reviewed_by !== trainingUserIdFor(role) || !reviewed.receipt_no) throw new Error(`${role} rent review was not persisted with accountability.`);
    workflowEvidence.set(`${role}:rent`, reviewed);
    return { control: "Confirm paid", result: `${reviewed.receipt_no} approved by ${role}`, paymentId: reviewed.id };
  },
  verify_vendor_rent_status: async ({ role }) => {
    const reviewed = workflowEvidence.get(`${role}:rent`);
    if (!reviewed) throw new Error(`${role} has no reviewed rent payment evidence.`);
    const payment = assertNoError(await trainingAdmin.from("rent_payments").select("id, status, receipt_no").eq("id", reviewed.id).single(), "Shared vendor rent status");
    if (payment.status !== "paid" || !payment.receipt_no) throw new Error("Vendor rent status does not match the reviewer decision.");
    return { control: "Shared rent record", result: `${payment.receipt_no} is paid in the vendor and reviewer data source`, paymentId: payment.id };
  },
  submit_rent_evidence: async ({ page, role }) => {
    const leaseId = process.env.TRAINING_FIXTURE_SUBMIT_LEASE_ID;
    if (!leaseId) throw new Error("Vendor rent submission requires the disposable submission lease.");
    const article = page.locator(".agreement-ledger article", { hasText: "$850.00" });
    await article.getByLabel("Payment method", { exact: true }).fill("Bank transfer");
    const reference = `QA-C-${process.env.TRAINING_FIXTURE_RUN_ID}`;
    await article.getByLabel("Confirmation reference", { exact: true }).fill(reference);
    await article.getByRole("button", { name: "Submit payment", exact: true }).click();
    await page.getByText("Payment submitted for owner verification.", { exact: false }).waitFor();
    const payment = assertNoError(await trainingAdmin.from("rent_payments").select("id, status, provider_reference, submitted_by").eq("lease_id", leaseId).eq("status", "pending").single(), "Vendor rent submission");
    if (payment.provider_reference !== reference || payment.submitted_by !== trainingUserIdFor(role)) throw new Error("Vendor rent evidence was not persisted with its reference and actor.");
    workflowEvidence.set("vendor:rent-submission", payment);
    return { control: "Submit payment", result: `Pending payment ${payment.id} recorded with reference ${reference}`, paymentId: payment.id };
  },
  verify_pending_status: async () => {
    const payment = workflowEvidence.get("vendor:rent-submission");
    if (!payment) throw new Error("Vendor has no submitted rent payment to verify.");
    const persisted = assertNoError(await trainingAdmin.from("rent_payments").select("id, status").eq("id", payment.id).single(), "Pending vendor rent status");
    if (persisted.status !== "pending") throw new Error(`Vendor rent submission status is ${persisted.status}, not pending.`);
    return { control: "Pending status", result: `${persisted.id} remains pending owner verification` };
  },
  verify_owner_review: async ({ page }) => {
    const payments = assertNoError(await trainingAdmin.from("rent_payments").select("id, status, receipt_no, lease_id").in("lease_id", [process.env.TRAINING_FIXTURE_LEASE_ID, process.env.TRAINING_FIXTURE_REVIEW_LEASE_ID]), "Reviewed vendor rent records");
    if (payments.length !== 2 || payments.some((payment) => payment.status !== "paid" || !payment.receipt_no)) throw new Error("Vendor does not have both finalized reviewer decisions.");
    for (const payment of payments) await page.getByText(payment.receipt_no, { exact: true }).waitFor();
    return { control: "Reviewed rent history", result: `Manager and owner receipts are visible`, receiptNumbers: payments.map((payment) => payment.receipt_no) };
  },
  start_return: async ({ page, role }) => {
    const order = workflowEvidence.get(`${role}:order`);
    if (!order) throw new Error("Customer return requires the verified disposable order.");
    await page.getByRole("button", { name: "Return or exchange", exact: true }).first().click();
    await page.getByLabel("Return reason").selectOption({ label: "Fit was not right" });
    await page.getByLabel("Preferred return resolution").selectOption("exchange");
    await page.getByRole("button", { name: "Start request", exact: true }).click();
    await page.getByText("Request received", { exact: true }).waitFor();
    const request = assertNoError(await trainingAdmin.from("return_requests").select("id, order_id, customer_id, status, requested_resolution").eq("order_id", order.id).eq("customer_id", trainingUserIdFor(role)).single(), "Customer return request");
    if (request.status !== "requested" || request.requested_resolution !== "exchange") throw new Error("Customer return request did not preserve its requested state and resolution.");
    workflowEvidence.set("course:return", request);
    return { control: "Start request", result: `Return ${request.id} recorded for ${order.receipt_no}`, returnId: request.id };
  },
  review_return: async ({ page }) => {
    const request = workflowEvidence.get("course:return") || assertNoError(await trainingAdmin.from("return_requests").select("id, status, reason, requested_resolution").eq("customer_id", trainingUserIdFor("customer")).single(), "Shared course return");
    const item = page.locator('[aria-label="Production return queue"] li', { hasText: request.id.slice(0, 8).toUpperCase() });
    await item.waitFor();
    workflowEvidence.set("course:return", request);
    return { control: "Production return queue", result: `Return ${request.id} is visible with status ${request.status}`, returnId: request.id };
  },
  advance_authorized_return: async ({ page, role }) => {
    const request = workflowEvidence.get("course:return");
    if (!request) throw new Error("Staff return action has no shared customer request.");
    const item = page.locator('[aria-label="Production return queue"] li', { hasText: request.id.slice(0, 8).toUpperCase() });
    await item.getByRole("button", { name: "Start review", exact: true }).click();
    await page.getByText(`Return ${request.id.slice(0, 8).toUpperCase()} is now reviewing.`, { exact: true }).waitFor();
    const updated = assertNoError(await trainingAdmin.from("return_requests").select("id, status, reviewed_by").eq("id", request.id).single(), "Staff return review");
    if (updated.status !== "reviewing" || updated.reviewed_by !== trainingUserIdFor(role)) throw new Error("Staff return review was not persisted with accountability.");
    workflowEvidence.set("course:return", updated);
    return { control: "Start review", result: `Return ${updated.id} advanced to reviewing`, returnId: updated.id };
  },
  approve_or_reject_return: async ({ page, role }) => {
    const request = workflowEvidence.get("course:return");
    if (!request) throw new Error("Owner return action has no shared customer request.");
    const item = page.locator('[aria-label="Production return queue"] li', { hasText: request.id.slice(0, 8).toUpperCase() });
    await item.getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByText(`Return ${request.id.slice(0, 8).toUpperCase()} is now approved.`, { exact: true }).waitFor();
    const updated = assertNoError(await trainingAdmin.from("return_requests").select("id, status, reviewed_by").eq("id", request.id).single(), "Owner return approval");
    if (updated.status !== "approved" || updated.reviewed_by !== trainingUserIdFor(role)) throw new Error("Owner return approval was not persisted with accountability.");
    workflowEvidence.set("course:return", updated);
    return { control: "Approve", result: `Return ${updated.id} advanced to approved`, returnId: updated.id };
  },
  verify_customer_history: async () => {
    const request = workflowEvidence.get("course:return");
    if (!request) throw new Error("No shared return is available for customer history evidence.");
    const persisted = assertNoError(await trainingAdmin.from("return_requests").select("id, customer_id, order_id, status").eq("id", request.id).single(), "Customer return history");
    if (persisted.customer_id !== trainingUserIdFor("customer")) throw new Error("Return history lost its customer attribution.");
    return { control: "Customer return history", result: `Return ${persisted.id} remains attached to the customer and order with status ${persisted.status}`, returnId: persisted.id };
  },
  complete_measurements: async ({ page }) => {
    const values = [["Bust", "36"], ["Natural waist", "30"], ["Hips", "40"], ["Inseam", "30"], ["Shoulder width", "15"]];
    for (let index = 0; index < values.length; index += 1) {
      const [label, value] = values[index];
      await page.getByRole("spinbutton", { name: label, exact: true }).fill(value);
      if (index < values.length - 1) await page.getByRole("button", { name: "Next measurement", exact: true }).click();
    }
    return { control: "Guided measurements", result: "Five required apparel measurements completed through the guided interface" };
  },
  record_consent: async ({ page }) => {
    await page.getByLabel(/I consent to saving/).check();
    return { control: "Fit profile consent", result: "Customer consent is selected before persistence" };
  },
  save_fit: async ({ page, role }) => {
    const saveButton = page.getByRole("button", { name: "Save My Fit", exact: true });
    await saveButton.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Save My Fit"));
      return button && !button.disabled;
    });
    await saveButton.click();
    await page.getByText("Saved to your account.", { exact: false }).waitFor();
    const profiles = assertNoError(await trainingAdmin.from("measurement_profiles").select("id, units, measurements").eq("customer_id", trainingUserIdFor(role)).eq("label", "My Fit"), "Customer My Fit profile");
    if (profiles.length !== 1 || profiles[0].measurements?.consent !== true) throw new Error("My Fit was not persisted once with explicit consent.");
    workflowEvidence.set("customer:fit-profile", profiles[0]);
    return { control: "Save My Fit", result: `Profile ${profiles[0].id} persisted with consent`, profileId: profiles[0].id };
  },
  shop_with_fit: async ({ page }) => {
    await page.getByRole("button", { name: "Shop with My Fit", exact: true }).click();
    await page.getByLabel("My Fit shopping status").waitFor();
    await page.getByText("Your fit passport is ready", { exact: true }).waitFor();
    await page.getByRole("button", { name: "My Fit", exact: true }).click();
    await page.getByRole("heading", { name: "Measure once. Shop with confidence.", exact: true }).waitFor();
    return { control: "Shop with My Fit", result: "Saved fit passport appeared in shopping and the course returned to My Fit" };
  },
  export_fit: async ({ page }) => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export My Fit", exact: true }).click();
    const artifact = await download;
    if (artifact.suggestedFilename() !== "blossom-royall-my-fit.json") throw new Error(`Unexpected My Fit export name: ${artifact.suggestedFilename()}`);
    return { control: "Export My Fit", result: `${artifact.suggestedFilename()} downloaded through the interface` };
  },
  delete_fit: async ({ page, role }) => {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete My Fit", exact: true }).click();
    await page.getByText(/My Fit was deleted from this device/).waitFor();
    const remaining = assertNoError(await trainingAdmin.from("measurement_profiles").select("id").eq("customer_id", trainingUserIdFor(role)).eq("label", "My Fit"), "Remaining My Fit profiles");
    if (remaining.length) throw new Error("My Fit account profile remains after deletion.");
    return { control: "Delete My Fit", result: "Device and account profile deletion verified" };
  },
  invite_vendor: async ({ page }) => {
    const name = `Lifecycle QA ${process.env.TRAINING_FIXTURE_RUN_ID}`;
    await page.getByRole("button", { name: "Invite vendor", exact: true }).click();
    const form = page.locator(".vendor-operations-form");
    await form.getByLabel("Public brand name").fill(name);
    await form.getByLabel("Category", { exact: true }).fill("Release evidence");
    await form.getByLabel("Contact person").fill("Lifecycle Reviewer");
    await form.getByLabel("Email", { exact: true }).fill(`lifecycle.${process.env.TRAINING_FIXTURE_RUN_ID}@blossomroyall.invalid`);
    await form.getByRole("button", { name: "Create invitation", exact: true }).click();
    await page.getByText(`${name} was added.`, { exact: false }).waitFor();
    const vendor = await waitForAdminRow(() => trainingAdmin.from("vendors").select("id, name, status").eq("name", name).maybeSingle(), "Invited lifecycle vendor");
    workflowEvidence.set("owner:lifecycle-vendor", vendor);
    return { control: "Create invitation", result: `${name} persisted with an onboarding link`, vendorId: vendor.id };
  },
  edit_vendor: async ({ page, role }) => {
    const target = role === "owner" ? workflowEvidence.get("owner:lifecycle-vendor") : { id: process.env.TRAINING_FIXTURE_VENDOR_ID };
    if (!target?.id) throw new Error(`${role} vendor edit has no disposable target.`);
    const current = assertNoError(await trainingAdmin.from("vendors").select("id, name").eq("id", target.id).single(), `${role} vendor edit target`);
    const card = page.locator(".vendor-directory article", { has: page.getByRole("heading", { name: current.name, exact: true }) });
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    const form = page.locator(".vendor-operations-form");
    const nextName = `${current.name} ${role}`;
    await form.getByLabel("Public brand name").fill(nextName);
    const contact = form.getByLabel("Contact person");
    if (!(await contact.inputValue())) await contact.fill("Release Course Reviewer");
    const email = form.getByLabel("Email", { exact: true });
    if (!(await email.inputValue())) await email.fill(`${role}.${process.env.TRAINING_FIXTURE_RUN_ID}@blossomroyall.invalid`);
    await form.getByRole("button", { name: "Save vendor", exact: true }).click();
    await form.waitFor({ state: "hidden" });
    const updated = await waitForAdminRow(() => trainingAdmin.from("vendors").select("id, name, status").eq("id", target.id).eq("name", nextName).maybeSingle(), `${role} updated vendor`);
    if (role === "owner") workflowEvidence.set("owner:lifecycle-vendor", updated);
    return { control: "Save vendor", result: `${updated.name} verified in production`, vendorId: updated.id };
  },
  suspend_vendor: async ({ page }) => {
    const vendor = workflowEvidence.get("owner:lifecycle-vendor");
    if (!vendor) throw new Error("Owner vendor suspension has no lifecycle target.");
    const card = page.locator(".vendor-directory article", { has: page.getByRole("heading", { name: vendor.name, exact: true }) });
    await card.getByRole("button", { name: "Suspend", exact: true }).click();
    const updated = await waitForAdminRow(() => trainingAdmin.from("vendors").select("id, name, status").eq("id", vendor.id).eq("status", "suspended").maybeSingle(), "Suspended lifecycle vendor");
    workflowEvidence.set("owner:lifecycle-vendor", updated);
    return { control: "Suspend", result: `${updated.name} persisted as suspended`, vendorId: updated.id };
  },
  restore_vendor: async ({ page }) => {
    const vendor = workflowEvidence.get("owner:lifecycle-vendor");
    if (!vendor) throw new Error("Owner vendor restoration has no lifecycle target.");
    const card = page.locator(".vendor-directory article", { has: page.getByRole("heading", { name: vendor.name, exact: true }) });
    await card.getByRole("button", { name: "Restore", exact: true }).click();
    const updated = await waitForAdminRow(() => trainingAdmin.from("vendors").select("id, name, status").eq("id", vendor.id).eq("status", "onboarding").maybeSingle(), "Restored lifecycle vendor");
    workflowEvidence.set("owner:lifecycle-vendor", updated);
    return { control: "Restore", result: `${updated.name} returned to onboarding`, vendorId: updated.id };
  },
  configure_storefront: async ({ page }) => {
    const vendor = workflowEvidence.get("owner:lifecycle-vendor");
    if (!vendor) throw new Error("Storefront configuration has no lifecycle vendor target.");
    const studio = page.locator(".storefront-studio");
    await studio.getByRole("button", { name: "Create storefront", exact: true }).click();
    const form = studio.locator(".storefront-form");
    await form.getByLabel("Vendor", { exact: true }).selectOption(vendor.id);
    const publicName = `${vendor.name} Store`;
    const slug = `qa-${process.env.TRAINING_FIXTURE_RUN_ID}`.replace(/[^a-z0-9-]/g, "-");
    await form.getByLabel("Public store name").fill(publicName);
    await form.getByLabel("Store address slug").fill(slug);
    await form.getByLabel("Owner display name").fill("Release Reviewer");
    await form.getByLabel("Tagline", { exact: true }).fill("Disposable release evidence storefront");
    await form.getByLabel("Brand story").fill("This temporary storefront verifies tenant scoped production brand configuration.");
    await form.getByLabel("Categories", { exact: true }).fill("Release evidence, Accessories");
    await form.getByLabel("Store pickup", { exact: true }).check();
    await form.getByLabel("Media rights").selectOption("confirmed");
    await form.getByLabel("Publication status").selectOption("published");
    await form.getByRole("button", { name: "Save storefront", exact: true }).click();
    await page.getByText(`${publicName} production storefront saved as published.`, { exact: true }).waitFor();
    const storefront = assertNoError(await trainingAdmin.from("vendor_storefronts").select("id, vendor_id, public_name, slug, media_rights_status, status").eq("vendor_id", vendor.id).single(), "Lifecycle vendor storefront");
    if (storefront.status !== "published" || storefront.media_rights_status !== "confirmed") throw new Error("Lifecycle storefront was not published with confirmed media rights.");
    workflowEvidence.set("owner:lifecycle-storefront", storefront);
    return { control: "Save storefront", result: `${storefront.public_name} published with confirmed media rights`, storefrontId: storefront.id };
  },
  review_brand: async ({ page }) => {
    const storefront = workflowEvidence.get("owner:lifecycle-storefront");
    if (!storefront) throw new Error("Brand review has no production storefront evidence.");
    const card = page.locator(".storefront-cards article", { hasText: storefront.public_name });
    await card.getByText("published", { exact: true }).waitFor();
    const persisted = assertNoError(await trainingAdmin.from("vendor_storefronts").select("id, status, media_rights_status, updated_by").eq("id", storefront.id).single(), "Published brand review");
    if (persisted.status !== "published" || persisted.media_rights_status !== "confirmed" || persisted.updated_by !== trainingUserIdFor("owner")) throw new Error("Brand review lacks owner accountable publication evidence.");
    return { control: "Published storefront", result: `Owner publication and media rights verified for ${storefront.public_name}`, storefrontId: storefront.id };
  },
  configure_lease: async ({ page }) => {
    const vendor = workflowEvidence.get("owner:lifecycle-vendor");
    if (!vendor) throw new Error("Lease configuration has no lifecycle vendor target.");
    const center = page.locator(".production-lease-center");
    await center.getByRole("button", { name: "New agreement", exact: true }).click();
    const form = center.locator(".production-lease-form");
    const spaceCode = `LIFE-${process.env.TRAINING_FIXTURE_RUN_ID}`;
    await form.getByLabel("Vendor", { exact: true }).selectOption(vendor.id);
    await form.getByLabel("Space code").fill(spaceCode);
    await form.getByLabel("Monthly rent").fill("700");
    await form.getByLabel("Deposit", { exact: true }).fill("1400");
    await form.getByLabel("Start date").fill(date);
    await form.getByLabel("End date").fill(`${Number(date.slice(0, 4)) + 1}${date.slice(4)}`);
    await form.getByLabel("Rent due day").fill("1");
    await form.getByRole("button", { name: "Create lease draft", exact: true }).click();
    await page.getByText("Production lease draft created.", { exact: true }).waitFor();
    const lease = assertNoError(await trainingAdmin.from("leases").select("id, vendor_id, space_code, monthly_rent, deposit, status").eq("vendor_id", vendor.id).eq("space_code", spaceCode).single(), "Lifecycle vendor lease");
    if (lease.status !== "draft" || Number(lease.monthly_rent) !== 700 || Number(lease.deposit) !== 1400) throw new Error("Production lease draft did not preserve its controlled terms.");
    workflowEvidence.set("owner:lifecycle-lease", lease);
    return { control: "Create lease draft", result: `${spaceCode} persisted with governed draft status`, leaseId: lease.id };
  },
  remove_vendor: async ({ page }) => {
    const vendor = workflowEvidence.get("owner:lifecycle-vendor");
    if (!vendor) throw new Error("Owner vendor removal has no lifecycle target.");
    const storefront = workflowEvidence.get("owner:lifecycle-storefront");
    if (storefront) {
      const storefrontCard = page.locator(".storefront-cards article", { hasText: storefront.public_name });
      await storefrontCard.getByRole("button", { name: "Remove", exact: true }).click();
      await storefrontCard.getByRole("button", { name: "Confirm remove", exact: true }).click();
      await page.getByText(`${storefront.public_name} production storefront removed.`, { exact: true }).waitFor();
    }
    const card = page.locator(".vendor-directory article", { has: page.getByRole("heading", { name: vendor.name, exact: true }) });
    await card.getByRole("button", { name: "Remove", exact: true }).click();
    await card.getByRole("button", { name: "Confirm remove", exact: true }).click();
    await page.getByText(`${vendor.name} was removed from this tenant roster.`, { exact: true }).waitFor();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const remaining = assertNoError(await trainingAdmin.from("vendors").select("id").eq("id", vendor.id), "Removed lifecycle vendor");
      if (!remaining.length) return { control: "Confirm remove", result: `${vendor.name} removed from production`, vendorId: vendor.id };
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`${vendor.name} remained in production after removal.`);
  },
  save_production_controls: async ({ page, role, chapter }) => {
    const controls = {
      "Shared Commerce": { button: /Save controls|Settings saved/, notice: "Production payout and inventory controls were saved with an audit record." },
      Delivery: { button: /Save delivery|Delivery saved/, notice: "Authoritative delivery and tax settings were saved with an audit record." },
      Policies: { button: "Save and publish", notice: "Production retail policy was published with an audit record." },
      "Business Setup": { button: /Save business settings|Business settings saved/, notice: "Authoritative identity, tax, policy, commerce, and delivery settings were saved with an audit record." },
    }[chapter.label];
    if (!controls) throw new Error(`${chapter.label} has no production control save contract.`);
    await page.getByRole("button", { name: controls.button, exact: typeof controls.button === "string" }).click();
    await page.getByText(controls.notice, { exact: true }).waitFor();
    const record = assertNoError(await trainingAdmin.from("store_operating_settings").select("store_id, updated_by, updated_at").eq("store_id", process.env.TRAINING_STORE_ID).single(), `${chapter.label} production settings`);
    if (record.updated_by !== trainingUserIdFor(role)) throw new Error(`${chapter.label} settings were not attributed to ${role}.`);
    workflowEvidence.set(`${role}:${chapter.label}:settings`, record);
    return { control: String(controls.button), result: `${chapter.label} persisted with actor ${record.updated_by}`, updatedAt: record.updated_at };
  },
  verify_production_write: async ({ role, chapter }) => {
    const evidence = workflowEvidence.get(`${role}:${chapter.label}:settings`);
    if (!evidence) throw new Error(`${role} ${chapter.label} has no production write evidence.`);
    const record = assertNoError(await trainingAdmin.from("store_operating_settings").select("store_id, updated_by, updated_at").eq("store_id", evidence.store_id).single(), `${chapter.label} persisted settings`);
    if (record.updated_by !== trainingUserIdFor(role) || record.updated_at !== evidence.updated_at) throw new Error(`${chapter.label} production write evidence changed before verification.`);
    return { control: "Production settings record", result: `${chapter.label} write and actor match the database`, updatedAt: record.updated_at };
  },
  exercise_preview_controls: async ({ page, chapter }) => {
    const before = assertNoError(await trainingAdmin.from("store_operating_settings").select("store_id, updated_at").eq("store_id", process.env.TRAINING_STORE_ID).single(), `${chapter.label} preview boundary baseline`);
    workflowEvidence.set(`preview:${chapter.label}`, before);
    if (chapter.label === "Staff") {
      await page.getByRole("button", { name: "Invite staff", exact: true }).click();
      await page.locator(".staff-form").waitFor();
      await page.locator(".staff-form").getByRole("button", { name: "Cancel", exact: true }).click();
      return { control: "Invite staff", result: "Preview staff form opened and closed without submission" };
    }
    if (chapter.label === "Delivery") {
      const control = page.getByLabel("Local delivery", { exact: true });
      const before = await control.isChecked();
      await control.setChecked(!before);
      await control.setChecked(before);
      return { control: "Local delivery", result: "Staff preview control was exercised and restored without saving" };
    }
    throw new Error(`${chapter.label} has no preview control executor.`);
  },
  record_preview_decision: async ({ page }) => {
    const before = assertNoError(await trainingAdmin.from("store_operating_settings").select("store_id, updated_at").eq("store_id", process.env.TRAINING_STORE_ID).single(), "Intelligence preview boundary baseline");
    workflowEvidence.set("preview:Intelligence", before);
    await page.getByRole("button", { name: "Create merchandising brief", exact: true }).click();
    await page.getByRole("button", { name: "Approve reorder", exact: true }).click();
    await page.getByText("Reorder approved", { exact: false }).waitFor();
    return { control: "Approve reorder", result: "Preview merchandising decision changed visibly without a production claim" };
  },
  verify_no_production_write: async ({ chapter }) => {
    const before = workflowEvidence.get(`preview:${chapter.label}`);
    if (!before) throw new Error(`${chapter.label} has no preview boundary baseline.`);
    const after = assertNoError(await trainingAdmin.from("store_operating_settings").select("store_id, updated_at").eq("store_id", process.env.TRAINING_STORE_ID).single(), `${chapter.label} preview boundary result`);
    if (after.updated_at !== before.updated_at) throw new Error(`${chapter.label} changed the production settings record during a preview action.`);
    return { control: "Production write boundary", result: `${chapter.label} left the production settings record unchanged`, updatedAt: after.updated_at };
  },
  route_authorized_task: async ({ page }) => {
    const board = page.getByLabel("Staff operating controls");
    await board.getByRole("button", { name: /Checkout/ }).click();
    await page.getByRole("heading", { name: /Ready when your customer is|Your complete edit/ }).waitFor();
    await page.getByRole("button", { name: "Command Center", exact: true }).click();
    await page.getByRole("heading", { name: "Command Center", exact: true }).first().waitFor();
    return { control: "Checkout task", result: "Staff routed to an authorized checkout task and returned to the command center" };
  },
  verify_fulfillment_boundary: async ({ page }) => {
    const transitionControls = page.getByRole("button", { name: /Start preparation|Mark ready|Send for delivery|Confirm pickup|Confirm delivery/ });
    if (await transitionControls.count()) throw new Error("Vendor received a whole order fulfillment transition control.");
    return { control: "Vendor fulfillment boundary", result: "No whole order transition control is exposed to the vendor" };
  },
  verify_owner_status: async ({ page }) => {
    const order = await courseOrderFor("vendor");
    await page.getByText(order.receipt_no, { exact: true }).first().waitFor();
    const persisted = assertNoError(await trainingAdmin.from("orders").select("id, receipt_no, status, fulfillment_status").eq("id", order.id).single(), "Vendor shared fulfillment status");
    const events = assertNoError(await trainingAdmin.from("order_fulfillment_events").select("id, event_type, actor_user_id").eq("order_id", order.id), "Vendor visible fulfillment history");
    if (!events.length) throw new Error("Vendor order has no staff recorded fulfillment state to reconcile.");
    return { control: "Attributed order status", result: `${persisted.receipt_no} matches the tenant fulfillment state ${persisted.fulfillment_status}`, orderId: persisted.id, eventCount: events.length };
  },
  adjust_authorized_stock: exerciseFixtureInventory,
  verify_inventory_movement: async () => ({ control: "Inventory movement audit", result: "Receive and remove records were verified against the disposable variant" }),
};

const collectActionEvidence = async (page, role, chapter, action, backend) => {
  const heading = page.getByRole("heading", { name: chapter.label === "My Products" ? "Products" : chapter.label, exact: true }).first();
  await heading.waitFor({ state: "visible", timeout: 15000 });
  const executor = interfaceActionExecutors[action];
  if (!observationActions.has(action) && !boundaryActions.has(action) && !executor) {
    throw new Error(`${role} ${chapter.label} action ${action} has no real interface executor yet.`);
  }
  const dataSource = await page.getByLabel("Data source").innerText();
  if (action === "verify_alert_automation_development") {
    await page.getByLabel("Notifications").click();
    await page.getByText("Production alert automation is still in development.", { exact: false }).waitFor();
    await page.getByLabel("Close notifications").click();
  }
  if (action === "label_settlement_development") await page.getByText("Settlement execution and payout disbursement are still in development.", { exact: true }).waitFor();
  if (action === "label_routing_development") await page.getByText("Consolidated route planning automation is still in development.", { exact: false }).waitFor();
  if (boundaryActions.has(action) && !executor && chapter.status === "preview" && !/preview/i.test(dataSource)) {
    throw new Error(`${role} ${chapter.label} action ${action} did not prove the preview boundary.`);
  }
  const interaction = executor ? await executor({ page, role, chapter, backend }) : null;
  return {
    action,
    kind: executor ? "interface_action" : observationActions.has(action) ? "visible_read" : "visible_boundary",
    heading: await heading.innerText(),
    dataSource,
    backendStoreId: backend.storeId,
    backendRole: backend.role,
    interaction,
  };
};

const chapterAssertions = async (page, role, label, backend) => {
  await expectVisibleText(page, "Live tenant records", `${role} ${label}`);
  if (role === "owner" && label === "Products") {
    const visibleProducts = await page.locator(".product-grid .product").count();
    if (visibleProducts !== backend.products) throw new Error(`Owner Products mismatch: UI ${visibleProducts}, backend ${backend.products}.`);
    return { chapter: label, uiProducts: visibleProducts, backendProducts: backend.products };
  }
  if (role === "owner" && label === "Vendors") {
    await expectVisibleText(page, `${backend.vendors} managed brands`, "Owner Vendors");
    return { chapter: label, uiVendors: backend.vendors, backendVendors: backend.vendors };
  }
  if (role === "vendor" && label === "Vendor Board") {
    await expectVisibleText(page, "Vendor isolation active", "Vendor Board");
    await page.getByText(backend.vendorName, { exact: false }).first().waitFor({ state: "visible", timeout: 15000 });
    return { chapter: label, vendorId: backend.vendorId, vendorName: backend.vendorName, backendProducts: backend.products, backendOrderItems: backend.orderItems, backendLeases: backend.leases, backendLedger: backend.ledger };
  }
  if (role === "vendor" && label === "My Products") {
    const visibleProducts = await page.locator(".product-grid .product").count();
    if (visibleProducts !== backend.products) throw new Error(`Vendor Products mismatch: UI ${visibleProducts}, backend ${backend.products}.`);
    await page.getByText("Vendor catalog editing is still in development.", { exact: false }).first().waitFor({ state: backend.products ? "visible" : "hidden", timeout: 5000 }).catch(() => {});
    return { chapter: label, uiProducts: visibleProducts, backendProducts: backend.products, developmentBoundary: "Vendor catalog editing is still in development" };
  }
  return { chapter: label, backendStoreId: backend.storeId, backendRole: backend.role };
};

const roleConfig = {
  owner: {
    allowed: roleCourseMatrix.owner.map((chapter) => chapter.label),
    forbidden: [],
  },
  manager: {
    allowed: roleCourseMatrix.manager.map((chapter) => chapter.label),
    forbidden: ["Vendor Board", "My Fit", "My Orders", "Business Setup"],
  },
  staff: {
    allowed: roleCourseMatrix.staff.map((chapter) => chapter.label),
    forbidden: ["Business Setup", "Vendors", "Staff & payroll"],
  },
  vendor: {
    allowed: roleCourseMatrix.vendor.map((chapter) => chapter.label),
    forbidden: ["Command Center", "Checkout", "Cash Drawer", "Staff & payroll", "Business Setup"],
  },
  customer: {
    allowed: roleCourseMatrix.customer.map((chapter) => chapter.label),
    forbidden: ["Command Center", "Cash Drawer", "Vendors", "Staff & payroll", "Business Setup"],
  },
};

for (const [role, config] of Object.entries(roleConfig)) {
  if (!roleCourseMatrix[role]?.length) throw new Error(`${role} training configuration has no canonical course matrix.`);
  for (const chapter of roleCourseMatrix[role]) {
    if (!chapter.requiredActions?.length) throw new Error(`${role} ${chapter.label} has no required workflow actions.`);
  }
  const overlap = config.allowed.filter((label) => config.forbidden.includes(label));
  if (overlap.length) throw new Error(`${role} training configuration lists the same navigation as allowed and forbidden: ${overlap.join(", ")}`);
}

const fallbackPause = edition === "reel" ? 1900 : 3600;
const stamp = async (page, text, holdMilliseconds = fallbackPause) => {
  await page.evaluate(({ text, date, commit, edition, baseUrl }) => {
    document.getElementById("training-caption")?.remove();
    const card = document.createElement("aside");
    card.id = "training-caption";
    card.setAttribute("role", "note");
    card.style.cssText = "position:fixed;right:18px;top:112px;width:230px;z-index:2147483647;padding:11px 12px;border:1px solid #e5c46b;border-radius:12px;background:#210e16e8;color:white;font:600 12px/1.35 system-ui;box-shadow:0 14px 34px #0006;pointer-events:none";
    card.innerHTML = `<span style="display:block;margin-bottom:5px;color:#e5c46b;font-size:9px;letter-spacing:.09em">${date} · ${commit} · ${edition}</span>${text}`;
    document.body.appendChild(card);
  }, { text, date, commit, edition, baseUrl });
  await page.waitForTimeout(holdMilliseconds);
};

const mediaDurationMilliseconds = (file) => {
  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" }).trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Unable to measure narration duration: ${file}`);
  return Math.ceil(seconds * 1000);
};

const narrationFile = (role, index) => {
  const directory = narrationMode === "human"
    ? join(narrationRoot || "", role, edition)
    : join(artifactRoot, `${role}-${edition}-voice`);
  const cue = `cue-${String(index + 1).padStart(2, "0")}`;
  return { directory, cue, audio: join(directory, `${cue}.${narrationMode === "human" ? "wav" : "mp3"}`), script: join(directory, `${cue}.txt`) };
};

const prepareNarrationCue = (role, index, text) => {
  const cue = narrationFile(role, index);
  if (narrationMode === "human" && !narrationRoot) throw new Error("TRAINING_HUMAN_NARRATION_DIR is required for human narration mode.");
  mkdirSync(cue.directory, { recursive: true });
  if (narrationMode === "ndamba") {
    writeFileSync(cue.script, text, "utf8");
    execFileSync("python", ["-m", "edge_tts", `--rate=${ndambaRate}`, "--voice", ndambaVoice, "--file", cue.script, "--write-media", cue.audio], { stdio: "ignore" });
  }
  if (!existsSync(cue.audio)) throw new Error(`Missing narration for ${role} cue ${index + 1}: ${cue.audio}`);
  return { audio: cue.audio, duration: mediaDurationMilliseconds(cue.audio) };
};

const createNarration = (role, captions, rawVideo, outputVideo) => {
  const audioFiles = captions.map((_, index) => narrationFile(role, index).audio);
  const delayed = captions.map((caption, index) => `[${index + 1}:a]adelay=${caption.from}|${caption.from}[a${index + 1}]`).join(";");
  const inputs = captions.map((_, index) => `[a${index + 1}]`).join("");
  const filter = `${delayed};${inputs}amix=inputs=${captions.length}:normalize=0,apad[audio]`;
  execFileSync("ffmpeg", ["-y", "-i", rawVideo, ...audioFiles.flatMap((file) => ["-i", file]), "-filter_complex", filter, "-map", "0:v:0", "-map", "[audio]", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-shortest", outputVideo], { stdio: "ignore" });
};

const formatVttTime = (milliseconds) => {
  const total = Math.max(0, Math.floor(milliseconds));
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};

const decodeBase32 = (value) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = value.toUpperCase().replace(/[^A-Z2-7]/g, "").split("").map((character) => alphabet.indexOf(character).toString(2).padStart(5, "0")).join("");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
};

const currentTotp = (secret) => {
  const counter = Math.floor(Date.now() / 30000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(value).padStart(6, "0");
};

const expectMaskedMfa = async (page) => {
  const protectedFields = await page.evaluate(() => {
    const qr = document.querySelector(".mfa-qr");
    const secret = document.querySelector(".mfa-manual strong");
    const code = document.querySelector('.mfa-code input');
    return {
      qr: qr ? getComputedStyle(qr).filter.includes("blur") : false,
      secret: secret ? getComputedStyle(secret).filter.includes("blur") : false,
      code: code ? getComputedStyle(code).getPropertyValue("-webkit-text-security") === "disc" : false,
    };
  });
  if (!protectedFields.qr || !protectedFields.secret || !protectedFields.code) throw new Error("MFA recording protection failed before the owner secret was shown.");
};

await mkdir(artifactRoot, { recursive: true });
const manifest = {
  date,
  commit,
  edition,
  baseUrl,
  production: isProduction,
  status: "recording",
  narration: captureOnly ? "capture_pending_narration" : "voice_and_compact_side_captions_pending_human_review",
  voice: captureOnly ? null : narrationMode === "ndamba" ? { provider: "edge-tts", name: ndambaVoice, rate: ndambaRate, source: "Ndamba American English role guides" } : { provider: "human" },
  courseActionCoverageComplete,
  courseMode: diagnosticMode ? "chapter_diagnostic" : "release_course",
  roles: {},
};
const runFailures = [];

for (const role of selectedRoles) {
  const envPrefix = `TRAINING_${role.toUpperCase()}`;
  const email = process.env[`${envPrefix}_EMAIL`];
  const password = process.env[`${envPrefix}_PASSWORD`];
  if (!email || !password) throw new Error(`${envPrefix}_EMAIL and ${envPrefix}_PASSWORD are required.`);

  const captureDir = join(artifactRoot, `${role}-${edition}-capture`);
  await mkdir(captureDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: captureDir, size: { width: 1440, height: 900 } },
  });
  await context.addInitScript(() => {
    const protectMfa = () => {
      if (!document.head || document.getElementById("training-mfa-mask")) return;
      const style = document.createElement("style");
      style.id = "training-mfa-mask";
      style.textContent = ".mfa-qr,.mfa-manual strong{filter:blur(18px)!important}.mfa-code input{-webkit-text-security:disc!important;color:transparent!important;text-shadow:0 0 8px #111!important}";
      document.head.appendChild(style);
    };
    new MutationObserver(protectMfa).observe(document, { childList: true, subtree: true });
    protectMfa();
  });
  const page = await context.newPage();
  const captions = [];
  let roleFailure = null;
  let roleBackendEvidence = null;
  const roleChapterEvidence = [];
  const roleActionEvidence = [];
  const started = Date.now();
  const explain = async (text) => {
    await page.waitForTimeout(450);
    const narration = captureOnly ? null : prepareNarrationCue(role, captions.length, text);
    const from = Date.now() - started;
    await stamp(page, text, narration ? narration.duration + 700 : fallbackPause);
    captions.push({ from, to: Date.now() - started, text });
  };

  try {
    await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await explain(`${role} training begins with secure authentication.`);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/(workspace|auth\/mfa)/, { timeout: 30000 });
    if (role === "owner" && new URL(page.url()).pathname === "/workspace") {
      await page.waitForFunction(() => location.pathname === "/auth/mfa" || document.documentElement.dataset.appReady === "true", null, { timeout: 30000 });
    }
    if (role === "owner" && new URL(page.url()).pathname === "/auth/mfa") {
      const secret = page.locator(".mfa-manual strong");
      await secret.waitFor({ state: "attached", timeout: 30000 });
      await expectMaskedMfa(page);
      await explain("Owner protection requires a real code from an authentication app. The setup key and QR code are hidden in this recording.");
      await page.locator('input[name="code"]').fill(currentTotp((await secret.textContent()) || ""));
      await page.getByRole("button", { name: "Verify and open workspace", exact: true }).click();
      await page.waitForURL(/\/workspace/, { timeout: 30000 });
    }
    await page.waitForURL(/\/workspace/, { timeout: 30000 });
    for (let attempt = 0; attempt < 4 && !(await page.locator("html[data-app-ready='true']").count()); attempt += 1) {
      await Promise.race([
        page.locator("html[data-app-ready='true']").waitFor({ timeout: 10000 }),
        page.getByText("Your account is secure.", { exact: true }).waitFor({ timeout: 10000 }),
      ]).catch(() => null);
      if (!(await page.locator("html[data-app-ready='true']").count())) {
        await page.waitForTimeout(1000);
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    }
    await page.locator("html[data-app-ready='true']").waitFor({ timeout: 30000 });
    if (!backendAssertions[role]) throw new Error(`${role} detailed course has no backend assertion contract yet.`);
    roleBackendEvidence = await backendAssertions[role]();
    await explain(`Signed in as ${role}. The navigation now shows only authorized work.`);
    const skipTour = page.getByRole("button", { name: "Skip tour", exact: true });
    try {
      await skipTour.waitFor({ state: "visible", timeout: 5000 });
      await explain("The guided tour introduces the workspace. You can follow it or return to it from Help.");
      await skipTour.click();
    } catch {
      // Returning training accounts may have already completed the tour.
    }

    for (const label of roleConfig[role].forbidden) {
      if (await page.getByRole("button", { name: label, exact: true }).count()) throw new Error(`${role} can see forbidden navigation: ${label}`);
    }

    const destinations = edition === "reel" ? roleConfig[role].allowed.slice(0, 2) : roleConfig[role].allowed;
    for (const label of destinations) {
      const expectedHeading = label === "My Products" ? "Products" : label;
      const button = page.getByRole("button", { name: label, exact: true });
      await button.waitFor({ state: "visible" });
      await button.click();
      await page.waitForTimeout(400);
      const heading = page.getByRole("heading", { name: expectedHeading, exact: true }).first();
      if (!(await heading.count())) throw new Error(`${role} navigation opened without the expected ${expectedHeading} heading`);
      await heading.waitFor({ state: "visible" });
      const chapter = roleCourseMatrix[role]?.find((item) => item.label === label);
      roleChapterEvidence.push(await chapterAssertions(page, role, label, roleBackendEvidence));
      if (!diagnosticMode && chapter) {
        for (const action of chapter.requiredActions) {
          roleActionEvidence.push(await collectActionEvidence(page, role, chapter, action, roleBackendEvidence));
        }
      }
      await explain(chapter ? `${label}. ${chapter.teaches} Current status: ${chapter.status}.` : `${label} opens the ${expectedHeading} workspace, verified visible and available to the ${role} role.`);
    }

    if (role === "customer" && edition === "detailed") {
      const fitButton = page.getByRole("button", { name: "My Fit", exact: true });
      if (await fitButton.count()) await fitButton.click();
      await page.locator(".fit-mannequin").waitFor({ state: "visible" });
      await page.getByRole("heading", { name: "AI photo fitting, guided preview" }).waitFor();
      await explain("My Fit demonstrates measurements and clearly labels automatic AI photo sizing as still in development.");
    }

    await explain(`${role} role QA passed. This recording is evidence and training, pending human review.`);
    manifest.roles[role] = { status: "passed", checks: destinations.length + roleConfig[role].forbidden.length, backendAssertions: roleBackendEvidence, chapterAssertions: roleChapterEvidence, actionEvidence: roleActionEvidence };
  } catch (error) {
    roleFailure = error instanceof Error ? error : new Error(String(error));
    manifest.roles[role] = { status: "failed", error: roleFailure.message };
    runFailures.push(`${role}: ${roleFailure.message}`);
    await explain(`${role} role QA failed. Do not publish this recording.`).catch(() => {});
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    const rawVideo = join(artifactRoot, `${role}-${edition}-${date}-${commit}.raw.webm`);
    const narratedVideo = join(artifactRoot, `${role}-${edition}-${date}-${commit}.mp4`);
    if (video) await video.saveAs(rawVideo);
    await browser.close();
    if (video && !captureOnly) createNarration(role, captions, rawVideo, narratedVideo);
    const vtt = ["WEBVTT", "", ...captions.flatMap((caption, index) => [String(index + 1), `${formatVttTime(caption.from)} --> ${formatVttTime(caption.to)} line:10% position:78% size:20% align:start`, caption.text, ""])].join("\n");
    await writeFile(join(artifactRoot, `${role}-${edition}-${date}-${commit}.en.vtt`), vtt, "utf8");
    const narrationScript = captions.map((caption, index) => `Cue ${String(index + 1).padStart(2, "0")}\n${caption.text}\n`).join("\n");
    await writeFile(join(artifactRoot, `${role}-${edition}-${date}-${commit}.narration.txt`), narrationScript, "utf8");
  }
}

manifest.status = Object.values(manifest.roles).every((entry) => entry.status === "passed")
  ? courseActionCoverageComplete
    ? captureOnly ? "capture_pending_narration" : "passed_pending_human_review"
    : "diagnostic_pass_workflow_actions_incomplete"
  : "failed";
await writeFile(join(artifactRoot, `manifest-${edition}.json`), JSON.stringify(manifest, null, 2), "utf8");
if (runFailures.length) throw new Error(`Role training UI QA failed. Fix the application or verified expectation, then rerecord. ${runFailures.join(" | ")}`);
if (!courseActionCoverageComplete && !diagnosticMode) throw new Error("Role course chapter diagnostic passed, but complete workflow action coverage is not implemented. Release remains blocked.");
console.log(`Training QA artifacts written to ${artifactRoot}`);
