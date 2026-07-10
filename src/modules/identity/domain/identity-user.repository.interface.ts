import type { IdentityUserListQuery } from "./identity-user-list.query";
import type { IdentityUser } from "./identity-user.entity";
import type { Role } from "./role.entity";
import type {
  CreateIdentityUserData,
  LinkAuthUserData,
  UpdateIdentityUserData,
} from "./identity-user.types";
import type { RoleId, UserId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { UserRole } from "@/constants/roles";

export interface IIdentityUserRepository {
  findById(id: UserId): Promise<IdentityUser | null>;
  findByEmail(email: string): Promise<IdentityUser | null>;
  findByAuthUserId(authUserId: string): Promise<IdentityUser | null>;
  findPaged(query: IdentityUserListQuery): Promise<PaginatedResult<IdentityUser>>;
  countActiveByRole(roleName: UserRole): Promise<number>;
  create(data: CreateIdentityUserData): Promise<IdentityUser>;
  update(id: UserId, data: UpdateIdentityUserData): Promise<IdentityUser>;
  linkAuthUser(data: LinkAuthUserData): Promise<IdentityUser>;
}

export interface IRoleRepository {
  findAll(): Promise<Role[]>;
  findById(id: RoleId): Promise<Role | null>;
  findByName(name: UserRole): Promise<Role | null>;
}
