import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
if (process.env.CREDENTIAL_BASE_URL !== "https://app.blossomroyall.com") {
  throw new Error("Credential release requires the branded production domain.");
}
const result = spawnSync(command, ["playwright", "test", "tests/credential-release.spec.ts"], {
  stdio: "inherit",
  env: { ...process.env, CREDENTIAL_RELEASE_RUN: "true" },
});
process.exit(result.status ?? 1);
