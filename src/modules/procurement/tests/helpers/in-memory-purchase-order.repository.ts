import { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import type { PurchaseOrderListQuery } from "@/modules/procurement/domain/purchase-order-list.query";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import type {
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  UpdatePurchaseOrderReceiveData,
} from "@/modules/procurement/domain/purchase-order.types";
import type { PurchaseOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildPurchaseOrderEntity } from "./purchase-order.fixtures";

interface StoredPurchaseOrder {
  record: ReturnType<PurchaseOrder["toProps"]>;
}

export class InMemoryPurchaseOrderRepository implements IPurchaseOrderRepository {
  private readonly store = new Map<string, StoredPurchaseOrder>();

  snapshot(): Map<string, StoredPurchaseOrder> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredPurchaseOrder>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(orders: PurchaseOrder[]): void {
    this.store.clear();
    for (const order of orders) {
      const props = order.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: PurchaseOrderId): Promise<PurchaseOrder | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? PurchaseOrder.reconstitute(stored.record) : null,
    );
  }

  findByPoNumber(poNumber: string): Promise<PurchaseOrder | null> {
    for (const stored of this.store.values()) {
      if (stored.record.poNumber === poNumber) {
        return Promise.resolve(PurchaseOrder.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: PurchaseOrderListQuery,
  ): Promise<PaginatedResult<PurchaseOrder>> {
    let items = Array.from(this.store.values()).map((stored) =>
      PurchaseOrder.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.supplierId !== undefined) {
      items = items.filter((item) => item.supplierId === query.supplierId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.poNumber.toLowerCase().includes(term) ||
          (item.remarks?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof PurchaseOrder] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof PurchaseOrder] ?? "",
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

  async create(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    const normalized = PurchaseOrder.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as PurchaseOrderId;

    const order = PurchaseOrder.reconstitute({
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
    id: PurchaseOrderId,
    data: UpdatePurchaseOrderData,
  ): Promise<PurchaseOrder> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Purchase order not found");
    }

    const updatedItems =
      data.items !== undefined
        ? PurchaseOrder.create({
            poNumber: existing.record.poNumber,
            supplierId: data.supplierId ?? existing.record.supplierId,
            warehouseId: data.warehouseId ?? existing.record.warehouseId,
            orderDate: data.orderDate ?? existing.record.orderDate,
            expectedDate:
              data.expectedDate !== undefined
                ? data.expectedDate
                : existing.record.expectedDate,
            remarks:
              data.remarks !== undefined
                ? data.remarks
                : existing.record.remarks,
            items: data.items,
          }).items.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          }))
        : existing.record.items;

    const updated = PurchaseOrder.reconstitute({
      ...existing.record,
      supplierId: data.supplierId ?? existing.record.supplierId,
      warehouseId: data.warehouseId ?? existing.record.warehouseId,
      orderDate: data.orderDate ?? existing.record.orderDate,
      expectedDate:
        data.expectedDate !== undefined
          ? data.expectedDate
          : existing.record.expectedDate,
      remarks:
        data.remarks !== undefined ? data.remarks : existing.record.remarks,
      items: updatedItems,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateReceive(
    id: PurchaseOrderId,
    data: UpdatePurchaseOrderReceiveData,
  ): Promise<PurchaseOrder> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Purchase order not found");
    }

    const receiveMap = new Map(
      data.items.map((item) => [item.id, item.receivedQuantity]),
    );

    const updated = PurchaseOrder.reconstitute({
      ...existing.record,
      status: data.status,
      items: existing.record.items.map((item) => ({
        ...item,
        receivedQuantity: receiveMap.get(item.id) ?? item.receivedQuantity,
      })),
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: PurchaseOrderId,
    status: PurchaseOrder["status"],
  ): Promise<PurchaseOrder> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Purchase order not found");
    }

    const updated = PurchaseOrder.reconstitute({
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

export function createSeededPurchaseOrderRepository(
  orders: PurchaseOrder[] = [buildPurchaseOrderEntity()],
): InMemoryPurchaseOrderRepository {
  const repository = new InMemoryPurchaseOrderRepository();
  repository.seed(orders);
  return repository;
}
