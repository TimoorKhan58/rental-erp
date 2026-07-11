import type {
  CreateRentalOrderPayload,
  ListRentalOrdersParams,
  RentalOrderListResponse,
  RentalOrderResponse,
  ReserveRentalOrderPayload,
  UpdateRentalOrderPayload,
} from "../types";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/rental-orders";

export async function getRentalOrders(
  params: ListRentalOrdersParams = {},
): Promise<RentalOrderListResponse> {
  return apiGet<RentalOrderListResponse>(BASE, { params });
}

export async function getRentalOrder(id: string): Promise<RentalOrderResponse> {
  return apiGet<RentalOrderResponse>(`${BASE}/${id}`);
}

export async function createRentalOrder(
  payload: CreateRentalOrderPayload,
): Promise<RentalOrderResponse> {
  return apiPost<RentalOrderResponse>(BASE, payload);
}

export async function updateRentalOrder(
  id: string,
  payload: UpdateRentalOrderPayload,
): Promise<RentalOrderResponse> {
  return apiPatch<RentalOrderResponse>(`${BASE}/${id}`, payload);
}

export async function confirmRentalOrder(id: string): Promise<RentalOrderResponse> {
  return apiPost<RentalOrderResponse>(`${BASE}/${id}/confirm`);
}

export async function reserveRentalOrder(
  id: string,
  payload: ReserveRentalOrderPayload,
): Promise<RentalOrderResponse> {
  return apiPost<RentalOrderResponse>(`${BASE}/${id}/reserve`, payload);
}

export async function cancelRentalOrder(id: string): Promise<RentalOrderResponse> {
  return apiPost<RentalOrderResponse>(`${BASE}/${id}/cancel`);
}
