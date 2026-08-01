import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
}));

const getSessionMock = vi.hoisted(() => vi.fn());
const resolveActiveSessionUserMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/shared/infrastructure/auth", () => ({
  resolveActiveSessionUser: resolveActiveSessionUserMock,
}));

import { requireActiveSession, requireSession } from "./session";

describe("requireActiveSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when no session exists", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(requireActiveSession()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(resolveActiveSessionUserMock).not.toHaveBeenCalled();
  });

  it("allows an active ERP-linked session", async () => {
    const session = {
      user: {
        id: "auth-1",
        email: "a@example.com",
        name: "Ada",
        role: "owner",
        erpUserId: "erp-1",
      },
    };
    const user = {
      erpUserId: "erp-1",
      authUserId: "auth-1",
      role: "owner",
      email: "a@example.com",
      name: "Ada",
    };

    getSessionMock.mockResolvedValue(session);
    resolveActiveSessionUserMock.mockResolvedValue(user);

    await expect(requireActiveSession()).resolves.toEqual({ session, user });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("clears inactive sessions via /logout", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "auth-1",
        email: "a@example.com",
        name: "Ada",
        role: "owner",
        erpUserId: "erp-1",
      },
    });
    resolveActiveSessionUserMock.mockResolvedValue(null);

    await expect(requireActiveSession()).rejects.toThrow("NEXT_REDIRECT:/logout");
  });
});

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still only checks session existence", async () => {
    const session = { user: { id: "auth-1" } };
    getSessionMock.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
    expect(resolveActiveSessionUserMock).not.toHaveBeenCalled();
  });
});
