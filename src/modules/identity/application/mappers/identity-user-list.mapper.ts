import type { ListIdentityUsersInput } from "../schemas/list-identity-users.schema";
import type { IdentityUserListQuery } from "@/modules/identity/domain/identity-user-list.query";
import { IDENTITY_USER_DEFAULT_SORT_FIELD } from "@/modules/identity/domain/identity-user.constants";

export function toIdentityUserListQuery(
  input: ListIdentityUsersInput,
): IdentityUserListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy ?? IDENTITY_USER_DEFAULT_SORT_FIELD,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
    role: input.role,
  };
}
