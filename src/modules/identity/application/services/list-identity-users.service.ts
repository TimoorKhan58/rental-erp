import type { IIdentityUserRepository } from "@/modules/identity/domain/identity-user.repository.interface";
import type { IdentityUserDto } from "../dtos/identity-user.dto";
import { toIdentityUserListQuery } from "../mappers/identity-user-list.mapper";
import { toIdentityUserDto } from "../mappers/identity-user.mapper";
import type { ListIdentityUsersInput } from "../schemas/list-identity-users.schema";
import type { PaginatedResult } from "@/shared/domain/pagination";

export class ListIdentityUsersService {
  constructor(private readonly repository: IIdentityUserRepository) {}

  async execute(
    input: ListIdentityUsersInput,
  ): Promise<PaginatedResult<IdentityUserDto>> {
    const query = toIdentityUserListQuery(input);
    const result = await this.repository.findPaged(query);

    return {
      items: result.items.map(toIdentityUserDto),
      meta: result.meta,
    };
  }
}
