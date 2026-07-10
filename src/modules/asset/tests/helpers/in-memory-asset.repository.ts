import { Asset } from "@/modules/asset/domain/asset.entity";
import type { AssetListQuery } from "@/modules/asset/domain/asset-list.query";
import type { IAssetRepository } from "@/modules/asset/domain/asset.repository.interface";
import type {
  AddMaintenanceHistoryData,
  AssetMaintenanceHistoryRecord,
  AssetTransferRecord,
  CreateAssetData,
  CreateAssetTransferData,
  DisposeAssetData,
  TransferAssetData,
  UpdateAssetData,
} from "@/modules/asset/domain/asset.types";
import type { AssetId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildAssetEntity } from "./asset.fixtures";

interface StoredAsset {
  record: ReturnType<Asset["toProps"]>;
}

interface StoredTransfer {
  record: AssetTransferRecord;
}

interface StoredMaintenance {
  record: AssetMaintenanceHistoryRecord;
}

export class InMemoryAssetRepository implements IAssetRepository {
  private readonly store = new Map<string, StoredAsset>();
  private readonly transfers = new Map<string, StoredTransfer[]>();
  private readonly maintenance = new Map<string, StoredMaintenance[]>();

  snapshot(): {
    assets: Map<string, StoredAsset>;
    transfers: Map<string, StoredTransfer[]>;
    maintenance: Map<string, StoredMaintenance[]>;
  } {
    return {
      assets: new Map(
        Array.from(this.store.entries()).map(([id, value]) => [
          id,
          { record: structuredClone(value.record) },
        ]),
      ),
      transfers: new Map(
        Array.from(this.transfers.entries()).map(([id, values]) => [
          id,
          values.map((value) => ({
            record: structuredClone(value.record),
          })),
        ]),
      ),
      maintenance: new Map(
        Array.from(this.maintenance.entries()).map(([id, values]) => [
          id,
          values.map((value) => ({
            record: structuredClone(value.record),
          })),
        ]),
      ),
    };
  }

  restore(snapshot: {
    assets: Map<string, StoredAsset>;
    transfers: Map<string, StoredTransfer[]>;
    maintenance: Map<string, StoredMaintenance[]>;
  }): void {
    this.store.clear();
    this.transfers.clear();
    this.maintenance.clear();

    for (const [id, value] of snapshot.assets.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }

    for (const [id, values] of snapshot.transfers.entries()) {
      this.transfers.set(
        id,
        values.map((value) => ({
          record: structuredClone(value.record),
        })),
      );
    }

    for (const [id, values] of snapshot.maintenance.entries()) {
      this.maintenance.set(
        id,
        values.map((value) => ({
          record: structuredClone(value.record),
        })),
      );
    }
  }

  seed(assets: Asset[]): void {
    this.store.clear();
    for (const asset of assets) {
      const props = asset.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: AssetId): Promise<Asset | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? Asset.reconstitute(stored.record) : null);
  }

  findByAssetCode(assetCode: string): Promise<Asset | null> {
    for (const stored of this.store.values()) {
      if (stored.record.assetCode === assetCode) {
        return Promise.resolve(Asset.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: AssetListQuery): Promise<PaginatedResult<Asset>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Asset.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.categoryId !== undefined) {
      items = items.filter((item) => item.categoryId === query.categoryId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.assetCode.toLowerCase().includes(term) ||
          (item.serialNumber?.toLowerCase().includes(term) ?? false) ||
          (item.notes?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "purchaseDate") {
          leftValue = String(left.purchaseDate.getTime());
          rightValue = String(right.purchaseDate.getTime());
        } else {
          leftValue = String(
            left[query.sortBy as keyof Asset] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof Asset] ?? "",
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

  async create(data: CreateAssetData): Promise<Asset> {
    const normalized = Asset.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as AssetId;

    const asset = Asset.reconstitute({
      id,
      ...normalized,
      status: "ACTIVE",
      currentBookValue: normalized.purchaseCost,
      disposalDate: null,
      disposalAmount: null,
      disposalReason: null,
      disposedById: null,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: asset.toProps() });
    return asset;
  }

  async update(id: AssetId, data: UpdateAssetData): Promise<Asset> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Asset not found");
    }

    const entity = Asset.reconstitute(existing.record);
    const updated = entity.withUpdated(data);

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateAfterTransfer(
    id: AssetId,
    data: TransferAssetData,
  ): Promise<Asset> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Asset not found");
    }

    const entity = Asset.reconstitute(existing.record);
    const updated = entity.withTransferred(data);

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateAfterDispose(
    id: AssetId,
    data: DisposeAssetData,
  ): Promise<Asset> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Asset not found");
    }

    const entity = Asset.reconstitute(existing.record);
    const updated = entity.withDisposed(data);

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateAfterMaintenance(
    id: AssetId,
    data: AddMaintenanceHistoryData,
  ): Promise<Asset> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Asset not found");
    }

    const entity = Asset.reconstitute(existing.record);
    const updated = entity.withMaintenanceStatus(data);

    if (updated.status === entity.status) {
      return entity;
    }

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async createTransfer(data: CreateAssetTransferData): Promise<AssetTransferRecord> {
    const now = new Date();
    const record: AssetTransferRecord = {
      id: crypto.randomUUID() as AssetTransferRecord["id"],
      assetId: data.assetId,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      transferDate: data.transferDate,
      reason: data.reason ?? null,
      transferredById: data.transferredById,
      createdAt: now,
    };

    const existing = this.transfers.get(data.assetId) ?? [];
    existing.push({ record });
    this.transfers.set(data.assetId, existing);

    return record;
  }

  async createMaintenanceHistory(
    assetId: AssetId,
    data: AddMaintenanceHistoryData,
  ): Promise<AssetMaintenanceHistoryRecord> {
    const now = new Date();
    const record: AssetMaintenanceHistoryRecord = {
      id: crypto.randomUUID() as AssetMaintenanceHistoryRecord["id"],
      assetId,
      serviceDate: data.serviceDate,
      vendor: data.vendor ?? null,
      cost: data.cost,
      description: data.description,
      completedById: data.completedById,
      createdAt: now,
    };

    const existing = this.maintenance.get(assetId) ?? [];
    existing.push({ record });
    this.maintenance.set(assetId, existing);

    return record;
  }

  findTransfersByAssetId(assetId: AssetId): Promise<AssetTransferRecord[]> {
    const records = this.transfers.get(assetId) ?? [];
    return Promise.resolve(
      records
        .map((stored) => structuredClone(stored.record))
        .sort(
          (left, right) =>
            right.transferDate.getTime() - left.transferDate.getTime(),
        ),
    );
  }

  findMaintenanceHistoryByAssetId(
    assetId: AssetId,
  ): Promise<AssetMaintenanceHistoryRecord[]> {
    const records = this.maintenance.get(assetId) ?? [];
    return Promise.resolve(
      records
        .map((stored) => structuredClone(stored.record))
        .sort(
          (left, right) =>
            right.serviceDate.getTime() - left.serviceDate.getTime(),
        ),
    );
  }

  count(): number {
    return this.store.size;
  }

  transferCount(assetId: AssetId): number {
    return this.transfers.get(assetId)?.length ?? 0;
  }

  maintenanceCount(assetId: AssetId): number {
    return this.maintenance.get(assetId)?.length ?? 0;
  }
}

export function createSeededAssetRepository(
  assets: Asset[] = [buildAssetEntity()],
): InMemoryAssetRepository {
  const repository = new InMemoryAssetRepository();
  repository.seed(assets);
  return repository;
}
