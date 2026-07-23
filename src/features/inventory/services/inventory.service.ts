import type {
  CreateInventoryPayload,
  InventoryListResponse,
  InventoryResponse,
  ListInventoryParams,
  UpdateInventoryPayload,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/inventory";

export async function getInventoryList(
  params: ListInventoryParams = {},
): Promise<InventoryListResponse> {
  return apiGet<InventoryListResponse>(BASE, { params });
}

export async function getInventory(id: string): Promise<InventoryResponse> {
  return apiGet<InventoryResponse>(`${BASE}/${id}`);
}

export async function createInventory(
  payload: CreateInventoryPayload,
): Promise<InventoryResponse> {
  return apiPost<InventoryResponse>(BASE, payload);
}

export async function updateInventory(
  id: string,
  payload: UpdateInventoryPayload,
): Promise<InventoryResponse> {
  return apiPatch<InventoryResponse>(`${BASE}/${id}`, payload);
}

export async function deleteInventory(id: string): Promise<null> {
  return apiDelete<null>(`${BASE}/${id}`);
}

export type AdjustInventoryPayload = {
  inventoryId: string;
  quantity: number;
  remarks: string;
};

export type StockMovementResponse = {
  id: string;
  inventoryId: string;
  movementType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  remarks: string;
};

export async function adjustInventoryStock(
  payload: AdjustInventoryPayload,
): Promise<StockMovementResponse> {
  return apiPost<StockMovementResponse>("/stock-movements", {
    inventoryId: payload.inventoryId,
    movementType: "ADJUSTMENT",
    quantity: payload.quantity,
    remarks: payload.remarks,
  });
}
