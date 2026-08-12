import type { Prisma } from "@/generated/prisma/client";
import type { RentalOrderListQuery } from "@/modules/rental-order/domain/rental-order-list.query";
import type {
  ProductId,
  RentalOrderId,
  WarehouseId,
} from "@/shared/domain/ids";
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

import { AVAILABILITY_COMMITMENT_STATUSES } from "@/modules/rental-order/domain/rental-order.availability.rules";
import type {
  AvailabilityCommitmentLineProjection,
  FindAvailabilityCommitmentLinesParams,
} from "@/modules/rental-order/domain/rental-order.availability.projection";
import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type {
  CreateRentalOrderData,
  UpdateRentalOrderData,
  UpdateRentalOrderReserveData,
} from "@/modules/rental-order/domain/rental-order.types";
import {
  RENTAL_ORDER_SEARCH_FIELDS,
  type RentalOrderStatus,
} from "@/modules/rental-order/domain/rental-order.constants";

import {
  RENTAL_ORDER_INCLUDE,
  toRentalOrderCreateInput,
  toRentalOrderDomain,
  toRentalOrderReserveUpdateInput,
  toRentalOrderUpdateInput,
} from "../mappers/rental-order.persistence.mapper";

const MODEL = "RentalOrder";

const DEFAULT_ORDER_BY: Prisma.RentalOrderOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapRentalOrderFilter(
  filter: Record<string, unknown>,
): Prisma.RentalOrderWhereInput | undefined {
  const where: Prisma.RentalOrderWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as RentalOrder["status"];
  }

  if (filter.customerId !== undefined) {
    where.customerId = String(filter.customerId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.eventFrom !== undefined) {
    where.eventEndDate = {
      ...(typeof where.eventEndDate === "object" && where.eventEndDate !== null
        ? where.eventEndDate
        : {}),
      gte: filter.eventFrom as Date,
    };
  }

  if (filter.eventTo !== undefined) {
    where.eventStartDate = {
      ...(typeof where.eventStartDate === "object" && where.eventStartDate !== null
        ? where.eventStartDate
        : {}),
      lte: filter.eventTo as Date,
    };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapRentalOrderSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.RentalOrderOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.RentalOrderOrderByWithRelationInput;
}

export class PrismaRentalOrderRepository implements IRentalOrderRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: RentalOrderId): Promise<RentalOrder | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.rentalOrder.findUnique({
          where: { id },
          include: RENTAL_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toRentalOrderDomain(record) : null));
  }

  findByOrderNumber(orderNumber: string): Promise<RentalOrder | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.rentalOrder.findUnique({
          where: { orderNumber },
          include: RENTAL_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "findByOrderNumber" },
    ).then((record) => (record ? toRentalOrderDomain(record) : null));
  }

  findAvailabilityCommitmentLines(
    params: FindAvailabilityCommitmentLinesParams,
  ): Promise<AvailabilityCommitmentLineProjection[]> {
    return repositoryFindMany(
      this.runner,
      (db) =>
        db.rentalOrderItem.findMany({
          where: {
            productId: params.productId,
            rentalOrder: {
              warehouseId: params.warehouseId,
              status: {
                in: [...AVAILABILITY_COMMITMENT_STATUSES],
              },
              ...(params.excludeRentalOrderId !== undefined
                ? { id: { not: params.excludeRentalOrderId } }
                : {}),
            },
          },
          select: {
            id: true,
            productId: true,
            reservedQuantity: true,
            eventStartDate: true,
            eventEndDate: true,
            rentalOrder: {
              select: {
                id: true,
                warehouseId: true,
                status: true,
              },
            },
            dispatchItems: {
              select: {
                quantity: true,
                ownedQuantity: true,
                externalQuantity: true,
                dispatch: {
                  select: {
                    status: true,
                  },
                },
              },
            },
            returnInspectionItems: {
              select: {
                returnedQuantity: true,
                ownedQuantity: true,
                externalQuantity: true,
                returnInspection: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        }),
      { model: "RentalOrderItem", operation: "findAvailabilityCommitmentLines" },
    ).then((rows) =>
      rows.map((row) => ({
        rentalOrderItemId: row.id,
        rentalOrderId: row.rentalOrder.id,
        productId: row.productId as ProductId,
        warehouseId: row.rentalOrder.warehouseId as WarehouseId,
        status: row.rentalOrder.status as RentalOrderStatus,
        reservedQuantity: row.reservedQuantity,
        eventStartDate: row.eventStartDate,
        eventEndDate: row.eventEndDate,
        dispatches: row.dispatchItems.map((item) => ({
          status: item.dispatch.status,
          quantity: item.quantity,
          ownedQuantity: item.ownedQuantity ?? item.quantity,
        })),
        returns: row.returnInspectionItems.map((item) => ({
          status: item.returnInspection.status,
          returnedQuantity: item.returnedQuantity,
          ownedReturnedQuantity: item.ownedQuantity ?? item.returnedQuantity,
        })),
      })),
    );
  }

  findPaged(
    query: RentalOrderListQuery,
  ): Promise<PaginatedResult<RentalOrder>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.customerId !== undefined) {
      filter.customerId = query.customerId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
    }

    if (query.eventFrom !== undefined) {
      filter.eventFrom = query.eventFrom;
    }

    if (query.eventTo !== undefined) {
      filter.eventTo = query.eventTo;
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
          searchFields: RENTAL_ORDER_SEARCH_FIELDS,
        }),
        searchFields: RENTAL_ORDER_SEARCH_FIELDS,
        mapFilter: mapRentalOrderFilter,
        mapSort: mapRentalOrderSort,
        handlers: {
          findMany: (db, args) =>
            db.rentalOrder.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: RENTAL_ORDER_INCLUDE,
            }),
          count: (db, args) =>
            db.rentalOrder.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => {
      try {
        return {
          items: result.items.map(toRentalOrderDomain),
          meta: result.meta,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to map rental orders";
        throw new Error(`Rental order list mapping failed: ${message}`);
      }
    });
  }

  create(data: CreateRentalOrderData): Promise<RentalOrder> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.rentalOrder.create({
          data: toRentalOrderCreateInput(data),
          include: RENTAL_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then(toRentalOrderDomain);
  }

  async update(
    id: RentalOrderId,
    data: UpdateRentalOrderData,
  ): Promise<RentalOrder> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error("Rental order not found");
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.rentalOrder.update({
          where: { id },
          data: toRentalOrderUpdateInput(data, existing),
          include: RENTAL_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    ).then(toRentalOrderDomain);
  }

  updateReserve(
    id: RentalOrderId,
    data: UpdateRentalOrderReserveData,
  ): Promise<RentalOrder | null> {
    return this.runner.run(
      async (db) => {
        // Only one concurrent reserve claim can win while status is CONFIRMED.
        const claimed = await db.rentalOrder.updateMany({
          where: {
            id,
            status: "CONFIRMED",
          },
          data: {
            status: data.status,
          },
        });

        if (claimed.count !== 1) {
          return null;
        }

        const record = await db.rentalOrder.update({
          where: { id },
          data: toRentalOrderReserveUpdateInput(data),
          include: RENTAL_ORDER_INCLUDE,
        });

        return toRentalOrderDomain(record);
      },
      { model: MODEL, operation: "updateReserve" },
    );
  }

  cancelIfCancellable(id: RentalOrderId): Promise<RentalOrder | null> {
    return this.runner.run(
      async (db) => {
        const claimed = await db.rentalOrder.updateMany({
          where: {
            id,
            status: {
              in: ["DRAFT", "CONFIRMED", "RESERVED"],
            },
          },
          data: {
            status: "CANCELLED",
          },
        });

        if (claimed.count !== 1) {
          return null;
        }

        const record = await db.rentalOrder.findUnique({
          where: { id },
          include: RENTAL_ORDER_INCLUDE,
        });

        return record === null ? null : toRentalOrderDomain(record);
      },
      { model: MODEL, operation: "cancelIfCancellable" },
    );
  }

  clearReservedQuantities(id: RentalOrderId): Promise<RentalOrder> {
    return this.runner.run(
      async (db) => {
        const existing = await db.rentalOrder.findUnique({
          where: { id },
          include: RENTAL_ORDER_INCLUDE,
        });

        if (existing === null) {
          throw new Error("Rental order not found");
        }

        const record = await db.rentalOrder.update({
          where: { id },
          data: {
            items: {
              update: existing.items.map((item) => ({
                where: { id: item.id },
                data: { reservedQuantity: 0 },
              })),
            },
          },
          include: RENTAL_ORDER_INCLUDE,
        });

        return toRentalOrderDomain(record);
      },
      { model: MODEL, operation: "clearReservedQuantities" },
    );
  }

  updateStatus(
    id: RentalOrderId,
    status: RentalOrder["status"],
  ): Promise<RentalOrder> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.rentalOrder.update({
          where: { id },
          data: { status },
          include: RENTAL_ORDER_INCLUDE,
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toRentalOrderDomain);
  }
}
