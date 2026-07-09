import { describe, expect, it } from "vitest";

import { USER_ROLES } from "@/constants/roles";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/shared/application/authorization";

describe("financialReports permission wiring", () => {
  it("defines financial-reports:read permission", () => {
    expect(PERMISSIONS.financialReports.read).toBe("financial-reports:read");
  });

  it("includes financial reports read in ALL_PERMISSIONS", () => {
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.financialReports.read);
  });

  it("grants financial reports read to OWNER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(
      PERMISSIONS.financialReports.read,
    );
  });

  it("grants financial reports read to MANAGER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(
      PERMISSIONS.financialReports.read,
    );
  });

  it("grants financial reports read to ACCOUNTANT", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.financialReports.read,
    );
  });

  it("grants financial reports read to VIEWER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(
      PERMISSIONS.financialReports.read,
    );
  });

  it("does not grant financial reports read to WORKER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(
      PERMISSIONS.financialReports.read,
    );
  });
});
