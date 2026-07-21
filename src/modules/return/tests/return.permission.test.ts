import { describe, expect, it } from "vitest";

import { USER_ROLES } from "@/constants/roles";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/shared/application/authorization";

const RETURN_WORKFLOW_PERMISSIONS = [
  PERMISSIONS.returns.read,
  PERMISSIONS.returns.create,
  PERMISSIONS.returns.update,
  PERMISSIONS.returns.receive,
  PERMISSIONS.returns.inspect,
  PERMISSIONS.returns.complete,
  PERMISSIONS.returns.cancel,
] as const;

describe("returns permission wiring", () => {
  it("defines all return workflow permissions", () => {
    expect(PERMISSIONS.returns.read).toBe("returns:read");
    expect(PERMISSIONS.returns.create).toBe("returns:create");
    expect(PERMISSIONS.returns.update).toBe("returns:update");
    expect(PERMISSIONS.returns.receive).toBe("returns:receive");
    expect(PERMISSIONS.returns.inspect).toBe("returns:inspect");
    expect(PERMISSIONS.returns.complete).toBe("returns:complete");
    expect(PERMISSIONS.returns.cancel).toBe("returns:cancel");
  });

  it("includes return permissions in ALL_PERMISSIONS", () => {
    for (const permission of RETURN_WORKFLOW_PERMISSIONS) {
      expect(ALL_PERMISSIONS).toContain(permission);
    }
  });

  it("grants full return workflow access to OWNER", () => {
    for (const permission of RETURN_WORKFLOW_PERMISSIONS) {
      expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(permission);
    }
  });

  it("grants full return workflow access to MANAGER", () => {
    for (const permission of RETURN_WORKFLOW_PERMISSIONS) {
      expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(permission);
    }
  });

  it("grants operational return workflow access to WORKER", () => {
    for (const permission of RETURN_WORKFLOW_PERMISSIONS) {
      expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(permission);
    }
  });

  it("grants return read only to VIEWER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(
      PERMISSIONS.returns.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.returns.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.returns.update,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.returns.receive,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.returns.inspect,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.returns.complete,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.returns.cancel,
    );
  });

  it("grants return read only to ACCOUNTANT", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.returns.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).not.toContain(
      PERMISSIONS.returns.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).not.toContain(
      PERMISSIONS.returns.receive,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).not.toContain(
      PERMISSIONS.returns.complete,
    );
  });
});
