import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { RentalOrderListQuery } from "@/modules/rental-order/domain/rental-order-list.query";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type {
  CreateRentalOrderData,
  UpdateRentalOrderData,
  UpdateRentalOrderReserveData,
} from "@/modules/rental-order/domain/rental-order.types";
import type { RentalOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildRentalOrderEntity } from "./rental-order.fixtures";

interface StoredRentalOrder {
  record: ReturnType<RentalOrder["toProps"]>;
}

export class InMemoryRentalOrderRepository implements IRentalOrderRepository {
  private readonly store = new Map<string, StoredRentalOrder>();

  snapshot(): Map<string, StoredRentalOrder> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredRentalOrder>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(orders: RentalOrder[]): void {
    this.store.clear();
    for (const order of orders) {
      const props = order.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: RentalOrderId): Promise<RentalOrder | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? RentalOrder.reconstitute(stored.record) : null,
    );
  }

  findByOrderNumber(orderNumber: string): Promise<RentalOrder | null> {
    for (const stored of this.store.values()) {
      if (stored.record.orderNumber === orderNumber) {
        return Promise.resolve(RentalOrder.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: RentalOrderListQuery,
  ): Promise<PaginatedResult<RentalOrder>> {
    let items = Array.from(this.store.values()).map((stored) =>
      RentalOrder.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.customerId !== undefined) {
      items = items.filter((item) => item.customerId === query.customerId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.eventFrom !== undefined) {
      const eventFrom = query.eventFrom;
      items = items.filter((item) => item.endDate.getTime() >= eventFrom.getTime());
    }

    if (query.eventTo !== undefined) {
      const eventTo = query.eventTo;
      items = items.filter((item) => item.startDate.getTime() <= eventTo.getTime());
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.orderNumber.toLowerCase().includes(term) ||
          (item.remarks?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof RentalOrder] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof RentalOrder] ?? "",
        ).toLowerCase();

        return leftValue.localeCompare(rightValue) * direction;
      });
    }

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const pagedItems = items.slice(start, start + query.pageSize);

    return {
      items: pagedItems,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async create(data: CreateRentalOrderData): Promise<RentalOrder> {
    const normalized = RentalOrder.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as RentalOrderId;

    const order = RentalOrder.reconstitute({
      id,
      ...normalized,
      status: "DRAFT",
      items: normalized.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: order.toProps() });
    return order;
  }

  async update(
    id: RentalOrderId,
    data: UpdateRentalOrderData,
  ): Promise<RentalOrder> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Rental order not found");
    }

    const updatedItems =
      data.items !== undefined
        ? RentalOrder.create({
            orderNumber: existing.record.orderNumber,
            customerId: data.customerId ?? existing.record.customerId,
            warehouseId: data.warehouseId ?? existing.record.warehouseId,
            startDate: data.startDate ?? existing.record.startDate,
            endDate: data.endDate ?? existing.record.endDate,
            remarks:
              data.remarks !== undefined
                ? data.remarks
                : existing.record.remarks,
            items: data.items,
            createdById: existing.record.createdById,
          }).items.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          }))
        : existing.record.items;

    const updated = RentalOrder.reconstitute({
      ...existing.record,
      customerId: data.customerId ?? existing.record.customerId,
      warehouseId: data.warehouseId ?? existing.record.warehouseId,
      startDate: data.startDate ?? existing.record.startDate,
      endDate: data.endDate ?? existing.record.endDate,
      remarks:
        data.remarks !== undefined ? data.remarks : existing.record.remarks,
      items: updatedItems,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateReserve(
    id: RentalOrderId,
    data: UpdateRentalOrderReserveData,
  ): Promise<RentalOrder> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Rental order not found");
    }

    const reserveMap = new Map(
      data.items.map((item) => [item.id, item.reservedQuantity]),
    );

    const updated = RentalOrder.reconstitute({
      ...existing.record,
      status: data.status,
      items: existing.record.items.map((item) => ({
        ...item,
        reservedQuantity: reserveMap.get(item.id) ?? item.reservedQuantity,
      })),
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: RentalOrderId,
    status: RentalOrder["status"],
  ): Promise<RentalOrder> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Rental order not found");
    }

    const updated = RentalOrder.reconstitute({
      ...existing.record,
      status,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRentalOrderRepository(
  orders: RentalOrder[] = [buildRentalOrderEntity()],
): InMemoryRentalOrderRepository {
  const repository = new InMemoryRentalOrderRepository();
  repository.seed(orders);
  return repository;
}
