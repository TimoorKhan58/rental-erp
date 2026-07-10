import type {
  IIdentityUserRepository,
  IRoleRepository,
} from "@/modules/identity/domain/identity-user.repository.interface";
import type { IdentityUserListQuery } from "@/modules/identity/domain/identity-user-list.query";
import { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import { Role } from "@/modules/identity/domain/role.entity";
import type {
  CreateIdentityUserData,
  LinkAuthUserData,
  UpdateIdentityUserData,
} from "@/modules/identity/domain/identity-user.types";
import type { UserId } from "@/shared/domain/ids";
import type { RoleId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { UserRole } from "@/constants/roles";
import { USER_ROLES } from "@/constants/roles";

import {
  MANAGER_ROLE_ID,
  OWNER_ROLE_ID,
  VIEWER_ROLE_ID,
  buildIdentityUserEntity,
} from "./identity-user.fixtures";

export class InMemoryIdentityUserRepository implements IIdentityUserRepository {
  private users: IdentityUser[] = [];

  seed(users: IdentityUser[]): void {
    this.users = users.map((user) =>
      IdentityUser.reconstitute(user.toProps()),
    );
  }

  snapshot(): IdentityUser[] {
    return this.users.map((user) => IdentityUser.reconstitute(user.toProps()));
  }

  restore(users: IdentityUser[]): void {
    this.seed(users);
  }

  count(): number {
    return this.users.length;
  }

  findById(id: UserId): Promise<IdentityUser | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  findByEmail(email: string): Promise<IdentityUser | null> {
    const normalized = email.trim().toLowerCase();
    return Promise.resolve(
      this.users.find((user) => user.email === normalized) ?? null,
    );
  }

  findByAuthUserId(authUserId: string): Promise<IdentityUser | null> {
    return Promise.resolve(
      this.users.find((user) => user.authUserId === authUserId) ?? null,
    );
  }

  async findPaged(
    query: IdentityUserListQuery,
  ): Promise<PaginatedResult<IdentityUser>> {
    let items = [...this.users];

    if (query.isActive !== undefined) {
      items = items.filter((user) => user.isActive === query.isActive);
    }

    if (query.role !== undefined) {
      items = items.filter((user) => user.roleName === query.role);
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      const term = query.search.trim().toLowerCase();
      items = items.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term),
      );
    }

    const sortBy = query.sortBy ?? "createdAt";
    const direction = query.sortOrder === "asc" ? 1 : -1;

    items.sort((left, right) => {
      const leftValue = String(left[sortBy as keyof IdentityUser] ?? "");
      const rightValue = String(right[sortBy as keyof IdentityUser] ?? "");
      return leftValue.localeCompare(rightValue) * direction;
    });

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const pagedItems = items.slice(start, start + query.pageSize);

    return {
      items: pagedItems,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  countActiveByRole(roleName: UserRole): Promise<number> {
    return Promise.resolve(
      this.users.filter((user) => user.isActive && user.roleName === roleName)
        .length,
    );
  }

  async create(data: CreateIdentityUserData): Promise<IdentityUser> {
    const now = new Date();
    const user = IdentityUser.reconstitute({
      id: crypto.randomUUID() as UserId,
      name: data.name,
      email: data.email,
      roleId: data.roleId,
      roleName: data.roleName,
      authUserId: null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    this.users.push(user);
    return user;
  }

  async update(id: UserId, data: UpdateIdentityUserData): Promise<IdentityUser> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index < 0) {
      throw new Error(`User not found: ${id}`);
    }

    const current = this.users[index];
    const updated = IdentityUser.reconstitute(
      current.applyUpdate(data),
    );
    this.users[index] = updated;
    return updated;
  }

  async linkAuthUser(data: LinkAuthUserData): Promise<IdentityUser> {
    return this.update(data.userId, { authUserId: data.authUserId });
  }
}

export class InMemoryRoleRepository implements IRoleRepository {
  private readonly roles: Role[] = [
    Role.reconstitute({ id: OWNER_ROLE_ID, name: USER_ROLES.OWNER }),
    Role.reconstitute({ id: MANAGER_ROLE_ID, name: USER_ROLES.MANAGER }),
    Role.reconstitute({ id: VIEWER_ROLE_ID, name: USER_ROLES.VIEWER }),
  ];

  findAll(): Promise<Role[]> {
    return Promise.resolve([...this.roles]);
  }

  findById(id: RoleId): Promise<Role | null> {
    return Promise.resolve(this.roles.find((role) => role.id === id) ?? null);
  }

  findByName(name: UserRole): Promise<Role | null> {
    return Promise.resolve(
      this.roles.find((role) => role.name === name) ?? null,
    );
  }
}

export function seedDefaultIdentityUsers(
  repository: InMemoryIdentityUserRepository,
): void {
  repository.seed([buildIdentityUserEntity()]);
}
