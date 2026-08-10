import type {
  AddMaintenancePayload,
  AssetCategoryListResponse,
  AssetCategoryResponse,
  AssetListResponse,
  AssetResponse,
  CreateAssetCategoryPayload,
  CreateAssetPayload,
  DisposeAssetPayload,
  ListAssetCategoriesParams,
  ListAssetsParams,
  TransferAssetPayload,
  UpdateAssetPayload,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/assets";
const CATEGORIES_BASE = "/asset-categories";

export async function getAssets(
  params: ListAssetsParams = {},
): Promise<AssetListResponse> {
  return apiGet<AssetListResponse>(BASE, { params });
}

export async function getAsset(id: string): Promise<AssetResponse> {
  return apiGet<AssetResponse>(`${BASE}/${id}`);
}

export async function createAsset(
  payload: CreateAssetPayload,
): Promise<AssetResponse> {
  return apiPost<AssetResponse>(BASE, payload);
}

export async function updateAsset(
  id: string,
  payload: UpdateAssetPayload,
): Promise<AssetResponse> {
  return apiPatch<AssetResponse>(`${BASE}/${id}`, payload);
}

export async function transferAsset(
  id: string,
  payload: TransferAssetPayload,
): Promise<AssetResponse> {
  return apiPost<AssetResponse>(`${BASE}/${id}/transfer`, payload);
}

export async function disposeAsset(
  id: string,
  payload: DisposeAssetPayload,
): Promise<AssetResponse> {
  return apiPost<AssetResponse>(`${BASE}/${id}/dispose`, payload);
}

export async function addAssetMaintenance(
  id: string,
  payload: AddMaintenancePayload,
): Promise<AssetResponse> {
  return apiPost<AssetResponse>(`${BASE}/${id}/maintenance`, payload);
}

export async function getAssetCategories(
  params: ListAssetCategoriesParams = {},
): Promise<AssetCategoryListResponse> {
  return apiGet<AssetCategoryListResponse>(CATEGORIES_BASE, { params });
}

export async function createAssetCategory(
  payload: CreateAssetCategoryPayload,
): Promise<AssetCategoryResponse> {
  return apiPost<AssetCategoryResponse>(CATEGORIES_BASE, payload);
}

export async function deleteAssetCategory(id: string): Promise<void> {
  return apiDelete(`${CATEGORIES_BASE}/${id}`);
}
