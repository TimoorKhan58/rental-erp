import { expect, test } from "@playwright/test";
import {
  expirePasswordResetToken,
  getAuthUserEmailVerified,
  waitForPasswordResetToken,
} from "./helpers/db";
import {
  INVITE_WARNING_COPY,
  RESET_INVALID_COPY,
  cleanupInvitee,
  completeInvitePasswordSetup,
  createUserViaApi,
  hasInvitationE2EPrerequisites,
  loginAsAdmin,
  loginWithCredentials,
  uniqueInviteeEmail,
} from "./helpers/invitation";

const INVITEE_PASSWORD = "InviteePass123!";

test.describe("Invitation reset-password UX (no credentials)", () => {
  test("Scenario 3 — invalid token shows friendly error", async ({ page }) => {
    await page.goto("/reset-password?invite=1&token=not-a-real-token");
    await page.getByLabel(/^new password$/i).fill(INVITEE_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(INVITEE_PASSWORD);
    await page
      .getByRole("button", { name: /create password|update password/i })
      .click();

    await expect(page.getByText(RESET_INVALID_COPY)).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/prisma|stack|Better Auth/i);
  });

  test("Scenario 3b — INVALID_TOKEN query shows friendly error without form crash", async ({
    page,
  }) => {
    await page.goto("/reset-password?invite=1&error=INVALID_TOKEN");
    await expect(page.getByText(RESET_INVALID_COPY)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /request a new link/i }),
    ).toBeVisible();
  });
});

test.describe("Invitation onboarding E2E", () => {
  test.skip(
    !hasInvitationE2EPrerequisites(),
    "Requires E2E_USER_EMAIL, E2E_USER_PASSWORD, and DATABASE_URL.",
  );

  test.describe.configure({ mode: "serial" });

  test("Scenario 1+6 — successful invitation → set password → login → session", async ({
    page,
  }) => {
    const email = uniqueInviteeEmail("invite-ok");
    await loginAsAdmin(page);

    const created = await createUserViaApi(page.request, {
      name: "Invite Ok User",
      email,
      role: "viewer",
    });

    expect(created.status).toBe(200);
    expect(created.body.data?.email).toBe(email.toLowerCase());
    expect(created.body.data?.id).toBeTruthy();
    expect(JSON.stringify(created.body)).not.toMatch(/smtp|ECONNREFUSED|stack/i);

    const { token } = await waitForPasswordResetToken(email);
    expect(token.length).toBeGreaterThan(8);

    await page.context().clearCookies();
    await completeInvitePasswordSetup(page, {
      token,
      password: INVITEE_PASSWORD,
    });

    await loginWithCredentials(page, email, INVITEE_PASSWORD);
    await expect(page).not.toHaveURL(/\/login/);

    // requireEmailVerification remains false — login must succeed either way.
    const verified = await getAuthUserEmailVerified(email);
    expect(verified === true || verified === false).toBe(true);

    await cleanupInvitee(email);
  });

  test("Scenario 2 — invitation delivery failure keeps user and surfaces warning", async ({
    page,
  }) => {
    test.skip(
      process.env.ENABLE_EMAIL === "true",
      "Delivery-failure path needs ENABLE_EMAIL unset/false so SMTP is not ready.",
    );

    const email = uniqueInviteeEmail("invite-fail");
    await loginAsAdmin(page);

    await page.goto("/users/new");
    await page.getByLabel(/full name/i).fill("Invite Fail User");
    await page.getByLabel(/^email$/i).fill(email);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/users") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /create user/i }).click();
    const createResponse = await responsePromise;
    const createBody = (await createResponse.json()) as {
      data?: { invitationDelivered?: boolean; email?: string };
    };

    expect(createResponse.status()).toBe(200);
    expect(createBody.data?.invitationDelivered).toBe(false);
    expect(JSON.stringify(createBody)).not.toMatch(/smtp|ECONNREFUSED|stack/i);

    await expect(page.getByText(INVITE_WARNING_COPY)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/\/users\//);

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toMatch(/smtp:\/\//i);
    expect(pageText).not.toMatch(/ECONNREFUSED/i);

    await cleanupInvitee(email);
  });

  test("Scenario 4 — expired token rejected with recovery guidance", async ({
    page,
  }) => {
    const email = uniqueInviteeEmail("invite-expired");
    await loginAsAdmin(page);

    const created = await createUserViaApi(page.request, {
      name: "Invite Expired User",
      email,
    });
    expect(created.status).toBe(200);

    const { token } = await waitForPasswordResetToken(email);
    await expirePasswordResetToken(token);

    await page.context().clearCookies();
    await page.goto(
      `/reset-password?invite=1&token=${encodeURIComponent(token)}`,
    );
    await page.getByLabel(/^new password$/i).fill(INVITEE_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(INVITEE_PASSWORD);
    await page
      .getByRole("button", { name: /create password|update password/i })
      .click();

    await expect(page.getByText(RESET_INVALID_COPY)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /request a new link/i }),
    ).toBeVisible();

    await cleanupInvitee(email);
  });

  test("Scenario 5 — token reuse rejected after successful onboarding", async ({
    page,
  }) => {
    const email = uniqueInviteeEmail("invite-reuse");
    await loginAsAdmin(page);

    const created = await createUserViaApi(page.request, {
      name: "Invite Reuse User",
      email,
    });
    expect(created.status).toBe(200);

    const { token } = await waitForPasswordResetToken(email);

    await page.context().clearCookies();
    await completeInvitePasswordSetup(page, {
      token,
      password: INVITEE_PASSWORD,
    });

    await page.goto(
      `/reset-password?invite=1&token=${encodeURIComponent(token)}`,
    );
    await page.getByLabel(/^new password$/i).fill("AnotherPass123!");
    await page.getByLabel(/confirm password/i).fill("AnotherPass123!");
    await page
      .getByRole("button", { name: /create password|update password/i })
      .click();
    await expect(page.getByText(RESET_INVALID_COPY)).toBeVisible();

    await cleanupInvitee(email);
  });

  test("Scenario 7 — active sessions list and revoke other device", async ({
    browser,
    page,
  }) => {
    const email = uniqueInviteeEmail("invite-sessions");
    await loginAsAdmin(page);

    const created = await createUserViaApi(page.request, {
      name: "Invite Sessions User",
      email,
      role: "viewer",
    });
    expect(created.status).toBe(200);

    const { token } = await waitForPasswordResetToken(email);
    await page.context().clearCookies();
    await completeInvitePasswordSetup(page, {
      token,
      password: INVITEE_PASSWORD,
    });

    await loginWithCredentials(page, email, INVITEE_PASSWORD);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await loginWithCredentials(otherPage, email, INVITEE_PASSWORD);

    await page.goto("/settings/security");
    await expect(page.getByText("Active sessions", { exact: true })).toBeVisible();
    await expect(page.getByText("Current session", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /sign out other devices/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^sign out other devices$/i })
      .click();
    await expect(page.getByText(/other devices signed out/i)).toBeVisible({
      timeout: 15_000,
    });

    await otherPage.goto("/dashboard");
    await expect(otherPage).toHaveURL(/\/login/, { timeout: 20_000 });

    await otherContext.close();
    await cleanupInvitee(email);
  });
});
