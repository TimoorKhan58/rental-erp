import type { Prisma } from "@/generated/prisma/client";
import type { TagListQuery } from "@/modules/catalog/domain/tag-list.query";
import type { ProductTagId } from "@/shared/domain/ids";
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

import { Tag } from "@/modules/catalog/domain/tag.entity";
import type { ITagRepository } from "@/modules/catalog/domain/tag.repository.interface";
import { TAG_SEARCH_FIELDS } from "@/modules/catalog/domain/tag.constants";
import type {
  CreateTagData,
  UpdateTagData,
} from "@/modules/catalog/domain/tag.types";

import {
  toTagCreateInput,
  toTagDomain,
  toTagUpdateInput,
} from "../mappers/tag.persistence.mapper";

const MODEL = "ProductTag";

const DEFAULT_ORDER_BY: Prisma.ProductTagOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapTagFilter(
  filter: Record<string, unknown>,
): Prisma.ProductTagWhereInput | undefined {
  const where: Prisma.ProductTagWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapTagSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.ProductTagOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.ProductTagOrderByWithRelationInput;
}

export class PrismaTagRepository implements ITagRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: ProductTagId): Promise<Tag | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.productTag.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toTagDomain(record) : null));
  }

  findByName(name: string): Promise<Tag | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.productTag.findUnique({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toTagDomain(record) : null));
  }

  async findPaged(
    query: TagListQuery,
  ): Promise<PaginatedResult<Tag>> {
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
        searchFields: TAG_SEARCH_FIELDS,
      }),
      searchFields: TAG_SEARCH_FIELDS,
      mapFilter: mapTagFilter,
      mapSort: mapTagSort,
      handlers: {
        findMany: (db, args) =>
          db.productTag.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.productTag.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toTagDomain),
      meta: result.meta,
    };
  }

  async exists(id: ProductTagId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.productTag.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateTagData): Promise<Tag> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.productTag.create({
          data: toTagCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toTagDomain(record);
  }

  async update(
    id: ProductTagId,
    data: UpdateTagData,
  ): Promise<Tag> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.productTag.update({
          where: { id },
          data: toTagUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toTagDomain(record);
  }

  delete(id: ProductTagId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.productTag.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
