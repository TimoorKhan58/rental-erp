import { Maintenance } from "@/modules/maintenance/domain/maintenance.entity";
import type { MaintenanceListQuery } from "@/modules/maintenance/domain/maintenance-list.query";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain/maintenance.repository.interface";
import type {
  CreateMaintenanceData,
  UpdateMaintenanceData,
  UpdateMaintenanceStatusData,
} from "@/modules/maintenance/domain/maintenance.types";
import type { MaintenanceId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildMaintenanceEntity } from "./maintenance.fixtures";

interface StoredMaintenance {
  record: ReturnType<Maintenance["toProps"]>;
}

export class InMemoryMaintenanceRepository implements IMaintenanceRepository {
  private readonly store = new Map<string, StoredMaintenance>();

  snapshot(): Map<string, StoredMaintenance> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredMaintenance>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(maintenances: Maintenance[]): void {
    this.store.clear();
    for (const maintenance of maintenances) {
      const props = maintenance.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: MaintenanceId): Promise<Maintenance | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Maintenance.reconstitute(stored.record) : null,
    );
  }

  findByMaintenanceNumber(
    maintenanceNumber: string,
  ): Promise<Maintenance | null> {
    for (const stored of this.store.values()) {
      if (stored.record.maintenanceNumber === maintenanceNumber) {
        return Promise.resolve(Maintenance.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: MaintenanceListQuery,
  ): Promise<PaginatedResult<Maintenance>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Maintenance.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.productId !== undefined) {
      items = items.filter((item) => item.productId === query.productId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.inventoryId !== undefined) {
      items = items.filter((item) => item.inventoryId === query.inventoryId);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.maintenanceNumber.toLowerCase().includes(term) ||
          (item.notes?.toLowerCase().includes(term) ?? false) ||
          (item.technician?.toLowerCase().includes(term) ?? false) ||
          (item.vendor?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "scheduledDate") {
          leftValue = String(left.scheduledDate.getTime());
          rightValue = String(right.scheduledDate.getTime());
        } else if (query.sortBy === "createdAt") {
          leftValue = String(left.createdAt.getTime());
          rightValue = String(right.createdAt.getTime());
        } else {
          leftValue = String(
            left[query.sortBy as keyof Maintenance] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof Maintenance] ?? "",
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

  async create(data: CreateMaintenanceData): Promise<Maintenance> {
    const normalized = Maintenance.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as MaintenanceId;

    const maintenance = Maintenance.reconstitute({
      id,
      ...normalized,
      status: "SCHEDULED",
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: maintenance.toProps() });
    return maintenance;
  }

  async update(
    id: MaintenanceId,
    data: UpdateMaintenanceData,
  ): Promise<Maintenance> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Maintenance not found");
    }

    const entity = Maintenance.reconstitute(existing.record);
    const updated = entity.withUpdated(data);

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: MaintenanceId,
    data: UpdateMaintenanceStatusData,
  ): Promise<Maintenance> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Maintenance not found");
    }

    const updated = Maintenance.reconstitute({
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

export function createSeededMaintenanceRepository(
  maintenances: Maintenance[] = [buildMaintenanceEntity()],
): InMemoryMaintenanceRepository {
  const repository = new InMemoryMaintenanceRepository();
  repository.seed(maintenances);
  return repository;
}
