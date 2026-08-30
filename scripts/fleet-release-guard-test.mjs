import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = mkdtempSync(join(tmpdir(), "fleet-release-guard-"));
const repo = join(root, "sample");
mkdirSync(join(repo, "app"), { recursive: true });
mkdirSync(join(repo, "scripts"), { recursive: true });
writeFileSync(join(repo, "package.json"), JSON.stringify({ scripts: { prepush: "npm test" } }, null, 2));
writeFileSync(join(repo, "app", "page.tsx"), `export const copy = "96% match"; export const qaRole = "owner";`);
execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
execFileSync("git", ["add", "."], { cwd: repo, stdio: "ignore" });

const guard = join(process.cwd(), "scripts", "fleet-release-guard.mjs");
const audit = spawnSync(process.execPath, [guard, repo, "--json"], { encoding: "utf8" });
if (audit.status !== 1) throw new Error("Audit must block an unsafe repository.");
const auditReport = JSON.parse(audit.stdout);
for (const code of ["ROLE_OVERRIDE", "UNPROVEN_CLAIM", "NO_CREDENTIAL_GATE", "NO_REAL_ACCOUNT_TEST", "NO_SIGN_OUT", "PREPUSH_NOT_WIRED"]) {
  if (!auditReport.findings.some((item) => item.code === code)) throw new Error(`Missing expected finding ${code}`);
}

const fixed = spawnSync(process.execPath, [guard, repo, "--fix", "--json"], { encoding: "utf8" });
if (fixed.status !== 1) throw new Error("Fix mode must preserve unresolved security blockers.");
if (readFileSync(join(repo, "app", "page.tsx"), "utf8").includes("96% match")) throw new Error("Safe claim fix was not applied.");
const packageData = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
if (!packageData.scripts.prepush.startsWith("npm run release:guard")) throw new Error("Prepush wiring was not applied.");

rmSync(root, { recursive: true, force: true });
console.log("Fleet release guard verified: detection, safe fixes, prepush wiring, and hard security blockers behave correctly.");
