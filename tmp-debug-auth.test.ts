import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/shared/config/env", async () => {
  const { testEnvFixture } = await import("@/shared/config/env.test-fixture");
  return { env: testEnvFixture };
});
import { PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";
import { createMockAuthSession } from "@/shared/infrastructure/auth/test-session.factory";
import { runReturnApiRoute } from "@/modules/return/presentation/http/return-api.route-runner";
import { createMockNextRequest } from "@/modules/return/tests/helpers/api-request.factory";

const getSessionMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSessionMock(...args) } },
}));

getSessionMock.mockResolvedValue(createMockAuthSession(USER_ROLES.VIEWER));
const result = await runReturnApiRoute({
  request: createMockNextRequest(),
  route: "/api/returns",
  httpMethod: "POST",
  permission: PERMISSIONS.returns.create,
  resolveServices: () => ({}) as never,
  handler: async () => ({ ok: true }),
});
console.log(JSON.stringify(result, null, 2));
