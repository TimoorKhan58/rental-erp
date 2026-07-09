import type { Prisma } from "@/generated/prisma/client";
import type { WarehouseListQuery } from "@/modules/warehouse/domain/warehouse-list.query";
import type { WarehouseId } from "@/shared/domain/ids";
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

import { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import type {
  CreateWarehouseData,
  UpdateWarehouseData,
} from "@/modules/warehouse/domain/warehouse.types";
import { WAREHOUSE_SEARCH_FIELDS } from "@/modules/warehouse/domain/warehouse.constants";

import {
  toWarehouseDomain,
  toWarehouseUpdateInput,
} from "../mappers/warehouse.persistence.mapper";

const MODEL = "Warehouse";

const DEFAULT_ORDER_BY: Prisma.WarehouseOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapWarehouseFilter(
  filter: Record<string, unknown>,
): Prisma.WarehouseWhereInput | undefined {
  const where: Prisma.WarehouseWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapWarehouseSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.WarehouseOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.WarehouseOrderByWithRelationInput;
}

export class PrismaWarehouseRepository implements IWarehouseRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: WarehouseId): Promise<Warehouse | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.warehouse.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toWarehouseDomain(record) : null));
  }

  findByWarehouseCode(warehouseCode: string): Promise<Warehouse | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.warehouse.findUnique({
          where: { warehouseCode },
        }),
      { model: MODEL, operation: "findByWarehouseCode" },
    ).then((record) => (record ? toWarehouseDomain(record) : null));
  }

  async findPaged(
    query: WarehouseListQuery,
  ): Promise<PaginatedResult<Warehouse>> {
    const filter =
      query.isActive !== undefined ? { isActive: query.isActive } : undefined;

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
          searchFields: WAREHOUSE_SEARCH_FIELDS,
        }),
        searchFields: WAREHOUSE_SEARCH_FIELDS,
        mapFilter: mapWarehouseFilter,
        mapSort: mapWarehouseSort,
        handlers: {
          findMany: (db, args) =>
            db.warehouse.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.warehouse.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toWarehouseDomain),
      meta: result.meta,
    };
  }

  async exists(id: WarehouseId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.warehouse.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateWarehouseData): Promise<Warehouse> {
    const normalized = Warehouse.create(data);

    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.warehouse.create({
          data: {
            warehouseCode: normalized.warehouseCode,
            name: normalized.name,
            description: normalized.description,
            address: normalized.address,
            contactPerson: normalized.contactPerson,
            phone: normalized.phone,
            isActive: normalized.isActive,
          },
        }),
      { model: MODEL, operation: "create" },
    );

    return toWarehouseDomain(record);
  }

  async update(id: WarehouseId, data: UpdateWarehouseData): Promise<Warehouse> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.warehouse.update({
          where: { id },
          data: toWarehouseUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toWarehouseDomain(record);
  }

  delete(id: WarehouseId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.warehouse.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
