import { setTimeout as delay } from "node:timers/promises";

const baseUrl = (process.env.MONITOR_BASE_URL || "https://app.blossomroyall.com").replace(/\/$/, "");
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 15000);
const attempts = Number(process.env.MONITOR_ATTEMPTS || 3);

const checks = [
  { path: "/workspace", content: ["Blossom Royall", "Opening your workspace"] },
  { path: "/privacy", content: ["Privacy", "information"] },
  { path: "/account/delete", content: ["Delete", "account"] },
  { path: "/manifest.webmanifest", contentType: "application/manifest+json" },
  { path: "/sw.js", contentType: "javascript" },
];

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const startedAt = performance.now();
      const response = await fetch(url, {
        headers: { "user-agent": "BlossomRoyallSyntheticMonitor/1.0" },
        redirect: "follow",
        signal: controller.signal,
      });
      const durationMs = Math.round(performance.now() - startedAt);
      return { response, durationMs };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(1000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

const failures = [];
for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const { response, durationMs } = await fetchWithRetry(url);
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const missingContent = (check.content || []).filter((text) => !body.toLowerCase().includes(text.toLowerCase()));
    const requiredHeaders = check.path === "/privacy"
      ? ["x-content-type-options", "x-frame-options", "referrer-policy"]
      : [];
    const missingHeaders = requiredHeaders.filter((header) => !response.headers.get(header));
    if (!response.ok) failures.push(`${check.path} returned ${response.status}`);
    if (check.contentType && !contentType.toLowerCase().includes(check.contentType)) failures.push(`${check.path} returned unexpected content type ${contentType}`);
    if (missingContent.length) failures.push(`${check.path} is missing expected content: ${missingContent.join(", ")}`);
    if (missingHeaders.length) failures.push(`${check.path} is missing security headers: ${missingHeaders.join(", ")}`);
    console.log(`${response.ok ? "PASS" : "FAIL"} ${check.path} ${response.status} ${durationMs}ms ${response.url}`);
  } catch (error) {
    failures.push(`${check.path} could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("Synthetic monitor failed:");
  for (const failure of failures) console.error(`ERROR ${failure}`);
  process.exit(1);
}

console.log(`Synthetic monitor passed for ${baseUrl}.`);
