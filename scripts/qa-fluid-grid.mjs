/**
 * Visual QA against /dev/fluid-grid-qa (dev-only public harness).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3002";
const OUT = path.join(process.cwd(), ".qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "2560x1440", width: 2560, height: 1440 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
];

async function measure(page) {
  return page.evaluate(() => {
    const main = document.querySelector("#main-content");
    const workspace = document.querySelector(".app-workspace");
    const cards = [...document.querySelectorAll("[data-slot=card]")];
    const vw = window.innerWidth;
    const mainRect = main?.getBoundingClientRect();
    const wsRect = workspace?.getBoundingClientRect();
    const overflowX =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const maxWidth = workspace ? getComputedStyle(workspace).maxWidth : null;
    const utilization =
      wsRect && mainRect && mainRect.width > 0
        ? Number(((wsRect.width / mainRect.width) * 100).toFixed(1))
        : null;
    return {
      vw,
      sidebarStub: 224,
      workspaceWidth: wsRect ? Math.round(wsRect.width) : null,
      mainWidth: mainRect ? Math.round(mainRect.width) : null,
      leftPad: wsRect ? Math.round(wsRect.left - (mainRect?.left ?? 0)) : null,
      rightPadFromMain: wsRect && mainRect ? Math.round(mainRect.right - wsRect.right) : null,
      rightPadFromViewport: wsRect ? Math.round(vw - wsRect.right) : null,
      overflowX,
      hasAppWorkspace: Boolean(workspace),
      maxWidth,
      cardCount: cards.length,
      firstCardWidth: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : null,
      utilizationPct: utilization,
      title: document.querySelector("h1")?.textContent?.trim() ?? null,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: "light",
  });
  const page = await context.newPage();
  try {
    const res = await page.goto(`${BASE}/dev/fluid-grid-qa`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector(".app-workspace", { timeout: 30000 });
    const metrics = await measure(page);
    const shot = path.join(OUT, `fluid-${vp.name}-light.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.push({
      viewport: vp.name,
      status: res?.status(),
      theme: "light",
      url: page.url(),
      ...metrics,
      shot,
    });
  } catch (e) {
    results.push({ viewport: vp.name, theme: "light", error: String(e) });
  }
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/dev/fluid-grid-qa`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(400);
    const metrics = await measure(page);
    const shot = path.join(OUT, "fluid-1920x1080-dark.png");
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ viewport: "1920x1080", theme: "dark", ...metrics, shot });
  } catch (e) {
    results.push({ viewport: "1920x1080", theme: "dark", error: String(e) });
  }
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "fluid-qa-metrics.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

const wide = results.find((r) => r.viewport === "1920x1080" && r.theme === "light");
if (!wide || wide.error) {
  console.error("FAIL: missing 1920 metrics");
  process.exit(1);
}
if (wide.maxWidth && wide.maxWidth !== "none") {
  console.error("FAIL: workspace still has max-width", wide.maxWidth);
  process.exit(1);
}
if ((wide.rightPadFromMain ?? 99) > 40) {
  console.error("FAIL: large right dead zone inside main", wide.rightPadFromMain);
  process.exit(1);
}
if ((wide.utilizationPct ?? 0) < 95) {
  console.error("FAIL: low workspace utilization", wide.utilizationPct);
  process.exit(1);
}
console.log("QA assertions: PASS");
