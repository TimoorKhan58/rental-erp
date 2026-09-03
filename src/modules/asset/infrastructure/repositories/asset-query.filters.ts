import type { Prisma } from "@/generated/prisma/client";

import type { Asset } from "@/modules/asset/domain/asset.entity";
import type { AssetSummaryQuery } from "@/modules/asset/domain/asset-summary.query";
import { ASSET_SEARCH_FIELDS } from "@/modules/asset/domain/asset.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapAssetFilter(
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

export function toAssetFilterRecord(
  query: AssetSummaryQuery,
): Record<string, unknown> | undefined {
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

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildAssetSummaryWhere(
  query: AssetSummaryQuery,
): Prisma.AssetWhereInput | undefined {
  const filterRecord = toAssetFilterRecord(query);
  const filterWhere = filterRecord ? mapAssetFilter(filterRecord) : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.AssetWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: ASSET_SEARCH_FIELDS }
      : undefined,
    ASSET_SEARCH_FIELDS,
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergeAssetWhere(
  base: Prisma.AssetWhereInput | undefined,
  extra: Prisma.AssetWhereInput,
): Prisma.AssetWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
