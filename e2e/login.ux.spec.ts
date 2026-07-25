import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { collectUxNoise } from "./helpers/ux";

test.describe("Login UI and UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in to dashboard/i })).toBeVisible();
  });

  test("has no critical accessibility or layout noise", async ({ page }) => {
    const accessibility = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    const seriousViolations = accessibility.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );
    const noise = await collectUxNoise(page);

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
    expect(noise.horizontalOverflow).toBe(false);
    expect(noise.overlappingToasts).toBeLessThanOrEqual(1);
    expect(noise.dialogCount).toBe(0);
    expect(noise.alertCount).toBe(0);
  });

  test("supports keyboard-only sign-in navigation", async ({ page }) => {
    const email = page.getByLabel(/email address/i);
    const password = page.getByLabel(/password/i);
    const submit = page.getByRole("button", { name: /sign in to dashboard/i });

    await email.focus();
    await expect(email).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(submit).toBeFocused();
  });

  test("keeps primary sign-in controls readable and tappable", async ({ page }) => {
    const primaryControls = [
      page.getByLabel(/email address/i),
      page.getByLabel(/password/i),
      page.getByRole("button", { name: /sign in to dashboard/i }),
    ];

    for (const control of primaryControls) {
      const box = await control.boundingBox();
      // Design-system controls are ~36px; catch anything that drops below a usable size.
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(120);
    }
  });
});
