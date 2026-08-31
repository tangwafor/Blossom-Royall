import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("scripts/record-role-training.mjs"), "utf8");
const matrix = readFileSync(resolve("scripts/role-course-matrix.mjs"), "utf8");
const required = ["owner", "manager", "staff", "vendor", "customer", "recordVideo", "forbidden", "pending_human_review", "TRAINING_PRODUCTION_APPROVED", ".en.vtt", "createNarration", "ffmpeg", "ffprobe", "position:78%", "width:230px", "en-US-AriaNeural", "-4%", "edge_tts", "narration.duration + 700", "runFailures", "navigation opened without the expected", "Fix the application or verified expectation, then rerecord", "currentTotp", "expectMaskedMfa", "training-mfa-mask"];
for (const value of required) if (!source.includes(value)) throw new Error(`Training QA recorder is missing ${value}`);
for (const value of ["Command Center", "Customer Shop", "Checkout", "Cash Drawer", "Orders", "Aftercare", "Rent", "Products", "Vendors", "Shared Commerce", "Delivery", "Staff", "Intelligence", "Policies", "Business Setup", "Help", "Vendor Board", "My Products", "requiredActions", "status: \"production\"", "status: \"preview\"", "status: \"mixed\""]) if (!matrix.includes(value)) throw new Error(`Role course matrix is missing ${value}`);
console.log("Role training QA recorder checks passed.");
