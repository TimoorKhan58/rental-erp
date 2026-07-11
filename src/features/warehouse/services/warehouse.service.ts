import type {
  CreateWarehousePayload,
  WarehouseListResponse,
  WarehouseResponse,
  ListWarehousesParams,
  UpdateWarehousePayload,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/warehouses";

export async function getWarehouses(
  params: ListWarehousesParams = {},
): Promise<WarehouseListResponse> {
  return apiGet<WarehouseListResponse>(BASE, { params });
}

export async function getWarehouse(id: string): Promise<WarehouseResponse> {
  return apiGet<WarehouseResponse>(`${BASE}/${id}`);
}

export async function createWarehouse(
  payload: CreateWarehousePayload,
): Promise<WarehouseResponse> {
  return apiPost<WarehouseResponse>(BASE, payload);
}

export async function updateWarehouse(
  id: string,
  payload: UpdateWarehousePayload,
): Promise<WarehouseResponse> {
  return apiPatch<WarehouseResponse>(`${BASE}/${id}`, payload);
}

export async function deleteWarehouse(id: string): Promise<null> {
  return apiDelete<null>(`${BASE}/${id}`);
}
