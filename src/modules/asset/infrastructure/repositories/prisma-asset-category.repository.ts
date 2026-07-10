import type { Prisma } from "@/generated/prisma/client";
import type { AssetCategoryListQuery } from "@/modules/asset/domain";
import type { AssetCategoryId } from "@/shared/domain/ids";
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

import { AssetCategory } from "@/modules/asset/domain";
import type { IAssetCategoryRepository } from "@/modules/asset/domain";
import type {
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "@/modules/asset/domain";
import { ASSET_CATEGORY_SEARCH_FIELDS } from "@/modules/asset/domain";

import {
  toAssetCategoryCreateInput,
  toAssetCategoryDomain,
  toAssetCategoryUpdateInput,
} from "../mappers/asset-category.persistence.mapper";

const MODEL = "AssetCategory";

const DEFAULT_ORDER_BY: Prisma.AssetCategoryOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapAssetCategoryFilter(
  filter: Record<string, unknown>,
): Prisma.AssetCategoryWhereInput | undefined {
  const where: Prisma.AssetCategoryWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapAssetCategorySort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.AssetCategoryOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.AssetCategoryOrderByWithRelationInput;
}

export class PrismaAssetCategoryRepository implements IAssetCategoryRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: AssetCategoryId): Promise<AssetCategory | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.assetCategory.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toAssetCategoryDomain(record) : null));
  }

  findByName(name: string): Promise<AssetCategory | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.assetCategory.findUnique({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toAssetCategoryDomain(record) : null));
  }

  async findPaged(
    query: AssetCategoryListQuery,
  ): Promise<PaginatedResult<AssetCategory>> {
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
        searchFields: ASSET_CATEGORY_SEARCH_FIELDS,
      }),
      searchFields: ASSET_CATEGORY_SEARCH_FIELDS,
      mapFilter: mapAssetCategoryFilter,
      mapSort: mapAssetCategorySort,
      handlers: {
        findMany: (db, args) =>
          db.assetCategory.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.assetCategory.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toAssetCategoryDomain),
      meta: result.meta,
    };
  }

  async exists(id: AssetCategoryId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.assetCategory.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateAssetCategoryData): Promise<AssetCategory> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.assetCategory.create({
          data: toAssetCategoryCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toAssetCategoryDomain(record);
  }

  async update(
    id: AssetCategoryId,
    data: UpdateAssetCategoryData,
  ): Promise<AssetCategory> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.assetCategory.update({
          where: { id },
          data: toAssetCategoryUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toAssetCategoryDomain(record);
  }

  delete(id: AssetCategoryId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.assetCategory.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
