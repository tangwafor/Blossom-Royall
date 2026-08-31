import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const fix = args.has("--fix");
const json = args.has("--json");
const rootArg = process.argv.slice(2).find((value) => !value.startsWith("--"));
const scanRoot = resolve(rootArg || process.cwd());
const ignoredDirectories = new Set([".git", ".next", "node_modules", "dist", "build", "coverage", "playwright-report", "test-results"]);
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".sql", ".md", ".json", ".yml", ".yaml"]);

const safeClaimFixes = new Map([
  ["96% match", "Fit check ready"],
  ["Your size is in stock", "Seller chart and live inventory confirmation required"],
  ["All available in your fit", "Availability and fit confirmation required"],
  ["selected in your size", "selected for your style, with sizing confirmed before purchase"],
]);

function git(repo, parameters) {
  try {
    return execFileSync("git", ["-c", "safe.directory=*", "-C", repo, ...parameters], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function findRepos(root) {
  if (existsSync(join(root, ".git"))) return [root];
  const found = [];
  const visit = (directory, depth) => {
    if (depth > 5) return;
    let entries = [];
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return; }
    if (entries.some((entry) => entry.name === ".git" && entry.isDirectory())) {
      found.push(directory);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
      visit(join(directory, entry.name), depth + 1);
    }
  };
  visit(root, 0);
  return found;
}

function repoFiles(repo) {
  const tracked = git(repo, ["ls-files", "--cached", "--others", "--exclude-standard"]);
  if (tracked) return tracked.split(/\r?\n/).filter(Boolean).map((file) => join(repo, file));
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(join(directory, entry.name));
      } else if (sourceExtensions.has(extname(entry.name))) files.push(join(directory, entry.name));
    }
  };
  visit(repo);
  return files;
}

function finding(repo, severity, code, message, file = "", fixable = false) {
  return { repo: basename(repo), severity, code, message, file: file ? file.slice(repo.length + 1) : "", fixable };
}

function inspectRepo(repo) {
  const findings = [];
  const files = repoFiles(repo).filter((file) => sourceExtensions.has(extname(file)) && existsSync(file) && statSync(file).size < 2_000_000);
  const packagePath = join(repo, "package.json");
  const packageData = existsSync(packagePath) ? JSON.parse(readFileSync(packagePath, "utf8")) : null;

  for (const file of files) {
    const relative = file.slice(repo.length + 1).replaceAll("\\", "/");
    let content = readFileSync(file, "utf8");

    if (/^(?:\.env(?:\..+)?|.*(?:credential|secret|password).*(?:\.txt|\.json))$/i.test(basename(file)) && !/\.example$/i.test(file)) {
      findings.push(finding(repo, "block", "SENSITIVE_FILE", "Tracked file name may contain credentials or secrets.", file));
    }
    if (!relative.startsWith("docs/") && !relative.startsWith("tests/") && !relative.includes("package-lock") && /(?:service_role|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_+\/.=-]{16,}["']/i.test(content)) {
      findings.push(finding(repo, "block", "EMBEDDED_SECRET", "Possible credential or privileged secret embedded in source.", file));
    }
    if (/qaRole|mockRole|roleOverride/i.test(content) && !relative.startsWith("tests/") && !relative.startsWith("scripts/")) {
      findings.push(finding(repo, "block", "ROLE_OVERRIDE", "Production source contains a role override or QA role seam.", file));
    }
    if (extname(file) === ".sql") {
      const createsPublicTable = /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.[a-z0-9_]+/i.test(content);
      if (createsPublicTable && !/enable\s+row\s+level\s+security/i.test(content)) {
        findings.push(finding(repo, "block", "RLS_MISSING", "Migration creates a public table without enabling row level security in the same migration.", file));
      }
    }
    const isGuardFixture = relative === "scripts/fleet-release-guard.mjs" || relative === "scripts/fleet-release-guard-test.mjs";
    if (!isGuardFixture) {
      for (const [unsafe, replacement] of safeClaimFixes) {
        if (!content.includes(unsafe)) continue;
        findings.push(finding(repo, "warn", "UNPROVEN_CLAIM", `Unqualified customer claim found: ${unsafe}`, file, true));
        if (fix) content = content.replaceAll(unsafe, replacement);
      }
    }
    if (fix && content !== readFileSync(file, "utf8")) writeFileSync(file, content, "utf8");
  }

  if (packageData) {
    const scripts = packageData.scripts || {};
    if (!scripts["release:credentials"]) findings.push(finding(repo, "block", "NO_CREDENTIAL_GATE", "No credential release command is defined.", packagePath));
    if (!scripts.prepush?.includes("release:guard")) {
      findings.push(finding(repo, "warn", "PREPUSH_NOT_WIRED", "The fleet release guard is not wired into prepush.", packagePath, true));
      if (fix) {
        packageData.scripts ||= {};
        packageData.scripts["release:guard"] = "node scripts/fleet-release-guard.mjs";
        packageData.scripts.prepush = `npm run release:guard${scripts.prepush ? ` && ${scripts.prepush}` : ""}`;
        writeFileSync(packagePath, `${JSON.stringify(packageData, null, 2)}\n`, "utf8");
      }
    }
    const trainingRecorder = files.find((file) => {
      const relative = file.slice(repo.length + 1).replaceAll("\\", "/");
      return relative.startsWith("scripts/") && /(?:record|run).*(?:role|training|course).*\.(?:js|mjs|ts)$/i.test(basename(file));
    });
    const trainingRunbook = files.some((file) => /(?:role.*training|role.*course|fleet.*role.*course).*\.md$/i.test(basename(file)));
    const trainingVerifier = Object.entries(scripts).find(([name]) => /(?:test|verify):.*training|training:verify/i.test(name));
    if (!trainingRecorder) findings.push(finding(repo, "block", "NO_ROLE_COURSE_RECORDER", "No executable role workflow course recorder was found."));
    if (!trainingRunbook) findings.push(finding(repo, "block", "NO_ROLE_COURSE_RUNBOOK", "No canonical role workflow course runbook was found."));
    if (!trainingVerifier || !scripts.prepush?.includes(trainingVerifier[0])) findings.push(finding(repo, "block", "TRAINING_GATE_NOT_WIRED", "The role workflow course verifier is not wired into prepush."));
    if (trainingRecorder) {
      const recorderSource = readFileSync(trainingRecorder, "utf8");
      for (const [token, code, message] of [
        ["recordVideo", "COURSE_NOT_REAL_UI", "Role course recorder does not capture the real interface."],
        ["backendAssertions", "COURSE_NO_BACKEND_ASSERTIONS", "Role course recorder has no explicit backend assertion contract."],
        ["runFailures", "COURSE_FAILURES_NOT_BLOCKING", "Role course recorder does not preserve blocking workflow failures."],
        ["pending_human_review", "COURSE_NO_HUMAN_REVIEW_GATE", "Role course recorder does not block publication pending human review."],
      ]) if (!recorderSource.includes(token)) findings.push(finding(repo, "block", code, message, trainingRecorder));
    }
  }

  const hasCredentialTest = files.some((file) => /credential.*(?:spec|test)\.(?:js|jsx|ts|tsx)$/i.test(basename(file)));
  if (packageData && !hasCredentialTest) findings.push(finding(repo, "block", "NO_REAL_ACCOUNT_TEST", "No credential release browser test was found."));
  const sourceText = files
    .filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file))
    .filter((file) => {
      const relative = file.slice(repo.length + 1).replaceAll("\\", "/");
      return !relative.startsWith("tests/") && !relative.startsWith("scripts/");
    })
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  if (packageData && !/(?:sign out|logout)/i.test(sourceText)) findings.push(finding(repo, "block", "NO_SIGN_OUT", "No visible sign out or logout implementation was found."));

  return findings;
}

if (!existsSync(scanRoot)) {
  console.error(`Scan root does not exist: ${scanRoot}`);
  process.exit(2);
}

const repos = findRepos(scanRoot);
if (!repos.length) {
  console.error(`No repositories found under ${scanRoot}`);
  process.exit(2);
}

const findings = repos.flatMap(inspectRepo);
const blockers = findings.filter((item) => item.severity === "block");
const report = { scannedAt: new Date().toISOString(), mode: fix ? "fix" : "audit", root: scanRoot, repositories: repos.length, blockers: blockers.length, warnings: findings.length - blockers.length, findings };

if (json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Fleet release guard scanned ${repos.length} repository or repositories.`);
  for (const item of findings) console.log(`${item.severity.toUpperCase()} ${item.repo} ${item.code}${item.file ? ` ${item.file}` : ""}: ${item.message}${item.fixable ? " Fix available." : ""}`);
  console.log(`Result: ${blockers.length} blocker or blockers, ${findings.length - blockers.length} warning or warnings.`);
}

process.exit(blockers.length ? 1 : 0);
