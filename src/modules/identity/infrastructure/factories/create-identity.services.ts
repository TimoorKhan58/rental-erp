import { CreateIdentityUserService } from "@/modules/identity/application/services/create-identity-user.service";
import { DeactivateIdentityUserService } from "@/modules/identity/application/services/deactivate-identity-user.service";
import { GetIdentityUserByIdService } from "@/modules/identity/application/services/get-identity-user-by-id.service";
import { GetIdentityUserPermissionsService } from "@/modules/identity/application/services/get-identity-user-permissions.service";
import { GetIdentityUserProfileService } from "@/modules/identity/application/services/get-identity-user-profile.service";
import { ListIdentityUsersService } from "@/modules/identity/application/services/list-identity-users.service";
import { ListRolesService } from "@/modules/identity/application/services/list-roles.service";
import { ResetIdentityUserPasswordService } from "@/modules/identity/application/services/reset-identity-user-password.service";
import { UpdateIdentityUserService } from "@/modules/identity/application/services/update-identity-user.service";
import type { IdentityApplicationServices } from "@/modules/identity/application/services/identity-application-services.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import {
  createIdentityUserRepositoryFromSharedDeps,
  createRoleRepositoryFromSharedDeps,
} from "./create-identity-user.repository";
import { createIdentityTransactionRunner } from "./create-identity-transaction.runner";

export function createIdentityApplicationServices(
  deps: SharedDeps,
  actorUserId?: string,
): IdentityApplicationServices {
  const userRepository = createIdentityUserRepositoryFromSharedDeps(deps);
  const roleRepository = createRoleRepositoryFromSharedDeps(deps);
  const transactionRunner = createIdentityTransactionRunner(deps, actorUserId);

  return {
    createIdentityUser: new CreateIdentityUserService(transactionRunner),
    updateIdentityUser: new UpdateIdentityUserService(transactionRunner),
    deactivateIdentityUser: new DeactivateIdentityUserService(transactionRunner),
    resetIdentityUserPassword: new ResetIdentityUserPasswordService(
      transactionRunner,
    ),
    getIdentityUserById: new GetIdentityUserByIdService(userRepository),
    listIdentityUsers: new ListIdentityUsersService(userRepository),
    listRoles: new ListRolesService(roleRepository),
    getIdentityUserPermissions: new GetIdentityUserPermissionsService(
      userRepository,
    ),
    getIdentityUserProfile: new GetIdentityUserProfileService(userRepository),
  };
}
