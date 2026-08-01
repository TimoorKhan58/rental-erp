import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth";
import prisma from "@/lib/prisma";
import {
  assertAuthUserMayCreateSession,
  isErpUserActive,
  resolveActiveSessionUser,
} from "./resolve-session-user";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    authUser: {
      findUnique: vi.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  authUser: { findUnique: ReturnType<typeof vi.fn> };
};

describe("isErpUserActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for an active ERP user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "erp-1",
      isActive: true,
    });

    await expect(isErpUserActive("erp-1")).resolves.toBe(true);
  });

  it("returns false when the ERP user is missing or inactive", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(isErpUserActive("missing")).resolves.toBe(false);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "erp-1",
      isActive: false,
    });
    await expect(isErpUserActive("erp-1")).resolves.toBe(false);
  });
});

describe("assertAuthUserMayCreateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows session creation for a linked active ERP user", async () => {
    prismaMock.authUser.findUnique.mockResolvedValue({
      erpUserId: "erp-1",
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "erp-1",
      isActive: true,
    });

    await expect(
      assertAuthUserMayCreateSession("auth-1"),
    ).resolves.toBeUndefined();
  });

  it("rejects unlinked AuthUsers", async () => {
    prismaMock.authUser.findUnique.mockResolvedValue({
      erpUserId: null,
    });

    await expect(assertAuthUserMayCreateSession("auth-1")).rejects.toBeInstanceOf(
      APIError,
    );
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects inactive ERP users", async () => {
    prismaMock.authUser.findUnique.mockResolvedValue({
      erpUserId: "erp-1",
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "erp-1",
      isActive: false,
    });

    await expect(assertAuthUserMayCreateSession("auth-1")).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
  });
});

describe("resolveActiveSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the authoritative ERP role (not the cookie-cached AuthUser role)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "erp-1",
      isActive: true,
      role: { name: "manager" },
    });

    const session = {
      user: {
        id: "auth-1",
        email: "a@example.com",
        name: "Ada",
        role: "owner",
        erpUserId: "erp-1",
      },
    } as Parameters<typeof resolveActiveSessionUser>[0];

    const resolved = await resolveActiveSessionUser(session);

    expect(resolved).toEqual({
      erpUserId: "erp-1",
      authUserId: "auth-1",
      role: "manager",
      email: "a@example.com",
      name: "Ada",
    });
  });

  it("returns null for inactive ERP users", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "erp-1",
      isActive: false,
      role: { name: "owner" },
    });

    const session = {
      user: {
        id: "auth-1",
        email: "a@example.com",
        name: "Ada",
        role: "owner",
        erpUserId: "erp-1",
      },
    } as Parameters<typeof resolveActiveSessionUser>[0];

    await expect(resolveActiveSessionUser(session)).resolves.toBeNull();
  });
});
