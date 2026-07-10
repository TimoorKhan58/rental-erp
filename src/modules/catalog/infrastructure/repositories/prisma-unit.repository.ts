import type { Prisma } from "@/generated/prisma/client";
import type { UnitListQuery } from "@/modules/catalog/domain/unit-list.query";
import type { UnitOfMeasureId } from "@/shared/domain/ids";
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

import { Unit } from "@/modules/catalog/domain/unit.entity";
import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import { UNIT_SEARCH_FIELDS } from "@/modules/catalog/domain/unit.constants";
import type {
  CreateUnitData,
  UpdateUnitData,
} from "@/modules/catalog/domain/unit.types";

import {
  toUnitCreateInput,
  toUnitDomain,
  toUnitUpdateInput,
} from "../mappers/unit.persistence.mapper";

const MODEL = "UnitOfMeasure";

const DEFAULT_ORDER_BY: Prisma.UnitOfMeasureOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapUnitFilter(
  filter: Record<string, unknown>,
): Prisma.UnitOfMeasureWhereInput | undefined {
  const where: Prisma.UnitOfMeasureWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapUnitSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.UnitOfMeasureOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.UnitOfMeasureOrderByWithRelationInput;
}

export class PrismaUnitRepository implements IUnitRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: UnitOfMeasureId): Promise<Unit | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.unitOfMeasure.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toUnitDomain(record) : null));
  }

  findByCode(code: string): Promise<Unit | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.unitOfMeasure.findUnique({
          where: { code },
        }),
      { model: MODEL, operation: "findByCode" },
    ).then((record) => (record ? toUnitDomain(record) : null));
  }

  findByName(name: string): Promise<Unit | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.unitOfMeasure.findFirst({
          where: { name },
        }),
      { model: MODEL, operation: "findByName" },
    ).then((record) => (record ? toUnitDomain(record) : null));
  }

  async findPaged(
    query: UnitListQuery,
  ): Promise<PaginatedResult<Unit>> {
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
        searchFields: UNIT_SEARCH_FIELDS,
      }),
      searchFields: UNIT_SEARCH_FIELDS,
      mapFilter: mapUnitFilter,
      mapSort: mapUnitSort,
      handlers: {
        findMany: (db, args) =>
          db.unitOfMeasure.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.unitOfMeasure.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toUnitDomain),
      meta: result.meta,
    };
  }

  async exists(id: UnitOfMeasureId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.unitOfMeasure.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateUnitData): Promise<Unit> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.unitOfMeasure.create({
          data: toUnitCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toUnitDomain(record);
  }

  async update(
    id: UnitOfMeasureId,
    data: UpdateUnitData,
  ): Promise<Unit> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.unitOfMeasure.update({
          where: { id },
          data: toUnitUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toUnitDomain(record);
  }

  delete(id: UnitOfMeasureId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.unitOfMeasure.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
