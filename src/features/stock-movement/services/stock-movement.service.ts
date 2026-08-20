import { apiGet } from "@/lib/api";
import type {
  ListStockMovementsParams,
  StockMovementListResponse,
  StockMovementResponse,
} from "../types/stock-movement.types";

const BASE = "/stock-movements";

export async function getStockMovements(
  params: ListStockMovementsParams = {},
): Promise<StockMovementListResponse> {
  return apiGet<StockMovementListResponse>(BASE, { params });
}

export async function getStockMovement(id: string): Promise<StockMovementResponse> {
  return apiGet<StockMovementResponse>(`${BASE}/${id}`);
}
