import type { Prisma } from "@/generated/prisma/client";
import type { ExpenseCategoryListQuery } from "@/modules/expense/domain/expense-category-list.query";
import type { ExpenseCategoryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryDelete,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { ExpenseCategory } from "@/modules/expense/domain/expense-category.entity";
import type { IExpenseCategoryRepository } from "@/modules/expense/domain/expense-category.repository.interface";
import { EXPENSE_CATEGORY_SEARCH_FIELDS } from "@/modules/expense/domain/expense-category.constants";
import type {
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/modules/expense/domain/expense-category.types";

import {
  toExpenseCategoryCreateInput,
  toExpenseCategoryDomain,
  toExpenseCategoryUpdateInput,
} from "../mappers/expense-category.persistence.mapper";

const MODEL = "ExpenseCategory";

const DEFAULT_ORDER_BY: Prisma.ExpenseCategoryOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapExpenseCategoryFilter(
  filter: Record<string, unknown>,
): Prisma.ExpenseCategoryWhereInput | undefined {
  const where: Prisma.ExpenseCategoryWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapExpenseCategorySort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.ExpenseCategoryOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.ExpenseCategoryOrderByWithRelationInput;
}

export class PrismaExpenseCategoryRepository
  implements IExpenseCategoryRepository
{
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: ExpenseCategoryId): Promise<ExpenseCategory | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.expenseCategory.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toExpenseCategoryDomain(record) : null));
  }

  findByName(name: string): Promise<ExpenseCategory | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.expenseCategory.findUnique({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toExpenseCategoryDomain(record) : null));
  }

  async findPaged(
    query: ExpenseCategoryListQuery,
  ): Promise<PaginatedResult<ExpenseCategory>> {
    const filter =
      query.isActive !== undefined ? { isActive: query.isActive } : undefined;

    const result = await runRepositoryPagedQuery(this.runner, {
      spec: createRepositoryQuerySpec({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        filter,
        search: query.search,
        searchFields: EXPENSE_CATEGORY_SEARCH_FIELDS,
      }),
      searchFields: EXPENSE_CATEGORY_SEARCH_FIELDS,
      mapFilter: mapExpenseCategoryFilter,
      mapSort: mapExpenseCategorySort,
      handlers: {
        findMany: (db, args) =>
          db.expenseCategory.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.expenseCategory.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toExpenseCategoryDomain),
      meta: result.meta,
    };
  }

  async exists(id: ExpenseCategoryId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.expenseCategory.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateExpenseCategoryData): Promise<ExpenseCategory> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.expenseCategory.create({
          data: toExpenseCategoryCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toExpenseCategoryDomain(record);
  }

  async update(
    id: ExpenseCategoryId,
    data: UpdateExpenseCategoryData,
  ): Promise<ExpenseCategory> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.expenseCategory.update({
          where: { id },
          data: toExpenseCategoryUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toExpenseCategoryDomain(record);
  }

  delete(id: ExpenseCategoryId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.expenseCategory.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
