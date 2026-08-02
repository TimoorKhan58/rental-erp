import { USER_ROLES, type UserRole } from "@/constants/roles";

import { IdentityUserStateError } from "./identity-user.errors";

export function assertCanDeactivateUser(input: {
  targetUserId: string;
  actorUserId: string;
  targetRole: UserRole;
  activeOwnerCount: number;
}): void {
  if (input.targetUserId === input.actorUserId) {
    throw new IdentityUserStateError("You cannot deactivate your own account");
  }

  if (
    input.targetRole === USER_ROLES.OWNER &&
    input.activeOwnerCount <= 1
  ) {
    throw new IdentityUserStateError(
      "Cannot deactivate the last active owner account",
    );
  }
}

export function assertUserIsActive(isActive: boolean): void {
  if (!isActive) {
    throw new IdentityUserStateError("User account is inactive");
  }
}

/**
 * Only Owners may assign the Owner role.
 * Bootstrap callers (no actorRole) are allowed so create-admin can seed the first Owner.
 */
export function assertCanAssignRole(input: {
  actorRole: UserRole | undefined;
  targetRole: UserRole;
}): void {
  if (input.targetRole !== USER_ROLES.OWNER) {
    return;
  }

  if (input.actorRole === undefined) {
    return;
  }

  if (input.actorRole !== USER_ROLES.OWNER) {
    throw new IdentityUserStateError("Only owners can assign the owner role");
  }
}

/**
 * Role changes must respect Owner assignment hierarchy and last-Owner protection.
 * Reuses the same last-Owner count semantics as assertCanDeactivateUser.
 */
export function assertCanChangeUserRole(input: {
  actorRole: UserRole | undefined;
  currentRole: UserRole;
  newRole: UserRole;
  activeOwnerCount: number;
}): void {
  assertCanAssignRole({
    actorRole: input.actorRole,
    targetRole: input.newRole,
  });

  if (
    input.currentRole === USER_ROLES.OWNER &&
    input.newRole !== USER_ROLES.OWNER &&
    input.activeOwnerCount <= 1
  ) {
    throw new IdentityUserStateError(
      "Cannot demote the last active owner account",
    );
  }
}
