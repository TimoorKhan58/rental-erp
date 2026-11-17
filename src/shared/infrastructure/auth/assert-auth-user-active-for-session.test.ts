import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  authUser: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}));
const platform = vi.hoisted(() => ({
  findActivePlatformOwner: vi.fn(),
  recordPlatformAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/modules/platform/infrastructure/platform-owner.repository", () => platform);

import { assertAuthUserActiveForSession } from "./assert-auth-user-active-for-session";

describe("assertAuthUserActiveForSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets an active platform owner sign in and audits it (SaaS phase 3b)", async () => {
    db.authUser.findUnique.mockResolvedValue({ erpUserId: null });
    platform.findActivePlatformOwner.mockResolvedValue({ id: "po-1" });

    await expect(
      assertAuthUserActiveForSession("auth-1", { ipAddress: "10.0.0.1", userAgent: "test" }),
    ).resolves.toBeUndefined();

    expect(platform.recordPlatformAudit).toHaveBeenCalledWith(db, {
      platformOwnerId: "po-1",
      action: "platform.sign_in",
      ipAddress: "10.0.0.1",
      userAgent: "test",
    });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a login with no ERP user that is not an active platform owner", async () => {
    db.authUser.findUnique.mockResolvedValue({ erpUserId: null });
    platform.findActivePlatformOwner.mockResolvedValue(null);

    await expect(assertAuthUserActiveForSession("auth-1")).rejects.toMatchObject({
      message: "User account is not linked to the ERP identity",
    });
    expect(platform.recordPlatformAudit).not.toHaveBeenCalled();
  });

  it("checks business users as before and never as platform owners", async () => {
    db.authUser.findUnique.mockResolvedValue({ erpUserId: "erp-1" });
    db.user.findUnique.mockResolvedValue({ isActive: true, organization: { isActive: true } });

    await expect(assertAuthUserActiveForSession("auth-1")).resolves.toBeUndefined();
    expect(platform.findActivePlatformOwner).not.toHaveBeenCalled();
  });

  it("still refuses business users of an inactive business", async () => {
    db.authUser.findUnique.mockResolvedValue({ erpUserId: "erp-1" });
    db.user.findUnique.mockResolvedValue({ isActive: true, organization: { isActive: false } });

    await expect(assertAuthUserActiveForSession("auth-1")).rejects.toMatchObject({
      message: "This business account is inactive",
    });
  });
});
