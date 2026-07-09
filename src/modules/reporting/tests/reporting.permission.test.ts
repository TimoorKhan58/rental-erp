import { describe, expect, it } from "vitest";

import { USER_ROLES } from "@/constants/roles";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/shared/application/authorization";

describe("reports permission wiring", () => {
  it("defines reports:read permission", () => {
    expect(PERMISSIONS.reports.read).toBe("reports:read");
  });

  it("includes reports read in ALL_PERMISSIONS", () => {
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.reports.read);
  });

  it("grants reports read to OWNER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(
      PERMISSIONS.reports.read,
    );
  });

  it("grants reports read to MANAGER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(
      PERMISSIONS.reports.read,
    );
  });

  it("grants reports read to ACCOUNTANT", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.reports.read,
    );
  });

  it("grants reports read to VIEWER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(
      PERMISSIONS.reports.read,
    );
  });

  it("does not grant reports read to WORKER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.reports.read,
    );
  });
});
