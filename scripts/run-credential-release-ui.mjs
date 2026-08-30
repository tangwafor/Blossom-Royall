import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["playwright", "test", "tests/credential-release.spec.ts"], {
  stdio: "inherit",
  env: { ...process.env, CREDENTIAL_RELEASE_RUN: "true" },
});
process.exit(result.status ?? 1);
