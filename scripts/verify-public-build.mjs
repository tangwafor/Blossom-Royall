import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

if (await exists(join(dist, "concept")) || await exists(join(dist, "concept.html"))) {
  throw new Error("Public build contains the confidential concept route.");
}

if (!await exists(join(dist, "readiness.html")) && !await exists(join(dist, "readiness", "index.html"))) {
  throw new Error("Public build is missing the readiness experience.");
}

const readinessPath = await exists(join(dist, "readiness.html")) ? join(dist, "readiness.html") : join(dist, "readiness", "index.html");
const readiness = await readFile(readinessPath, "utf8");
if (!readiness.includes("Readiness experience") && !readiness.includes("readiness-page")) {
  throw new Error("Public readiness output failed its content check.");
}

const netlify = await readFile(join(root, "netlify.toml"), "utf8");
if (!netlify.includes('from = "/"') || !netlify.includes('to = "/readiness"')) {
  throw new Error("Public root is not routed away from the internal command center.");
}

if (
  !netlify.includes('from = "https://app.blossomroyall.com/"') ||
  !netlify.includes('to = "/workspace"') ||
  !netlify.includes('NEXT_PUBLIC_APP_URL = "https://app.blossomroyall.com"')
) {
  throw new Error("The branded application domain is not routed to the protected workspace.");
}

console.log("Public build verified: readiness present, application domain protected, confidential concept absent.");
