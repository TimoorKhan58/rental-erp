import { expect, test, type Page, type Route } from "@playwright/test";
import {
  collectUxNoise,
  hasE2ECredentials,
  loginAsE2EUser,
  measureInteractiveReady,
} from "./helpers/ux";

const sampleUsers = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Ada Lovelace",
    email: "ada@example.com",
    roleId: "role-owner",
    role: "owner",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Grace Hopper",
    email: "grace@example.com",
    roleId: "role-manager",
    role: "manager",
    isActive: false,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
];

const roles = [
  { id: "role-owner", name: "owner", label: "Owner" },
  { id: "role-manager", name: "manager", label: "Manager" },
  { id: "role-worker", name: "worker", label: "Worker" },
  { id: "role-accountant", name: "accountant", label: "Accountant" },
  { id: "role-viewer", name: "viewer", label: "Viewer" },
];

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ data, requestId: "playwright-users-test" }),
  });
}

async function mockUserApis(page: Page) {
  await page.route("**/api/users/me", (route) =>
    fulfillJson(route, {
      id: sampleUsers[0].id,
      name: sampleUsers[0].name,
      email: sampleUsers[0].email,
      roleId: sampleUsers[0].roleId,
      role: "owner",
      isActive: true,
      createdAt: sampleUsers[0].createdAt,
      updatedAt: sampleUsers[0].updatedAt,
      permissions: [
        "identity:read",
        "identity:create",
        "identity:update",
        "identity:delete",
      ],
    }),
  );

  await page.route("**/api/roles", (route) => fulfillJson(route, roles));

  await page.route("**/api/users/*/reset-password", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const id = new URL(route.request().url()).pathname.split("/")[3];
    const existing = sampleUsers.find((item) => item.id === id) ?? sampleUsers[0];
    await fulfillJson(route, existing);
  });

  await page.route("**/api/users/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments[2];

    if (!id || id === "me") {
      await route.fallback();
      return;
    }

    if (method === "GET") {
      const user = sampleUsers.find((item) => item.id === id) ?? sampleUsers[0];
      await fulfillJson(route, user);
      return;
    }

    if (method === "PATCH") {
      const body = request.postDataJSON() as Record<string, unknown>;
      const existing = sampleUsers.find((item) => item.id === id) ?? sampleUsers[0];
      await fulfillJson(route, { ...existing, ...body });
      return;
    }

    if (method === "DELETE") {
      await fulfillJson(route, null);
      return;
    }

    await route.fallback();
  });

  await page.route("**/api/users", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const status = url.searchParams.get("isActive");
      const role = url.searchParams.get("role");
      const filtered = sampleUsers.filter((user) => {
        const matchesSearch =
          !search ||
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search);
        const matchesStatus =
          status === null || user.isActive === (status === "true");
        const matchesRole = role === null || user.role === role;
        return matchesSearch && matchesStatus && matchesRole;
      });

      await fulfillJson(route, {
        items: filtered,
        meta: {
          page: 1,
          pageSize: 20,
          total: filtered.length,
          totalPages: 1,
        },
      });
      return;
    }

    if (method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      await fulfillJson(route, {
        id: "00000000-0000-4000-8000-000000000099",
        name: body.name,
        email: body.email,
        roleId: "role-viewer",
        role: body.role,
        isActive: body.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    await route.fallback();
  });
}

test.describe("Users management UI", () => {
  test.skip(!hasE2ECredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run.");

  test.beforeEach(async ({ page }) => {
    await loginAsE2EUser(page);
    await mockUserApis(page);
  });

  test("lists users with search and status filter", async ({ page }) => {
    await page.goto("/users");
    const readyTime = await measureInteractiveReady(page, "tbody tr");
    const noise = await collectUxNoise(page);

    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Ada Lovelace" })).toBeVisible();
    await expect(page.getByRole("button", { name: /new user/i })).toBeVisible();
    expect(readyTime).toBeLessThan(5_000);
    expect(noise.horizontalOverflow).toBe(false);

    await page.getByLabel(/search users/i).fill("grace");
    await expect(page.getByRole("link", { name: "Grace Hopper" })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("opens detail and supports activate / reset password actions", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("link", { name: "Grace Hopper" }).click();
    await expect(page).toHaveURL(/\/users\/00000000-0000-4000-8000-000000000002/);
    await expect(page.getByRole("heading", { name: "Grace Hopper" })).toBeVisible();
    await expect(page.getByRole("button", { name: /activate/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /reset password/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^edit$/i })).toBeVisible();

    await page.getByRole("button", { name: /activate/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/activate "grace hopper"/i)).toBeVisible();
    await page.getByRole("button", { name: /^activate$/i }).click();
    await expect(page.getByText(/user activated successfully/i)).toBeVisible();

    await page.getByRole("button", { name: /reset password/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel(/^new password$/i).fill("Password123!");
    await page.getByLabel(/confirm password/i).fill("Password123!");
    await page.getByRole("button", { name: /^reset password$/i }).click();
    await expect(page.getByText(/password reset successfully/i)).toBeVisible();
  });

  test("create user page renders the form", async ({ page }) => {
    await page.goto("/users/new");
    await expect(page.getByRole("heading", { name: /new user/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create user/i })).toBeVisible();
  });

  test("edit page shows profile fields without status switch", async ({ page }) => {
    await page.goto(`/users/${sampleUsers[0].id}/edit`);
    await expect(page.getByRole("heading", { name: /edit user/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel(/^email$/i)).toHaveValue("ada@example.com");
    await expect(page.getByText(/^status$/i)).toHaveCount(0);
    await expect(page.getByRole("switch")).toHaveCount(0);
  });
});
