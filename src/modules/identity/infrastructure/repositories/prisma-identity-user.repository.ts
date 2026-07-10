import type { Prisma } from "@/generated/prisma/client";
import type { IdentityUserListQuery } from "@/modules/identity/domain/identity-user-list.query";
import type { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import type { Role } from "@/modules/identity/domain/role.entity";
import type {
  IIdentityUserRepository,
  IRoleRepository,
} from "@/modules/identity/domain/identity-user.repository.interface";
import type {
  CreateIdentityUserData,
  LinkAuthUserData,
  UpdateIdentityUserData,
} from "@/modules/identity/domain/identity-user.types";
import { IDENTITY_USER_SEARCH_FIELDS } from "@/modules/identity/domain/identity-user.constants";
import type { UserId } from "@/shared/domain/ids";
import type { RoleId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { UserRole } from "@/constants/roles";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCount,
  repositoryCreate,
  repositoryFindFirst,
  repositoryFindMany,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import {
  toIdentityUserCreateInput,
  toIdentityUserDomain,
  toIdentityUserUpdateInput,
  toRoleDomain,
} from "../mappers/identity-user.persistence.mapper";

const USER_MODEL = "User";
const ROLE_MODEL = "Role";

const DEFAULT_ORDER_BY: Prisma.UserOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapIdentityUserFilter(
  filter: Record<string, unknown>,
): Prisma.UserWhereInput | undefined {
  const where: Prisma.UserWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  if (typeof filter.role === "string") {
    where.role = { name: filter.role };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapIdentityUserSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.UserOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.UserOrderByWithRelationInput;
}

export class PrismaIdentityUserRepository implements IIdentityUserRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: UserId): Promise<IdentityUser | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.user.findUnique({
          where: { id },
          include: { role: true },
        }),
      { model: USER_MODEL, operation: "findById" },
    ).then((record) => (record ? toIdentityUserDomain(record) : null));
  }

  findByEmail(email: string): Promise<IdentityUser | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          include: { role: true },
        }),
      { model: USER_MODEL, operation: "findByEmail" },
    ).then((record) => (record ? toIdentityUserDomain(record) : null));
  }

  findByAuthUserId(authUserId: string): Promise<IdentityUser | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.user.findUnique({
          where: { authUserId },
          include: { role: true },
        }),
      { model: USER_MODEL, operation: "findByAuthUserId" },
    ).then((record) => (record ? toIdentityUserDomain(record) : null));
  }

  async findPaged(
    query: IdentityUserListQuery,
  ): Promise<PaginatedResult<IdentityUser>> {
    const filter: Record<string, unknown> = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.role !== undefined) {
      filter.role = query.role;
    }

    const result = await runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter,
          search: query.search,
          searchFields: IDENTITY_USER_SEARCH_FIELDS,
        }),
        searchFields: IDENTITY_USER_SEARCH_FIELDS,
        mapFilter: mapIdentityUserFilter,
        mapSort: mapIdentityUserSort,
        handlers: {
          findMany: (db, args) =>
            db.user.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: { role: true },
            }),
          count: (db, args) =>
            db.user.count({
              where: args.where,
            }),
        },
        meta: { model: USER_MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toIdentityUserDomain),
      meta: result.meta,
    };
  }

  countActiveByRole(roleName: UserRole): Promise<number> {
    return repositoryCount(
      this.runner,
      (db) =>
        db.user.count({
          where: {
            isActive: true,
            role: { name: roleName },
          },
        }),
      { model: USER_MODEL, operation: "countActiveByRole" },
    );
  }

  create(data: CreateIdentityUserData): Promise<IdentityUser> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.user.create({
          data: toIdentityUserCreateInput(data),
          include: { role: true },
        }),
      { model: USER_MODEL, operation: "create" },
    ).then(toIdentityUserDomain);
  }

  update(id: UserId, data: UpdateIdentityUserData): Promise<IdentityUser> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.user.update({
          where: { id },
          data: toIdentityUserUpdateInput(data),
          include: { role: true },
        }),
      { model: USER_MODEL, operation: "update" },
    ).then(toIdentityUserDomain);
  }

  linkAuthUser(data: LinkAuthUserData): Promise<IdentityUser> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.user.update({
          where: { id: data.userId },
          data: { authUserId: data.authUserId },
          include: { role: true },
        }),
      { model: USER_MODEL, operation: "linkAuthUser" },
    ).then(toIdentityUserDomain);
  }
}

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findAll(): Promise<Role[]> {
    return repositoryFindMany(
      this.runner,
      (db) =>
        db.role.findMany({
          orderBy: { name: "asc" },
        }),
      { model: ROLE_MODEL, operation: "findAll" },
    ).then((records) => records.map(toRoleDomain));
  }

  findById(id: RoleId): Promise<Role | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.role.findUnique({ where: { id } }),
      { model: ROLE_MODEL, operation: "findById" },
    ).then((record) => (record ? toRoleDomain(record) : null));
  }

  findByName(name: UserRole): Promise<Role | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.role.findUnique({ where: { name } }),
      { model: ROLE_MODEL, operation: "findByName" },
    ).then((record) => (record ? toRoleDomain(record) : null));
  }
}
