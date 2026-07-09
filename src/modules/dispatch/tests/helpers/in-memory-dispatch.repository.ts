import { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import type { DispatchListQuery } from "@/modules/dispatch/domain/dispatch-list.query";
import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type {
  CreateDispatchData,
  UpdateDispatchData,
} from "@/modules/dispatch/domain/dispatch.types";
import { validateDispatchItems } from "@/modules/dispatch/domain/dispatch.rules";
import type { DispatchId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildDispatchEntity } from "./dispatch.fixtures";

interface StoredDispatch {
  record: ReturnType<Dispatch["toProps"]>;
}

export class InMemoryDispatchRepository implements IDispatchRepository {
  private readonly store = new Map<string, StoredDispatch>();

  snapshot(): Map<string, StoredDispatch> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredDispatch>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(dispatches: Dispatch[]): void {
    this.store.clear();
    for (const dispatch of dispatches) {
      const props = dispatch.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: DispatchId): Promise<Dispatch | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Dispatch.reconstitute(stored.record) : null,
    );
  }

  findByDispatchNumber(dispatchNumber: string): Promise<Dispatch | null> {
    for (const stored of this.store.values()) {
      if (stored.record.dispatchNumber === dispatchNumber) {
        return Promise.resolve(Dispatch.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: DispatchListQuery,
  ): Promise<PaginatedResult<Dispatch>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Dispatch.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.rentalOrderId !== undefined) {
      items = items.filter(
        (item) => item.rentalOrderId === query.rentalOrderId,
      );
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.dispatchNumber.toLowerCase().includes(term) ||
          item.deliveryAddress.toLowerCase().includes(term) ||
          (item.remarks?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Dispatch] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Dispatch] ?? "",
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

  async create(data: CreateDispatchData): Promise<Dispatch> {
    const normalized = Dispatch.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as DispatchId;

    const dispatch = Dispatch.reconstitute({
      id,
      ...normalized,
      status: "DRAFT",
      readyAt: null,
      dispatchedAt: null,
      completedAt: null,
      items: normalized.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: dispatch.toProps() });
    return dispatch;
  }

  async update(id: DispatchId, data: UpdateDispatchData): Promise<Dispatch> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Dispatch not found");
    }

    const updatedItems =
      data.items !== undefined
        ? validateDispatchItems(data.items).map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          }))
        : existing.record.items;

    const updated = Dispatch.reconstitute({
      ...existing.record,
      dispatchDate: data.dispatchDate ?? existing.record.dispatchDate,
      deliveryMethod: data.deliveryMethod ?? existing.record.deliveryMethod,
      vehicleNumber:
        data.vehicleNumber !== undefined
          ? data.vehicleNumber
          : existing.record.vehicleNumber,
      driverName:
        data.driverName !== undefined
          ? data.driverName
          : existing.record.driverName,
      driverPhone:
        data.driverPhone !== undefined
          ? data.driverPhone
          : existing.record.driverPhone,
      deliveryAddress:
        data.deliveryAddress ?? existing.record.deliveryAddress,
      remarks:
        data.remarks !== undefined ? data.remarks : existing.record.remarks,
      items: updatedItems,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: DispatchId,
    status: Dispatch["status"],
    timestamps?: {
      readyAt?: Date | null;
      dispatchedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<Dispatch> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Dispatch not found");
    }

    const updated = Dispatch.reconstitute({
      ...existing.record,
      status,
      readyAt:
        timestamps?.readyAt !== undefined
          ? timestamps.readyAt
          : existing.record.readyAt,
      dispatchedAt:
        timestamps?.dispatchedAt !== undefined
          ? timestamps.dispatchedAt
          : existing.record.dispatchedAt,
      completedAt:
        timestamps?.completedAt !== undefined
          ? timestamps.completedAt
          : existing.record.completedAt,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededDispatchRepository(
  dispatches: Dispatch[] = [buildDispatchEntity()],
): InMemoryDispatchRepository {
  const repository = new InMemoryDispatchRepository();
  repository.seed(dispatches);
  return repository;
}
