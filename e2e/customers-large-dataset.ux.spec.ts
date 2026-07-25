import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { buildLargeDataset, buildPaginationMeta } from "../src/test/ux/large-dataset";
import {
  collectUxNoise,
  hasE2ECredentials,
  loginAsE2EUser,
  measureInteractiveReady,
} from "./helpers/ux";

const allCustomers = buildLargeDataset(500);

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, requestId: "playwright-ux-test" }),
  });
}

async function mockCustomerApis(page: Page) {
  await page.route("**/api/users/me", (route) =>
    fulfillJson(route, {
      role: "admin",
      permissions: [
        "customers:read",
        "customers:create",
        "customers:update",
        "customers:delete",
      ],
    }),
  );

  await page.route("**/api/customers**", async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const status = url.searchParams.get("isActive");

    const filtered = allCustomers.filter((customer) => {
      const matchesSearch =
        !search ||
        customer.name.toLowerCase().includes(search) ||
        customer.customerCode.toLowerCase().includes(search) ||
        customer.phone.includes(search);
      const matchesStatus = status === null || customer.isActive === (status === "true");
      return matchesSearch && matchesStatus;
    });
    const start = (pageNumber - 1) * pageSize;

    await fulfillJson(route, {
      items: filtered.slice(start, start + pageSize),
      meta: buildPaginationMeta(filtered.length, pageNumber, pageSize),
    });
  });
}

test.describe("Customer list with 500 records", () => {
  test.skip(!hasE2ECredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run.");

  test.beforeEach(async ({ page }) => {
    await loginAsE2EUser(page);
    await mockCustomerApis(page);
  });

  test("stays usable, paginated, and free from critical noise", async ({ page }) => {
    await page.goto("/customers");
    const readyTime = await measureInteractiveReady(page, "tbody tr");
    const noise = await collectUxNoise(page);

    await expect(page.locator("tbody tr")).toHaveCount(20);
    await expect(page.getByText(/500/).first()).toBeVisible();
    expect(readyTime).toBeLessThan(5_000);
    expect(noise.horizontalOverflow).toBe(false);
    expect(noise.overlappingToasts).toBeLessThanOrEqual(1);
    expect(noise.dialogCount).toBe(0);
  });

  test("search and deep pagination remain understandable", async ({ page }) => {
    await page.goto("/customers");
    await page.getByLabel("Search customers").fill("Customer 499");
    await expect(page.getByRole("link", { name: /Customer 499/ })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await page.getByLabel("Search customers").clear();
    await expect(page.locator("tbody tr")).toHaveCount(20);
    await page.goto("/customers?page=25");
    await expect(page.getByRole("link", { name: /Customer 500/ })).toBeVisible();
    await expect(page.getByText(/500 of 500/i)).toBeVisible();
  });

  test("has no serious accessibility violations in the dense state", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.locator("tbody tr")).toHaveCount(20);

    const result = await new AxeBuilder({ page }).analyze();
    const seriousViolations = result.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });
});
