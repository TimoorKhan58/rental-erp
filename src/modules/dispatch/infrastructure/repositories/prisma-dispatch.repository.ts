import type { Prisma } from "@/generated/prisma/client";
import type { DispatchListQuery } from "@/modules/dispatch/domain/dispatch-list.query";
import type {
  DispatchClaimedSourceQuantities,
  SumClaimedSourceQuantitiesOptions,
} from "@/modules/dispatch/domain/dispatch.repository.interface";
import type { DispatchId, RentalOrderId } from "@/shared/domain/ids";
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
import { toClaimedSourceQuantityMaps } from "@/modules/dispatch/domain/dispatch.rules";
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

  sumClaimedSourceQuantitiesByRentalOrderId(
    rentalOrderId: RentalOrderId,
    options?: SumClaimedSourceQuantitiesOptions,
  ): Promise<DispatchClaimedSourceQuantities> {
    return this.runner.run(
      async (db) => {
        const excludeDispatchId = options?.excludeDispatchId;

        const rows =
          excludeDispatchId === undefined
            ? await db.$queryRaw<
                Array<{
                  rentalOrderItemId: string | null;
                  productId: string;
                  ownedClaimed: number;
                  externalClaimed: number;
                }>
              >`
                SELECT
                  di."rentalOrderItemId" AS "rentalOrderItemId",
                  di."productId" AS "productId",
                  SUM(COALESCE(di."ownedQuantity", di."quantity"))::int AS "ownedClaimed",
                  SUM(COALESCE(di."externalQuantity", 0))::int AS "externalClaimed"
                FROM "dispatch_items" di
                INNER JOIN "dispatches" d ON d."id" = di."dispatchId"
                WHERE d."rentalOrderId" = ${rentalOrderId}
                  AND d."status" <> 'CANCELLED'
                GROUP BY di."rentalOrderItemId", di."productId"
              `
            : await db.$queryRaw<
                Array<{
                  rentalOrderItemId: string | null;
                  productId: string;
                  ownedClaimed: number;
                  externalClaimed: number;
                }>
              >`
                SELECT
                  di."rentalOrderItemId" AS "rentalOrderItemId",
                  di."productId" AS "productId",
                  SUM(COALESCE(di."ownedQuantity", di."quantity"))::int AS "ownedClaimed",
                  SUM(COALESCE(di."externalQuantity", 0))::int AS "externalClaimed"
                FROM "dispatch_items" di
                INNER JOIN "dispatches" d ON d."id" = di."dispatchId"
                WHERE d."rentalOrderId" = ${rentalOrderId}
                  AND d."status" <> 'CANCELLED'
                  AND d."id" <> ${excludeDispatchId}
                GROUP BY di."rentalOrderItemId", di."productId"
              `;

        return toClaimedSourceQuantityMaps(rows);
      },
      { model: MODEL, operation: "sumClaimedSourceQuantitiesByRentalOrderId" },
    );
  }

  existsNonCancelledDispatchByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<boolean> {
    return this.runner.run(
      async (db) => {
        const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS(
            SELECT 1
            FROM "dispatches" d
            WHERE d."rentalOrderId" = ${rentalOrderId}
              AND d."status" <> 'CANCELLED'
          ) AS "exists"
        `;

        return rows[0]?.exists === true;
      },
      { model: MODEL, operation: "existsNonCancelledDispatchByRentalOrderId" },
    );
  }

  findCompletedDispatchesByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<Dispatch[]> {
    return this.runner.run(
      async (db) => {
        const records = await db.dispatch.findMany({
          where: {
            rentalOrderId,
            status: "COMPLETED",
          },
          include: DISPATCH_INCLUDE,
        });

        return records.map(toDispatchDomain);
      },
      { model: MODEL, operation: "findCompletedDispatchesByRentalOrderId" },
    );
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

  claimStatusTransition(
    id: DispatchId,
    expected: Dispatch["status"] | ReadonlyArray<Dispatch["status"]>,
    next: Dispatch["status"],
    timestamps?: {
      readyAt?: Date | null;
      dispatchedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<Dispatch | null> {
    return this.runner.run(
      async (db) => {
        // Phase 29 (F-04): expected-status predicate is the concurrency authority.
        const data: Prisma.DispatchUpdateManyMutationInput = { status: next };

        if (timestamps?.readyAt !== undefined) {
          data.loadedAt = timestamps.readyAt;
        }

        if (timestamps?.dispatchedAt !== undefined) {
          data.departedAt = timestamps.dispatchedAt;
        }

        if (timestamps?.completedAt !== undefined) {
          data.deliveredAt = timestamps.completedAt;
        }

        const expectedList = Array.isArray(expected)
          ? [...expected]
          : [expected];

        const claimed = await db.dispatch.updateMany({
          where: {
            id,
            status: { in: expectedList },
          },
          data,
        });

        if (claimed.count !== 1) {
          return null;
        }

        const record = await db.dispatch.findUnique({
          where: { id },
          include: DISPATCH_INCLUDE,
        });

        return record === null ? null : toDispatchDomain(record);
      },
      { model: MODEL, operation: "claimStatusTransition" },
    );
  }
}
