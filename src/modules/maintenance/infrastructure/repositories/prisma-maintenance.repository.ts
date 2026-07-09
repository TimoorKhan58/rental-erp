import type { Prisma } from "@/generated/prisma/client";
import type { MaintenanceListQuery } from "@/modules/maintenance/domain/maintenance-list.query";
import type { MaintenanceId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain/maintenance.repository.interface";
import type {
  CreateMaintenanceData,
  UpdateMaintenanceData,
  UpdateMaintenanceStatusData,
} from "@/modules/maintenance/domain/maintenance.types";
import { MAINTENANCE_SEARCH_FIELDS } from "@/modules/maintenance/domain/maintenance.constants";

import {
  toMaintenanceCreateInput,
  toMaintenanceDomain,
  toMaintenanceStatusUpdateInput,
  toMaintenanceUpdateInput,
} from "../mappers/maintenance.persistence.mapper";

const MODEL = "Maintenance";

const DEFAULT_ORDER_BY: Prisma.MaintenanceOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapMaintenanceFilter(
  filter: Record<string, unknown>,
): Prisma.MaintenanceWhereInput | undefined {
  const where: Prisma.MaintenanceWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Maintenance["status"];
  }

  if (filter.productId !== undefined) {
    where.productId = String(filter.productId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.inventoryId !== undefined) {
    where.inventoryId = String(filter.inventoryId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapMaintenanceSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.MaintenanceOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  const mapped: Prisma.MaintenanceOrderByWithRelationInput = {};

  if (sort.maintenanceNumber) {
    mapped.maintenanceNumber = sort.maintenanceNumber;
  }

  if (sort.scheduledDate) {
    mapped.scheduledDate = sort.scheduledDate;
  }

  if (sort.status) {
    mapped.status = sort.status;
  }

  if (sort.createdAt) {
    mapped.createdAt = sort.createdAt;
  }

  return Object.keys(mapped).length > 0 ? mapped : DEFAULT_ORDER_BY;
}

export class PrismaMaintenanceRepository implements IMaintenanceRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: MaintenanceId): Promise<Maintenance | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.maintenance.findUnique({ where: { id } }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toMaintenanceDomain(record) : null));
  }

  findByMaintenanceNumber(
    maintenanceNumber: string,
  ): Promise<Maintenance | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.maintenance.findUnique({ where: { maintenanceNumber } }),
      { model: MODEL, operation: "findByMaintenanceNumber" },
    ).then((record) => (record ? toMaintenanceDomain(record) : null));
  }

  findPaged(query: MaintenanceListQuery): Promise<PaginatedResult<Maintenance>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.productId !== undefined) {
      filter.productId = query.productId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
    }

    if (query.inventoryId !== undefined) {
      filter.inventoryId = query.inventoryId;
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
          searchFields: MAINTENANCE_SEARCH_FIELDS,
        }),
        searchFields: MAINTENANCE_SEARCH_FIELDS,
        mapFilter: mapMaintenanceFilter,
        mapSort: mapMaintenanceSort,
        handlers: {
          findMany: (db, args) =>
            db.maintenance.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.maintenance.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toMaintenanceDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateMaintenanceData): Promise<Maintenance> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.maintenance.create({
          data: toMaintenanceCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    ).then(toMaintenanceDomain);
  }

  update(id: MaintenanceId, data: UpdateMaintenanceData): Promise<Maintenance> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.maintenance.update({
          where: { id },
          data: toMaintenanceUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    ).then(toMaintenanceDomain);
  }

  updateStatus(
    id: MaintenanceId,
    data: UpdateMaintenanceStatusData,
  ): Promise<Maintenance> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.maintenance.update({
          where: { id },
          data: toMaintenanceStatusUpdateInput(data),
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toMaintenanceDomain);
  }
}
