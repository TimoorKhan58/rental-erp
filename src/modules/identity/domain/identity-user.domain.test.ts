import { describe, expect, it } from "vitest";

import { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import { IdentityUserInvariantError } from "@/modules/identity/domain/identity-user.errors";
import {
  assertCanAssignRole,
  assertCanChangeUserRole,
  assertCanDeactivateUser,
  assertUserIsActive,
} from "@/modules/identity/domain/identity-user.rules";
import { USER_ROLES } from "@/constants/roles";

import {
  MANAGER_ROLE_ID,
  USER_ID,
  buildIdentityUserProps,
} from "../tests/helpers/identity-user.fixtures";

describe("IdentityUser entity", () => {
  it("creates normalized user data", () => {
    const data = IdentityUser.create({
      name: "  Jane Admin  ",
      email: " Jane.Admin@Example.com ",
      roleId: MANAGER_ROLE_ID,
      roleName: USER_ROLES.MANAGER,
    });

    expect(data.name).toBe("Jane Admin");
    expect(data.email).toBe("jane.admin@example.com");
    expect(data.isActive).toBe(true);
  });

  it("rejects empty name", () => {
    expect(() =>
      IdentityUser.create({
        name: "   ",
        email: "user@example.com",
        roleId: MANAGER_ROLE_ID,
        roleName: USER_ROLES.MANAGER,
      }),
    ).toThrow(IdentityUserInvariantError);
  });

  it("applies updates and deactivation", () => {
    const user = IdentityUser.reconstitute(buildIdentityUserProps());
    const updated = user.applyUpdate({ name: "Updated Owner" });

    expect(updated.name).toBe("Updated Owner");

    const deactivated = IdentityUser.reconstitute(updated).deactivate();
    expect(deactivated.isActive).toBe(false);
  });
});

describe("identity user rules", () => {
  it("blocks self deactivation", () => {
    expect(() =>
      assertCanDeactivateUser({
        targetUserId: USER_ID,
        actorUserId: USER_ID,
        targetRole: USER_ROLES.OWNER,
        activeOwnerCount: 2,
      }),
    ).toThrow();
  });

  it("blocks deactivating the last owner", () => {
    expect(() =>
      assertCanDeactivateUser({
        targetUserId: USER_ID,
        actorUserId: "other-user",
        targetRole: USER_ROLES.OWNER,
        activeOwnerCount: 1,
      }),
    ).toThrow();
  });

  it("requires active users for protected operations", () => {
    expect(() => assertUserIsActive(false)).toThrow();
  });

  it("blocks manager from assigning owner", () => {
    expect(() =>
      assertCanAssignRole({
        actorRole: USER_ROLES.MANAGER,
        targetRole: USER_ROLES.OWNER,
      }),
    ).toThrow(/Only owners can assign the owner role/);
  });

  it("allows owner to assign owner", () => {
    expect(() =>
      assertCanAssignRole({
        actorRole: USER_ROLES.OWNER,
        targetRole: USER_ROLES.OWNER,
      }),
    ).not.toThrow();
  });

  it("allows bootstrap without actor role to assign owner", () => {
    expect(() =>
      assertCanAssignRole({
        actorRole: undefined,
        targetRole: USER_ROLES.OWNER,
      }),
    ).not.toThrow();
  });

  it("blocks demoting the last owner", () => {
    expect(() =>
      assertCanChangeUserRole({
        actorRole: USER_ROLES.OWNER,
        currentRole: USER_ROLES.OWNER,
        newRole: USER_ROLES.MANAGER,
        activeOwnerCount: 1,
      }),
    ).toThrow(/Cannot demote the last active owner account/);
  });

  it("allows demoting owner when another owner remains", () => {
    expect(() =>
      assertCanChangeUserRole({
        actorRole: USER_ROLES.OWNER,
        currentRole: USER_ROLES.OWNER,
        newRole: USER_ROLES.MANAGER,
        activeOwnerCount: 2,
      }),
    ).not.toThrow();
  });
});
