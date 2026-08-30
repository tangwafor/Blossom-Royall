import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("scripts/record-role-training.mjs"), "utf8");
const required = ["owner", "manager", "staff", "vendor", "customer", "recordVideo", "forbidden", "pending_human_review", "TRAINING_PRODUCTION_APPROVED", ".en.vtt", "createNarration", "ffmpeg", "position:78%", "width:230px", "en-NG-EzinneNeural", "-6%", "edge_tts"];
for (const value of required) if (!source.includes(value)) throw new Error(`Training QA recorder is missing ${value}`);
console.log("Role training QA recorder checks passed.");
