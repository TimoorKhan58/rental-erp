import { USER_ROLES, type UserRole } from "@/constants/roles";

import { IdentityUserStateError } from "./identity-user.errors";

/**
 * Owner accounts may only be administered by other owners.
 * Shared by role change, deactivate/activate, and admin password reset.
 */
export function assertCanAdministerOwnerTarget(input: {
  actorRole: UserRole;
  targetRole: UserRole;
  actionDescription: string;
}): void {
  if (
    input.targetRole === USER_ROLES.OWNER &&
    input.actorRole !== USER_ROLES.OWNER
  ) {
    throw new IdentityUserStateError(
      `Only owners can ${input.actionDescription}`,
    );
  }
}

export function assertCanDeactivateUser(input: {
  targetUserId: string;
  actorUserId: string;
  actorRole: UserRole;
  targetRole: UserRole;
  activeOwnerCount: number;
}): void {
  if (input.targetUserId === input.actorUserId) {
    throw new IdentityUserStateError("You cannot deactivate your own account");
  }

  assertCanAdministerOwnerTarget({
    actorRole: input.actorRole,
    targetRole: input.targetRole,
    actionDescription: "deactivate an owner account",
  });

  if (
    input.targetRole === USER_ROLES.OWNER &&
    input.activeOwnerCount <= 1
  ) {
    throw new IdentityUserStateError(
      "Cannot deactivate the last active owner account",
    );
  }
}

/**
 * Role hierarchy: only owners may assign the owner role.
 * Prevents managers (who hold identity:create/update) from self-promoting.
 */
export function assertCanAssignRole(input: {
  actorRole: UserRole;
  targetRole: UserRole;
}): void {
  if (
    input.targetRole === USER_ROLES.OWNER &&
    input.actorRole !== USER_ROLES.OWNER
  ) {
    throw new IdentityUserStateError(
      "Only owners can assign the owner role",
    );
  }
}

/**
 * Guards role changes: hierarchy + last-owner demotion.
 */
export function assertCanChangeUserRole(input: {
  actorRole: UserRole;
  currentRole: UserRole;
  nextRole: UserRole;
  activeOwnerCount: number;
}): void {
  assertCanAssignRole({
    actorRole: input.actorRole,
    targetRole: input.nextRole,
  });

  assertCanAdministerOwnerTarget({
    actorRole: input.actorRole,
    targetRole: input.currentRole,
    actionDescription: "change an owner account role",
  });

  if (
    input.currentRole === USER_ROLES.OWNER &&
    input.nextRole !== USER_ROLES.OWNER &&
    input.activeOwnerCount <= 1
  ) {
    throw new IdentityUserStateError(
      "Cannot demote the last active owner account",
    );
  }
}

/**
 * Admin password reset of another user — owners only for owner targets.
 */
export function assertCanResetUserPassword(input: {
  actorRole: UserRole;
  targetRole: UserRole;
}): void {
  assertCanAdministerOwnerTarget({
    actorRole: input.actorRole,
    targetRole: input.targetRole,
    actionDescription: "reset an owner account password",
  });
}

export function assertUserIsActive(isActive: boolean): void {
  if (!isActive) {
    throw new IdentityUserStateError("User account is inactive");
  }
}
