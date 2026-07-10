import type { Prisma } from "@/generated/prisma/client";
import type { BrandListQuery } from "@/modules/catalog/domain/brand-list.query";
import type { BrandId } from "@/shared/domain/ids";
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

import { Brand } from "@/modules/catalog/domain/brand.entity";
import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import { BRAND_SEARCH_FIELDS } from "@/modules/catalog/domain/brand.constants";
import type {
  CreateBrandData,
  UpdateBrandData,
} from "@/modules/catalog/domain/brand.types";

import {
  toBrandCreateInput,
  toBrandDomain,
  toBrandUpdateInput,
} from "../mappers/brand.persistence.mapper";

const MODEL = "Brand";

const DEFAULT_ORDER_BY: Prisma.BrandOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapBrandFilter(
  filter: Record<string, unknown>,
): Prisma.BrandWhereInput | undefined {
  const where: Prisma.BrandWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapBrandSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.BrandOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.BrandOrderByWithRelationInput;
}

export class PrismaBrandRepository implements IBrandRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: BrandId): Promise<Brand | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.brand.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toBrandDomain(record) : null));
  }

  findByName(name: string): Promise<Brand | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.brand.findUnique({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toBrandDomain(record) : null));
  }

  async findPaged(
    query: BrandListQuery,
  ): Promise<PaginatedResult<Brand>> {
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
        searchFields: BRAND_SEARCH_FIELDS,
      }),
      searchFields: BRAND_SEARCH_FIELDS,
      mapFilter: mapBrandFilter,
      mapSort: mapBrandSort,
      handlers: {
        findMany: (db, args) =>
          db.brand.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.brand.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toBrandDomain),
      meta: result.meta,
    };
  }

  async exists(id: BrandId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.brand.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateBrandData): Promise<Brand> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.brand.create({
          data: toBrandCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toBrandDomain(record);
  }

  async update(
    id: BrandId,
    data: UpdateBrandData,
  ): Promise<Brand> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.brand.update({
          where: { id },
          data: toBrandUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toBrandDomain(record);
  }

  delete(id: BrandId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.brand.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
