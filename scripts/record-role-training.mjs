import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const roles = ["owner", "manager", "staff", "vendor", "customer"];
const requestedRole = process.env.TRAINING_ROLE || "all";
const edition = process.env.TRAINING_EDITION || "detailed";
const baseUrl = process.env.TRAINING_BASE_URL || "http://127.0.0.1:3002";
const productionApproved = process.env.TRAINING_PRODUCTION_APPROVED === "true";
const isProduction = new URL(baseUrl).hostname === "app.blossomroyall.com";
const selectedRoles = requestedRole === "all" ? roles : [requestedRole];
const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const date = new Date().toISOString().slice(0, 10);
const artifactRoot = join(process.cwd(), "artifacts", "training", `${date}-${commit}`);

if (!selectedRoles.every((role) => roles.includes(role))) throw new Error(`Unsupported TRAINING_ROLE: ${requestedRole}`);
if (!["detailed", "reel"].includes(edition)) throw new Error(`Unsupported TRAINING_EDITION: ${edition}`);
if (isProduction && !productionApproved) throw new Error("Production recording requires TRAINING_PRODUCTION_APPROVED=true.");

const roleConfig = {
  owner: {
    allowed: ["Command Center", "Products", "Vendors", "Rent", "Orders", "Staff", "Business Setup"],
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
    allowed: ["Vendor Board", "My Products", "Orders", "Rent", "Help"],
    forbidden: ["Command Center", "Checkout", "Cash Drawer", "Staff & payroll", "Business Setup"],
  },
  customer: {
    allowed: ["Customer Shop", "My Fit", "Checkout", "My Orders", "Aftercare", "Help"],
    forbidden: ["Command Center", "Checkout", "Cash Drawer", "Vendors", "Staff & payroll", "Business Setup"],
  },
};

const pause = edition === "reel" ? 1900 : 3600;
const stamp = async (page, text) => {
  await page.evaluate(({ text, date, commit, edition, baseUrl }) => {
    document.getElementById("training-caption")?.remove();
    const card = document.createElement("aside");
    card.id = "training-caption";
    card.setAttribute("role", "note");
    card.style.cssText = "position:fixed;right:18px;top:112px;width:230px;z-index:2147483647;padding:11px 12px;border:1px solid #e5c46b;border-radius:12px;background:#210e16e8;color:white;font:600 12px/1.35 system-ui;box-shadow:0 14px 34px #0006;pointer-events:none";
    card.innerHTML = `<span style="display:block;margin-bottom:5px;color:#e5c46b;font-size:9px;letter-spacing:.09em">${date} · ${commit} · ${edition}</span>${text}`;
    document.body.appendChild(card);
  }, { text, date, commit, edition, baseUrl });
  await page.waitForTimeout(pause);
};

const createNarration = (captions, rawVideo, outputVideo, narrationDirectory) => {
  const audioFiles = captions.map((caption, index) => {
    const output = join(narrationDirectory, `cue-${String(index + 1).padStart(2, "0")}.wav`);
    const script = "$voice=New-Object -ComObject SAPI.SpVoice; $stream=New-Object -ComObject SAPI.SpFileStream; $stream.Open($args[1],3,$false); $voice.AudioOutputStream=$stream; $voice.Rate=1; $voice.Volume=100; [void]$voice.Speak($args[0]); $stream.Close()";
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script, caption.text, output], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`Narration generation failed for cue ${index + 1}: ${result.stderr}`);
    return output;
  });
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

await mkdir(artifactRoot, { recursive: true });
const manifest = { date, commit, edition, baseUrl, production: isProduction, status: "recording", narration: "english_voice_with_compact_side_captions_pending_translation_review", roles: {} };

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
  const page = await context.newPage();
  const captions = [];
  const started = Date.now();
  const explain = async (text) => {
    await page.waitForTimeout(450);
    const from = Date.now() - started;
    await stamp(page, text);
    captions.push({ from, to: Date.now() - started, text });
  };

  try {
    await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await explain(`${role} training begins with secure authentication.`);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/workspace/, { timeout: 30000 });
    await page.locator("html[data-app-ready='true']").waitFor({ timeout: 30000 });
    await explain(`Signed in as ${role}. The navigation now shows only authorized work.`);

    for (const label of roleConfig[role].forbidden) {
      if (await page.getByRole("button", { name: label, exact: true }).count()) throw new Error(`${role} can see forbidden navigation: ${label}`);
    }

    const destinations = edition === "reel" ? roleConfig[role].allowed.slice(0, 2) : roleConfig[role].allowed;
    for (const label of destinations) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.waitFor({ state: "visible" });
      await explain(`${label}: verified visible and available to the ${role} role.`);
      await button.click();
      await page.waitForTimeout(400);
      const heading = page.getByRole("heading", { name: label, exact: true }).first();
      if (await heading.count()) await heading.waitFor({ state: "visible" });
    }

    if (role === "customer" && edition === "detailed") {
      const fitButton = page.getByRole("button", { name: "My Fit", exact: true });
      if (await fitButton.count()) await fitButton.click();
      await page.locator(".fit-mannequin").waitFor({ state: "visible" });
      await page.getByRole("heading", { name: "AI photo fitting, guided preview" }).waitFor();
      await explain("My Fit demonstrates measurements and clearly labels automatic AI photo sizing as still in development.");
    }

    await explain(`${role} role QA passed. This recording is evidence and training, pending human review.`);
    manifest.roles[role] = { status: "passed", checks: destinations.length + roleConfig[role].forbidden.length };
  } catch (error) {
    manifest.roles[role] = { status: "failed", error: error instanceof Error ? error.message : String(error) };
    await explain(`${role} role QA failed. Do not publish this recording.`).catch(() => {});
    throw error;
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    const rawVideo = join(artifactRoot, `${role}-${edition}-${date}-${commit}.raw.webm`);
    const narratedVideo = join(artifactRoot, `${role}-${edition}-${date}-${commit}.mp4`);
    if (video) await video.saveAs(rawVideo);
    await browser.close();
    if (video) createNarration(captions, rawVideo, narratedVideo, captureDir);
    const vtt = ["WEBVTT", "", ...captions.flatMap((caption, index) => [String(index + 1), `${formatVttTime(caption.from)} --> ${formatVttTime(caption.to)} line:10% position:78% size:20% align:start`, caption.text, ""])].join("\n");
    await writeFile(join(artifactRoot, `${role}-${edition}-${date}-${commit}.en.vtt`), vtt, "utf8");
  }
}

manifest.status = Object.values(manifest.roles).every((entry) => entry.status === "passed") ? "passed_pending_human_review" : "failed";
await writeFile(join(artifactRoot, `manifest-${edition}.json`), JSON.stringify(manifest, null, 2), "utf8");
console.log(`Training QA artifacts written to ${artifactRoot}`);
