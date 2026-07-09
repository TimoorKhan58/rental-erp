import { Repair } from "@/modules/repair/domain/repair.entity";
import type { RepairListQuery } from "@/modules/repair/domain/repair-list.query";
import type { IRepairRepository } from "@/modules/repair/domain/repair.repository.interface";
import type {
  CreateRepairData,
  UpdateRepairData,
  UpdateRepairStatusData,
} from "@/modules/repair/domain/repair.types";
import type { RepairId, ReturnInspectionId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildRepairEntity } from "./repair.fixtures";

interface StoredRepair {
  record: ReturnType<Repair["toProps"]>;
}

export class InMemoryRepairRepository implements IRepairRepository {
  private readonly store = new Map<string, StoredRepair>();

  snapshot(): Map<string, StoredRepair> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredRepair>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(repairs: Repair[]): void {
    this.store.clear();
    for (const repair of repairs) {
      const props = repair.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: RepairId): Promise<Repair | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Repair.reconstitute(stored.record) : null,
    );
  }

  findByRepairNumber(repairNumber: string): Promise<Repair | null> {
    for (const stored of this.store.values()) {
      if (stored.record.repairNumber === repairNumber) {
        return Promise.resolve(Repair.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  findByReturnId(returnId: ReturnInspectionId): Promise<Repair[]> {
    const items = Array.from(this.store.values())
      .filter((stored) => stored.record.returnId === returnId)
      .map((stored) => Repair.reconstitute(stored.record));

    return Promise.resolve(items);
  }

  async findPaged(query: RepairListQuery): Promise<PaginatedResult<Repair>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Repair.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.returnId !== undefined) {
      items = items.filter((item) => item.returnId === query.returnId);
    }

    if (query.productId !== undefined) {
      items = items.filter((item) => item.productId === query.productId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.repairNumber.toLowerCase().includes(term) ||
          (item.repairNotes?.toLowerCase().includes(term) ?? false) ||
          (item.technician?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "repairDate") {
          leftValue = String(left.repairDate.getTime());
          rightValue = String(right.repairDate.getTime());
        } else {
          leftValue = String(
            left[query.sortBy as keyof Repair] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof Repair] ?? "",
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

  async create(data: CreateRepairData): Promise<Repair> {
    const normalized = Repair.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as RepairId;

    const repair = Repair.reconstitute({
      id,
      ...normalized,
      status: "PENDING",
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: repair.toProps() });
    return repair;
  }

  async update(id: RepairId, data: UpdateRepairData): Promise<Repair> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Repair not found");
    }

    const entity = Repair.reconstitute(existing.record);
    const updated = entity.withUpdated(data);

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: RepairId,
    data: UpdateRepairStatusData,
  ): Promise<Repair> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Repair not found");
    }

    const updated = Repair.reconstitute({
      ...existing.record,
      status: data.status,
      startedAt:
        data.startedAt !== undefined
          ? data.startedAt
          : existing.record.startedAt,
      completedAt:
        data.completedAt !== undefined
          ? data.completedAt
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

export function createSeededRepairRepository(
  repairs: Repair[] = [buildRepairEntity()],
): InMemoryRepairRepository {
  const repository = new InMemoryRepairRepository();
  repository.seed(repairs);
  return repository;
}
