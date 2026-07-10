import type { Prisma } from "@/generated/prisma/client";
import type { AssetListQuery } from "@/modules/asset/domain";
import type { AssetId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Asset } from "@/modules/asset/domain";
import type { IAssetRepository } from "@/modules/asset/domain";
import type {
  AddMaintenanceHistoryData,
  CreateAssetData,
  CreateAssetTransferData,
  DisposeAssetData,
  TransferAssetData,
  UpdateAssetData,
} from "@/modules/asset/domain";
import { ASSET_SEARCH_FIELDS } from "@/modules/asset/domain";

import {
  toAssetCreateInput,
  toAssetDisposeUpdateInput,
  toAssetDomain,
  toAssetMaintenanceHistoryCreateInput,
  toAssetMaintenanceHistoryDomain,
  toAssetMaintenanceStatusUpdateInput,
  toAssetTransferCreateInput,
  toAssetTransferDomain,
  toAssetTransferUpdateInput,
  toAssetUpdateInput,
} from "../mappers/asset.persistence.mapper";

const MODEL = "Asset";

const DEFAULT_ORDER_BY: Prisma.AssetOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapAssetFilter(
  filter: Record<string, unknown>,
): Prisma.AssetWhereInput | undefined {
  const where: Prisma.AssetWhereInput = {};

  if (filter.status !== undefined) {
    where.status = String(filter.status) as Prisma.AssetWhereInput["status"];
  }

  if (filter.categoryId !== undefined) {
    where.categoryId = String(filter.categoryId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapAssetSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.AssetOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.AssetOrderByWithRelationInput;
}

export class PrismaAssetRepository implements IAssetRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: AssetId): Promise<Asset | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.asset.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toAssetDomain(record) : null));
  }

  findByAssetCode(assetCode: string): Promise<Asset | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.asset.findUnique({
          where: { assetCode },
        }),
      { model: MODEL, operation: "findByAssetCode" },
    ).then((record) => (record ? toAssetDomain(record) : null));
  }

  async findPaged(query: AssetListQuery): Promise<PaginatedResult<Asset>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.categoryId !== undefined) {
      filter.categoryId = query.categoryId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
    }

    const result = await runRepositoryPagedQuery(this.runner, {
      spec: createRepositoryQuerySpec({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        search: query.search,
        searchFields: ASSET_SEARCH_FIELDS,
      }),
      searchFields: ASSET_SEARCH_FIELDS,
      mapFilter: mapAssetFilter,
      mapSort: mapAssetSort,
      handlers: {
        findMany: (db, args) =>
          db.asset.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.asset.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    });

    return {
      items: result.items.map(toAssetDomain),
      meta: result.meta,
    };
  }

  async create(data: CreateAssetData): Promise<Asset> {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.asset.create({
          data: toAssetCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    );

    return toAssetDomain(record);
  }

  async update(id: AssetId, data: UpdateAssetData): Promise<Asset> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.asset.update({
          where: { id },
          data: toAssetUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toAssetDomain(record);
  }

  async updateAfterTransfer(
    id: AssetId,
    data: TransferAssetData,
  ): Promise<Asset> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.asset.update({
          where: { id },
          data: toAssetTransferUpdateInput(data),
        }),
      { model: MODEL, operation: "updateAfterTransfer" },
    );

    return toAssetDomain(record);
  }

  async updateAfterDispose(
    id: AssetId,
    data: DisposeAssetData,
  ): Promise<Asset> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.asset.update({
          where: { id },
          data: toAssetDisposeUpdateInput(data),
        }),
      { model: MODEL, operation: "updateAfterDispose" },
    );

    return toAssetDomain(record);
  }

  async updateAfterMaintenance(
    id: AssetId,
    data: AddMaintenanceHistoryData,
  ): Promise<Asset> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error("Asset not found");
    }

    const updatedEntity = existing.withMaintenanceStatus(data);

    if (updatedEntity.status === existing.status) {
      return existing;
    }

    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.asset.update({
          where: { id },
          data: toAssetMaintenanceStatusUpdateInput(data),
        }),
      { model: MODEL, operation: "updateAfterMaintenance" },
    );

    return toAssetDomain(record);
  }

  async createTransfer(data: CreateAssetTransferData) {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.assetTransfer.create({
          data: toAssetTransferCreateInput(data),
        }),
      { model: "AssetTransfer", operation: "createTransfer" },
    );

    return toAssetTransferDomain(record);
  }

  async createMaintenanceHistory(
    assetId: AssetId,
    data: AddMaintenanceHistoryData,
  ) {
    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.assetMaintenanceHistory.create({
          data: toAssetMaintenanceHistoryCreateInput(assetId, data),
        }),
      { model: "AssetMaintenanceHistory", operation: "createMaintenanceHistory" },
    );

    return toAssetMaintenanceHistoryDomain(record);
  }

  findTransfersByAssetId(assetId: AssetId) {
    return this.runner.run((db) =>
      db.assetTransfer.findMany({
        where: { assetId },
        orderBy: { transferDate: "desc" },
      }),
    ).then((records) => records.map(toAssetTransferDomain));
  }

  findMaintenanceHistoryByAssetId(assetId: AssetId) {
    return this.runner.run((db) =>
      db.assetMaintenanceHistory.findMany({
        where: { assetId },
        orderBy: { serviceDate: "desc" },
      }),
    ).then((records) => records.map(toAssetMaintenanceHistoryDomain));
  }
}
