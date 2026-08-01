import { config as loadDotenv } from "dotenv";
import { vi } from "vitest";

// Load local `.env` for modules that import `@/shared/config/env` at init time.
loadDotenv({ path: ".env", quiet: true });

/**
 * Phase 14.4 auth hardening calls prisma.user.findUnique during API auth.
 * Phase 15A.2 session hooks also look up authUser → ERP user before create.
 * Phase 17 also loads ERP role for authorization (not cookie-cached AuthUser.role).
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
          role: { name: "owner" },
        };
      }),
    },
    authUser: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => {
          if (!where?.id) {
            return null;
          }

          return {
            id: where.id,
            erpUserId: where.id,
          };
        },
      ),
    },
  },
}));
