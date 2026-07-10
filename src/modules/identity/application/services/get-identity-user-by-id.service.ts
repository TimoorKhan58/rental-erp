import type { IIdentityUserRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { IdentityUserDto } from "../dtos/identity-user.dto";
import { toIdentityUserDto } from "../mappers/identity-user.mapper";
import {
  IdentityUserIdParamSchema,
  type IdentityUserIdParamInput,
} from "../schemas/identity-user.schemas";
import type { UserId } from "@/shared/domain/ids";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class GetIdentityUserByIdService {
  constructor(private readonly repository: IIdentityUserRepository) {}

  async execute(params: IdentityUserIdParamInput): Promise<IdentityUserDto> {
    const { id } = parseRequest(IdentityUserIdParamSchema, params);
    const user = await this.repository.findById(id as UserId);

    if (user === null) {
      throw new NotFoundError({
        message: "User not found",
        details: { id },
      });
    }

    return toIdentityUserDto(user);
  }
}
