import type { ExecutionContext } from "@/shared/application/context";
import type { CreateIdentityUserService } from "./create-identity-user.service";
import type { DeactivateIdentityUserService } from "./deactivate-identity-user.service";
import type { GetIdentityUserByIdService } from "./get-identity-user-by-id.service";
import type { GetIdentityUserPermissionsService } from "./get-identity-user-permissions.service";
import type { GetIdentityUserProfileService } from "./get-identity-user-profile.service";
import type { ListIdentityUsersService } from "./list-identity-users.service";
import type { ListRolesService } from "./list-roles.service";
import type { ResetIdentityUserPasswordService } from "./reset-identity-user-password.service";
import type { UpdateIdentityUserService } from "./update-identity-user.service";

export interface IdentityApplicationServices {
  createIdentityUser: CreateIdentityUserService;
  updateIdentityUser: UpdateIdentityUserService;
  deactivateIdentityUser: DeactivateIdentityUserService;
  resetIdentityUserPassword: ResetIdentityUserPasswordService;
  getIdentityUserById: GetIdentityUserByIdService;
  listIdentityUsers: ListIdentityUsersService;
  listRoles: ListRolesService;
  getIdentityUserPermissions: GetIdentityUserPermissionsService;
  getIdentityUserProfile: GetIdentityUserProfileService;
}

export type IdentityServiceResolver = (
  ctx: ExecutionContext,
) => IdentityApplicationServices;
