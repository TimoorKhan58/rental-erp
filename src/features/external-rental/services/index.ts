import type {
  ConfirmExternalRentalPayload,
  CreateExternalRentalPayload,
  ExternalRentalListResponse,
  ExternalRentalResponse,
  ListExternalRentalsParams,
  QtyItemsPayload,
  SettleExternalRentalPayload,
} from "../types";
import { apiGet, apiPost } from "@/lib/api";

const BASE = "/external-rentals";

export async function getExternalRentals(
  params: ListExternalRentalsParams = {},
): Promise<ExternalRentalListResponse> {
  return apiGet<ExternalRentalListResponse>(BASE, { params });
}

export async function getExternalRental(
  id: string,
): Promise<ExternalRentalResponse> {
  return apiGet<ExternalRentalResponse>(`${BASE}/${id}`);
}

export async function createExternalRental(
  payload: CreateExternalRentalPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(BASE, payload);
}

export async function confirmExternalRental(
  id: string,
  payload: ConfirmExternalRentalPayload = {},
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/confirm`, payload);
}

export async function receiveExternalRental(
  id: string,
  payload: QtyItemsPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/receive`, payload);
}

export async function allocateExternalRental(
  id: string,
  payload: QtyItemsPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/allocate`, payload);
}

export async function returnExternalRentalToSupplier(
  id: string,
  payload: QtyItemsPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(
    `${BASE}/${id}/return-to-supplier`,
    payload,
  );
}

export async function writeOffExternalRental(
  id: string,
  payload: QtyItemsPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/write-off`, payload);
}

export async function settleExternalRental(
  id: string,
  payload: SettleExternalRentalPayload,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/settle`, payload);
}

export async function cancelExternalRental(
  id: string,
): Promise<ExternalRentalResponse> {
  return apiPost<ExternalRentalResponse>(`${BASE}/${id}/cancel`, {});
}
