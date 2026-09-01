import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required and must point to a disposable fully migrated database.");
if (process.env.ALLOW_PRODUCTION_DATABASE_TESTS !== "true" && /supabase\.co|pooler\.supabase\.com/i.test(databaseUrl)) {
  throw new Error("Refusing to run destructive fixture tests against a Supabase hosted database.");
}
const cases = [
  ["vendor", "10000000-0000-4000-8000-000000000003"],
  ["staff", "10000000-0000-4000-8000-000000000002"],
  ["owner", "10000000-0000-4000-8000-000000000001"],
  ["customer", "10000000-0000-4000-8000-000000000005"],
];
for (const [role, userId] of cases) {
  execFileSync("psql", [
    "--dbname", databaseUrl,
    "--set", `test_case=${role}`,
    "--set", `test_user=${userId}`,
    "--file", resolve("scripts/credential-release-role-tests.sql"),
  ], { stdio: "inherit" });
}
console.log("Credential release backend role tests passed.");
