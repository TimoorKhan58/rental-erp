import type { AccountListQuery } from "@/modules/accounting/domain/account-list.query";
import type { AccountId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Account } from "@/modules/accounting/domain/account.entity";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type {
  CreateAccountData,
  UpdateAccountData,
} from "@/modules/accounting/domain/account.types";
import { ACCOUNT_SEARCH_FIELDS } from "@/modules/accounting/domain/account.constants";

import {
  toAccountCreateInput,
  toAccountDomain,
  toAccountUpdateInput,
} from "../mappers/account.persistence.mapper";

const MODEL = "Account";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapAccountFilter(
  filter: Record<string, unknown>,
): import("@/generated/prisma/client").Prisma.AccountWhereInput | undefined {
  const where: import("@/generated/prisma/client").Prisma.AccountWhereInput = {};

  if (filter.accountType !== undefined) {
    where.accountType = filter.accountType as Account["accountType"];
  }

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapAccountSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.AccountOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.AccountOrderByWithRelationInput;
}

export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: AccountId): Promise<Account | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.account.findUnique({ where: { id } }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toAccountDomain(record) : null));
  }

  findByAccountCode(accountCode: string): Promise<Account | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.account.findUnique({ where: { accountCode } }),
      { model: MODEL, operation: "findByAccountCode" },
    ).then((record) => (record ? toAccountDomain(record) : null));
  }

  findPaged(query: AccountListQuery): Promise<PaginatedResult<Account>> {
    const filter: Record<string, unknown> = {};

    if (query.accountType !== undefined) {
      filter.accountType = query.accountType;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    return runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          search: query.search,
          searchFields: ACCOUNT_SEARCH_FIELDS,
        }),
        searchFields: ACCOUNT_SEARCH_FIELDS,
        mapFilter: mapAccountFilter,
        mapSort: mapAccountSort,
        handlers: {
          findMany: (db, args) =>
            db.account.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.account.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toAccountDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateAccountData): Promise<Account> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.account.create({
          data: toAccountCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    ).then(toAccountDomain);
  }

  async update(id: AccountId, data: UpdateAccountData): Promise<Account> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error(`Account not found: ${id}`);
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.account.update({
          where: { id },
          data: toAccountUpdateInput(data, existing),
        }),
      { model: MODEL, operation: "update" },
    ).then(toAccountDomain);
  }
}
