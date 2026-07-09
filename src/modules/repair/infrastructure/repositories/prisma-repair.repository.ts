import type { Prisma } from "@/generated/prisma/client";
import type { RepairListQuery } from "@/modules/repair/domain/repair-list.query";
import type { RepairId } from "@/shared/domain/ids";
import type { ReturnInspectionId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryFindMany,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Repair } from "@/modules/repair/domain/repair.entity";
import type { IRepairRepository } from "@/modules/repair/domain/repair.repository.interface";
import type {
  CreateRepairData,
  UpdateRepairData,
  UpdateRepairStatusData,
} from "@/modules/repair/domain/repair.types";
import { REPAIR_SEARCH_FIELDS } from "@/modules/repair/domain/repair.constants";

import {
  toRepairCreateInput,
  toRepairDomain,
  toRepairStatusUpdateInput,
  toRepairUpdateInput,
} from "../mappers/repair.persistence.mapper";

const MODEL = "Repair";

const DEFAULT_ORDER_BY: Prisma.RepairOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapRepairFilter(
  filter: Record<string, unknown>,
): Prisma.RepairWhereInput | undefined {
  const where: Prisma.RepairWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Repair["status"];
  }

  if (filter.returnId !== undefined) {
    where.returnInspectionId = String(filter.returnId);
  }

  if (filter.productId !== undefined) {
    where.productId = String(filter.productId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapRepairSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.RepairOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  const mapped: Prisma.RepairOrderByWithRelationInput = {};

  if (sort.repairNumber) {
    mapped.repairNumber = sort.repairNumber;
  }

  if (sort.repairDate) {
    mapped.repairDate = sort.repairDate;
  }

  if (sort.status) {
    mapped.status = sort.status;
  }

  if (sort.createdAt) {
    mapped.createdAt = sort.createdAt;
  }

  return Object.keys(mapped).length > 0 ? mapped : DEFAULT_ORDER_BY;
}

export class PrismaRepairRepository implements IRepairRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: RepairId): Promise<Repair | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.repair.findUnique({ where: { id } }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toRepairDomain(record) : null));
  }

  findByRepairNumber(repairNumber: string): Promise<Repair | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.repair.findUnique({ where: { repairNumber } }),
      { model: MODEL, operation: "findByRepairNumber" },
    ).then((record) => (record ? toRepairDomain(record) : null));
  }

  findByReturnId(returnId: ReturnInspectionId): Promise<Repair[]> {
    return repositoryFindMany(
      this.runner,
      (db) =>
        db.repair.findMany({
          where: { returnInspectionId: returnId },
          orderBy: { createdAt: "desc" },
        }),
      { model: MODEL, operation: "findByReturnId" },
    ).then((records) => records.map(toRepairDomain));
  }

  findPaged(query: RepairListQuery): Promise<PaginatedResult<Repair>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.returnId !== undefined) {
      filter.returnId = query.returnId;
    }

    if (query.productId !== undefined) {
      filter.productId = query.productId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
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
          searchFields: REPAIR_SEARCH_FIELDS,
        }),
        searchFields: REPAIR_SEARCH_FIELDS,
        mapFilter: mapRepairFilter,
        mapSort: mapRepairSort,
        handlers: {
          findMany: (db, args) =>
            db.repair.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.repair.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toRepairDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateRepairData): Promise<Repair> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.repair.create({
          data: toRepairCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    ).then(toRepairDomain);
  }

  update(id: RepairId, data: UpdateRepairData): Promise<Repair> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.repair.update({
          where: { id },
          data: toRepairUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    ).then(toRepairDomain);
  }

  updateStatus(
    id: RepairId,
    data: UpdateRepairStatusData,
  ): Promise<Repair> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.repair.update({
          where: { id },
          data: toRepairStatusUpdateInput(data),
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toRepairDomain);
  }
}
