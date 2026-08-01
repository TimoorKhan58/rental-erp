import { describe, expect, it } from "vitest";

import { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import { IdentityUserInvariantError } from "@/modules/identity/domain/identity-user.errors";
import {
  assertCanAdministerOwnerTarget,
  assertCanAssignRole,
  assertCanChangeUserRole,
  assertCanDeactivateUser,
  assertCanResetUserPassword,
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
        actorRole: USER_ROLES.OWNER,
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
        actorRole: USER_ROLES.OWNER,
        targetRole: USER_ROLES.OWNER,
        activeOwnerCount: 1,
      }),
    ).toThrow();
  });

  it("blocks managers from deactivating owners", () => {
    expect(() =>
      assertCanDeactivateUser({
        targetUserId: USER_ID,
        actorUserId: "manager-user",
        actorRole: USER_ROLES.MANAGER,
        targetRole: USER_ROLES.OWNER,
        activeOwnerCount: 2,
      }),
    ).toThrow(/only owners can deactivate/i);
  });

  it("allows owners to deactivate managers", () => {
    expect(() =>
      assertCanDeactivateUser({
        targetUserId: USER_ID,
        actorUserId: "owner-actor",
        actorRole: USER_ROLES.OWNER,
        targetRole: USER_ROLES.MANAGER,
        activeOwnerCount: 1,
      }),
    ).not.toThrow();
  });

  it("blocks managers from resetting owner passwords", () => {
    expect(() =>
      assertCanResetUserPassword({
        actorRole: USER_ROLES.MANAGER,
        targetRole: USER_ROLES.OWNER,
      }),
    ).toThrow(/only owners can reset/i);
  });

  it("allows owners to reset manager passwords", () => {
    expect(() =>
      assertCanResetUserPassword({
        actorRole: USER_ROLES.OWNER,
        targetRole: USER_ROLES.MANAGER,
      }),
    ).not.toThrow();
  });

  it("allows managers to reset non-owner passwords", () => {
    expect(() =>
      assertCanResetUserPassword({
        actorRole: USER_ROLES.MANAGER,
        targetRole: USER_ROLES.WORKER,
      }),
    ).not.toThrow();
  });

  it("blocks non-owners from administering owner targets", () => {
    expect(() =>
      assertCanAdministerOwnerTarget({
        actorRole: USER_ROLES.MANAGER,
        targetRole: USER_ROLES.OWNER,
        actionDescription: "activate an owner account",
      }),
    ).toThrow(/only owners can activate/i);
  });

  it("blocks non-owners from assigning the owner role", () => {
    expect(() =>
      assertCanAssignRole({
        actorRole: USER_ROLES.MANAGER,
        targetRole: USER_ROLES.OWNER,
      }),
    ).toThrow(/only owners can assign/i);
  });

  it("allows owners to assign the owner role", () => {
    expect(() =>
      assertCanAssignRole({
        actorRole: USER_ROLES.OWNER,
        targetRole: USER_ROLES.OWNER,
      }),
    ).not.toThrow();
  });

  it("blocks demoting the last active owner", () => {
    expect(() =>
      assertCanChangeUserRole({
        actorRole: USER_ROLES.OWNER,
        currentRole: USER_ROLES.OWNER,
        nextRole: USER_ROLES.MANAGER,
        activeOwnerCount: 1,
      }),
    ).toThrow(/last active owner/i);
  });

  it("blocks managers from changing an owner role", () => {
    expect(() =>
      assertCanChangeUserRole({
        actorRole: USER_ROLES.MANAGER,
        currentRole: USER_ROLES.OWNER,
        nextRole: USER_ROLES.MANAGER,
        activeOwnerCount: 2,
      }),
    ).toThrow(/only owners can change/i);
  });

  it("requires active users for protected operations", () => {
    expect(() => assertUserIsActive(false)).toThrow();
  });
});
