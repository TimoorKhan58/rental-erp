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
