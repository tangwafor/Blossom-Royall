import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const baseUrl = process.env.STORE_CAPTURE_URL || "http://127.0.0.1:3002";
const finalMode = process.env.STORE_CAPTURE_FINAL === "1";
const outputRoot = join(root, finalMode ? "store/assets" : "store/candidates");
let server;

async function reachable() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await reachable()) return;
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  server = spawn(command, ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3002"], {
    cwd: root,
    stdio: "ignore",
    windowsHide: true,
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await reachable()) return;
    if (server.exitCode !== null) throw new Error("The local application server stopped before capture.");
  }
  throw new Error("The local application server did not become ready for capture.");
}

const devices = [
  { key: "apple/iphone-6.9", viewport: { width: 440, height: 956 }, scale: 3 },
  { key: "apple/ipad-13", viewport: { width: 1032, height: 1376 }, scale: 2 },
  { key: "google/phone", viewport: { width: 432, height: 768 }, scale: 2.5 },
];

const scenes = [
  { name: "01-discover", destination: "Customer Shop", heading: "An entrance worth remembering." },
  { name: "02-my-fit", destination: "My Fit", heading: "Measure once. Shop with confidence." },
  { name: "03-orders", destination: "My Orders", heading: "One order. Every detail." },
];

async function openDestination(page, destination) {
  const openMenu = page.getByRole("button", { name: "Open menu" });
  if (await openMenu.isVisible()) await openMenu.click();
  await page.getByRole("button", { name: destination, exact: true }).click();
}

async function captureDevice(browser, device) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.scale,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    locale: "en-US",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("br-tour-complete", "true");
    localStorage.setItem("br-theme", "light");
    localStorage.setItem("br-latest-order:blossom-royall", JSON.stringify({
      id: "#BR-REVIEW",
      items: [{ name: "Aurelia Satin Midi", vendor: "Blossom Collections", price: 168, fulfillment: "Store pickup" }],
      method: "pickup",
      payment: "pay_now",
      total: 168,
      status: "confirmed",
      paymentStatus: "succeeded",
      placedAt: "2026-08-28T12:00:00.000Z"
    }));
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("html[data-app-ready='true']").waitFor();

  if (finalMode && await page.getByText("Preview data", { exact: true }).isVisible()) {
    throw new Error("Final store capture refused because the application is showing preview data.");
  }

  const directory = join(outputRoot, device.key);
  await mkdir(directory, { recursive: true });
  const results = [];
  for (const scene of scenes) {
    await openDestination(page, scene.destination);
    await page.getByRole("heading", { name: scene.heading }).waitFor();
    const path = join(directory, `${scene.name}.png`);
    await page.screenshot({ path, fullPage: false, animations: "disabled" });
    results.push({ path: path.slice(root.length + 1).replaceAll("\\", "/"), scene: scene.name });
  }
  await context.close();
  return results;
}

await ensureServer();
const browser = await chromium.launch({ headless: true });
try {
  const captures = [];
  for (const device of devices) captures.push(...await captureDevice(browser, device));
  const evidence = {
    generatedAt: new Date().toISOString(),
    mode: finalMode ? "final" : "candidate",
    sourceUrl: baseUrl,
    sourceCommit: process.env.STORE_CAPTURE_COMMIT || "unrecorded",
    humanReviewed: false,
    captures,
  };
  await writeFile(join(outputRoot, "capture-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Captured ${captures.length} ${evidence.mode} store images. Human review is still required.`);
} finally {
  await browser.close();
  if (server && server.exitCode === null) server.kill();
}
