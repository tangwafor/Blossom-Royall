import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const captureDir = join(root, "test-results", "readiness-film-capture");
const output = join(root, "test-results", "readiness-welcome-2026-08-27.webm");
await rm(captureDir, { recursive: true, force: true });
await mkdir(captureDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: captureDir, size: { width: 1280, height: 720 } } });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3002/readiness", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "See how Blossom Royall works" }).click();
await page.getByRole("dialog", { name: "Blossom Royall vision film" }).waitFor();
await page.waitForTimeout(34000);
const video = page.video();
await page.close();
await context.close();
await video.saveAs(output);
await browser.close();
console.log(output);
