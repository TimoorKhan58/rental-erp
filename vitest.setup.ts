import { vi } from "vitest";

/**
 * Phase 14.4 auth hardening calls prisma.user.findUnique during API auth.
 * Unit/presentation tests mock Better Auth sessions but do not run against a DB.
 * Provide a safe active-user lookup so authorization tests exercise RBAC, not DB connectivity.
 */
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (!where?.id) {
          return null;
        }

        return {
          id: where.id,
          isActive: true,
        };
      }),
    },
  },
}));
