import type { IIdentityUserRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { IdentityUserProfileDto } from "../dtos/identity-user.dto";
import { toIdentityUserProfileDto } from "../mappers/identity-user.mapper";
import type { UserId } from "@/shared/domain/ids";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class GetIdentityUserProfileService {
  constructor(private readonly repository: IIdentityUserRepository) {}

  async execute(userId: string): Promise<IdentityUserProfileDto> {
    const user = await this.repository.findById(userId as UserId);

    if (user === null) {
      throw new NotFoundError({
        message: "User not found",
        details: { id: userId },
      });
    }

    return toIdentityUserProfileDto(user);
  }
}
