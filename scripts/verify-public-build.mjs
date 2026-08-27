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

console.log("Public build verified: readiness present, confidential concept absent.");
