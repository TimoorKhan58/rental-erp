import { describe, expect, it } from "vitest";

import { PERMISSIONS, ROLE_PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";

describe("identity RBAC", () => {
  it("grants identity admin permissions to owner and manager", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(
      PERMISSIONS.identity.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(
      PERMISSIONS.identity.update,
    );
  });

  it("limits worker identity access", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.identity.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.identity.create,
    );
  });

  it("allows viewers to read identity resources only", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(
      PERMISSIONS.identity.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.identity.delete,
    );
  });
});
