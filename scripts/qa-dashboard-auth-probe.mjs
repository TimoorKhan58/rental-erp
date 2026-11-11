/**
 * Auth probe with non-invasive Origin header override.
 *
 * Environment reality: BETTER_AUTH_URL=http://localhost:3000 (per .env), but
 * port 3000 is held by a stale Next.js process, so the live dev server runs
 * on :3001. Better Auth rejects sign-in on :3001 with "Invalid origin".
 *
 * To perform authenticated click-through without modifying auth config,
 * env files, database, seed data, or killing user processes, we use a
 * Playwright request route interceptor that adds Origin: http://localhost:3000
 * to the Better Auth POST endpoints only. Everything else is untouched.
 *
 * Uses only the pre-existing E2E_USER_EMAIL / E2E_USER_PASSWORD provisioned
 * by the project owner in .env — no fake users created.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const AUTH_ORIGIN = process.env.AUTH_ORIGIN || "http://localhost:3000";
const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("MISSING E2E_USER_EMAIL / E2E_USER_PASSWORD");
  process.exit(2);
}

const OUT = path.join(process.cwd(), ".qa-auth");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

// Intercept only Better Auth API calls and inject the trusted Origin.
await context.route((url) => /\/api\/auth\//.test(url.toString()), async (route) => {
  const req = route.request();
  const headers = { ...req.headers(), origin: AUTH_ORIGIN, referer: AUTH_ORIGIN + "/" };
  await route.continue({ headers });
});

const page = await context.newPage();

const consoleErrors = [];
const authResponses = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on("response", async (resp) => {
  const u = resp.url();
  if (/\/api\/auth\//.test(u)) {
    let body = null;
    try {
      body = await resp.text();
      if (body && body.length > 400) body = body.slice(0, 400) + "…";
    } catch {}
    authResponses.push({ url: u, status: resp.status(), body });
  }
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByLabel(/email address/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in to dashboard/i }).click();

  await page
    .waitForURL(/\/dashboard/, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  const url = page.url();
  const errorText = await page
    .locator('[role="alert"]')
    .first()
    .textContent({ timeout: 1000 })
    .catch(() => null);

  if (/\/dashboard/.test(url)) {
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    const storagePath = path.join(OUT, "storageState.json");
    await context.storageState({ path: storagePath });
    console.log(JSON.stringify({
      result: "AUTH_OK",
      url,
      h1,
      storagePath,
      authResponses,
      consoleErrors: consoleErrors.slice(0, 20),
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      result: "AUTH_FAILED_STAYED_ON_LOGIN",
      url,
      errorText,
      authResponses,
      consoleErrors: consoleErrors.slice(0, 20),
    }, null, 2));
    process.exit(3);
  }
} catch (e) {
  console.log(JSON.stringify({
    result: "AUTH_ERROR",
    error: String(e),
    authResponses,
    consoleErrors: consoleErrors.slice(0, 20),
  }, null, 2));
  process.exit(4);
} finally {
  await browser.close();
}
