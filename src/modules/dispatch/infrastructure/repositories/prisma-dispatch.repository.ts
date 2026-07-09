import type { Prisma } from "@/generated/prisma/client";
import type { DispatchListQuery } from "@/modules/dispatch/domain/dispatch-list.query";
import type { DispatchId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type {
  CreateDispatchData,
  UpdateDispatchData,
} from "@/modules/dispatch/domain/dispatch.types";
import { DISPATCH_SEARCH_FIELDS } from "@/modules/dispatch/domain/dispatch.constants";

import {
  DISPATCH_INCLUDE,
  toDispatchCreateInput,
  toDispatchDomain,
  toDispatchStatusUpdateInput,
  toDispatchUpdateInput,
} from "../mappers/dispatch.persistence.mapper";

const MODEL = "Dispatch";

const DEFAULT_ORDER_BY: Prisma.DispatchOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapDispatchFilter(
  filter: Record<string, unknown>,
): Prisma.DispatchWhereInput | undefined {
  const where: Prisma.DispatchWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Dispatch["status"];
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapDispatchSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.DispatchOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.DispatchOrderByWithRelationInput;
}

export class PrismaDispatchRepository implements IDispatchRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: DispatchId): Promise<Dispatch | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.dispatch.findUnique({
          where: { id },
          include: DISPATCH_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toDispatchDomain(record) : null));
  }

  findByDispatchNumber(dispatchNumber: string): Promise<Dispatch | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.dispatch.findUnique({
          where: { dispatchNumber },
          include: DISPATCH_INCLUDE,
        }),
      { model: MODEL, operation: "findByDispatchNumber" },
    ).then((record) => (record ? toDispatchDomain(record) : null));
  }

  findPaged(query: DispatchListQuery): Promise<PaginatedResult<Dispatch>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.rentalOrderId !== undefined) {
      filter.rentalOrderId = query.rentalOrderId;
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
          searchFields: DISPATCH_SEARCH_FIELDS,
        }),
        searchFields: DISPATCH_SEARCH_FIELDS,
        mapFilter: mapDispatchFilter,
        mapSort: mapDispatchSort,
        handlers: {
          findMany: (db, args) =>
            db.dispatch.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: DISPATCH_INCLUDE,
            }),
          count: (db, args) =>
            db.dispatch.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toDispatchDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateDispatchData): Promise<Dispatch> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.dispatch.create({
          data: toDispatchCreateInput(data),
          include: DISPATCH_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then(toDispatchDomain);
  }

  async update(id: DispatchId, data: UpdateDispatchData): Promise<Dispatch> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error("Dispatch not found");
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.dispatch.update({
          where: { id },
          data: toDispatchUpdateInput(data, existing),
          include: DISPATCH_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    ).then(toDispatchDomain);
  }

  updateStatus(
    id: DispatchId,
    status: Dispatch["status"],
    timestamps?: {
      readyAt?: Date | null;
      dispatchedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<Dispatch> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.dispatch.update({
          where: { id },
          data: toDispatchStatusUpdateInput(status, timestamps),
          include: DISPATCH_INCLUDE,
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toDispatchDomain);
  }
}
