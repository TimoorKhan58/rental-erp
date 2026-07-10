import type { Prisma } from "@/generated/prisma/client";
import type { ProductListQuery } from "@/modules/product/domain/product-list.query";
import type { ProductRecord } from "@/modules/product/domain/product.repository.interface";
import type { ProductId } from "@/shared/domain/ids";
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

import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type {
  CreateProductData,
  UpdateProductData,
} from "@/modules/product/domain/product.types";
import { PRODUCT_SEARCH_FIELDS } from "@/modules/product/domain/product.constants";

import {
  PRODUCT_DETAIL_INCLUDE,
  toProductCreateInput,
  toProductRecord,
  toProductUpdateInput,
} from "../mappers/product.persistence.mapper";

const MODEL = "Product";

const DEFAULT_ORDER_BY: Prisma.ProductOrderByWithRelationInput = {
  createdAt: "desc",
};

const SORT_FIELD_MAP: Record<string, keyof Prisma.ProductOrderByWithRelationInput> =
  {
    rentalRate: "rentalPricePerDay",
    replacementCost: "purchaseCost",
  };

function mapProductFilter(
  filter: Record<string, unknown>,
): Prisma.ProductWhereInput | undefined {
  const where: Prisma.ProductWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  if (filter.categoryId !== undefined) {
    where.categoryId = String(filter.categoryId);
  }

  if (filter.brandId !== undefined) {
    where.brandId = String(filter.brandId);
  }

  if (filter.tagId !== undefined) {
    where.tagAssignments = {
      some: {
        tagId: String(filter.tagId),
      },
    };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapProductSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.ProductOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  const mapped: Prisma.ProductOrderByWithRelationInput = {};

  for (const [field, direction] of Object.entries(sort)) {
    const prismaField = SORT_FIELD_MAP[field] ?? field;
    (mapped as Record<string, "asc" | "desc">)[prismaField] = direction;
  }

  return mapped;
}

function buildListFilter(query: ProductListQuery): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.categoryId !== undefined) {
    filter.categoryId = query.categoryId;
  }

  if (query.brandId !== undefined) {
    filter.brandId = query.brandId;
  }

  if (query.tagId !== undefined) {
    filter.tagId = query.tagId;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: ProductId): Promise<ProductRecord | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.product.findUnique({
          where: { id },
          include: PRODUCT_DETAIL_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toProductRecord(record) : null));
  }

  findByProductCode(productCode: string): Promise<ProductRecord | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.product.findUnique({
          where: { productCode },
          include: PRODUCT_DETAIL_INCLUDE,
        }),
      { model: MODEL, operation: "findByProductCode" },
    ).then((record) => (record ? toProductRecord(record) : null));
  }

  async findPaged(
    query: ProductListQuery,
  ): Promise<PaginatedResult<ProductRecord>> {
    const filter = buildListFilter(query);

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
          searchFields: PRODUCT_SEARCH_FIELDS,
        }),
        searchFields: PRODUCT_SEARCH_FIELDS,
        mapFilter: mapProductFilter,
        mapSort: mapProductSort,
        handlers: {
          findMany: (db, args) =>
            db.product.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: PRODUCT_DETAIL_INCLUDE,
            }),
          count: (db, args) =>
            db.product.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toProductRecord),
      meta: result.meta,
    };
  }

  async exists(id: ProductId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.product.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateProductData): Promise<ProductRecord> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.product.create({
          data: toProductCreateInput(data),
          include: PRODUCT_DETAIL_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    );

    return toProductRecord(record);
  }

  async update(id: ProductId, data: UpdateProductData): Promise<ProductRecord> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.product.update({
          where: { id },
          data: toProductUpdateInput(data) as Prisma.ProductUpdateInput,
          include: PRODUCT_DETAIL_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    );

    return toProductRecord(record);
  }

  delete(id: ProductId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.product.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
