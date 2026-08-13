import type {
  CreateRentalOrderPayload,
  DateAwareAvailabilityResponse,
  GetDateAwareAvailabilityParams,
  ListRentalOrdersParams,
  RentalOrderListResponse,
  RentalOrderResponse,
  RentalOrderShortfallResponse,
  ReserveRentalOrderPayload,
  SourceRentalOrderExternallyPayload,
  UpdateRentalOrderPayload,
} from "../types";
import type { ExternalRentalResponse } from "@/features/external-rental/types";
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

/**
 * F-02 informational date-aware availability.
 * Reserve UoW re-checks independently — do not treat this as an authoritative gate.
 */
export async function getDateAwareAvailability(
  params: GetDateAwareAvailabilityParams,
): Promise<DateAwareAvailabilityResponse> {
  return apiGet<DateAwareAvailabilityResponse>(`${BASE}/availability`, {
    params,
  });
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

export async function getRentalOrderShortfall(
  id: string,
): Promise<RentalOrderShortfallResponse> {
  return apiGet<RentalOrderShortfallResponse>(`${BASE}/${id}/shortfall`);
}

export async function sourceRentalOrderExternally(
  id: string,
  payload: SourceRentalOrderExternallyPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/external-rental`, payload);
}
