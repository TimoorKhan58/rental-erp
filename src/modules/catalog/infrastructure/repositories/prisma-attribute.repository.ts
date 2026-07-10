import type { Prisma } from "@/generated/prisma/client";
import type { AttributeListQuery } from "@/modules/catalog/domain/attribute-list.query";
import type { ProductAttributeId } from "@/shared/domain/ids";
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

import { Attribute } from "@/modules/catalog/domain/attribute.entity";
import type { IAttributeRepository } from "@/modules/catalog/domain/attribute.repository.interface";
import { ATTRIBUTE_SEARCH_FIELDS } from "@/modules/catalog/domain/attribute.constants";
import type { AttributeDataType } from "@/modules/catalog/domain/attribute.constants";
import type {
  CreateAttributeData,
  UpdateAttributeData,
} from "@/modules/catalog/domain/attribute.types";

import {
  toAttributeCreateInput,
  toAttributeDomain,
  toAttributeUpdateInput,
} from "../mappers/attribute.persistence.mapper";

const MODEL = "ProductAttribute";

const DEFAULT_ORDER_BY: Prisma.ProductAttributeOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapAttributeFilter(
  filter: Record<string, unknown>,
): Prisma.ProductAttributeWhereInput | undefined {
  const where: Prisma.ProductAttributeWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  if (filter.dataType !== undefined) {
    where.dataType = filter.dataType as AttributeDataType;
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapAttributeSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.ProductAttributeOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.ProductAttributeOrderByWithRelationInput;
}

export class PrismaAttributeRepository implements IAttributeRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: ProductAttributeId): Promise<Attribute | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.productAttribute.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toAttributeDomain(record) : null));
  }

  findByName(name: string): Promise<Attribute | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.productAttribute.findUnique({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toAttributeDomain(record) : null));
  }

  async findPaged(
    query: AttributeListQuery,
  ): Promise<PaginatedResult<Attribute>> {
    const filter: Record<string, unknown> = {};
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.dataType !== undefined) filter.dataType = query.dataType;

    const result = await runRepositoryPagedQuery(this.runner, {
      spec: createRepositoryQuerySpec({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        filter,
        search: query.search,
        searchFields: ATTRIBUTE_SEARCH_FIELDS,
      }),
      searchFields: ATTRIBUTE_SEARCH_FIELDS,
      mapFilter: mapAttributeFilter,
      mapSort: mapAttributeSort,
      handlers: {
        findMany: (db, args) =>
          db.productAttribute.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.productAttribute.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toAttributeDomain),
      meta: result.meta,
    };
  }

  async exists(id: ProductAttributeId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.productAttribute.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateAttributeData): Promise<Attribute> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.productAttribute.create({
          data: toAttributeCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toAttributeDomain(record);
  }

  async update(
    id: ProductAttributeId,
    data: UpdateAttributeData,
  ): Promise<Attribute> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.productAttribute.update({
          where: { id },
          data: toAttributeUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toAttributeDomain(record);
  }

  delete(id: ProductAttributeId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.productAttribute.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
