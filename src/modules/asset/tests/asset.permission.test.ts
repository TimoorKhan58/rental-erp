import { describe, expect, it } from "vitest";

import { USER_ROLES } from "@/constants/roles";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/shared/application/authorization";

describe("assets permission wiring", () => {
  it("defines all asset workflow permissions", () => {
    expect(PERMISSIONS.assets.read).toBe("assets:read");
    expect(PERMISSIONS.assets.create).toBe("assets:create");
    expect(PERMISSIONS.assets.update).toBe("assets:update");
    expect(PERMISSIONS.assets.transfer).toBe("assets:transfer");
    expect(PERMISSIONS.assets.dispose).toBe("assets:dispose");
    expect(PERMISSIONS.assets.maintenance).toBe("assets:maintenance");
  });

  it("includes asset permissions in ALL_PERMISSIONS", () => {
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.assets.read);
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.assets.transfer);
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.assets.dispose);
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.assets.maintenance);
  });

  it("grants full asset access to OWNER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(
      PERMISSIONS.assets.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.OWNER]).toContain(
      PERMISSIONS.assets.transfer,
    );
  });

  it("grants asset read to VIEWER only", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(
      PERMISSIONS.assets.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.assets.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.assets.transfer,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.assets.dispose,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.assets.maintenance,
    );
  });

  it("grants operational asset permissions to WORKER", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assets.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assets.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assets.transfer,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assets.dispose,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assets.maintenance,
    );
  });

  it("grants asset permissions to ACCOUNTANT", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.assets.update,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.assets.dispose,
    );
  });
});

describe("asset-categories permission wiring", () => {
  it("defines all asset category CRUD permissions", () => {
    expect(PERMISSIONS.assetCategories.read).toBe("asset-categories:read");
    expect(PERMISSIONS.assetCategories.create).toBe("asset-categories:create");
    expect(PERMISSIONS.assetCategories.update).toBe("asset-categories:update");
    expect(PERMISSIONS.assetCategories.delete).toBe("asset-categories:delete");
  });

  it("includes asset category permissions in ALL_PERMISSIONS", () => {
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.assetCategories.read);
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.assetCategories.delete);
  });

  it("grants category read to VIEWER only", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toContain(
      PERMISSIONS.assetCategories.read,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.assetCategories.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).not.toContain(
      PERMISSIONS.assetCategories.delete,
    );
  });

  it("grants category management to WORKER and ACCOUNTANT", () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assetCategories.create,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(
      PERMISSIONS.assetCategories.delete,
    );
    expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(
      PERMISSIONS.assetCategories.update,
    );
  });
});
