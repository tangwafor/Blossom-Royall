import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { roleCourseMatrix } from "./role-course-matrix.mjs";

const roles = ["owner", "manager", "staff", "vendor", "customer"];
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
const courseActionCoverageComplete = false;
const selectedRoles = requestedRole === "all" ? roles : [requestedRole];
const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const date = new Date().toISOString().slice(0, 10);
const artifactRoot = join(process.cwd(), "artifacts", "training", `${date}-${commit}`);

if (!selectedRoles.every((role) => roles.includes(role))) throw new Error(`Unsupported TRAINING_ROLE: ${requestedRole}`);
if (!["detailed", "reel"].includes(edition)) throw new Error(`Unsupported TRAINING_EDITION: ${edition}`);
if (!["ndamba", "human"].includes(narrationMode)) throw new Error(`Unsupported TRAINING_NARRATION_MODE: ${narrationMode}`);
if (isProduction && !productionApproved) throw new Error("Production recording requires TRAINING_PRODUCTION_APPROVED=true.");
if (isProduction && (!trainingServerKey || !trainingUserId || !trainingSupabaseUrl)) throw new Error("Production role courses require sealed server side backend assertion credentials.");

const trainingAdmin = trainingServerKey && trainingSupabaseUrl
  ? createClient(trainingSupabaseUrl, trainingServerKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const assertNoError = (result, label) => {
  if (result.error) throw new Error(`${label} backend assertion failed: ${result.error.message}`);
  return result.data;
};

const backendAssertions = {
  owner: async () => {
    if (!trainingAdmin || !trainingUserId) throw new Error("Owner backend assertion client is unavailable.");
    const membership = assertNoError(await trainingAdmin.from("store_memberships").select("store_id, role").eq("user_id", trainingUserId).single(), "Owner membership");
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
    if (!trainingAdmin || !trainingUserId) throw new Error("Vendor backend assertion client is unavailable.");
    const membership = assertNoError(await trainingAdmin.from("store_memberships").select("store_id, role").eq("user_id", trainingUserId).single(), "Vendor membership");
    if (membership.role !== "vendor") throw new Error(`Vendor backend role mismatch: ${membership.role}`);
    const owned = assertNoError(await trainingAdmin.from("vendors").select("id, name").eq("store_id", membership.store_id).eq("owner_user_id", trainingUserId), "Vendor ownership");
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
};

const expectVisibleText = async (page, text, label) => {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: "visible", timeout: 15000 }).catch(() => { throw new Error(`${label} UI assertion failed: ${text} is not visible.`); });
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
    allowed: ["Command Center", "Products", "Vendors", "Rent", "Orders", "Staff", "Policies"],
    forbidden: ["Vendor Board", "My Fit", "My Orders", "Business Setup"],
  },
  staff: {
    allowed: ["Command Center", "Checkout", "Cash Drawer", "Orders", "Delivery", "Aftercare", "Help"],
    forbidden: ["Business Setup", "Vendors", "Staff & payroll"],
  },
  vendor: {
    allowed: roleCourseMatrix.vendor.map((chapter) => chapter.label),
    forbidden: ["Command Center", "Checkout", "Cash Drawer", "Staff & payroll", "Business Setup"],
  },
  customer: {
    allowed: ["Customer Shop", "My Fit", "Checkout", "My Orders", "Aftercare", "Help"],
    forbidden: ["Command Center", "Checkout", "Cash Drawer", "Vendors", "Staff & payroll", "Business Setup"],
  },
};

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
      roleChapterEvidence.push(await chapterAssertions(page, role, label, roleBackendEvidence));
      const chapter = roleCourseMatrix[role]?.find((item) => item.label === label);
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
    manifest.roles[role] = { status: "passed", checks: destinations.length + roleConfig[role].forbidden.length, backendAssertions: roleBackendEvidence, chapterAssertions: roleChapterEvidence };
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
