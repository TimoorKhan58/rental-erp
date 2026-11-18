import { describe, expect, it } from "vitest";

import { PERMISSIONS, ROLE_PERMISSIONS } from "@/shared/application/authorization";
import { USER_ROLES } from "@/constants/roles";

describe("identity RBAC", () => {
  it("grants staff management to the owner", () => {
    for (const permission of Object.values(PERMISSIONS.identity)) {
      expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(permission);
    }
  });

  it("limits worker identity access", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.identity.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.identity.create,
    );
  });

  it("shows the staff list to Owners only (decided 2026-11-19)", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(PERMISSIONS.identity.read);
    for (const role of [USER_ROLES.MANAGER, USER_ROLES.WORKER, USER_ROLES.ACCOUNTANT, USER_ROLES.VIEWER]) {
      expect(ROLE_PERMISSIONS[role]).not.toContain(PERMISSIONS.identity.read);
      expect(ROLE_PERMISSIONS[role]).not.toContain(PERMISSIONS.identity.create);
      expect(ROLE_PERMISSIONS[role]).not.toContain(PERMISSIONS.identity.update);
      expect(ROLE_PERMISSIONS[role]).not.toContain(PERMISSIONS.identity.delete);
    }
  });
});
