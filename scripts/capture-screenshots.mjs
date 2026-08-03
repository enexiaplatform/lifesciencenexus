/**
 * Capture real product screenshots for the landing page.
 *
 * - Screenshots depend on the demo dataset: after changing demo data, re-run
 *   `npm run screenshots` to refresh the assets in public/screenshots/.
 * - Reuses a dev server already listening on :3000, otherwise starts one.
 * - Also rasterizes public/og.svg -> public/og.png (1200x630).
 * - `--video` additionally records a short walkthrough clip (webm).
 *
 * Chromium resolution mirrors playwright.config.ts: env override ->
 * Playwright-managed browser -> cached chromium-1223 fallback.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "screenshots");
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const WITH_VIDEO = process.argv.includes("--video");

const SHOTS = [
  { name: "dashboard", path: "/dashboard" },
  {
    name: "equivalence",
    path: "/equivalence/equiv-tsa-delta-vs-acme",
  },
  { name: "evidence", path: "/evidence" },
  // Pre-select demo SKUs so the matrix renders instead of the empty state.
  {
    name: "compare",
    path: "/compare?skus=sku-tsa-500,sku-tsa-plates-20,sku-tsa-delta-500",
  },
  {
    name: "cost-per-test",
    path: "/cost-per-test",
    // Load a saved demo scenario and calculate; fall back to the setup view.
    prepare: async (page) => {
      try {
        await page.selectOption("#load-scenario", { index: 1 });
        const calc = page.getByRole("button", { name: "Calculate" });
        if (await calc.isEnabled()) {
          await calc.click();
          await page.waitForTimeout(1000);
        }
      } catch {
        /* keep setup view */
      }
    },
  },
];

function resolveChromiumExecutablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  if (existsSync(chromium.executablePath())) return undefined;
  const cached = join(
    homedir(),
    "AppData",
    "Local",
    "ms-playwright",
    "chromium-1223",
    "chrome-win64",
    "chrome.exe",
  );
  return existsSync(cached) ? cached : undefined;
}

async function serverReady() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await serverReady()) return null;
  console.log("Starting dev server (npm run dev)...");
  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
  });
  // shell:true wraps npm in cmd.exe — killing the wrapper alone orphans the
  // Next dev server. Kill the whole tree on Windows.
  const killTree = () => {
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
    } else {
      child.kill();
    }
  };
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await serverReady()) return { kill: killTree };
    await new Promise((r) => setTimeout(r, 1500));
  }
  killTree();
  throw new Error("Dev server did not become ready within 120s.");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const server = await ensureServer();
  const executablePath = resolveChromiumExecutablePath();

  const browser = await chromium.launch(
    executablePath ? { executablePath } : {},
  );
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    for (const shot of SHOTS) {
      await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle" });
      if (shot.prepare) await shot.prepare(page);
      // Let fonts/charts settle; demo pages render deterministically.
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(OUT_DIR, `${shot.name}.png`) });
      console.log(`captured ${shot.name}.png`);
    }
    await context.close();

    // Rasterize the OG card (1200x630) from its SVG source.
    const og = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    await og.goto(pathToFileURL(join(ROOT, "public", "og.svg")).href);
    await og.waitForTimeout(300);
    await og.screenshot({ path: join(ROOT, "public", "og.png") });
    await og.close();
    console.log("captured og.png");

    // Rasterize the apple touch icon (180x180) — iOS ignores SVG icons.
    const apple = await browser.newPage({
      viewport: { width: 180, height: 180 },
      deviceScaleFactor: 1,
    });
    await apple.goto(pathToFileURL(join(ROOT, "src", "app", "apple-icon.svg")).href);
    await apple.waitForTimeout(300);
    await apple.screenshot({
      path: join(ROOT, "src", "app", "apple-icon.png"),
      omitBackground: false,
    });
    await apple.close();
    console.log("captured apple-icon.png");

    if (WITH_VIDEO) {
      // Record the walkthrough in its own context so the clip contains only
      // the tour: dashboard -> equivalence workspace -> evidence claims.
      const tour = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
      });
      const tourPage = await tour.newPage();
      await tourPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await tourPage.waitForTimeout(3000);
      await tourPage.goto(`${BASE_URL}/equivalence/equiv-tsa-delta-vs-acme`, {
        waitUntil: "networkidle",
      });
      await tourPage.waitForTimeout(3000);
      await tourPage.goto(`${BASE_URL}/evidence`, { waitUntil: "networkidle" });
      await tourPage.waitForTimeout(3000);
      const videoPath = await tourPage.video().path();
      await tour.close(); // flushes the recording
      renameSync(videoPath, join(OUT_DIR, "demo.webm"));
      console.log("captured demo.webm");
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  console.log(`Done. Assets written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
