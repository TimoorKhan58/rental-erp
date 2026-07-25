import type { Page } from "@playwright/test";

export type UxNoiseReport = {
  horizontalOverflow: boolean;
  overlappingToasts: number;
  headingCount: number;
  alertCount: number;
  dialogCount: number;
};

/** Soft UX noise signals that make dense ERP screens feel hostile. */
export async function collectUxNoise(page: Page): Promise<UxNoiseReport> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 2;

    const toasts = Array.from(
      document.querySelectorAll("[data-sonner-toast], [role='status'].toaster, li[data-sonner-toast]"),
    );

    const headings = document.querySelectorAll("h1, h2, h3");
    const alerts = document.querySelectorAll("[role='alert']");
    const dialogs = document.querySelectorAll("[role='dialog'][data-state='open'], [role='alertdialog']");

    return {
      horizontalOverflow,
      overlappingToasts: toasts.length,
      headingCount: headings.length,
      alertCount: alerts.length,
      dialogCount: dialogs.length,
    };
  });
}

export async function expectNoCriticalUxNoise(page: Page) {
  const noise = await collectUxNoise(page);
  return noise;
}

export async function measureInteractiveReady(page: Page, selector: string) {
  const started = Date.now();
  await page.locator(selector).first().waitFor({ state: "visible" });
  return Date.now() - started;
}

export function hasE2ECredentials() {
  return Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
}

export async function loginAsE2EUser(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD are required for authenticated UX tests.");
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}
