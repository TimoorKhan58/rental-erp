import { Return } from "@/modules/return/domain/return.entity";
import type { ReturnListQuery } from "@/modules/return/domain/return-list.query";
import type { IReturnRepository } from "@/modules/return/domain/return.repository.interface";
import { validateReturnItems } from "@/modules/return/domain/return.rules";
import type {
  CreateReturnData,
  UpdateReturnData,
  UpdateReturnStatusData,
} from "@/modules/return/domain/return.types";
import type { DispatchId, ReturnInspectionId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildReturnEntity } from "./return.fixtures";

interface StoredReturn {
  record: ReturnType<Return["toProps"]>;
}

export class InMemoryReturnRepository implements IReturnRepository {
  private readonly store = new Map<string, StoredReturn>();

  snapshot(): Map<string, StoredReturn> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredReturn>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(returns: Return[]): void {
    this.store.clear();
    for (const returnRecord of returns) {
      const props = returnRecord.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: ReturnInspectionId): Promise<Return | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Return.reconstitute(stored.record) : null,
    );
  }

  findByReturnNumber(returnNumber: string): Promise<Return | null> {
    for (const stored of this.store.values()) {
      if (stored.record.returnNumber === returnNumber) {
        return Promise.resolve(Return.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  findByDispatchId(dispatchId: DispatchId): Promise<Return[]> {
    const items = Array.from(this.store.values())
      .filter((stored) => stored.record.dispatchId === dispatchId)
      .map((stored) => Return.reconstitute(stored.record));

    return Promise.resolve(items);
  }

  async findPaged(query: ReturnListQuery): Promise<PaginatedResult<Return>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Return.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.rentalOrderId !== undefined) {
      items = items.filter(
        (item) => item.rentalOrderId === query.rentalOrderId,
      );
    }

    if (query.dispatchId !== undefined) {
      items = items.filter((item) => item.dispatchId === query.dispatchId);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.returnNumber.toLowerCase().includes(term) ||
          (item.remarks?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "inspectionDate") {
          leftValue = String(left.inspectedAt?.getTime() ?? "");
          rightValue = String(right.inspectedAt?.getTime() ?? "");
        } else {
          leftValue = String(
            left[query.sortBy as keyof Return] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof Return] ?? "",
          ).toLowerCase();
        }

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

  async create(data: CreateReturnData): Promise<Return> {
    const normalized = Return.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as ReturnInspectionId;

    const returnRecord = Return.reconstitute({
      id,
      ...normalized,
      status: "DRAFT",
      receivedAt: null,
      inspectedAt: null,
      completedAt: null,
      items: normalized.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: returnRecord.toProps() });
    return returnRecord;
  }

  async update(
    id: ReturnInspectionId,
    data: UpdateReturnData,
  ): Promise<Return> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Return not found");
    }

    const updatedItems =
      data.items !== undefined
        ? validateReturnItems(data.items).map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          }))
        : existing.record.items;

    const updated = Return.reconstitute({
      ...existing.record,
      returnDate: data.returnDate ?? existing.record.returnDate,
      remarks:
        data.remarks !== undefined ? data.remarks : existing.record.remarks,
      items: updatedItems,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: ReturnInspectionId,
    data: UpdateReturnStatusData,
  ): Promise<Return> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Return not found");
    }

    const updated = Return.reconstitute({
      ...existing.record,
      status: data.status,
      receivedAt:
        data.receivedAt !== undefined
          ? data.receivedAt
          : existing.record.receivedAt,
      inspectedAt:
        data.inspectedAt !== undefined
          ? data.inspectedAt
          : existing.record.inspectedAt,
      completedAt:
        data.completedAt !== undefined
          ? data.completedAt
          : existing.record.completedAt,
      items: data.items ?? existing.record.items,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededReturnRepository(
  returns: Return[] = [buildReturnEntity()],
): InMemoryReturnRepository {
  const repository = new InMemoryReturnRepository();
  repository.seed(returns);
  return repository;
}
