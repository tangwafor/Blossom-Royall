import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const finalMode = process.env.STORE_CAPTURE_FINAL === "1";
const assetRoot = join(root, finalMode ? "store/assets" : "store/candidates");
const expected = {
  "apple/iphone-6.9": { width: 1320, height: 2868 },
  "apple/ipad-13": { width: 2064, height: 2752 },
  "google/phone": { width: 1080, height: 1920 },
};
const scenes = ["01-discover", "02-my-fit", "03-orders"];
const failures = [];

function pngSize(data) {
  if (data.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

for (const [device, size] of Object.entries(expected)) {
  for (const scene of scenes) {
    const relative = `${device}/${scene}.png`;
    try {
      const actual = pngSize(await readFile(join(assetRoot, relative)));
      if (!actual || actual.width !== size.width || actual.height !== size.height) {
        failures.push(`${relative} must be ${size.width} by ${size.height} pixels`);
      }
    } catch {
      failures.push(`Missing ${relative}`);
    }
  }
}

try {
  const evidence = JSON.parse(await readFile(join(assetRoot, "capture-evidence.json"), "utf8"));
  if (evidence.mode !== (finalMode ? "final" : "candidate")) failures.push("Capture evidence mode does not match verification mode");
  if (finalMode && evidence.humanReviewed !== true) failures.push("Final assets require recorded human review");
  if (finalMode && (!evidence.sourceCommit || evidence.sourceCommit === "unrecorded")) failures.push("Final assets require a source commit");
} catch {
  failures.push("Missing or invalid capture evidence");
}

if (failures.length) {
  console.error("Store asset verification failed:");
  for (const failure of failures) console.error(`ERROR ${failure}`);
  process.exit(1);
}
console.log(`${finalMode ? "Final" : "Candidate"} store asset dimensions and evidence structure verified.`);
