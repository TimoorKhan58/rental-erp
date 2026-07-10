import type { IIdentityUserRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { IdentityUserPermissionsDto } from "../dtos/identity-user.dto";
import {
  IdentityUserIdParamSchema,
  type IdentityUserIdParamInput,
} from "../schemas/identity-user.schemas";
import { parseRequest } from "@/shared/application/validation";
import { ROLE_PERMISSIONS } from "@/shared/application/authorization/role-permissions";
import { NotFoundError } from "@/shared/infrastructure/errors";
import type { UserId } from "@/shared/domain/ids";

export class GetIdentityUserPermissionsService {
  constructor(private readonly repository: IIdentityUserRepository) {}

  async execute(
    params: IdentityUserIdParamInput,
  ): Promise<IdentityUserPermissionsDto> {
    const { id } = parseRequest(IdentityUserIdParamSchema, params);
    const user = await this.repository.findById(id as UserId);

    if (user === null) {
      throw new NotFoundError({
        message: "User not found",
        details: { id },
      });
    }

    return {
      userId: user.id,
      role: user.roleName,
      permissions: [...ROLE_PERMISSIONS[user.roleName]],
    };
  }
}
