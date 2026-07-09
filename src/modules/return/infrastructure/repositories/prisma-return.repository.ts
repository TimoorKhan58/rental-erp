import type { Prisma } from "@/generated/prisma/client";
import type { ReturnListQuery } from "@/modules/return/domain/return-list.query";
import type { ReturnInspectionId } from "@/shared/domain/ids";
import type { DispatchId } from "@/shared/domain/ids";
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

import { Return } from "@/modules/return/domain/return.entity";
import type { IReturnRepository } from "@/modules/return/domain/return.repository.interface";
import type {
  CreateReturnData,
  UpdateReturnData,
  UpdateReturnStatusData,
} from "@/modules/return/domain/return.types";
import { RETURN_SEARCH_FIELDS } from "@/modules/return/domain/return.constants";

import {
  RETURN_INCLUDE,
  toReturnCreateInput,
  toReturnDomain,
  toReturnStatusUpdateInput,
  toReturnUpdateInput,
} from "../mappers/return.persistence.mapper";

const MODEL = "ReturnInspection";

const DEFAULT_ORDER_BY: Prisma.ReturnInspectionOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapReturnFilter(
  filter: Record<string, unknown>,
): Prisma.ReturnInspectionWhereInput | undefined {
  const where: Prisma.ReturnInspectionWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Return["status"];
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  if (filter.dispatchId !== undefined) {
    where.dispatchId = String(filter.dispatchId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapReturnSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.ReturnInspectionOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  const mapped: Prisma.ReturnInspectionOrderByWithRelationInput = {};

  if (sort.returnNumber) {
    mapped.returnNumber = sort.returnNumber;
  }

  if (sort.inspectionDate) {
    mapped.inspectionDate = sort.inspectionDate;
  }

  if (sort.status) {
    mapped.status = sort.status;
  }

  if (sort.createdAt) {
    mapped.createdAt = sort.createdAt;
  }

  return Object.keys(mapped).length > 0 ? mapped : DEFAULT_ORDER_BY;
}

export class PrismaReturnRepository implements IReturnRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: ReturnInspectionId): Promise<Return | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.returnInspection.findUnique({
          where: { id },
          include: RETURN_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toReturnDomain(record) : null));
  }

  findByReturnNumber(returnNumber: string): Promise<Return | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.returnInspection.findUnique({
          where: { returnNumber },
          include: RETURN_INCLUDE,
        }),
      { model: MODEL, operation: "findByReturnNumber" },
    ).then((record) => (record ? toReturnDomain(record) : null));
  }

  findByDispatchId(dispatchId: DispatchId): Promise<Return[]> {
    return repositoryFindMany(
      this.runner,
      (db) =>
        db.returnInspection.findMany({
          where: { dispatchId },
          include: RETURN_INCLUDE,
          orderBy: { createdAt: "desc" },
        }),
      { model: MODEL, operation: "findByDispatchId" },
    ).then((records) => records.map(toReturnDomain));
  }

  findPaged(query: ReturnListQuery): Promise<PaginatedResult<Return>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.rentalOrderId !== undefined) {
      filter.rentalOrderId = query.rentalOrderId;
    }

    if (query.dispatchId !== undefined) {
      filter.dispatchId = query.dispatchId;
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
          searchFields: RETURN_SEARCH_FIELDS,
        }),
        searchFields: RETURN_SEARCH_FIELDS,
        mapFilter: mapReturnFilter,
        mapSort: mapReturnSort,
        handlers: {
          findMany: (db, args) =>
            db.returnInspection.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: RETURN_INCLUDE,
            }),
          count: (db, args) =>
            db.returnInspection.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toReturnDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateReturnData): Promise<Return> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.returnInspection.create({
          data: toReturnCreateInput(data),
          include: RETURN_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then(toReturnDomain);
  }

  async update(
    id: ReturnInspectionId,
    data: UpdateReturnData,
  ): Promise<Return> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error("Return not found");
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.returnInspection.update({
          where: { id },
          data: toReturnUpdateInput(data),
          include: RETURN_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    ).then(toReturnDomain);
  }

  updateStatus(
    id: ReturnInspectionId,
    data: UpdateReturnStatusData,
  ): Promise<Return> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.returnInspection.update({
          where: { id },
          data: toReturnStatusUpdateInput(data),
          include: RETURN_INCLUDE,
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toReturnDomain);
  }
}
