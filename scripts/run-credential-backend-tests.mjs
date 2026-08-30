import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required and must point to a disposable fully migrated database.");
if (process.env.ALLOW_PRODUCTION_DATABASE_TESTS !== "true" && /supabase\.co|pooler\.supabase\.com/i.test(databaseUrl)) {
  throw new Error("Refusing to run destructive fixture tests against a Supabase hosted database.");
}
execFileSync("psql", ["--dbname", databaseUrl, "--file", resolve("scripts/credential-release-role-tests.sql")], { stdio: "inherit" });
console.log("Credential release backend role tests passed.");
