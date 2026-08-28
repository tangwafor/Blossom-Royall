import { createServer } from "node:http";
import { spawn } from "node:child_process";

const content = new Map([
  ["/workspace", ["text/html", "<h1>Opening your workspace</h1><p>Blossom Royall</p>"]],
  ["/privacy", ["text/html", "<h1>Privacy</h1><p>Your information belongs to you.</p>"]],
  ["/support", ["text/html", "<h1>Support</h1><p>Help when you need it.</p>"]],
  ["/account/delete", ["text/html", "<h1>Delete your account</h1>"]],
  ["/manifest.webmanifest", ["application/manifest+json", "{\"name\":\"Blossom Royall\"}"]],
  ["/sw.js", ["text/javascript", "self.addEventListener('fetch', () => {});"]],
]);

const server = createServer((request, response) => {
  const fixture = content.get(request.url || "");
  if (!fixture) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.setHeader("content-type", fixture[0]);
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  response.writeHead(200).end(fixture[1]);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Synthetic monitor fixture did not start.");

const child = spawn(process.execPath, ["scripts/synthetic-monitor.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, MONITOR_BASE_URL: `http://127.0.0.1:${address.port}`, MONITOR_ATTEMPTS: "1" },
  stdio: "inherit",
});

const exitCode = await new Promise((resolve) => child.once("exit", resolve));
await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
if (exitCode !== 0) throw new Error(`Synthetic monitor fixture failed with exit code ${exitCode}.`);
console.log("Synthetic monitor fixture passed.");
