import { vi } from "vitest";

import { USER_ROLES, type UserRole } from "@/constants/roles";

import {
  createMockAuthSession,
  TEST_AUTH_USER_ID,
  TEST_ERP_USER_ID,
} from "./test-session.factory";

/**
 * Shared auth + Prisma stubs for API presentation tests.
 * Production authenticateApiRequest calls ensureActiveErpUser → prisma.user.findUnique;
 * tests must mock both @/lib/auth and @/lib/prisma.
 *
 * Register mocks in each suite with:
 *   vi.mock("@/lib/auth", async () => (await import("...")).createLibAuthMockModule());
 *   vi.mock("@/lib/prisma", async () => (await import("...")).createLibPrismaMockModule());
 */
export const getSessionMock = vi.fn();
export const findUniqueUserMock = vi.fn();

export async function createLibAuthMockModule() {
  return {
    auth: {
      api: {
        getSession: (...args: unknown[]) => getSessionMock(...args),
      },
    },
  };
}

export async function createLibPrismaMockModule() {
  return {
    default: {
      user: {
        findUnique: (...args: unknown[]) => findUniqueUserMock(...args),
      },
    },
  };
}

export function mockAuthenticatedActiveUser(
  role: UserRole = USER_ROLES.OWNER,
): void {
  getSessionMock.mockResolvedValue(createMockAuthSession(role));
  findUniqueUserMock.mockResolvedValue({ isActive: true });
}

export function mockAuthenticatedInactiveUser(
  role: UserRole = USER_ROLES.MANAGER,
): void {
  getSessionMock.mockResolvedValue(createMockAuthSession(role));
  findUniqueUserMock.mockResolvedValue({ isActive: false });
}

export function mockUnauthenticatedUser(): void {
  getSessionMock.mockResolvedValue(null);
}

/** Clears call history and implementations; re-apply session helpers in each test. */
export function resetApiAuthMocks(): void {
  getSessionMock.mockReset();
  findUniqueUserMock.mockReset();
}

/** @deprecated Prefer mockAuthenticatedActiveUser — kept for suite readability. */
export const mockSession = mockAuthenticatedActiveUser;

/** @deprecated Prefer mockAuthenticatedInactiveUser */
export const mockInactiveSession = mockAuthenticatedInactiveUser;

export {
  createMockAuthSession,
  TEST_AUTH_USER_ID,
  TEST_ERP_USER_ID,
};
