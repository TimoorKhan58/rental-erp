import { StockMovement } from "@/modules/stock-movement/domain/stock-movement.entity";
import type { StockMovementListQuery } from "@/modules/stock-movement/domain/stock-movement-list.query";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { CreateStockMovementData } from "@/modules/stock-movement/domain/stock-movement.types";
import type { StockMovementId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildStockMovementEntity } from "./stock-movement.fixtures";

interface StoredStockMovement {
  record: ReturnType<StockMovement["toProps"]>;
}

export class InMemoryStockMovementRepository implements IStockMovementRepository {
  private readonly store = new Map<string, StoredStockMovement>();

  snapshot(): Map<string, StoredStockMovement> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredStockMovement>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(movements: StockMovement[]): void {
    this.store.clear();
    for (const movement of movements) {
      const props = movement.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: StockMovementId): Promise<StockMovement | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? StockMovement.reconstitute(stored.record) : null,
    );
  }

  async findPaged(
    query: StockMovementListQuery,
  ): Promise<PaginatedResult<StockMovement>> {
    let items = Array.from(this.store.values()).map((stored) =>
      StockMovement.reconstitute(stored.record),
    );

    if (query.inventoryId !== undefined) {
      items = items.filter((item) => item.inventoryId === query.inventoryId);
    }

    if (query.productId !== undefined) {
      items = items.filter((item) => item.productId === query.productId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.movementType !== undefined) {
      items = items.filter((item) => item.movementType === query.movementType);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          (item.referenceType?.toLowerCase().includes(term) ?? false) ||
          (item.referenceId?.toLowerCase().includes(term) ?? false) ||
          item.remarks.toLowerCase().includes(term),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = left[query.sortBy as keyof StockMovement];
        const rightValue = right[query.sortBy as keyof StockMovement];

        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * direction;
        }

        return (
          String(leftValue ?? "").localeCompare(String(rightValue ?? "")) *
          direction
        );
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

  async create(data: CreateStockMovementData): Promise<StockMovement> {
    const normalized = StockMovement.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as StockMovementId;

    const movement = StockMovement.reconstitute({
      id,
      ...normalized,
      createdAt: now,
    });

    this.store.set(id, { record: movement.toProps() });
    return movement;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededStockMovementRepository(
  movements: StockMovement[] = [buildStockMovementEntity()],
): InMemoryStockMovementRepository {
  const repository = new InMemoryStockMovementRepository();
  repository.seed(movements);
  return repository;
}
