import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (file) => readFile(file, "utf8");
const [migration, worker, workflow, config, netlify] = await Promise.all([
  read("supabase/migrations/20260828173500_account_deletion_operations.sql"),
  read("supabase/functions/process-account-deletions/index.ts"),
  read(".github/workflows/account-deletion-processor.yml"),
  read("supabase/config.toml"),
  read("netlify.toml"),
]);

const failures = [];
const syntax = ts.transpileModule(worker, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true,
  fileName: "supabase/functions/process-account-deletions/index.ts",
});
for (const diagnostic of syntax.diagnostics || []) {
  if (diagnostic.category === ts.DiagnosticCategory.Error) failures.push(`Worker TypeScript syntax error ${diagnostic.code}`);
}
const requireText = (source, value, label) => {
  if (!source.includes(value)) failures.push(`${label} is missing ${value}`);
};

for (const functionName of ["claim_due_account_deletion", "prepare_account_deletion", "finalize_account_deletion", "fail_account_deletion"]) {
  requireText(migration, `function public.${functionName}`, "Deletion migration");
  requireText(migration, `grant execute on function public.${functionName}`, "Deletion service role grant");
}
requireText(migration, "for update skip locked", "Deletion concurrency control");
requireText(migration, "processing_payload", "Deletion retry durability");
requireText(migration, "retry_pending", "Deletion retry state");
requireText(migration, "delete from auth.users", "Atomic authentication finalization");
requireText(worker, 'request.headers.get("x-automation-secret")', "Worker secret gate");
requireText(worker, 'crypto.subtle.digest("SHA-256"', "Worker secret comparison");
requireText(worker, 'from("payment-evidence").remove', "Private evidence cleanup");
requireText(worker, 'rpc("finalize_account_deletion"', "Worker atomic finalization");
if (worker.includes("deleteUser(")) failures.push("Worker performs non atomic authentication deletion");
requireText(config, "verify_jwt = false", "Function gateway configuration");
requireText(workflow, "ACCOUNT_DELETION_PROCESSOR_ENABLED == 'true'", "Disabled by default workflow gate");
requireText(workflow, "secrets.AUTOMATION_RUNNER_SECRET", "Workflow secret injection");
if (workflow.includes("SUPABASE_SERVICE_ROLE_KEY")) failures.push("Workflow exposes the database service role secret");
requireText(netlify, 'from = "/automation/account-deletions"', "Branded automation route");
requireText(netlify, "process-account-deletions", "Automation function proxy");

if (failures.length) {
  console.error("Account deletion processor verification failed:");
  for (const failure of failures) console.error(`ERROR ${failure}`);
  process.exit(1);
}

console.log("Account deletion processor verified: secret gate, disabled schedule, durable retry, private evidence cleanup, atomic identity finalization, and service role isolation are present.");
