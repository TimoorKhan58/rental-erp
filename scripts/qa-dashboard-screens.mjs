/**
 * Dashboard QA screenshot pass.
 *
 * The real /dashboard route requires Better Auth. In this environment no seed
 * user exists so authenticated screenshots are BLOCKED. This script:
 *
 *   1. Captures /login at multiple viewports (light + dark) to prove the
 *      shell/server chrome renders cleanly in both themes and to record the
 *      redirect that authenticated dashboard testing would encounter.
 *   2. Captures /dev/fluid-grid-qa at the same viewports so the dashboard's
 *      shared layout primitives (PageContainer / .app-grid / 8-4 split) are
 *      exercised visually against the actual application shell.
 *
 * Screenshots are written to .qa-screenshots/. This script never modifies
 * server state and does not invent authenticated results.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3002";
const OUT = path.join(process.cwd(), ".qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "2560x1440", width: 2560, height: 1440 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
];

const themes = [
  { name: "light", colorScheme: "light" },
  { name: "dark", colorScheme: "dark" },
];

const targets = [
  { name: "login", path: "/login" },
  { name: "fluid-grid-qa", path: "/dev/fluid-grid-qa" },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const target of targets) {
  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme.colorScheme,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${BASE}${target.path}`, {
          waitUntil: "networkidle",
          timeout: 60000,
        });
        if (theme.colorScheme === "dark") {
          await page.evaluate(() => document.documentElement.classList.add("dark"));
          await page.waitForTimeout(400);
        }
        const shot = path.join(
          OUT,
          `${target.name}-${vp.name}-${theme.name}.png`,
        );
        await page.screenshot({ path: shot, fullPage: false });
        results.push({
          target: target.name,
          viewport: vp.name,
          theme: theme.name,
          status: res?.status(),
          url: page.url(),
          shot,
        });
      } catch (e) {
        results.push({
          target: target.name,
          viewport: vp.name,
          theme: theme.name,
          error: String(e),
        });
      }
      await context.close();
    }
  }
}

await browser.close();
fs.writeFileSync(
  path.join(OUT, "dashboard-qa-index.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
