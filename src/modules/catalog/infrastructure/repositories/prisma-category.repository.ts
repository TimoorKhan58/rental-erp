import type { Prisma } from "@/generated/prisma/client";
import type { CategoryListQuery } from "@/modules/catalog/domain/category-list.query";
import type { CategoryId } from "@/shared/domain/ids";
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

import { Category } from "@/modules/catalog/domain/category.entity";
import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import { CATEGORY_SEARCH_FIELDS } from "@/modules/catalog/domain/category.constants";
import type {
  CreateCategoryData,
  UpdateCategoryData,
} from "@/modules/catalog/domain/category.types";

import {
  toCategoryCreateInput,
  toCategoryDomain,
  toCategoryUpdateInput,
} from "../mappers/category.persistence.mapper";

const MODEL = "Category";

const DEFAULT_ORDER_BY: Prisma.CategoryOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapCategoryFilter(
  filter: Record<string, unknown>,
): Prisma.CategoryWhereInput | undefined {
  const where: Prisma.CategoryWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapCategorySort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.CategoryOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.CategoryOrderByWithRelationInput;
}

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: CategoryId): Promise<Category | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.category.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toCategoryDomain(record) : null));
  }

  findByName(name: string): Promise<Category | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.category.findUnique({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toCategoryDomain(record) : null));
  }

  async findPaged(
    query: CategoryListQuery,
  ): Promise<PaginatedResult<Category>> {
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
        searchFields: CATEGORY_SEARCH_FIELDS,
      }),
      searchFields: CATEGORY_SEARCH_FIELDS,
      mapFilter: mapCategoryFilter,
      mapSort: mapCategorySort,
      handlers: {
        findMany: (db, args) =>
          db.category.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.category.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toCategoryDomain),
      meta: result.meta,
    };
  }

  async exists(id: CategoryId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.category.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.category.create({
          data: toCategoryCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toCategoryDomain(record);
  }

  async update(
    id: CategoryId,
    data: UpdateCategoryData,
  ): Promise<Category> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.category.update({
          where: { id },
          data: toCategoryUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toCategoryDomain(record);
  }

  delete(id: CategoryId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.category.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
