import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium, defineConfig, devices } from "@playwright/test";

/**
 * Chromium executable resolution order:
 * 1. `PLAYWRIGHT_CHROMIUM_PATH` env override (explicit chrome/chromium path).
 * 2. The Playwright-managed browser for this version (normal
 *    `npx playwright install chromium`) — used whenever it is installed.
 * 3. A cached chromium-1223 build under the standard ms-playwright cache —
 *    fallback for offline Windows machines where the exact expected revision
 *    cannot be downloaded.
 */
function resolveChromiumExecutablePath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  if (existsSync(chromium.executablePath())) {
    return undefined; // Playwright-managed browser present — no override needed.
  }
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

const executablePath = resolveChromiumExecutablePath();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
